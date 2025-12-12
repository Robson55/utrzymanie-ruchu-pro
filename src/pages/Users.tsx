import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, AppRole, ROLE_LABELS } from '@/types/database';
import { toast } from 'sonner';
import { Loader2, Users as UsersIcon, Edit, Plus, UserPlus } from 'lucide-react';

interface UserWithRoles extends Profile {
  roles: AppRole[];
}

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  kierownik_zmiany: 'Może zgłaszać awarie i przeglądać statusy',
  kontrola_jakosci: 'Może zgłaszać awarie i przeglądać statusy',
  kierownik_ur: 'Pełny dostęp: zgłaszanie, akceptacja, przypisywanie, raporty',
  mechanik: 'Może aktualizować status przypisanych zadań',
  admin: 'Pełny dostęp do systemu i zarządzania użytkownikami',
};

export default function Users() {
  const { user: currentUser, session } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit roles dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Add user dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRoles, setNewRoles] = useState<AppRole[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const allRoles: AppRole[] = [
    'kierownik_zmiany',
    'kontrola_jakosci',
    'kierownik_ur',
    'mechanik',
    'admin',
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = (profiles as Profile[]).map((profile) => ({
        ...profile,
        roles: roles
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRoles = (user: UserWithRoles) => {
    setEditingUser(user);
    setSelectedRoles(user.roles);
    setEditDialogOpen(true);
  };

  const toggleRole = (role: AppRole, isNew = false) => {
    if (isNew) {
      setNewRoles((prev) =>
        prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
      );
    } else {
      setSelectedRoles((prev) =>
        prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
      );
    }
  };

  const handleSaveRoles = async () => {
    if (!editingUser) return;
    setIsSaving(true);

    try {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editingUser.id);

      if (selectedRoles.length > 0) {
        const { error } = await supabase.from('user_roles').insert(
          selectedRoles.map((role) => ({
            user_id: editingUser.id,
            role,
          }))
        );

        if (error) throw error;
      }

      toast.success('Role zaktualizowane');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword || !newFullName) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Hasło musi mieć minimum 6 znaków');
      return;
    }

    if (newRoles.length === 0) {
      toast.error('Wybierz przynajmniej jedną rolę');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmail,
          password: newPassword,
          fullName: newFullName,
          roles: newRoles,
        },
      });

      if (error) {
        throw new Error(error.message || 'Błąd podczas tworzenia użytkownika');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Użytkownik utworzony', {
        description: `${newFullName} (${newEmail})`,
      });
      
      setAddDialogOpen(false);
      resetAddForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Create user error:', error);
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const resetAddForm = () => {
    setNewEmail('');
    setNewPassword('');
    setNewFullName('');
    setNewRoles([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Użytkownicy</h1>
          <p className="text-muted-foreground">
            Zarządzanie użytkownikami i rolami
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Dodaj użytkownika
        </Button>
      </div>

      {users.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Brak użytkowników</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} className="border-border/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {user.full_name || 'Bez nazwy'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.roles.length === 0 ? (
                        <Badge variant="outline">Brak roli</Badge>
                      ) : (
                        user.roles.map((role) => (
                          <Badge key={role} variant="secondary">
                            {ROLE_LABELS[role]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditRoles(user)}
                    disabled={user.id === currentUser?.id}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edytuj role
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Roles Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj role</DialogTitle>
            <DialogDescription>
              Zarządzaj rolami użytkownika: {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {allRoles.map((role) => (
              <div key={role} className="flex items-start space-x-3">
                <Checkbox
                  id={`edit-${role}`}
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor={`edit-${role}`} className="cursor-pointer font-medium">
                    {ROLE_LABELS[role]}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveRoles} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) resetAddForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Dodaj użytkownika</DialogTitle>
            <DialogDescription>
              Utwórz nowe konto i przypisz role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Imię i nazwisko *</Label>
              <Input
                id="fullName"
                placeholder="Jan Kowalski"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jan.kowalski@firma.pl"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 znaków"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <Label>Role *</Label>
              {allRoles.map((role) => (
                <div key={role} className="flex items-start space-x-3">
                  <Checkbox
                    id={`new-${role}`}
                    checked={newRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role, true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor={`new-${role}`} className="cursor-pointer font-medium">
                      {ROLE_LABELS[role]}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddDialogOpen(false);
              resetAddForm();
            }}>
              Anuluj
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Utwórz użytkownika
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
