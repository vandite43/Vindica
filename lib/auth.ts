import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { writeAuditLog } from './audit';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 86400 },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',     type: 'email' },
        password: { label: 'Password',  type: 'password' },
        mfaToken: { label: 'MFA Token', type: 'text' },
      },
      async authorize(credentials) {
        const email    = credentials?.email    as string | undefined;
        const password = credentials?.password as string | undefined;
        const mfaToken = credentials?.mfaToken as string | undefined;

        if (!email) return null;

        // ── MFA TOKEN PATH ────────────────────────────────────────────────
        // Called by the verify page after /api/auth/verify-mfa succeeds.
        // The mfaToken is single-use and expires in 5 minutes.
        if (mfaToken) {
          const user = await prisma.user.findUnique({ where: { email } });
          if (
            !user ||
            !user.isActive ||
            !user.mfaToken ||
            user.mfaToken !== mfaToken ||
            !user.mfaTokenExpiry ||
            user.mfaTokenExpiry < new Date()
          ) {
            return null;
          }
          // Consume the token immediately (single-use)
          await prisma.user.update({
            where: { id: user.id },
            data: { mfaToken: null, mfaTokenExpiry: null },
          });
          await writeAuditLog({
            userId: user.id,
            userEmail: user.email,
            action: 'LOGIN',
            resource: `user:${user.id}`,
            outcome: 'SUCCESS',
            details: 'Session created after MFA verification',
          });
          return { id: user.id, email: user.email, name: user.name };
        }

        // ── PASSWORD PATH ─────────────────────────────────────────────────
        // Only reaches here for users with mfaEnabled=false.
        // MFA-enabled users must go through /api/auth/credentials-check
        // → /api/auth/send-mfa → /api/auth/verify-mfa → mfaToken path above.
        if (!password) { console.error('[authorize] No password provided'); return null; }

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (dbErr) {
          console.error('[authorize] DB query failed:', dbErr);
          return null;
        }

        if (!user || !user.password || !user.isActive) {
          console.error('[authorize] User not found / no password / inactive:', { found: !!user, hasPassword: !!user?.password, isActive: user?.isActive });
          await writeAuditLog({
            userEmail: email,
            action: 'LOGIN',
            resource: 'session:unknown',
            outcome: 'FAILURE',
            details: 'User not found or no password set',
          });
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        console.error('[authorize] bcrypt result:', isValid, 'email:', email);
        if (!isValid) {
          await writeAuditLog({
            userId: user.id,
            userEmail: user.email,
            action: 'LOGIN',
            resource: `user:${user.id}`,
            outcome: 'FAILURE',
            details: 'Invalid password',
          });
          return null;
        }

        // Block direct session creation for MFA-enabled users
        if (user.mfaEnabled) {
          console.error('[authorize] MFA-enabled user tried password path');
          return null;
        }

        await writeAuditLog({
          userId: user.id,
          userEmail: user.email,
          action: 'LOGIN',
          resource: `user:${user.id}`,
          outcome: 'SUCCESS',
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch role once on first sign-in and store in token
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { role: true },
        });
        token.role = dbUser?.role ?? 'BILLER';
      }
      // Extended sessions for demo accounts — capped at 24 hours.
      // Only active when DEMO_ACCOUNT_EMAILS is explicitly set (never in production by default).
      const demoEmails = process.env.DEMO_ACCOUNT_EMAILS
        ? process.env.DEMO_ACCOUNT_EMAILS.split(',').map(e => e.trim()).filter(Boolean)
        : [];
      if (demoEmails.length > 0 && demoEmails.includes(token.email as string)) {
        token.exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
