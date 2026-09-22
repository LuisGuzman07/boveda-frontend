import api from '../api/axios';

/**
 * Consulta al Agente Asistente Inteligente de Bóveda.
 * @param {string} message - Mensaje o pregunta del usuario.
 * @param {Array} history - Historial de mensajes previos [{role, content}].
 * @param {string} currentPath - Ruta de la página web donde está ubicado el usuario.
 */
export async function sendAssistantMessage(message, history = [], currentPath = '') {
  try {
    const response = await api.post('/assistant/chat', {
      message,
      history,
      current_path: currentPath || window.location.pathname,
    });
    return response.data;
  } catch (err) {
    console.warn('Fallo en la llamada al backend del asistente, usando fallback local:', err);
    return getLocalAssistantFallback(message);
  }
}

/**
 * Obtiene los temas sugeridos y categorías de ayuda disponibles.
 */
export async function getAssistantTopics() {
  try {
    const response = await api.get('/assistant/topics');
    return response.data;
  } catch (err) {
    console.warn('Fallo al obtener tópicos remotos, usando catálogo predeterminado:', err);
    return {
      topics: [
        {
          id: 'bovedas',
          title: 'Bóvedas y Cifrado (CU-06 / CU-08 / CU-10)',
          category: 'BOVEDAS',
          sample_queries: [
            '¿Cómo creo y descifro una bóveda?',
            '¿Cómo subo un archivo cifrado?',
          ],
        },
        {
          id: 'dispositivos',
          title: 'Dispositivos de Confianza (CU-04 / CU-05)',
          category: 'DISPOSITIVOS',
          sample_queries: [
            '¿Cómo autorizo mi equipo como de confianza?',
            '¿Por qué sale que la autorización directa fue retirada?',
          ],
        },
        {
          id: 'emergencia',
          title: 'Kit de Emergencia (CU-12)',
          category: 'RECUPERACION',
          sample_queries: [
            '¿Cómo genero el kit de recuperación de emergencia?',
            '¿Cómo recupero mi bóveda si olvidé la contraseña?',
          ],
        },
        {
          id: 'compartir',
          title: 'Compartición de Bóvedas (CU-17)',
          category: 'COMPARTICION',
          sample_queries: [
            '¿Cómo comparto una bóveda con otro usuario?',
            '¿Qué roles y permisos existen?',
          ],
        },
        {
          id: 'auditoria',
          title: 'Auditoría e IA Local de Anomalías (CU-20 / CU-22)',
          category: 'AUDITORIA_IA',
          sample_queries: [
            '¿Cómo funciona la IA de detección de anomalías?',
            '¿Qué significa un riesgo CRÍTICO en la auditoría?',
          ],
        },
      ],
      categories: [],
    };
  }
}

/**
 * Motor de contingencia local autónomo para garantizar respuesta inmediata
 * incluso si el servidor o la conexión de red se reinician.
 */
function getLocalAssistantFallback(message) {
  const norm = message.toLowerCase();

  if (norm.includes('dispositivo') || norm.includes('confianza') || norm.includes('cu05') || norm.includes('cu-05')) {
    return {
      message:
        '### 💻 Dispositivos de Confianza (CU-04 / CU-05)\n\n' +
        '1. **Autorizar este equipo:** En el Panel Principal, abre **Dispositivos de Confianza** y presiona **"Autorizar como Confiable"**.\n' +
        '2. **Desafío Criptográfico:** Tu navegador firmará automáticamente el transcript canónico con tu clave privada **Ed25519** (`TweetNaCl`).\n' +
        '3. **Retiro de autorización directa:** Se eliminó la autorización directa REST para evitar que sesiones robadas autoricen equipos sin tener físicamente la clave del hardware.',
      category: 'DISPOSITIVOS',
      suggested_actions: [
        { label: 'Abrir Dispositivos', action_type: 'modal', target: 'trusted_devices' },
        { label: 'Ir al Panel', action_type: 'navigate', target: '/dashboard' },
      ],
      suggested_questions: [
        '¿Por qué la autorización directa fue retirada?',
        '¿Cómo revoco un dispositivo?',
      ],
    };
  }

  if (norm.includes('boveda') || norm.includes('archivo') || norm.includes('cifrar') || norm.includes('descifrar')) {
    return {
      message:
        '### 🔐 Bóvedas y Cifrado Cero Conocimiento (CU-06 / CU-08 / CU-10)\n\n' +
        '1. **Crear Bóveda:** En la sección **Bóvedas**, haz clic en **"+ Nueva Bóveda"** y define tu contraseña maestra.\n' +
        '2. **Desbloqueo Local:** Desbloquea la bóveda introduciendo tu contraseña maestra (se deriva localmente con PBKDF2).\n' +
        '3. **Cifrado en Navegador:** Los archivos se cifran localmente con **AES-256-GCM** antes de enviarse a MinIO. El servidor solo ve texto cifrado (*ciphertext*).',
      category: 'BOVEDAS',
      suggested_actions: [
        { label: 'Ir a Bóvedas', action_type: 'navigate', target: '/vaults' },
      ],
      suggested_questions: [
        '¿Cómo subo un archivo cifrado?',
        '¿Cómo genero el kit de emergencia?',
      ],
    };
  }

  if (norm.includes('emergencia') || norm.includes('kit') || norm.includes('cu12') || norm.includes('cu-12')) {
    return {
      message:
        '### 🆘 Kit de Recuperación de Emergencia (CU-12)\n\n' +
        '1. Ve a **Bóvedas** y haz clic en **"Kit de Emergencia"** en la tarjeta de tu bóveda.\n' +
        '2. Se descargará un paquete con tus claves de rescate envueltas y un documento de seguridad imprimible.\n' +
        '3. Guarda el kit fuera de línea (USB cifrada o caja fuerte) para restaurar el acceso si olvidas tu contraseña maestra.',
      category: 'RECUPERACION',
      suggested_actions: [
        { label: 'Ver mis Bóvedas', action_type: 'navigate', target: '/vaults' },
      ],
      suggested_questions: [
        '¿Cómo recupero mi bóveda?',
        '¿Cómo comparto la bóveda?',
      ],
    };
  }

  if (norm.includes('compartir') || norm.includes('cu17') || norm.includes('cu-17') || norm.includes('permiso')) {
    return {
      message:
        '### 👥 Compartición de Bóvedas (CU-17)\n\n' +
        '1. En **Bóvedas**, haz clic en **"Compartir Acceso"**.\n' +
        '2. Escribe el correo del destinatario y selecciona el rol: **LECTURA**, **ESCRITURA** o **ADMIN**.\n' +
        '3. Tu navegador envuelve la clave de la bóveda con la clave pública del destinatario, preservando el Cero Conocimiento.',
      category: 'COMPARTICION',
      suggested_actions: [
        { label: 'Ir a Bóvedas', action_type: 'navigate', target: '/vaults' },
      ],
      suggested_questions: [
        '¿Cómo revoco un permiso?',
        '¿Cómo creo una bóveda?',
      ],
    };
  }

  return {
    message:
      '### 👋 ¡Hola! Soy el Asistente Inteligente de Bóveda Híbrida.\n\n' +
      'Puedo ayudarte paso a paso con cualquiera de las funciones del sistema:\n\n' +
      '* 🔐 **Bóvedas y Cifrado:** Creación, desbloqueo y gestión de archivos cifrados.\n' +
      '* 💻 **Dispositivos de Confianza (CU-04 / CU-05):** Desafío criptográfico Ed25519.\n' +
      '* 🆘 **Kit de Emergencia (CU-12):** Respaldo de claves maestras.\n' +
      '* 👥 **Compartición Segura (CU-17):** Delegación de permisos.\n' +
      '* 🧠 **Auditoría e IA Local (CU-20 / CU-22):** Detección de anomalías con Isolation Forest.\n' +
      '* 🛡️ **Seguridad y MFA:** Doble factor y bloqueo por inactividad.',
    category: 'GENERAL',
    suggested_actions: [
      { label: 'Ir a Bóvedas', action_type: 'navigate', target: '/vaults' },
      { label: 'Dispositivos de Confianza', action_type: 'modal', target: 'trusted_devices' },
      { label: 'Auditoría e IA', action_type: 'navigate', target: '/audit' },
    ],
    suggested_questions: [
      '¿Cómo creo una bóveda?',
      '¿Cómo autorizo mi dispositivo?',
      '¿Cómo funciona la IA de anomalías?',
    ],
  };
}
