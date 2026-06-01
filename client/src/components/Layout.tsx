import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { runtimeConfig } from '../config/runtime';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark-theme');
    } else {
      root.removeAttribute('data-theme');
      root.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const menuItems = [
    { name: 'Notes', path: '/', icon: 'ti-file-text' },
    ...(runtimeConfig.enableAI ? [{ name: 'Ask AI', path: '/assistant', icon: 'ti-brain' }] : []),
    { name: 'Profile', path: '/profile', icon: 'ti-user' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary transition-colors duration-300">
      {/* Top Header */}
      <header className="glass-header sticky top-0 z-40 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="p-2 hover:bg-surface/50 rounded-lg transition-colors border border-transparent hover:border-border"
          >
            <i className="ti ti-menu-2 text-xl" />
          </button>
          
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold shadow-md shadow-accent/25">
              <i className="ti ti-cloud text-lg" />
            </div>
            <span className="font-sans font-bold text-lg tracking-tight bg-gradient-to-r from-accent to-sky-400 bg-clip-text text-transparent">
              CloudNotes
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 hover:bg-surface/50 rounded-xl transition-all border border-transparent hover:border-border text-text-secondary hover:text-text-primary"
            title="Toggle theme"
          >
            <i className={`ti ${theme === 'light' ? 'ti-moon' : 'ti-sun'} text-lg`} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 hover:bg-surface/50 rounded-xl transition-all border border-transparent hover:border-border text-text-secondary hover:text-text-primary"
            title="Toggle fullscreen"
          >
            <i className={`ti ${isFullscreen ? 'ti-minimize' : 'ti-maximize'} text-lg`} />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 p-1.5 pr-3 hover:bg-surface/50 rounded-xl transition-all border border-transparent hover:border-border"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent font-semibold flex items-center justify-center uppercase border border-accent/20">
                {user?.first_name ? user.first_name[0] : 'U'}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-text-secondary">
                {user?.first_name || 'User'}
              </span>
              <i className="ti ti-chevron-down text-xs text-text-secondary" />
            </button>

            {isUserDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsUserDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="px-4 py-2 border-b border-border/50">
                    <p className="text-xs text-text-secondary">Signed in as</p>
                    <p className="text-sm font-bold text-text-primary truncate">{user?.email}</p>
                  </div>
                  
                  <Link
                    to="/profile"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
                  >
                    <i className="ti ti-settings" />
                    Account Settings
                  </Link>
                  
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/5 transition-colors"
                  >
                    <i className="ti ti-logout" />
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`glass-sidebar fixed left-0 top-16 bottom-0 z-30 transition-all duration-300 flex flex-col ${
            isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'
          }`}
        >
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {menuItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all group ${
                    isActive
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent'
                  }`}
                >
                  <i className={`ti ${item.icon} text-xl ${isActive ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'}`} />
                  <span className={`${!isSidebarOpen ? 'md:hidden' : 'block'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-border/50">
            <div className={`flex items-center gap-2 text-xs text-text-secondary font-mono ${!isSidebarOpen ? 'md:hidden' : 'flex'}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              CloudNotes Active
            </div>
            {!isSidebarOpen && (
              <div className="hidden md:flex justify-center text-emerald-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          className={`flex-1 min-h-[calc(100vh-4rem)] p-6 transition-all duration-300 ${
            isSidebarOpen ? 'md:ml-64' : 'md:ml-20'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
