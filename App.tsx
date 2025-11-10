
import React, { useState, useEffect, createContext, useMemo, useContext } from 'react';
// FIX: Split imports from 'react-router-dom' and 'react-router' to handle potential module resolution issues.
import { Routes, Route, Navigate } from 'react-router';
import { HashRouter } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './services/firebase';

import AdminLogin from './pages/AdminLogin';
import AdminPortal from './pages/AdminPortal';
import UserLogin from './pages/UserLogin';
import UserForm from './pages/UserForm';
import Spinner from './components/ui/Spinner';
import ErrorBoundary from './components/ErrorBoundary';

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
};

export const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedTheme = localStorage.getItem('enterprise-forms-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => {
        const newMode = !prevMode;
        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('enterprise-forms-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('enterprise-forms-theme', 'light');
        }
        return newMode;
    });
  };

  const authContextValue = useMemo(() => ({ currentUser, loading }), [currentUser, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <ErrorBoundary>
        <HashRouter>
          <Routes>
            {/* Conditional Root Redirect */}
            <Route path="/" element={
              currentUser ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/user/login" replace />
            } />
            
            {/* Public & User Routes */}
            <Route path="/user/login" element={<UserLogin />} />
            <Route path="/user/form" element={<UserForm />} />
            
            {/* Conditional Admin Routes */}
            {currentUser ? (
              <>
                {/* If logged in, /admin/login redirects to dashboard */}
                <Route path="/admin/login" element={<Navigate to="/admin/dashboard" replace />} />
                {/* If logged in, all other /admin/* routes go to the portal */}
                <Route path="/admin/*" element={<AdminPortal isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
              </>
            ) : (
              <>
                {/* If not logged in, /admin/login shows the login page */}
                <Route path="/admin/login" element={<AdminLogin />} />
                {/* If not logged in, any other /admin/* route redirects to login */}
                <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
              </>
            )}
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ErrorBoundary>
    </AuthContext.Provider>
  );
};

export default App;
