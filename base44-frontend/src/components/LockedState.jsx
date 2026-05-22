import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function LockedState({ message, linkText, linkTo }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm max-w-xs mb-4">{message}</p>
      {linkTo && (
        <Link to={linkTo}>
          <Button variant="outline" className="rounded-full">{linkText} →</Button>
        </Link>
      )}
    </div>
  );
}
