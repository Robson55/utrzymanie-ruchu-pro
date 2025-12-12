import { cn } from '@/lib/utils';
import { IssuePriority, PRIORITY_LABELS } from '@/types/database';
import { ArrowDown, ArrowRight, ArrowUp, AlertTriangle } from 'lucide-react';

interface PriorityBadgeProps {
  priority: IssuePriority;
  className?: string;
}

const priorityConfig: Record<IssuePriority, { icon: typeof ArrowDown; className: string }> = {
  niski: {
    icon: ArrowDown,
    className: 'bg-priority-low/10 text-priority-low border-priority-low/20',
  },
  sredni: {
    icon: ArrowRight,
    className: 'bg-priority-medium/10 text-priority-medium border-priority-medium/20',
  },
  wysoki: {
    icon: ArrowUp,
    className: 'bg-priority-high/10 text-priority-high border-priority-high/20',
  },
  krytyczny: {
    icon: AlertTriangle,
    className: 'bg-priority-critical/10 text-priority-critical border-priority-critical/20',
  },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'status-badge border gap-1.5',
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
