export const CDT_CODES = {
  D0120: 'Periodic oral evaluation',
  D0210: 'Complete series of radiographic images',
  D1110: 'Prophylaxis - adult',
  D2140: 'Amalgam - one surface, primary or permanent',
  D2740: 'Crown - porcelain/ceramic substrate',
  D2750: 'Crown - porcelain fused to high noble metal',
  D4341: 'Periodontal scaling and root planing - four or more teeth per quadrant',
  D4342: 'Periodontal scaling and root planing - one to three teeth per quadrant',
  D6010: 'Surgical placement of implant body: endosteal implant',
  D7140: 'Extraction, erupted tooth or exposed root',
  D7210: 'Extraction, erupted tooth requiring removal of bone and/or sectioning of tooth',
};

export const PLAN_TYPES = ['PPO', 'HMO', 'DMO', 'Medicaid', 'Medicare', 'DHMO', 'Indemnity'];

export const DENIAL_REASONS = [
  'Missing documentation',
  'Frequency limitation exceeded',
  'Not medically necessary',
  'Pre-authorization required',
  'Incorrect CDT code',
  'Duplicate claim',
  'Patient not eligible',
  'Service not covered',
  'Missing X-rays',
  'Coordination of benefits',
];

export const RISK_COLORS = {
  LOW: 'text-green-600 bg-green-50 border-green-200',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
  HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
  CRITICAL: 'text-red-600 bg-red-50 border-red-200',
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'text-gray-600 bg-gray-50',
  PENDING: 'text-blue-600 bg-blue-50',
  SUBMITTED: 'text-indigo-600 bg-indigo-50',
  APPROVED: 'text-green-600 bg-green-50',
  DENIED: 'text-red-600 bg-red-50',
  APPEALING: 'text-orange-600 bg-orange-50',
  APPEAL_WON: 'text-emerald-600 bg-emerald-50',
  APPEAL_LOST: 'text-rose-600 bg-rose-50',
  CLOSED: 'text-gray-500 bg-gray-50',
};
