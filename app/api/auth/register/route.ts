import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';

const RegisterSchema = z.object({
  name:         z.string().max(100).optional(),
  email:        z.string().email().max(254),
  password:     z.string().min(8).max(128),
  practiceName: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    const { name, email, password, practiceName } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }
    const hashed = await bcrypt.hash(password, 12);

    // Create user first, then practice, then link practiceId back to user
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: 'ADMIN' },
    });
    const practice = await prisma.practice.create({
      data: { name: practiceName, userId: user.id },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { practiceId: practice.id },
    });

    await writeAuditLog({
      userId:    user.id,
      userEmail: user.email,
      action:    'CREATE',
      resource:  `user:${user.id}`,
      outcome:   'SUCCESS',
      details:   `New account registered for practice: ${practiceName}`,
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
