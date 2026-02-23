'use client';

import { useState } from 'react';
import { Send, Bell, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminPushPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    expired_cleaned: number;
    total_subscribers: number;
  } | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/push-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url: url || '/' }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.error || 'Erro ao enviar');
      }
    } catch {
      alert('Erro de rede');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Push Notifications</h1>
        <p className="text-sm text-gray-400">
          Envie notificacoes push para todos os usuarios inscritos
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Send form */}
        <Card className="border-[#131B35] bg-[#0A0F1E]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Send className="h-5 w-5 text-[#3B82F6]" />
              Enviar Notificacao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Titulo *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nova funcionalidade disponivel!"
                className="w-full rounded-lg border border-[#131B35] bg-[#020617] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#3B82F6] focus:outline-none"
                maxLength={100}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Mensagem *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ex: Confira os novos scripts de abordagem que acabamos de adicionar."
                className="w-full rounded-lg border border-[#131B35] bg-[#020617] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#3B82F6] focus:outline-none"
                rows={3}
                maxLength={300}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                URL ao clicar
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/"
                className="w-full rounded-lg border border-[#131B35] bg-[#020617] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#3B82F6] focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Pagina que abre quando o usuario clica na notificacao
              </p>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1E40AF] disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar para todos
                </>
              )}
            </button>
          </CardContent>
        </Card>

        {/* Result + info */}
        <div className="space-y-4">
          {result && (
            <Card className="border-[#131B35] bg-[#0A0F1E]">
              <CardHeader>
                <CardTitle className="text-white">Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-[#020617] p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{result.sent}</p>
                    <p className="text-xs text-gray-400">Enviados</p>
                  </div>
                  <div className="rounded-lg bg-[#020617] p-3 text-center">
                    <p className="text-2xl font-bold text-gray-400">{result.total_subscribers}</p>
                    <p className="text-xs text-gray-400">Inscritos</p>
                  </div>
                  {result.failed > 0 && (
                    <div className="rounded-lg bg-[#020617] p-3 text-center">
                      <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                      <p className="text-xs text-gray-400">Falhas</p>
                    </div>
                  )}
                  {result.expired_cleaned > 0 && (
                    <div className="rounded-lg bg-[#020617] p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{result.expired_cleaned}</p>
                      <p className="text-xs text-gray-400">Expirados limpos</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-[#131B35] bg-[#0A0F1E]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Bell className="h-5 w-5 text-[#3B82F6]" />
                Notificacoes Automaticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-400">
              <p>O cron roda diariamente as 7h (BRT) e envia:</p>
              <ul className="list-inside list-disc space-y-1.5">
                <li>
                  <span className="text-amber-400">Streak em risco</span> — usuario com
                  3+ dias de streak que nao usou ontem
                </li>
                <li>
                  <span className="text-purple-400">XP proximo do bonus</span> — cyclic
                  XP &gt;= 80 (faltam &lt; 20 para bonus)
                </li>
                <li>
                  <span className="text-blue-400">Resumo semanal</span> — toda segunda-feira
                </li>
              </ul>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#020617] p-3">
                <Users className="h-4 w-4 text-[#3B82F6]" />
                <span className="text-xs">
                  Usuarios ativam/desativam pelo menu do avatar no app
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
