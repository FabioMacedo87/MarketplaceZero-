import React from 'react';

type PlanKey = 'essencial' | 'profissional' | 'empresarial';

const plans: Array<{
  key: PlanKey;
  name: string;
  audience: string;
  status: string;
  highlighted?: boolean;
}> = [
  {
    key: 'essencial',
    name: 'Essencial',
    audience: 'Para utilização individual',
    status: '50 análises estáticas por mês · ficheiros até 32 KB · relatórios descarregáveis',
  },
  {
    key: 'profissional',
    name: 'Profissional',
    audience: 'Para utilização profissional regular',
    status: '250 análises estáticas por mês · ficheiros até 32 KB · relatórios descarregáveis',
    highlighted: true,
  },
  {
    key: 'empresarial',
    name: 'Empresarial',
    audience: 'Para volumes elevados de análise',
    status: '1.000 análises estáticas por mês · ficheiros até 32 KB · relatórios descarregáveis',
  },
];

interface PricingSectionProps {
  billingReady: boolean;
  prices: Partial<Record<PlanKey, number>>;
  onSubscribe: (plan: PlanKey) => void;
}

const formatMonthlyPrice = (amount: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(amount / 100) + ' / mês';

export const PricingSection: React.FC<PricingSectionProps> = ({ billingReady, prices, onSubscribe }) => (
  <section id="planos" className="py-16 lg:py-20 bg-white border-b border-slate-200">
    <div className="max-w-[1200px] mx-auto px-6">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-wide text-[#1D4ED8]">SUBSCRIÇÕES MENSAIS</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] mt-2">
          Planos para diferentes níveis de utilização.
        </h2>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          Analisa scripts Windows Batch e PowerShell, recebe recomendações técnicas e descarrega relatórios. O PublicaFix não executa nem publica os scripts.
        </p>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          A conta gratuita inclui 5 análises por mês. Os planos pagos aumentam o limite mensal; cada ficheiro pode ter até 32 KB.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => {
          const amount = prices[plan.key];
          const canSubscribe = billingReady && typeof amount === 'number' && amount > 0;
          return (
            <article key={plan.key} className={'rounded-xl p-7 flex flex-col bg-[#FAFAFA] border ' + (plan.highlighted ? 'border-[#1D4ED8]' : 'border-slate-200')}>
              <p className="text-xs font-medium text-slate-500">{plan.audience}</p>
              <h3 className="font-display text-2xl font-bold text-[#0F172A] mt-2">{plan.name}</h3>
              <div className="mt-5 pb-5 border-b border-slate-200">
                <p className="font-display text-2xl font-bold text-[#0F172A]">
                  {canSubscribe ? formatMonthlyPrice(amount) : 'Preço em preparação'}
                </p>
              </div>
              <p className="text-sm text-slate-600 mt-5 flex-1">{plan.status}</p>
              <button
                type="button"
                disabled={!canSubscribe}
                onClick={() => onSubscribe(plan.key)}
                className={'mt-8 w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors ' + (canSubscribe ? 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]' : 'bg-slate-200 text-slate-500 cursor-not-allowed')}
              >
                {canSubscribe ? 'Subscrever com Stripe' : 'Subscrições em preparação'}
              </button>
            </article>
          );
        })}
      </div>

      {!billingReady && (
        <p className="mt-6 text-sm text-slate-500 leading-relaxed">
          A venda só será ativada depois de os preços, limites, funcionalidades incluídas, faturação e configuração de produção estarem confirmados.
        </p>
      )}
    </div>
  </section>
);
