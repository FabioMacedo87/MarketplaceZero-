import React from 'react';
import { Briefcase, Car, PhoneCall, Shield, X } from 'lucide-react';
import { PROFESSIONS, PROFESSION_ORDER } from '../game/professions.ts';
import type { HudSnapshot, ProfessionId } from '../game/types.ts';

interface CareerModalProps {
  open: boolean;
  hud: HudSnapshot;
  onClose: () => void;
  onSelectProfession: (prof: ProfessionId) => void;
  onToggleDuty: () => void;
  onSpawnServiceVehicle: () => void;
  onCall112: () => void;
}

export const CareerModal: React.FC<CareerModalProps> = ({
  open,
  hud,
  onClose,
  onSelectProfession,
  onToggleDuty,
  onSpawnServiceVehicle,
  onCall112,
}) => {
  if (!open) return null;

  const activeDef = PROFESSIONS[hud.profession];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-white/15 rounded-2xl w-full max-w-3xl p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Profissões & Vida Real do Porto
              </h2>
              <p className="text-xs text-slate-400">
                Sem polícia automática: apenas jogadores PSP patrulham e fiscalizam a cidade.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar profissões"
            className="min-h-[40px] min-w-[40px] rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Citizen & Civic Record Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 border border-white/10 rounded-xl p-3.5">
          <div>
            <p className="text-[11px] text-slate-400">Profissão Atual</p>
            <p className="text-sm font-bold truncate" style={{ color: activeDef.colorHex }}>
              {activeDef.shortTitle}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Carta de Condução</p>
            <p className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
              {hud.drivingPoints}/12 pts
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Reputação Cívica</p>
            <p className="font-mono text-sm font-bold text-amber-300 tabular-nums">
              {hud.reputation} Rep
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Estado de Turno</p>
            <button
              type="button"
              onClick={onToggleDuty}
              className={`mt-0.5 px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
                hud.onDuty
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-slate-800 text-slate-300 border border-white/10'
              }`}
            >
              {hud.onDuty ? 'Em Serviço' : 'Folga'}
            </button>
          </div>
        </div>

        {/* Quick Career & Emergency Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              onSpawnServiceVehicle();
              onClose();
            }}
            className="min-h-[48px] p-3.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-left flex items-center gap-3 cursor-pointer"
          >
            <Car className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Chamar {activeDef.vehicleLabel}</p>
              <p className="text-xs text-slate-300">Entrega gratuita da viatura profissional</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onCall112();
              onClose();
            }}
            className="min-h-[48px] p-3.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-left flex items-center gap-3 cursor-pointer"
          >
            <PhoneCall className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">Ligar 112 (PSP & INEM Ao Vivo)</p>
              <p className="text-xs text-slate-300">Envia alerta GPS para jogadores PSP e INEM</p>
            </div>
          </button>
        </div>

        {/* 5 Real-Life Porto Professions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROFESSION_ORDER.map((pid) => {
            const prof = PROFESSIONS[pid];
            const active = hud.profession === pid;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => {
                  onSelectProfession(pid);
                  onClose();
                }}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-white/10 border-amber-400'
                    : 'bg-slate-900/80 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {pid === 'psp' ? (
                      <Shield className="w-4 h-4 shrink-0" style={{ color: prof.colorHex }} />
                    ) : (
                      <Briefcase className="w-4 h-4 shrink-0" style={{ color: prof.colorHex }} />
                    )}
                    <p className="font-display text-base font-bold text-white truncate">
                      {prof.title}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 shrink-0 tabular-nums">
                    +€{prof.baseSalary}/serv.
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{prof.description}</p>
                <p className="text-[11px] font-medium mt-2" style={{ color: prof.colorHex }}>
                  {prof.vehicleLabel} · {prof.dutiesLabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
