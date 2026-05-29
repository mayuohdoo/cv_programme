import { useState } from 'react';
import { Upload, FileText, Trash2, Check, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const statusIcon = {
  uploaded: <FileText className="w-3.5 h-3.5 text-blue-400" />,
  parsing: <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#c084fc' }} />,
  parsed: <Check className="w-3.5 h-3.5 text-green-500" />,
  error: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
};

export default function ResumeSidebar({ resumes, user, onUpload, onDelete, onSetActive, uploading }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload({ target: { files: [file] } });
  };

  return (
    <div className="flex flex-col h-full" style={{
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid rgba(192,132,252,0.15)',
    }}>
      {/* User header */}
      <div className="p-5 pb-4">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-2 shadow-md"
            style={{
              background: 'linear-gradient(135deg, #c084fc, #f472b6)',
              boxShadow: '0 0 0 3px rgba(255,255,255,0.9), 0 0 0 5px rgba(192,132,252,0.3)'
            }}>
            {user?.full_name ? user.full_name[0].toUpperCase() : '✦'}
          </div>
          <p className="font-bold text-sm" style={{ color: '#4c1d95' }}>{user?.full_name || '求职者'}</p>
          <p className="text-xs" style={{ color: '#a07cc0' }}>{user?.email || ''}</p>
        </div>
      </div>

      <div className="px-4 pb-4 flex-1 overflow-y-auto space-y-3">
        {/* Resume list */}
        <p className="text-xs font-bold" style={{ color: '#7c5da8' }}>我的简历（{resumes.length}）</p>
        {resumes.length === 0 && (
          <p className="text-xs text-center py-3" style={{ color: '#b09ac8' }}>还没有简历，先上传一份吧</p>
        )}
        <div className="space-y-2">
          {resumes.map(r => (
            <div key={r.id}
              className="rounded-2xl p-3 cursor-pointer transition-all hover:-translate-y-0.5"
              style={{
                background: r.is_active ? 'linear-gradient(135deg, rgba(192,132,252,0.15), rgba(244,114,182,0.15))' : 'rgba(255,255,255,0.7)',
                border: r.is_active ? '1px solid rgba(192,132,252,0.4)' : '1px solid rgba(192,132,252,0.12)',
                boxShadow: r.is_active ? '0 4px 16px rgba(192,132,252,0.15)' : '0 2px 8px rgba(180,120,255,0.06)',
              }}
              onClick={() => onSetActive(r.id)}>
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{statusIcon[r.status] || statusIcon.uploaded}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: '#4c1d95' }}>{r.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#a07cc0' }}>
                    {r.status === 'parsed' ? '✓ 已解析' : r.status === 'parsing' ? '解析中...' : '待解析'}
                  </p>
                </div>
                {r.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)', color: 'white' }}>使用中</span>}
                <button onClick={e => { e.stopPropagation(); onDelete(r.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upload zone */}
        {resumes.length < 5 ? (
          <label>
            <input type="file" accept=".pdf,.docx,.txt,.doc" className="hidden" onChange={onUpload} />
            <div
              className={cn("rounded-2xl border-2 border-dashed p-4 text-center cursor-pointer transition-all", dragging && "scale-105")}
              style={{ borderColor: dragging ? '#c084fc' : 'rgba(192,132,252,0.35)', background: dragging ? 'rgba(192,132,252,0.08)' : 'rgba(255,255,255,0.5)' }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}>
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" style={{ color: '#c084fc' }} />
              ) : (
                <Upload className="w-5 h-5 mx-auto mb-1" style={{ color: '#c084fc' }} />
              )}
              <p className="text-xs font-semibold" style={{ color: '#7c5da8' }}>
                {uploading ? '上传中...' : '上传新简历'}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: '#b09ac8' }}>PDF / DOCX / TXT</p>
            </div>
          </label>
        ) : (
          <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(255,180,200,0.12)' }}>
            <p className="text-[10px]" style={{ color: '#e879a0' }}>最多保存 5 份，请删除旧简历</p>
          </div>
        )}
      </div>
    </div>
  );
}
