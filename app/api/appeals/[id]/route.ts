import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAppeal, saveAppealLetter } from '@/lib/db/appeals';

async function getUserPracticeId(userId: string): Promise<string | null> {
  const practice = await prisma.practice.findFirst({
    where: { OR: [{ userId }, { members: { some: { id: userId } } }] },
    select: { id: true },
  });
  return practice?.id ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const appeal = await getAppeal(id);

    if (!appeal) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    const practiceId = await getUserPracticeId(session.user.id);
    if (!practiceId || appeal.claim.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(appeal);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const appeal = await getAppeal(id);
    if (!appeal) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    const practiceId = await getUserPracticeId(session.user.id);
    if (!practiceId || appeal.claim.practiceId !== practiceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Whitelist the only fields callers are allowed to set
    const ALLOWED_FIELDS = ['status', 'submittedAt', 'resolution', 'resolvedAt', 'amountRecovered'] as const;
    type AllowedField = typeof ALLOWED_FIELDS[number];
    const safeData = Object.fromEntries(
      Object.entries(body).filter(([k]) => ALLOWED_FIELDS.includes(k as AllowedField))
    );

    // If letterContent is being updated directly (manual edits), use saveAppealLetter to encrypt
    if (typeof body.letterContent === 'string' && body.letterContent !== '') {
      if (Object.keys(safeData).length > 0) {
        await prisma.appeal.update({ where: { id }, data: safeData });
      }
      const updated = await saveAppealLetter(id, body.letterContent);
      return NextResponse.json(updated);
    }

    if (Object.keys(safeData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.appeal.update({ where: { id }, data: safeData });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
