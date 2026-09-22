import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InactivityProvider } from './context/InactivityContext';
import InactivityLockModal from './components/InactivityLockModal';
import Navbar from './components/Navbar';
import AppRoutes from './routes/AppRoutes';
import AIAssistantWidget from './components/AIAssistantWidget';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <InactivityProvider>
          <div className="app-layout">
            <Navbar />
            <main className="app-main-content">
              <AppRoutes />
            </main>
          </div>
          <InactivityLockModal />
          <AIAssistantWidget />
        </InactivityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
