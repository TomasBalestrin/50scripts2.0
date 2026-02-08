import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A1628]">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#1A3050] bg-[#0F1D32] px-6">
          <div className="pl-12 lg:pl-0">
            <h2 className="text-sm font-medium text-gray-400">
              Bem-vindo de volta,{' '}
              <span className="text-white">{profile.full_name || profile.email}</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C] text-xs font-bold text-white">
              {(profile.full_name || profile.email || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
