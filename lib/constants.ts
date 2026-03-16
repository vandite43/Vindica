export const AI_MODELS = [
  { id: 'claude-haiku-4-5-20251001',  label: 'Haiku 4.5',  description: 'Fastest · Best for routine claims' },
  { id: 'claude-sonnet-4-6',          label: 'Sonnet 4.6', description: 'Balanced · Better reasoning' },
  { id: 'claude-opus-4-6',            label: 'Opus 4.6',   description: 'Most capable · Complex cases' },
];

export const DEFAULT_AI_MODEL = 'claude-haiku-4-5-20251001';

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
  LOW:      'bg-[#E0F5F3] text-[#3BBFB0]',
  MEDIUM:   'bg-amber-50 text-amber-600',
  HIGH:     'bg-orange-50 text-orange-600',
  CRITICAL: 'bg-red-50 text-red-600',
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
