/**
 * Data access layer for Appeal records.
 * letterContent contains patient PHI and is encrypted with AES-256-GCM.
 * Never call prisma.appeal directly from API routes.
 */

import { prisma } from '@/lib/db';
import { encrypt, safeDecrypt } from '@/lib/security/encrypt';
import { decryptPHI, type DecryptedClaim } from '@/lib/db/claims';
import type { Appeal, Claim } from '@prisma/client';

export type AppealWithClaim = Appeal & {
  claim: Pick<DecryptedClaim, 'id' | 'patientName' | 'payerName' | 'cdtCodes' | 'totalAmount' | 'denialReason' | 'serviceDate'>;
};

export type AppealWithDecryptedClaim = Appeal & {
  claim: DecryptedClaim & { practice: { userId: string } };
};

function decryptLetter(appeal: Appeal): Appeal {
  return { ...appeal, letterContent: safeDecrypt(appeal.letterContent) };
}

export async function getAppeal(id: string): Promise<AppealWithDecryptedClaim | null> {
  const appeal = await prisma.appeal.findUnique({
    where: { id },
    include: {
      claim: { include: { practice: { select: { userId: true } } } },
    },
  });
  if (!appeal) return null;

  const decryptedClaim = {
    ...decryptPHI(appeal.claim),
    practice: appeal.claim.practice,
  };

  return {
    ...decryptLetter(appeal),
    claim: decryptedClaim,
  } as AppealWithDecryptedClaim;
}

export async function saveAppealLetter(id: string, letterContent: string): Promise<Appeal> {
  const updated = await prisma.appeal.update({
    where: { id },
    data: { letterContent: encrypt(letterContent), generatedAt: new Date() },
  });
  return decryptLetter(updated);
}

export async function listAppeals(practiceId: string): Promise<AppealWithClaim[]> {
  const appeals = await prisma.appeal.findMany({
    where: { claim: { practiceId } },
    include: {
      claim: {
        select: {
          id: true, patientName: true, payerName: true, cdtCodes: true,
          totalAmount: true, denialReason: true, serviceDate: true,
        },
      },
    },
    orderBy: { generatedAt: 'desc' },
  });

  return appeals.map((a) => ({
    ...decryptLetter(a),
    claim: {
      ...a.claim,
      patientName: safeDecrypt(a.claim.patientName),
    },
  }));
}
