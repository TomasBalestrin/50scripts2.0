import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/shared/sidebar';
import { BottomNav } from '@/components/shared/bottom-nav';
import { Header } from '@/components/shared/header';
import { LazyEmergencyFAB } from '@/components/emergency-fab/lazy-emergency-fab';

// Cache auth+profile per request to avoid duplicate calls across components
const getAuthProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, plan, role')
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

  const userName = profile?.full_name || user.email?.split('@')[0] || 'Usuário';
  const plan = profile?.plan || 'starter';
  const role = profile?.role || 'user';

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Desktop sidebar */}
      <Sidebar plan={plan} role={role} userName={userName} userAvatar={null} />

      {/* Main content area */}
      <div className="flex flex-col lg:pl-64">
        <Header userName={userName} userAvatar={null} plan={plan} role={role} />
        <main className="flex-1 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Emergency FAB - lazy loaded client component */}
      <LazyEmergencyFAB />
    </div>
  );
}
