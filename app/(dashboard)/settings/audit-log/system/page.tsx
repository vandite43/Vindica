import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import AuditLogTable from '@/components/settings/AuditLogTable';

export default async function SystemAuditLogPage() {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true },
  });

  // Return 404 — do not reveal this page exists to non-SUPER_ADMIN users
  if (dbUser?.role !== 'SUPER_ADMIN') {
    notFound();
  }

  return (
    <div>
      <Header title="System Audit Log" subtitle="Cross-practice activity — super admin view" />
      <div className="p-6 max-w-7xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#5B3FD4]" />
              <CardTitle className="text-base">System Audit Log</CardTitle>
              <span className="ml-1 px-2 py-0.5 text-[10px] font-semibold rounded border border-[#5B3FD4]/40 text-[#5B3FD4] tracking-wider">
                SYSTEM
              </span>
            </div>
            <CardDescription className="text-xs text-gray-500">
              All activity across every practice — logins, role changes, data access, PHI events, API calls. Super admin only.
              No patient PHI is stored here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogTable apiUrl="/api/audit/system" tier="system" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
