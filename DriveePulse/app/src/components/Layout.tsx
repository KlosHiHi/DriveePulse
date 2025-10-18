import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, User, Moon, Sun, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/contexts/ThemeContext';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { userRole, setUserRole } = useAppStore();
  const { theme, toggleTheme } = useTheme();

  const isClient = location.pathname === '/client';
  const isDriver = location.pathname === '/driver';

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <MapPin size={28} />
            </div>
            <div className="logo-text">
              <h1>DriveePulse</h1>
              <span className="logo-subtitle">Smart Taxi Platform</span>
            </div>
          </div>
          
          <nav className="nav">
            <Link 
              to="/client" 
              className={`nav-link ${isClient ? 'active' : ''}`}
              onClick={() => setUserRole('client')}
            >
              <User size={18} />
              <span>Пассажир</span>
            </Link>
            <Link 
              to="/driver" 
              className={`nav-link ${isDriver ? 'active' : ''}`}
              onClick={() => setUserRole('driver')}
            >
              <Car size={18} />
              <span>Водитель</span>
            </Link>
          </nav>

          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Переключить тему"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      <main className="main">
        {children}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <span>Powered by AI & Machine Learning</span>
          <span>DriveePulse 2025</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
