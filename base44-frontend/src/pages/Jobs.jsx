import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, TrendingUp, Building2, Chrome } from 'lucide-react';
import LockedState from '@/components/LockedState';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function Jobs() {
  const { step } = useOutletContext();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    if (step < 2) return;
    const fetchJobs = async () => {
      setLoading(true);
      const resumes = await base44.entities.Resume.filter({ status: 'parsed' }, '-created_date', 1);
      if (resumes.length === 0) { setLoading(false); return; }
      const parsed = resumes[0].parsed_data;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `基于以下求职者信息，推荐5个适合的实习或初级岗位。求职者信息：${JSON.stringify(parsed)}。请生成真实合理的岗位推荐，包含匹配度百分比（75-98之间）。`,
        response_json_schema: {
          type: "object",
          properties: {
            jobs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  company: { type: "string" },
                  industry: { type: "string" },
                  city: { type: "string" },
                  salary: { type: "string" },
                  match: { type: "number" },
                  description: { type: "string" },
                  requirements: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });
      setJobs(result.jobs || []);
      setLoading(false);
    };
    fetchJobs();
  }, [step]);

  const handleApply = async (job) => {
    await base44.entities.Application.create({
      company: job.company, position: job.title, industry: job.industry,
      city: job.city, salary_range: job.salary, match_score: job.match,
      status: '投递中', applied_date: new Date().toISOString().split('T')[0],
    });
    toast.success(`已添加「${job.title}」到投递追踪 🎉`);
  };

  if (step < 2) {
    return <LockedState message="先完成简历解析，才能为你精准匹配岗位哦 ✨" linkText="去上传简历" linkTo="/" />;
  }

  return (
    <div className="space-y-5">
      <h2 className="font-bold text-lg" style={{ color: '#6b35c7' }}>✨ 为你推荐的岗位</h2>
      {loading ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: '#c97ddc' }} />
          <p className="text-sm" style={{ color: '#9d7ab8' }}>AI 正在为你匹配岗位...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, i) => (
            <div key={i} className="rounded-3xl p-5 transition-transform hover:-translate-y-1 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.82)',
                boxShadow: '0 8px 32px rgba(180,120,255,0.14), 0 2px 8px rgba(180,120,255,0.07)',
                border: '1px solid rgba(255,255,255,0.9)'
              }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm" style={{ color: '#3d1f6b' }}>{job.title}</h3>
                  <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#9d7ab8' }}>
                    <Building2 className="w-3 h-3" />{job.company} · {job.industry}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: 'linear-gradient(135deg, rgba(201,125,220,0.2), rgba(232,123,172,0.2))', color: '#c97ddc', border: '1px solid rgba(201,125,220,0.3)' }}>
                  <TrendingUp className="w-3 h-3 inline mr-1" />{job.match}%
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs mb-4" style={{ color: '#a07cc0' }}>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city}</span>
                <span>·</span><span>{job.salary}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedJob(job)}
                  className="flex-1 py-2 rounded-2xl text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: 'rgba(180,120,255,0.1)', color: '#8b4dcc', border: '1px solid rgba(180,120,255,0.2)' }}>
                  了解更多
                </button>
                <button onClick={() => handleApply(job)}
                  className="flex-1 py-2 rounded-2xl text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)', boxShadow: '0 4px 12px rgba(201,125,220,0.35)' }}>
                  我要投递 🚀
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chrome hint */}
      <div className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(180,120,255,0.15)', boxShadow: '0 4px 16px rgba(180,120,255,0.08)' }}>
        <Chrome className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#c97ddc' }} />
        <p className="text-xs" style={{ color: '#9d7ab8' }}>安装 Chrome 插件后，可在招聘网站一键填充简历信息、自动记录投递</p>
      </div>

      {/* Mock interview */}
      <Link to="/interview">
        <div className="rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-transform hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, rgba(147,112,219,0.12), rgba(201,125,220,0.12))', border: '1px solid rgba(180,120,255,0.2)' }}>
          <p className="text-sm font-semibold" style={{ color: '#6b35c7' }}>💬 想提前练练？试试 AI 模拟面试</p>
          <span style={{ color: '#c97ddc' }}>→</span>
        </div>
      </Link>

      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="rounded-3xl max-w-sm" style={{ background: 'rgba(255,255,255,0.95)' }}>
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base" style={{ color: '#3d1f6b' }}>{selectedJob.title}</DialogTitle>
                <DialogDescription style={{ color: '#9d7ab8' }}>{selectedJob.company} · {selectedJob.city}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p style={{ color: '#5a3a8a' }}>{selectedJob.description}</p>
                {selectedJob.requirements?.length > 0 && (
                  <div>
                    <p className="font-semibold text-xs mb-1" style={{ color: '#7c3aed' }}>岗位要求：</p>
                    <ul className="list-disc list-inside text-xs space-y-1" style={{ color: '#9d7ab8' }}>
                      {selectedJob.requirements.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                <button className="w-full py-3 rounded-2xl text-white font-semibold text-sm transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #c97ddc, #e87bac)', boxShadow: '0 4px 16px rgba(201,125,220,0.4)' }}
                  onClick={() => { handleApply(selectedJob); setSelectedJob(null); }}>
                  我要投递 🚀
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
