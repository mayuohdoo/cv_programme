import { MapPin, TrendingUp, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function JobCard({ job, onApply, onDetail }) {
  return (
    <Card className="p-4 rounded-2xl hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-sm">{job.title}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3" /> {job.company} · {job.industry}
          </p>
        </div>
        <Badge className="rounded-full bg-primary/15 text-primary border-0 text-xs font-bold">
          <TrendingUp className="w-3 h-3 mr-1" /> {job.match}%
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city}</span>
        <span>·</span>
        <span>{job.salary}</span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="rounded-full flex-1 text-xs" onClick={onDetail}>了解更多</Button>
        <Button size="sm" className="rounded-full flex-1 text-xs" onClick={onApply}>我要投递 🚀</Button>
      </div>
    </Card>
  );
}
