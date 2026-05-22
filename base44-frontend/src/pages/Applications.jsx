import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, Send, Eye, MessageCircle, Trophy, Chrome, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const statusColors = {
  '投递中': { bg: 'rgba(99,102,241,0.1)', text: '#6366f1' },
  '已查看': { bg: 'rgba(245,158,11,0.1)', text: '#d97706' },
  '约面试': { bg: 'rgba(168,85,247,0.1)', text: '#9333ea' },
  '已拒绝': { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
  '已offer': { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
};
const statuses = ['投递中', '已查看', '约面试', '已拒绝', '已offer'];

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company: '', position: '', city: '' });

  const load = async () => {
    const data = await base44.entities.Application.list('-created_date', 50);
    setApps(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id, status) => {
    await base44.entities.Application.update(id, { status });
    load();
  };

  const handleAdd = async () => {
    if (!form.company || !form.position) return;
    await base44.entities.Application.create({ ...form, status: '投递中', applied_date: new Date().toISOString().split('T')[0] });
    setShowAdd(false);
    setForm({ company: '', position: '', city: '' });
    toast.success('投递记录已添加');
    load();
  };

  const stats = [
    { label: '总投递', value: apps.length, color: '#c97ddc', gradient: 'linear-gradient(135deg, rgba(201,125,220,0.15), rgba(232,123,172,0.15))' },
    { label: '本周', value: apps.filter(a => { const d = new Date(a.applied_date); const w = new Date(); w.setDate(w.getDate() - 7); return d >= w; }).length, color: '#7c9ef5', gradient: 'linear-gradient(135deg, rgba(124,158,245,0.15), rgba(147,112,219,0.15))' },
    { label: '待回复', value: apps.filter(a => a.status === '投递中').length, color: '#f5a623', gradient: 'linear-gradient(135deg, rgba(245,166,35,0.15), rgba(255,180,120,0.15))' },
    { label: '面试中', value: apps.filter(a => a.status === '约面试').length, color: '#9b59d4', gradient: 'linear-gradient(135deg, rgba(155,89,212,0.15), rgba(201,125,220,0.15))' },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#c97ddc' }} /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg" style={{ color: '#6b35c7' }}>📊 投递追踪</h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)', boxShadow: '0 4px 12px rgba(201,125,220,0.3)' }}>
          <Plus className="w-3.5 h-3.5" /> 手动添加
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center"
            style={{ background: s.gradient, border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 4px 12px rgba(180,120,255,0.1)' }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-medium" style={{ color: '#9d7ab8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-sm mb-4" style={{ color: '#9d7ab8' }}>还没有投递记录</p>
          <Link to="/jobs">
            <button className="px-6 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(201,125,220,0.12)', color: '#8b4dcc', border: '1px solid rgba(201,125,220,0.25)' }}>
              去看看推荐岗位 →
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => {
            const sc = statusColors[app.status] || statusColors['投递中'];
            return (
              <div key={app.id} className="rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.82)', boxShadow: '0 6px 24px rgba(180,120,255,0.12)', border: '1px solid rgba(255,255,255,0.9)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: '#3d1f6b' }}>{app.position}</h3>
                    <p className="text-xs mt-0.5" style={{ color: '#9d7ab8' }}>{app.company}</p>
                  </div>
                  {app.match_score && (
                    <span className="text-[10px] font-bold" style={{ color: '#c97ddc' }}>↑{app.match_score}%</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: '#b09ac8' }}>
                  {app.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.city}</span>}
                  {app.applied_date && <span>{app.applied_date}</span>}
                </div>
                <div className="mt-3">
                  <Select value={app.status} onValueChange={v => handleStatusChange(app.id, v)}>
                    <SelectTrigger className="h-7 rounded-full text-xs w-auto px-3 border-0 font-semibold"
                      style={{ background: sc.bg, color: sc.text, width: 'fit-content' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(180,120,255,0.15)' }}>
        <Chrome className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#c97ddc' }} />
        <p className="text-xs" style={{ color: '#9d7ab8' }}>安装 Chrome 插件后，投递记录可以自动同步，无需手动添加</p>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle style={{ color: '#3d1f6b' }}>手动添加投递</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="公司名称" value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} className="rounded-2xl" />
            <Input placeholder="岗位名称" value={form.position} onChange={e => setForm(f => ({...f, position: e.target.value}))} className="rounded-2xl" />
            <Input placeholder="城市" value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} className="rounded-2xl" />
            <button onClick={handleAdd} className="w-full py-3 rounded-2xl text-white font-semibold text-sm"
              style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)' }}>添加</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
