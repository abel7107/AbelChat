import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import './index.css';
import Register from './pages/Register';
import Login from './pages/Login';
import Verify from './pages/Verify';
import Chat from './pages/Chat';
import Status from './pages/Status';
import Privacy from './pages/Privacy';
import Admin from './pages/Admin';
import Call from './pages/Call';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';

function Guard({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/chat" element={<Guard><Chat /></Guard>} />
          <Route path="/status" element={<Guard><Status /></Guard>} />
          <Route path="/privacy" element={<Guard><Privacy /></Guard>} />
          <Route path="/admin" element={<Guard><Admin /></Guard>} />
          <Route path="/call" element={<Guard><Call /></Guard>} />
          <Route path="/settings" element={<Guard><Settings /></Guard>} />
          <Route path="/profile" element={<Guard><Profile /></Guard>} />
          <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
