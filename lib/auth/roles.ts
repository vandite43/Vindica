export type Role = 'ADMIN' | 'OFFICE_MANAGER' | 'BILLER' | 'PROVIDER';

export const canManageUsers    = (role: Role) => role === 'ADMIN';
export const canViewAuditLogs  = (role: Role) => role === 'ADMIN';
export const canViewReports    = (role: Role) => role === 'ADMIN' || role === 'OFFICE_MANAGER';
export const canCreateClaims   = (role: Role) => role === 'ADMIN' || role === 'OFFICE_MANAGER' || role === 'BILLER';
export const canEditClaims     = (role: Role) => role === 'ADMIN' || role === 'OFFICE_MANAGER' || role === 'BILLER';
export const canDeleteClaims   = (role: Role) => role === 'ADMIN';
export const canViewPatients   = (role: Role) => role === 'ADMIN' || role === 'OFFICE_MANAGER' || role === 'BILLER';
export const canViewOwnPatients = (_role: Role) => true; // all roles
