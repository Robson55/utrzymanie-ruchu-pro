import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Machine, Issue, IssueStatus, IssuePriority, IssueSubstatus } from '@/types/database';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  Cog,
  Edit,
  ExternalLink,
  Factory,
  FileText,
  Loader2,
  MapPin,
  Upload,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const LOCATION_OPTIONS = [
  'Nowa hala',
  'Stara hala',
  'Pośrednia hala',
  'Drukarnia',
  'Hala składarek',
];

const MACHINE_TYPE_OPTIONS = ['INJ', 'ASS', 'PRI'];

const MANUFACTURER_OPTIONS = [
  'PSG',
  'Sumitomo',
  'Engel',
  'Arburg',
  'Netstal',
  'Lamfi',
  'Caprint',
  'Bortolinkemo',
  'Grun&Koder',
];

export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isManager, user } = useAuth();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [plannedWorks, setPlannedWorks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ description: string; date: string }>>([]);
  const [editName, setEditName] = useState('');
  const [editMachineNumber, setEditMachineNumber] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editMachineType, setEditMachineType] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDocumentationUrl, setEditDocumentationUrl] = useState('');

  const fetchData = async () => {
    if (!id) return;

    try {
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('*')
        .eq('id', id)
        .single();

      if (machineError) throw machineError;
      setMachine(machineData as Machine);

      const { data: issuesData } = await supabase
        .from('issues')
        .select('*')
        .eq('machine_id', id)
        .order('created_at', { ascending: false });

      if (issuesData) {
        setIssues(issuesData as Issue[]);
      }

      // Fetch planned works
      const { data: plannedData } = await supabase
        .from('planned_works')
        .select('*')
        .eq('machine_id', id)
        .eq('status', 'zaplanowane')
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .limit(5);

      if (plannedData) {
        setPlannedWorks(plannedData);
      }
    } catch (error) {
      console.error('Error fetching machine:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const openEditDialog = () => {
    if (!machine) return;
    setEditName(machine.name);
    setEditMachineNumber(machine.machine_number);
    setEditLocation(machine.location || '');
    setEditMachineType(machine.machine_type || '');
    setEditManufacturer(machine.manufacturer || '');
    setEditDescription(machine.description || '');
    setEditDocumentationUrl(machine.documentation_url || '');
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!machine || !editName || !editMachineNumber) {
      toast.error('Nazwa i numer są wymagane');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('machines')
        .update({
          name: editName,
          machine_number: editMachineNumber,
          location: editLocation || null,
          machine_type: editMachineType || null,
          manufacturer: editManufacturer || null,
          description: editDescription || null,
          documentation_url: editDocumentationUrl || null,
        })
        .eq('id', machine.id);

      if (error) throw error;

      toast.success('Maszyna zaktualizowana');
      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Maszyna o takim numerze już istnieje');
      } else {
        toast.error('Błąd', { description: error.message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Skip header row if exists, parse data
        const rows = jsonData.slice(1).filter(row => row.length >= 2);
        const preview = rows.map(row => {
          // Expecting: machine_number, description, date
          const description = String(row[1] || '').trim();
          let date = '';
          
          // Handle Excel date serial numbers
          if (typeof row[2] === 'number') {
            const excelDate = XLSX.SSF.parse_date_code(row[2]);
            date = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
          } else if (row[2]) {
            date = String(row[2]).trim();
          }

          return { description, date };
        }).filter(item => item.description);

        setImportPreview(preview);
        setImportDialogOpen(true);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('Błąd podczas parsowania pliku Excel');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!machine || !user || importPreview.length === 0) return;

    setIsImporting(true);

    try {
      const issuesToInsert = importPreview.map(item => ({
        machine_id: machine.id,
        title: item.description.substring(0, 100),
        description: item.description,
        reported_by: user.id,
        reported_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
        status: 'zakonczone' as const,
        priority: 'sredni' as const,
        completed_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      }));

      const { error } = await supabase.from('issues').insert(issuesToInsert);

      if (error) throw error;

      toast.success(`Zaimportowano ${importPreview.length} zgłoszeń`);
      setImportDialogOpen(false);
      setImportPreview([]);
      fetchData();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Błąd importu', { description: error.message });
    } finally {
      setIsImporting(false);
    }
  };

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
        {isManager() && (
          <Button onClick={openEditDialog}>
            <Edit className="h-4 w-4 mr-2" />
            Edytuj
          </Button>
        )}
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

      {/* Planned Works */}
      {plannedWorks.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Planowane prace
              </CardTitle>
              <CardDescription>
                Nadchodzące zaplanowane prace dla tej maszyny
              </CardDescription>
            </div>
            <Link to="/planned-works">
              <Button variant="outline" size="sm">
                Zobacz wszystkie
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plannedWorks.map((work) => (
                <div
                  key={work.id}
                  className="p-3 rounded-lg border border-border/50 bg-secondary/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">{work.title}</h4>
                      {work.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {work.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {format(new Date(work.scheduled_date), 'dd.MM.yyyy', { locale: pl })}
                      </Badge>
                      {work.week_number && (
                        <Badge variant="secondary">
                          Tydz. {work.week_number}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues History */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Historia zgłoszeń</CardTitle>
            <CardDescription>
              Wszystkie zgłoszenia dla tej maszyny
            </CardDescription>
          </div>
          {isManager() && (
            <div>
              <input
                type="file"
                id="excel-import"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('excel-import')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
            </div>
          )}
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edytuj maszynę</DialogTitle>
            <DialogDescription>
              Zmień dane maszyny {machine.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nazwa *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="np. Prasa hydrauliczna"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-number">Numer *</Label>
                <Input
                  id="edit-number"
                  value={editMachineNumber}
                  onChange={(e) => setEditMachineNumber(e.target.value)}
                  placeholder="np. PH-001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Lokalizacja</Label>
                <Select value={editLocation} onValueChange={setEditLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz lokalizację" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_OPTIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Typ</Label>
                <Select value={editMachineType} onValueChange={setEditMachineType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ" />
                  </SelectTrigger>
                  <SelectContent>
                    {MACHINE_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-manufacturer">Producent</Label>
              <Select value={editManufacturer} onValueChange={setEditManufacturer}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz producenta" />
                </SelectTrigger>
                <SelectContent>
                  {MANUFACTURER_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Opis</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Dodatkowe informacje..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-documentation">Dokumentacja techniczna (URL)</Label>
              <Input
                id="edit-documentation"
                type="url"
                value={editDocumentationUrl}
                onChange={(e) => setEditDocumentationUrl(e.target.value)}
                placeholder="https://example.com/dokumentacja.pdf"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import zgłoszeń z Excela</DialogTitle>
            <DialogDescription>
              Podgląd danych do zaimportowania ({importPreview.length} wierszy)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-sm text-muted-foreground mb-4">
              Wymagany format: Numer maszyny | Opis zgłoszenia | Data (RRRR-MM-DD)
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Opis</th>
                    <th className="text-left p-2 font-medium w-28">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 truncate max-w-[300px]">{item.description}</td>
                      <td className="p-2">{item.date || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportPreview([]);
              }}
            >
              Anuluj
            </Button>
            <Button onClick={handleImport} disabled={isImporting || importPreview.length === 0}>
              {isImporting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Importuj {importPreview.length} zgłoszeń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
