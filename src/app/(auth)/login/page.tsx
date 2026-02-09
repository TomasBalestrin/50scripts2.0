'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';

const COMPANY_VALUES = [
  'Excelência',
  'Fé',
  'Integridade',
  'Inovação',
  'Comprometimento',
  'Servir',
  'Família',
  'Resultados',
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [valueIndex, setValueIndex] = useState(0);

  // Rotate company values
  useEffect(() => {
    const interval = setInterval(() => {
      setValueIndex((prev) => (prev + 1) % COMPANY_VALUES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="flex min-h-screen">
      {/* Left: Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#020617] via-[#0A0F1E] to-[#0A0F5C] relative overflow-hidden">
        {/* Gradient orb decoration */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#1D4ED8]/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#3B82F6]/8 blur-3xl" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <Image
              src="/logo-bethel-closer.svg"
              alt="Bethel Closer"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <div>
              <h1 className="text-2xl font-heading font-bold text-white">Bethel Closer</h1>
              <p className="text-xs text-[#94A3B8]">Plataforma de Vendas</p>
            </div>
          </div>

          {/* Impact phrases */}
          <div className="space-y-6">
            <h2 className="text-4xl font-heading font-bold text-white leading-tight">
              Profissionalizando o empreendedorismo através da{' '}
              <span className="text-[#3B82F6]">Educação</span> e{' '}
              <span className="text-[#3B82F6]">Tecnologia</span>
            </h2>
            <p className="text-lg text-[#94A3B8] leading-relaxed">
              Transformando cada empresa em Casa de Deus
            </p>
          </div>
        </div>

        {/* Rotating company value */}
        <div className="relative z-10">
          <div className="border-t border-[#131B35] pt-8">
            <p className="text-xs font-medium uppercase tracking-wider text-[#94A3B8] mb-2">
              Valor do dia
            </p>
            <p className="text-2xl font-heading font-bold text-white transition-all duration-500">
              {COMPANY_VALUES[valueIndex]}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 lg:p-12 bg-[#020617]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <Image
              src="/logo-bethel-closer.svg"
              alt="Bethel Closer"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <h1 className="text-xl font-heading font-bold text-white">Bethel Closer</h1>
          </div>

          <Card className="border-[#131B35] bg-[#0A0F1E] shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-xl font-heading text-white">Bem-vindo de volta</CardTitle>
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
        </div>
      </div>
    </div>
  );
}
