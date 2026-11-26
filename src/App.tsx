import { useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud.tsx';
import { GameModals } from './components/GameModals.tsx';
import { MobileControls } from './components/MobileControls.tsx';
import { PortoRealModal } from './components/PortoRealModal.tsx';
import { StoryCampaignModal, StoryDialogueBar } from './components/StoryModal.tsx';
import { soundEngine } from './game/audio.ts';
import { LeonidaEngine } from './game/engine.ts';
import { LeonidaMultiplayerClient } from './game/multiplayer.ts';
import { LeonidaScene3D, drawMinimapCanvas } from './game/scene3d.ts';
import type {
  CharacterId,
  ChatMessage,
  ControlMode,
  GameState,
  HudSnapshot,
  InputState,
  LeaderboardEntry,
} from './game/types.ts';
import { WEAPON_ORDER } from './game/weapons.ts';

const INITIAL_HUD: HudSnapshot = {
  cash: 500,
  hp: 100,
  maxHp: 100,
  armor: 40,
  maxArmor: 100,
  nitro: 100,
  wantedStars: 0,
  speedKmh: 0,
  vehicleName: null,
  vehicleHp: 100,
  nearVehicleName: null,
  nearServiceZone: null,
  nearBuildingId: null,
  nearBuildingName: null,
  missionTitle: 'Operação São Bento → Palácio da Bolsa',
  missionObjective: 'Entre na Estação de São Bento para simular o acesso ao Átrio dos Azulejos.',
  missionReward: 650,
  missionBuilding: 'Estação de São Bento',
  missionProgress: 0,
  missionSimulating: false,
  gpsDistMeters: 0,
  headlightsOn: true,
  storyChapter: 1,
  completedChapters: [],
  activeDialogue: null,
  comboMultiplier: 1,
  missionsCompleted: 0,
  maxStarsReached: 0,
  timeOfDayLabel: 'Entardecer no Douro',
  cameraMode: 'chase',
  currentWeapon: 'pistol',
  unlockedWeapons: ['pistol'],
  toastText: null,
};

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LeonidaEngine | null>(null);
  const scene3dRef = useRef<LeonidaScene3D | null>(null);
  const mpRef = useRef<LeonidaMultiplayerClient | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const gameStateRef = useRef<GameState>('TITLE_MENU');
  const [character, setCharacter] = useState<CharacterId>('lucia');
  const [controlMode, setControlMode] = useState<ControlMode>('auto');
  const [playerCallsign, setPlayerCallsign] = useState('Piloto do Porto');
  const [roomCode, setRoomCode] = useState('porto-ribeira');
  const [isTouchViewport, setIsTouchViewport] = useState<boolean>(detectTouchDevice);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [mpConnected, setMpConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [activeRoomId, setActiveRoomId] = useState('porto-ribeira');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [realExplorerOpen, setRealExplorerOpen] = useState(false);
  const [realExplorerBuildingId, setRealExplorerBuildingId] = useState<string | null>(null);
  const realExplorerOpenRef = useRef(false);
  realExplorerOpenRef.current = realExplorerOpen;

  const [storyOpen, setStoryOpen] = useState(false);
  const storyOpenRef = useRef(false);
  storyOpenRef.current = storyOpen;

  const rightDragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const touchOrbitRef = useRef<{ pointerId: number | null; lastX: number; lastY: number }>({
    pointerId: null,
    lastX: 0,
    lastY: 0,
  });

  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false,
    nitro: false,
    handbrake: false,
    joyX: 0,
    joyY: 0,
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
  });

  const effectiveMobile =
    controlMode === 'mobile' || (controlMode === 'auto' && isTouchViewport);
  const effectiveMobileRef = useRef(effectiveMobile);
  effectiveMobileRef.current = effectiveMobile;
  gameStateRef.current = gameState;

  if (!engineRef.current) {
    engineRef.current = new LeonidaEngine(
      character,
      () => setGameState('GAME_OVER'),
      () => setGameState('GARAGE'),
    );
  }

  useEffect(() => {
    const mp = new LeonidaMultiplayerClient({
      onStatusChange: (connected, count, room) => {
        setMpConnected(connected);
        setOnlineCount(count);
        setActiveRoomId(room);
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) =>
          prev.some((existing) => existing.id === msg.id) ? prev : [...prev.slice(-24), msg],
        );
      },
      onRemoteFire: (evt) => {
        engineRef.current?.spawnRemoteFireEffects(evt.weaponId, evt.x, evt.y, evt.angle);
      },
      onHitReceived: (evt) => {
        if (gameStateRef.current === 'PLAYING') {
          engineRef.current?.applyRemoteDamage(evt.damage, evt.attackerName);
        }
      },
    });
    mpRef.current = mp;

    if (engineRef.current) {
      engineRef.current.onLocalFire = (weaponId, x, y, angle) => {
        mp.sendFire(weaponId, x, y, angle);
      };
      engineRef.current.onRemoteHit = (targetId, damage) => {
        mp.sendHit(targetId, damage);
      };
    }

    return () => {
      mp.disconnect();
      mpRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsTouchViewport(detectTouchDevice());
      scene3dRef.current?.resize();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch('/api/game/leaderboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.entries)) setLeaderboard(data.entries);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      if (gameStateRef.current !== 'PLAYING') {
        if (
          e.key === 'Escape' &&
          (gameStateRef.current === 'PAUSED' || gameStateRef.current === 'GARAGE')
        ) {
          setGameState('PLAYING');
        }
        return;
      }

      if (realExplorerOpenRef.current) {
        if (e.key === 'Escape' || e.code === 'KeyV') {
          setRealExplorerOpen(false);
        }
        return;
      }

      if (storyOpenRef.current) {
        if (e.key === 'Escape' || e.code === 'KeyM') {
          setStoryOpen(false);
        }
        return;
      }

      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') inputRef.current.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = true;
      if (code === 'Space') {
        e.preventDefault();
        if (engineRef.current?.player.vehicleId) {
          inputRef.current.handbrake = true;
        } else {
          inputRef.current.shoot = true;
        }
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.nitro = true;
      if (code === 'KeyX' || code === 'AltLeft') engineRef.current?.triggerDash();
      if (code === 'KeyL') {
        engineRef.current?.toggleHeadlights();
        if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
      }
      if (code === 'Enter') {
        const snap = engineRef.current?.getHudSnapshot();
        if (snap?.activeDialogue) {
          e.preventDefault();
          engineRef.current?.advanceDialogue();
          if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
        }
      }
      if (code === 'KeyE' || code === 'KeyF') engineRef.current?.toggleVehicle();
      if (code === 'KeyR') engineRef.current?.triggerServiceAction();
      if (code === 'KeyM') setStoryOpen(true);
      if (code === 'KeyV') {
        const snap = engineRef.current?.getHudSnapshot();
        setRealExplorerBuildingId(snap?.nearBuildingId ?? null);
        setRealExplorerOpen(true);
      }
      if (code === 'KeyC') engineRef.current?.cycleCameraMode();
      if (code === 'KeyQ') engineRef.current?.cycleWeapon();
      if (code === 'KeyH') engineRef.current?.honkHorn();
      if (code === 'Digit1') engineRef.current?.equipWeapon(WEAPON_ORDER[0]);
      if (code === 'Digit2') engineRef.current?.equipWeapon(WEAPON_ORDER[1]);
      if (code === 'Digit3') engineRef.current?.equipWeapon(WEAPON_ORDER[2]);
      if (code === 'Digit4') engineRef.current?.equipWeapon(WEAPON_ORDER[3]);
      if (code === 'Digit5') engineRef.current?.equipWeapon(WEAPON_ORDER[4]);
      if (code === 'Escape') setGameState('PAUSED');
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') inputRef.current.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = false;
      if (code === 'Space') {
        inputRef.current.shoot = false;
        inputRef.current.handbrake = false;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.nitro = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const engine = engineRef.current;
    if (!mount || !engine) return;

    const scene3d = new LeonidaScene3D(mount, character);
    scene3dRef.current = scene3d;

    let hudTimer = 0;

    scene3d.startLoop((dt) => {
      const mp = mpRef.current;
      const remotePlayers = mp ? mp.remotePlayers : new Map();

      if (
        gameStateRef.current === 'PLAYING' &&
        !realExplorerOpenRef.current &&
        !storyOpenRef.current
      ) {
        const aimWorld2D =
          !effectiveMobileRef.current && inputRef.current.mouseActive
            ? scene3d.screenToWorld2D(inputRef.current.mouseX, inputRef.current.mouseY)
            : null;
        engine.update(
          dt,
          inputRef.current,
          scene3d.getCameraYawXZ(),
          aimWorld2D,
          effectiveMobileRef.current,
          remotePlayers,
        );

        if (mp && mp.connected) {
          const activeVeh = engine.player.vehicleId
            ? engine.vehicles.find((v) => v.id === engine.player.vehicleId) ?? null
            : null;
          mp.sendState({
            x: engine.player.x,
            y: engine.player.y,
            vx: engine.player.vx,
            vy: engine.player.vy,
            angle: engine.player.angle,
            speed: activeVeh ? activeVeh.speed : 0,
            vehicleType: activeVeh ? activeVeh.type : null,
            vehicleColor: activeVeh ? activeVeh.color : '#E11D48',
            character: engine.character,
            weaponId: engine.player.currentWeapon,
            hp: engine.player.hp,
            wantedStars: engine.player.wantedStars,
          });
        }
      }

      scene3d.updateAndRender(engine, remotePlayers, dt, engine.cameraMode);

      hudTimer += dt;
      if (hudTimer >= 0.08) {
        hudTimer = 0;
        setHud(engine.getHudSnapshot());
        const mapCanvas = minimapRef.current;
        if (mapCanvas) {
          const mapCtx = mapCanvas.getContext('2d');
          if (mapCtx) {
            drawMinimapCanvas(mapCtx, engine, remotePlayers, mapCanvas.width, mapCanvas.height);
          }
        }
      }
    });

    return () => {
      scene3d.dispose();
      scene3dRef.current = null;
    };
  }, []);

  const handleStartGame = () => {
    engineRef.current?.reset(character);
    scene3dRef.current?.syncCharacterModel(character);
    mpRef.current?.connect(playerCallsign, roomCode, character);
    if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
    setGameState('PLAYING');
  };

  const handleRestart = () => {
    inputRef.current.up = false;
    inputRef.current.down = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.shoot = false;
    inputRef.current.nitro = false;
    inputRef.current.handbrake = false;
    inputRef.current.joyX = 0;
    inputRef.current.joyY = 0;
    engineRef.current?.reset(character);
    scene3dRef.current?.syncCharacterModel(character);
    mpRef.current?.connect(playerCallsign, roomCode, character);
    if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
    setGameState('PLAYING');
  };

  const handleSaveScore = async (playerName: string) => {
    const snapshot = engineRef.current?.getHudSnapshot() ?? hud;
    try {
      const res = await fetch('/api/game/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName,
          character: character === 'lucia' ? 'Lucía' : 'Jason',
          cash: snapshot.cash,
          missionsCompleted: snapshot.missionsCompleted,
          maxStars: snapshot.maxStarsReached,
          platform: effectiveMobile ? 'mobile' : 'desktop',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.entries)) setLeaderboard(data.entries);
      }
    } catch {
      // Ignore network error
    }
  };

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#090D16] select-none touch-none">
      <div
        ref={mountRef}
        onContextMenu={(e) => e.preventDefault()}
        onMouseMove={(e) => {
          inputRef.current.mouseX = e.clientX;
          inputRef.current.mouseY = e.clientY;
          inputRef.current.mouseActive = true;
          if (rightDragRef.current.active && gameState === 'PLAYING') {
            const dx = e.clientX - rightDragRef.current.lastX;
            const dy = e.clientY - rightDragRef.current.lastY;
            rightDragRef.current.lastX = e.clientX;
            rightDragRef.current.lastY = e.clientY;
            scene3dRef.current?.adjustOrbit(dx * 0.0055, dy * 0.004);
          }
        }}
        onMouseDown={(e) => {
          if (e.button === 0 && !effectiveMobile && gameState === 'PLAYING') {
            inputRef.current.shoot = true;
          } else if (e.button === 2 && !effectiveMobile && gameState === 'PLAYING') {
            rightDragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
          }
        }}
        onMouseUp={(e) => {
          if (e.button === 0 && !effectiveMobile) inputRef.current.shoot = false;
          if (e.button === 2) rightDragRef.current.active = false;
        }}
        onMouseLeave={() => {
          rightDragRef.current.active = false;
        }}
        onWheel={(e) => {
          if (gameState === 'PLAYING' && !realExplorerOpen && !storyOpen) {
            scene3dRef.current?.adjustZoom(e.deltaY * 0.0007);
          }
        }}
        onPointerDown={(e) => {
          if (
            effectiveMobile &&
            e.pointerType === 'touch' &&
            gameState === 'PLAYING' &&
            touchOrbitRef.current.pointerId === null
          ) {
            touchOrbitRef.current = {
              pointerId: e.pointerId,
              lastX: e.clientX,
              lastY: e.clientY,
            };
          }
        }}
        onPointerMove={(e) => {
          if (
            effectiveMobile &&
            touchOrbitRef.current.pointerId === e.pointerId &&
            gameState === 'PLAYING'
          ) {
            const dx = e.clientX - touchOrbitRef.current.lastX;
            const dy = e.clientY - touchOrbitRef.current.lastY;
            touchOrbitRef.current.lastX = e.clientX;
            touchOrbitRef.current.lastY = e.clientY;
            scene3dRef.current?.adjustOrbit(dx * 0.006, dy * 0.0045);
          }
        }}
        onPointerUp={(e) => {
          if (touchOrbitRef.current.pointerId === e.pointerId) {
            touchOrbitRef.current.pointerId = null;
          }
        }}
        onPointerCancel={(e) => {
          if (touchOrbitRef.current.pointerId === e.pointerId) {
            touchOrbitRef.current.pointerId = null;
          }
        }}
        className="w-full h-full cursor-crosshair"
      />

      {gameState !== 'TITLE_MENU' && (
        <GameHud
          hud={hud}
          isMobile={effectiveMobile}
          muted={muted}
          mpConnected={mpConnected}
          onlineCount={onlineCount}
          roomId={activeRoomId}
          chatMessages={chatMessages}
          minimapRef={minimapRef}
          onToggleMute={() => {
            const next = !muted;
            setMuted(next);
            soundEngine.setMuted(next);
          }}
          onCycleCamera={() => {
            engineRef.current?.cycleCameraMode();
            if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
          }}
          onOpenGarage={() => setGameState('GARAGE')}
          onOpenStory={() => setStoryOpen(true)}
          onOpenRealExplorer={(buildingId) => {
            setRealExplorerBuildingId(buildingId ?? hud.nearBuildingId ?? null);
            setRealExplorerOpen(true);
          }}
          onPause={() => setGameState('PAUSED')}
          onServiceAction={() => engineRef.current?.triggerServiceAction()}
          onEquipWeapon={(wid) => {
            engineRef.current?.equipWeapon(wid);
            if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
          }}
          onSendChat={(txt) => mpRef.current?.sendChat(txt)}
        />
      )}

      {gameState === 'PLAYING' && hud.activeDialogue && !realExplorerOpen && !storyOpen && (
        <StoryDialogueBar
          dialogue={hud.activeDialogue}
          isMobile={effectiveMobile}
          onAdvance={() => {
            engineRef.current?.advanceDialogue();
            if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
          }}
          onSkip={() => {
            engineRef.current?.skipDialogue();
            if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
          }}
        />
      )}

      {gameState === 'PLAYING' && effectiveMobile && !realExplorerOpen && !storyOpen && (
        <MobileControls
          inVehicle={Boolean(hud.vehicleName)}
          canEnterVehicle={Boolean(hud.nearVehicleName)}
          nearServiceLabel={hud.nearServiceZone}
          currentWeapon={hud.currentWeapon}
          headlightsOn={hud.headlightsOn}
          onJoystickChange={(x, y) => {
            inputRef.current.joyX = x;
            inputRef.current.joyY = y;
          }}
          onShootChange={(active) => {
            inputRef.current.shoot = active;
          }}
          onNitroChange={(active) => {
            inputRef.current.nitro = active;
          }}
          onHandbrakeChange={(active) => {
            inputRef.current.handbrake = active;
          }}
          onDash={() => engineRef.current?.triggerDash()}
          onToggleHeadlights={() => {
            engineRef.current?.toggleHeadlights();
            if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
          }}
          onToggleVehicle={() => engineRef.current?.toggleVehicle()}
          onCycleWeapon={() => {
            engineRef.current?.cycleWeapon();
            if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
          }}
          onHorn={() => engineRef.current?.honkHorn()}
          onServiceAction={() => engineRef.current?.triggerServiceAction()}
        />
      )}

      <GameModals
        gameState={gameState}
        character={character}
        controlMode={controlMode}
        effectiveMobile={effectiveMobile}
        playerCallsign={playerCallsign}
        roomCode={roomCode}
        hud={hud}
        upgrades={engineRef.current?.upgrades ?? { turboLevel: 0, armorLevel: 0, weaponLevel: 0 }}
        leaderboard={leaderboard}
        onChangeCallsign={setPlayerCallsign}
        onChangeRoomCode={setRoomCode}
        onSelectCharacter={setCharacter}
        onSelectControlMode={setControlMode}
        onStartGame={handleStartGame}
        onResume={() => setGameState('PLAYING')}
        onRestart={handleRestart}
        onCloseGarage={() => setGameState('PLAYING')}
        onBuyUpgrade={(kind) => {
          const res = engineRef.current?.buyUpgrade(kind) ?? null;
          if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
          return res;
        }}
        onBuyOrEquipWeapon={(wid) => {
          const res = engineRef.current?.buyWeapon(wid) ?? null;
          if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
          return res;
        }}
        onSelectScenario={(scenarioId) => {
          engineRef.current?.startBuildingMission(scenarioId);
          if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
        }}
        onSaveScore={handleSaveScore}
      />

      <PortoRealModal
        open={realExplorerOpen}
        initialBuildingId={realExplorerBuildingId}
        onClose={() => setRealExplorerOpen(false)}
        onNavigateToBuilding={(buildingId) => {
          engineRef.current?.focusBuildingWaypoint(buildingId);
          if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
        }}
      />

      <StoryCampaignModal
        open={storyOpen}
        currentChapter={hud.storyChapter}
        completedChapters={hud.completedChapters}
        onClose={() => setStoryOpen(false)}
        onSelectChapter={(chapterNum) => {
          engineRef.current?.startStoryChapter(chapterNum);
          if (engineRef.current) setHud(engineRef.current.getHudSnapshot());
        }}
      />
    </div>
  );
}
