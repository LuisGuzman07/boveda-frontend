import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  X,
  Minus,
  Send,
  HelpCircle,
  Lock,
  Laptop,
  LifeBuoy,
  Share2,
  Brain,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';
import { sendAssistantMessage, getAssistantTopics } from '../services/assistantService';

const INITIAL_GREETING = {
  role: 'assistant',
  content:
    '### 👋 ¡Hola! Soy tu Asistente Inteligente de Bóveda Híbrida.\n\n' +
    'Estoy aquí para ayudarte a usar la plataforma con total seguridad y privacidad. ' +
    '¿Qué te gustaría saber o hacer hoy? Puedes elegir una de las opciones rápidas abajo o escribir tu propia pregunta.',
  category: 'GENERAL',
  actions: [
    { label: 'Ir a Bóvedas', action_type: 'navigate', target: '/vaults' },
    { label: 'Dispositivos de Confianza', action_type: 'modal', target: 'trusted_devices' },
    { label: 'Auditoría e IA', action_type: 'navigate', target: '/audit' },
  ],
  followUps: [
    '¿Cómo creo y descifro una bóveda?',
    '¿Cómo autorizo mi equipo como de confianza (CU-05)?',
    '¿Cómo funciona la IA de anomalías (CU-22)?',
    '¿Cómo genero el kit de recuperación (CU-12)?',
    '¿Cómo comparto una bóveda con otro usuario (CU-17)?',
  ],
};

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([INITIAL_GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getAssistantTopics().then((res) => {
      if (res?.topics) setTopics(res.topics);
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend !== null ? textToSend : input).trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = updatedMessages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendAssistantMessage(text, historyPayload, location.pathname);

      const assistantMsg = {
        role: 'assistant',
        content: res.message,
        category: res.category,
        actions: res.suggested_actions || [],
        followUps: res.suggested_questions || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (!isOpen || isMinimized) {
        setHasUnread(true);
      }
    } catch (err) {
      console.error('Error al consultar al asistente:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '⚠️ Hubo una dificultad momentánea al procesar tu consulta. Por favor, intenta de nuevo o revisa tu conexión local.',
          category: 'GENERAL',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleActionClick = (action) => {
    if (!action) return;

    if (action.action_type === 'navigate') {
      navigate(action.target);
    } else if (action.action_type === 'modal') {
      // Disparar evento para abrir modal
      window.dispatchEvent(
        new CustomEvent('boveda:open-modal', { detail: action.target })
      );
      // Si el modal está en dashboard y no estamos allí, navegar a dashboard
      if (location.pathname !== '/dashboard' && action.target !== 'anomaly_modal') {
        navigate('/dashboard', { state: { openModal: action.target } });
      }
    }
  };

  const handleResetChat = () => {
    setMessages([INITIAL_GREETING]);
  };

  const renderFormattedMarkdown = (content) => {
    if (!content) return null;

    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Encabezados h3
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="assistant-md-h3">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // Encabezados h4
      if (line.startsWith('#### ')) {
        return (
          <h5 key={idx} className="assistant-md-h4">
            {line.replace('#### ', '')}
          </h5>
        );
      }
      // Listas numeradas o con viñetas
      if (line.match(/^(\d+\.|\*|\-)\s+/)) {
        const itemText = line.replace(/^(\d+\.|\*|\-)\s+/, '');
        return (
          <div key={idx} className="assistant-md-list-item">
            <span className="assistant-md-bullet">•</span>
            <span>{parseInlineStyles(itemText)}</span>
          </div>
        );
      }
      // Párrafos normales
      if (line.trim() === '') {
        return <div key={idx} style={{ height: '0.4rem' }} />;
      }
      return (
        <p key={idx} className="assistant-md-p">
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  const parseInlineStyles = (text) => {
    // Parser simple de **negrita** y `código`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="assistant-inline-code">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <aside aria-label="Asistente de Inteligencia Artificial" className="assistant-widget-root">
      {/* Botón Flotante de Activación */}
      {!isOpen && (
        <button
          type="button"
          className="assistant-floating-btn"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Abrir Asistente IA"
          title="Asistente Inteligente Bóveda (Ayuda y Guías)"
        >
          <div className="assistant-btn-glow" />
          <div className="assistant-btn-icon">
            <Bot size={22} color="#ffffff" />
          </div>
          <span className="assistant-btn-label">Asistente IA</span>
          {hasUnread && <span className="assistant-unread-dot" />}
        </button>
      )}

      {/* Ventana de Chat Expandida */}
      {isOpen && (
        <div className={`assistant-panel ${isMinimized ? 'assistant-panel-minimized' : ''}`}>
          {/* Cabecera del Asistente */}
          <div className="assistant-header">
            <div className="assistant-header-info">
              <div className="assistant-avatar">
                <Sparkles size={18} color="#60a5fa" />
              </div>
              <div>
                <h3 className="assistant-title">Asistente Inteligente</h3>
                <div className="assistant-status-pill">
                  <span className="assistant-status-dot" />
                  <span>IA Local Activa • Cero Conocimiento</span>
                </div>
              </div>
            </div>

            <div className="assistant-header-controls">
              <button
                type="button"
                className="assistant-tool-btn"
                onClick={handleResetChat}
                title="Reiniciar conversación"
                aria-label="Reiniciar conversación"
              >
                <RotateCcw size={15} />
              </button>

              <button
                type="button"
                className="assistant-tool-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expandir' : 'Minimizar'}
                aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minus size={15} />}
              </button>

              <button
                type="button"
                className="assistant-tool-btn assistant-close-btn"
                onClick={() => setIsOpen(false)}
                title="Cerrar asistente"
                aria-label="Cerrar asistente"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Cuerpo del Chat (si no está minimizado) */}
          {!isMinimized && (
            <>
              {/* Tópicos de Inicio Rápido (Chips) */}
              <div className="assistant-quick-chips-bar">
                <span className="assistant-chips-title">Preguntas frecuentes:</span>
                <div className="assistant-chips-scroll">
                  <button
                    type="button"
                    className="assistant-chip"
                    onClick={() => handleSendMessage('¿Cómo creo y descifro una bóveda?')}
                  >
                    <Lock size={12} /> Bóvedas
                  </button>
                  <button
                    type="button"
                    className="assistant-chip"
                    onClick={() => handleSendMessage('¿Cómo autorizo mi equipo como dispositivo de confianza (CU-05)?')}
                  >
                    <Laptop size={12} /> Dispositivos
                  </button>
                  <button
                    type="button"
                    className="assistant-chip"
                    onClick={() => handleSendMessage('¿Cómo funciona la IA de detección de anomalías (CU-22)?')}
                  >
                    <Brain size={12} /> IA de Anomalías
                  </button>
                  <button
                    type="button"
                    className="assistant-chip"
                    onClick={() => handleSendMessage('¿Cómo genero el kit de recuperación de emergencia (CU-12)?')}
                  >
                    <LifeBuoy size={12} /> Kit Emergencia
                  </button>
                  <button
                    type="button"
                    className="assistant-chip"
                    onClick={() => handleSendMessage('¿Cómo comparto una bóveda con otro usuario (CU-17)?')}
                  >
                    <Share2 size={12} /> Compartir
                  </button>
                  <button
                    type="button"
                    className="assistant-chip"
                    onClick={() => handleSendMessage('¿Cómo activo el doble factor de autenticación (MFA)?')}
                  >
                    <ShieldCheck size={12} /> MFA
                  </button>
                </div>
              </div>

              {/* Contenedor de Mensajes */}
              <div className="assistant-messages-container">
                {messages.map((msg, index) => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <div
                      key={index}
                      className={`assistant-msg-wrapper ${
                        isAssistant ? 'assistant-msg-incoming' : 'assistant-msg-outgoing'
                      }`}
                    >
                      {isAssistant && (
                        <div className="assistant-msg-avatar">
                          <Bot size={16} />
                        </div>
                      )}

                      <div className="assistant-msg-bubble">
                        <div className="assistant-msg-content">
                          {renderFormattedMarkdown(msg.content)}
                        </div>

                        {/* Botones de Acción Sugeridos */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="assistant-actions-group">
                            {msg.actions.map((act, aIdx) => (
                              <button
                                key={aIdx}
                                type="button"
                                className="assistant-action-btn"
                                onClick={() => handleActionClick(act)}
                              >
                                <span>{act.label}</span>
                                <ArrowRight size={13} />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Preguntas de Seguimiento Sugeridas */}
                        {msg.followUps && msg.followUps.length > 0 && (
                          <div className="assistant-followups-container">
                            <span className="assistant-followup-label">Sugerencias relacionadas:</span>
                            <div className="assistant-followups-list">
                              {msg.followUps.map((q, qIdx) => (
                                <button
                                  key={qIdx}
                                  type="button"
                                  className="assistant-followup-pill"
                                  onClick={() => handleSendMessage(q)}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Indicador de escritura */}
                {loading && (
                  <div className="assistant-msg-wrapper assistant-msg-incoming">
                    <div className="assistant-msg-avatar">
                      <Bot size={16} />
                    </div>
                    <div className="assistant-msg-bubble assistant-loading-bubble">
                      <span className="assistant-dot" />
                      <span className="assistant-dot" />
                      <span className="assistant-dot" />
                      <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                        Consultando guía del sistema...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra de Entrada de Texto */}
              <form
                className="assistant-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  className="assistant-input-field"
                  placeholder="Haz una pregunta sobre el uso de la página..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="assistant-send-btn"
                  disabled={loading || !input.trim()}
                  title="Enviar pregunta"
                  aria-label="Enviar pregunta"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
