import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = {
  doctor: [
    { path: '/doctor', label: 'Dashboard', icon: '⬡', exact: true },
    { path: '/predict', label: 'Risk Prediction', icon: '🔬' },
    { path: '/doctor/patients', label: 'My Patients', icon: '👥' },
    { path: '/doctor/alerts', label: 'Alerts', icon: '🔔', badge: 2 },
    { path: '/doctor/xai', label: 'AI Explainer', icon: '🧠' },
  ],
  nurse: [
    { path: '/nurse', label: 'Dashboard', icon: '⬡', exact: true },
    { path: '/nurse/vitals', label: 'Enter Vitals', icon: '💓' },
    { path: '/nurse/monitoring', label: 'Live Monitor', icon: '📡' },
    { path: '/nurse/alerts', label: 'Alert Panel', icon: '🔔', badge: 3 },
  ],
  head_doctor: [
    { path: '/head-doctor', label: 'Dashboard', icon: '⬡', exact: true },
    { path: '/head-doctor/performance', label: 'Doctor Performance', icon: '📊' },
    { path: '/head-doctor/negligence', label: 'Negligence Reports', icon: '⚠️' },
    { path: '/head-doctor/analytics', label: 'Hospital Analytics', icon: '📈' },
    { path: '/predict', label: 'Risk Prediction', icon: '🔬' },
  ],
  admin: [
    { path: '/admin', label: 'Dashboard', icon: '⬡', exact: true },
    { path: '/admin/audit', label: 'Audit Logs', icon: '📋' },
    { path: '/admin/trust', label: 'Trust Scores', icon: '🛡️' },
    { path: '/admin/federated', label: 'Federated Learning', icon: '🌐' },
    { path: '/admin/anomaly', label: 'Anomaly Detection', icon: '🔍' },
    { path: '/admin/hospitals', label: 'Hospitals', icon: '🏥' },
  ],
};

const ROLE_LABELS = {
  doctor: 'Doctor Portal',
  nurse: 'Nurse Station',
  head_doctor: 'Medical Director',
  admin: 'System Admin',
};

const ROLE_COLORS = {
  doctor: '#00d4ff',
  nurse: '#00ff87',
  head_doctor: '#a78bfa',
  admin: '#ffd700',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] || [];
  const roleColor = ROLE_COLORS[user.role] || '#00d4ff';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={{ x: -264 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed left-0 top-0 h-full w-64 flex flex-col z-50"
      style={{
        background: 'rgba(4, 10, 22, 0.96)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(30px)',
      }}
    >
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{
              background: `linear-gradient(135deg, ${roleColor}20, ${roleColor}10)`,
              border: `1px solid ${roleColor}40`,
              color: roleColor,
            }}>
            N
          </div>
          <div>
            <div className="text-white font-display font-bold text-sm leading-tight">NFHIS</div>
            <div className="text-xs font-medium" style={{ color: roleColor }}>
              {ROLE_LABELS[user.role]}
            </div>
          </div>
        </div>

        {/* User card */}
        <div className="rounded-xl p-3 mb-2"
          style={{
            background: `rgba(${roleColor === '#00d4ff' ? '0,212,255' : roleColor === '#00ff87' ? '0,255,135' : roleColor === '#a78bfa' ? '167,139,250' : '255,215,0'},0.06)`,
            border: `1px solid ${roleColor}20`,
          }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              style={{ background: `${roleColor}20`, color: roleColor }}>
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user.name}</div>
              <div className="text-xs truncate" style={{ color: `${roleColor}80` }}>{user.hospitalId?.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item, i) => (
            <motion.div key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 + 0.3 }}
            >
              <NavLink
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
                style={({ isActive }) => isActive ? { color: roleColor } : {}}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(255,59,92,0.2)', color: '#ff3b5c', fontSize: '10px' }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs uppercase tracking-wider px-4 mb-2" style={{ color: 'var(--text-muted)' }}>System</p>
          <NavLink to="/predict" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span>🎯</span> Quick Predict
          </NavLink>
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-3 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00e676' }} />
            <span className="text-xs text-green-400">System Online</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>v1.0.0</span>
        </div>
        <button onClick={handleLogout} className="btn-ghost w-full text-center text-xs py-2">
          Sign Out →
        </button>
      </div>
    </motion.aside>
  );
}
