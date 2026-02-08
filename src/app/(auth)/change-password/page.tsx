'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { changePasswordSchema } from '@/lib/validations/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, changePassword } = useAuth();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validation = changePasswordSchema.safeParse({ password, confirmPassword });

      if (!validation.success) {
        const firstError = validation.error.issues[0];
        setError(firstError.message);
        return;
      }

      const { error: changeError } = await changePassword(password);

      if (changeError) {
        setError(changeError);
        return;
      }

      if (user) {
        await supabase
          .from('profiles')
          .update({ password_changed: true })
          .eq('id', user.id);
      }

      router.push('/onboarding');
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card className="border-[#1A3050] bg-[#0F1D32] shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <h1 className="text-3xl font-bold">
              <span className="text-white">50 Scripts</span>{' '}
              <span className="text-[#C9A84C]">2.0</span>
            </h1>
          </div>
          <CardTitle className="text-xl text-white">Alterar Senha</CardTitle>
          <CardDescription className="text-[#8BA5BD]">
            Por seguran&ccedil;a, crie uma nova senha para sua conta
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#8BA5BD]">
                Nova Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-[#0A1628] border-[#1A3050] text-white placeholder:text-[#4A4A6A] focus-visible:ring-[#C9A84C]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#8BA5BD]">
                Confirmar Nova Senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-[#0A1628] border-[#1A3050] text-white placeholder:text-[#4A4A6A] focus-visible:ring-[#C9A84C]"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C9A84C] hover:bg-[#C9A84C]/90 text-white font-semibold"
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
