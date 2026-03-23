import { prisma } from '@/lib/db';

/**
 * Generates a random 6-digit numeric code, saves it with a 10-minute
 * expiry to the user record, resets failed attempt counter, and returns
 * the plaintext code for emailing.
 */
export async function generateMfaCode(userId: string): Promise<string> {
  // Math.floor(100000 + random * 900000) guarantees exactly 6 digits (100000–999999)
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaCode: code,
      mfaCodeExpiry: expiry,
      mfaAttempts: 0, // reset failed attempt counter on new code
    },
  });

  return code;
}
