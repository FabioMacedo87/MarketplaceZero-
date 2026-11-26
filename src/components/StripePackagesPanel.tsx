import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { formatEur } from '../data/creditCatalog.ts';
import type { CreditAccount, CreditPack } from '../types.ts';

interface StripePackagesPanelProps {
  packs: CreditPack[];
  accounts: CreditAccount[];
  selectedAccountId: string;
  stripeConfigured: boolean;
}

export const StripePackagesPanel: React.FC<StripePackagesPanelProps> = ({
  packs,
  accounts,
  selectedAccountId,
  stripeConfigured,
}) => {
  const [targetAccountId, setTargetAccountId] = useState(selectedAccountId);
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCheckout = async (packId: string) => {
    setErrorMsg('');
    setLoadingPackId(packId);
    try {
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId,
          accountId: targetAccountId || selectedAccountId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Não foi possível iniciar o Checkout Stripe.');
        return;
      }
      if (data.url && /^https:\/\/checkout\.stripe\.com\//i.test(data.url)) {
        window.location.assign(data.url);
      } else {
        setErrorMsg('URL de sessão Stripe inválida recebida do servidor.');
      }
    } catch {
      setErrorMsg('Erro de ligação ao servidor de pagamentos.');
    } finally {
      setLoadingPackId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#0F172A]">
            Recargas e Mensalidades via Stripe
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Inicie sessões de pagamento reais no Stripe Checkout com crédito automático após
            confirmação do webhook.
          </p>
        </div>

        <div className="min-w-[240px]">
          <label
            htmlFor="stripe-account"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Conta a Creditar
          </label>
          <select
            id="stripe-account"
            value={targetAccountId}
            onChange={(e) => setTargetAccountId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!stripeConfigured && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
          <span className="font-semibold text-[#D97706]">Stripe em espera:</span> configure{' '}
          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
            STRIPE_SECRET_KEY
          </code>{' '}
          e{' '}
          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
            STRIPE_WEBHOOK_SECRET
          </code>{' '}
          em <strong>Settings &gt; Secrets</strong> para abrir pagamentos reais via Stripe Checkout.
        </div>
      )}

      {errorMsg && (
        <p role="alert" className="text-sm font-medium text-[#DC2626]">
          {errorMsg}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className={`bg-white rounded-xl p-6 border flex flex-col justify-between ${
              pack.highlighted ? 'border-[#1D4ED8]' : 'border-slate-200'
            }`}
          >
            <div>
              <p className="text-xs text-slate-500">{pack.intervalLabel}</p>
              <h3 className="font-display text-lg font-bold text-[#0F172A] mt-1">{pack.name}</h3>
              <p className="mt-3 font-mono text-3xl font-medium text-[#0F172A] tabular-nums">
                {formatEur(pack.priceEur)}
              </p>
              <p className="font-mono text-xs font-semibold text-[#1D4ED8] mt-1 tabular-nums">
                +{pack.credits.toLocaleString('pt-PT')} créditos
              </p>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">{pack.description}</p>
            </div>

            <button
              type="button"
              disabled={loadingPackId === pack.id}
              onClick={() => handleCheckout(pack.id)}
              className={`mt-6 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                pack.highlighted
                  ? 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                  : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200'
              }`}
            >
              {loadingPackId === pack.id ? 'A abrir Stripe...' : 'Pagar via Stripe'}
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {/* Integration API reference */}
      <div className="bg-[#0F172A] text-slate-200 rounded-xl p-6 border border-slate-800">
        <h3 className="font-display text-base font-bold text-white">
          Endpoints do Repositório para Apps Externas
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Ligue qualquer gerador de vídeo, imagem ou automação a estas rotas autenticadas no servidor.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-emerald-400">POST</span> /api/credits/issue
            <p className="text-slate-400 mt-1 font-sans">
              Emite créditos numa conta e grava movimento no registo.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-emerald-400">POST</span> /api/credits/consume
            <p className="text-slate-400 mt-1 font-sans">
              Deduz créditos com verificação atómica de saldo mínimo.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-emerald-400">POST</span> /api/vouchers/redeem
            <p className="text-slate-400 mt-1 font-sans">
              Valida código promocional e credita a conta destino.
            </p>
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-emerald-400">POST</span> /api/stripe/checkout-session
            <p className="text-slate-400 mt-1 font-sans">
              Gera sessão Stripe Checkout + webhook assinado.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
