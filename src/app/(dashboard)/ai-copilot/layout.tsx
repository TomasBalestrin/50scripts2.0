'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Bot, MessageSquare, BarChart3, Download } from 'lucide-react';

const tabs = [
  { href: '/ai-copilot', label: 'Conversa', icon: MessageSquare },
  { href: '/ai-copilot/patterns', label: 'Padrões', icon: BarChart3 },
  { href: '/ai-copilot/export', label: 'Exportar', icon: Download },
];

export default function AICopilotLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Sub-navigation tabs */}
      <div className="border-b border-[#1A3050] px-4 md:px-6">
        <div className="flex gap-1 max-w-3xl mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-[#C9A84C] text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
