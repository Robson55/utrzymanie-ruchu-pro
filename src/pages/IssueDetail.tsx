import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { toast } from 'sonner';
import {
  Issue,
  IssueStatus,
  IssueSubstatus,
  IssuePriority,
  IssueStatusHistory,
  Profile,
  SUBSTATUS_LABELS,
} from '@/types/database';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
  User,
  Wrench,
  History,
  Pause,
  Coffee,
  Package,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, roles, isManager, hasRole } = useAuth();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [history, setHistory] = useState<IssueStatusHistory[]>([]);
  const [mechanics, setMechanics] = useState<{ id: string; profile: Profile }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [selectedSubstatus, setSelectedSubstatus] = useState<IssueSubstatus>('aktywne');
  const [statusComment, setStatusComment] = useState('');

  useEffect(() => {
    const fetchIssue = async () => {
      if (!id) return;

      try {
        // Fetch issue with machine
        const { data: issueData, error: issueError } = await supabase
          .from('issues')
          .select(`
            *,
            machine:machines(*)
          `)
          .eq('id', id)
          .single();

        if (issueError) throw issueError;

        // Fetch related profiles separately
        const profileIds = [
          issueData.reported_by,
          issueData.accepted_by,
          issueData.assigned_to,
        ].filter(Boolean);

        let profiles: Record<string, any> = {};
        if (profileIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', profileIds);
          
          if (profilesData) {
            profiles = profilesData.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
          }
        }

        setIssue({
          ...issueData,
          reporter: profiles[issueData.reported_by] || null,
          acceptor: profiles[issueData.accepted_by] || null,
          assignee: profiles[issueData.assigned_to] || null,
        } as unknown as Issue);

        // Fetch status history
        const { data: historyData } = await supabase
          .from('issue_status_history')
          .select(`
            *,
            changer:profiles!issue_status_history_changed_by_fkey(*)
          `)
          .eq('issue_id', id)
          .order('changed_at', { ascending: false });

        if (historyData) {
          setHistory(historyData as unknown as IssueStatusHistory[]);
        }

        // Fetch mechanics for assignment
        const { data: mechanicsData } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'mechanik');

        if (mechanicsData) {
          const mechanicIds = mechanicsData.map((m) => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', mechanicIds);

          if (profiles) {
            setMechanics(
              profiles.map((p) => ({ id: p.id, profile: p as Profile }))
            );
          }
        }
      } catch (error) {
        console.error('Error fetching issue:', error);
        toast.error('Błąd podczas ładowania zgłoszenia');
      } finally {
        setIsLoading(false);
      }
    };

    fetchIssue();
  }, [id]);

  const handleAccept = async () => {
    if (!issue || !user) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('issues')
        .update({
          status: 'zaakceptowane',
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', issue.id);

      if (error) throw error;

      await supabase.from('issue_status_history').insert({
        issue_id: issue.id,
        status: 'zaakceptowane',
        changed_by: user.id,
        comment: 'Zgłoszenie zaakceptowane',
      });

      toast.success('Zgłoszenie zaakceptowane');
      window.location.reload();
    } catch (error: any) {
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssign = async () => {
    if (!issue || !user || !selectedMechanic) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('issues')
        .update({ assigned_to: selectedMechanic })
        .eq('id', issue.id);

      if (error) throw error;

      const mechanic = mechanics.find((m) => m.id === selectedMechanic);
      await supabase.from('issue_status_history').insert({
        issue_id: issue.id,
        status: issue.status as IssueStatus,
        changed_by: user.id,
        comment: `Przypisano do: ${mechanic?.profile.full_name}`,
      });

      toast.success('Przypisano mechanika');
      setAssignDialogOpen(false);
      window.location.reload();
    } catch (error: any) {
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartWork = async () => {
    if (!issue || !user) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('issues')
        .update({
          status: 'w_realizacji',
          substatus: 'aktywne',
          started_at: new Date().toISOString(),
        })
        .eq('id', issue.id);

      if (error) throw error;

      await supabase.from('issue_status_history').insert({
        issue_id: issue.id,
        status: 'w_realizacji',
        substatus: 'aktywne',
        changed_by: user.id,
        comment: 'Rozpoczęto pracę',
      });

      toast.success('Rozpoczęto pracę');
      window.location.reload();
    } catch (error: any) {
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeSubstatus = async () => {
    if (!issue || !user) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('issues')
        .update({ substatus: selectedSubstatus })
        .eq('id', issue.id);

      if (error) throw error;

      await supabase.from('issue_status_history').insert({
        issue_id: issue.id,
        status: 'w_realizacji',
        substatus: selectedSubstatus,
        changed_by: user.id,
        comment: statusComment || `Zmieniono status na: ${SUBSTATUS_LABELS[selectedSubstatus]}`,
      });

      toast.success('Status zaktualizowany');
      setStatusDialogOpen(false);
      setStatusComment('');
      window.location.reload();
    } catch (error: any) {
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleComplete = async () => {
    if (!issue || !user) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('issues')
        .update({
          status: 'zakonczone',
          substatus: null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', issue.id);

      if (error) throw error;

      await supabase.from('issue_status_history').insert({
        issue_id: issue.id,
        status: 'zakonczone',
        changed_by: user.id,
        comment: 'Zadanie zakończone',
      });

      toast.success('Zadanie zakończone');
      window.location.reload();
    } catch (error: any) {
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Zgłoszenie nie znalezione</p>
      </div>
    );
  }

  const canAccept = isManager() && issue.status === 'nowe';
  const canAssign = isManager() && issue.status === 'zaakceptowane';
  const canStartWork =
    hasRole('mechanik') &&
    issue.assigned_to === user?.id &&
    issue.status === 'zaakceptowane';
  const canChangeSubstatus =
    hasRole('mechanik') &&
    issue.assigned_to === user?.id &&
    issue.status === 'w_realizacji';
  const canComplete =
    (hasRole('mechanik') && issue.assigned_to === user?.id && issue.status === 'w_realizacji') ||
    isManager();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate('/issues')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Powrót do listy
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{issue.title}</h1>
          <div className="flex items-center gap-3">
            <PriorityBadge priority={issue.priority as IssuePriority} />
            <StatusBadge
              status={issue.status as IssueStatus}
              substatus={issue.substatus as IssueSubstatus}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canAccept && (
            <Button onClick={handleAccept} disabled={isUpdating}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Akceptuj
            </Button>
          )}

          {canAssign && (
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <User className="h-4 w-4 mr-2" />
                  Przypisz
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Przypisz mechanika</DialogTitle>
                  <DialogDescription>
                    Wybierz mechanika do tego zadania
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz mechanika" />
                    </SelectTrigger>
                    <SelectContent>
                      {mechanics.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.profile.full_name || m.profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleAssign} disabled={!selectedMechanic || isUpdating}>
                    Przypisz
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canStartWork && (
            <Button onClick={handleStartWork} disabled={isUpdating}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Rozpocznij pracę
            </Button>
          )}

          {canChangeSubstatus && (
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Pause className="h-4 w-4 mr-2" />
                  Zmień status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Zmień status pracy</DialogTitle>
                  <DialogDescription>
                    Wybierz nowy status i opcjonalnie dodaj komentarz
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={selectedSubstatus}
                      onValueChange={(v) => setSelectedSubstatus(v as IssueSubstatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aktywne">
                          <div className="flex items-center gap-2">
                            <PlayCircle className="h-4 w-4" />
                            Aktywne
                          </div>
                        </SelectItem>
                        <SelectItem value="wstrzymane">
                          <div className="flex items-center gap-2">
                            <Pause className="h-4 w-4" />
                            Wstrzymane
                          </div>
                        </SelectItem>
                        <SelectItem value="przerwa">
                          <div className="flex items-center gap-2">
                            <Coffee className="h-4 w-4" />
                            Przerwa
                          </div>
                        </SelectItem>
                        <SelectItem value="brak_czesci">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Brak części
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Komentarz (opcjonalnie)</Label>
                    <Textarea
                      value={statusComment}
                      onChange={(e) => setStatusComment(e.target.value)}
                      placeholder="Dodaj komentarz..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button onClick={handleChangeSubstatus} disabled={isUpdating}>
                    Zapisz
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canComplete && (
            <Button onClick={handleComplete} disabled={isUpdating} className="bg-success hover:bg-success/90">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Zakończ
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <Card className="md:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Szczegóły zgłoszenia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Opis</Label>
              <p className="mt-1 text-foreground">{issue.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Maszyna</Label>
                <p className="mt-1 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  {(issue.machine as any)?.name} ({(issue.machine as any)?.machine_number})
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Lokalizacja</Label>
                <p className="mt-1">{(issue.machine as any)?.location || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Zgłosił</Label>
                <p className="mt-1">{(issue.reporter as any)?.full_name || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Przypisany do</Label>
                <p className="mt-1">{(issue.assignee as any)?.full_name || 'Nie przypisano'}</p>
              </div>
            </div>

            {issue.notes && (
              <div>
                <Label className="text-muted-foreground">Notatki</Label>
                <p className="mt-1">{issue.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Tracking */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Czasy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm">Zgłoszono</Label>
              <p className="font-medium">
                {format(new Date(issue.reported_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
              </p>
            </div>

            {issue.accepted_at && (
              <div>
                <Label className="text-muted-foreground text-sm">Zaakceptowano</Label>
                <p className="font-medium">
                  {format(new Date(issue.accepted_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Czas reakcji: {formatTime(issue.reaction_time_minutes)}
                </p>
              </div>
            )}

            {issue.started_at && (
              <div>
                <Label className="text-muted-foreground text-sm">Rozpoczęto</Label>
                <p className="font-medium">
                  {format(new Date(issue.started_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Czas do startu: {formatTime(issue.assignment_time_minutes)}
                </p>
              </div>
            )}

            {issue.completed_at && (
              <div>
                <Label className="text-muted-foreground text-sm">Zakończono</Label>
                <p className="font-medium">
                  {format(new Date(issue.completed_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Czas realizacji: {formatTime(issue.work_time_minutes)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status History */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historia zmian
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Brak historii</p>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge
                        status={h.status as IssueStatus}
                        substatus={h.substatus as IssueSubstatus}
                      />
                      <span className="text-sm text-muted-foreground">
                        przez {(h.changer as any)?.full_name || 'System'}
                      </span>
                    </div>
                    {h.comment && (
                      <p className="text-sm text-foreground">{h.comment}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(h.changed_at), {
                      addSuffix: true,
                      locale: pl,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
