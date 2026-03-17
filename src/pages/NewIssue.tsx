import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Machine, PRIORITY_LABELS, IssuePriority } from '@/types/database';
import { ArrowLeft, Loader2, Send } from 'lucide-react';

export default function NewIssue() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [machineId, setMachineId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('sredni');

  useEffect(() => {
    const fetchMachines = async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        logError('NewIssue.fetchMachines', error);
      } else {
        setMachines(data as Machine[]);
      }
      setIsLoading(false);
    };

    fetchMachines();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!machineId || !title || !description) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('issues')
        .insert({
          machine_id: machineId,
          title,
          description,
          priority,
          reported_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add status history entry
      await supabase.from('issue_status_history').insert({
        issue_id: data.id,
        status: 'nowe',
        changed_by: user!.id,
        comment: 'Zgłoszenie utworzone',
      });

      toast.success('Zgłoszenie zostało utworzone');
      navigate(`/issues/${data.id}`);
    } catch (error: any) {
      logError('NewIssue.createIssue', error);
      toast.error('Błąd podczas tworzenia zgłoszenia', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate('/issues')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Powrót do listy
      </Button>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Nowe zgłoszenie</CardTitle>
          <CardDescription>
            Zgłoś awarię lub problem z maszyną
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="machine">Maszyna *</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz maszynę" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <div className="p-2 text-center text-muted-foreground">
                      Ładowanie...
                    </div>
                  ) : machines.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">
                      Brak dostępnych maszyn
                    </div>
                  ) : (
                    machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name} ({machine.machine_number})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Tytuł *</Label>
              <Input
                id="title"
                placeholder="Krótki opis problemu"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis *</Label>
              <Textarea
                id="description"
                placeholder="Szczegółowy opis problemu, objawy, okoliczności..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorytet</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as IssuePriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/issues')}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Wyślij zgłoszenie
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
