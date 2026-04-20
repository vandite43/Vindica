import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import AuditLogTable from '@/components/settings/AuditLogTable';

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true },
  });

  const role = dbUser?.role ?? 'BILLER';
  const canView = role === 'ADMIN' || role === 'SUPER_ADMIN';

  if (!canView) {
    redirect('/settings');
  }

  return (
    <div>
      <Header title="Audit Log" subtitle="All activity within your practice" />
      <div className="p-6 max-w-6xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#5B3FD4]" />
              <CardTitle className="text-base">Practice Audit Log</CardTitle>
            </div>
            <CardDescription className="text-xs text-gray-500">
              User logins, claim actions, user management, MFA changes, and data access events — scoped to your practice only.
              No patient PHI is stored here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogTable apiUrl="/api/audit" tier="practice" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
