import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/shared/sidebar';
import { BottomNav } from '@/components/shared/bottom-nav';
import { Header } from '@/components/shared/header';
import { ActivityTracker } from '@/components/activity/activity-tracker';

// Cache auth+profile per request to avoid duplicate calls across components
const getAuthProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  return { user, profile };
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getAuthProfile();

  if (!user) {
    redirect('/login');
  }

  const userName = profile?.full_name || user.email?.split('@')[0] || 'Usuario';
  const role = profile?.role || 'user';

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Skip to content - accessibility */}
      <a href="#main-content" className="skip-link">
        Pular para o conteudo
      </a>

      {/* Desktop sidebar */}
      <Sidebar role={role} userName={userName} userAvatar={null} />

      {/* Main content area */}
      <div className="flex flex-col lg:pl-64">
        <Header userName={userName} userAvatar={null} role={role} />
        <main id="main-content" className="flex-1 pb-24 lg:pb-6" role="main">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Activity tracking - invisible, tracks page views + session duration */}
      <ActivityTracker />
    </div>
  );
}
