import {
  BillingCycle,
  CurrencyCode,
  PlanId,
  type InvoiceRecord,
  type PlanDefinition,
  type ReleaseRecord,
  type SubscriptionState,
  type TeamSettings,
} from '../types.ts';

export const PLANS: PlanDefinition[] = [
  {
    id: PlanId.ESSENCIAL,
    name: 'Essencial',
    audience: 'Para equipas em início de operação',
    summary: 'Substitua ficheiros .cmd soltos por validações prévias e histórico centralizado.',
    monthlyPriceEur: 19,
    monthlyPriceBrl: 99,
    monthlyQuota: 100,
    maxProjects: 3,
    retentionDays: 30,
    supportsRollback: false,
    supportsDigitalSignature: false,
    supportsApprovals: false,
    features: [
      'Até 3 projetos ativos',
      '100 publicações de correção / mês',
      'Auditor estático de .cmd e .ps1',
      'Histórico e logs retidos por 30 dias',
    ],
  },
  {
    id: PlanId.PROFISSIONAL,
    name: 'Profissional',
    audience: 'Para operações em crescimento',
    summary: 'Automatize publicações críticas com snapshot prévio, assinatura SHA-256 e reversão.',
    monthlyPriceEur: 49,
    monthlyPriceBrl: 249,
    monthlyQuota: 1500,
    maxProjects: null,
    retentionDays: 365,
    supportsRollback: true,
    supportsDigitalSignature: true,
    supportsApprovals: false,
    highlighted: true,
    features: [
      'Projetos ilimitados',
      '1.500 publicações de correção / mês',
      'Reversão automática em 1 clique',
      'Assinatura SHA-256 e alertas por webhook',
    ],
  },
  {
    id: PlanId.EMPRESARIAL,
    name: 'Empresarial',
    audience: 'Para infraestruturas críticas',
    summary: 'Controlo multi-ambiente, aprovações formais e auditoria anual completa.',
    monthlyPriceEur: 149,
    monthlyPriceBrl: 749,
    monthlyQuota: null,
    maxProjects: null,
    retentionDays: 1825,
    supportsRollback: true,
    supportsDigitalSignature: true,
    supportsApprovals: true,
    features: [
      'Publicações e projetos ilimitados',
      'Aprovação obrigatória para Produção',
      'Retenção de logs de auditoria por 5 anos',
      'SLA garantido de 99,9% e suporte dedicado',
    ],
  },
];

export interface ComparisonRow {
  label: string;
  essencial: string;
  profissional: string;
  empresarial: string;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: 'Publicações mensais incluídas',
    essencial: '100 / mês',
    profissional: '1.500 / mês',
    empresarial: 'Ilimitadas',
  },
  {
    label: 'Projetos e repositórios',
    essencial: 'Até 3 projetos',
    profissional: 'Ilimitados',
    empresarial: 'Ilimitados',
  },
  {
    label: 'Auditoria e endurecimento .cmd / .ps1',
    essencial: 'Incluído',
    profissional: 'Incluído',
    empresarial: 'Incluído + Regras próprias',
  },
  {
    label: 'Snapshot e reversão em 1 clique',
    essencial: 'Manual',
    profissional: 'Automática (1 clique)',
    empresarial: 'Automática + Multi-nó',
  },
  {
    label: 'Retenção de logs de execução',
    essencial: '30 dias',
    profissional: '365 dias',
    empresarial: '5 anos (arquivo fiscal)',
  },
  {
    label: 'Aprovação prévia em Produção',
    essencial: 'Não incluído',
    profissional: 'Opcional por equipa',
    empresarial: 'Obrigatória (2 assinaturas)',
  },
];

export const INITIAL_RELEASES: ReleaseRecord[] = [];

export const INITIAL_SUBSCRIPTION: SubscriptionState = {
  active: false,
  planId: PlanId.ESSENCIAL,
  cycle: BillingCycle.MONTHLY,
  currency: CurrencyCode.EUR,
  workspaceName: '',
  billingEmail: '',
  taxId: '',
  paymentMethod: '',
  nextBillingDate: '',
  autoRenew: false,
  usedQuotaThisMonth: 0,
};

export const INITIAL_INVOICES: InvoiceRecord[] = [];

export const INITIAL_TEAM_SETTINGS: TeamSettings = {
  notificationEmail: '',
  webhookUrl: '',
  requireProdConfirmation: true,
  autoRollbackOnFailure: true,
};

export function getPlanPrice(
  plan: PlanDefinition,
  cycle: BillingCycle,
  currency: CurrencyCode,
): number {
  const baseMonthly = currency === CurrencyCode.EUR ? plan.monthlyPriceEur : plan.monthlyPriceBrl;
  if (cycle === BillingCycle.ANNUAL) {
    return Math.round(baseMonthly * 0.8);
  }
  return baseMonthly;
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat(currency === CurrencyCode.EUR ? 'pt-PT' : 'pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
