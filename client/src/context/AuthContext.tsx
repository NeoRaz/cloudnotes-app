import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { getRefreshTokenRequest, getRequest, logoutUser } from '../api/api';
import { aesEncrypt } from '../utils/crypto';
import { User } from '../types';

const EXPIRATION_DURATION = 50 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, tokenType: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTimeoutOpen, setIsTimeoutOpen] = useState(false);

  const accessToken = sessionStorage.getItem('access_token');
  const isAuthenticated = !!accessToken;

  // Idle Timer (20 minutes inactivity warning)
  const timeout = 1000 * 60 * 20;
  const handleOnIdle = () => {
    sessionStorage.clear();
    localStorage.removeItem('expiration_time');
    setUser(null);
    setIsTimeoutOpen(true);
  };

  useIdleTimer({
    timeout,
    onIdle: handleOnIdle,
    disabled: !isAuthenticated,
    debounce: 250,
  });

  const refreshUser = async () => {
    try {
      const response = await getRequest('/user/details');
      // Backend returns { user: { first_name, last_name, email } }
      const userData = response?.user || response;
      setUser(userData);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated) {
        await refreshUser();
      }
      setLoading(false);
    };
    initAuth();
  }, [isAuthenticated]);

  // Expiration Check & Background Token Refresh (every 50 minutes)
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const expirationTimeStr = localStorage.getItem('expiration_time');
    let delay = EXPIRATION_DURATION;

    if (expirationTimeStr) {
      const remainingTime = new Date(expirationTimeStr).getTime() - new Date().getTime();
      delay = remainingTime > 0 ? remainingTime : 0;
    } else {
      const newExpirationTime = new Date(new Date().getTime() + EXPIRATION_DURATION);
      localStorage.setItem('expiration_time', newExpirationTime.toString());
    }

    const timer = setTimeout(async () => {
      await getRefreshTokenRequest();
      setRefreshKey(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [refreshKey, isAuthenticated]);

  const login = async (access: string, refresh: string, tokenType: string) => {
    sessionStorage.setItem('access_token', access);
    sessionStorage.setItem('refresh_token', aesEncrypt(refresh));
    sessionStorage.setItem('token_type', tokenType);
    
    const newExpirationTime = new Date(new Date().getTime() + EXPIRATION_DURATION);
    localStorage.setItem('expiration_time', newExpirationTime.toString());

    await refreshUser();
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
      {isTimeoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ti ti-alert-triangle text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Session Timed Out</h3>
            <p className="text-text-secondary text-sm mb-6 leading-relaxed">
              Your session has timed out due to inactivity. Please log in again to continue.
            </p>
            <button
              onClick={() => {
                setIsTimeoutOpen(false);
                window.location.href = '/login';
              }}
              className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all shadow-lg shadow-accent/25"
            >
              Return to Login
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
