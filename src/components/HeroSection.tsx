import React, { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface HeroSectionProps {
  onStartSubscription: () => void;
  onJumpToModernizer: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartSubscription,
  onJumpToModernizer,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <section id="topo" className="pt-12 pb-16 lg:pt-16 lg:pb-20 border-b border-slate-200 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 mb-4">
                Plataforma Comercial de Publicação · Portugal e Brasil
              </p>
              <h1
                className="font-display font-bold tracking-tight text-[#0F172A] text-balance leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
              >
                Transforme scripts manuais de correção numa plataforma com mensalidade.
              </h1>
              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-[60ch]">
                Substitua lançadores locais como{' '}
                <code className="font-mono text-sm text-[#0F172A] bg-slate-100 px-1.5 py-0.5 rounded">
                  INICIAR-CORRECAO.cmd
                </code>{' '}
                por validações prévias, assinatura SHA-256, snapshot automático e gestão completa de
                subscrições mensais num único painel operacional.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onStartSubscription}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                >
                  Ativar Subscrição Mensal
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onJumpToModernizer}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#0F172A] bg-slate-100 rounded-lg hover:bg-slate-200/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Analisar Script Atual
                </button>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 flex items-center gap-3 text-xs text-slate-500">
              <span>Compatível com Windows Batch (.cmd) e PowerShell (.ps1)</span>
              <span aria-hidden="true">·</span>
              <span>Faturação mensal em EUR e BRL</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] lg:min-h-[420px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
              {!imgError ? (
                <img
                  src="/src/assets/images/hero_release_workspace_1795713728387.jpg"
                  alt="Equipa de engenharia de software a operar consola de publicações em ambiente de estúdio"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full lg:h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <ShieldCheck className="w-10 h-10 text-[#1D4ED8] mb-3" />
                  <p className="font-display font-semibold text-[#0F172A]">
                    Consola de Publicação PublicaFix
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Validação automática, snapshot e reversão controlada.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-slate-200">
          <div>
            <p className="font-mono text-2xl font-medium text-[#0F172A] tabular-nums">&lt; 15 s</p>
            <p className="text-sm text-slate-600 mt-1">Validação pré-voo e hash SHA-256</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-medium text-[#0F172A] tabular-nums">6 / 6</p>
            <p className="text-sm text-slate-600 mt-1">Controlos de segurança em scripts</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-medium text-[#0F172A] tabular-nums">1 clique</p>
            <p className="text-sm text-slate-600 mt-1">Reversão para snapshot anterior</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-medium text-[#0F172A] tabular-nums">0 pausas</p>
            <p className="text-sm text-slate-600 mt-1">Execução não interativa em CI/CD</p>
          </div>
        </div>
      </div>
    </section>
  );
};
