import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/shared/sidebar';
import { BottomNav } from '@/components/shared/bottom-nav';
import { Header } from '@/components/shared/header';
import { EmergencyFAB } from '@/components/emergency-fab/emergency-fab';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, plan, role')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name || user.email?.split('@')[0] || 'Usuário';
  const plan = profile?.plan || 'starter';
  const role = profile?.role || 'user';

  return (
    <div className="min-h-screen bg-[#0F0F1A]">
      {/* Desktop sidebar */}
      <Sidebar plan={plan} userName={userName} userAvatar={null} />

      {/* Main content area */}
      <div className="flex flex-col lg:pl-64">
        <Header userName={userName} userAvatar={null} plan={plan} role={role} />
        <main className="flex-1 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Emergency FAB - present on all pages */}
      <EmergencyFAB />
    </div>
  );
}
