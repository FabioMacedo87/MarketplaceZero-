import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface HeroSectionProps {
  onJumpToModernizer: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onJumpToModernizer }) => (
  <section id="topo" className="pt-12 pb-16 lg:pt-16 lg:pb-20 border-b border-slate-200 bg-white">
    <div className="max-w-[1200px] mx-auto px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <div className="lg:col-span-6">
          <p className="text-xs font-semibold tracking-wide text-[#1D4ED8] mb-4">BETA GRATUITO · ANÁLISE ESTÁTICA DE SCRIPTS</p>
          <h1 className="font-display font-bold tracking-tight text-[#0F172A] text-balance leading-[1.08]" style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}>
            Analisa os teus scripts antes de os executares.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-[60ch]">
            Carrega um ficheiro Windows Batch (.cmd/.bat) ou PowerShell (.ps1). O PublicaFix procura padrões de risco, apresenta recomendações e permite descarregar um relatório.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button type="button" onClick={onJumpToModernizer} className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors">
              Analisar ficheiro grátis <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Não executa os ficheiros
            </span>
          </div>
          <p className="mt-6 text-xs text-slate-500 max-w-[62ch]">
            Nesta versão beta, o conteúdo é analisado como texto. Não é guardado numa conta, não é executado e não é publicado em servidores do cliente.
          </p>
        </div>
        <div className="lg:col-span-6">
          <div className="min-h-[300px] lg:min-h-[400px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
            <img src="/src/assets/images/hero_release_workspace_1795713728387.jpg" alt="Ambiente de trabalho de engenharia de software" className="w-full h-full min-h-[300px] lg:min-h-[400px] object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <div className="absolute left-4 bottom-4 rounded-lg bg-white/95 border border-slate-200 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-[#0F172A]">PublicaFix · Auditor estático</p>
              <p className="text-xs text-slate-500 mt-1">CMD · BAT · PowerShell</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-200">
        <div className="bg-[#FAFAFA] rounded-lg p-4">
          <p className="font-semibold text-[#0F172A]">9 verificações heurísticas</p>
          <p className="text-sm text-slate-600 mt-1">Padrões comuns de risco e robustez.</p>
        </div>
        <div className="bg-[#FAFAFA] rounded-lg p-4">
          <p className="font-semibold text-[#0F172A]">Até 32 KB por ficheiro</p>
          <p className="text-sm text-slate-600 mt-1">Para análise de .cmd, .bat e .ps1.</p>
        </div>
        <div className="bg-[#FAFAFA] rounded-lg p-4">
          <p className="font-semibold text-[#0F172A]">Relatório descarregável</p>
          <p className="text-sm text-slate-600 mt-1">Com achados, contexto e recomendações.</p>
        </div>
      </div>
    </div>
  </section>
);
