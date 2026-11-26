import React from 'react';
import { FileSearch, FileText, ShieldCheck } from 'lucide-react';

const capabilities = [
  {
    icon: FileSearch,
    title: 'Análise estática',
    text: 'Procura parâmetros permissivos, pausas interativas, padrões de tratamento de erros, ausência de pré-verificações e comandos potencialmente destrutivos.',
  },
  {
    icon: ShieldCheck,
    title: 'Recomendações explicadas',
    text: 'Cada achado inclui gravidade, referência à linha quando possível, explicação do risco e uma ação sugerida para revisão humana.',
  },
  {
    icon: FileText,
    title: 'Relatório exportável',
    text: 'Descarrega um relatório de texto para guardar, partilhar com a equipa ou usar numa revisão técnica.',
  },
];

export const CapabilitiesSection: React.FC = () => (
  <section id="capacidades" className="py-16 lg:py-20 bg-[#FAFAFA] border-b border-slate-200">
    <div className="max-w-[1200px] mx-auto px-6">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">O que o PublicaFix faz nesta versão</h2>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          O beta entrega uma tarefa concreta: uma primeira revisão estática do conteúdo de scripts Windows, sem os executar.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {capabilities.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="bg-white border border-slate-200 rounded-xl p-7">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#1D4ED8]" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#0F172A] mt-5">{item.title}</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">{item.text}</p>
            </article>
          );
        })}
      </div>
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-900">Limites importantes</p>
        <p className="mt-1.5 text-sm text-amber-900/90 leading-relaxed">
          Uma análise heurística não garante que um script é seguro, não substitui uma auditoria profissional e pode produzir falsos positivos ou não detetar problemas. Revê sempre o código e testa-o num ambiente isolado. O PublicaFix não executa, não assina, não publica nem reverte scripts nesta versão.
        </p>
      </div>
    </div>
  </section>
);
