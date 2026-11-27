import React from 'react';
import { BookOpen, Briefcase, Coffee, DoorOpen, Droplets, Heart, Home, Moon, ShoppingBasket, ShowerHead, Users, Wallet, X } from 'lucide-react';
import type { LifeAction, LifeJobId, LifeLocation, LifeSimulationSnapshot } from '../game/types.ts';
import { getLifeMealPrice, getLifeShiftPay, getLifeSupplyPrice, getRequiredWorkplace } from '../game/lifeSimulation.ts';
import { LIFE_LOCATIONS } from '../game/world.ts';

interface LifeSimulationModalProps {
  open: boolean;
  life: LifeSimulationSnapshot;
  cash: number;
  location: LifeLocation | null;
  onClose: () => void;
  onAction: (action: LifeAction) => void;
  onTalkToNpc: () => void;
  onEnterInterior: () => void;
  onSelectJob: (job: LifeJobId) => void;
  onAcceptContract: (contractId: string) => void;
  onCancelContract: () => void;
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

function formatMoney(value: number): string {
  return value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function demandLabel(value: number): string {
  if (value >= 70) return 'Procura elevada';
  if (value >= 45) return 'Procura estável';
  return 'Procura reduzida';
}

function relationshipLabel(value: number): string {
  if (value >= 80) return 'Confiança';
  if (value >= 50) return 'Amizade';
  if (value >= 20) return 'Conhecido';
  return 'Por conhecer';
}

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
  location,
  onClose,
  onAction,
  onTalkToNpc,
  onEnterInterior,
  onSelectJob,
  onAcceptContract,
  onCancelContract,
}) => {
  if (!open) return null;
  const currentJob = JOBS.find((job) => job.id === life.job) ?? JOBS[0];
  const atHome = location?.kind === 'home';
  const atCafe = location?.kind === 'cafe';
  const atMarket = location?.kind === 'market';
  const canWorkHere = location?.kind === getRequiredWorkplace(life.job);
  const workplaceNames = {
    cafe: 'Café da Ribeira',
    market: 'Mercado do Bolhão',
    depot: 'Ponto Logístico de Gaia',
    garden: 'Jardim da Cordoaria',
    construction: 'Estaleiro da Boavista',
    home: 'Apartamento do Porto',
  } as const;
  const requiredWorkplace = workplaceNames[getRequiredWorkplace(life.job)];

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
            <p className={location ? "mt-2 inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200" : "mt-2 inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-400"}>
              {location ? "Local atual: " + location.label : "Consulta de estado · sem local de atividade"}
            </p>
            {location && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onTalkToNpc}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/20"
                >
                  <Users className="h-3.5 w-3.5" />
                  Conversar com {location.npcName}
                </button>
                <button
                  type="button"
                  onClick={onEnterInterior}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-sky-400/35 bg-sky-400/10 px-3 text-xs font-semibold text-sky-100 hover:bg-sky-400/20"
                >
                  <DoorOpen className="h-3.5 w-3.5" />
                  Entrar e explorar interior 3D
                </button>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar painel de vida" className="min-h-10 min-w-10 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-slate-900 border border-white/10 p-3">
            <p className="text-[11px] text-slate-400">Carteira</p>
            <p className="text-lg font-bold text-emerald-300 tabular-nums">{cash.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-white/10 p-3">
            <p className="text-[11px] text-slate-400">Banco</p>
            <p className="text-lg font-bold text-sky-300 tabular-nums">{life.bankBalance.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</p>
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

        <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Heart className="h-4 w-4 text-violet-300" /> Relações na cidade</h3>
            <span className="text-[10px] text-slate-400">Memória das conversas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LIFE_LOCATIONS.map((resident) => {
              const score = Math.round(life.npcRelationships?.[resident.id] ?? 0);
              const memories = life.npcMemories?.[resident.id] ?? [];
              const last = memories[memories.length - 1];
              const topic = last === 'work-opportunities' ? 'Última conversa: oportunidades de trabalho'
                : last === 'local-recommendations' ? 'Última conversa: recomendações locais'
                  : last === 'friendly-chat' ? 'Última conversa: convívio e vizinhança'
                    : last === 'conflict' ? 'Última conversa: houve um conflito'
                      : last === 'reconciliation' ? 'Última conversa: mal-entendido resolvido'
                        : 'Ainda não conversaram';
              return (
                <div key={resident.id} className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{resident.npcName}</span>
                    <span className="text-[10px] font-mono text-violet-200">{relationshipLabel(score)} · {score}/100</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-violet-400" style={{ width: `${score}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">{topic}</p>
                  <p className="mt-2 text-[10px] text-slate-300">Personalidade: {resident.npcPersonality ?? 'Por descobrir'}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Objetivo: {resident.npcAmbition ?? 'Ainda não partilhado'}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Briefcase className="h-4 w-4 text-emerald-300" /> Economia local e contratos</h3>
            <span className="text-[10px] text-slate-400">{life.completedLifeContracts ?? 0} contratos concluídos</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">A procura altera os preços, os salários e as oportunidades. As tendências ajustam-se ao longo dos dias.</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LIFE_LOCATIONS.map((market) => {
              const demand = Math.round(life.cityDemand?.[market.kind] ?? 50);
              return (
                <div key={market.id} className="rounded-lg border border-white/10 bg-slate-950/60 p-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-semibold text-white">{market.label}</span>
                    <span className="text-[10px] font-mono text-emerald-200">{demand}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${demand}%` }} />
                  </div>
                  <p className="mt-1 text-[9px] text-slate-400">{demandLabel(demand)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-white">Quadro de oportunidades</h4>
              <p className="text-[10px] text-slate-400">Aceita um contrato compatível com a tua atividade e termina um turno no local indicado.</p>
            </div>
            {life.activeLifeContractId && (
              <button type="button" onClick={onCancelContract} className="min-h-8 rounded-lg border border-rose-400/30 px-3 text-[10px] font-semibold text-rose-200 hover:bg-rose-400/10">Cancelar contrato ativo</button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(life.lifeContracts ?? []).map((contract) => {
              const contractJob = JOBS.find((job) => job.id === contract.job) ?? JOBS[0];
              const workplace = LIFE_LOCATIONS.find((item) => item.kind === contract.workplace);
              const isActive = life.activeLifeContractId === contract.id;
              const isExpired = contract.expiresOnDay < life.day;
              const isJobMatch = life.job === contract.job;
              const lockedByOther = Boolean(life.activeLifeContractId && !isActive);
              return (
                <div key={contract.id} className={`rounded-lg border p-3 ${isActive ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-white/10 bg-slate-950/60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{contract.title}</span>
                    <span className="shrink-0 text-xs font-bold text-emerald-200">{formatMoney(contract.reward)}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-300">{contract.description}</p>
                  <p className="mt-2 text-[10px] text-slate-400">Profissão: {contractJob.label} · Local: {workplace?.label ?? contract.workplace}</p>
                  <p className="mt-1 text-[10px] text-slate-500">Prazo: até ao dia {contract.expiresOnDay}</p>
                  {isActive ? (
                    <p className="mt-2 text-[10px] font-semibold text-emerald-200">Contrato aceite · conclui um turno no local indicado</p>
                  ) : (
                    <button
                      type="button"
                      disabled={isExpired || lockedByOther || !isJobMatch}
                      onClick={() => onAcceptContract(contract.id)}
                      className="mt-3 min-h-9 w-full rounded-lg bg-emerald-300 px-3 text-[11px] font-bold text-slate-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isExpired ? 'Contrato expirado' : lockedByOther ? 'Já tens um contrato ativo' : !isJobMatch ? 'Seleciona esta profissão' : 'Aceitar contrato'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Home className="w-4 h-4 text-emerald-300" /> Casa e bem-estar</h3>
            <ActionButton icon={<Moon className="w-4 h-4" />} title="Dormir / descansar" subtitle={atHome ? 'Avança o tempo e recupera energia' : 'Disponível no Apartamento do Porto'} disabled={!atHome} onClick={() => onAction('sleep')} />
            <ActionButton icon={<ShowerHead className="w-4 h-4" />} title="Tomar banho" subtitle={atHome ? '20 minutos · Recupera higiene' : 'Disponível no Apartamento do Porto'} disabled={!atHome} onClick={() => onAction('shower')} />
            <ActionButton icon={<Coffee className="w-4 h-4" />} title="Cozinhar em casa" subtitle={atHome ? 'Usa mantimentos · Recupera fome' : 'Disponível no Apartamento do Porto'} disabled={!atHome || life.groceries < 1} onClick={() => onAction('cook')} />
            <ActionButton icon={<Droplets className="w-4 h-4" />} title="Beber água" subtitle="Usa uma garrafa · Recupera hidratação" disabled={life.waterBottles < 1} onClick={() => onAction('drink')} />
            <ActionButton icon={<ShoppingBasket className="w-4 h-4" />} title="Comprar mantimentos" subtitle={atMarket ? formatMoney(getLifeSupplyPrice(life)) + ' · 4 refeições e 6 garrafas de água' : 'Preço atual: ' + formatMoney(getLifeSupplyPrice(life)) + ' · Disponível no Mercado do Bolhão'} disabled={!atMarket} onClick={() => onAction('buy_supplies')} />
            <ActionButton icon={<Coffee className="w-4 h-4" />} title="Comer fora" subtitle={atCafe ? formatMoney(getLifeMealPrice(life)) + ' · Refeição e bem-estar' : 'Preço atual: ' + formatMoney(getLifeMealPrice(life)) + ' · Disponível no Café da Ribeira'} disabled={!atCafe} onClick={() => onAction('eat_out')} />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Briefcase className="w-4 h-4 text-amber-300" /> Trabalho e desenvolvimento</h3>
            <label htmlFor="life-job" className="block text-xs text-slate-400">Escolher atividade profissional</label>
            <select id="life-job" value={life.job} onChange={(event) => onSelectJob(event.target.value as LifeJobId)} className="w-full rounded-lg bg-slate-800 border border-white/15 px-3 py-2.5 text-sm text-white">
              {JOBS.map((job) => <option key={job.id} value={job.id}>{job.label} — {job.description}</option>)}
            </select>
            <ActionButton icon={<Briefcase className="w-4 h-4" />} title="Fazer turno de trabalho" subtitle={canWorkHere ? '4 horas · ' + formatMoney(getLifeShiftPay(life)) + ' para o banco, ajustados à procura' : 'Trabalho disponível em ' + requiredWorkplace} disabled={!canWorkHere || life.energy < 25} onClick={() => onAction('work_shift')} />
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
