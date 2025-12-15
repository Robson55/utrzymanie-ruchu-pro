import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Wrench, Loader2 } from 'lucide-react';

const EMAIL_DOMAIN = '@bericap.local';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginUsername.trim()) {
      toast.error('Wprowadź login');
      return;
    }
    
    setIsSubmitting(true);

    // Convert username to internal email format
    const email = `${loginUsername.toLowerCase().trim()}${EMAIL_DOMAIN}`;
    const { error } = await signIn(email, loginPassword);

    if (error) {
      toast.error('Błąd logowania', {
        description: error.message === 'Invalid login credentials'
          ? 'Nieprawidłowy login lub hasło'
          : error.message,
      });
    } else {
      toast.success('Zalogowano pomyślnie');
      navigate('/');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-primary text-primary-foreground">
            <Wrench className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BERICAP</h1>
            <p className="text-sm text-muted-foreground">System Utrzymania Ruchu</p>
          </div>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>Logowanie</CardTitle>
            <CardDescription>
              Wprowadź dane logowania
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">Login</Label>
                <Input
                  id="login-username"
                  type="text"
                  placeholder="np. jkowalski"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Hasło</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Zaloguj się
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
