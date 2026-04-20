import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import SettingsSubNav from '@/components/settings/SettingsSubNav';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true },
  });

  const role = dbUser?.role ?? 'BILLER';
  const isAdmin      = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  return (
    <div>
      <SettingsSubNav isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
      {children}
    </div>
  );
}
