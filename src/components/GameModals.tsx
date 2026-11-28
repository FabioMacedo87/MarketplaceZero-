import React, { useState } from 'react';
import {
  Crosshair,
  MapPin,
  Monitor,
  Play,
  RotateCcw,
  Smartphone,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import type {
  CharacterId,
  ControlMode,
  GameState,
  HudSnapshot,
  LeaderboardEntry,
  MissionScenarioId,
  ProfessionId,
  UpgradeState,
  WeaponId,
} from '../game/types.ts';
import portoCoverUrl from '../assets/images/porto_ribeira_cover_1795723506648.jpg';
import { PROFESSIONS, PROFESSION_ORDER } from '../game/professions.ts';
import { WEAPONS, WEAPON_ORDER } from '../game/weapons.ts';

interface GameModalsProps {
  gameState: GameState;
  character: CharacterId;
  profession: ProfessionId;
  controlMode: ControlMode;
  effectiveMobile: boolean;
  playerCallsign: string;
  roomCode: string;
  hud: HudSnapshot;
  upgrades: UpgradeState;
  leaderboard: LeaderboardEntry[];
  onChangeCallsign: (name: string) => void;
  onChangeRoomCode: (code: string) => void;
  onSelectCharacter: (c: CharacterId) => void;
  onSelectProfession: (p: ProfessionId) => void;
  onSelectControlMode: (m: ControlMode) => void;
  onStartGame: () => void;
  onResume: () => void;
  onRestart: () => void;
  onCloseGarage: () => void;
  onBuyUpgrade: (kind: 'turbo' | 'armor' | 'weapon' | 'repair' | 'spawn_coupe') => string | null;
  onBuyOrEquipWeapon: (id: WeaponId) => string | null;
  onSelectScenario: (scenarioId: MissionScenarioId) => void;
  onSaveScore: (playerName: string) => Promise<void>;
}

const PORTO_SCENARIOS: {
  id: MissionScenarioId;
  title: string;
  desc: string;
  accent: string;
}[] = [
  {
    id: 'saobento_bolsa',
    title: 'Estação de São Bento → Palácio da Bolsa',
    desc: 'Converse com o contacto no Átrio dos Azulejos, valide documentos e siga até à Bolsa.',
    accent: 'hover:border-sky-400',
  },
  {
    id: 'clerigos_musica',
    title: 'Torre dos Clérigos → Casa da Música',
    desc: 'Realize o atendimento junto aos Clérigos e atravesse a cidade até à Boavista.',
    accent: 'hover:border-amber-400',
  },
  {
    id: 'bolhao_gaia',
    title: 'Mercado do Bolhão → Caves Sandeman (Gaia)',
    desc: 'Sele as cargas no Bolhão e atravesse a Ponte Dom Luís I até Vila Nova de Gaia.',
    accent: 'hover:border-rose-400',
  },
  {
    id: 'camara_se',
    title: 'Câmara Municipal dos Aliados → Sé do Porto',
    desc: 'Complete o registo nos Aliados e acompanhe o serviço até ao Terreiro da Sé.',
    accent: 'hover:border-emerald-400',
  },
  {
    id: 'lello_musica',
    title: 'Livraria Lello → Mosteiro da Serra do Pilar',
    desc: 'Prepare a encomenda nas Carmelitas e cruze o Douro até ao Miradouro da Serra.',
    accent: 'hover:border-violet-400',
  },
];

export const GameModals: React.FC<GameModalsProps> = ({
  gameState,
  character,
  profession,
  controlMode,
  effectiveMobile,
  playerCallsign,
  roomCode,
  hud,
  upgrades,
  leaderboard,
  onChangeCallsign,
  onChangeRoomCode,
  onSelectCharacter,
  onSelectProfession,
  onSelectControlMode,
  onStartGame,
  onResume,
  onRestart,
  onCloseGarage,
  onBuyUpgrade,
  onBuyOrEquipWeapon,
  onSelectScenario,
  onSaveScore,
}) => {
  const [coverError, setCoverError] = useState(false);
  const [garageMsg, setGarageMsg] = useState<string | null>(null);
  const [garageTab, setGarageTab] = useState<'arsenal' | 'garage' | 'contracts'>('arsenal');
  const [scoreSaved, setScoreSaved] = useState(false);
  const [savingScore, setSavingScore] = useState(false);

  if (gameState === 'PLAYING') return null;

  // 1. TITLE MENU
  if (gameState === 'TITLE_MENU') {
    return (
      <div className="fixed inset-0 z-50 bg-[#090D16] overflow-y-auto">
        {!coverError && (
          <img
            src={portoCoverUrl}
            alt="Panorama do Porto, Ponte Dom Luís I, Ribeira e Rio Douro ao entardecer"
            referrerPolicy="no-referrer"
            onError={() => setCoverError(true)}
            className="fixed inset-0 w-full h-full object-cover opacity-55 pointer-events-none"
          />
        )}
        <div className="fixed inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/75 to-[#090D16]/50 pointer-events-none" />

        <div className="relative z-10 min-h-full max-w-[1140px] mx-auto px-5 py-8 sm:py-10 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-5">
              <div>
                <p className="text-xs font-medium text-amber-300 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>PORTUGAL LIFE · Simulação de Vida em Mundo Aberto · Porto</span>
                </p>
                <h1
                  className="font-display font-bold tracking-tight text-white text-balance leading-[1.05] mt-2"
                  style={{ fontSize: 'clamp(2.3rem, 5vw, 3.8rem)' }}
                >
                  PORTUGAL LIFE
                </h1>
                <p className="mt-2.5 text-sm sm:text-base text-slate-200 max-w-[58ch] leading-relaxed">
                  Vive o Porto à tua maneira. Trabalha, constrói relações, gere o teu dinheiro,
                  explora os bairros, conduz e desenvolve o teu próprio percurso. As histórias e
                  os desafios são opcionais.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="callsign" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome de Jogador (Live)
                  </label>
                  <input
                    id="callsign"
                    type="text"
                    maxLength={20}
                    value={playerCallsign}
                    onChange={(e) => onChangeCallsign(e.target.value)}
                    placeholder="Piloto do Porto"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900/90 border border-white/20 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label htmlFor="room-code" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Sala Multiplayer
                  </label>
                  <input
                    id="room-code"
                    type="text"
                    maxLength={24}
                    value={roomCode}
                    onChange={(e) => onChangeRoomCode(e.target.value)}
                    placeholder="porto-ribeira"
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-900/90 border border-white/20 rounded-xl text-sky-300 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">
                  Escolha a Sua Profissão no Porto
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {PROFESSION_ORDER.map((pid) => {
                    const prof = PROFESSIONS[pid];
                    const selected = profession === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => onSelectProfession(pid)}
                        className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-slate-800/95 border-amber-400 text-white'
                            : 'bg-slate-900/75 border-white/15 text-slate-300 hover:border-white/35'
                        }`}
                      >
                        <p
                          className="font-display text-sm font-bold truncate"
                          style={{ color: selected ? prof.colorHex : '#FFFFFF' }}
                        >
                          {prof.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {prof.dutiesLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">Escolha o Protagonista</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectCharacter('lucia')}
                    className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      character === 'lucia'
                        ? 'bg-rose-500/20 border-rose-400 text-white'
                        : 'bg-slate-900/75 border-white/15 text-slate-300 hover:border-white/35'
                    }`}
                  >
                    <p className="font-display text-base font-bold">Lucía</p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Maior agilidade a pé e rapidez no atendimento pela cidade.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectCharacter('jason')}
                    className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      character === 'jason'
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-slate-900/75 border-white/15 text-slate-300 hover:border-white/35'
                    }`}
                  >
                    <p className="font-display text-base font-bold">Jason</p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Começa com 60 de proteção tática para serviço na estrada.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300 mb-2">
                  Modo de Controlo (Desktop / Mobile)
                </p>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900/85 border border-white/15 rounded-xl">
                  {(
                    [
                      { id: 'auto', label: 'Automático' },
                      { id: 'desktop', label: 'Desktop' },
                      { id: 'mobile', label: 'Mobile Tátil' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectControlMode(item.id)}
                      className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        controlMode === item.id
                          ? 'bg-white text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={onStartGame}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-lg cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                Começar a tua vida no Porto ({roomCode || 'porto-ribeira'})
              </button>
            </div>

            <div className="lg:col-span-5 bg-slate-950/90 border border-white/15 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <h2 className="font-display text-base font-bold text-white">
                    Classificação do Porto
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Top Dinheiro</span>
              </div>

              <div className="mt-3 divide-y divide-white/10">
                {leaderboard.slice(0, 5).map((row, idx) => (
                  <div key={row.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {idx + 1}. {row.playerName}
                      </p>
                      <p className="text-slate-400">
                        {row.character} · {row.missionsCompleted} missões ·{' '}
                        {row.platform === 'mobile' ? 'Mobile' : 'Desktop'}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-emerald-400 tabular-nums shrink-0">
                      €{row.cash.toLocaleString('pt-PT')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. GARAGE, WEAPONS ARSENAL & PORTO LANDMARK SIMULATIONS MODAL
  if (gameState === 'GARAGE') {
    const turboCost = 350 + upgrades.turboLevel * 250;
    const armorCost = 300 + upgrades.armorLevel * 200;
    const weaponCost = 300 + upgrades.weaponLevel * 250;

    const triggerBuy = (kind: 'turbo' | 'armor' | 'weapon' | 'repair' | 'spawn_coupe') => {
      const err = onBuyUpgrade(kind);
      setGarageMsg(err ?? 'Melhoria aplicada!');
    };

    const triggerWeapon = (wid: WeaponId) => {
      const err = onBuyOrEquipWeapon(wid);
      setGarageMsg(err ?? `${WEAPONS[wid].name} equipada!`);
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
        <div className="bg-[#0F172A] border border-white/15 rounded-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold text-white">
                Equipamento, Garagem & Atividades do Porto
              </h2>
            </div>
            <span className="font-mono text-base font-semibold text-emerald-400 tabular-nums">
              €{hud.cash.toLocaleString('pt-PT')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setGarageTab('arsenal')}
              className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                garageTab === 'arsenal' ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Armas (5)</span>
            </button>
            <button
              type="button"
              onClick={() => setGarageTab('garage')}
              className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                garageTab === 'garage' ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Garagem</span>
            </button>
            <button
              type="button"
              onClick={() => setGarageTab('contracts')}
              className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                garageTab === 'contracts' ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Edifícios Reais</span>
            </button>
          </div>

          {garageMsg && <p className="text-xs font-semibold text-amber-300">{garageMsg}</p>}

          {garageTab === 'arsenal' && (
            <div className="space-y-2.5">
              {WEAPON_ORDER.map((wid) => {
                const def = WEAPONS[wid];
                const owned = hud.unlockedWeapons.includes(wid);
                const equipped = hud.currentWeapon === wid;
                return (
                  <div
                    key={wid}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
                      equipped
                        ? 'bg-amber-500/15 border-amber-400/60'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-white">
                        {def.name}{' '}
                        <span className="text-xs font-mono text-sky-400">
                          (Dano {def.damage}
                          {def.pellets > 1 ? `×${def.pellets}` : ''})
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{def.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerWeapon(wid)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                        equipped
                          ? 'bg-emerald-400 text-slate-950'
                          : owned
                            ? 'bg-white text-slate-950 hover:bg-slate-200'
                            : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      }`}
                    >
                      {equipped ? 'Equipada' : owned ? 'Equipar' : `€${def.cost}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {garageTab === 'garage' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm text-white">
                    Motor V8 Turbo (Nível {upgrades.turboLevel}/3)
                  </p>
                  <p className="text-xs text-slate-400">+14% velocidade máxima e aceleração</p>
                </div>
                <button
                  type="button"
                  disabled={upgrades.turboLevel >= 3}
                  onClick={() => triggerBuy('turbo')}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-400 text-slate-950 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {upgrades.turboLevel >= 3 ? 'Máximo' : `€${turboCost}`}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm text-white">
                    Blindagem Kevlar (Nível {upgrades.armorLevel}/3)
                  </p>
                  <p className="text-xs text-slate-400">+25 colete máximo e recarga total</p>
                </div>
                <button
                  type="button"
                  disabled={upgrades.armorLevel >= 3}
                  onClick={() => triggerBuy('armor')}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-400 text-slate-950 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {upgrades.armorLevel >= 3 ? 'Máximo' : `€${armorCost}`}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm text-white">
                    Carregador Tático (Nível {upgrades.weaponLevel}/3)
                  </p>
                  <p className="text-xs text-slate-400">+14% cadência e +8 dano em todas as armas</p>
                </div>
                <button
                  type="button"
                  disabled={upgrades.weaponLevel >= 3}
                  onClick={() => triggerBuy('weapon')}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-400 text-slate-950 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {upgrades.weaponLevel >= 3 ? 'Máximo' : `€${weaponCost}`}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => triggerBuy('repair')}
                  className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-left hover:bg-emerald-500/25 cursor-pointer"
                >
                  <p className="text-sm font-bold text-white">Reparar Vida & Carro</p>
                  <p className="text-xs font-mono text-emerald-300 mt-0.5">€100</p>
                </button>
                <button
                  type="button"
                  onClick={() => triggerBuy('spawn_coupe')}
                  className="p-3.5 rounded-xl bg-sky-500/15 border border-sky-400/40 text-left hover:bg-sky-500/25 cursor-pointer"
                >
                  <p className="text-sm font-bold text-white">Chamar Coupé Boavista GT</p>
                  <p className="text-xs font-mono text-sky-300 mt-0.5">€250</p>
                </button>
              </div>
            </div>
          )}

          {garageTab === 'contracts' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400">
                Todas as simulações decorrem em edifícios reais do Porto e sem limite de tempo.
              </p>
              {PORTO_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    onSelectScenario(sc.id);
                    setGarageMsg(null);
                    onCloseGarage();
                  }}
                  className={`w-full p-3.5 rounded-xl bg-white/5 border border-white/10 ${sc.accent} text-left cursor-pointer`}
                >
                  <p className="font-semibold text-sm text-white">{sc.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sc.desc}</p>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setGarageMsg(null);
              onCloseGarage();
            }}
            className="w-full py-2.5 text-sm font-bold bg-white text-slate-950 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Voltar às Ruas do Porto
          </button>
        </div>
      </div>
    );
  }

  // 3. PAUSED MODAL
  if (gameState === 'PAUSED') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
        <div className="bg-[#0F172A] border border-white/15 rounded-2xl w-full max-w-md p-6 space-y-5">
          <h2 className="font-display text-2xl font-bold text-white">Jogo em Pausa</h2>

          <div>
            <p className="text-xs font-semibold text-slate-300 mb-2">Alternar Controlos</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectControlMode('desktop')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border cursor-pointer ${
                  !effectiveMobile
                    ? 'bg-white text-slate-950 border-white'
                    : 'bg-white/5 text-slate-300 border-white/15'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => onSelectControlMode('mobile')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border cursor-pointer ${
                  effectiveMobile
                    ? 'bg-white text-slate-950 border-white'
                    : 'bg-white/5 text-slate-300 border-white/15'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Mobile Tátil
              </button>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 text-sm font-bold bg-amber-400 text-slate-950 rounded-xl hover:bg-amber-300 cursor-pointer"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={() => {
                setScoreSaved(false);
                onRestart();
              }}
              className="w-full py-3 text-sm font-semibold bg-white/10 text-white rounded-xl hover:bg-white/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar no Porto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. GAME OVER MODAL
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/92 flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-rose-400">Operação Interrompida</p>
          <h2 className="font-display text-3xl font-bold text-white mt-1">FORA DE COMBATE</h2>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center bg-white/5 border border-white/10 rounded-xl p-4">
          <div>
            <p className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
              €{hud.cash.toLocaleString('pt-PT')}
            </p>
            <p className="text-[11px] text-slate-400">Dinheiro</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-white tabular-nums">
              {hud.missionsCompleted}
            </p>
            <p className="text-[11px] text-slate-400">Simulações</p>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-amber-400 tabular-nums">
              {hud.drivingPoints}/12
            </p>
            <p className="text-[11px] text-slate-400">Carta Pts</p>
          </div>
        </div>

        {!scoreSaved ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSavingScore(true);
              await onSaveScore(playerCallsign);
              setSavingScore(false);
              setScoreSaved(true);
            }}
            className="space-y-3"
          >
            <label htmlFor="save-name" className="block text-xs font-semibold text-slate-300">
              Guardar na Classificação do Porto
            </label>
            <div className="flex gap-2">
              <input
                id="save-name"
                type="text"
                required
                maxLength={24}
                value={playerCallsign}
                onChange={(e) => onChangeCallsign(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-slate-900 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={savingScore}
                className="px-4 py-2 text-xs font-bold bg-emerald-400 text-slate-950 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                {savingScore ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs font-semibold text-emerald-400">
            Pontuação registada na classificação!
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setScoreSaved(false);
            onRestart();
          }}
          className="w-full py-3 text-sm font-bold bg-amber-400 text-slate-950 rounded-xl hover:bg-amber-300 flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Jogar Novamente
        </button>
      </div>
    </div>
  );
};
