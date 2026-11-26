import React from 'react';

export type RepoSection = 'contas' | 'emissao' | 'vouchers' | 'stripe' | 'registo';

interface CreditTopBarProps {
  activeSection: RepoSection;
  onSelectSection: (section: RepoSection) => void;
  onQuickIssue: () => void;
}

export const CreditTopBar: React.FC<CreditTopBarProps> = ({
  activeSection,
  onSelectSection,
  onQuickIssue,
}) => {
  const navItems: { id: RepoSection; label: string }[] = [
    { id: 'contas', label: 'Contas' },
    { id: 'emissao', label: 'Emitir Créditos' },
    { id: 'vouchers', label: 'Vouchers' },
    { id: 'stripe', label: 'Pacotes Stripe' },
    { id: 'registo', label: 'Registo' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#topo"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('contas');
          }}
          className="font-display text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0"
        >
          CréditoHub
        </a>

        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`hover:text-[#0F172A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === item.id ? 'text-[#1D4ED8] font-semibold' : ''
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onQuickIssue}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            Gerar Créditos
          </button>
        </div>
      </div>
    </header>
  );
};
