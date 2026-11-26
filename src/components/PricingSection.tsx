import React from 'react';
import { Check } from 'lucide-react';
import { COMPARISON_ROWS, PLANS, formatCurrency, getPlanPrice } from '../data/plans.ts';
import { BillingCycle, CurrencyCode, PlanId } from '../types.ts';

interface PricingSectionProps {
  cycle: BillingCycle;
  currency: CurrencyCode;
  activePlanId: PlanId | null;
  onChangeCycle: (cycle: BillingCycle) => void;
  onChangeCurrency: (currency: CurrencyCode) => void;
  onSelectPlan: (planId: PlanId) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  cycle,
  currency,
  activePlanId,
  onChangeCycle,
  onChangeCurrency,
  onSelectPlan,
}) => {
  return (
    <section id="mensalidade" className="py-16 lg:py-20 bg-[#FAFAFA] border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] text-balance">
              Planos de mensalidade transparentes e sem taxas ocultas
            </h2>
            <p className="mt-2.5 text-base text-slate-600">
              Comece com o plano adequado ao volume de correções da sua equipa. Altere ou cancele
              a renovação mensal a qualquer momento diretamente na consola.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div
              role="group"
              aria-label="Periodicidade de faturação"
              className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
            >
              <button
                type="button"
                onClick={() => onChangeCycle(BillingCycle.MONTHLY)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  cycle === BillingCycle.MONTHLY
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => onChangeCycle(BillingCycle.ANNUAL)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  cycle === BillingCycle.ANNUAL
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                Anual (-20%)
              </button>
            </div>

            <div
              role="group"
              aria-label="Moeda de faturação"
              className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
            >
              <button
                type="button"
                onClick={() => onChangeCurrency(CurrencyCode.EUR)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currency === CurrencyCode.EUR
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                EUR (€)
              </button>
              <button
                type="button"
                onClick={() => onChangeCurrency(CurrencyCode.BRL)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currency === CurrencyCode.BRL
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                BRL (R$)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => {
            const unitPrice = getPlanPrice(plan, cycle, currency);
            const isCurrent = activePlanId === plan.id;
            const isHighlighted = Boolean(plan.highlighted);

            return (
              <div
                key={plan.id}
                className={`rounded-xl p-7 flex flex-col justify-between bg-white border ${
                  isHighlighted ? 'border-[#1D4ED8]' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{plan.audience}</span>
                    {isHighlighted && (
                      <span className="font-semibold text-[#1D4ED8]">Recomendado</span>
                    )}
                  </div>

                  <h3 className="font-display text-2xl font-bold text-[#0F172A] mt-2">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{plan.summary}</p>

                  <div className="mt-6 pb-6 border-b border-slate-200">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-4xl font-bold text-[#0F172A] tabular-nums">
                        {formatCurrency(unitPrice, currency)}
                      </span>
                      <span className="text-sm text-slate-500">/ mês</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 tabular-nums">
                      {cycle === BillingCycle.ANNUAL
                        ? `Faturado anualmente (${formatCurrency(unitPrice * 12, currency)} / ano)`
                        : 'Faturação mensal sem fidelização'}
                    </p>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <Check
                          className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlan(plan.id)}
                  className={`mt-8 w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
                    isHighlighted
                      ? 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                      : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200/80'
                  }`}
                >
                  {isCurrent ? `Gerir Plano ${plan.name}` : `Subscrever ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Comparison matrix with concrete numeric limits */}
        <div className="mt-12 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-display text-base font-semibold text-[#0F172A]">
              Comparação Técnica de Quotas e Limites
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Capacidade</th>
                  <th className="py-3 px-6">Essencial</th>
                  <th className="py-3 px-6 text-[#1D4ED8]">Profissional</th>
                  <th className="py-3 px-6">Empresarial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-50/70">
                    <td className="py-3 px-6 font-medium text-[#0F172A]">{row.label}</td>
                    <td className="py-3 px-6 text-slate-600 tabular-nums">{row.essencial}</td>
                    <td className="py-3 px-6 text-[#0F172A] font-medium tabular-nums">
                      {row.profissional}
                    </td>
                    <td className="py-3 px-6 text-slate-600 tabular-nums">{row.empresarial}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
