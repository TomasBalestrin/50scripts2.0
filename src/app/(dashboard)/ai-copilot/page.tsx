'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Loader2,
  Bot,
  User,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AICopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: input.trim(),
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }

      if (!res.ok) {
        setError('Erro ao processar a conversa.');
        return;
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'Sem resposta.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (accessDenied) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-2xl text-center py-20">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#F59E0B]" />
          <p className="text-lg font-semibold text-white">IA Conversacional</p>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Disponível no plano Premium.
          </p>
          <Button
            className="mt-4 bg-[#1D4ED8] text-white"
            onClick={() => (window.location.href = '/upgrade')}
          >
            Fazer upgrade
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-[#020617] p-4 sm:p-6">
      <motion.div
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">Copiloto IA</h1>
          <p className="text-sm text-[#94A3B8]">
            Cole uma conversa ou peça ajuda com vendas
          </p>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bot className="mb-3 h-10 w-10 text-[#1D4ED8]" />
              <p className="text-sm text-[#94A3B8]">
                Cole uma conversa do WhatsApp e receba sugestões de resposta,
                análise do estágio do lead e gatilhos identificados.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20">
                  <Bot className="h-4 w-4 text-[#3B82F6]" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#1D4ED8] text-white'
                    : 'bg-[#131B35] text-[#CBD5E1]'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="mt-2 flex items-center gap-1 text-xs text-[#64748B] hover:text-white"
                  >
                    <Copy className="h-3 w-3" /> Copiar
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#131B35]">
                  <User className="h-4 w-4 text-[#94A3B8]" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8]/20">
                <Bot className="h-4 w-4 text-[#3B82F6]" />
              </div>
              <div className="rounded-2xl bg-[#131B35] px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-[#94A3B8]" />
              </div>
            </div>
          )}

          {error && (
            <Card className="border-red-500/30 bg-red-500/10">
              <CardContent className="p-3 text-sm text-red-400">
                {error}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Input area */}
        <div className="mt-4 flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cole uma conversa ou escreva sua dúvida..."
            className="flex-1 bg-[#0A0F1E] border-[#131B35] text-white min-h-[48px] max-h-[120px] resize-none placeholder:text-[#64748B]"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-auto bg-[#1D4ED8] text-white hover:bg-[#1D4ED8]/90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
