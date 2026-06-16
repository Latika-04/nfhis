import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './hooks/useAuth';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DoctorDashboard from './pages/DoctorDashboard';
import NurseDashboard from './pages/NurseDashboard';
import HeadDoctorDashboard from './pages/HeadDoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PredictionPage from './pages/PredictionPage';
import Sidebar from './components/ui/Sidebar';
import TopBar from './components/ui/TopBar';

const ROLE_ROUTES = {
  doctor: '/doctor',
  nurse: '/nurse',
  head_doctor: '/head-doctor',
  admin: '/admin',
};

const ProtectedLayout = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_ROUTES[user.role] || '/login'} replace />;
  }
  return (
    <div className="flex min-h-screen bg-grid" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        <TopBar />
        <main className="flex-1 p-6 relative z-10">
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>

      
      <Route path="/login" element={user ? <Navigate to={ROLE_ROUTES[user.role]} replace /> : <LoginPage />} />
      <Route path="/doctor/*" element={
        <ProtectedLayout allowedRoles={['doctor']}>
          <DoctorDashboard />
        </ProtectedLayout>
      } />
      <Route path="/register" element={<RegisterPage />} />
      


      <Route path="/nurse/*" element={
        <ProtectedLayout allowedRoles={['nurse']}>
          <NurseDashboard />
        </ProtectedLayout>
      } />
      <Route path="/head-doctor/*" element={
        <ProtectedLayout allowedRoles={['head_doctor']}>
          <HeadDoctorDashboard />
        </ProtectedLayout>
      } />
      <Route path="/admin/*" element={
        <ProtectedLayout allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedLayout>
      } />
      <Route path="/predict" element={
        <ProtectedLayout>
          <PredictionPage />
        </ProtectedLayout>
      } />
      <Route path="/" element={
        user ? <Navigate to={ROLE_ROUTES[user.role]} replace /> : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
    <div className="text-center">
      <motion.div
        className="w-16 h-16 border-2 border-cyan-400 rounded-full mx-auto mb-4"
        style={{ borderTopColor: 'transparent' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-cyan-400 font-display text-lg font-semibold">NFHIS</p>
      <p className="text-blue-400/60 text-sm mt-1">Initializing System...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
