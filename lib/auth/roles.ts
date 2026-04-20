export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'OFFICE_MANAGER' | 'BILLER';

export const isSuperAdmin      = (role: Role) => role === 'SUPER_ADMIN';
export const canManageUsers    = (role: Role) => role === 'ADMIN' || role === 'SUPER_ADMIN';
export const canViewAuditLogs  = (role: Role) => role === 'ADMIN' || role === 'SUPER_ADMIN';
export const canViewReports    = (role: Role) => role === 'ADMIN' || role === 'OFFICE_MANAGER';
export const canCreateClaims   = (role: Role) => role === 'ADMIN' || role === 'OFFICE_MANAGER' || role === 'BILLER';
export const canEditClaims     = (role: Role) => role === 'ADMIN' || role === 'OFFICE_MANAGER' || role === 'BILLER';
export const canDeleteClaims   = (role: Role) => role === 'ADMIN';
export const canViewPatients   = (role: Role) => role === 'ADMIN' || role === 'OFFICE_MANAGER' || role === 'BILLER';
