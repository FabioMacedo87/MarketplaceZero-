import React from 'react';

interface FooterProps {
  onNavigateView: (view: 'landing' | 'console') => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateView, onNavigateSection }) => {
  return (
    <footer className="bg-white border-t border-slate-200 py-10">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <p className="font-display text-base font-bold text-[#0F172A]">PublicaFix</p>
          <p className="text-xs text-slate-500 mt-1">
            © 2026 PublicaFix · Gestão de Correções e Subscrições Empresariais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigateSection('capacidades')}
            className="hover:text-[#0F172A] cursor-pointer"
          >
            Capacidades
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('modernizador')}
            className="hover:text-[#0F172A] cursor-pointer"
          >
            Modernizador
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('mensalidade')}
            className="hover:text-[#0F172A] cursor-pointer"
          >
            Mensalidade
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('console')}
            className="hover:text-[#0F172A] cursor-pointer"
          >
            Consola do Cliente
          </button>
        </div>
      </div>
    </footer>
  );
};
