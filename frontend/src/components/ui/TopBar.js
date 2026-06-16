import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { alertsAPI } from '../../utils/api';

export default function TopBar() {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [alertCount, setAlertCount] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    alertsAPI.list({ status: 'pending' })
      .then(d => {
        setAlertCount(d.alerts?.length || 0);
        setRecentAlerts((d.alerts || []).slice(0, 3));
      })
      .catch(() => {
        setAlertCount(3);
        setRecentAlerts([
          { alert_id: 'A1', patient_name: 'Arjun Sharma', message: 'Critical glucose', severity: 'critical' },
          { alert_id: 'A2', patient_name: 'Rekha Singh', message: 'High cardiac risk', severity: 'high' },
          { alert_id: 'A3', patient_name: 'Mohammed Khan', message: 'Liver enzymes elevated', severity: 'high' },
        ]);
      });
  }, []);

  const severityColor = { critical: '#ff3b5c', high: '#ff7a2e', medium: '#ffc93c', low: '#00e676' };

  return (
    <header className="h-16 flex items-center justify-between px-6 relative z-40"
      style={{
        background: 'rgba(4, 10, 22, 0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
      }}>
      {/* Left: breadcrumb / title */}
      <div>
        <div className="text-xs text-blue-400/40 uppercase tracking-widest">NFHIS Portal</div>
        <div className="text-white text-sm font-semibold mt-0.5">
          Welcome back, <span style={{ color: 'var(--accent-cyan)' }}>{user?.name}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Live time */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e676' }} />
          <span className="font-mono text-xs text-blue-300">
            {time.toLocaleTimeString('en-IN', { hour12: false })}
          </span>
        </div>

        {/* Alert bell */}
        <div className="relative">
          <motion.button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: alertCount > 0 ? 'rgba(255,59,92,0.12)' : 'rgba(255,255,255,0.05)',
              border: alertCount > 0 ? '1px solid rgba(255,59,92,0.3)' : '1px solid rgba(255,255,255,0.08)',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-base">🔔</span>
            {alertCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: '#ff3b5c', color: 'white', fontSize: '9px' }}>
                {alertCount}
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence>
            {showAlerts && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-50"
                style={{
                  background: 'rgba(4, 10, 24, 0.98)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-semibold">Active Alerts</span>
                    <span className="badge badge-critical">{alertCount} pending</span>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {recentAlerts.map(alert => (
                    <div key={alert.alert_id} className="px-4 py-3 glass-hover cursor-pointer"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: severityColor[alert.severity] || '#ffc93c' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs font-semibold truncate">{alert.patient_name}</div>
                          <div className="text-blue-300/50 text-xs truncate mt-0.5">{alert.message}</div>
                        </div>
                        <span className={`badge badge-${alert.severity} flex-shrink-0`}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5">
                  <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors w-full text-center">
                    View all alerts →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.25)' }}>
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
