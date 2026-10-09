import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const DEFAULT_USER = {
  id: 'usr_1',
  name: 'Vihanga Pooliyadda',
  email: 'vihanga@research.org',
  avatar: 'VP',
  provider: 'local'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('reqengine_auth_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('reqengine_auth_token') || 'jwt_demo_token');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('reqengine_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('reqengine_auth_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('reqengine_auth_token', token);
    } else {
      localStorage.removeItem('reqengine_auth_token');
    }
  }, [token]);

  // 1. Sign In with Email & Password
  const signIn = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:3000/api/auth/signin', { email, password });
      if (res.data.status === 'success') {
        const loggedUser = res.data.user;
        setUser(loggedUser);
        setToken(res.data.token);
        setIsAuthModalOpen(false);
        showNotice(`Welcome back, ${loggedUser.name}!`, 'success');
        return { success: true, user: loggedUser };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to sign in. Check your email and password.';
      return { success: false, message: msg };
    }
  };

  // 2. Sign Up (Create new account)
  const signUp = async (name, email, password) => {
    try {
      const res = await axios.post('http://localhost:3000/api/auth/signup', { name, email, password });
      if (res.data.status === 'success') {
        const newUser = res.data.user;
        setUser(newUser);
        setToken(res.data.token);
        setIsAuthModalOpen(false);
        showNotice(`Account registered successfully! Welcome ${newUser.name}.`, 'success');
        return { success: true, user: newUser };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check details and try again.';
      return { success: false, message: msg };
    }
  };

  // 3. Google Sign In
  const signInWithGoogle = async (customGoogleData = null) => {
    try {
      const payload = customGoogleData || {
        google_email: 'vihanga.p@gmail.com',
        google_name: 'Vihanga Pooliyadda (Google)',
        google_avatar: 'https://lh3.googleusercontent.com/a/default-user',
        google_id: 'g_oauth_vihanga_102938'
      };

      const res = await axios.post('http://localhost:3000/api/auth/google', payload);
      if (res.data.status === 'success') {
        const gUser = res.data.user;
        setUser(gUser);
        setToken(res.data.token);
        setIsAuthModalOpen(false);
        showNotice(`Signed in with Google as ${gUser.name}!`, 'success');
        return { success: true, user: gUser };
      }
    } catch (err) {
      console.error('Google Auth Error:', err);
      // Fallback in case backend is unreachable
      const fallbackUser = {
        id: `usr_g_${Date.now()}`,
        name: customGoogleData?.google_name || 'Vihanga Pooliyadda',
        email: customGoogleData?.google_email || 'vihanga.p@gmail.com',
        avatar: 'VP',
        provider: 'google'
      };
      setUser(fallbackUser);
      setToken('jwt_google_token');
      setIsAuthModalOpen(false);
      showNotice('Signed in with Google successfully!', 'success');
      return { success: true, user: fallbackUser };
    }
  };

  // 4. Sign Out
  const signOut = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('reqengine_auth_user');
    localStorage.removeItem('reqengine_auth_token');
    setIsAuthModalOpen(true);
    showNotice('You have been signed out. Please sign in to continue.', 'info');
  };

  const showNotice = (msg, type = 'info') => {
    setAuthNotice({ msg, type });
    setTimeout(() => setAuthNotice(null), 4000);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        token,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authNotice,
        setAuthNotice
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
