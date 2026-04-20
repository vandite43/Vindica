import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { getGlobalAIModel, setGlobalAIModel } from '@/lib/system-config';
import { AI_MODELS } from '@/lib/constants';

/** GET /api/system/config — returns current global config, accessible to all authenticated users */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aiModel = await getGlobalAIModel();
    return NextResponse.json({ aiModel });
  } catch (error) {
    console.error('[system/config GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/system/config — updates global config, SUPER_ADMIN only */
export async function PATCH(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN']);
    if (guard) return guard;

    const session = await auth();
    const { aiModel } = await req.json();

    if (!aiModel || !AI_MODELS.some(m => m.id === aiModel)) {
      return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { email: true },
    });

    await setGlobalAIModel(aiModel, dbUser?.email ?? 'unknown');
    return NextResponse.json({ ok: true, aiModel });
  } catch (error) {
    console.error('[system/config PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
