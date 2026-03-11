import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Issue, IssueStatus, IssuePriority, IssueSubstatus, Profile, IssueAssignment } from '@/types/database';
import { Loader2, Wrench, User, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface IssueWithAssignees extends Issue {
  assignees?: Profile[];
}

interface MechanicWithIssues {
  mechanic: Profile;
  issues: IssueWithAssignees[];
}

export default function DisplayBoard() {
  const [mechanicsWithIssues, setMechanicsWithIssues] = useState<MechanicWithIssues[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = async () => {
    try {
      // Fetch mechanics
      const { data: mechanicsRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'mechanik');

      if (!mechanicsRoles || mechanicsRoles.length === 0) {
        setIsLoading(false);
        return;
      }

      const mechanicIds = mechanicsRoles.map((m) => m.user_id);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', mechanicIds);

      

      // Fetch active issues (excluding deleted and completed)
      const { data: issues, error: issuesError } = await supabase
        .from('issues')
        .select(`
          *,
          machine:machines(name, machine_number)
        `)
        .in('status', ['zaakceptowane', 'w_realizacji'])
        .order('priority', { ascending: false });

      // Fetch all assignments for active issues
      const { data: assignments } = await supabase
        .from('issue_assignments')
        .select('*');

      if (profiles && issues) {
        // Create a map of issue_id to assignee user_ids
        const issueAssignments: Record<string, string[]> = {};
        (assignments || []).forEach(a => {
          if (!issueAssignments[a.issue_id]) {
            issueAssignments[a.issue_id] = [];
          }
          issueAssignments[a.issue_id].push(a.user_id);
        });

        // Filter issues that have at least one assignment
        const assignedIssues = issues.filter(issue => 
          issueAssignments[issue.id] && issueAssignments[issue.id].length > 0
        );

        const result: MechanicWithIssues[] = profiles.map((profile) => ({
          mechanic: profile as Profile,
          issues: assignedIssues
            .filter((i) => issueAssignments[i.id]?.includes(profile.id))
            .map(i => ({
              ...i,
              assignees: profiles.filter(p => issueAssignments[i.id]?.includes(p.id)) as Profile[]
            })) as unknown as IssueWithAssignees[],
        }));

        // Sort by number of issues (descending) and then by name
        result.sort((a, b) => {
          if (b.issues.length !== a.issues.length) {
            return b.issues.length - a.issues.length;
          }
          return (a.mechanic.full_name || '').localeCompare(b.mechanic.full_name || '');
        });

        setMechanicsWithIssues(result);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const totalActiveIssues = mechanicsWithIssues.reduce((sum, m) => sum + m.issues.length, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Wrench className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold text-foreground">BERICAP - Tablica Zleceń</h1>
            <p className="text-muted-foreground text-lg">
              Aktywne zgłoszenia: <span className="font-semibold text-foreground">{totalActiveIssues}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5" />
          <span>Ostatnia aktualizacja: {format(lastUpdate, 'HH:mm:ss', { locale: pl })}</span>
        </div>
      </div>

      {/* Mechanics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mechanicsWithIssues.map(({ mechanic, issues }) => (
          <Card 
            key={mechanic.id} 
            className={`border-2 transition-colors ${issues.length > 0 ? 'border-destructive bg-destructive/5' : 'border-green-500 bg-green-500/5'}`}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="h-6 w-6 text-primary" />
                {mechanic.full_name || mechanic.email}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {issues.length === 0 && 'Brak aktywnych zleceń'}
                {issues.length === 1 && '1 aktywne zlecenie'}
                {issues.length > 1 && `${issues.length} aktywnych zleceń`}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {issues.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Gotowy do pracy</p>
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-foreground line-clamp-2">{issue.title}</h4>
                      <PriorityBadge priority={issue.priority as IssuePriority} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Wrench className="h-4 w-4" />
                      <span>{(issue.machine as any)?.name}</span>
                      <span className="text-xs">({(issue.machine as any)?.machine_number})</span>
                    </div>
                    {issue.assignees && issue.assignees.length > 1 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <User className="h-3 w-3" />
                        <span>Razem z: {issue.assignees.filter(a => a.id !== mechanic.id).map(a => a.full_name).join(', ')}</span>
                      </div>
                    )}
                    <StatusBadge
                      status={issue.status as IssueStatus}
                      substatus={issue.substatus as IssueSubstatus}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {mechanicsWithIssues.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-xl">Brak mechaników w systemie</p>
        </div>
      )}
    </div>
  );
}
