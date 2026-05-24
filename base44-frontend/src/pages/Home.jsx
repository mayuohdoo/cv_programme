import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import StatusDashboardCard from '@/components/StatusDashboardCard';
import ToolGrid from '@/components/ToolGrid';
import ResumeBar from '@/components/ResumeBar';

export default function Home() {
  const { setStep } = useOutletContext();
  const [resumes, setResumes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [resumeData, appData] = await Promise.all([
      base44.entities.Resume.list('-created_date', 5),
      base44.entities.Application.list('-created_date', 20),
    ]);
    setResumes(resumeData);
    setApplications(appData);
    const hasParsed = resumeData.some(r => r.status === 'parsed');
    const hasUploaded = resumeData.some(r => r.file_url);
    if (!hasUploaded) setStep(0);
    else if (!hasParsed) setStep(1);
    else if (appData.length === 0) setStep(2);
    else setStep(4);
    setLoading(false);
  };

  useEffect(() => {
    load();
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const resume = await base44.entities.Resume.create({
      title: file.name.replace(/\.[^.]+$/, ''),
      file_url,
      status: 'uploaded',
      is_active: resumes.length === 0,
    });
    toast.success('简历上传成功！');
    setUploading(false);
    load();
    handleParseResume(resume, file_url);
  };

  const handleParseResume = async (resume, fileUrl) => {
    const targetResume = resume || resumes.find(r => r.status === 'uploaded');
    if (!targetResume) return;
    const url = fileUrl || targetResume.file_url;
    await base44.entities.Resume.update(targetResume.id, { status: 'parsing' });
    load();
    toast.success('开始 AI 解析...');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `解析以下简历文件，提取结构化信息。请用中文返回。`,
      file_urls: [url],
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          school: { type: "string" },
          major: { type: "string" },
          degree: { type: "string" },
          skills: { type: "array", items: { type: "string" } },
          experience: { type: "array", items: { type: "object", properties: { company: { type: "string" }, role: { type: "string" }, duration: { type: "string" }, description: { type: "string" } } } },
          summary: { type: "string" }
        }
      }
    });
    await base44.entities.Resume.update(targetResume.id, { parsed_data: result, status: 'parsed' });
    setStep(2);
    toast.success('🎉 简历解析完成！');
    load();
  };

  const hasParsed = resumes.some(r => r.status === 'parsed');
  const firstName = user?.full_name?.split(' ')[0] || user?.full_name || '';

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#c084fc' }} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-bold text-3xl" style={{ color: '#3b0764' }}>
          Hi{firstName ? `，${firstName}` : ''} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9d7ab8' }}>今天也要元气满满地求职哦～</p>
      </div>

      {/* Status card */}
      <StatusDashboardCard
        resumes={resumes}
        applications={applications}
        onStartParse={() => handleParseResume()}
        onUpload={handleUpload}
      />

      {/* Tool grid */}
      <ToolGrid hasParsed={hasParsed} />

      {/* Resume bar */}
      <ResumeBar resumes={resumes} onUpload={handleUpload} uploading={uploading} />
    </div>
  );
}
