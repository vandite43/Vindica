/**
 * Data access layer for Provider records.
 * ALL reads and writes for sensitive credential fields go through this module.
 * Never call prisma.provider directly from API routes for create/update.
 *
 * Sensitive fields encrypted with AES-256-GCM:
 *   npiType1, licenseNumber, deaNumber
 */

import { prisma } from '@/lib/db';
import { encrypt, safeDecrypt } from '@/lib/security/encrypt';
import type { Provider, ProviderCredential, CredentialingEvent } from '@prisma/client';

// ── Types ────────────────────────────────────────────────────────────────────

export type ProviderWithRelations = Provider & {
  credentialing: ProviderCredential[];
  events: CredentialingEvent[];
};

// ── Encrypt / decrypt helpers ─────────────────────────────────────────────────

function encryptFields(data: {
  npiType1?: string;
  licenseNumber?: string;
  deaNumber?: string | null;
}) {
  const out: Record<string, string | null> = {};
  if (data.npiType1 !== undefined)      out.npiType1      = encrypt(data.npiType1);
  if (data.licenseNumber !== undefined) out.licenseNumber = encrypt(data.licenseNumber);
  if (data.deaNumber !== undefined)
    out.deaNumber = data.deaNumber ? encrypt(data.deaNumber) : null;
  return out;
}

/**
 * Decrypts sensitive fields on a Provider row.
 * Uses safeDecrypt so existing plaintext rows (e.g. from seed) are handled gracefully.
 */
export function decryptProvider<T extends Provider>(row: T): T {
  return {
    ...row,
    npiType1:      safeDecrypt(row.npiType1),
    licenseNumber: safeDecrypt(row.licenseNumber),
    deaNumber:     row.deaNumber ? safeDecrypt(row.deaNumber) : null,
  };
}

// ── DAL functions ─────────────────────────────────────────────────────────────

const DEFAULT_PAYERS = [
  { payerName: 'Delta Dental',       payerId: 'DELTA001' },
  { payerName: 'Cigna',              payerId: 'CIGNA001' },
  { payerName: 'Aetna',              payerId: 'AETNA001' },
  { payerName: 'MetLife',            payerId: 'METLIFE001' },
  { payerName: 'UnitedHealthcare',   payerId: 'UHC001' },
  { payerName: 'Guardian',           payerId: 'GUARD001' },
  { payerName: 'Humana',             payerId: 'HUMANA001' },
  { payerName: 'BCBS',               payerId: 'BCBS001' },
  { payerName: 'Medicaid (State)',    payerId: 'MCAID001' },
  { payerName: 'Medicare Advantage', payerId: 'MCARE001' },
];

export async function createProvider(
  practiceId: string,
  data: {
    firstName: string;
    lastName: string;
    credentials: string;
    npiType1: string;
    licenseNumber: string;
    licenseState: string;
    licenseExpiry: Date;
    deaNumber?: string | null;
    specialty: string;
    startDate: Date;
  },
): Promise<ProviderWithRelations> {
  const encrypted = encryptFields({
    npiType1:      data.npiType1,
    licenseNumber: data.licenseNumber,
    deaNumber:     data.deaNumber,
  });

  const provider = await prisma.provider.create({
    data: {
      practiceId,
      firstName:     data.firstName,
      lastName:      data.lastName,
      credentials:   data.credentials,
      npiType1:      encrypted.npiType1!,
      licenseNumber: encrypted.licenseNumber!,
      licenseState:  data.licenseState,
      licenseExpiry: data.licenseExpiry,
      deaNumber:     encrypted.deaNumber ?? null,
      specialty:     data.specialty,
      startDate:     data.startDate,
      credentialing: {
        create: DEFAULT_PAYERS.map(p => ({ ...p, status: 'NOT_STARTED' as const })),
      },
    },
    include: { credentialing: true, events: true },
  });

  return decryptProvider(provider);
}

export async function getProviderById(id: string): Promise<ProviderWithRelations | null> {
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      credentialing: { orderBy: { payerName: 'asc' } },
      events: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!provider) return null;
  return decryptProvider(provider);
}

export async function listProviders(practiceId: string): Promise<ProviderWithRelations[]> {
  const providers = await prisma.provider.findMany({
    where: { practiceId },
    include: { credentialing: true, events: { orderBy: { createdAt: 'desc' } } },
    orderBy: { lastName: 'asc' },
  });
  return providers.map(p => decryptProvider(p));
}

export async function updateProvider(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    credentials: string;
    npiType1: string;
    licenseNumber: string;
    licenseState: string;
    licenseExpiry: Date;
    deaNumber: string | null;
    specialty: string;
    startDate: Date;
    active: boolean;
  }>,
): Promise<ProviderWithRelations> {
  const encrypted = encryptFields({
    npiType1:      data.npiType1,
    licenseNumber: data.licenseNumber,
    deaNumber:     data.deaNumber,
  });

  const updated = await prisma.provider.update({
    where: { id },
    data: {
      ...(data.firstName !== undefined     && { firstName: data.firstName }),
      ...(data.lastName !== undefined      && { lastName: data.lastName }),
      ...(data.credentials !== undefined   && { credentials: data.credentials }),
      ...(data.npiType1 !== undefined      && { npiType1: encrypted.npiType1! }),
      ...(data.licenseNumber !== undefined && { licenseNumber: encrypted.licenseNumber! }),
      ...(data.licenseState !== undefined  && { licenseState: data.licenseState }),
      ...(data.licenseExpiry !== undefined && { licenseExpiry: data.licenseExpiry }),
      ...(data.deaNumber !== undefined     && { deaNumber: encrypted.deaNumber }),
      ...(data.specialty !== undefined     && { specialty: data.specialty }),
      ...(data.startDate !== undefined     && { startDate: data.startDate }),
      ...(data.active !== undefined        && { active: data.active }),
    },
    include: { credentialing: true, events: { orderBy: { createdAt: 'desc' } } },
  });

  return decryptProvider(updated);
}

export async function deactivateProvider(id: string): Promise<void> {
  await prisma.provider.update({ where: { id }, data: { active: false } });
}
