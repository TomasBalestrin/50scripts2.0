'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfigTab } from '@/components/admin/bethel-forms/config-tab';
import { EnviosTab } from '@/components/admin/bethel-forms/envios-tab';

export default function AdminBethelFormsPage() {
  const [aba, setAba] = useState('config');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurar Bethel Forms</h1>
        <p className="mt-1 text-sm text-gray-400">
          Escolha o funil que recebe as respostas do onboarding, relacione perguntas e opções com as do Forms e acompanhe os envios.
        </p>
      </div>
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="bg-[#0A0F1E]">
          <TabsTrigger value="config" className={aba === 'config' ? 'bg-[#1D4ED8] text-white' : 'text-gray-400'}>
            Configuração
          </TabsTrigger>
          <TabsTrigger value="envios" className={aba === 'envios' ? 'bg-[#1D4ED8] text-white' : 'text-gray-400'}>
            Envios
          </TabsTrigger>
        </TabsList>
        <TabsContent value="config" className="mt-4">
          <ConfigTab />
        </TabsContent>
        <TabsContent value="envios" className="mt-4">
          <EnviosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
