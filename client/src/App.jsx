import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Translator from './pages/Translator';
import Home from './pages/Home';
import History from './pages/History';
import About from './pages/About';
import Auth from './pages/Auth';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  const [activePage, setActivePage] = useState('translator');

  return (
    <AuthProvider>
      <div className="app-shell">
        {/* Top Navigation Bar */}
        <Navbar activePage={activePage} onNavigate={setActivePage} />

        {/* Main Content Area */}
        <main className="main-content" id="main-content" role="main">
          {activePage === 'home' && (
            <Home onStartTranslating={() => setActivePage('translator')} />
          )}
          {activePage === 'translator' && (
            <Translator onNavigateToAuth={() => setActivePage('auth')} />
          )}
          {activePage === 'history' && (
            <History
              onNavigateToTranslator={() => setActivePage('translator')}
              onNavigateToAuth={() => setActivePage('auth')}
            />
          )}
          {activePage === 'about' && <About />}
          {activePage === 'auth' && (
            <Auth onSuccess={() => setActivePage('translator')} />
          )}
        </main>

        {/* Global Application Footer */}
        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '1.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <span>Indian Sign Language (ISL) Translator</span>
            <span style={{ margin: '0 0.5rem' }}>•</span>
            <span>MediaPipe Hands &amp; Random Forest Classification</span>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}

