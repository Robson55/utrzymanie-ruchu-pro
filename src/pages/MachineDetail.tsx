import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Machine, Issue, IssueStatus, IssuePriority, IssueSubstatus } from '@/types/database';
import {
  ArrowLeft,
  Calendar,
  Cog,
  ExternalLink,
  Factory,
  FileText,
  Loader2,
  MapPin,
  Wrench,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch machine
        const { data: machineData, error: machineError } = await supabase
          .from('machines')
          .select('*')
          .eq('id', id)
          .single();

        if (machineError) throw machineError;
        setMachine(machineData as Machine);

        // Fetch issues for this machine
        const { data: issuesData } = await supabase
          .from('issues')
          .select('*')
          .eq('machine_id', id)
          .order('created_at', { ascending: false });

        if (issuesData) {
          setIssues(issuesData as Issue[]);
        }
      } catch (error) {
        console.error('Error fetching machine:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Maszyna nie znaleziona</p>
      </div>
    );
  }

  const stats = {
    total: issues.length,
    open: issues.filter((i) => i.status !== 'zakonczone').length,
    completed: issues.filter((i) => i.status === 'zakonczone').length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate('/machines')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Powrót do listy
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{machine.name}</h1>
            <Badge variant={machine.is_active ? 'default' : 'secondary'}>
              {machine.is_active ? 'Aktywna' : 'Nieaktywna'}
            </Badge>
          </div>
          <p className="text-lg text-muted-foreground font-mono">
            {machine.machine_number}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Details */}
        <Card className="md:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Szczegóły maszyny</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {machine.location && (
                <div>
                  <Label className="text-muted-foreground">Lokalizacja</Label>
                  <p className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {machine.location}
                  </p>
                </div>
              )}
              {machine.machine_type && (
                <div>
                  <Label className="text-muted-foreground">Typ</Label>
                  <p className="mt-1 flex items-center gap-2">
                    <Cog className="h-4 w-4" />
                    {machine.machine_type}
                  </p>
                </div>
              )}
              {machine.manufacturer && (
                <div>
                  <Label className="text-muted-foreground">Producent</Label>
                  <p className="mt-1 flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    {machine.manufacturer}
                  </p>
                </div>
              )}
              {machine.installation_date && (
                <div>
                  <Label className="text-muted-foreground">Data instalacji</Label>
                  <p className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(machine.installation_date), 'dd.MM.yyyy', { locale: pl })}
                  </p>
                </div>
              )}
            </div>

            {machine.description && (
              <div>
                <Label className="text-muted-foreground">Opis</Label>
                <p className="mt-1">{machine.description}</p>
              </div>
            )}

            {machine.documentation_url && (
              <div>
                <Label className="text-muted-foreground">Dokumentacja techniczna</Label>
                <a
                  href={machine.documentation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Otwórz dokumentację
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Statystyki</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wszystkie zgłoszenia</span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Otwarte</span>
              <span className="font-semibold text-warning">{stats.open}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zakończone</span>
              <span className="font-semibold text-success">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues History */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Historia zgłoszeń</CardTitle>
          <CardDescription>
            Wszystkie zgłoszenia dla tej maszyny
          </CardDescription>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak zgłoszeń dla tej maszyny</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/issues/${issue.id}`}
                  className="block p-4 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {issue.title}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {issue.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(issue.reported_at), {
                          addSuffix: true,
                          locale: pl,
                        })}
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
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
