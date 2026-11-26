import React from 'react';

interface FooterProps {
  onNavigateSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateSection }) => (
  <footer className="bg-white border-t border-slate-200 py-10">
    <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <div>
        <p className="font-display text-base font-bold text-[#0F172A]">PublicaFix</p>
        <p className="text-xs text-slate-500 mt-1">Análise estática de scripts · 2026</p>
        <p className="text-xs text-slate-500 mt-1">Não executa nem publica scripts. A cobrança depende da ativação dos planos.</p>
      </div>
      <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
        <button type="button" onClick={() => onNavigateSection('capacidades')} className="hover:text-[#0F172A]">O que faz</button>
        <button type="button" onClick={() => onNavigateSection('modernizador')} className="hover:text-[#0F172A]">Analisar script</button>
        <button type="button" onClick={() => onNavigateSection('planos')} className="hover:text-[#0F172A]">Planos futuros</button>
      </div>
    </div>
  </footer>
);
