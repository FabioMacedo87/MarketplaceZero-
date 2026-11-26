import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import type { ActiveLandmarkActivity } from '../game/types.ts';

interface ActivityModalProps {
  activity: ActiveLandmarkActivity | null;
  onChooseOption: (index: number) => void;
  onComplete: (
    performanceMul: number,
    pspDecision?: { action: 'clear' | 'warn' | 'fine'; amount: number },
  ) => void;
  onCancel: () => void;
}

const LEDGER_PAIRS = [
  { id: 'A', left: 'Guia #PT-204 · Carga Douro', right: 'Taxa 6% · Património' },
  { id: 'B', left: 'Alvará #OP-819 · Baixa', right: 'Selo Municipal Aprovado' },
  { id: 'C', left: 'Rota #GV-512 · Ponte D. Luís', right: 'Trânsito Ligeiro Autorizado' },
];

export const ActivityModal: React.FC<ActivityModalProps> = ({
  activity,
  onChooseOption,
  onComplete,
  onCancel,
}) => {
  // Timing bar state for cargo_seal & medical_triage
  const [cursor, setCursor] = useState(15);
  const [hits, setHits] = useState(0);
  const [perfectHits, setPerfectHits] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Matching state for ledger_trade
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);

  // Reset mini-game state when activity changes
  useEffect(() => {
    setCursor(18);
    setHits(0);
    setPerfectHits(0);
    setFeedback(null);
    setSelectedLeft(null);
    setMatchedIds([]);
  }, [activity?.id, activity?.phase]);

  // Smooth RAF cursor oscillation for timing mini-games
  useEffect(() => {
    if (
      !activity ||
      activity.phase !== 'minigame' ||
      (activity.miniGameKind !== 'cargo_seal' && activity.miniGameKind !== 'medical_triage')
    ) {
      return;
    }

    let raf = 0;
    const speed = activity.miniGameKind === 'medical_triage' ? 2.6 : 2.15;
    const start = performance.now();

    const tick = (now: number) => {
      const t = ((now - start) * 0.001) * speed;
      const val = 50 + Math.sin(t) * 46;
      setCursor(val);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activity]);

  if (!activity) return null;

  const handleTimingStrike = () => {
    const inGreen = cursor >= 36 && cursor <= 64;
    const inBullseye = cursor >= 44 && cursor <= 56;
    if (inGreen) {
      const nextHits = hits + 1;
      const nextPerfect = perfectHits + (inBullseye ? 1 : 0);
      setHits(nextHits);
      setPerfectHits(nextPerfect);
      setFeedback(inBullseye ? 'Precisão exemplar!' : 'Registo validado!');
      if (nextHits >= 3) {
        const mul = 1.0 + nextPerfect * 0.12;
        onComplete(mul);
      }
    } else {
      setFeedback('Fora da zona verde — tente no centro!');
    }
  };

  const handleMatchRight = (pairId: string) => {
    if (!selectedLeft) {
      setFeedback('Selecione primeiro um documento da coluna esquerda.');
      return;
    }
    if (selectedLeft === pairId) {
      const next = [...matchedIds, pairId];
      setMatchedIds(next);
      setSelectedLeft(null);
      setFeedback('Registo conferido!');
      if (next.length >= LEDGER_PAIRS.length) {
        onComplete(1.25);
      }
    } else {
      setFeedback('Não corresponde! Verifique o código do documento.');
    }
  };

  const renderIcon = () => {
    if (activity.miniGameKind === 'cargo_seal') {
      return <PackageCheck className="w-5 h-5 text-amber-400" aria-hidden="true" />;
    }
    if (activity.miniGameKind === 'ledger_trade') {
      return <ClipboardCheck className="w-5 h-5 text-violet-400" aria-hidden="true" />;
    }
    if (activity.miniGameKind === 'medical_triage') {
      return <Activity className="w-5 h-5 text-rose-400" aria-hidden="true" />;
    }
    return <ShieldAlert className="w-5 h-5 text-sky-400" aria-hidden="true" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-white/15 rounded-2xl w-full max-w-xl p-5 sm:p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-slate-950 shrink-0"
              style={{ backgroundColor: activity.npcColor }}
            >
              {activity.npcName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-300 truncate">
                {activity.buildingName}
              </p>
              <h2 className="font-display text-lg font-bold text-white truncate">
                {activity.npcName}{' '}
                <span className="text-xs font-normal text-slate-400">· {activity.npcRole}</span>
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar atividade"
            className="min-h-[40px] min-w-[40px] rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Phase 1: Interactive NPC Dialogue */}
        {activity.phase === 'dialogue' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
              <p className="text-sm sm:text-base text-slate-100 leading-relaxed">
                “{activity.greeting}”
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-400">Escolha a sua abordagem:</p>
              {activity.options.map((opt, idx) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onChooseOption(idx)}
                  className="w-full p-3.5 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/15 hover:border-amber-400/60 text-left transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <span className="text-sm font-medium text-white">{opt.label}</span>
                  <span className="font-mono text-xs text-emerald-400 shrink-0 tabular-nums">
                    +€{opt.cashBonus} · +{opt.repBonus} Rep
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase 2: Playable Profession Mini-Game */}
        {activity.phase === 'minigame' && (
          <div className="space-y-4">
            {activity.selectedOptionReply && (
              <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-xs text-emerald-200">
                <span className="font-semibold">{activity.npcName}:</span> “
                {activity.selectedOptionReply}”
              </div>
            )}

            <div className="flex items-center gap-2.5">
              {renderIcon()}
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  {activity.miniGameTitle}
                </h3>
                <p className="text-xs text-slate-400">{activity.miniGameSubtitle}</p>
              </div>
            </div>

            {/* Mini-game 1 & 3: Precision Timing Bar */}
            {(activity.miniGameKind === 'cargo_seal' ||
              activity.miniGameKind === 'medical_triage') && (
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-slate-300">
                    {activity.miniGameKind === 'medical_triage' ? 'Ciclos clínicos' : 'Selos aplicados'}:{' '}
                    <strong className="text-emerald-400">{hits}/3</strong>
                  </span>
                  {feedback && <span className="text-amber-300">{feedback}</span>}
                </div>

                <div className="relative h-8 bg-slate-800 rounded-lg border border-white/10 overflow-hidden">
                  {/* Target green zone 36%..64% */}
                  <div
                    className="absolute inset-y-0 bg-emerald-500/30 border-x border-emerald-400/70"
                    style={{ left: '36%', width: '28%' }}
                  />
                  {/* Bullseye marker */}
                  <div
                    className="absolute inset-y-0 bg-emerald-400/40"
                    style={{ left: '47%', width: '6%' }}
                  />
                  {/* Moving cursor */}
                  <div
                    className="absolute top-0.5 bottom-0.5 w-2 rounded bg-white shadow"
                    style={{ left: `calc(${cursor}% - 4px)` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTimingStrike}
                  className="w-full min-h-[48px] py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                >
                  {activity.miniGameKind === 'medical_triage'
                    ? 'Estabilizar Sinais Vitais'
                    : 'Selar Caixa Agora'}
                </button>
              </div>
            )}

            {/* Mini-game 2: Invoice / Ledger Matching */}
            {activity.miniGameKind === 'ledger_trade' && (
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-slate-300">
                    Registos validados:{' '}
                    <strong className="text-emerald-400">{matchedIds.length}/3</strong>
                  </span>
                  {feedback && <span className="text-amber-300">{feedback}</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-2">
                    {LEDGER_PAIRS.map((pair) => {
                      const done = matchedIds.includes(pair.id);
                      const active = selectedLeft === pair.id;
                      return (
                        <button
                          key={pair.id}
                          type="button"
                          disabled={done}
                          onClick={() => setSelectedLeft(pair.id)}
                          className={`w-full p-2.5 rounded-lg border text-left text-xs font-medium cursor-pointer transition-colors ${
                            done
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                              : active
                                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                                : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          {done && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />}
                          {pair.left}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    {[LEDGER_PAIRS[2], LEDGER_PAIRS[0], LEDGER_PAIRS[1]].map((pair) => {
                      const done = matchedIds.includes(pair.id);
                      return (
                        <button
                          key={pair.id}
                          type="button"
                          disabled={done}
                          onClick={() => handleMatchRight(pair.id)}
                          className={`w-full p-2.5 rounded-lg border text-left text-xs font-medium cursor-pointer transition-colors ${
                            done
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                              : 'bg-white/5 border-white/15 text-slate-200 hover:border-sky-400'
                          }`}
                        >
                          {pair.right}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Mini-game 4: PSP Road Inspection */}
            {activity.miniGameKind === 'psp_inspection' && activity.pspTarget && (
              <div className="p-4 rounded-xl bg-slate-900 border border-sky-400/30 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-[10px] text-slate-400">Viatura</p>
                    <p className="text-xs font-semibold text-white truncate mt-0.5">
                      {activity.pspTarget.vehicleName}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-[10px] text-slate-400">Radar</p>
                    <p
                      className={`font-mono text-sm font-bold tabular-nums mt-0.5 ${
                        activity.pspTarget.speedKmh > 95 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {activity.pspTarget.speedKmh} km/h
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-[10px] text-slate-400">Carta</p>
                    <p className="font-mono text-sm font-bold text-white tabular-nums mt-0.5">
                      {activity.pspTarget.drivingPoints}/12 pts
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5">
                    <p className="text-[10px] text-slate-400">Seguro</p>
                    <p
                      className={`text-xs font-bold mt-0.5 ${
                        activity.pspTarget.hasValidInsurance ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {activity.pspTarget.hasValidInsurance ? 'Em dia' : 'Em falta'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onComplete(1.1, { action: 'clear', amount: 0 })}
                    className="min-h-[46px] px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Liberar Condutor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onComplete(1.15, { action: 'warn', amount: 0 })}
                    className="min-h-[46px] px-3 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Aviso Educativo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onComplete(1.25, {
                        action: 'fine',
                        amount: activity.pspTarget && activity.pspTarget.speedKmh > 95 ? 140 : 90,
                      })
                    }
                    className="min-h-[46px] px-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Aplicar Coima (€
                    {activity.pspTarget && activity.pspTarget.speedKmh > 95 ? 140 : 90})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
