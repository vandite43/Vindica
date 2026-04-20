import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { writeAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { notifyNewUserAdded } from '@/lib/notifications/send';

const CreateUserSchema = z.object({
  name:     z.string().max(100).optional(),
  email:    z.string().email().max(254),
  password: z.string().min(8).max(128),
  role:     z.enum(['ADMIN', 'OFFICE_MANAGER', 'BILLER']),
});

async function getPractice(userId: string) {
  return prisma.practice.findFirst({ where: { OR: [{ userId }, { members: { some: { id: userId } } }] } });
}

export async function GET(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN']);
    if (guard) return guard;

    const session = await auth();
    const practice = await getPractice(session!.user.id);
    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    const users = await prisma.user.findMany({
      where: { practiceId: practice.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        isActive:  true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('[users GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN']);
    if (guard) return guard;

    const session = await auth();
    const body = await req.json().catch(() => null);
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { name, email, password, role } = parsed.data;

    const practice = await getPractice(session!.user.id);
    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name: name || null, email, password: hashed, role, practiceId: practice.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await writeAuditLog({
      userId:    session!.user.id,
      userEmail: session!.user.email!,
      action:    'CREATE',
      resource:  `user:${user.id}`,
      outcome:   'SUCCESS',
      details:   `Created account for ${email} with role ${role}`,
    });

    notifyNewUserAdded(practice.id, user.id, user.email, user.role, session!.user.email!).catch(() => {});

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('[users POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
