export interface ClaimInput {
  patientName: string;
  patientDob: string;
  patientInsuranceId: string;
  payerId: string;
  payerName: string;
  planType?: string;
  claimDate: string;
  serviceDate: string;
  cdtCodes: string[];
  diagnosisCodes: string[];
  totalAmount: number;
  xraysAttached?: boolean;
  perioCharting?: boolean;
  preAuthObtained?: boolean;
  narrativeIncluded?: boolean;
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface CdtCodeAnalysis {
  code: string;
  issue: string;
  alternativeCode?: string;
  rationale: string;
}

export interface ClaimAnalysis {
  denialRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: RiskFactor[];
  cdtCodeAnalysis: CdtCodeAnalysis[];
  missingDocumentation: string[];
  payerSpecificWarnings: string[];
  recommendedActions: string[];
  estimatedCleanClaimProbability: number;
  summary: string;
}

export interface PayerData {
  id: string;
  payerId: string;
  name: string;
  state?: string | null;
  denialRate?: number | null;
  avgProcessDays?: number | null;
  commonDenialReasons: string[];
  requiresPreAuth: string[];
  documentationQuirks: string[];
}
