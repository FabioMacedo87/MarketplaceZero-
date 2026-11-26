import React from 'react';

const plannedPlans = [
  {
    name: 'Essencial',
    price: '19 €',
    audience: 'Para utilização individual',
    features: ['Quota mensal de análises', 'Relatórios guardados', 'Histórico limitado'],
  },
  {
    name: 'Profissional',
    price: '49 €',
    audience: 'Para profissionais e pequenas equipas',
    features: ['Maior quota de análises', 'Histórico alargado', 'Exportação e organização por projeto'],
    highlighted: true,
  },
  {
    name: 'Empresarial',
    price: '149 €',
    audience: 'Para equipas e organizações',
    features: ['Gestão multiutilizador', 'Políticas e aprovações', 'Relatórios e controlos de equipa'],
  },
];

export const PricingSection: React.FC = () => (
  <section id="planos" className="py-16 lg:py-20 bg-white border-b border-slate-200">
    <div className="max-w-[1200px] mx-auto px-6">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold tracking-wide text-[#1D4ED8]">PLANOS EM PREPARAÇÃO</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] mt-2">
          O beta é gratuito. As subscrições ainda não estão à venda.
        </h2>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          Os valores abaixo são referências de preço em estudo, não ofertas disponíveis. Não existe checkout ativo, renovação automática ou cobrança nesta versão.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plannedPlans.map((plan) => (
          <article key={plan.name} className={'rounded-xl p-7 flex flex-col bg-[#FAFAFA] border ' + (plan.highlighted ? 'border-[#1D4ED8]' : 'border-slate-200')}>
            <p className="text-xs font-medium text-slate-500">{plan.audience}</p>
            <h3 className="font-display text-2xl font-bold text-[#0F172A] mt-2">{plan.name}</h3>
            <div className="mt-5 pb-5 border-b border-slate-200">
              <p className="font-display text-4xl font-bold text-[#0F172A]">{plan.price}<span className="text-sm font-normal text-slate-500"> / mês previsto</span></p>
              <p className="text-xs text-slate-500 mt-1">Preço indicativo, sujeito a validação.</p>
            </div>
            <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mt-5">Funcionalidades planeadas</p>
            <ul className="mt-3 space-y-2.5 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="text-sm text-slate-700 flex gap-2"><span aria-hidden="true" className="text-slate-400">•</span>{feature}</li>
              ))}
            </ul>
            <button type="button" disabled aria-disabled="true" className="mt-8 w-full py-2.5 px-4 text-sm font-semibold rounded-lg bg-slate-200 text-slate-500 cursor-not-allowed">
              Subscrições ainda não disponíveis
            </button>
          </article>
        ))}
      </div>
      <p className="mt-6 text-xs text-slate-500 leading-relaxed">
        Os limites, funcionalidades e preços finais serão publicados apenas depois de existirem autenticação, armazenamento persistente, controlo de quotas, integração Stripe testada e suporte real para cada plano.
      </p>
    </div>
  </section>
);
