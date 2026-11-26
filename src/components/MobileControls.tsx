import React, { useRef, useState } from 'react';
import {
  Car,
  Crosshair,
  Flame,
  Gauge,
  Hand,
  Lightbulb,
  Shield,
  ShieldAlert,
  Siren,
  Volume2,
  Wind,
  Wrench,
} from 'lucide-react';
import type { WeaponId } from '../game/types.ts';
import { WEAPONS } from '../game/weapons.ts';

interface MobileControlsProps {
  inVehicle: boolean;
  canEnterVehicle: boolean;
  canInteractMission: boolean;
  canPspInspect: boolean;
  isServiceVehicle: boolean;
  sirenActive: boolean;
  nearServiceLabel: string | null;
  currentWeapon: WeaponId;
  headlightsOn: boolean;
  onJoystickChange: (x: number, y: number) => void;
  onShootChange: (active: boolean) => void;
  onNitroChange: (active: boolean) => void;
  onHandbrakeChange: (active: boolean) => void;
  onDash: () => void;
  onToggleHeadlights: () => void;
  onToggleVehicle: () => void;
  onInteractMission: () => void;
  onPspInspect: () => void;
  onCycleWeapon: () => void;
  onHorn: () => void;
  onServiceAction: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  inVehicle,
  canEnterVehicle,
  canInteractMission,
  canPspInspect,
  isServiceVehicle,
  sirenActive,
  nearServiceLabel,
  currentWeapon,
  headlightsOn,
  onJoystickChange,
  onShootChange,
  onNitroChange,
  onHandbrakeChange,
  onDash,
  onToggleHeadlights,
  onToggleVehicle,
  onInteractMission,
  onPspInspect,
  onCycleWeapon,
  onHorn,
  onServiceAction,
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const maxRadius = 42;
  const stickMag = Math.hypot(knobOffset.x, knobOffset.y) / maxRadius;
  const isEdgePush = stickMag > 0.86;

  const updateStick = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > maxRadius) {
      dx = (dx / d) * maxRadius;
      dy = (dy / d) * maxRadius;
    }
    setKnobOffset({ x: dx, y: dy });
    onJoystickChange(dx / maxRadius, dy / maxRadius);
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickChange(0, 0);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 pointer-events-none px-4 pb-5 pt-2 flex items-end justify-between">
      {/* Left Thumb: Virtual Analog Stick */}
      <div className="pointer-events-auto touch-none select-none">
        <div
          ref={baseRef}
          role="application"
          aria-label="Joystick tátil de movimento"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            activePointerId.current = e.pointerId;
            updateStick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (activePointerId.current !== e.pointerId) return;
            updateStick(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (activePointerId.current === e.pointerId) resetStick();
          }}
          onPointerCancel={(e) => {
            if (activePointerId.current === e.pointerId) resetStick();
          }}
          className={`w-32 h-32 rounded-full bg-slate-950/82 border-2 flex items-center justify-center relative transition-colors ${
            isEdgePush ? 'border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.45)]' : 'border-white/25'
          }`}
        >
          <div
            className="w-14 h-14 rounded-full bg-white/88 shadow-lg pointer-events-none"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Right Thumb: Action Buttons (>= 48x48px targets) */}
      <div className="pointer-events-auto touch-none select-none flex flex-col items-end gap-2">
        {canInteractMission && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onInteractMission();
            }}
            className="min-h-[48px] px-4 rounded-xl bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            <Hand className="w-4 h-4" aria-hidden="true" />
            <span>Interagir</span>
          </button>
        )}

        {canPspInspect && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onPspInspect();
            }}
            className="min-h-[48px] px-4 rounded-xl bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            <span>Abordar PSP</span>
          </button>
        )}

        {nearServiceLabel && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onServiceAction();
            }}
            className="min-h-[48px] px-4 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            <Wrench className="w-4 h-4" aria-hidden="true" />
            <span>{nearServiceLabel}</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          {inVehicle && (
            <>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onToggleHeadlights();
                }}
                aria-label="Alternar faróis"
                className={`min-h-[48px] min-w-[48px] px-3 rounded-xl border font-semibold text-xs flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
                  headlightsOn
                    ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                    : 'bg-slate-800/90 border-white/20 text-slate-400'
                }`}
              >
                <Lightbulb className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onHorn();
                }}
                aria-label={isServiceVehicle ? 'Ligar ou desligar sirene' : 'Buzinar'}
                className={`min-h-[48px] min-w-[48px] px-3 rounded-xl border font-semibold text-xs flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
                  sirenActive
                    ? 'bg-sky-500 text-slate-950 border-sky-300'
                    : 'bg-slate-800/90 border-white/20 text-white'
                }`}
              >
                {isServiceVehicle ? (
                  <Siren className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4 text-amber-300" aria-hidden="true" />
                )}
              </button>
            </>
          )}

          {!inVehicle && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onDash();
              }}
              aria-label="Esquivar"
              className="min-h-[48px] px-3 rounded-xl bg-slate-900/90 border border-sky-400/50 text-sky-300 font-semibold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
            >
              <Wind className="w-4 h-4" aria-hidden="true" />
              <span>Esquivar</span>
            </button>
          )}

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              onCycleWeapon();
            }}
            aria-label="Trocar de equipamento"
            className="min-h-[48px] px-3 rounded-xl bg-slate-900/90 border border-white/20 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
          >
            <Shield className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>{WEAPONS[currentWeapon].shortName}</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {(inVehicle || canEnterVehicle) && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onToggleVehicle();
              }}
              aria-label={inVehicle ? 'Sair do veículo' : 'Entrar no veículo'}
              className="min-h-[52px] min-w-[52px] px-3.5 rounded-2xl bg-amber-400 text-slate-950 font-semibold text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
            >
              <Car className="w-5 h-5" aria-hidden="true" />
              <span>{inVehicle ? 'Sair' : 'Carro'}</span>
            </button>
          )}

          {inVehicle && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                onHandbrakeChange(true);
              }}
              onPointerUp={() => onHandbrakeChange(false)}
              onPointerCancel={() => onHandbrakeChange(false)}
              aria-label="Travão de mão Drift"
              className="min-h-[54px] min-w-[54px] px-3 rounded-2xl bg-slate-800 border border-amber-400/60 text-amber-300 font-semibold text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
            >
              <Gauge className="w-5 h-5" aria-hidden="true" />
              <span>Drift</span>
            </button>
          )}

          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onNitroChange(true);
            }}
            onPointerUp={() => onNitroChange(false)}
            onPointerCancel={() => onNitroChange(false)}
            aria-label="Ativar turbo"
            className="min-h-[56px] min-w-[56px] px-3.5 rounded-2xl bg-sky-500 text-slate-950 font-semibold text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
          >
            <Flame className="w-5 h-5" aria-hidden="true" />
            <span>Turbo</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onShootChange(true);
            }}
            onPointerUp={() => onShootChange(false)}
            onPointerCancel={() => onShootChange(false)}
            aria-label="Disparar"
            className="min-h-[64px] min-w-[64px] px-4 rounded-2xl bg-rose-500 text-white font-semibold text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
          >
            <Crosshair className="w-5 h-5" aria-hidden="true" />
            <span>Fogo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
