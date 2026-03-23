import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Role } from './roles';

/**
 * API route guard. Re-verifies role and isActive from DB on every call.
 *
 * Usage:
 *   const guard = await protect(request, ['ADMIN', 'OFFICE_MANAGER']);
 *   if (guard) return guard;
 */
export async function protect(
  _req: unknown,
  allowedRoles: Role[],
): Promise<NextResponse | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });

  if (!user?.isActive) {
    return NextResponse.json(
      { error: 'Your account has been deactivated. Please contact your administrator.' },
      { status: 403 },
    );
  }

  if (!allowedRoles.includes(user.role as Role)) {
    return NextResponse.json(
      { error: 'Access denied. You do not have permission to perform this action.' },
      { status: 403 },
    );
  }

  return null;
}
