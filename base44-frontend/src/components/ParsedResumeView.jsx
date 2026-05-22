import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, User, Wrench, Briefcase, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ParsedResumeView({ resume, onUpdate }) {
  const [data, setData] = useState(resume.parsed_data || {});
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Resume.update(resume.id, { parsed_data: data });
    toast.success('简历信息已更新');
    setSaving(false);
    onUpdate?.();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field icon={<User className="w-4 h-4" />} label="姓名" value={data.name} onChange={v => update('name', v)} />
        <Field icon={<GraduationCap className="w-4 h-4" />} label="学校" value={data.school} onChange={v => update('school', v)} />
        <Field label="专业" value={data.major} onChange={v => update('major', v)} />
        <Field label="学历" value={data.degree} onChange={v => update('degree', v)} />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Wrench className="w-3 h-3" /> 技能标签
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(data.skills || []).map((s, i) => (
            <Badge key={i} variant="secondary" className="rounded-full text-xs">{s}</Badge>
          ))}
          {(!data.skills || data.skills.length === 0) && <span className="text-xs text-muted-foreground">暂无</span>}
        </div>
      </div>

      {data.experience?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> 经历
          </p>
          <div className="space-y-2">
            {data.experience.map((exp, i) => (
              <div key={i} className="rounded-xl bg-muted/50 p-3">
                <p className="text-sm font-semibold">{exp.company} · {exp.role}</p>
                <p className="text-xs text-muted-foreground">{exp.duration}</p>
                {exp.description && <p className="text-xs mt-1">{exp.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full rounded-full">
        <Save className="w-4 h-4 mr-2" /> {saving ? '保存中...' : '保存修改'}
      </Button>
    </div>
  );
}

function Field({ icon, label, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-1">
        {icon} {label}
      </label>
      <Input value={value || ''} onChange={e => onChange(e.target.value)} className="h-9 text-sm rounded-xl" />
    </div>
  );
}
