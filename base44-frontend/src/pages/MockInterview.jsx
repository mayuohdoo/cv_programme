import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Send, Bot, User, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import LockedState from '@/components/LockedState';

export default function MockInterview() {
  const { step } = useOutletContext();
  const [position, setPosition] = useState('');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (step < 2) {
    return <LockedState message="先完成简历解析，才能开始模拟面试哦 📝" linkText="去上传简历" linkTo="/" />;
  }

  const startInterview = async () => {
    if (!position.trim()) return;
    setStarted(true);
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `你是一位友善但专业的面试官，正在面试一位应聘「${position}」岗位的应届毕业生。请用中文提出第一个面试问题。只需要提问，不需要其他说明。`,
    });
    setMessages([{ role: 'ai', content: result }]);
    setQuestionCount(1);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    const isLast = questionCount >= 4;
    const history = messages.map(m => `${m.role === 'ai' ? '面试官' : '候选人'}：${m.content}`).join('\n');
    const prompt = isLast
      ? `以下是一场「${position}」岗位的模拟面试对话：\n${history}\n候选人：${userMsg}\n\n面试结束了，请给出面试反馈总结，包括：1. 优点 2. 待改进点 3. 建议。用温暖鼓励的语气。`
      : `你是面试官，正在面试「${position}」岗位。以下是之前的对话：\n${history}\n候选人：${userMsg}\n\n请对候选人的回答做简短点评，然后提出下一个面试问题。`;
    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages(prev => [...prev, { role: 'ai', content: result }]);
    setQuestionCount(q => q + 1);
    setLoading(false);
  };

  const reset = () => { setStarted(false); setMessages([]); setPosition(''); setQuestionCount(0); };

  if (!started) {
    return (
      <div className="space-y-6">
        <div className="text-center py-6">
          <div className="text-5xl mb-4">🎤</div>
          <h2 className="font-bold text-xl mb-2" style={{ color: '#6b35c7' }}>AI 模拟面试</h2>
          <p className="text-sm" style={{ color: '#9d7ab8' }}>选择目标岗位，开始一场沉浸式面试练习</p>
        </div>
        <div className="space-y-3">
          <input
            placeholder="输入目标岗位，如：前端开发实习生"
            value={position}
            onChange={e => setPosition(e.target.value)}
            className="w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(180,120,255,0.25)', color: '#4a2d6b' }}
            onKeyDown={e => e.key === 'Enter' && startInterview()}
          />
          <button onClick={startInterview} disabled={!position.trim()}
            className="w-full py-3 rounded-2xl text-white font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)', boxShadow: '0 4px 20px rgba(201,125,220,0.35)' }}>
            开始面试 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm" style={{ color: '#6b35c7' }}>🎤 面试：{position}</h3>
        <button onClick={reset} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all"
          style={{ background: 'rgba(180,120,255,0.1)', color: '#8b4dcc' }}>
          <RotateCcw className="w-3 h-3" /> 重来
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
            {msg.role === 'ai' && (
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)' }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm"
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
              <p className="text-sm" style={{ color: '#9d7ab8' }}>思考中...</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {questionCount <= 5 && (
        <div className="flex gap-2 pt-3 border-t border-purple-100/60">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="输入你的回答..."
            className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(180,120,255,0.25)', color: '#4a2d6b' }}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} disabled={loading}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)', boxShadow: '0 4px 16px rgba(180,120,255,0.3)' }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
