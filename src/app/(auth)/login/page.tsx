'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError);
        return;
      }

      router.push('/');
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card className="border-[#252542] bg-[#1A1A2E] shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <h1 className="text-3xl font-bold">
              <span className="text-white">50 Scripts</span>{' '}
              <span className="text-[#E94560]">2.0</span>
            </h1>
          </div>
          <CardTitle className="text-xl text-white">Bem-vindo de volta</CardTitle>
          <CardDescription className="text-[#94A3B8]">
            Entre com suas credenciais para acessar a plataforma
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#94A3B8]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-[#0F0F1A] border-[#252542] text-white placeholder:text-[#4A4A6A] focus-visible:ring-[#E94560]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#94A3B8]">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-[#0F0F1A] border-[#252542] text-white placeholder:text-[#4A4A6A] focus-visible:ring-[#E94560]"
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
              className="w-full bg-[#E94560] hover:bg-[#E94560]/90 text-white font-semibold"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
