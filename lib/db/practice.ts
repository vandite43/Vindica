import { prisma } from './index';

/**
 * Resolves the practice for a given user, supporting both:
 * - Owner accounts: Practice.userId === userId
 * - Member accounts: User.practiceId → Practice.id
 *
 * Returns the practice or null if not found.
 */
export async function getPracticeForUser(userId: string) {
  return prisma.practice.findFirst({
    where: {
      OR: [
        { userId },
        { members: { some: { id: userId } } },
      ],
    },
  });
}

/**
 * Returns just the practiceId for a user, or null if not found.
 * Use this when you only need the ID for an ownership check.
 */
export async function getPracticeIdForUser(userId: string): Promise<string | null> {
  const practice = await prisma.practice.findFirst({
    where: {
      OR: [
        { userId },
        { members: { some: { id: userId } } },
      ],
    },
    select: { id: true },
  });
  return practice?.id ?? null;
}
