import {
  BillingCycle,
  CurrencyCode,
  PlanId,
  ReleaseStatus,
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

export const INITIAL_RELEASES: ReleaseRecord[] = [
  {
    id: 'rel-418',
    title: 'Correção Faturação Eletrónica #418',
    scriptName: 'INICIAR-CORRECAO_5576a76e.cmd',
    environment: 'Produção',
    operator: 'Tiago Mendes',
    createdAt: '2026-11-26 08:42',
    durationSec: 11.4,
    status: ReleaseStatus.CONCLUIDA,
    exitCode: 0,
    checksum: '9f4a21c8e7b0',
    steps: [
      { name: 'Preflight & Assinatura', status: 'Concluída', durationMs: 1840, detail: 'SHA-256 verificado (RemoteSigned)' },
      { name: 'Snapshot de Estado', status: 'Concluída', durationMs: 3120, detail: 'Ponto de restauro guardado' },
      { name: 'Execução PowerShell', status: 'Concluída', durationMs: 4950, detail: 'PUBLICAR-CORRECAO.ps1 aplicado' },
      { name: 'Verificação Pós-Deploy', status: 'Concluída', durationMs: 1490, detail: 'HTTP 200 confirmado' },
    ],
    logs: [
      '[08:42:01] [PublicaFix] A validar manifesto de INICIAR-CORRECAO_5576a76e.cmd',
      '[08:42:03] [Preflight] Integridade verificada: sha256:9f4a21c8e7b0',
      '[08:42:06] [Snapshot] Backup incremental gravado em snapshot-20261126-084203',
      '[08:42:11] [Execucao] PUBLICAR-CORRECAO.ps1 concluido com codigo de saida 0',
      '[08:42:12] [Verificacao] Servico operacional. Processo terminado sem erros.',
    ],
  },
  {
    id: 'rel-417',
    title: 'Atualização Certificado Gateway Pagamentos',
    scriptName: 'PUBLICAR-CORRECAO.ps1',
    environment: 'Produção',
    operator: 'Inês Carvalho',
    createdAt: '2026-11-25 17:15',
    durationSec: 14.2,
    status: ReleaseStatus.CONCLUIDA,
    exitCode: 0,
    checksum: '4c81d02b19a3',
    steps: [
      { name: 'Preflight & Assinatura', status: 'Concluída', durationMs: 2100, detail: 'Política RemoteSigned validada' },
      { name: 'Snapshot de Estado', status: 'Concluída', durationMs: 4200, detail: 'Certificados anteriores arquivados' },
      { name: 'Execução PowerShell', status: 'Concluída', durationMs: 6100, detail: 'Bindings TLS atualizados' },
      { name: 'Verificação Pós-Deploy', status: 'Concluída', durationMs: 1800, detail: 'Handshake TLS 1.3 validado' },
    ],
    logs: [
      '[17:15:02] [PublicaFix] Execucao iniciada por Inês Carvalho',
      '[17:15:06] [Snapshot] Armazenamento de reserva concluido',
      '[17:15:14] [Verificacao] Certificado valido ate Nov 2027. Codigo de saida 0.',
    ],
  },
  {
    id: 'rel-416',
    title: 'Correção Fila de Sincronização ERP',
    scriptName: 'SYNC-ERP-FIX.ps1',
    environment: 'Pré-Produção',
    operator: 'Tiago Mendes',
    createdAt: '2026-11-24 11:08',
    durationSec: 9.8,
    status: ReleaseStatus.REVERTIDA,
    exitCode: 1,
    checksum: '7e22b91f44d1',
    steps: [
      { name: 'Preflight & Assinatura', status: 'Concluída', durationMs: 1500, detail: 'Sintaxe validada' },
      { name: 'Snapshot de Estado', status: 'Concluída', durationMs: 2900, detail: 'Estado anterior guardado' },
      { name: 'Execução PowerShell', status: 'Falhada', durationMs: 3600, detail: 'Timeout na porta 1433' },
      { name: 'Reversão Automática', status: 'Concluída', durationMs: 1800, detail: 'Snapshot restaurado com sucesso' },
    ],
    logs: [
      '[11:08:01] [PublicaFix] A iniciar SYNC-ERP-FIX.ps1 em Pré-Produção',
      '[11:08:07] [ERRO] Excecao capturada: Timeout de ligacao ao servico ERP',
      '[11:08:09] [Reversao] Snapshot anterior reposto sem perda de dados.',
    ],
  },
];

export const INITIAL_SUBSCRIPTION: SubscriptionState = {
  active: true,
  planId: PlanId.PROFISSIONAL,
  cycle: BillingCycle.MONTHLY,
  currency: CurrencyCode.EUR,
  workspaceName: 'Equipa Engenharia Lisboa',
  billingEmail: 'fabioporto1987@gmail.com',
  taxId: 'PT509482110',
  paymentMethod: 'Cartão Visa •••• 4242',
  nextBillingDate: '2026-12-26',
  autoRenew: true,
  usedQuotaThisMonth: 142,
};

export const INITIAL_INVOICES: InvoiceRecord[] = [
  {
    id: 'inv-2026-11',
    number: 'PF-2026-0011',
    issuedAt: '2026-11-26',
    planName: 'Profissional',
    cycle: BillingCycle.MONTHLY,
    currency: CurrencyCode.EUR,
    subtotal: 49.0,
    vatAmount: 11.27,
    total: 60.27,
    status: 'Paga',
    paymentMethod: 'Cartão Visa •••• 4242',
  },
  {
    id: 'inv-2026-10',
    number: 'PF-2026-0010',
    issuedAt: '2026-10-26',
    planName: 'Profissional',
    cycle: BillingCycle.MONTHLY,
    currency: CurrencyCode.EUR,
    subtotal: 49.0,
    vatAmount: 11.27,
    total: 60.27,
    status: 'Paga',
    paymentMethod: 'Cartão Visa •••• 4242',
  },
];

export const INITIAL_TEAM_SETTINGS: TeamSettings = {
  notificationEmail: 'fabioporto1987@gmail.com',
  webhookUrl: 'https://hooks.empresa.pt/publicafix-alertas',
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
