import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = ['上传', '解析', '推荐', '投递', '追踪'];
const stepGradients = [
  'from-violet-400 to-purple-500',
  'from-purple-400 to-pink-400',
  'from-pink-400 to-rose-400',
  'from-rose-400 to-orange-400',
  'from-orange-400 to-amber-400',
];

export default function JourneyProgress({ currentStep = 0 }) {
  return (
    <div className="flex items-center justify-center w-full gap-0">
      {steps.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={label} className="flex items-center">
            {/* Step dot */}
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "relative flex items-center justify-center rounded-full transition-all duration-500",
                done || active ? "w-7 h-7" : "w-5 h-5"
              )}>
                {/* Glow ring for active */}
                {active && (
                  <div className={cn("absolute inset-0 rounded-full bg-gradient-to-br opacity-30 animate-pulse scale-150", stepGradients[i])} />
                )}
                <div className={cn(
                  "rounded-full flex items-center justify-center transition-all duration-500",
                  done || active ? "w-7 h-7" : "w-5 h-5",
                  done ? `bg-gradient-to-br ${stepGradients[i]} shadow-md` :
                  active ? `bg-gradient-to-br ${stepGradients[i]} shadow-lg ring-4 ring-white/80` :
                  "bg-white/60 border-2 border-purple-200/60"
                )}>
                  {done ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <span className={cn("text-[9px] font-bold", active ? "text-white" : "text-purple-300")}>{i + 1}</span>
                  )}
                </div>
              </div>
              <span className={cn(
                "text-[9px] font-semibold whitespace-nowrap transition-colors",
                done || active ? "text-foreground" : "text-muted-foreground/60"
              )}>{label}</span>
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={cn(
                "h-0.5 w-8 mx-1 mb-3 rounded-full transition-all duration-500",
                i < currentStep
                  ? `bg-gradient-to-r ${stepGradients[i]}`
                  : "bg-purple-100"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
