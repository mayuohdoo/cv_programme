import { Link } from 'react-router-dom';
import { Upload, Sparkles, Target, BarChart3, ArrowRight } from 'lucide-react';

export default function StatusDashboardCard({ resumes, applications, onStartParse, onUpload }) {
  const hasParsed = resumes.some(r => r.status === 'parsed');
  const hasUploaded = resumes.some(r => r.file_url);
  const pendingCount = resumes.filter(r => r.status === 'uploaded' || r.status === 'parsing').length;

  let card;

  if (applications.length > 0) {
    const pending = applications.filter(a => a.status === '投递中').length;
    const interview = applications.filter(a => a.status === '约面试').length;
    card = {
      icon: '📊', gradient: 'linear-gradient(135deg, #a78bfa, #818cf8)',
      title: `${applications.length} 份投递进行中`,
      sub: `${pending} 份待回复 · ${interview} 份约面试 · 加油！`,
      actions: (
        <div className="flex gap-2 flex-wrap">
          <Link to="/applications">
            <button className="px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)', boxShadow: '0 4px 16px rgba(192,132,252,0.4)' }}>
              查看投递追踪 <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </Link>
          <Link to="/interview">
            <button className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(192,132,252,0.12)', color: '#7c3aed', border: '1px solid rgba(192,132,252,0.3)' }}>
              继续练习面试
            </button>
          </Link>
        </div>
      )
    };
  } else if (hasParsed) {
    card = {
      icon: '🎯', gradient: 'linear-gradient(135deg, #f472b6, #fb923c)',
      title: '解析完成！去看看匹配岗位',
      sub: '根据你的技能和专业，已为你精准匹配推荐岗位',
      actions: (
        <Link to="/jobs">
          <button className="px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)', boxShadow: '0 4px 16px rgba(192,132,252,0.4)' }}>
            查看岗位推荐 <ArrowRight className="w-4 h-4 inline ml-1" />
          </button>
        </Link>
      )
    };
  } else if (hasUploaded) {
    card = {
      icon: '✨', gradient: 'linear-gradient(135deg, #c084fc, #818cf8)',
      title: `简历已上传，开始 AI 解析吧`,
      sub: '解析完成后即可获得精准岗位推荐和面试准备建议',
      actions: (
        <button onClick={onStartParse}
          className="px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #f472b6, #fb923c)', boxShadow: '0 4px 16px rgba(244,114,182,0.4)' }}>
          开始 AI 解析 ✨
        </button>
      )
    };
  } else {
    card = {
      icon: '🚀', gradient: 'linear-gradient(135deg, #c084fc, #f472b6)',
      title: '你好！先上传你的简历',
      sub: '上传简历后，AI 会帮你解析并推荐匹配岗位',
      actions: (
        <label>
          <input type="file" accept=".pdf,.docx,.txt,.doc" className="hidden" onChange={onUpload} />
          <button asChild className="px-5 py-2.5 rounded-full text-white text-sm font-semibold inline-flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)', boxShadow: '0 4px 16px rgba(192,132,252,0.4)' }}>
            <Upload className="w-4 h-4" /> 上传简历
          </button>
        </label>
      )
    };
  }

  return (
    <div className="rounded-3xl p-5 relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.85)',
        boxShadow: '0 8px 32px rgba(180,120,255,0.18), 0 2px 8px rgba(180,120,255,0.08)',
        border: '1px solid rgba(255,255,255,0.95)'
      }}>
      {/* Left gradient bar */}
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full" style={{ background: card.gradient }} />
      <div className="pl-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl">{card.icon}</span>
          <div>
            <h3 className="font-bold text-base leading-tight" style={{ color: '#4c1d95' }}>{card.title}</h3>
            <p className="text-xs mt-1" style={{ color: '#9d7ab8' }}>{card.sub}</p>
          </div>
        </div>
        {card.actions}
      </div>
    </div>
  );
}
