import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Machine } from '@/types/database';
import { toast } from 'sonner';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { format, getWeek, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PlannedWork {
  id: string;
  machine_id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  week_number: number | null;
  year: number;
  is_weekly: boolean;
  status: 'zaplanowane' | 'wykonane' | 'anulowane';
  created_by: string;
  created_at: string;
  updated_at: string;
  machine?: Machine;
}

const STATUS_CONFIG = {
  zaplanowane: { label: 'Zaplanowane', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  wykonane: { label: 'Wykonane', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  anulowane: { label: 'Anulowane', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function PlannedWorks() {
  const { isManager, user } = useAuth();
  const [works, setWorks] = useState<PlannedWork[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingWork, setEditingWork] = useState<PlannedWork | null>(null);

  // Form state
  const [formMachineId, setFormMachineId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState<Date | undefined>(new Date());
  const [formIsWeekly, setFormIsWeekly] = useState(false);

  const fetchData = async () => {
    try {
      const [worksRes, machinesRes] = await Promise.all([
        supabase
          .from('planned_works')
          .select('*')
          .eq('year', selectedYear)
          .order('scheduled_date', { ascending: true }),
        supabase.from('machines').select('*').eq('is_active', true).order('name'),
      ]);

      if (worksRes.error) throw worksRes.error;
      if (machinesRes.error) throw machinesRes.error;

      // Fetch machines for works
      const machineIds = [...new Set((worksRes.data || []).map((w) => w.machine_id))];
      let machinesMap: Record<string, Machine> = {};

      if (machineIds.length > 0) {
        const { data: machinesData } = await supabase
          .from('machines')
          .select('*')
          .in('id', machineIds);

        if (machinesData) {
          machinesMap = machinesData.reduce((acc, m) => {
            acc[m.id] = m as Machine;
            return acc;
          }, {} as Record<string, Machine>);
        }
      }

      const worksWithMachines = (worksRes.data || []).map((w) => ({
        ...w,
        machine: machinesMap[w.machine_id],
      })) as PlannedWork[];

      setWorks(worksWithMachines);
      setMachines(machinesRes.data as Machine[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const filteredWorks = works.filter((work) => {
    if (selectedWeek && work.week_number !== selectedWeek) return false;
    if (selectedMachine !== 'all' && work.machine_id !== selectedMachine) return false;
    return true;
  });

  const openAddDialog = () => {
    setEditingWork(null);
    setFormMachineId('');
    setFormTitle('');
    setFormDescription('');
    setFormDate(new Date());
    setFormIsWeekly(false);
    setDialogOpen(true);
  };

  const openEditDialog = (work: PlannedWork) => {
    setEditingWork(work);
    setFormMachineId(work.machine_id);
    setFormTitle(work.title);
    setFormDescription(work.description || '');
    setFormDate(new Date(work.scheduled_date));
    setFormIsWeekly(work.is_weekly);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formMachineId || !formTitle || !formDate || !user) {
      toast.error('Wypełnij wymagane pola');
      return;
    }

    setIsSaving(true);

    try {
      const weekNum = getWeek(formDate, { weekStartsOn: 1, locale: pl });
      const year = formDate.getFullYear();

      const data = {
        machine_id: formMachineId,
        title: formTitle,
        description: formDescription || null,
        scheduled_date: format(formDate, 'yyyy-MM-dd'),
        week_number: weekNum,
        year: year,
        is_weekly: formIsWeekly,
      };

      if (editingWork) {
        const { error } = await supabase
          .from('planned_works')
          .update(data)
          .eq('id', editingWork.id);

        if (error) throw error;
        toast.success('Zaplanowana praca zaktualizowana');
      } else {
        const { error } = await supabase.from('planned_works').insert({
          ...data,
          created_by: user.id,
        });

        if (error) throw error;
        toast.success('Zaplanowana praca dodana');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (workId: string, newStatus: 'wykonane' | 'anulowane') => {
    try {
      const { error } = await supabase
        .from('planned_works')
        .update({ status: newStatus })
        .eq('id', workId);

      if (error) throw error;
      toast.success(`Status zmieniony na: ${STATUS_CONFIG[newStatus].label}`);
      fetchData();
    } catch (error: any) {
      toast.error('Błąd', { description: error.message });
    }
  };

  const handleDelete = async (workId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę zaplanowaną pracę?')) return;

    try {
      const { error } = await supabase.from('planned_works').delete().eq('id', workId);

      if (error) throw error;
      toast.success('Zaplanowana praca usunięta');
      fetchData();
    } catch (error: any) {
      toast.error('Błąd', { description: error.message });
    }
  };

  // Generate week options for the selected year
  const weekOptions = Array.from({ length: 53 }, (_, i) => i + 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planowane prace</h1>
          <p className="text-muted-foreground">
            Harmonogram zaplanowanych prac dla maszyn
          </p>
        </div>
        {isManager() && (
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj pracę
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Rok</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tydzień</Label>
              <Select
                value={selectedWeek?.toString() || 'all'}
                onValueChange={(v) => setSelectedWeek(v === 'all' ? null : parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  {weekOptions.map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Tydzień {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Maszyna</Label>
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie maszyny</SelectItem>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name} ({machine.machine_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Works list */}
      {filteredWorks.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Brak zaplanowanych prac</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWorks.map((work) => (
            <Card key={work.id} className="border-border/50">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground truncate">{work.title}</h3>
                      <Badge
                        variant="outline"
                        className={cn('shrink-0', STATUS_CONFIG[work.status].color)}
                      >
                        {STATUS_CONFIG[work.status].label}
                      </Badge>
                      {work.is_weekly && (
                        <Badge variant="secondary" className="shrink-0">
                          Tydzień {work.week_number}
                        </Badge>
                      )}
                    </div>

                    {work.description && (
                      <p className="text-sm text-muted-foreground mb-2">{work.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <Link
                        to={`/machines/${work.machine_id}`}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <Clock className="h-4 w-4" />
                        {work.machine?.name || 'Nieznana maszyna'} ({work.machine?.machine_number})
                      </Link>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {format(new Date(work.scheduled_date), 'dd.MM.yyyy', { locale: pl })}
                      </span>
                    </div>
                  </div>

                  {isManager() && work.status === 'zaplanowane' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStatusChange(work.id, 'wykonane')}
                        title="Oznacz jako wykonane"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStatusChange(work.id, 'anulowane')}
                        title="Anuluj"
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(work)}
                        title="Edytuj"
                      >
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(work.id)}
                        title="Usuń"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingWork ? 'Edytuj zaplanowaną pracę' : 'Dodaj zaplanowaną pracę'}
            </DialogTitle>
            <DialogDescription>
              {editingWork
                ? 'Zmień szczegóły zaplanowanej pracy'
                : 'Zaplanuj nową pracę dla maszyny'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Maszyna *</Label>
              <Select value={formMachineId} onValueChange={setFormMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz maszynę" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name} ({machine.machine_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tytuł *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="np. Przegląd techniczny"
              />
            </div>

            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Szczegóły zaplanowanej pracy..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formDate
                      ? format(formDate, 'dd.MM.yyyy', { locale: pl })
                      : 'Wybierz datę'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formDate}
                    onSelect={setFormDate}
                    locale={pl}
                  />
                </PopoverContent>
              </Popover>
              {formDate && (
                <p className="text-xs text-muted-foreground">
                  Tydzień {getWeek(formDate, { weekStartsOn: 1, locale: pl })} roku{' '}
                  {formDate.getFullYear()}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingWork ? 'Zapisz' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
