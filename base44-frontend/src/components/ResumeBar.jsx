import { Upload, FileText, Loader2, Check, AlertCircle } from 'lucide-react';

const statusIcon = {
  uploaded: <FileText className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />,
  parsing: <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#c084fc' }} />,
  parsed: <Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />,
  error: <AlertCircle className="w-3.5 h-3.5" style={{ color: '#f87171' }} />,
};

export default function ResumeBar({ resumes, onUpload, uploading }) {
  return (
    <div className="rounded-3xl px-6 py-4 flex items-center gap-6"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(192,132,252,0.18)',
        boxShadow: '0 4px 20px rgba(180,120,255,0.10)',
      }}>
      {/* Label */}
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📁</span>
          <div>
            <p className="text-sm font-bold" style={{ color: '#4c1d95' }}>我的简历（{resumes.length} 份）</p>
            <p className="text-xs" style={{ color: '#a07cc0' }}>支持 PDF / DOCX / TXT，最多保存 5 份</p>
          </div>
        </div>
      </div>

      {/* Resume chips */}
      <div className="flex-1 flex items-center gap-2 flex-wrap">
        {resumes.length === 0 && (
          <p className="text-xs" style={{ color: '#b09ac8' }}>还没有简历</p>
        )}
        {resumes.map(r => (
          <div key={r.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: r.is_active ? 'linear-gradient(135deg, rgba(192,132,252,0.15), rgba(244,114,182,0.15))' : 'rgba(255,255,255,0.7)',
              border: r.is_active ? '1px solid rgba(192,132,252,0.35)' : '1px solid rgba(192,132,252,0.15)',
              color: '#6b35c7',
            }}>
            {statusIcon[r.status] || statusIcon.uploaded}
            <span className="max-w-[120px] truncate">{r.title}</span>
            {r.is_active && <span style={{ color: '#c084fc' }}>●</span>}
          </div>
        ))}
      </div>

      {/* Upload button */}
      {resumes.length < 5 && (
        <label className="shrink-0 cursor-pointer">
          <input type="file" accept=".pdf,.docx,.txt,.doc" className="hidden" onChange={onUpload} />
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)', boxShadow: '0 4px 16px rgba(192,132,252,0.35)' }}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            上传新简历
          </div>
        </label>
      )}
    </div>
  );
}
