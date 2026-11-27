import { soundEngine } from './audio.ts';
import { PROFESSIONS, PROFESSION_MISSIONS } from './professions.ts';
import {
  getStoryChapterByNumber,
  getStoryChapterByScenario,
} from './storyData.ts';
import type {
  ActiveLandmarkActivity,
  Bullet,
  CameraMode,
  CharacterId,
  EmergencyPing,
  EnemyGuard,
  HudSnapshot,
  InputState,
  Mission,
  MissionScenarioId,
  Particle,
  Pedestrian,
  Pickup,
  PlayerState,
  ProfessionId,
  PspTargetInfo,
  RemotePlayer,
  SkidMark,
  StoryDialogueSnapshot,
  StoryLine,
  UpgradeState,
  Vehicle,
  VehicleType,
  WeaponId,
  LifeAction,
  LifeJobId,
  LifeLocation,
  LifeLocationKind,
  LifeSimulationSnapshot,
} from './types.ts';
import { WEAPONS, WEAPON_ORDER } from './weapons.ts';
import { getInteriorTask } from './interiorTasks.ts';
import {
  advanceLifeSimulation,
  createInitialLifeSimulation,
  loadLifeSave,
  performLifeAction,
  saveLifeSave,
  selectLifeJob,
} from './lifeSimulation.ts';
import {
  BUILDINGS,
  HORIZONTAL_ROADS,
  LIFE_LOCATIONS,
  MISSION_WAYPOINTS,
  RIVER_START_X,
  SERVICE_ZONES,
  VERTICAL_ROADS,
  WORLD_H,
  WORLD_W,
  clampToPortoLand,
  resolveCircleRectCollision,
} from './world.ts';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function makeVehicle(
  id: string,
  type: VehicleType,
  x: number,
  y: number,
  angle: number,
  aiDriven: boolean,
  customColor?: string,
): Vehicle {
  if (type === 'coupe') {
    return {
      id,
      type,
      name: 'Coupé Boavista GT',
      x,
      y,
      vx: 0,
      vy: 0,
      angle,
      speed: 0,
      maxSpeed: 560,
      accel: 540,
      turnSpeed: 3.1,
      color: customColor ?? '#4F46E5',
      width: 48,
      height: 24,
      hp: 125,
      maxHp: 125,
      isPolice: false,
      sirenActive: false,
      aiDriven,
      aiTimer: 0,
      aiTargetAngle: angle,
      sirenPhase: 0,
      fireCooldown: 0,
    };
  }
  if (type === 'muscle') {
    return {
      id,
      type,
      name: customColor === '#F8FAFC' ? 'Viatura Médica INEM' : 'Clássico Ribeira V8',
      x,
      y,
      vx: 0,
      vy: 0,
      angle,
      speed: 0,
      maxSpeed: 520,
      accel: 490,
      turnSpeed: 2.85,
      color: customColor ?? '#D97706',
      width: 50,
      height: 25,
      hp: 150,
      maxHp: 150,
      isPolice: false,
      sirenActive: false,
      aiDriven,
      aiTimer: 0,
      aiTargetAngle: angle,
      sirenPhase: 0,
      fireCooldown: 0,
    };
  }
  if (type === 'buggy') {
    return {
      id,
      type,
      name: 'Carrinha Douro Expresso',
      x,
      y,
      vx: 0,
      vy: 0,
      angle,
      speed: 0,
      maxSpeed: 480,
      accel: 520,
      turnSpeed: 3.4,
      color: customColor ?? '#D97706',
      width: 44,
      height: 24,
      hp: 115,
      maxHp: 115,
      isPolice: false,
      sirenActive: false,
      aiDriven,
      aiTimer: 0,
      aiTargetAngle: angle,
      sirenPhase: 0,
      fireCooldown: 0,
    };
  }
  if (type === 'police') {
    return {
      id,
      type,
      name: 'Viatura PSP Porto',
      x,
      y,
      vx: 0,
      vy: 0,
      angle,
      speed: 0,
      maxSpeed: 550,
      accel: 510,
      turnSpeed: 3.05,
      color: '#F8FAFC',
      width: 50,
      height: 25,
      hp: 140,
      maxHp: 140,
      isPolice: true,
      sirenActive: false,
      aiDriven,
      aiTimer: 0,
      aiTargetAngle: angle,
      sirenPhase: 0,
      fireCooldown: 0,
    };
  }
  return {
    id,
    type: 'taxi',
    name: 'Táxi do Porto',
    x,
    y,
    vx: 0,
    vy: 0,
    angle,
    speed: 0,
    maxSpeed: 465,
    accel: 430,
    turnSpeed: 2.8,
    color: customColor ?? '#18181B',
    width: 48,
    height: 24,
    hp: 120,
    maxHp: 120,
    isPolice: false,
    sirenActive: false,
    aiDriven,
    aiTimer: 0,
    aiTargetAngle: angle,
    sirenPhase: 0,
    fireCooldown: 0,
  };
}

export class LeonidaEngine {
  public player: PlayerState;
  public character: CharacterId;
  public upgrades: UpgradeState;
  public vehicles: Vehicle[] = [];
  public bullets: Bullet[] = [];
  public pickups: Pickup[] = [];
  public particles: Particle[] = [];
  public skidMarks: SkidMark[] = [];
  public pedestrians: Pedestrian[] = [];
  public guards: EnemyGuard[] = [];
  public mission: Mission;
  public activeActivity: ActiveLandmarkActivity | null = null;
  public emergencyPings: EmergencyPing[] = [];
  public life: LifeSimulationSnapshot = createInitialLifeSimulation();

  public camX = 1640;
  public camY = 880;
  public dayTime = 0.68; // Golden Porto late afternoon
  public screenShake = 0;
  public cameraMode: CameraMode = 'chase';
  public headlightsOn = true;

  private bulletSeq = 0;
  private driftCashAccum = 0;
  private completedChapters = new Set<number>();
  private dialogueQueue: StoryLine[] = [];
  private dialogueIndex = 0;
  private dialogueChapterNum = 1;
  private dialogueChapterTitle = '';
  private toastText: string | null = null;
  private toastTimer = 0;
  private ambientNpcDialogue: import('./types.ts').AmbientNpcDialogue | null = null;
  private ambientNpcDialogueTimer = 0;
  private ambientNpcCooldown = 5;
  private ambientNpcEasterEggUsed = false;
  private missionCounter = 1;
  private autoPromptedMissionId = '';
  private speedAlertCooldown = 0;
  private crashPenaltyCooldown = 0;
  private lifeSaveAccumulator = 0;
  private latestRemotePlayers = new Map<string, RemotePlayer>();
  private onGameOver: () => void;
  private onOpenGarage: () => void;

  public onLocalFire?: (weaponId: WeaponId, x: number, y: number, angle: number) => void;
  public onRemoteHit?: (targetId: string, damage: number) => void;
  public onSendPspAction?: (
    targetId: string,
    actionKind: 'warn' | 'fine',
    fineAmount: number,
    reason: string,
  ) => void;
  public onSendEmergencyCall?: (
    kind: 'speed' | '112',
    x: number,
    y: number,
    label: string,
    speedKmh?: number,
  ) => void;

  constructor(
    character: CharacterId,
    profession: ProfessionId,
    onGameOver: () => void,
    onOpenGarage: () => void,
  ) {
    this.character = character;
    this.onGameOver = onGameOver;
    this.onOpenGarage = onOpenGarage;
    this.upgrades = {
      turboLevel: 0,
      armorLevel: 0,
      weaponLevel: 0,
    };
    this.player = this.createInitialPlayer(character, profession);
    const savedLife = loadLifeSave();
    if (savedLife) {
      this.life = savedLife.life;
      this.player.cash = savedLife.cash;
    }
    this.mission = this.buildProfessionMission(profession, 1);
    this.queueChapterDialogue(this.mission.chapterNumber, 'intro');
    this.seedWorld();
  }

  private createInitialPlayer(char: CharacterId, prof: ProfessionId): PlayerState {
    const startArmor = char === 'jason' ? 60 : 40;
    return {
      x: 1640,
      y: 940,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      hp: 100,
      maxHp: 100,
      armor: startArmor,
      maxArmor: 100,
      nitro: 100,
      cash: 650,
      wantedStars: 0,
      wantedDecayTimer: 0,
      maxStarsReached: 0,
      profession: prof,
      onDuty: true,
      drivingPoints: 12,
      reputation: 10,
      vehicleId: null,
      fireCooldown: 0,
      dashCooldown: 0,
      dashTimer: 0,
      comboMultiplier: 1,
      comboTimer: 0,
      missionsCompleted: 0,
      invulnTimer: 0,
      currentWeapon: 'pistol',
      unlockedWeapons: ['pistol'],
    };
  }

  public reset(character: CharacterId, profession: ProfessionId = this.player.profession) {
    this.character = character;
    this.upgrades = { turboLevel: 0, armorLevel: 0, weaponLevel: 0 };
    this.player = this.createInitialPlayer(character, profession);
    const savedLife = loadLifeSave();
    this.life = savedLife?.life ?? createInitialLifeSimulation();
    if (savedLife) this.player.cash = savedLife.cash;
    this.lifeSaveAccumulator = 0;
    this.vehicles = [];
    this.bullets = [];
    this.pickups = [];
    this.particles = [];
    this.skidMarks = [];
    this.pedestrians = [];
    this.guards = [];
    this.activeActivity = null;
    this.emergencyPings = [];
    this.ambientNpcDialogue = null;
    this.ambientNpcDialogueTimer = 0;
    this.ambientNpcCooldown = 5;
    this.ambientNpcEasterEggUsed = false;
    this.driftCashAccum = 0;
    this.headlightsOn = true;
    this.completedChapters.clear();
    this.missionCounter = 1;
    this.autoPromptedMissionId = '';
    this.speedAlertCooldown = 0;
    this.crashPenaltyCooldown = 0;
    this.mission = this.buildProfessionMission(profession, 1);
    this.queueChapterDialogue(this.mission.chapterNumber, 'intro');
    this.camX = this.player.x;
    this.camY = this.player.y;
    const profDef = PROFESSIONS[profession];
    this.toastText = `Turno iniciado como ${profDef.title} no Porto!`;
    this.toastTimer = 4.0;
    this.seedWorld();
  }

  private seedWorld() {
    const profDef = PROFESSIONS[this.player.profession];
    // Service vehicle parked right beside the player on Avenida dos Aliados
    this.vehicles.push(
      makeVehicle(
        `veh-service-${this.player.profession}`,
        profDef.vehicleType,
        1690,
        955,
        -Math.PI / 2,
        false,
        profDef.vehicleColor,
      ),
      makeVehicle('veh-hero-1', 'coupe', 1590, 965, -Math.PI / 2, false, '#E11D48'),
      makeVehicle('veh-hero-2', 'muscle', 2350, 1560, 0, false),
      makeVehicle('veh-hero-3', 'buggy', 955, 845, 0, false),
      makeVehicle('veh-hero-5', 'taxi', 2980, 1480, Math.PI, false),
    );

    // Civilian Porto traffic ONLY — zero AI police cars
    const trafficTypes: VehicleType[] = ['taxi', 'muscle', 'coupe', 'taxi', 'buggy'];
    for (let i = 0; i < 10; i++) {
      const horiz = i % 2 === 0;
      const roadCoord = horiz
        ? HORIZONTAL_ROADS[i % HORIZONTAL_ROADS.length]
        : VERTICAL_ROADS[i % (VERTICAL_ROADS.length - 1)];
      const x = horiz ? 340 + i * 185 : roadCoord + 36;
      const y = horiz ? roadCoord + 36 : 340 + i * 160;
      const angle = horiz ? 0 : Math.PI / 2;
      this.vehicles.push(
        makeVehicle(
          `veh-traffic-${i}`,
          trafficTypes[i % trafficTypes.length],
          clamp(x, 160, RIVER_START_X - 80),
          clamp(y, 160, WORLD_H - 160),
          angle,
          true,
        ),
      );
    }

    this.spawnInitialPickups();

    const shirtColors = ['#E11D48', '#0284C7', '#D97706', '#E2E8F0', '#059669'];
    for (let i = 0; i < 24; i++) {
      const wp = MISSION_WAYPOINTS[i % MISSION_WAYPOINTS.length];
      this.pedestrians.push({
        id: `ped-${i}`,
        x: clamp(wp.x + (Math.random() - 0.5) * 160, 100, WORLD_W - 100),
        y: clamp(wp.y + (Math.random() - 0.5) * 160, 100, WORLD_H - 100),
        angle: Math.random() * Math.PI * 2,
        speed: 42 + Math.random() * 24,
        shirtColor: shirtColors[i % shirtColors.length],
        panicTimer: 0,
      });
    }
  }

  private spawnInitialPickups() {
    const kinds: Pickup['kind'][] = ['cash', 'medkit', 'armor', 'nitro'];
    for (let i = 0; i < 14; i++) {
      const wp = MISSION_WAYPOINTS[i % MISSION_WAYPOINTS.length];
      const kind = kinds[i % kinds.length];
      this.pickups.push({
        id: `pk-${i}-${Date.now()}`,
        kind,
        x: wp.x + (i % 2 === 0 ? 55 : -55),
        y: wp.y + (i % 3 === 0 ? 45 : -45),
        value: kind === 'cash' ? 120 : kind === 'medkit' ? 35 : kind === 'armor' ? 40 : 50,
        bobPhase: i * 0.9,
      });
    }
  }

  private buildProfessionMission(
    profession: ProfessionId,
    index: number,
  ): Mission {
    const templates = PROFESSION_MISSIONS[profession];
    const templateIndex = (Math.max(1, index) - 1) % templates.length;
    const tpl = templates[templateIndex];

    const src = BUILDINGS.find((b) => b.id === tpl.sourceId) ?? BUILDINGS[0];
    const dst = BUILDINGS.find((b) => b.id === tpl.destId) ?? BUILDINGS[1];
    const ch = getStoryChapterByScenario(tpl.scenarioId);

    return {
      id: `mis-${profession}-${index}-${Date.now().toString(36)}`,
      scenarioId: tpl.scenarioId,
      chapterNumber: ch.chapterNumber,
      profession,
      title: tpl.title,
      description: tpl.goText,
      type: profession === 'courier' || profession === 'taxi' ? 'delivery' : 'infiltration',
      stage: 'go_to_building',
      sourceBuildingId: src.id,
      sourceBuildingName: src.label,
      destBuildingId: dst.id,
      destBuildingName: dst.label,
      targetX: src.entranceX,
      targetY: src.entranceY,
      simLabel: src.simActionLabel,
      simProgress: 0,
      simDuration: 1,
      rewardCash: tpl.rewardCash + (index - 1) * 45,
      miniGameKind: tpl.miniGameKind,
      miniGameTitle: tpl.miniGameTitle,
      miniGameSubtitle: tpl.miniGameSubtitle,
      npcName: tpl.npcName,
      npcRole: tpl.npcRole,
      npcColor: tpl.npcColor,
      npcGreeting: tpl.npcGreeting,
      npcOptions: tpl.npcOptions,
      activityCompleted: false,
    };
  }

  public setProfession(prof: ProfessionId, spawnCar = true) {
    this.player.profession = prof;
    this.player.onDuty = true;
    this.player.wantedStars = 0;
    this.activeActivity = null;
    this.guards = [];
    this.autoPromptedMissionId = '';

    const def = PROFESSIONS[prof];
    if (spawnCar) {
      this.spawnProfessionVehicle(false);
    }

    this.missionCounter += 1;
    this.mission = this.buildProfessionMission(prof, this.missionCounter);
    this.queueChapterDialogue(this.mission.chapterNumber, 'intro');
    soundEngine.playPickup();
    this.showToast(`Profissão ativa: ${def.title}`, 3.2);
  }

  public setLifeJob(job: LifeJobId) {
    this.life = selectLifeJob(this.life, job);
    saveLifeSave(this.life, this.player.cash);
    this.showToast(`Atividade profissional selecionada: ${job}.`, 2.5);
  }

  public performLifeAction(action: LifeAction, locationKind: LifeLocationKind | null = null) {
    const acceptedContract = action === 'work_shift' && this.life.activeLifeContractId
      ? this.life.lifeContracts.find((contract) => contract.id === this.life.activeLifeContractId) ?? null
      : null;
    const result = performLifeAction(this.life, this.player.cash, action, locationKind);
    if (!result.ok) {
      this.showToast(result.message, 3.2);
      return result;
    }

    this.life = result.life;
    this.player.cash = result.cash;
    let message = result.message;

    if (acceptedContract && acceptedContract.job === this.life.job && acceptedContract.workplace === locationKind) {
      const previousRelationship = this.life.npcRelationships[acceptedContract.residentId] ?? 0;
      const contractRelationship = clamp(previousRelationship + 6);
      this.life = {
        ...this.life,
        bankBalance: this.life.bankBalance + acceptedContract.reward,
        completedLifeContracts: this.life.completedLifeContracts + 1,
        activeLifeContractId: null,
        lifeContracts: this.life.lifeContracts.filter((contract) => contract.id !== acceptedContract.id),
        cityDemand: {
          ...this.life.cityDemand,
          [acceptedContract.workplace]: clamp((this.life.cityDemand[acceptedContract.workplace] ?? 50) - 5, 0, 100),
        },
        npcRelationships: {
          ...this.life.npcRelationships,
          [acceptedContract.residentId]: contractRelationship,
        },
      };
      this.player.reputation += 4;
      message += ` Contrato concluído: +${acceptedContract.reward} € no banco. Relação com o cliente: ${contractRelationship}/100.`;
    }

    saveLifeSave(this.life, this.player.cash);
    this.showToast(message, 3.6);
    return { ...result, message, life: this.life, cash: this.player.cash };
  }

  public acceptLifeContract(contractId: string) {
    if (this.life.activeLifeContractId) {
      this.showToast('Já tens um contrato ativo. Conclui-o ou cancela-o antes de aceitar outro.', 3);
      return;
    }
    const contract = this.life.lifeContracts.find((item) => item.id === contractId);
    if (!contract || contract.expiresOnDay < this.life.day) {
      this.showToast('Este contrato já não está disponível. Consulta as novas oportunidades.', 3);
      return;
    }
    if (contract.job !== this.life.job) {
      this.showToast('Seleciona primeiro a atividade profissional exigida pelo contrato.', 3);
      return;
    }
    this.life = { ...this.life, activeLifeContractId: contract.id };
    saveLifeSave(this.life, this.player.cash);
    this.showToast(`Contrato aceite: ${contract.title}. Vai trabalhar no local indicado.`, 3.2);
  }

  public cancelLifeContract() {
    const activeId = this.life.activeLifeContractId;
    if (!activeId) return;
    const contract = this.life.lifeContracts.find((item) => item.id === activeId);
    this.life = {
      ...this.life,
      activeLifeContractId: null,
      lifeContracts: this.life.lifeContracts.filter((item) => item.id !== activeId),
    };
    saveLifeSave(this.life, this.player.cash);
    this.showToast(contract ? `Contrato cancelado: ${contract.title}.` : 'Contrato cancelado.', 2.8);
  }

  public completeInteriorTask(
    locationKind: LifeLocationKind,
    taskId: string,
  ): { ok: boolean; message: string } {
    if (this.player.vehicleId) {
      return { ok: false, message: 'Sai do veículo antes de executar uma tarefa.' };
    }
    const currentLocation = this.findNearestLifeLocation(150);
    if (!currentLocation || currentLocation.kind !== locationKind) {
      return { ok: false, message: 'Não estás no local correspondente a esta tarefa.' };
    }
    const task = getInteriorTask(locationKind, taskId);
    if (!task) {
      return { ok: false, message: 'Esta tarefa não está disponível neste espaço.' };
    }
    if (this.life.completedInteriorTasks.includes(task.id)) {
      return { ok: false, message: 'Esta tarefa já foi concluída hoje. Volta amanhã.' };
    }
    if (task.requiredJob && this.life.job !== task.requiredJob) {
      const jobNames: Record<LifeJobId, string> = {
        barista: 'empregado de café',
        retail: 'comércio',
        courier: 'estafeta',
        gardener: 'jardinagem',
        construction: 'construção',
      };
      return {
        ok: false,
        message: 'Esta tarefa exige a profissão de ' + jobNames[task.requiredJob] + '.',
      };
    }
    if (task.energyCost > 0 && this.life.energy < task.energyCost) {
      return { ok: false, message: 'Estás demasiado cansado para concluir esta tarefa. Descansa primeiro.' };
    }

    let nextLife = this.life;
    let nextCash = this.player.cash;
    if (task.lifeAction) {
      const result = performLifeAction(this.life, this.player.cash, task.lifeAction, locationKind);
      if (!result.ok) {
        this.showToast(result.message, 3);
        return { ok: false, message: result.message };
      }
      nextLife = result.life;
      nextCash = result.cash;
    } else {
      nextLife = advanceLifeSimulation(this.life, task.durationMinutes);
      nextLife = {
        ...nextLife,
        energy: clamp(nextLife.energy - task.energyCost),
        mood: clamp(nextLife.mood + 2),
        jobExperience: task.requiredJob ? nextLife.jobExperience + 1 : nextLife.jobExperience,
      };
      nextCash += task.cashReward;
    }

    // A task is only committed after its gameplay effects have succeeded.
    nextLife = {
      ...nextLife,
      completedInteriorTasks: [...nextLife.completedInteriorTasks, task.id],
    };
    this.life = nextLife;
    this.player.cash = nextCash;
    saveLifeSave(this.life, this.player.cash);
    soundEngine.playPickup();
    this.showToast(task.successMessage + (task.cashReward > 0 ? ' +' + task.cashReward + ' €.' : ''), 3.2);
    return {
      ok: true,
      message: task.successMessage + (task.cashReward > 0 ? ' Recebeste ' + task.cashReward + ' €.' : ''),
    };
  }

  public toggleDuty() {
    this.player.onDuty = !this.player.onDuty;
    const label = PROFESSIONS[this.player.profession].shortTitle;
    this.showToast(
      this.player.onDuty ? `${label}: Em Serviço no Porto` : `${label}: Fora de Serviço`,
      2.4,
    );
  }

  public spawnProfessionVehicle(notify = true) {
    const def = PROFESSIONS[this.player.profession];
    const clamped = clampToPortoLand(this.player.x + 56, this.player.y + 38, this.player.x, 26);
    // Reuse existing personal service vehicle if not currently driving it
    const existing = this.vehicles.find((v) => v.id === `veh-service-${this.player.profession}`);
    if (existing && existing.id !== this.player.vehicleId) {
      existing.x = clamped.x;
      existing.y = clamped.y;
      existing.hp = existing.maxHp;
      existing.speed = 0;
      existing.vx = 0;
      existing.vy = 0;
      existing.aiDriven = false;
    } else {
      const car = makeVehicle(
        `veh-service-${this.player.profession}-${Date.now().toString(36)}`,
        def.vehicleType,
        clamped.x,
        clamped.y,
        this.player.angle,
        false,
        def.vehicleColor,
      );
      this.vehicles.push(car);
    }
    if (notify) {
      soundEngine.playMissionComplete();
      this.showToast(`${def.vehicleLabel} entregue ao seu lado!`, 2.6);
    }
  }

  private queueChapterDialogue(chapterNumber: number, phase: 'intro' | 'mid' | 'outro') {
    const ch = getStoryChapterByNumber(chapterNumber);
    const lines =
      phase === 'intro' ? ch.introLines : phase === 'mid' ? ch.midLines : ch.outroLines;
    if (lines.length === 0) return;
    this.dialogueQueue = [...lines];
    this.dialogueIndex = 0;
    this.dialogueChapterNum = ch.chapterNumber;
    this.dialogueChapterTitle = ch.title;
  }

  public advanceDialogue() {
    if (this.dialogueQueue.length === 0) return;
    this.dialogueIndex += 1;
    if (this.dialogueIndex >= this.dialogueQueue.length) {
      this.dialogueQueue = [];
      this.dialogueIndex = 0;
    }
  }

  public skipDialogue() {
    this.dialogueQueue = [];
    this.dialogueIndex = 0;
  }

  public startStoryChapter(chapterNumber: number) {
    const ch = getStoryChapterByNumber(chapterNumber);
    this.guards = [];
    this.activeActivity = null;
    this.autoPromptedMissionId = '';
    this.missionCounter += 1;
    this.mission = this.buildProfessionMission(
      this.player.profession,
      this.missionCounter,
      ch.scenarioId,
    );
    this.queueChapterDialogue(ch.chapterNumber, 'intro');
    this.showToast(`${ch.title} · ${ch.subtitle}`, 3.2);
  }

  public startBuildingMission(scenarioId: MissionScenarioId) {
    const ch = getStoryChapterByScenario(scenarioId);
    this.guards = [];
    this.activeActivity = null;
    this.autoPromptedMissionId = '';
    this.missionCounter += 1;
    this.mission = this.buildProfessionMission(
      this.player.profession,
      this.missionCounter,
      scenarioId,
    );
    this.queueChapterDialogue(ch.chapterNumber, 'intro');
    this.showToast(`Nova rota: ${this.mission.title}`, 3);
  }

  public startContract(type: Mission['type']) {
    const map: Record<Mission['type'], MissionScenarioId> = {
      heist: 'saobento_bolsa',
      infiltration: 'clerigos_musica',
      delivery: 'bolhao_gaia',
      evade: 'camara_se',
    };
    this.startBuildingMission(map[type] ?? 'saobento_bolsa');
  }

  public openLandmarkActivity() {
    if (this.activeActivity) return;
    const d = dist(this.player.x, this.player.y, this.mission.targetX, this.mission.targetY);
    if (d > 92 || this.mission.stage === 'deliver') {
      this.showToast('Aproxime-se do edifício marcado no GPS para interagir.', 2.2);
      return;
    }

    // Stop vehicle smoothly when starting NPC dialogue
    if (this.player.vehicleId) {
      const v = this.vehicles.find((veh) => veh.id === this.player.vehicleId);
      if (v) {
        v.speed = 0;
        v.vx = 0;
        v.vy = 0;
      }
    }

    this.mission.stage = 'simulate_interior';
    this.activeActivity = {
      id: `act-${this.mission.id}`,
      buildingName: this.mission.sourceBuildingName,
      npcName: this.mission.npcName,
      npcRole: this.mission.npcRole,
      npcColor: this.mission.npcColor,
      greeting: this.mission.npcGreeting,
      options: this.mission.npcOptions,
      miniGameKind: this.mission.miniGameKind,
      miniGameTitle: this.mission.miniGameTitle,
      miniGameSubtitle: this.mission.miniGameSubtitle,
      phase: 'dialogue',
      selectedOptionReply: null,
      bonusCash: 0,
      bonusRep: 0,
      pspTarget:
        this.mission.miniGameKind === 'psp_inspection'
          ? this.findNearestPspTarget() ?? {
              id: 'patrol-local',
              name: 'Condutor Local do Porto',
              isHuman: false,
              speedKmh: 76,
              vehicleName: 'Táxi do Porto',
              distanceMeters: 8,
              drivingPoints: 10,
              hasValidInsurance: true,
            }
          : undefined,
    };
  }

  public chooseNpcOption(optionIndex: number) {
    if (!this.activeActivity) return;
    const opt = this.activeActivity.options[optionIndex];
    if (!opt) return;
    this.activeActivity.phase = 'minigame';
    this.activeActivity.selectedOptionReply = opt.reply;
    this.activeActivity.bonusCash = opt.cashBonus;
    this.activeActivity.bonusRep = opt.repBonus;
    this.activeActivity.selectedOptionMemory = opt.memoryTag ?? 'friendly-chat';
    this.activeActivity.selectedRelationshipDelta = opt.relationshipDelta;
    soundEngine.playPickup();
  }

  public cancelLandmarkActivity() {
    this.activeActivity = null;
  }

  public completeLandmarkActivity(
    performanceMul: number,
    pspDecision?: { action: 'clear' | 'warn' | 'fine'; amount: number },
  ) {
    const act = this.activeActivity;
    if (!act) return;
    this.activeActivity = null;

    const perf = clamp(performanceMul, 0.5, 1.5);

    if (act.id.startsWith('life-location-')) {
      const baseSocialGain = Math.max(2, Math.round(act.bonusRep * perf));
      const location = LIFE_LOCATIONS.find((item) => act.id.startsWith(`life-location-${item.id}-`));
      const relationshipDelta = act.selectedRelationshipDelta ?? Math.max(1, Math.round(baseSocialGain * 0.8));
      const socialGain = relationshipDelta < 0 ? 0 : baseSocialGain;
      this.life = advanceLifeSimulation(this.life, 10);
      this.life.socialProgress = clamp(this.life.socialProgress + socialGain);
      this.life.mood = clamp(this.life.mood + (relationshipDelta < 0 ? -8 : 5 + act.bonusRep));
      if (location) {
        const previous = this.life.npcRelationships[location.id] ?? 0;
        const relationshipScore = clamp(previous + relationshipDelta);
        this.life.npcRelationships = { ...this.life.npcRelationships, [location.id]: relationshipScore };
        const topic = act.selectedOptionMemory ?? 'friendly-chat';
        const memories = this.life.npcMemories[location.id] ?? [];
        this.life.npcMemories = { ...this.life.npcMemories, [location.id]: [...memories.filter((tag) => tag !== topic), topic].slice(-12) };
      }
      const cashBonus = Math.round(act.bonusCash * perf);
      this.player.cash += cashBonus;
      this.player.reputation += socialGain;
      saveLifeSave(this.life, this.player.cash);
      soundEngine.playPickup();
      const score = location ? this.life.npcRelationships[location.id] ?? 0 : 0;
      const outcome = relationshipDelta < 0 ? 'Criaste tensão na conversa' : 'A relação evoluiu';
      this.showToast(location ? `${outcome} com ${act.npcName}: ${score}/100 · Rede social +${socialGain}.` : `Conversaste com ${act.npcName}. Rede social +${socialGain}.`, 3.4);
      return;
    }

    // Standalone PSP stop OR PSP mission activity
    if (act.miniGameKind === 'psp_inspection' && act.pspTarget) {
      const target = act.pspTarget;
      const decision = pspDecision ?? { action: 'clear', amount: 0 };

      if (target.isHuman && decision.action !== 'clear') {
        const reason =
          target.speedKmh > 95
            ? `Excesso de velocidade (${target.speedKmh} km/h)`
            : !target.hasValidInsurance
              ? 'Seguro automóvel em falta'
              : 'Condução preventiva no Porto';
        this.onSendPspAction?.(target.id, decision.action, decision.amount, reason);
      }

      const pspPay = Math.round((220 + act.bonusCash) * perf);
      const pspRep = Math.round(8 + act.bonusRep);
      this.player.cash += pspPay;
      this.player.reputation += pspRep;
      soundEngine.playPickup();

      if (act.id.startsWith('psp-stop-')) {
        const actionMsg =
          decision.action === 'fine'
            ? `Auto registado (€${decision.amount}) a ${target.name}. +€${pspPay}`
            : decision.action === 'warn'
              ? `Aviso educativo emitido a ${target.name}. +€${pspPay}`
              : `Condutor ${target.name} verificado e liberado. +€${pspPay}`;
        this.showToast(actionMsg, 3.2);
        return;
      }
    }

    // Advance profession mission from landmark activity to destination delivery/patrol
    const dst = BUILDINGS.find((b) => b.id === this.mission.destBuildingId) ?? BUILDINGS[0];
    const ch = getStoryChapterByNumber(this.mission.chapterNumber);
    const tpl = PROFESSION_MISSIONS[this.player.profession].find(
      (m) => m.scenarioId === this.mission.scenarioId,
    );

    const immediateBonus = Math.round(act.bonusCash * perf);
    this.player.cash += immediateBonus;
    this.player.reputation += Math.max(4, act.bonusRep);
    this.mission.activityCompleted = true;
    this.mission.stage = 'deliver';
    this.mission.simProgress = 1;
    this.mission.targetX = dst.entranceX;
    this.mission.targetY = dst.entranceY;
    this.mission.description =
      tpl?.deliverText ?? `Siga até ${dst.label} para concluir o serviço.`;
    this.queueChapterDialogue(ch.chapterNumber, 'mid');
    soundEngine.playPickup();
    this.showToast(
      `Tarefa concluída em ${act.buildingName}! (+€${immediateBonus}) Siga para ${dst.label}.`,
      3.4,
    );
  }

  public findNearestPspTarget(
    remotePlayers: Map<string, RemotePlayer> = this.latestRemotePlayers,
  ): PspTargetInfo | null {
    if (this.player.profession !== 'psp' || !this.player.onDuty) return null;

    // 1. Prefer live human multiplayer drivers nearby
    let bestRemote: { rp: RemotePlayer; d: number } | null = null;
    for (const rp of remotePlayers.values()) {
      const d = dist(this.player.x, this.player.y, rp.x, rp.y);
      if (d <= 155 && (!bestRemote || d < bestRemote.d)) {
        bestRemote = { rp, d };
      }
    }

    if (bestRemote) {
      const rp = bestRemote.rp;
      const spd = Math.round(Math.abs(rp.speed) * 0.34);
      return {
        id: rp.id,
        name: rp.name,
        isHuman: true,
        speedKmh: spd,
        vehicleName: rp.vehicleType ? PROFESSIONS[rp.profession]?.vehicleLabel ?? 'Viatura' : 'A pé',
        distanceMeters: Math.max(1, Math.round(bestRemote.d * 0.38)),
        drivingPoints: rp.drivingPoints ?? 12,
        hasValidInsurance: (rp.drivingPoints ?? 12) >= 6,
      };
    }

    // 2. Fallback to nearest civilian AI traffic vehicle for solo patrol practice
    let bestVeh: { v: Vehicle; d: number } | null = null;
    for (const v of this.vehicles) {
      if (v.id === this.player.vehicleId || !v.aiDriven) continue;
      const d = dist(this.player.x, this.player.y, v.x, v.y);
      if (d <= 115 && (!bestVeh || d < bestVeh.d)) {
        bestVeh = { v, d };
      }
    }

    if (bestVeh) {
      const spd = Math.round(Math.abs(bestVeh.v.speed) * 0.34);
      const hash = bestVeh.v.id.charCodeAt(bestVeh.v.id.length - 1) || 7;
      return {
        id: bestVeh.v.id,
        name: `Condutor Civil #${(hash % 89) + 10}`,
        isHuman: false,
        speedKmh: spd,
        vehicleName: bestVeh.v.name,
        distanceMeters: Math.max(1, Math.round(bestVeh.d * 0.38)),
        drivingPoints: 6 + (hash % 7),
        hasValidInsurance: hash % 4 !== 0,
      };
    }

    return null;
  }

  public openPspInspection() {
    if (this.activeActivity) return;
    if (this.player.profession !== 'psp') {
      this.showToast('Apenas agentes da PSP Porto podem efetuar abordagens.', 2.4);
      return;
    }
    const target = this.findNearestPspTarget();
    if (!target) {
      this.showToast('Nenhum veículo próximo para fiscalizar.', 2.2);
      return;
    }

    this.activeActivity = {
      id: `psp-stop-${Date.now()}`,
      buildingName: 'Operação Stop PSP Porto',
      npcName: target.name,
      npcRole: target.isHuman ? 'Jogador Ao Vivo' : 'Condutor Local',
      npcColor: '#38BDF8',
      greeting: `Boa tarde, Sr. Agente. Estou a circular com ${target.vehicleName} a ${target.speedKmh} km/h.`,
      options: [
        {
          label: 'Solicitar carta de condução e seguro obrigatório',
          reply: 'Aqui tem os documentos da viatura, agente.',
          cashBonus: 40,
          repBonus: 6,
        },
      ],
      miniGameKind: 'psp_inspection',
      miniGameTitle: 'Fiscalização Rodoviária PSP',
      miniGameSubtitle: 'Analise a telemetria e escolha Liberar, Aviso ou Coima.',
      phase: 'minigame',
      selectedOptionReply: null,
      bonusCash: 50,
      bonusRep: 6,
      pspTarget: target,
    };
  }

  public callEmergency112() {
    const label = `Pedido 112 junto a ${this.findNearestBuilding()?.label ?? 'Baixa do Porto'}`;
    this.onSendEmergencyCall?.('112', this.player.x, this.player.y, label);
    this.receiveEmergencyPing({
      id: `em-local-${Date.now()}`,
      kind: '112',
      label,
      x: this.player.x,
      y: this.player.y,
      callerName: 'Chamada Local',
      createdAt: Date.now(),
    });
    this.showToast('Alerta 112 enviado para PSP & INEM no Porto!', 3.0);
  }

  public receiveEmergencyPing(ping: EmergencyPing) {
    this.emergencyPings = [
      ping,
      ...this.emergencyPings.filter((p) => p.id !== ping.id),
    ].slice(0, 6);
    if (this.player.profession === 'psp' || this.player.profession === 'paramedic') {
      soundEngine.playHorn();
      this.showToast(`Central 112: ${ping.label} (${ping.callerName})`, 3.5);
    }
  }

  public applyPspNotice(
    officerName: string,
    actionKind: 'warn' | 'fine',
    fineAmount: number,
    reason: string,
  ) {
    if (actionKind === 'fine') {
      const deducted = Math.min(this.player.cash, fineAmount);
      this.player.cash -= deducted;
      this.player.drivingPoints = Math.max(0, this.player.drivingPoints - 2);
      soundEngine.playCrash();
      this.showToast(
        `PSP ${officerName}: Coima €${fineAmount} (-2 pts Carta) · ${reason}`,
        4.2,
      );
    } else {
      soundEngine.playHorn();
      this.showToast(`PSP ${officerName}: Aviso preventivo · ${reason}`, 3.8);
    }
  }

  public toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
    this.showToast(this.headlightsOn ? 'Faróis ligados' : 'Faróis desligados', 1.6);
  }

  public triggerDash() {
    if (this.player.vehicleId || this.player.dashCooldown > 0) return;
    this.player.dashTimer = 0.24;
    this.player.dashCooldown = 1.15;
    this.player.invulnTimer = Math.max(this.player.invulnTimer, 0.28);
    soundEngine.playDoor();
    for (let k = 0; k < 6; k++) {
      const ang = this.player.angle + Math.PI + (Math.random() - 0.5) * 0.9;
      this.spawnParticle(
        this.player.x,
        this.player.y,
        Math.cos(ang) * (60 + Math.random() * 50),
        Math.sin(ang) * (60 + Math.random() * 50),
        0.26,
        3.5,
        '#E2E8F0',
      );
    }
  }

  public showToast(msg: string, seconds = 3) {
    this.toastText = msg;
    this.toastTimer = seconds;
  }

  public cycleCameraMode(): CameraMode {
    const order: CameraMode[] = ['chase', 'cinematic', 'overhead'];
    const next = order[(order.indexOf(this.cameraMode) + 1) % order.length];
    this.cameraMode = next;
    const label =
      next === 'chase'
        ? 'Câmara: 3ª Pessoa'
        : next === 'cinematic'
          ? 'Câmara: Ação Baixa'
          : 'Câmara: Vista Aérea';
    this.showToast(label, 2);
    return next;
  }

  public equipWeapon(weaponId: WeaponId) {
    if (!this.player.unlockedWeapons.includes(weaponId)) {
      this.showToast(`${WEAPONS[weaponId].name} bloqueada! Compre na Garagem.`, 2.2);
      return;
    }
    this.player.currentWeapon = weaponId;
    this.showToast(`Equipado: ${WEAPONS[weaponId].name}`, 1.8);
  }

  public cycleWeapon() {
    const owned = WEAPON_ORDER.filter((w) => this.player.unlockedWeapons.includes(w));
    if (owned.length <= 1) return;
    const idx = owned.indexOf(this.player.currentWeapon);
    const next = owned[(idx + 1) % owned.length];
    this.equipWeapon(next);
  }

  public buyWeapon(weaponId: WeaponId): string | null {
    if (this.player.unlockedWeapons.includes(weaponId)) {
      this.equipWeapon(weaponId);
      return null;
    }
    const def = WEAPONS[weaponId];
    if (this.player.cash < def.cost) {
      return `Precisa de €${def.cost} para desbloquear ${def.name}.`;
    }
    this.player.cash -= def.cost;
    this.player.unlockedWeapons.push(weaponId);
    this.player.currentWeapon = weaponId;
    soundEngine.playPickup();
    this.showToast(`${def.name} desbloqueada!`, 2.5);
    return null;
  }

  public honkHorn() {
    if (!this.player.vehicleId) return;
    const veh = this.vehicles.find((v) => v.id === this.player.vehicleId);
    if (veh && (veh.isPolice || this.player.profession === 'paramedic')) {
      veh.sirenActive = !veh.sirenActive;
      soundEngine.playHorn();
      this.showToast(veh.sirenActive ? 'Sirene de serviço ligada' : 'Sirene desligada', 1.8);
      return;
    }
    soundEngine.playHorn();
    for (const p of this.pedestrians) {
      if (dist(p.x, p.y, this.player.x, this.player.y) < 210) {
        p.angle = Math.atan2(p.y - this.player.y, p.x - this.player.x);
        p.panicTimer = 2.2;
      }
    }
  }

  public spawnRemoteFireEffects(weaponId: WeaponId, x: number, y: number, angle: number) {
    const def = WEAPONS[weaponId] ?? WEAPONS.pistol;
    for (let p = 0; p < def.pellets; p++) {
      const a = angle + (Math.random() - 0.5) * def.spread;
      this.bullets.push({
        id: `rb-${++this.bulletSeq}`,
        x,
        y,
        vx: Math.cos(a) * def.bulletSpeed,
        vy: Math.sin(a) * def.bulletSpeed,
        life: def.life,
        fromPolice: false,
        damage: 0,
        isExplosive: def.isExplosive,
        ownerId: 'remote',
      });
    }
    this.spawnParticle(x, y, Math.cos(angle) * 90, Math.sin(angle) * 90, 0.12, 4, '#FDE047');
  }

  public applyRemoteDamage(damage: number, attackerName: string) {
    this.damagePlayer(damage);
    this.showToast(`Atingido por ${attackerName}!`, 1.8);
  }

  public toggleVehicle() {
    if (this.player.vehicleId) {
      const veh = this.vehicles.find((v) => v.id === this.player.vehicleId);
      if (veh) {
        const nx = veh.x + Math.cos(veh.angle + Math.PI / 2) * 34;
        const ny = veh.y + Math.sin(veh.angle + Math.PI / 2) * 34;
        const clamped = clampToPortoLand(nx, ny, veh.x, 16);
        this.player.x = clamped.x;
        this.player.y = clamped.y;
        veh.speed *= 0.4;
      }
      this.player.vehicleId = null;
      soundEngine.playDoor();
      return;
    }

    const near = this.findNearestVehicle(84);
    if (!near) {
      this.showToast('Nenhum veículo próximo para entrar.', 2);
      return;
    }

    if (near.isPolice && this.player.profession !== 'psp') {
      this.showToast('Esta viatura pertence exclusivamente à PSP Porto.', 2.4);
      return;
    }

    near.aiDriven = false;
    this.player.vehicleId = near.id;
    soundEngine.playDoor();
    this.showToast(`A conduzir: ${near.name}`, 2.2);
  }

  public triggerServiceAction() {
    const zone = this.findNearestServiceZone();
    if (!zone) return;
    if (zone.id === 'pay-n-spray') {
      if (this.player.cash < 120) {
        this.showToast('Precisa de €120 para revisão e pontos da carta.', 2.5);
        return;
      }
      this.player.cash -= 120;
      this.player.drivingPoints = 12;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
      const veh = this.vehicles.find((v) => v.id === this.player.vehicleId);
      if (veh) {
        veh.hp = veh.maxHp;
      }
      soundEngine.playMissionComplete();
      this.showToast('Oficina Aliados: Viatura revista e 12/12 pts na carta!', 3);
    } else if (zone.id === 'garage') {
      this.onOpenGarage();
    }
  }

  public buyUpgrade(kind: 'turbo' | 'armor' | 'weapon' | 'repair' | 'spawn_coupe'): string | null {
    if (kind === 'turbo') {
      const cost = 350 + this.upgrades.turboLevel * 250;
      if (this.upgrades.turboLevel >= 3) return 'Turbo já está no nível máximo.';
      if (this.player.cash < cost) return `Precisa de €${cost} para melhorar o motor.`;
      this.player.cash -= cost;
      this.upgrades.turboLevel += 1;
      soundEngine.playPickup();
      return null;
    }
    if (kind === 'armor') {
      const cost = 300 + this.upgrades.armorLevel * 200;
      if (this.upgrades.armorLevel >= 3) return 'Colete já está no nível máximo.';
      if (this.player.cash < cost) return `Precisa de €${cost} para proteção.`;
      this.player.cash -= cost;
      this.upgrades.armorLevel += 1;
      this.player.maxArmor = 100 + this.upgrades.armorLevel * 25;
      this.player.armor = this.player.maxArmor;
      soundEngine.playPickup();
      return null;
    }
    if (kind === 'weapon') {
      const cost = 300 + this.upgrades.weaponLevel * 250;
      if (this.upgrades.weaponLevel >= 3) return 'Equipamento já está no nível máximo.';
      if (this.player.cash < cost) return `Precisa de €${cost} para melhorar.`;
      this.player.cash -= cost;
      this.upgrades.weaponLevel += 1;
      soundEngine.playPickup();
      return null;
    }
    if (kind === 'repair') {
      if (this.player.cash < 100) return 'Precisa de €100 para reparação.';
      this.player.cash -= 100;
      this.player.hp = this.player.maxHp;
      this.player.nitro = 100;
      const veh = this.vehicles.find((v) => v.id === this.player.vehicleId);
      if (veh) veh.hp = veh.maxHp;
      soundEngine.playPickup();
      return null;
    }
    if (kind === 'spawn_coupe') {
      if (this.player.cash < 250) return 'Precisa de €250 para entregar um Coupé Boavista GT.';
      this.player.cash -= 250;
      const clamped = clampToPortoLand(this.player.x + 60, this.player.y + 40, this.player.x, 26);
      const car = makeVehicle(`veh-spawn-${Date.now()}`, 'coupe', clamped.x, clamped.y, 0, false);
      this.vehicles.push(car);
      soundEngine.playMissionComplete();
      this.showToast('Coupé Boavista GT entregue ao seu lado!', 3);
      return null;
    }
    return null;
  }

  private findNearestVehicle(maxDist: number): Vehicle | null {
    let best: Vehicle | null = null;
    let bestD = maxDist;
    for (const v of this.vehicles) {
      const d = dist(this.player.x, this.player.y, v.x, v.y);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private findNearestServiceZone() {
    for (const z of SERVICE_ZONES) {
      if (dist(this.player.x, this.player.y, z.x, z.y) <= z.radius + 25) {
        return z;
      }
    }
    return null;
  }

  private findNearestBuilding() {
    let best = null;
    let bestD = 160;
    for (const b of BUILDINGS) {
      const dEnt = dist(this.player.x, this.player.y, b.entranceX, b.entranceY);
      const closestX = Math.max(b.x, Math.min(this.player.x, b.x + b.w));
      const closestY = Math.max(b.y, Math.min(this.player.y, b.y + b.h));
      const dFoot = dist(this.player.x, this.player.y, closestX, closestY);
      const d = Math.min(dEnt, dFoot);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private findNearestLifeLocation(maxDistance = 150): LifeLocation | null {
    // Daily-life interactions are performed on foot, not from inside a vehicle.
    if (this.player.vehicleId) return null;
    let nearest: LifeLocation | null = null;
    let nearestDistance = maxDistance;
    for (const location of LIFE_LOCATIONS) {
      const distance = dist(this.player.x, this.player.y, location.x, location.y);
      if (distance <= location.radius && distance < nearestDistance) {
        nearest = location;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  public openLifeLocationConversation(locationId: string) {
    if (this.activeActivity) return;
    const location = LIFE_LOCATIONS.find((item) => item.id === locationId);
    if (!location || dist(this.player.x, this.player.y, location.x, location.y) > location.radius) {
      this.showToast('Aproxima-te ao local antes de conversar.', 2.4);
      return;
    }

    const relationship = this.life.npcRelationships[location.id] ?? 0;
    const memories = this.life.npcMemories[location.id] ?? [];
    const lastTopic = memories[memories.length - 1];
    const rememberedTopic = lastTopic === 'work-opportunities'
      ? 'Da última vez perguntaste por oportunidades de trabalho.'
      : lastTopic === 'local-recommendations'
        ? 'Lembro-me de te ter dado dicas sobre esta zona.'
        : lastTopic === 'friendly-chat'
          ? 'Já tivemos oportunidade de conversar.'
          : lastTopic === 'conflict'
            ? 'A nossa última conversa não correu pelo melhor.'
            : lastTopic === 'reconciliation'
              ? 'Fico contente por termos esclarecido o mal-entendido.'
              : '';
    const personality = location.npcPersonality ? ` Sou ${location.npcPersonality.toLowerCase()}.` : '';
    const ambition = location.npcAmbition ? ` Neste momento, quero ${location.npcAmbition}.` : '';
    const greeting = relationship >= 70
      ? `Que bom ver-te outra vez! Já ganhaste a minha confiança. ${rememberedTopic}${personality}${ambition}`
      : relationship >= 40
        ? `Olá outra vez! Já nos conhecemos bem. ${rememberedTopic}${personality}${ambition}`
        : memories.length > 0 ? `Olá! Voltaste. ${rememberedTopic}${personality}${ambition}` : location.description + '.' + personality + ambition + ' Como posso ajudar?';

    const options = [
      {
        label: memories.includes('friendly-chat') ? 'Pôr a conversa em dia' : 'Cumprimentar e conversar',
        reply: 'É sempre bom conhecer melhor quem vive e trabalha nesta zona do Porto.',
        cashBonus: 0,
        repBonus: 3,
        memoryTag: 'friendly-chat',
        relationshipDelta: 4,
      },
      {
        label: memories.includes('work-opportunities') ? 'Perguntar se há novidades de trabalho' : 'Perguntar por oportunidades e atividades',
        reply: memories.includes('work-opportunities') ? 'Continuo atento a novas oportunidades. A procura muda todos os dias; consulta o quadro de contratos.' : 'Posso indicar-te o que se passa por aqui. Consulta o quadro de contratos e participa na comunidade.',
        cashBonus: 2,
        repBonus: 4,
        memoryTag: 'work-opportunities',
        relationshipDelta: relationship >= 55 ? 6 : 3,
      },
      {
        label: memories.includes('local-recommendations') ? 'Descobrir mais sítios' : 'Pedir uma recomendação local',
        reply: 'Fica a conhecer os pequenos negócios e os serviços da zona. A cidade tem muito para descobrir.',
        cashBonus: 0,
        repBonus: 5,
        memoryTag: 'local-recommendations',
        relationshipDelta: 5,
      },
    ];
    if (memories.includes('conflict') || relationship < 20) {
      options.push({
        label: 'Pedir desculpa e esclarecer um mal-entendido',
        reply: 'Agradeço a tua atitude. Nem sempre concordamos, mas podemos recomeçar com respeito.',
        cashBonus: 0,
        repBonus: 5,
        memoryTag: 'reconciliation',
        relationshipDelta: 9,
      });
    }
    options.push({
      label: 'Discordar de forma brusca',
      reply: 'Não gostei da forma como falaste comigo. A confiança constrói-se com respeito.',
      cashBonus: 0,
      repBonus: 0,
      memoryTag: 'conflict',
      relationshipDelta: -10,
    });

    this.activeActivity = {
      id: `life-location-${location.id}-${Date.now()}`,
      buildingName: location.label,
      npcName: location.npcName,
      npcRole: location.npcRole,
      npcColor: location.npcColor,
      greeting,
      options,
      miniGameKind: 'conversation',
      miniGameTitle: 'Conversa com ' + location.npcName,
      miniGameSubtitle: 'As tuas escolhas alteram a confiança. Podes criar amizade, reparar um conflito ou afastar o residente.',
      phase: 'dialogue',
      selectedOptionReply: null,
      bonusCash: 0,
      bonusRep: 0,
    };
  }

  public focusBuildingWaypoint(buildingId: string) {
    const b = BUILDINGS.find((item) => item.id === buildingId);
    if (!b) return;
    this.activeActivity = null;
    this.autoPromptedMissionId = '';
    const profDef = PROFESSIONS[this.player.profession];
    this.mission = {
      ...this.mission,
      id: `visit-${b.id}-${Date.now()}`,
      title: `${profDef.shortTitle}: Visita a ${b.label}`,
      description: `Dirija-se a ${b.label} (${b.district}) para interagir no local.`,
      stage: 'go_to_building',
      sourceBuildingId: b.id,
      sourceBuildingName: b.label,
      destBuildingId: b.id,
      destBuildingName: b.label,
      targetX: b.entranceX,
      targetY: b.entranceY,
      simLabel: b.simActionLabel,
      simProgress: 0,
      rewardCash: 320,
      activityCompleted: false,
    };
    this.showToast(`GPS definido para ${b.label}!`, 3);
  }

  public advanceLifeClockWhileIndoors(dt: number) {
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    if (safeDt === 0) return;
    this.dayTime = (this.dayTime + safeDt * 0.004) % 1;
    this.life = advanceLifeSimulation(this.life, safeDt);
    this.lifeSaveAccumulator += safeDt;
    if (this.lifeSaveAccumulator >= 15) {
      this.lifeSaveAccumulator = 0;
      saveLifeSave(this.life, this.player.cash);
    }
  }

  public update(
    dt: number,
    input: InputState,
    camYaw: number,
    aimWorld2D: { x: number; y: number } | null,
    isMobile: boolean,
    remotePlayers?: Map<string, RemotePlayer>,
  ) {
    const safeDt = Math.min(dt, 0.05);
    if (remotePlayers) {
      this.latestRemotePlayers = remotePlayers;
    }

    this.dayTime = (this.dayTime + safeDt * 0.004) % 1;
    // In-game clock: one real second advances one simulated minute.
    this.life = advanceLifeSimulation(this.life, safeDt);
    this.lifeSaveAccumulator += safeDt;
    if (this.lifeSaveAccumulator >= 15) {
      this.lifeSaveAccumulator = 0;
      saveLifeSave(this.life, this.player.cash);
    }
    this.screenShake = Math.max(0, this.screenShake - safeDt * 24);
    if (this.toastTimer > 0) {
      this.toastTimer -= safeDt;
      if (this.toastTimer <= 0) this.toastText = null;
    }
    if (this.player.invulnTimer > 0) this.player.invulnTimer -= safeDt;
    if (this.player.fireCooldown > 0) this.player.fireCooldown -= safeDt;
    if (this.speedAlertCooldown > 0) this.speedAlertCooldown -= safeDt;
    if (this.crashPenaltyCooldown > 0) this.crashPenaltyCooldown -= safeDt;
    if (this.player.comboTimer > 0) {
      this.player.comboTimer -= safeDt;
      if (this.player.comboTimer <= 0) this.player.comboMultiplier = 1;
    }

    // Expire emergency pings older than 90s
    const now = Date.now();
    if (this.emergencyPings.some((p) => now - p.createdAt > 90000)) {
      this.emergencyPings = this.emergencyPings.filter((p) => now - p.createdAt <= 90000);
    }

    const activeVeh = this.player.vehicleId
      ? this.vehicles.find((v) => v.id === this.player.vehicleId) ?? null
      : null;

    if (activeVeh) {
      this.updateDrivingPlayer(activeVeh, safeDt, input);
      if (activeVeh.sirenActive) {
        soundEngine.tickSiren(1);
      }
      const speedKmh = Math.round(Math.abs(activeVeh.speed) * 0.34);
      if (
        speedKmh >= 98 &&
        this.player.profession !== 'psp' &&
        this.player.profession !== 'paramedic' &&
        this.speedAlertCooldown <= 0
      ) {
        this.speedAlertCooldown = 14;
        const nearB = this.findNearestBuilding()?.label ?? 'Avenida do Porto';
        this.onSendEmergencyCall?.(
          'speed',
          this.player.x,
          this.player.y,
          `Radar: ${speedKmh} km/h perto de ${nearB}`,
          speedKmh,
        );
      }
    } else {
      this.player.vehicleId = null;
      this.updateFootPlayer(safeDt, input, camYaw, aimWorld2D, isMobile);
    }

    if (input.shoot && this.player.fireCooldown <= 0 && !this.activeActivity) {
      this.firePlayerWeapon(activeVeh);
    }

    this.updateVehicles(safeDt);
    this.updatePedestrians(safeDt);
    this.updateBullets(safeDt, remotePlayers);
    this.updatePickups(safeDt);
    this.updateMission();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * safeDt;
      p.y += p.vy * safeDt;
      p.z = Math.max(0.1, p.z + p.vz * safeDt);
      p.vz -= 6.5 * safeDt;
      p.life -= safeDt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      this.skidMarks[i].alpha -= safeDt * 0.08;
      if (this.skidMarks[i].alpha <= 0) this.skidMarks.splice(i, 1);
    }
    if (this.skidMarks.length > 350) {
      this.skidMarks.splice(0, this.skidMarks.length - 350);
    }

    const leadX = activeVeh ? activeVeh.vx * 0.25 : 0;
    const leadY = activeVeh ? activeVeh.vy * 0.25 : 0;
    this.camX += (this.player.x + leadX - this.camX) * Math.min(1, safeDt * 7);
    this.camY += (this.player.y + leadY - this.camY) * Math.min(1, safeDt * 7);

    if (!input.nitro) {
      this.player.nitro = Math.min(100, this.player.nitro + safeDt * 9);
    }
  }

  private updateFootPlayer(
    dt: number,
    input: InputState,
    camYaw: number,
    aimWorld2D: { x: number; y: number } | null,
    isMobile: boolean,
  ) {
    if (this.player.dashCooldown > 0) {
      this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    }
    if (this.player.dashTimer > 0) {
      this.player.dashTimer = Math.max(0, this.player.dashTimer - dt);
    }

    let strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let forward = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    if (Math.hypot(input.joyX, input.joyY) > 0.12) {
      strafe = input.joyX;
      forward = -input.joyY;
    }

    const fwdX = Math.cos(camYaw);
    const fwdY = Math.sin(camYaw);
    const rightX = -fwdY;
    const rightY = fwdX;

    const moveX = fwdX * forward + rightX * strafe;
    const moveY = fwdY * forward + rightY * strafe;

    const mag = Math.hypot(moveX, moveY);
    const sprintBoost = input.nitro && this.player.nitro > 5 ? 1.42 : 1;
    if (input.nitro && mag > 0.1 && this.player.nitro > 0) {
      this.player.nitro = Math.max(0, this.player.nitro - dt * 28);
    }

    const dashMul = this.player.dashTimer > 0 ? 2.35 : 1;
    const walkSpeed = (this.character === 'lucia' ? 215 : 200) * sprintBoost * dashMul;
    if (mag > 0.05) {
      const nx = moveX / Math.max(1, mag);
      const ny = moveY / Math.max(1, mag);
      this.player.vx = nx * walkSpeed;
      this.player.vy = ny * walkSpeed;
      if (isMobile || !input.mouseActive || !aimWorld2D) {
        const moveAng = Math.atan2(ny, nx);
        this.player.angle += normalizeAngle(moveAng - this.player.angle) * Math.min(1, dt * 12);
      }
    } else if (this.player.dashTimer > 0) {
      this.player.vx = Math.cos(this.player.angle) * walkSpeed;
      this.player.vy = Math.sin(this.player.angle) * walkSpeed;
    } else {
      this.player.vx *= 0.72;
      this.player.vy *= 0.72;
    }

    if (!isMobile && input.mouseActive && aimWorld2D) {
      this.player.angle = Math.atan2(aimWorld2D.y - this.player.y, aimWorld2D.x - this.player.x);
    }

    const prevX = this.player.x;
    const clamped = clampToPortoLand(
      this.player.x + this.player.vx * dt,
      this.player.y + this.player.vy * dt,
      prevX,
      16,
    );
    this.player.x = clamped.x;
    this.player.y = clamped.y;

    for (const b of BUILDINGS) {
      const res = resolveCircleRectCollision(this.player.x, this.player.y, 16, b);
      this.player.x = res.x;
      this.player.y = res.y;
    }
  }

  private updateDrivingPlayer(veh: Vehicle, dt: number, input: InputState) {
    const turboBonus = 1 + this.upgrades.turboLevel * 0.14;
    const isBoosting = input.nitro && this.player.nitro > 2;
    const boostMul = isBoosting ? 1.38 : 1;
    if (isBoosting) {
      this.player.nitro = Math.max(0, this.player.nitro - dt * 34);
      this.spawnParticle(
        veh.x - Math.cos(veh.angle) * 26,
        veh.y - Math.sin(veh.angle) * 26,
        -Math.cos(veh.angle) * 140 + (Math.random() - 0.5) * 40,
        -Math.sin(veh.angle) * 140 + (Math.random() - 0.5) * 40,
        0.24,
        5,
        '#38BDF8',
      );
    }

    const joyMag = Math.hypot(input.joyX, input.joyY);
    let throttle = (input.up ? 1 : 0) - (input.down ? 1 : 0);
    let steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);

    if (joyMag > 0.14) {
      throttle = -input.joyY;
      if (Math.abs(throttle) < 0.25 && Math.abs(input.joyX) > 0.3) {
        throttle = 0.55;
      }
      steer = input.joyX;
    }

    const handbraking = input.handbrake && Math.abs(veh.speed) > 70;
    if (handbraking) {
      veh.speed *= Math.pow(0.55, dt);
    } else if (throttle > 0.05) {
      veh.speed += veh.accel * turboBonus * boostMul * throttle * dt;
    } else if (throttle < -0.05) {
      veh.speed += veh.accel * 1.15 * throttle * dt;
    } else {
      veh.speed *= Math.pow(0.28, dt);
    }

    veh.speed = clamp(veh.speed, -210, veh.maxSpeed * turboBonus * boostMul);
    const steerAuthority = clamp(Math.abs(veh.speed) / 140, 0.25, 1) * (handbraking ? 1.32 : 1);
    const dirSign = veh.speed >= -5 ? 1 : -1;
    veh.angle += steer * veh.turnSpeed * steerAuthority * dirSign * dt;

    const targetVx = Math.cos(veh.angle) * veh.speed;
    const targetVy = Math.sin(veh.angle) * veh.speed;
    const prevX = veh.x;
    const prevY = veh.y;

    const lateralGrip = handbraking ? 1.85 : 6.5;
    veh.vx += (targetVx - veh.vx) * Math.min(1, dt * lateralGrip);
    veh.vy += (targetVy - veh.vy) * Math.min(1, dt * lateralGrip);

    const driftDelta = Math.hypot(targetVx - veh.vx, targetVy - veh.vy);
    if ((handbraking || driftDelta > 110) && Math.abs(veh.speed) > 165) {
      const perpX = -Math.sin(veh.angle) * 9;
      const perpY = Math.cos(veh.angle) * 9;
      const rearX = veh.x - Math.cos(veh.angle) * 18;
      const rearY = veh.y - Math.sin(veh.angle) * 18;
      const prevRearX = prevX - Math.cos(veh.angle) * 18;
      const prevRearY = prevY - Math.sin(veh.angle) * 18;
      this.skidMarks.push(
        { x1: prevRearX + perpX, y1: prevRearY + perpY, x2: rearX + perpX, y2: rearY + perpY, alpha: 0.62 },
        { x1: prevRearX - perpX, y1: prevRearY - perpY, x2: rearX - perpX, y2: rearY - perpY, alpha: 0.62 },
      );
      if (Math.random() < 0.65) {
        this.spawnParticle(
          rearX + (Math.random() - 0.5) * 14,
          rearY + (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40,
          0.35,
          4.2,
          '#CBD5E1',
        );
      }
      if (this.player.comboTimer <= 0.1) {
        this.player.comboMultiplier = Math.min(4, this.player.comboMultiplier + 0.25);
      }
      this.player.comboTimer = 3.5;
      this.driftCashAccum += dt;
      if (this.driftCashAccum >= 0.45) {
        this.driftCashAccum = 0;
        this.player.cash += Math.round(6 * this.player.comboMultiplier);
      }
    } else {
      this.driftCashAccum = 0;
    }

    this.player.x = veh.x;
    this.player.y = veh.y;
    this.player.angle = veh.angle;
  }

  private firePlayerWeapon(activeVeh: Vehicle | null) {
    const def = WEAPONS[this.player.currentWeapon] ?? WEAPONS.pistol;
    const charBonus = this.character === 'lucia' ? 0.88 : 1.0;
    const cooldownMul = Math.max(0.55, 1 - this.upgrades.weaponLevel * 0.14) * charBonus;
    this.player.fireCooldown = def.cooldown * cooldownMul;

    const muzzleDist = activeVeh ? 32 : 18;
    const bx = this.player.x + Math.cos(this.player.angle) * muzzleDist;
    const by = this.player.y + Math.sin(this.player.angle) * muzzleDist;

    for (let i = 0; i < def.pellets; i++) {
      const a = this.player.angle + (Math.random() - 0.5) * def.spread;
      this.bullets.push({
        id: `b-${++this.bulletSeq}`,
        x: bx,
        y: by,
        vx: Math.cos(a) * def.bulletSpeed,
        vy: Math.sin(a) * def.bulletSpeed,
        life: def.life,
        fromPolice: false,
        damage: def.damage + this.upgrades.weaponLevel * 8,
        isExplosive: def.isExplosive,
        ownerId: 'local',
      });
    }

    soundEngine.playShot(def.id);
    this.onLocalFire?.(def.id, bx, by, this.player.angle);
    this.spawnParticle(
      bx,
      by,
      Math.cos(this.player.angle) * 90,
      Math.sin(this.player.angle) * 90,
      0.14,
      def.isExplosive ? 7 : 4,
      def.isExplosive ? '#F97316' : '#FDE047',
    );
  }

  private applyDrivingCrashPenalty() {
    if (this.crashPenaltyCooldown > 0) return;
    this.crashPenaltyCooldown = 5.0;
    if (this.player.drivingPoints > 0) {
      this.player.drivingPoints -= 1;
      this.showToast(
        `Colisão forte: -1 ponto na Carta (${this.player.drivingPoints}/12 pts)`,
        2.4,
      );
    }
  }

  private updateVehicles(dt: number) {
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];

      if (v.sirenActive) {
        v.sirenPhase += dt * 10;
      }

      if (v.aiDriven && v.id !== this.player.vehicleId) {
        v.aiTimer -= dt;
        if (v.aiTimer <= 0) {
          v.aiTimer = 2.5 + Math.random() * 2;
          const choices = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
          if (Math.random() < 0.35) {
            v.aiTargetAngle = choices[Math.floor(Math.random() * choices.length)];
          }
        }
        const diff = normalizeAngle(v.aiTargetAngle - v.angle);
        v.angle += clamp(diff, -2 * dt, 2 * dt);
        v.speed = 180;
        v.vx = Math.cos(v.angle) * v.speed;
        v.vy = Math.sin(v.angle) * v.speed;
      }

      const prevX = v.x;
      const clamped = clampToPortoLand(v.x + v.vx * dt, v.y + v.vy * dt, prevX, 24);
      v.x = clamped.x;
      v.y = clamped.y;

      for (const b of BUILDINGS) {
        const res = resolveCircleRectCollision(v.x, v.y, 24, b);
        if (res.collided) {
          v.x = res.x;
          v.y = res.y;
          if (v.id === this.player.vehicleId && Math.abs(v.speed) > 210) {
            soundEngine.playCrash();
            this.screenShake = 6;
            v.hp -= 5;
            this.applyDrivingCrashPenalty();
          }
          v.speed *= -0.3;
          v.vx *= 0.3;
          v.vy *= 0.3;
          if (v.aiDriven) {
            v.aiTargetAngle += Math.PI / 2;
          }
        }
      }

      if (v.id === this.player.vehicleId) {
        this.player.x = v.x;
        this.player.y = v.y;
        this.player.angle = v.angle;

        if (v.hp <= 0) {
          this.explodeVehicle(v);
        }
      }
    }

    for (let i = 0; i < this.vehicles.length; i++) {
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const a = this.vehicles[i];
        const b = this.vehicles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 42) {
          const push = (42 - d) * 0.5;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;

          if (a.id === this.player.vehicleId || b.id === this.player.vehicleId) {
            const impact = Math.hypot(a.vx - b.vx, a.vy - b.vy);
            if (impact > 210) {
              soundEngine.playCrash();
              this.screenShake = 5;
              this.applyDrivingCrashPenalty();
            }
          }
        }
      }
    }

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      if (this.vehicles[i].hp <= 0 && this.vehicles[i].id !== this.player.vehicleId) {
        this.explodeVehicle(this.vehicles[i]);
        this.vehicles.splice(i, 1);
      }
    }
  }

  private explodeVehicle(v: Vehicle) {
    soundEngine.playCrash();
    this.screenShake = 12;
    for (let k = 0; k < 22; k++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 200;
      this.spawnParticle(
        v.x,
        v.y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        0.5 + Math.random() * 0.4,
        6 + Math.random() * 6,
        k % 2 === 0 ? '#F97316' : '#FDE047',
      );
    }

    if (v.id === this.player.vehicleId) {
      this.player.vehicleId = null;
      const clamped = clampToPortoLand(v.x + 42, v.y + 42, v.x, 16);
      this.player.x = clamped.x;
      this.player.y = clamped.y;
      this.damagePlayer(35);
      this.showToast('Viatura avariada! Saiu a tempo.', 3);
    }
  }

  private updatePedestrians(dt: number) {
    for (const p of this.pedestrians) {
      if (p.panicTimer > 0) p.panicTimer -= dt;
      const spd = p.panicTimer > 0 ? p.speed * 2.2 : p.speed;
      const prevX = p.x;
      const next = clampToPortoLand(
        p.x + Math.cos(p.angle) * spd * dt,
        p.y + Math.sin(p.angle) * spd * dt,
        prevX,
        12,
      );
      p.x = next.x;
      p.y = next.y;

      if (p.x < 80 || p.x > WORLD_W - 80 || p.y < 80 || p.y > WORLD_H - 80) {
        p.angle += Math.PI;
      }
      if (Math.random() < dt * 0.5) {
        p.angle += (Math.random() - 0.5) * 1.4;
      }

      if (this.player.vehicleId && dist(p.x, p.y, this.player.x, this.player.y) < 120) {
        p.angle = Math.atan2(p.y - this.player.y, p.x - this.player.x);
        p.panicTimer = 2;
      }
    }

    // Nearby pedestrians now start short ambient conversations without a button press.
    if (this.ambientNpcDialogueTimer > 0) {
      this.ambientNpcDialogueTimer = Math.max(0, this.ambientNpcDialogueTimer - dt);
      if (this.ambientNpcDialogueTimer === 0) this.ambientNpcDialogue = null;
    }
    this.ambientNpcCooldown = Math.max(0, this.ambientNpcCooldown - dt);

    if (
      this.ambientNpcDialogueTimer <= 0 &&
      this.ambientNpcCooldown <= 0 &&
      !this.activeActivity &&
      !this.player.vehicleId
    ) {
      let nearestPedestrian: Pedestrian | null = null;
      let nearestDistance = 132;
      for (const pedestrian of this.pedestrians) {
        const distance = dist(this.player.x, this.player.y, pedestrian.x, pedestrian.y);
        if (distance < nearestDistance && pedestrian.panicTimer <= 0) {
          nearestPedestrian = pedestrian;
          nearestDistance = distance;
        }
      }

      if (nearestPedestrian) {
        const names = ['Tiago', 'Marta', 'Rui', 'Inês', 'Duarte', 'Sofia', 'Nuno', 'Carla', 'Zé', 'Leonor'];
        const chatter = [
          'Este trânsito na Baixa está pior do que ontem.',
          'Alguém sabe se a Ponte Dom Luís está mais livre?',
          'O café da esquina tem uma meia de leite muito boa.',
          'Dizem que hoje há música ao vivo nos Aliados.',
          'Cuidado com a calçada, está escorregadia.',
          'Vou passar pelo Bolhão antes de ir para casa.',
          'O Douro está bonito ao fim da tarde.',
          'Conheces alguma rua aqui perto com estacionamento?',
          'Hoje a Ribeira está cheia de turistas.',
          'Ainda vou a tempo de apanhar o metro em São Bento?',
          'Quem é vivo sempre aparece!',
          'Esta cidade tem sempre qualquer coisa a acontecer.',
        ];
        let text = chatter[Math.floor(Math.random() * chatter.length)];

        // Rare, short cultural Easter egg from the Portuguese web-video saga.
        if (!this.ambientNpcEasterEggUsed && Math.random() < 0.035) {
          text = 'EU QUERO O MEU SECADOR!';
          this.ambientNpcEasterEggUsed = true;
        }

        const nameIndex = Number(nearestPedestrian.id.replace(/\D/g, '')) || 0;
        this.ambientNpcDialogue = {
          speaker: names[nameIndex % names.length],
          text,
          color: nearestPedestrian.shirtColor,
        };
        this.ambientNpcDialogueTimer = 4.8;
        this.ambientNpcCooldown = 17 + Math.random() * 12;
      }
    }
  }

  private triggerRocketExplosion(x: number, y: number, remotePlayers?: Map<string, RemotePlayer>) {
    soundEngine.playCrash();
    this.screenShake = 11;
    for (let k = 0; k < 20; k++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 210;
      this.spawnParticle(
        x,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        0.45 + Math.random() * 0.35,
        7 + Math.random() * 6,
        k % 2 === 0 ? '#F97316' : '#FDE047',
      );
    }
    for (const v of this.vehicles) {
      if (v.id === this.player.vehicleId) continue;
      if (dist(x, y, v.x, v.y) < 125) {
        v.hp -= 140;
      }
    }
    if (remotePlayers) {
      for (const rp of remotePlayers.values()) {
        if (dist(x, y, rp.x, rp.y) < 120) {
          this.onRemoteHit?.(rp.id, 75);
        }
      }
    }
  }

  private updateBullets(dt: number, remotePlayers?: Map<string, RemotePlayer>) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.isExplosive && Math.random() < 0.7) {
        this.spawnParticle(b.x, b.y, 0, 0, 0.22, 4.5, '#CBD5E1');
      }

      let hit = false;
      if (b.life <= 0 || b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H) {
        hit = true;
      }

      if (!hit) {
        for (const bld of BUILDINGS) {
          if (b.x >= bld.x && b.x <= bld.x + bld.w && b.y >= bld.y && b.y <= bld.y + bld.h) {
            hit = true;
            this.spawnParticle(b.x, b.y, 0, 0, 0.2, 4, '#CBD5E1');
            break;
          }
        }
      }

      if (!hit && b.ownerId !== 'remote') {
        for (const v of this.vehicles) {
          if (v.id === this.player.vehicleId) continue;
          if (dist(b.x, b.y, v.x, v.y) < 26) {
            hit = true;
            v.hp -= b.damage;
            this.spawnParticle(b.x, b.y, 0, 0, 0.22, 5, '#F59E0B');
            break;
          }
        }

        if (!hit && remotePlayers && b.damage > 0) {
          for (const rp of remotePlayers.values()) {
            if (dist(b.x, b.y, rp.x, rp.y) < (rp.vehicleType ? 26 : 18)) {
              hit = true;
              this.onRemoteHit?.(rp.id, b.damage);
              this.spawnParticle(b.x, b.y, 0, 0, 0.22, 5, '#EF4444');
              break;
            }
          }
        }
      }

      if (hit) {
        if (b.isExplosive && b.ownerId !== 'remote') {
          this.triggerRocketExplosion(b.x, b.y, remotePlayers);
        }
        this.bullets.splice(i, 1);
      }
    }
  }

  private damagePlayer(amount: number) {
    if (this.player.invulnTimer > 0) return;
    this.player.invulnTimer = 0.25;
    this.screenShake = 5;

    let rem = amount;
    if (this.player.armor > 0) {
      const absorbed = Math.min(this.player.armor, rem);
      this.player.armor -= absorbed;
      rem -= absorbed;
    }
    this.player.hp = Math.max(0, this.player.hp - rem);
    if (this.player.hp <= 0) {
      this.onGameOver();
    }
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.bobPhase += dt * 4;
      if (dist(this.player.x, this.player.y, pk.x, pk.y) < 34) {
        if (pk.kind === 'cash') {
          const bonus = Math.round(pk.value * this.player.comboMultiplier);
          this.player.cash += bonus;
          this.showToast(`+€${bonus}`, 1.8);
        } else if (pk.kind === 'medkit') {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + pk.value);
          this.showToast(`+${pk.value} Vida`, 1.8);
        } else if (pk.kind === 'armor') {
          this.player.armor = Math.min(this.player.maxArmor, this.player.armor + pk.value);
          this.showToast(`+${pk.value} Colete`, 1.8);
        } else if (pk.kind === 'nitro') {
          this.player.nitro = Math.min(100, this.player.nitro + pk.value);
          this.showToast('Turbo recarregado!', 1.8);
        }
        soundEngine.playPickup();
        this.pickups.splice(i, 1);
      }
    }

    if (this.pickups.length < 10) {
      this.spawnInitialPickups();
    }
  }

  // Interactive real-life mission loop (dialogue + mini-game + delivery/patrol; zero passive timer)
  private updateMission() {
    const d = dist(this.player.x, this.player.y, this.mission.targetX, this.mission.targetY);

    if (this.mission.stage === 'go_to_building') {
      if (d < 68 && this.autoPromptedMissionId !== this.mission.id) {
        this.autoPromptedMissionId = this.mission.id;
        this.openLandmarkActivity();
      }
    } else if (this.mission.stage === 'deliver') {
      if (d < 66) {
        const safeBonus = this.player.drivingPoints >= 10 ? 75 : 0;
        const reward = Math.round(this.mission.rewardCash * this.player.comboMultiplier) + safeBonus;
        this.player.cash += reward;
        this.player.missionsCompleted += 1;
        this.player.reputation += 12;
        this.player.comboMultiplier = Math.min(4, this.player.comboMultiplier + 0.5);
        this.player.comboTimer = 8;
        this.completedChapters.add(this.mission.chapterNumber);
        soundEngine.playMissionComplete();

        const completedCh = getStoryChapterByNumber(this.mission.chapterNumber);
        this.missionCounter += 1;
        this.mission = this.buildProfessionMission(
          this.player.profession,
          this.missionCounter,
        );
        const nextCh = getStoryChapterByNumber(this.mission.chapterNumber);
        this.dialogueQueue = [...completedCh.outroLines, ...nextCh.introLines];
        this.dialogueIndex = 0;
        this.dialogueChapterNum = nextCh.chapterNumber;
        this.dialogueChapterTitle = nextCh.title;

        const bonusText = safeBonus > 0 ? ' (inclui bónus condução segura!)' : '';
        this.showToast(`Serviço concluído em ${completedCh.districtTag}! +€${reward}${bonusText}`, 3.8);
      }
    }
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string,
  ) {
    this.particles.push({
      x,
      y,
      z: 0.8 + Math.random() * 0.6,
      vx,
      vy,
      vz: 2.2 + Math.random() * 4.5,
      life,
      maxLife: life,
      size,
      color,
    });
  }

  public getHudSnapshot(): HudSnapshot {
    const veh = this.player.vehicleId
      ? this.vehicles.find((v) => v.id === this.player.vehicleId) ?? null
      : null;
    const nearVeh = !veh ? this.findNearestVehicle(84) : null;
    const nearZone = this.findNearestServiceZone();
    const nearBuilding = this.findNearestBuilding();
    const nearLifeLocation = this.findNearestLifeLocation();
    const profDef = PROFESSIONS[this.player.profession];

    let timeOfDayLabel = 'Entardecer no Douro';
    if (this.dayTime < 0.25) timeOfDayLabel = 'Porto à Noite';
    else if (this.dayTime < 0.62) timeOfDayLabel = 'Dia no Porto';

    const activeBuilding =
      this.mission.stage === 'deliver'
        ? this.mission.destBuildingName
        : this.mission.sourceBuildingName;

    const targetDist = dist(this.player.x, this.player.y, this.mission.targetX, this.mission.targetY);
    const gpsDistMeters = Math.round(targetDist * 0.38);

    const canInteractMission =
      this.mission.stage !== 'deliver' && targetDist <= 90 && !this.activeActivity;

    const nearPspTarget =
      this.player.profession === 'psp' && this.player.onDuty && !this.activeActivity
        ? this.findNearestPspTarget()
        : null;

    const activeDialogue: StoryDialogueSnapshot | null =
      this.dialogueQueue.length > 0 && this.dialogueIndex < this.dialogueQueue.length
        ? {
            chapterNumber: this.dialogueChapterNum,
            chapterTitle: this.dialogueChapterTitle,
            line: this.dialogueQueue[this.dialogueIndex],
            index: this.dialogueIndex,
            total: this.dialogueQueue.length,
          }
        : null;

    return {
      cash: this.player.cash,
      life: { ...this.life },
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      armor: Math.round(this.player.armor),
      maxArmor: this.player.maxArmor,
      nitro: Math.round(this.player.nitro),
      wantedStars: 0,
      speedKmh: veh ? Math.round(Math.abs(veh.speed) * 0.34) : 0,
      vehicleName: veh ? veh.name : null,
      vehicleHp: veh ? Math.max(0, Math.round((veh.hp / veh.maxHp) * 100)) : 100,
      nearVehicleName: nearVeh ? nearVeh.name : null,
      nearServiceZone: nearZone ? nearZone.label : null,
      nearBuildingId: nearBuilding ? nearBuilding.id : null,
      nearBuildingName: nearBuilding ? nearBuilding.label : null,
      nearLifeLocation,
      canInteractLifeLocation: Boolean(nearLifeLocation),
      missionTitle: this.mission.title,
      missionObjective: canInteractMission
        ? `Premir [G] para falar com ${this.mission.npcName}`
        : this.mission.description,
      missionReward: this.mission.rewardCash,
      missionBuilding: activeBuilding,
      missionProgress: this.mission.activityCompleted ? 100 : 0,
      missionSimulating: false,
      gpsDistMeters,
      headlightsOn: this.headlightsOn,
      sirenActive: Boolean(veh?.sirenActive),
      profession: this.player.profession,
      professionTitle: profDef.shortTitle,
      professionColor: profDef.colorHex,
      onDuty: this.player.onDuty,
      drivingPoints: this.player.drivingPoints,
      reputation: this.player.reputation,
      canInteractMission,
      activeActivity: this.activeActivity,
      nearPspTarget,
      emergencyPings: [...this.emergencyPings],
      storyChapter: this.mission.chapterNumber,
      completedChapters: Array.from(this.completedChapters).sort((a, b) => a - b),
      activeDialogue,
      comboMultiplier: Number(this.player.comboMultiplier.toFixed(1)),
      missionsCompleted: this.player.missionsCompleted,
      maxStarsReached: this.player.drivingPoints,
      timeOfDayLabel,
      cameraMode: this.cameraMode,
      currentWeapon: this.player.currentWeapon,
      unlockedWeapons: [...this.player.unlockedWeapons],
      toastText: this.toastText,
      ambientNpcDialogue: this.ambientNpcDialogue,
    };
  }
}
