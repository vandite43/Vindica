import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await protect(req, ['ADMIN']);
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
    const practice = await prisma.practice.findUnique({ where: { userId: session!.user.id } });
    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.practiceId !== practice.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (role !== undefined)     data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

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
