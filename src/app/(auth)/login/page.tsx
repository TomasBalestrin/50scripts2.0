'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';

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

      router.push('/trilhas');
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#020617]">
      <div className="w-full max-w-md">
        <Card className="border-[#131B35] bg-[#0A0F1E] shadow-2xl">
          <CardHeader className="text-center space-y-4">
            {/* Logo + Name */}
            <div className="flex flex-col items-center gap-3">
              <Image
                src="/logo.png"
                alt="50 Scripts"
                width={64}
                height={64}
                className="rounded-xl"
                priority
              />
              <h1 className="text-2xl font-heading font-bold text-white">
                50 Scripts
              </h1>
            </div>
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
                  className="bg-[#020617] border-[#131B35] text-white placeholder:text-[#475569] focus-visible:ring-[#1D4ED8]"
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
                  className="bg-[#020617] border-[#131B35] text-white placeholder:text-[#475569] focus-visible:ring-[#1D4ED8]"
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
                className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold h-11"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-xs text-[#475569]">
          Ao entrar, você concorda com os{' '}
          <a href="/termos" className="text-[#3B82F6] hover:underline">Termos de Uso</a>
          {' '}e a{' '}
          <a href="/privacidade" className="text-[#3B82F6] hover:underline">Política de Privacidade</a>
        </div>
      </div>
    </div>
  );
}
