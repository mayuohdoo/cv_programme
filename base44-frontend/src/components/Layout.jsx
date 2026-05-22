import { Outlet, Link, useLocation } from 'react-router-dom';
import { FileText, Briefcase, MessageCircle, BarChart3, Bot, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/jobs', label: '岗位', icon: Briefcase },
  { path: '/interview', label: '面试', icon: MessageCircle },
  { path: '/applications', label: '追踪', icon: BarChart3 },
  { path: '/chat', label: '助手', icon: Bot },
];

function computeStep(resumes) {
  if (!resumes || resumes.length === 0) return 0;
  if (!resumes.some(r => r.file_url)) return 0;
  if (!resumes.some(r => r.status === 'parsed')) return 1;
  return 2;
}

export default function Layout() {
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    base44.entities.Resume.list().then(resumes => {
      setStep(computeStep(resumes));
    }).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (step >= 2) {
      base44.entities.Application.list().then(apps => {
        if (apps.length > 0) setStep(s => Math.max(s, 4));
      }).catch(() => {});
    }
  }, [step]);

  return (
    <div className="min-h-screen flex flex-col font-main" style={{ background: 'linear-gradient(135deg, #f0e8ff 0%, #fce8f5 50%, #ffe8f0 100%)', backgroundAttachment: 'fixed' }}>
      {/* Top Nav */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/40 px-6 py-0"
        style={{ background: 'rgba(255,255,255,0.55)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14">
          {/* Logo */}
          <span className="text-sm font-bold tracking-wide" style={{ background: 'linear-gradient(90deg, #b06fd8, #e87bac)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>✦ 小小求职拿下</span>
          {/* Nav tabs */}
          <div className="flex items-center gap-1">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  className={cn('px-4 py-1.5 rounded-full text-sm transition-all', active ? 'font-medium' : 'hover:bg-purple-50')}
                  style={active ? { background: 'rgba(192,132,252,0.15)', color: '#7c3aed' } : { color: '#a78bca' }}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow"
            style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)' }}>
            {user?.full_name ? user.full_name[0].toUpperCase() : '?'}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">
        <Outlet context={{ step, setStep }} />
      </main>
    </div>
  );
}
