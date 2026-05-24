import { FileText, Check, Loader2, AlertCircle, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const statusConfig = {
  uploaded: { label: '已上传', color: 'bg-blue-100 text-blue-700', icon: FileText },
  parsing: { label: '解析中...', color: 'bg-amber-100 text-amber-700', icon: Loader2 },
  parsed: { label: '已解析 ✓', color: 'bg-green-100 text-green-700', icon: Check },
  error: { label: '解析失败', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function ResumeCard({ resume, onSetActive, onDelete, onView }) {
  const cfg = statusConfig[resume.status] || statusConfig.uploaded;
  const Icon = cfg.icon;

  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-all",
      resume.is_active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{resume.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", cfg.color)}>
                {resume.status === 'parsing' && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
                {cfg.label}
              </span>
              {resume.is_active && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary">使用中</span>
              )}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {resume.status === 'parsed' && <DropdownMenuItem onClick={onView}>查看解析结果</DropdownMenuItem>}
            {!resume.is_active && <DropdownMenuItem onClick={onSetActive}>设为当前简历</DropdownMenuItem>}
            <DropdownMenuItem onClick={onDelete} className="text-destructive">删除</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
