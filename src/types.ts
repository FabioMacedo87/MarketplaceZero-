export const LedgerEntryType = {
  EMISSAO_MANUAL: 'Emissão Manual',
  RESGATE_VOUCHER: 'Resgate de Voucher',
  COMPRA_STRIPE: 'Compra Stripe',
  SUBSCRICAO_MENSAL: 'Subscrição Mensal',
  CONSUMO_OPERACIONAL: 'Consumo Operacional',
} as const;
export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];

export const VoucherStatus = {
  ATIVO: 'Ativo',
  ESGOTADO: 'Esgotado',
  EXPIRADO: 'Expirado',
} as const;
export type VoucherStatus = (typeof VoucherStatus)[keyof typeof VoucherStatus];

export interface CreditAccount {
  id: string;
  name: string;
  email: string;
  planName: string;
  balance: number;
  totalIssued: number;
  totalConsumed: number;
  updatedAt: string;
}

export interface CreditVoucher {
  id: string;
  code: string;
  credits: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  status: VoucherStatus;
  note: string;
  createdAt: string;
}

export interface CreditPack {
  id: string;
  name: string;
  kind: 'pack' | 'subscription';
  credits: number;
  priceEur: number;
  intervalLabel: string;
  description: string;
  highlighted?: boolean;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  accountName: string;
  type: LedgerEntryType;
  delta: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  createdAt: string;
}
