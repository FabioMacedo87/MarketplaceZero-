import React from 'react';

interface TopBarProps {
  activeView: 'landing' | 'console';
  onNavigateView: (view: 'landing' | 'console') => void;
  onNavigateSection: (sectionId: string) => void;
  onStartSubscription: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onNavigateView,
  onNavigateSection,
  onStartSubscription,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA]/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#topo"
          onClick={(e) => {
            e.preventDefault();
            onNavigateView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8]"
        >
          PublicaFix
        </a>

        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => onNavigateSection('capacidades')}
            className="hover:text-[#0F172A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Capacidades
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('modernizador')}
            className="hover:text-[#0F172A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Modernizador
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('mensalidade')}
            className="hover:text-[#0F172A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Mensalidade
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('console')}
            className={`hover:text-[#0F172A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'console' ? 'text-[#1D4ED8] font-semibold' : ''
            }`}
          >
            Consola
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          {activeView === 'landing' ? (
            <button
              type="button"
              onClick={onStartSubscription}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
            >
              Começar Mensalidade
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateView('landing')}
              className="px-4 py-2 text-sm font-semibold text-[#0F172A] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
            >
              Ver Página Pública
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
