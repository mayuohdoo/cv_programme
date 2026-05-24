import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusColors = {
  '投递中': 'bg-blue-100 text-blue-700',
  '已查看': 'bg-amber-100 text-amber-700',
  '约面试': 'bg-purple-100 text-purple-700',
  '已拒绝': 'bg-red-100 text-red-700',
  '已offer': 'bg-green-100 text-green-700',
};
const statuses = ['投递中', '已查看', '约面试', '已拒绝', '已offer'];

export default function ApplicationCard({ app, onStatusChange }) {
  return (
    <Card className="p-4 rounded-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-sm">{app.position}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{app.company}</p>
        </div>
        {app.match_score && (
          <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />{app.match_score}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        {app.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.city}</span>}
        {app.applied_date && <span>{app.applied_date}</span>}
      </div>
      <div className="mt-3">
        <Select value={app.status} onValueChange={v => onStatusChange(app.id, v)}>
          <SelectTrigger className={cn("h-8 rounded-full text-xs w-auto px-3", statusColors[app.status])}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
