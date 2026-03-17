import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorHandler';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Issue, IssueStatus, IssuePriority, IssueSubstatus } from '@/types/database';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PlayCircle,
  Plus,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface DashboardStats {
  total: number;
  new: number;
  accepted: number;
  inProgress: number;
  completed: number;
}

export default function Dashboard() {
  const { roles } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    new: 0,
    accepted: 0,
    inProgress: 0,
    completed: 0,
  });
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch stats
        const { data: issues } = await supabase
          .from('issues')
          .select('status');

        if (issues) {
          setStats({
            total: issues.length,
            new: issues.filter((i) => i.status === 'nowe').length,
            accepted: issues.filter((i) => i.status === 'zaakceptowane').length,
            inProgress: issues.filter((i) => i.status === 'w_realizacji').length,
            completed: issues.filter((i) => i.status === 'zakonczone').length,
          });
        }

        // Fetch recent issues
        const { data: recent } = await supabase
          .from('issues')
          .select(`
            *,
            machine:machines(name, machine_number)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recent) {
          setRecentIssues(recent as unknown as Issue[]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Nowe zgłoszenia',
      value: stats.new,
      icon: AlertCircle,
      className: 'text-status-new',
      bgClassName: 'bg-status-new/10',
      link: '/issues?status=nowe',
    },
    {
      title: 'Zaakceptowane',
      value: stats.accepted,
      icon: CheckCircle2,
      className: 'text-status-accepted',
      bgClassName: 'bg-status-accepted/10',
      link: '/issues?status=zaakceptowane',
    },
    {
      title: 'W realizacji',
      value: stats.inProgress,
      icon: PlayCircle,
      className: 'text-status-in-progress',
      bgClassName: 'bg-status-in-progress/10',
      link: '/issues?status=w_realizacji',
    },
    {
      title: 'Zakończone',
      value: stats.completed,
      icon: CheckCircle2,
      className: 'text-status-completed',
      bgClassName: 'bg-status-completed/10',
      link: '/issues?status=zakonczone',
    },
  ];

  const canCreateIssue =
    roles.includes('kierownik_zmiany') ||
    roles.includes('kontrola_jakosci') ||
    roles.includes('kierownik_ur') ||
    roles.includes('admin');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tablica</h1>
          <p className="text-muted-foreground">
            Przegląd systemu utrzymania ruchu
          </p>
        </div>
        {canCreateIssue && (
          <Button asChild>
            <Link to="/issues/new">
              <Plus className="h-4 w-4 mr-2" />
              Nowe zgłoszenie
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.link}>
            <Card className="border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgClassName}`}>
                  <stat.icon className={`h-4 w-4 ${stat.className}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{isLoading ? '...' : stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Issues */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ostatnie zgłoszenia</CardTitle>
              <CardDescription>
                Najnowsze zgłoszenia w systemie
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/issues">Zobacz wszystkie</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentIssues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak zgłoszeń w systemie</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentIssues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/issues/${issue.id}`}
                  className="block p-4 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {issue.title}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {(issue.machine as any)?.name} ({(issue.machine as any)?.machine_number})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={issue.priority as IssuePriority} />
                      <StatusBadge
                        status={issue.status as IssueStatus}
                        substatus={issue.substatus as IssueSubstatus}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(issue.reported_at), {
                      addSuffix: true,
                      locale: pl,
                    })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
