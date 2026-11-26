import React from 'react';

interface TopBarProps {
  onNavigateSection: (sectionId: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onNavigateSection }) => (
  <header className="sticky top-0 z-40 bg-[#FAFAFA]/95 backdrop-blur-sm border-b border-slate-200">
    <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
      <button type="button" onClick={() => onNavigateSection('topo')} className="font-display text-lg font-bold tracking-tight text-[#0F172A]">PublicaFix</button>
      <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
        <button type="button" onClick={() => onNavigateSection('capacidades')} className="hover:text-[#0F172A]">O que faz</button>
        <button type="button" onClick={() => onNavigateSection('modernizador')} className="hover:text-[#0F172A]">Analisar script</button>
        <button type="button" onClick={() => onNavigateSection('planos')} className="hover:text-[#0F172A]">Planos futuros</button>
      </nav>
      <button type="button" onClick={() => onNavigateSection('modernizador')} className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors whitespace-nowrap">
        Experimentar grátis
      </button>
    </div>
  </header>
);
