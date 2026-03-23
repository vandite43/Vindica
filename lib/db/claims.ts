/**
 * Data access layer for Claim records.
 * ALL reads and writes for PHI fields go through this module.
 * Never call prisma.claim directly from API routes.
 *
 * PHI fields encrypted with AES-256-GCM:
 *   patientName, patientDob, patientInsuranceId, diagnosisCodes
 */

import { prisma } from '@/lib/db';
import { encrypt, safeDecrypt } from '@/lib/security/encrypt';
import type { Claim, Appeal, Practice } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Decrypted claim returned by all DAL functions.
 * patientDob is restored to Date; diagnosisCodes restored to string[].
 */
export type DecryptedClaim = Omit<Claim, 'patientDob' | 'diagnosisCodes'> & {
  patientDob: Date;
  diagnosisCodes: string[];
  appeal?: Appeal | null;
  practice?: Pick<Practice, 'userId'>;
};

// ── PHI helpers ───────────────────────────────────────────────────────────────

function encryptPHI(data: {
  patientName?: string;
  patientDob?: Date | string;
  patientInsuranceId?: string;
  diagnosisCodes?: string[];
}) {
  const out: Record<string, string> = {};
  if (data.patientName !== undefined)
    out.patientName = encrypt(data.patientName);
  if (data.patientDob !== undefined) {
    const iso = data.patientDob instanceof Date
      ? data.patientDob.toISOString()
      : data.patientDob;
    out.patientDob = encrypt(iso);
  }
  if (data.patientInsuranceId !== undefined)
    out.patientInsuranceId = encrypt(data.patientInsuranceId);
  if (data.diagnosisCodes !== undefined)
    out.diagnosisCodes = encrypt(JSON.stringify(data.diagnosisCodes));
  return out;
}

export function decryptPHI(row: Claim): DecryptedClaim {
  const patientName       = safeDecrypt(row.patientName);
  const patientInsuranceId = safeDecrypt(row.patientInsuranceId);
  const dobStr            = safeDecrypt(row.patientDob);
  const patientDob        = new Date(dobStr);
  const diagRaw           = safeDecrypt(row.diagnosisCodes);
  const diagnosisCodes: string[] = (() => {
    try { return JSON.parse(diagRaw); } catch { return [diagRaw]; }
  })();

  return {
    ...row,
    patientName,
    patientDob,
    patientInsuranceId,
    diagnosisCodes,
  };
}

function decryptPHIWithRelations(
  row: Claim & { appeal?: Appeal | null; practice?: Pick<Practice, 'userId'> },
): DecryptedClaim {
  return { ...decryptPHI(row), appeal: row.appeal, practice: row.practice };
}

// ── DAL functions ─────────────────────────────────────────────────────────────

export async function createClaim(
  practiceId: string,
  data: {
    patientName: string;
    patientDob: Date;
    patientInsuranceId: string;
    payerId: string;
    payerName: string;
    planType?: string;
    claimDate: Date;
    serviceDate: Date;
    cdtCodes: string[];
    diagnosisCodes: string[];
    totalAmount: number;
  },
): Promise<DecryptedClaim> {
  const encrypted = encryptPHI({
    patientName:       data.patientName,
    patientDob:        data.patientDob,
    patientInsuranceId: data.patientInsuranceId,
    diagnosisCodes:    data.diagnosisCodes,
  });

  const claim = await prisma.claim.create({
    data: {
      practiceId,
      patientName:        encrypted.patientName,
      patientDob:         encrypted.patientDob,
      patientInsuranceId: encrypted.patientInsuranceId,
      diagnosisCodes:     encrypted.diagnosisCodes,
      payerId:      data.payerId,
      payerName:    data.payerName,
      planType:     data.planType,
      claimDate:    data.claimDate,
      serviceDate:  data.serviceDate,
      cdtCodes:     data.cdtCodes,
      totalAmount:  data.totalAmount,
      status:       'DRAFT',
    },
  });

  return decryptPHI(claim);
}

export async function getClaimById(id: string): Promise<DecryptedClaim | null> {
  const claim = await prisma.claim.findUnique({
    where: { id },
    include: {
      appeal:   true,
      practice: { select: { userId: true } },
    },
  });
  if (!claim) return null;
  return decryptPHIWithRelations(claim);
}

export async function listClaims(
  practiceId: string,
  filters: { status?: string; riskLevel?: string; payerId?: string },
): Promise<DecryptedClaim[]> {
  const where: Record<string, unknown> = { practiceId };
  if (filters.status   && filters.status   !== 'ALL') where.status   = filters.status;
  if (filters.riskLevel && filters.riskLevel !== 'ALL') where.riskLevel = filters.riskLevel;
  if (filters.payerId) where.payerId = filters.payerId;

  const claims = await prisma.claim.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { appeal: true },
    take: 100,
  });

  return claims.map(c => decryptPHIWithRelations(c));
}

export async function updateClaim(
  id: string,
  data: Partial<{
    patientName: string;
    patientDob: Date;
    patientInsuranceId: string;
    providerNpi: string;
    payerId: string;
    payerName: string;
    planType: string;
    claimDate: Date;
    serviceDate: Date;
    cdtCodes: string[];
    toothNumbers: string[];
    diagnosisCodes: string[];
    totalAmount: number;
    preAuthNumber: string;
    xraysAttached: boolean;
    perioCharting: boolean;
    preAuthObtained: boolean;
    narrativeIncluded: boolean;
    status: string;
    submittedAt: Date;
    deniedAt: Date;
    denialReason: string;
    denialCode: string;
    // AI analysis fields (not PHI)
    denialRiskScore: number;
    riskLevel: string;
    aiAnalysis: object;
    flaggedIssues: string[];
    suggestedCdtCodes: string[];
  }>,
): Promise<DecryptedClaim> {
  const phiUpdate: Record<string, unknown> = {};

  // Encrypt any PHI fields that are being updated
  if (data.patientName !== undefined)
    phiUpdate.patientName = encrypt(data.patientName);
  if (data.patientDob !== undefined)
    phiUpdate.patientDob = encrypt(data.patientDob.toISOString());
  if (data.patientInsuranceId !== undefined)
    phiUpdate.patientInsuranceId = encrypt(data.patientInsuranceId);
  if (data.diagnosisCodes !== undefined)
    phiUpdate.diagnosisCodes = encrypt(JSON.stringify(data.diagnosisCodes));

  // Non-PHI fields passed through directly
  const nonPhi: Record<string, unknown> = {};
  const plain = [
    'providerNpi','payerId','payerName','planType','claimDate','serviceDate',
    'cdtCodes','toothNumbers','totalAmount','preAuthNumber','xraysAttached',
    'perioCharting','preAuthObtained','narrativeIncluded','status','submittedAt',
    'deniedAt','denialReason','denialCode','denialRiskScore','riskLevel',
    'aiAnalysis','flaggedIssues','suggestedCdtCodes',
  ] as const;
  for (const key of plain) {
    if (data[key] !== undefined) nonPhi[key] = data[key];
  }

  const updated = await prisma.claim.update({
    where: { id },
    data: { ...phiUpdate, ...nonPhi },
  });

  return decryptPHI(updated);
}

export async function deleteClaim(id: string): Promise<void> {
  const claim = await prisma.claim.findUnique({ where: { id }, include: { appeal: true } });
  if (!claim) return;
  if (claim.appeal) await prisma.appeal.delete({ where: { claimId: id } });
  await prisma.claim.delete({ where: { id } });
}
