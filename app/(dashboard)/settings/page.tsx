import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIModelCard from '@/components/settings/AIModelCard';
import UserManagement from '@/components/settings/UserManagement';
import PracticeStats from '@/components/settings/PracticeStats';
import NotificationPreferencesCard from '@/components/settings/NotificationPreferencesCard';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await auth();
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where:  { id: session.user.id },
        select: { role: true },
      })
    : null;

  const isAdmin      = dbUser?.role === 'ADMIN' || dbUser?.role === 'SUPER_ADMIN';
  const isSuperAdmin = dbUser?.role === 'SUPER_ADMIN';

  return (
    <div>
      <Header title="Settings" subtitle="Practice account settings" />
      <div className="p-6 max-w-5xl">
        <Tabs key={tab === 'practice' ? 'practice' : 'general'} defaultValue={tab === 'practice' ? 'practice' : 'general'}>
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            {isAdmin && <TabsTrigger value="practice">Practice Management</TabsTrigger>}
          </TabsList>

          {/* ── General ───────────────────────────────────────────────── */}
          <TabsContent value="general" className="space-y-5">
            {isSuperAdmin && <AIModelCard isSuperAdmin={isSuperAdmin} />}
            {isAdmin && <NotificationPreferencesCard />}
          </TabsContent>

          {/* ── Practice Management ───────────────────────────────────── */}
          {isAdmin && (
            <TabsContent value="practice" className="space-y-8">
              <PracticeStats />

              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  User Management
                </h3>
                <UserManagement currentUserId={session!.user.id} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
