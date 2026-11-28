import React, { useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Camera,
  Compass,
  Hand,
  Home,
  MessageSquare,
  Pause,
  PhoneCall,
  Send,
  ShieldAlert,
  Users,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import type { ChatMessage, HudSnapshot, LifeLocation, WeaponId } from '../game/types.ts';
import { WEAPONS, WEAPON_ORDER } from '../game/weapons.ts';

interface GameHudProps {
  hud: HudSnapshot;
  isMobile: boolean;
  muted: boolean;
  mpConnected: boolean;
  onlineCount: number;
  roomId: string;
  chatMessages: ChatMessage[];
  minimapRef: React.RefObject<HTMLCanvasElement | null>;
  onToggleMute: () => void;
  onCycleCamera: () => void;
  onOpenCareer: () => void;
  onOpenLife: (location: LifeLocation | null) => void;
  onOpenGarage: () => void;
  onOpenStory: () => void;
  onOpenRealExplorer: (buildingId?: string | null) => void;
  onInteractMission: () => void;
  onPspInspect: () => void;
  onCall112: () => void;
  onPause: () => void;
  onServiceAction: () => void;
  onEquipWeapon: (id: WeaponId) => void;
  onSendChat: (text: string) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  isMobile,
  muted,
  mpConnected,
  onlineCount,
  roomId,
  chatMessages,
  minimapRef,
  onToggleMute,
  onCycleCamera,
  onOpenCareer,
  onOpenLife,
  onOpenGarage,
  onOpenStory,
  onOpenRealExplorer,
  onInteractMission,
  onPspInspect,
  onCall112,
  onPause,
  onServiceAction,
  onEquipWeapon,
  onSendChat,
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDraft.trim()) return;
    onSendChat(chatDraft);
    setChatDraft('');
  };

  const latestPing =
    (hud.profession === 'psp' || hud.profession === 'paramedic') &&
    hud.emergencyPings.length > 0
      ? hud.emergencyPings[0]
      : null;

  return (
    <>
      {/* Top HUD Bar */}
      <header className="fixed top-0 inset-x-0 z-20 bg-[#090D16]/92 border-b border-white/10 px-3 sm:px-5 py-2">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Cash, HP, Driving Points & Rep */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div>
              <p className="font-mono text-base sm:text-lg font-semibold text-emerald-400 tabular-nums leading-none">
                €{hud.cash.toLocaleString('pt-PT')}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums truncate">
                Dia {hud.life.day} · {String(Math.floor(hud.life.minuteOfDay / 60)).padStart(2, '0')}:{String(Math.floor(hud.life.minuteOfDay % 60)).padStart(2, '0')} · Carta {hud.drivingPoints}/12
              </p>
            </div>

            <div className="h-7 w-px bg-white/10 hidden sm:block" aria-hidden="true" />

            <div className="space-y-1 min-w-[92px] sm:min-w-[128px]">
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                <span className="text-rose-400 font-medium">HP {hud.hp}</span>
                <span className="text-sky-400 font-medium">Col {hud.armor}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-rose-500 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Center: Interactive Profession Mission Banner */}
          <div className="hidden lg:flex flex-col items-center text-center max-w-md min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-white truncate">
              <span className="text-amber-300 font-mono">Cap. {hud.storyChapter}/5</span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span className="truncate">{hud.missionTitle}</span>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="text-emerald-400 font-mono tabular-nums">{hud.gpsDistMeters} m</span>
            </div>
            <p className="text-[11px] text-slate-300 truncate max-w-full">
              {hud.missionObjective} (+€{hud.missionReward})
            </p>
          </div>

          {/* Right: Live Badge, Active Profession, 112 & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div
              title={`Sala: ${roomId}`}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium text-slate-200"
            >
              <Users
                className={`w-3.5 h-3.5 ${mpConnected ? 'text-emerald-400' : 'text-slate-500'}`}
                aria-hidden="true"
              />
              <span className="tabular-nums">
                {mpConnected ? `${onlineCount} Live` : 'Offline'}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenCareer}
              aria-label="Escolher profissão no Porto"
              style={{ borderColor: `${hud.professionColor}80` }}
              className="min-h-[40px] px-2.5 rounded-lg bg-white/10 hover:bg-white/20 border text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" style={{ color: hud.professionColor }} />
              <span className="truncate max-w-[92px] sm:max-w-none">{hud.professionTitle}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenLife(hud.nearLifeLocation)}
              aria-label="Abrir a simulação de vida quotidiana"
              className="min-h-[40px] px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
              <span>Vida</span>
            </button>

            <button
              type="button"
              onClick={onCall112}
              aria-label="Ligar 112 para PSP e INEM"
              className="min-h-[40px] min-w-[40px] px-2 rounded-lg bg-rose-500/20 border border-rose-400/50 hover:bg-rose-500/30 text-rose-200 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
              <span className="hidden md:inline">112</span>
            </button>

            <button
              type="button"
              onClick={() => setChatOpen((v) => !v)}
              aria-label="Abrir chat ao vivo"
              className={`min-h-[40px] min-w-[40px] px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                chatOpen
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onCycleCamera}
              aria-label="Alternar câmara 3D"
              className="hidden sm:flex min-h-[40px] min-w-[40px] px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-sky-400" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenStory}
              aria-label="Abrir campanha de história"
              className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg bg-amber-500/20 border border-amber-400/50 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span className="hidden sm:inline">História</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenRealExplorer(hud.nearBuildingId)}
              aria-label="Ver imagens reais das ruas do Porto"
              className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg bg-sky-500/20 border border-sky-400/50 hover:bg-sky-500/30 text-sky-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Compass className="w-4 h-4 text-sky-400" aria-hidden="true" />
              <span className="hidden md:inline">Rua Real</span>
            </button>

            <button
              type="button"
              onClick={onOpenGarage}
              aria-label="Abrir Garagem e Equipamento"
              className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span className="hidden md:inline">Garagem</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Ativar som' : 'Silenciar som'}
              className="min-h-[40px] min-w-[40px] rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onPause}
              aria-label="Pausar jogo"
              className="min-h-[40px] min-w-[40px] rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile compact mission & live strip */}
        <div className="lg:hidden mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-200 truncate">
            {hud.professionTitle} · {hud.missionBuilding} ({hud.gpsDistMeters}m)
          </span>
          <span className="font-mono text-emerald-400 shrink-0 tabular-nums">
            {mpConnected ? `${onlineCount} Live · ` : ''}
            +€{hud.missionReward}
          </span>
        </div>
      </header>

      {/* Center Toast, Dispatch Banner & Contextual Prompts */}
      <div className="fixed top-20 inset-x-0 z-20 pointer-events-none flex flex-col items-center gap-2 px-4">
        {latestPing && (
          <div className="px-4 py-1.5 rounded-xl bg-slate-950/92 border border-sky-400/50 text-xs font-semibold text-sky-200 shadow-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Central {latestPing.kind === '112' ? '112' : 'Radar'}: {latestPing.label} (
              {latestPing.callerName})
            </span>
          </div>
        )}

        {hud.toastText && (
          <div className="px-4 py-1.5 rounded-lg bg-[#090D16]/92 border border-white/15 text-xs sm:text-sm font-semibold text-white shadow-lg text-center">
            {hud.toastText}
          </div>
        )}

        {hud.ambientNpcDialogue && (
          <div
            className="max-w-[min(92vw,34rem)] px-4 py-2 rounded-xl bg-slate-950/90 border border-white/15 shadow-xl text-center text-xs sm:text-sm text-slate-100 animate-in fade-in slide-in-from-top-1"
            style={{ borderLeftWidth: 3, borderLeftColor: hud.ambientNpcDialogue.color }}
            role="status"
            aria-live="polite"
          >
            <span className="font-bold mr-2" style={{ color: hud.ambientNpcDialogue.color }}>
              {hud.ambientNpcDialogue.speaker}
            </span>
            <span>“{hud.ambientNpcDialogue.text}”</span>
          </div>
        )}

        {hud.canInteractLifeLocation && hud.nearLifeLocation && (
          <button
            type="button"
            onClick={() => onOpenLife(hud.nearLifeLocation)}
            className="pointer-events-auto px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>
              {isMobile
                ? `Interagir em ${hud.nearLifeLocation.label}`
                : `[G] Interagir em ${hud.nearLifeLocation.label}`}
            </span>
          </button>
        )}

        {hud.canInteractMission && (
          <button
            type="button"
            onClick={onInteractMission}
            className="pointer-events-auto px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Hand className="w-4 h-4" aria-hidden="true" />
            <span>
              {isMobile
                ? `Interagir em ${hud.missionBuilding}`
                : `[G] Interagir em ${hud.missionBuilding}`}
            </span>
          </button>
        )}

        {hud.nearPspTarget && (
          <button
            type="button"
            onClick={onPspInspect}
            className="pointer-events-auto px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            <span>
              {isMobile
                ? `Abordar ${hud.nearPspTarget.name}`
                : `[P] Abordar PSP: ${hud.nearPspTarget.name} (${hud.nearPspTarget.speedKmh} km/h)`}
            </span>
          </button>
        )}

        {hud.nearBuildingName && hud.nearBuildingId && (
          <button
            type="button"
            onClick={() => onOpenRealExplorer(hud.nearBuildingId)}
            className="pointer-events-auto px-4 py-1.5 rounded-lg bg-sky-500/90 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {isMobile
                ? `Ver Rua Real: ${hud.nearBuildingName}`
                : `[V] Conhecer Rua Real: ${hud.nearBuildingName}`}
            </span>
          </button>
        )}

        {!isMobile && hud.nearServiceZone && (
          <button
            type="button"
            onClick={onServiceAction}
            className="pointer-events-auto px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold shadow-lg cursor-pointer"
          >
            Premir [R] para {hud.nearServiceZone}
          </button>
        )}

        {!isMobile && !hud.vehicleName && hud.nearVehicleName && (
          <div className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold">
            Premir [E] para entrar em {hud.nearVehicleName}
          </div>
        )}
      </div>

      {/* Live Chat Drawer */}
      {chatOpen && (
        <div
          className={`fixed z-30 bg-[#090D16]/95 border border-white/15 rounded-xl p-3 shadow-2xl w-72 sm:w-80 ${
            isMobile ? 'top-[96px] left-3' : 'bottom-36 left-4'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
            <span className="font-semibold text-white">Chat Ao Vivo · {roomId}</span>
            <span className="text-emerald-400 tabular-nums">
              {mpConnected ? `${onlineCount} online` : 'A ligar...'}
            </span>
          </div>
          <div className="mt-2 h-28 overflow-y-auto space-y-1 text-xs pr-1">
            {chatMessages.length === 0 ? (
              <p className="text-slate-500">Sem mensagens ainda. Diga olá ao Porto!</p>
            ) : (
              chatMessages.map((m) => (
                <p
                  key={m.id}
                  className={m.kind === 'system' ? 'text-amber-300' : 'text-slate-200'}
                >
                  <span className="font-semibold text-sky-400">{m.sender}: </span>
                  <span>{m.text}</span>
                </p>
              ))
            )}
          </div>
          <form onSubmit={handleChatSubmit} className="mt-2 flex gap-1.5">
            <input
              type="text"
              value={chatDraft}
              maxLength={140}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Mensagem para a sala..."
              className="flex-1 px-2.5 py-1.5 text-xs bg-slate-900 border border-white/15 rounded-lg text-white focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              aria-label="Enviar mensagem"
              className="px-2.5 py-1.5 rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Compact Minimap Radar */}
      <div
        className={`fixed z-20 pointer-events-none rounded-xl overflow-hidden border border-white/20 bg-[#090D16]/92 shadow-lg ${
          isMobile ? 'top-[92px] right-3' : 'bottom-4 left-4'
        }`}
      >
        <canvas
          ref={minimapRef}
          width={isMobile ? 96 : 148}
          height={isMobile ? 72 : 111}
          className="block"
        />
      </div>

      {/* Desktop Quick Equipment Bar & Speedometer */}
      {!isMobile && (
        <>
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#090D16]/92 border border-white/15">
            {WEAPON_ORDER.map((wid, idx) => {
              const def = WEAPONS[wid];
              const owned = hud.unlockedWeapons.includes(wid);
              const active = hud.currentWeapon === wid;
              return (
                <button
                  key={wid}
                  type="button"
                  onClick={() => (owned ? onEquipWeapon(wid) : onOpenGarage())}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-amber-400 text-slate-950'
                      : owned
                        ? 'bg-white/5 text-slate-200 hover:bg-white/15'
                        : 'bg-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">{idx + 1}</span>
                  <span>{def.shortName}</span>
                </button>
              );
            })}
          </div>

          <div className="fixed bottom-4 right-4 z-20 pointer-events-none flex flex-col items-end gap-2">
            {hud.vehicleName && (
              <div className="px-4 py-3 rounded-xl bg-[#090D16]/92 border border-white/15 text-right min-w-[195px]">
                <p className="text-xs text-slate-400">{hud.vehicleName}</p>
                <p className="font-display text-2xl font-bold text-white tabular-nums mt-0.5">
                  {hud.speedKmh} <span className="text-xs font-normal text-slate-400">km/h</span>
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-300 tabular-nums">
                  <span>Turbo {hud.nitro}%</span>
                  <span>Carro {hud.vehicleHp}%</span>
                  <span className={hud.sirenActive ? 'text-sky-400 font-bold' : hud.headlightsOn ? 'text-amber-300' : 'text-slate-500'}>
                    {hud.sirenActive ? 'Sirene ON' : hud.headlightsOn ? 'Luz ON' : 'Luz OFF'}
                  </span>
                </div>
              </div>
            )}

            <div className="px-3.5 py-2 rounded-lg bg-[#090D16]/90 border border-white/10 text-[11px] text-slate-300">
              WASD · Dir.+Rato Câmara · G Interagir · K Profissão · P Abordar PSP · H Sirene · M História
            </div>
          </div>
        </>
      )}
    </>
  );
};
