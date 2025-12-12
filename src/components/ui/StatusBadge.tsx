import { cn } from '@/lib/utils';
import { IssueStatus, IssueSubstatus, STATUS_LABELS, SUBSTATUS_LABELS } from '@/types/database';
import { Circle, CheckCircle2, PlayCircle, Pause, Coffee, Package, Trash2 } from 'lucide-react';

interface StatusBadgeProps {
  status: IssueStatus;
  substatus?: IssueSubstatus | null;
  className?: string;
}

const statusConfig: Record<IssueStatus, { icon: typeof Circle; className: string }> = {
  nowe: {
    icon: Circle,
    className: 'bg-status-new/10 text-status-new border-status-new/20',
  },
  zaakceptowane: {
    icon: CheckCircle2,
    className: 'bg-status-accepted/10 text-status-accepted border-status-accepted/20',
  },
  w_realizacji: {
    icon: PlayCircle,
    className: 'bg-status-in-progress/10 text-status-in-progress border-status-in-progress/20',
  },
  zakonczone: {
    icon: CheckCircle2,
    className: 'bg-status-completed/10 text-status-completed border-status-completed/20',
  },
  usuniete: {
    icon: Trash2,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

const substatusConfig: Record<IssueSubstatus, { icon: typeof Circle; className: string }> = {
  aktywne: {
    icon: PlayCircle,
    className: 'bg-status-in-progress/10 text-status-in-progress border-status-in-progress/20',
  },
  wstrzymane: {
    icon: Pause,
    className: 'bg-status-paused/10 text-status-paused border-status-paused/20',
  },
  przerwa: {
    icon: Coffee,
    className: 'bg-status-break/10 text-status-break border-status-break/20',
  },
  brak_czesci: {
    icon: Package,
    className: 'bg-status-no-parts/10 text-status-no-parts border-status-no-parts/20',
  },
};

export function StatusBadge({ status, substatus, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  // If in progress and has substatus, show substatus instead
  if (status === 'w_realizacji' && substatus && substatus !== 'aktywne') {
    const subConfig = substatusConfig[substatus];
    const SubIcon = subConfig.icon;
    return (
      <span
        className={cn(
          'status-badge border gap-1.5',
          subConfig.className,
          className
        )}
      >
        <SubIcon className="h-3 w-3" />
        {SUBSTATUS_LABELS[substatus]}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'status-badge border gap-1.5',
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {STATUS_LABELS[status]}
    </span>
  );
}
