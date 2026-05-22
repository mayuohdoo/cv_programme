import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

const tools = [
  {
    emoji: '📄', title: '简历诊断', desc: 'AI 找出简历亮点与改进空间，让你脱颖而出',
    link: '/', linkText: '开始诊断', locked: false,
    gradient: 'linear-gradient(135deg, #f5eeff, #fce7f3)',
  },
  {
    emoji: '🎯', title: '岗位推荐', desc: '解析简历后为你精准匹配最合适的岗位',
    link: '/jobs', linkText: '查看推荐', locked: true,
    gradient: 'linear-gradient(135deg, #eef2ff, #f5eeff)',
  },
  {
    emoji: '🎤', title: '模拟面试', desc: 'AI 面试官帮你练习，告别面试紧张',
    link: '/interview', linkText: '开始练习', locked: true,
    gradient: 'linear-gradient(135deg, #ecfdf5, #eef2ff)',
  },
  {
    emoji: '📊', title: '投递追踪', desc: '可视化追踪所有投递进展，不漏掉任何机会',
    link: '/applications', linkText: '查看追踪', locked: true,
    gradient: 'linear-gradient(135deg, #fff7ed, #fce7f3)',
  },
];

export default function ToolGrid({ hasParsed }) {
  const items = tools.map(t => ({ ...t, locked: t.locked && !hasParsed }));

  return (
    <div>
      <h3 className="font-bold text-sm mb-4" style={{ color: '#6b35c7' }}>求职工具箱</h3>
      <div className="grid grid-cols-4 gap-4">
        {items.map(tool => (
          <div key={tool.title} className="rounded-3xl p-5 relative overflow-hidden transition-all hover:-translate-y-1"
            style={{
              background: tool.gradient,
              boxShadow: '0 4px 20px rgba(180,120,255,0.12)',
              border: '1px solid rgba(255,255,255,0.9)',
              opacity: tool.locked ? 0.65 : 1,
            }}>
            {tool.locked && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(192,132,252,0.18)' }}>
                <Lock className="w-3.5 h-3.5" style={{ color: '#c084fc' }} />
              </div>
            )}
            <div className="text-3xl mb-3">{tool.emoji}</div>
            {tool.locked && <p className="text-[10px] font-semibold mb-1" style={{ color: '#c084fc' }}>待解锁</p>}
            <h4 className="font-bold text-sm mb-1.5" style={{ color: '#4c1d95' }}>{tool.title}</h4>
            <p className="text-xs leading-relaxed mb-4" style={{ color: '#7c5da8' }}>{tool.desc}</p>
            {!tool.locked ? (
              <Link to={tool.link}>
                <button className="text-xs font-bold px-4 py-2 rounded-full text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)', boxShadow: '0 4px 12px rgba(192,132,252,0.35)' }}>
                  {tool.linkText}
                </button>
              </Link>
            ) : (
              <p className="text-xs" style={{ color: '#b09ac8' }}>解析简历后为你解锁</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
