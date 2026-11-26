import { useEffect, useRef, useState } from 'react';
import { CreditIssuancePanel } from './components/CreditIssuancePanel.tsx';
import { CreditTopBar, type RepoSection } from './components/CreditTopBar.tsx';
import { LedgerTable } from './components/LedgerTable.tsx';
import { StripePackagesPanel } from './components/StripePackagesPanel.tsx';
import { VoucherRepository } from './components/VoucherRepository.tsx';
import {
  CREDIT_PACKS,
  INITIAL_ACCOUNTS,
  INITIAL_LEDGER,
  INITIAL_VOUCHERS,
} from './data/creditCatalog.ts';
import {
  VoucherStatus,
  type CreditAccount,
  type CreditPack,
  type CreditVoucher,
  type LedgerEntry,
} from './types.ts';

export default function App() {
  const [activeSection, setActiveSection] = useState<RepoSection>('contas');
  const [accounts, setAccounts] = useState<CreditAccount[]>(INITIAL_ACCOUNTS);
  const [vouchers, setVouchers] = useState<CreditVoucher[]>(INITIAL_VOUCHERS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(INITIAL_LEDGER);
  const [packs, setPacks] = useState<CreditPack[]>(CREDIT_PACKS);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(INITIAL_ACCOUNTS[0].id);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const contasRef = useRef<HTMLDivElement>(null);
  const emissaoRef = useRef<HTMLDivElement>(null);
  const vouchersRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<HTMLDivElement>(null);
  const registoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      try {
        const res = await fetch('/api/credits/repository');
        if (res.ok && mounted) {
          const data = await res.json();
          if (Array.isArray(data.accounts)) setAccounts(data.accounts);
          if (Array.isArray(data.vouchers)) setVouchers(data.vouchers);
          if (Array.isArray(data.ledger)) setLedger(data.ledger);
          if (Array.isArray(data.packs)) setPacks(data.packs);
          setStripeConfigured(Boolean(data.stripeConfigured));
        }

        const params = new URLSearchParams(window.location.search);
        const stripeStatus = params.get('stripe_status');
        const sessionId = params.get('session_id');

        if (stripeStatus === 'success' && sessionId) {
          const verifyRes = await fetch('/api/stripe/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && mounted) {
            if (Array.isArray(verifyData.accounts)) setAccounts(verifyData.accounts);
            if (Array.isArray(verifyData.ledger)) setLedger(verifyData.ledger);
            setBanner({
              type: 'ok',
              text: 'Pagamento Stripe confirmado e créditos adicionados ao repositório.',
            });
          } else if (mounted) {
            setBanner({
              type: 'err',
              text: verifyData.error || 'Não foi possível validar a sessão Stripe.',
            });
          }
          window.history.replaceState({}, '', window.location.pathname);
        } else if (stripeStatus === 'cancelled' && mounted) {
          setBanner({ type: 'err', text: 'Checkout Stripe cancelado pelo utilizador.' });
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch {
        // Keep initial fixtures if fetch fails
      }
    }
    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  const scrollToSection = (section: RepoSection) => {
    setActiveSection(section);
    const map: Record<RepoSection, React.RefObject<HTMLDivElement | null>> = {
      contas: contasRef,
      emissao: emissaoRef,
      vouchers: vouchersRef,
      stripe: stripeRef,
      registo: registoRef,
    };
    const target = map[section]?.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleIssueCredits = async (accountId: string, amount: number, reference: string) => {
    const res = await fetch('/api/credits/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, amount, reference }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao emitir créditos.');
    setAccounts(data.accounts);
    setLedger(data.ledger);
  };

  const handleConsumeCredits = async (accountId: string, amount: number, operation: string) => {
    const res = await fetch('/api/credits/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, amount, operation }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao descontar créditos.');
    setAccounts(data.accounts);
    setLedger(data.ledger);
  };

  const handleCreateAccount = async (name: string, email: string, planName: string) => {
    const res = await fetch('/api/credits/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, planName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar conta.');
    setAccounts(data.accounts);
    if (data.account?.id) setSelectedAccountId(data.account.id);
  };

  const handleCreateVoucher = async (payload: {
    customCode: string;
    credits: number;
    maxUses: number;
    expiresAt: string;
    note: string;
  }) => {
    const res = await fetch('/api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao gerar voucher.');
    setVouchers(data.vouchers);
  };

  const handleRedeemVoucher = async (code: string, accountId: string) => {
    const res = await fetch('/api/vouchers/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, accountId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao resgatar voucher.');
    setAccounts(data.accounts);
    setVouchers(data.vouchers);
    setLedger(data.ledger);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalIssued = accounts.reduce((sum, a) => sum + a.totalIssued, 0);
  const totalConsumed = accounts.reduce((sum, a) => sum + a.totalConsumed, 0);
  const activeVouchersCount = vouchers.filter((v) => v.status === VoucherStatus.ATIVO).length;

  return (
    <div id="topo" className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A]">
      <CreditTopBar
        activeSection={activeSection}
        onSelectSection={scrollToSection}
        onQuickIssue={() => scrollToSection('emissao')}
      />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-10 space-y-12">
        {/* Hero / Summary Header */}
        <div ref={contasRef} className="scroll-mt-24 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-slate-500">
                Repositório Central de Créditos · Emissão, Vouchers e Stripe
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A] mt-2 text-balance">
                Gere créditos, distribua códigos e controle o consumo por conta
              </h1>
              <p className="mt-2.5 text-base text-slate-600 leading-relaxed">
                Emita saldo diretamente para equipas, crie lotes de vouchers resgatáveis, receba
                pagamentos via Stripe Checkout e acompanhe cada movimento num registo auditável.
              </p>
            </div>
          </div>

          {banner && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <p
                className={`text-sm font-medium ${
                  banner.type === 'ok' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                {banner.text}
              </p>
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="text-xs font-medium text-slate-500 hover:text-[#0F172A] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Saldo em Circulação</p>
              <p className="font-mono text-2xl font-medium text-[#0F172A] mt-1 tabular-nums">
                {totalBalance.toLocaleString('pt-PT')}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Total de Créditos Gerados</p>
              <p className="font-mono text-2xl font-medium text-[#16A34A] mt-1 tabular-nums">
                +{totalIssued.toLocaleString('pt-PT')}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Total Consumido</p>
              <p className="font-mono text-2xl font-medium text-[#0F172A] mt-1 tabular-nums">
                -{totalConsumed.toLocaleString('pt-PT')}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Vouchers Ativos</p>
              <p className="font-mono text-2xl font-medium text-[#1D4ED8] mt-1 tabular-nums">
                {activeVouchersCount}
              </p>
            </div>
          </div>
        </div>

        <div ref={emissaoRef} className="scroll-mt-24 pt-4 border-t border-slate-200">
          <CreditIssuancePanel
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccountId={setSelectedAccountId}
            onIssueCredits={handleIssueCredits}
            onConsumeCredits={handleConsumeCredits}
            onCreateAccount={handleCreateAccount}
          />
        </div>

        <div ref={vouchersRef} className="scroll-mt-24 pt-4 border-t border-slate-200">
          <VoucherRepository
            vouchers={vouchers}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onCreateVoucher={handleCreateVoucher}
            onRedeemVoucher={handleRedeemVoucher}
          />
        </div>

        <div ref={stripeRef} className="scroll-mt-24 pt-4 border-t border-slate-200">
          <StripePackagesPanel
            packs={packs}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            stripeConfigured={stripeConfigured}
          />
        </div>

        <div ref={registoRef} className="scroll-mt-24 pt-4 border-t border-slate-200">
          <LedgerTable entries={ledger} />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 mt-8">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <span className="font-display text-sm font-bold text-[#0F172A]">CréditoHub</span>
          <span>Repositório de Geração de Créditos, Vouchers e Faturação Stripe · 2026</span>
        </div>
      </footer>
    </div>
  );
}
