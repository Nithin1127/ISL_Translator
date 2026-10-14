import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activePage, onNavigate }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'translator', label: 'Translator' },
    { id: 'history', label: 'History' },
    { id: 'about', label: 'About' },
  ];

  const handleNavClick = (pageId) => {
    onNavigate(pageId);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    onNavigate('home');
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="navbar" role="banner">
      <div className="navbar-inner">
        {/* Brand */}
        <button
          className="nav-brand"
          onClick={() => handleNavClick('home')}
          type="button"
          aria-label="ISL Translator Home"
        >
          <div className="brand-icon" aria-hidden="true">
            🤟
          </div>
          <span>
            ISL <span className="brand-text-accent">Translator</span>
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="nav-links" role="navigation" aria-label="Main Navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              aria-current={activePage === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side / Auth Buttons & Mobile Menu Toggle */}
        <div className="nav-right">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="nav-user-pill" title={user?.email || 'Logged In'}>
                <div className="nav-user-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{user?.name || 'User'}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem' }}
              onClick={() => handleNavClick('auth')}
            >
              Sign In
            </button>
          )}

          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={isMobileMenuOpen}
            type="button"
          >
            {isMobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {isMobileMenuOpen && (
        <nav className="mobile-nav-drawer" role="navigation" aria-label="Mobile Navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              aria-current={activePage === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          ))}
          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.25rem' }}>
            {isAuthenticated ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Signed in as <strong>{user?.name}</strong>
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.5rem' }}
                onClick={() => handleNavClick('auth')}
              >
                Sign In / Register
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

