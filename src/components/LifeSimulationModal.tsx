import React from 'react';
import { BookOpen, Briefcase, Coffee, Droplets, Heart, Home, Moon, ShoppingBasket, ShowerHead, Users, Wallet, X } from 'lucide-react';
import type { LifeAction, LifeJobId, LifeSimulationSnapshot } from '../game/types.ts';

interface LifeSimulationModalProps {
  open: boolean;
  life: LifeSimulationSnapshot;
  cash: number;
  onClose: () => void;
  onAction: (action: LifeAction) => void;
  onSelectJob: (job: LifeJobId) => void;
}

const JOBS: { id: LifeJobId; label: string; description: string }[] = [
  { id: 'barista', label: 'Empregado de café', description: 'Atendimento e restauração' },
  { id: 'retail', label: 'Comércio', description: 'Loja e atendimento ao público' },
  { id: 'courier', label: 'Estafeta', description: 'Entregas pela cidade' },
  { id: 'gardener', label: 'Jardinagem', description: 'Manutenção de espaços verdes' },
  { id: 'construction', label: 'Construção', description: 'Trabalhos de construção' },
];

const NEEDS: { key: 'energy' | 'hunger' | 'thirst' | 'hygiene' | 'mood'; label: string; color: string }[] = [
  { key: 'energy', label: 'Energia', color: 'bg-sky-400' },
  { key: 'hunger', label: 'Fome', color: 'bg-orange-400' },
  { key: 'thirst', label: 'Hidratação', color: 'bg-cyan-400' },
  { key: 'hygiene', label: 'Higiene', color: 'bg-emerald-400' },
  { key: 'mood', label: 'Bem-estar', color: 'bg-violet-400' },
];

function formatClock(minutes: number): string {
  const whole = Math.floor(minutes);
  const hours = Math.floor(whole / 60);
  const mins = whole % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export const LifeSimulationModal: React.FC<LifeSimulationModalProps> = ({
  open,
  life,
  cash,
  onClose,
  onAction,
  onSelectJob,
}) => {
  if (!open) return null;
  const currentJob = JOBS.find((job) => job.id === life.job) ?? JOBS[0];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="life-modal-title"
        className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0D1728] p-4 sm:p-6 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Portugal Life · Porto</p>
            <h2 id="life-modal-title" className="mt-1 text-xl sm:text-2xl font-bold text-white">A tua vida quotidiana</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">Dia {life.day} · {formatClock(life.minuteOfDay)} · Rotina, trabalho e gestão pessoal</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar painel de vida" className="min-h-10 min-w-10 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-slate-900 border border-white/10 p-3">
            <p className="text-[11px] text-slate-400">Carteira</p>
            <p className="text-lg font-bold text-emerald-300 tabular-nums">€{cash.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-white/10 p-3">
            <p className="text-[11px] text-slate-400">Banco</p>
            <p className="text-lg font-bold text-sky-300 tabular-nums">€{life.bankBalance.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-white/10 p-3 col-span-2 sm:col-span-1">
            <p className="text-[11px] text-slate-400">Profissão atual</p>
            <p className="text-sm font-bold text-white mt-1">{currentJob.label}</p>
            <p className="text-[10px] text-slate-500">Turnos concluídos: {life.jobExperience}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/70 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-white">Necessidades pessoais</h3>
            <span className="text-[10px] text-slate-500">Diminuem com o passar do tempo</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            {NEEDS.map((need) => (
              <div key={need.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{need.label}</span>
                  <span className="font-mono text-slate-400">{Math.round(life[need.key])}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-slate-700">
                  <div className={`h-full ${need.color} transition-all duration-300`} style={{ width: `${life[need.key]}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-[11px] text-slate-400">
            <span>Mantimentos: <strong className="text-white">{life.groceries}</strong></span>
            <span>Água: <strong className="text-white">{life.waterBottles}</strong></span>
            <span>Relações sociais: <strong className="text-white">{life.socialProgress}%</strong></span>
            <span>Estudo: <strong className="text-white">{life.studyProgress}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Home className="w-4 h-4 text-emerald-300" /> Casa e bem-estar</h3>
            <ActionButton icon={<Moon className="w-4 h-4" />} title="Dormir / descansar" subtitle="Avança o tempo e recupera energia" onClick={() => onAction('sleep')} />
            <ActionButton icon={<ShowerHead className="w-4 h-4" />} title="Tomar banho" subtitle="20 minutos · Recupera higiene" onClick={() => onAction('shower')} />
            <ActionButton icon={<Coffee className="w-4 h-4" />} title="Cozinhar em casa" subtitle="Usa mantimentos · Recupera fome" disabled={life.groceries < 1} onClick={() => onAction('cook')} />
            <ActionButton icon={<Droplets className="w-4 h-4" />} title="Beber água" subtitle="Usa uma garrafa · Recupera hidratação" disabled={life.waterBottles < 1} onClick={() => onAction('drink')} />
            <ActionButton icon={<ShoppingBasket className="w-4 h-4" />} title="Comprar mantimentos" subtitle="18 € · 4 refeições e 6 garrafas de água" onClick={() => onAction('buy_supplies')} />
            <ActionButton icon={<Coffee className="w-4 h-4" />} title="Comer fora" subtitle="7,50 € · Refeição e bem-estar" onClick={() => onAction('eat_out')} />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Briefcase className="w-4 h-4 text-amber-300" /> Trabalho e desenvolvimento</h3>
            <label htmlFor="life-job" className="block text-xs text-slate-400">Escolher atividade profissional</label>
            <select id="life-job" value={life.job} onChange={(event) => onSelectJob(event.target.value as LifeJobId)} className="w-full rounded-lg bg-slate-800 border border-white/15 px-3 py-2.5 text-sm text-white">
              {JOBS.map((job) => <option key={job.id} value={job.id}>{job.label} — {job.description}</option>)}
            </select>
            <ActionButton icon={<Briefcase className="w-4 h-4" />} title="Fazer turno de trabalho" subtitle="4 horas · Salário depositado no banco" disabled={life.energy < 25} onClick={() => onAction('work_shift')} />
            <ActionButton icon={<Users className="w-4 h-4" />} title="Socializar" subtitle="30 minutos · Melhora o bem-estar" onClick={() => onAction('socialise')} />
            <ActionButton icon={<BookOpen className="w-4 h-4" />} title="Estudar / aprender" subtitle="1 hora · Desenvolve competências" disabled={life.energy < 15} onClick={() => onAction('study')} />
            <ActionButton icon={<Wallet className="w-4 h-4" />} title="Levantar 50 €" subtitle="Transferência do banco para a carteira" disabled={life.bankBalance < 50} onClick={() => onAction('withdraw_50')} />
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 mt-3">
              <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold"><Heart className="w-4 h-4" /> Objetivo</div>
              <p className="text-xs leading-relaxed text-slate-300 mt-1">Constrói uma rotina sustentável: trabalha, cuida de ti, aprende e mantém relações na cidade.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

function ActionButton({
  icon,
  title,
  subtitle,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-white">{title}</span>
        <span className="block text-[10px] text-slate-400 mt-0.5">{subtitle}</span>
      </span>
    </button>
  );
}
