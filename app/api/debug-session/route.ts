import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  const session = await auth();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__Secure-authjs.session-token')
    ?? cookieStore.get('authjs.session-token')
    ?? cookieStore.get('next-auth.session-token');

  return NextResponse.json({
    session,
    cookieFound: !!sessionCookie,
    cookieName: sessionCookie?.name ?? null,
    cookieLength: sessionCookie?.value?.length ?? 0,
  });
}
