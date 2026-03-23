import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAppeal, saveAppealLetter } from '@/lib/db/appeals';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const appeal = await getAppeal(id);

    if (!appeal) return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    if (appeal.claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
    if (appeal.claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // If letterContent is being updated directly (manual edits), use saveAppealLetter to encrypt
    if (typeof body.letterContent === 'string' && body.letterContent !== '') {
      const { letterContent, ...rest } = body;
      if (Object.keys(rest).length > 0) {
        await prisma.appeal.update({ where: { id }, data: rest });
      }
      const updated = await saveAppealLetter(id, letterContent);
      return NextResponse.json(updated);
    }

    const updated = await prisma.appeal.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
