import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';

const features = [
  {
    emoji: '📄',
    title: '简历诊断',
    desc: 'AI 深度分析你的简历，找出亮点和改进空间，让简历更出彩',
    tags: ['关键词优化', 'ATS 适配', '内容建议'],
    link: '/',
    linkText: '查看简历 →',
    gradient: 'linear-gradient(135deg, #f0e4ff, #ffe4f5)',
    requireParsed: false,
  },
  {
    emoji: '🎯',
    title: '岗位推荐',
    desc: '基于你的简历技能与专业，精准匹配最适合的实习和校招岗位',
    tags: ['精准匹配', 'JD 分析', '薪资参考'],
    link: '/jobs',
    linkText: '查看推荐 →',
    gradient: 'linear-gradient(135deg, #e4f0ff, #f0e4ff)',
    requireParsed: true,
  },
  {
    emoji: '🎤',
    title: '面试辅导',
    desc: 'AI 模拟真实面试场景，帮你练习口头表达，提升面试通过率',
    tags: ['模拟提问', '实时反馈', '答题技巧'],
    link: '/interview',
    linkText: '开始练习 →',
    gradient: 'linear-gradient(135deg, #e4fff4, #e4f0ff)',
    requireParsed: true,
  },
  {
    emoji: '📊',
    title: '投递追踪',
    desc: '一站式管理你的所有求职进展，不遗漏任何一个机会',
    tags: ['进度追踪', '状态管理', '提醒通知'],
    link: '/applications',
    linkText: '查看追踪 →',
    gradient: 'linear-gradient(135deg, #fff4e4, #ffe4f5)',
    requireParsed: false,
  },
];

export default function FeatureCarousel({ hasParsed }) {
  const [current, setCurrent] = useState(1);
  const prev = () => setCurrent(c => (c - 1 + features.length) % features.length);
  const next = () => setCurrent(c => (c + 1) % features.length);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-sm" style={{ color: '#6b35c7' }}>✦ 求职工具箱</h3>
      <div className="relative flex items-center gap-3 py-4 overflow-hidden">
        {/* Prev arrow */}
        <button onClick={prev}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 4px 12px rgba(180,120,255,0.2)', border: '1px solid rgba(255,255,255,0.9)' }}>
          <ChevronLeft className="w-5 h-5" style={{ color: '#c084fc' }} />
        </button>

        {/* Cards */}
        <div className="flex-1 flex items-center justify-center gap-2 overflow-hidden">
          {[-1, 0, 1].map(offset => {
            const idx = (current + offset + features.length) % features.length;
            const f = features[idx];
            const locked = f.requireParsed && !hasParsed;
            const isCenter = offset === 0;
            return (
              <div key={idx}
                className="transition-all duration-300 shrink-0"
                style={{
                  width: isCenter ? '240px' : '160px',
                  transform: isCenter ? 'scale(1)' : 'scale(0.85)',
                  opacity: isCenter ? 1 : 0.6,
                  filter: isCenter ? 'none' : 'blur(1px)',
                }}>
                <div className="rounded-3xl p-5 h-full relative overflow-hidden"
                  style={{
                    background: isCenter ? f.gradient : 'rgba(255,255,255,0.6)',
                    boxShadow: isCenter ? '0 12px 40px rgba(180,120,255,0.22), 0 4px 12px rgba(180,120,255,0.12)' : '0 4px 16px rgba(180,120,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.95)',
                    minHeight: isCenter ? '220px' : '180px',
                  }}>
                  {locked && (
                    <div className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center z-10"
                      style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(4px)' }}>
                      <Lock className="w-6 h-6 mb-2" style={{ color: '#c084fc' }} />
                      <p className="text-xs text-center font-medium" style={{ color: '#9d7ab8' }}>完成简历解析后解锁</p>
                    </div>
                  )}
                  <div className="text-3xl mb-3">{f.emoji}</div>
                  <h4 className="font-bold text-sm mb-2" style={{ color: '#4c1d95' }}>{f.title}</h4>
                  {isCenter && (
                    <>
                      <p className="text-xs mb-3 leading-relaxed" style={{ color: '#7c5da8' }}>{f.desc}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {f.tags.map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(192,132,252,0.15)', color: '#7c3aed' }}>{t}</span>
                        ))}
                      </div>
                      {!locked && (
                        <Link to={f.link}>
                          <button className="text-xs font-bold px-4 py-2 rounded-full text-white transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #c084fc, #f472b6)', boxShadow: '0 4px 12px rgba(192,132,252,0.35)' }}>
                            {f.linkText}
                          </button>
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Next arrow */}
        <button onClick={next}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 4px 12px rgba(180,120,255,0.2)', border: '1px solid rgba(255,255,255,0.9)' }}>
          <ChevronRight className="w-5 h-5" style={{ color: '#c084fc' }} />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2">
        {features.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className="rounded-full transition-all"
            style={{
              width: i === current ? '20px' : '6px',
              height: '6px',
              background: i === current ? 'linear-gradient(135deg, #c084fc, #f472b6)' : 'rgba(192,132,252,0.3)',
            }} />
        ))}
      </div>
    </div>
  );
}
