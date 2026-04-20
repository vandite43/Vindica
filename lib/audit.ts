import { prisma } from './db';

export type AuditAction = 'LOGIN' | 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'UPDATE_USER_ROLE' | 'MONTH_END_CHECKLIST_ITEM' | 'PHI_ACCESS' | 'EXPORT' | 'MFA_CHANGE' | 'USER_CREATED' | 'USER_DEACTIVATED';
export type AuditOutcome = 'SUCCESS' | 'FAILURE';

interface WriteAuditLogParams {
  userId?: string;
  userEmail: string;
  action: AuditAction;
  /** Format: "<resource-type>:<id>" — no PHI. e.g. "claim:clm_abc123" */
  resource: string;
  outcome: AuditOutcome;
  ipAddress?: string;
  userAgent?: string;
  /** Practice the event belongs to — omit for system-level events */
  practiceId?: string;
  /** Non-PHI context only, e.g. "status changed to DENIED" */
  details?: string;
}

/**
 * Write a HIPAA audit log entry. Never throws — a write failure must
 * never crash the main request.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}
