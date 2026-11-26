export const BillingCycle = {
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
} as const;
export type BillingCycle = (typeof BillingCycle)[keyof typeof BillingCycle];

export const PlanId = {
  ESSENCIAL: 'essencial',
  PROFISSIONAL: 'profissional',
  EMPRESARIAL: 'empresarial',
} as const;
export type PlanId = (typeof PlanId)[keyof typeof PlanId];

export const CurrencyCode = {
  EUR: 'EUR',
  BRL: 'BRL',
} as const;
export type CurrencyCode = (typeof CurrencyCode)[keyof typeof CurrencyCode];

export const ReleaseStatus = {
  CONCLUIDA: 'Concluída',
  REVERTIDA: 'Revertida',
  EM_VALIDACAO: 'Em Validação',
  FALHADA: 'Falhada',
} as const;
export type ReleaseStatus = (typeof ReleaseStatus)[keyof typeof ReleaseStatus];

export const FindingSeverity = {
  CRITICO: 'Crítico',
  ATENCAO: 'Atenção',
  RECOMENDADO: 'Recomendado',
} as const;
export type FindingSeverity = (typeof FindingSeverity)[keyof typeof FindingSeverity];

export interface PlanDefinition {
  id: PlanId;
  name: string;
  audience: string;
  summary: string;
  monthlyPriceEur: number;
  monthlyPriceBrl: number;
  monthlyQuota: number | null;
  maxProjects: number | null;
  retentionDays: number;
  supportsRollback: boolean;
  supportsDigitalSignature: boolean;
  supportsApprovals: boolean;
  highlighted?: boolean;
  features: string[];
}

export interface ScriptFinding {
  id: string;
  severity: FindingSeverity;
  lineRef: string;
  title: string;
  description: string;
  remediation: string;
}

export interface ScriptAuditResult {
  filename: string;
  detectedType: 'batch' | 'powershell';
  checksPassed: number;
  totalChecks: number;
  findings: ScriptFinding[];
  hardenedCmd: string;
  hardenedPs1: string;
}

export interface ReleaseStep {
  name: string;
  status: 'Concluída' | 'Em Curso' | 'Pendente' | 'Falhada';
  durationMs: number;
  detail: string;
}

export interface ReleaseRecord {
  id: string;
  title: string;
  scriptName: string;
  environment: 'Produção' | 'Pré-Produção' | 'Homologação';
  operator: string;
  createdAt: string;
  durationSec: number;
  status: ReleaseStatus;
  exitCode: number;
  checksum: string;
  steps: ReleaseStep[];
  logs: string[];
}

export interface InvoiceRecord {
  id: string;
  number: string;
  issuedAt: string;
  planName: string;
  cycle: BillingCycle;
  currency: CurrencyCode;
  subtotal: number;
  vatAmount: number;
  total: number;
  status: 'Paga' | 'Pendente';
  paymentMethod: string;
}

export interface SubscriptionState {
  active: boolean;
  planId: PlanId;
  cycle: BillingCycle;
  currency: CurrencyCode;
  workspaceName: string;
  billingEmail: string;
  taxId: string;
  paymentMethod: string;
  nextBillingDate: string;
  autoRenew: boolean;
  usedQuotaThisMonth: number;
}

export interface TeamSettings {
  notificationEmail: string;
  webhookUrl: string;
  requireProdConfirmation: boolean;
  autoRollbackOnFailure: boolean;
}
