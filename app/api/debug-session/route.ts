import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__Secure-authjs.session-token')
    ?? cookieStore.get('authjs.session-token')
    ?? cookieStore.get('next-auth.session-token');

  let practiceByUserId = null;
  let userRecord = null;
  let practiceByPracticeId = null;
  let practiceError = null;

  if (session?.user?.id) {
    try {
      practiceByUserId = await prisma.practice.findUnique({ where: { userId: session.user.id } });
      userRecord = await prisma.user.findUnique({ where: { id: session.user.id }, select: { practiceId: true } });
      if (userRecord?.practiceId) {
        practiceByPracticeId = await prisma.practice.findUnique({ where: { id: userRecord.practiceId } });
      }
    } catch (e) {
      practiceError = String(e);
    }
  }

  return NextResponse.json({
    session,
    cookieFound: !!sessionCookie,
    cookieName: sessionCookie?.name ?? null,
    cookieLength: sessionCookie?.value?.length ?? 0,
    practiceByUserId,
    userPracticeId: userRecord?.practiceId ?? null,
    practiceByPracticeId,
    practiceError,
  });
}
