import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { useAuth } from '@/contexts/AuthContext';
import {
  Issue,
  IssueStatus,
  IssuePriority,
  IssueSubstatus,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from '@/types/database';
import { Plus, Search, Loader2, Wrench } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function Issues() {
  const { roles } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        let query = supabase
          .from('issues')
          .select(`
            *,
            machine:machines(name, machine_number)
          `)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter as IssueStatus);
        }

        if (priorityFilter !== 'all') {
          query = query.eq('priority', priorityFilter as IssuePriority);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Fetch related profiles separately
        const reporterIds = [...new Set(data?.map(i => i.reported_by).filter(Boolean) || [])];
        const assigneeIds = [...new Set(data?.map(i => i.assigned_to).filter(Boolean) || [])];
        const allProfileIds = [...new Set([...reporterIds, ...assigneeIds])];

        let profiles: Record<string, any> = {};
        if (allProfileIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', allProfileIds);
          
          if (profilesData) {
            profiles = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
          }
        }

        const issuesWithProfiles = data?.map(issue => ({
          ...issue,
          reporter: profiles[issue.reported_by] || null,
          assignee: profiles[issue.assigned_to] || null,
        })) || [];

        setIssues(issuesWithProfiles as unknown as Issue[]);
      } catch (error) {
        console.error('Error fetching issues:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIssues();
  }, [statusFilter, priorityFilter]);

  const filteredIssues = issues.filter((issue) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      issue.title.toLowerCase().includes(searchLower) ||
      issue.description.toLowerCase().includes(searchLower) ||
      (issue.machine as any)?.name?.toLowerCase().includes(searchLower) ||
      (issue.machine as any)?.machine_number?.toLowerCase().includes(searchLower)
    );
  });

  const canCreateIssue =
    roles.includes('kierownik_zmiany') ||
    roles.includes('kontrola_jakosci') ||
    roles.includes('kierownik_ur') ||
    roles.includes('admin');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Zgłoszenia</h1>
          <p className="text-muted-foreground">
            Lista wszystkich zgłoszeń serwisowych
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

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj zgłoszeń..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Priorytet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie priorytety</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredIssues.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak zgłoszeń spełniających kryteria</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => (
            <Link key={issue.id} to={`/issues/${issue.id}`}>
              <Card className="border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {issue.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {issue.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          {(issue.machine as any)?.name} ({(issue.machine as any)?.machine_number})
                        </span>
                        <span>
                          Zgłoszone {formatDistanceToNow(new Date(issue.reported_at), {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </span>
                        {(issue.assignee as any)?.full_name && (
                          <span>Przypisane: {(issue.assignee as any).full_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={issue.priority as IssuePriority} />
                      <StatusBadge
                        status={issue.status as IssueStatus}
                        substatus={issue.substatus as IssueSubstatus}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
