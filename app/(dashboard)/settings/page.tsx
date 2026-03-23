import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIModelCard from '@/components/settings/AIModelCard';
import AuditLogViewer from '@/components/settings/AuditLogViewer';
import UserManagement from '@/components/settings/UserManagement';
import PracticeStats from '@/components/settings/PracticeStats';

export default async function SettingsPage() {
  const session = await auth();
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({
        where:  { id: session.user.id },
        select: { role: true },
      })
    : null;

  const isAdmin = dbUser?.role === 'ADMIN';

  return (
    <div>
      <Header title="Settings" subtitle="Practice account settings" />
      <div className="p-6 max-w-5xl">
        <Tabs defaultValue="general">
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            {isAdmin && <TabsTrigger value="practice">Practice Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="audit">Audit Logs</TabsTrigger>}
          </TabsList>

          {/* ── General ───────────────────────────────────────────────── */}
          <TabsContent value="general" className="space-y-5">
            <AIModelCard />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Notification settings coming soon.</p>
              </CardContent>
            </Card>
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

          {/* ── Audit Logs ────────────────────────────────────────────── */}
          {isAdmin && (
            <TabsContent value="audit">
              <AuditLogViewer />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
