import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorHandler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Search, Loader2, Cog, MapPin, Factory, FileText } from 'lucide-react';

const LOCATION_OPTIONS = [
  'Nowa hala',
  'Stara hala',
  'Pośrednia hala',
  'Drukarnia',
  'Hala składarek',
  'Warsztat',
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
  'Eckel&Sohn',
  'CMS',
  'Contexo',
  'PM Projektowanie',
];

export default function Machines() {
  const { isManager } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New machine form
  const [name, setName] = useState('');
  const [machineNumber, setMachineNumber] = useState('');
  const [location, setLocation] = useState('');
  const [machineType, setMachineType] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [description, setDescription] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('name');

      if (error) throw error;
      setMachines(data as Machine[]);
    } catch (error) {
      logError('Machines.fetchMachines', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !machineNumber) {
      toast.error('Wypełnij wymagane pola');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('machines').insert({
        name,
        machine_number: machineNumber,
        location: location || null,
        machine_type: machineType || null,
        manufacturer: manufacturer || null,
        description: description || null,
        documentation_url: documentationUrl || null,
      });

      if (error) throw error;

      toast.success('Maszyna dodana');
      setDialogOpen(false);
      resetForm();
      fetchMachines();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Maszyna o takim numerze już istnieje');
      } else {
        toast.error('Błąd', { description: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setMachineNumber('');
    setLocation('');
    setMachineType('');
    setManufacturer('');
    setDescription('');
    setDocumentationUrl('');
  };

  const filteredMachines = machines.filter((machine) => {
    // Type filter
    if (typeFilter !== 'all' && machine.machine_type !== typeFilter) {
      return false;
    }
    
    // Search filter
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      machine.name.toLowerCase().includes(searchLower) ||
      machine.machine_number.toLowerCase().includes(searchLower) ||
      machine.location?.toLowerCase().includes(searchLower) ||
      machine.machine_type?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Maszyny</h1>
          <p className="text-muted-foreground">
            Ewidencja maszyn i urządzeń
          </p>
        </div>
        {isManager() && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj maszynę
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nowa maszyna</DialogTitle>
                <DialogDescription>
                  Dodaj nową maszynę do ewidencji
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nazwa *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="np. Prasa hydrauliczna"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="number">Numer *</Label>
                      <Input
                        id="number"
                        value={machineNumber}
                        onChange={(e) => setMachineNumber(e.target.value)}
                        placeholder="np. PH-001"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Lokalizacja</Label>
                      <Select value={location} onValueChange={setLocation}>
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
                      <Label htmlFor="type">Typ</Label>
                      <Select value={machineType} onValueChange={setMachineType}>
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
                    <Label htmlFor="manufacturer">Producent</Label>
                    <Select value={manufacturer} onValueChange={setManufacturer}>
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
                    <Label htmlFor="description">Opis</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Dodatkowe informacje..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="documentation">Dokumentacja techniczna (URL)</Label>
                    <Input
                      id="documentation"
                      type="url"
                      value={documentationUrl}
                      onChange={(e) => setDocumentationUrl(e.target.value)}
                      placeholder="https://example.com/dokumentacja.pdf"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Dodaj
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filter */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj maszyn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Typ maszyny" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                {MACHINE_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Machines Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMachines.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Cog className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak maszyn w ewidencji</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMachines.map((machine) => (
            <Link key={machine.id} to={`/machines/${machine.id}`}>
              <Card className="border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{machine.name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">
                        {machine.machine_number}
                      </p>
                    </div>
                    <Badge variant={machine.is_active ? 'default' : 'secondary'}>
                      {machine.is_active ? 'Aktywna' : 'Nieaktywna'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {machine.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {machine.location}
                      </div>
                    )}
                    {machine.manufacturer && (
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        {machine.manufacturer}
                      </div>
                    )}
                    {machine.machine_type && (
                      <div className="flex items-center gap-2">
                        <Cog className="h-4 w-4" />
                        {machine.machine_type}
                      </div>
                    )}
                  </div>
                  {machine.documentation_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(machine.documentation_url!, '_blank');
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Dokumentacja
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
