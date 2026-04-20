import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';
import { notifyRoleChanged, notifyMfaDisabled } from '@/lib/notifications/send';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN']);
    if (guard) return guard;

    const session = await auth();
    const { id } = await params;
    const body = await req.json();
    const { role, isActive } = body;

    // Prevent admin from deactivating their own account
    if (isActive === false && session?.user?.id === id) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400 },
      );
    }

    // Validate target user belongs to the same practice as the requesting admin
    const practice = await prisma.practice.findFirst({ where: { OR: [{ userId: session!.user.id }, { members: { some: { id: session!.user.id } } }] } });
    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.practiceId !== practice.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { mfaEnabled } = body;

    const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER', 'BILLER'];
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (role !== undefined)       data.role = role;
    if (isActive !== undefined)   data.isActive = isActive;
    if (mfaEnabled !== undefined) data.mfaEnabled = mfaEnabled;

    const updated = await prisma.user.update({ where: { id }, data });

    if (role !== undefined && role !== target.role) {
      await writeAuditLog({
        userId:    session!.user.id,
        userEmail: session!.user.email!,
        action:    'UPDATE_USER_ROLE',
        resource:  `user:${id}`,
        outcome:   'SUCCESS',
        details:   `Role changed from ${target.role} to ${role}`,
      });

      if (practice) {
        notifyRoleChanged(
          practice.id,
          target.id,
          target.email,
          target.role,
          role,
          session!.user.email!,
        ).catch(() => {});
      }
    }

    // Notify admin if MFA was explicitly disabled on an account
    if (mfaEnabled === false && target.mfaEnabled !== false && practice) {
      notifyMfaDisabled(practice.id, target.id, target.email).catch(() => {});
    }

    return NextResponse.json({
      id:       updated.id,
      name:     updated.name,
      email:    updated.email,
      role:     updated.role,
      isActive: updated.isActive,
    });
  } catch (error) {
    console.error('[users PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
