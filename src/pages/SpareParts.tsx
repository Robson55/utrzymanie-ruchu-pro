import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Plus,
  Package,
  CalendarIcon,
  CheckCircle,
  ShoppingCart,
  Truck,
  Clock,
  Trash2,
} from 'lucide-react';

type SparePartStatus = 'nowe' | 'zaakceptowane' | 'zamowione' | 'dostarczone';

interface SparePart {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  machine_id: string | null;
  status: SparePartStatus;
  requested_by: string;
  accepted_by: string | null;
  requested_at: string;
  accepted_at: string | null;
  ordered_at: string | null;
  expected_delivery_date: string | null;
  delivered_at: string | null;
  notes: string | null;
  machine?: { id: string; name: string; machine_number: string } | null;
  requester?: { id: string; full_name: string | null } | null;
}

const STATUS_LABELS: Record<SparePartStatus, string> = {
  nowe: 'Nowe',
  zaakceptowane: 'Zaakceptowane',
  zamowione: 'Zamówione',
  dostarczone: 'Dostarczone',
};

const STATUS_COLORS: Record<SparePartStatus, string> = {
  nowe: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  zaakceptowane: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  zamowione: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  dostarczone: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const STATUS_ICONS: Record<SparePartStatus, typeof Clock> = {
  nowe: Clock,
  zaakceptowane: CheckCircle,
  zamowione: ShoppingCart,
  dostarczone: Truck,
};

export default function SpareParts() {
  const { user, isManager, hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [statusFilter, setStatusFilter] = useState<SparePartStatus | 'all'>('all');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [machineId, setMachineId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Status update states
  const [newStatus, setNewStatus] = useState<SparePartStatus | ''>('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | undefined>();

  const canAddParts = hasRole('mechanik') || hasRole('kierownik_ur') || hasRole('admin');
  const canManageParts = isManager();
  const canDeleteParts = hasRole('admin');

  // Fetch spare parts
  const { data: spareParts, isLoading } = useQuery({
    queryKey: ['spare-parts', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('spare_parts')
        .select(`
          *,
          machine:machines(id, name, machine_number),
          requester:profiles!spare_parts_requested_by_fkey(id, full_name)
        `)
        .order('requested_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as SparePart[];
    },
  });

  // Fetch machines
  const { data: machines } = useQuery({
    queryKey: ['machines-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('id, name, machine_number')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Add spare part mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('spare_parts').insert({
        name,
        description: description || null,
        quantity,
        machine_id: machineId || null,
        requested_by: user?.id,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] });
      toast({ title: 'Dodano zapotrzebowanie na część zamienną' });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, deliveryDate }: { id: string; status: SparePartStatus; deliveryDate?: Date }) => {
      const updates: Record<string, unknown> = { status };

      if (status === 'zaakceptowane') {
        updates.accepted_by = user?.id;
        updates.accepted_at = new Date().toISOString();
      } else if (status === 'zamowione') {
        updates.ordered_at = new Date().toISOString();
        if (deliveryDate) {
          updates.expected_delivery_date = format(deliveryDate, 'yyyy-MM-dd');
        }
      } else if (status === 'dostarczone') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('spare_parts')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] });
      toast({ title: 'Status zaktualizowany' });
      setIsStatusDialogOpen(false);
      setSelectedPart(null);
      setNewStatus('');
      setExpectedDeliveryDate(undefined);
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Delete spare part mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-parts'] });
      toast({ title: 'Usunięto część zamienną' });
      setIsDeleteDialogOpen(false);
      setSelectedPart(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setQuantity(1);
    setMachineId('');
    setNotes('');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Podaj nazwę części', variant: 'destructive' });
      return;
    }
    if (!machineId || machineId === 'none') {
      toast({ title: 'Wybierz maszynę', variant: 'destructive' });
      return;
    }
    addMutation.mutate();
  };

  const handleStatusUpdate = () => {
    if (!selectedPart || !newStatus) return;
    updateStatusMutation.mutate({
      id: selectedPart.id,
      status: newStatus,
      deliveryDate: expectedDeliveryDate,
    });
  };

  const handleOpenStatusDialog = (part: SparePart) => {
    setSelectedPart(part);
    setNewStatus('');
    setExpectedDeliveryDate(undefined);
    setIsStatusDialogOpen(true);
  };

  const handleOpenDeleteDialog = (part: SparePart) => {
    setSelectedPart(part);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!selectedPart) return;
    deleteMutation.mutate(selectedPart.id);
  };

  const getNextStatuses = (currentStatus: SparePartStatus): SparePartStatus[] => {
    switch (currentStatus) {
      case 'nowe':
        return ['zaakceptowane'];
      case 'zaakceptowane':
        return ['zamowione'];
      case 'zamowione':
        return ['dostarczone'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Części zamienne</h1>
          <p className="text-muted-foreground">Zarządzanie zapotrzebowaniem na części zamienne</p>
        </div>
        {canAddParts && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj zapotrzebowanie
          </Button>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nowe zapotrzebowanie</DialogTitle>
            <DialogDescription>
              Dodaj część zamienną do zamówienia
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa części *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nazwa części zamiennej"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodatkowy opis lub specyfikacja"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Ilość</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine">Maszyna (opcjonalnie)</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz maszynę" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak</SelectItem>
                  {machines?.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name} ({machine.machine_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Uwagi</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodatkowe uwagi"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Dodawanie...' : 'Dodaj'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmień status części</DialogTitle>
            <DialogDescription>
              {selectedPart?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nowy status</Label>
              <Select
                value={newStatus}
                onValueChange={(v) => setNewStatus(v as SparePartStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz status" />
                </SelectTrigger>
                <SelectContent>
                  {selectedPart && getNextStatuses(selectedPart.status).map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newStatus === 'zamowione' && (
              <div className="space-y-2">
                <Label>Przewidywana data dostawy</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !expectedDeliveryDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expectedDeliveryDate
                        ? format(expectedDeliveryDate, 'dd.MM.yyyy', { locale: pl })
                        : 'Wybierz datę'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expectedDeliveryDate}
                      onSelect={setExpectedDeliveryDate}
                      locale={pl}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={!newStatus || updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń część zamienną</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć "{selectedPart?.name}"? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Usuwanie...' : 'Usuń'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          Wszystkie
        </Button>
        {(Object.keys(STATUS_LABELS) as SparePartStatus[]).map((status) => {
          const Icon = STATUS_ICONS[status];
          return (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              <Icon className="h-4 w-4 mr-1" />
              {STATUS_LABELS[status]}
            </Button>
          );
        })}
      </div>

      {/* Parts list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lista części zamiennych
          </CardTitle>
          <CardDescription>
            {spareParts?.length || 0} pozycji
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
          ) : spareParts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak części zamiennych do wyświetlenia
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Ilość</TableHead>
                    <TableHead>Maszyna</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Zgłosił</TableHead>
                    <TableHead>Data zgłoszenia</TableHead>
                    <TableHead>Przewidywana dostawa</TableHead>
                    {canManageParts && <TableHead>Akcje</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spareParts?.map((part) => {
                    const StatusIcon = STATUS_ICONS[part.status];
                    return (
                      <TableRow key={part.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{part.name}</div>
                            {part.description && (
                              <div className="text-sm text-muted-foreground">{part.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{part.quantity}</TableCell>
                        <TableCell>
                          {part.machine ? (
                            <span className="text-sm">
                              {part.machine.name} ({part.machine.machine_number})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('flex items-center gap-1 w-fit', STATUS_COLORS[part.status])}>
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_LABELS[part.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {part.requester?.full_name || '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(part.requested_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                        </TableCell>
                        <TableCell>
                          {part.expected_delivery_date
                            ? format(new Date(part.expected_delivery_date), 'dd.MM.yyyy', { locale: pl })
                            : '-'}
                        </TableCell>
                        {canManageParts && (
                          <TableCell>
                            <div className="flex gap-2">
                              {getNextStatuses(part.status).length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenStatusDialog(part)}
                                >
                                  Zmień status
                                </Button>
                              )}
                              {canDeleteParts && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => handleOpenDeleteDialog(part)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
