import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const quickQuestions = [
  { cat: '📝 简历优化', items: ['怎么让简历更出彩？', '实习经验太少怎么写？'] },
  { cat: '🎤 面试技巧', items: ['自我介绍怎么说？', '面试紧张怎么办？'] },
  { cat: '💼 岗位选择', items: ['不知道适合什么岗位', '大厂和小公司怎么选？'] },
  { cat: '🌱 职业规划', items: ['第一份工作重要吗？', '考研还是工作？'] },
];

const capsuleGradients = [
  'linear-gradient(135deg, rgba(201,125,220,0.15), rgba(232,123,172,0.15))',
  'linear-gradient(135deg, rgba(147,112,219,0.15), rgba(201,125,220,0.15))',
  'linear-gradient(135deg, rgba(255,153,187,0.15), rgba(255,180,200,0.15))',
  'linear-gradient(135deg, rgba(168,130,255,0.15), rgba(201,125,220,0.15))',
];

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (text) => {
    const content = text || input;
    if (!content.trim() || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    setLoading(true);
    const history = messages.slice(-10).map(m => `${m.role === 'ai' ? '助手' : '用户'}：${m.content}`).join('\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `你是"小小"，一个温暖友善的AI求职助手，专门帮助大学生和应届毕业生求职。用轻松、鼓励的语气回答。对话历史：\n${history}\n用户：${content}\n\n请用中文回答，简洁实用。`,
    });
    setMessages(prev => [...prev, { role: 'ai', content: result }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="mb-5">
        <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: '#6b35c7' }}>🤖 小小·求职助手</h2>
        <p className="text-xs mt-0.5" style={{ color: '#9d7ab8' }}>有任何求职问题都可以问我哦～</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="space-y-5">
            {/* Welcome bubble */}
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)' }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[75%]"
                style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 4px 16px rgba(180,120,255,0.12)', border: '1px solid rgba(255,255,255,0.9)' }}>
                <p className="text-sm" style={{ color: '#4a2d6b' }}>你好！我是小小 👋 你的专属求职顾问，有啥问题都可以问我～</p>
              </div>
            </div>
            {quickQuestions.map((cat, ci) => (
              <div key={cat.cat}>
                <p className="text-xs font-bold mb-2" style={{ color: '#a07cc0' }}>{cat.cat}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((q, qi) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-xs px-4 py-2 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: capsuleGradients[(ci + qi) % capsuleGradients.length],
                        color: '#7c3aed',
                        border: '1px solid rgba(180,120,255,0.2)',
                        boxShadow: '0 2px 8px rgba(180,120,255,0.10)'
                      }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
            {msg.role === 'ai' && (
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)' }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm")}
              style={msg.role === 'user'
                ? { background: 'linear-gradient(135deg, #c97ddc, #e87bac)', color: 'white', boxShadow: '0 4px 16px rgba(180,120,255,0.3)' }
                : { background: 'rgba(255,255,255,0.85)', color: '#4a2d6b', boxShadow: '0 4px 16px rgba(180,120,255,0.10)', border: '1px solid rgba(255,255,255,0.9)' }
              }>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(180,120,255,0.2)' }}>
                <User className="w-4 h-4" style={{ color: '#c97ddc' }} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)' }}>
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 4px 16px rgba(180,120,255,0.10)' }}>
              <p className="text-sm" style={{ color: '#9d7ab8' }}>小小正在思考...</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-purple-100/60">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入你的问题..."
          className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.75)',
            border: '1px solid rgba(180,120,255,0.25)',
            color: '#4a2d6b',
          }}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={() => sendMessage()} disabled={loading}
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)', boxShadow: '0 4px 16px rgba(180,120,255,0.3)' }}>
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
