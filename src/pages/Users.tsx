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
import { Loader2, Users as UsersIcon, Edit, Plus, UserPlus, KeyRound } from 'lucide-react';

const EMAIL_DOMAIN = '@bericap.local';

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

// Helper to extract username from internal email
const extractUsername = (email: string | null): string => {
  if (!email) return '';
  if (email.endsWith(EMAIL_DOMAIN)) {
    return email.replace(EMAIL_DOMAIN, '');
  }
  return email;
};

export default function Users() {
  const { user: currentUser, session } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit user dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Add user dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRoles, setNewRoles] = useState<AppRole[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Reset password dialog
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRoles | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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

  const handleEditUser = (user: UserWithRoles) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
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

  const handleSaveUser = async () => {
    if (!editingUser) return;
    if (!editFullName.trim()) {
      toast.error('Imię i nazwisko jest wymagane');
      return;
    }
    setIsSaving(true);

    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: editFullName.trim() })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update roles
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

      toast.success('Dane użytkownika zaktualizowane');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword || !newFullName) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9._-]+$/;
    if (!usernameRegex.test(newUsername.toLowerCase())) {
      toast.error('Login może zawierać tylko małe litery, cyfry, kropki, myślniki i podkreślenia');
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
      // Convert username to internal email format
      const email = `${newUsername.toLowerCase().trim()}${EMAIL_DOMAIN}`;
      
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
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
        description: `${newFullName} (${newUsername})`,
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
    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewRoles([]);
  };

  const handleOpenResetPassword = (user: UserWithRoles) => {
    setResetPasswordUser(user);
    setResetNewPassword('');
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !resetNewPassword) return;

    if (resetNewPassword.length < 6) {
      toast.error('Hasło musi mieć minimum 6 znaków');
      return;
    }

    setIsResettingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          userId: resetPasswordUser.id,
          newPassword: resetNewPassword,
        },
      });

      if (error) {
        throw new Error(error.message || 'Błąd podczas zmiany hasła');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Hasło zmienione', {
        description: `Hasło dla ${resetPasswordUser.full_name || extractUsername(resetPasswordUser.email)} zostało zmienione`,
      });
      
      setResetPasswordDialogOpen(false);
      setResetPasswordUser(null);
      setResetNewPassword('');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error('Błąd', { description: error.message });
    } finally {
      setIsResettingPassword(false);
    }
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
                      Login: {extractUsername(user.email)}
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenResetPassword(user)}
                      disabled={user.id === currentUser?.id}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Zmień hasło
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      disabled={user.id === currentUser?.id}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edytuj
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj użytkownika</DialogTitle>
            <DialogDescription>
              Edytuj dane użytkownika: {extractUsername(editingUser?.email)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Imię i nazwisko *</Label>
              <Input
                id="editFullName"
                placeholder="Jan Kowalski"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <Label>Role</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSaveUser} disabled={isSaving}>
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
              <Label htmlFor="username">Login *</Label>
              <Input
                id="username"
                type="text"
                placeholder="jkowalski"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
              />
              <p className="text-xs text-muted-foreground">
                Tylko małe litery, cyfry, kropki, myślniki i podkreślenia
              </p>
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

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={(open) => {
        setResetPasswordDialogOpen(open);
        if (!open) {
          setResetPasswordUser(null);
          setResetNewPassword('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmień hasło użytkownika</DialogTitle>
            <DialogDescription>
              Ustaw nowe hasło dla: {resetPasswordUser?.full_name || extractUsername(resetPasswordUser?.email)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resetNewPassword">Nowe hasło *</Label>
              <Input
                id="resetNewPassword"
                type="password"
                placeholder="Minimum 6 znaków"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setResetPasswordDialogOpen(false);
              setResetPasswordUser(null);
              setResetNewPassword('');
            }}>
              Anuluj
            </Button>
            <Button onClick={handleResetPassword} disabled={isResettingPassword}>
              {isResettingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Zmień hasło
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
