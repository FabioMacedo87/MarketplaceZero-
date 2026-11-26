import React, { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { PLANS, formatCurrency, getPlanPrice } from '../data/plans.ts';
import { BillingCycle, CurrencyCode, PlanId, type InvoiceRecord, type SubscriptionState } from '../types.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  initialPlanId: PlanId;
  initialCycle: BillingCycle;
  initialCurrency: CurrencyCode;
  currentSubscription: SubscriptionState;
  onClose: () => void;
  onSuccess: (subscription: SubscriptionState, invoice: InvoiceRecord) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  initialPlanId,
  initialCycle,
  initialCurrency,
  currentSubscription,
  onClose,
  onSuccess,
}) => {
  const [planId, setPlanId] = useState<PlanId>(initialPlanId);
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency);
  const [workspaceName, setWorkspaceName] = useState(currentSubscription.workspaceName);
  const [billingEmail, setBillingEmail] = useState(currentSubscription.billingEmail);
  const [taxId, setTaxId] = useState(currentSubscription.taxId);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPlanId(initialPlanId);
    setCycle(initialCycle);
    setCurrency(initialCurrency);
  }, [initialPlanId, initialCycle, initialCurrency, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedPlan = PLANS.find((p) => p.id === planId) ?? PLANS[1];
  const monthlyUnit = getPlanPrice(selectedPlan, cycle, currency);
  const subtotal = cycle === BillingCycle.ANNUAL ? monthlyUnit * 12 : monthlyUnit;
  const vatRate = currency === CurrencyCode.EUR ? 0.23 : 0;
  const vatAmount = Number((subtotal * vatRate).toFixed(2));
  const total = Number((subtotal + vatAmount).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (workspaceName.trim().length < 2) {
      setErrorMsg('Indique o nome da equipa ou empresa (mínimo 2 caracteres).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(billingEmail.trim())) {
      setErrorMsg('Introduza um endereço de email de faturação válido.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          cycle,
          currency,
          workspaceName: workspaceName.trim(),
          billingEmail: billingEmail.trim(),
          taxId: taxId.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || 'Não foi possível ativar a subscrição.');
        return;
      }
      onSuccess(data.subscription, data.invoice);
    } catch {
      setErrorMsg('O checkout ainda não está ligado a um processador de pagamentos. Não foi cobrado qualquer valor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="checkout-title" className="font-display text-lg font-bold text-[#0F172A]">
              Ativar Subscrição Mensal
            </h2>
            <p className="text-xs text-slate-500">
              O pagamento será processado num checkout seguro quando a integração estiver ativa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de subscrição"
            className="p-2 text-slate-500 hover:text-[#0F172A] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PLANS.map((plan) => {
              const price = getPlanPrice(plan, cycle, currency);
              const selected = plan.id === planId;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setPlanId(plan.id)}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    selected
                      ? 'border-[#1D4ED8] bg-[#1D4ED8]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#0F172A]">{plan.name}</p>
                  <p className="font-mono text-base font-medium text-[#0F172A] mt-1 tabular-nums">
                    {formatCurrency(price, currency)}
                    <span className="text-xs text-slate-500 font-sans">/mês</span>
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="checkout-workspace"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nome da Equipa ou Empresa
              </label>
              <input
                id="checkout-workspace"
                type="text"
                required
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Ex.: Lusitana Sistemas Lda"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label
                htmlFor="checkout-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Email de Faturação
              </label>
              <input
                id="checkout-email"
                type="email"
                required
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="faturacao@empresa.pt"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="checkout-taxid"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                NIF / NIPC / CNPJ (Opcional)
              </label>
              <input
                id="checkout-taxid"
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="PT509000000"
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
              O método de pagamento será escolhido no checkout seguro. Os dados do cartão não são recolhidos nesta aplicação.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Ciclo:</span>
              <button
                type="button"
                onClick={() =>
                  setCycle(cycle === BillingCycle.MONTHLY ? BillingCycle.ANNUAL : BillingCycle.MONTHLY)
                }
                className="font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
              >
                {cycle === BillingCycle.MONTHLY ? 'Mensal (mudar para Anual -20%)' : 'Anual -20% (mudar para Mensal)'}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Moeda:</span>
              <button
                type="button"
                onClick={() =>
                  setCurrency(currency === CurrencyCode.EUR ? CurrencyCode.BRL : CurrencyCode.EUR)
                }
                className="font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
              >
                {currency} (alternar para {currency === CurrencyCode.EUR ? 'BRL' : 'EUR'})
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>
                Plano {selectedPlan.name} ({cycle === BillingCycle.ANNUAL ? '12 meses' : '1 mês'})
              </span>
              <span className="font-mono tabular-nums">{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>{currency === CurrencyCode.EUR ? 'IVA (23%)' : 'Impostos incluídos'}</span>
              <span className="font-mono tabular-nums">{formatCurrency(vatAmount, currency)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-semibold text-[#0F172A]">
              <span>Total a faturar hoje</span>
              <span className="font-mono text-base tabular-nums">
                {formatCurrency(total, currency)}
              </span>
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="text-sm font-medium text-[#DC2626]">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              Renovação automática gerida na consola
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#0F172A] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {submitting ? 'A processar...' : 'Continuar para pagamento seguro'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
