export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GARAGE' | 'GAME_OVER';

export type ControlMode = 'auto' | 'desktop' | 'mobile';

export type CameraMode = 'chase' | 'cinematic' | 'overhead';

export type CharacterId = 'lucia' | 'jason';

export type VehicleType = 'coupe' | 'muscle' | 'buggy' | 'police' | 'taxi';

export type WeaponId = 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'rpg';

export type ProfessionId = 'psp' | 'taxi' | 'courier' | 'merchant' | 'paramedic';

export type LifeJobId = 'barista' | 'retail' | 'courier' | 'gardener' | 'construction';

export type LifeLocationKind = 'home' | 'cafe' | 'market' | 'garden' | 'depot' | 'construction';

export interface LifeLocation {
  id: string;
  kind: LifeLocationKind;
  label: string;
  description: string;
  x: number;
  y: number;
  radius: number;
  markerColor: string;
  icon: string;
  npcName: string;
  npcRole: string;
  npcColor: string;
  npcShirtColor: string;
}

export type LifeAction =
  | 'sleep'
  | 'shower'
  | 'cook'
  | 'drink'
  | 'buy_supplies'
  | 'eat_out'
  | 'work_shift'
  | 'socialise'
  | 'study'
  | 'withdraw_50';

export interface LifeSimulationSnapshot {
  day: number;
  minuteOfDay: number;
  energy: number;
  hunger: number;
  thirst: number;
  hygiene: number;
  mood: number;
  bankBalance: number;
  groceries: number;
  waterBottles: number;
  job: LifeJobId;
  jobExperience: number;
  socialProgress: number;
  studyProgress: number;
  /** Interior activities already completed on the current in-game day. */
  completedInteriorTasks: string[];
}

export type MiniGameKind = 'cargo_seal' | 'ledger_trade' | 'medical_triage' | 'psp_inspection' | 'conversation';

export interface NpcOption {
  label: string;
  reply: string;
  cashBonus: number;
  repBonus: number;
}

export interface ActiveLandmarkActivity {
  id: string;
  buildingName: string;
  npcName: string;
  npcRole: string;
  npcColor: string;
  greeting: string;
  options: NpcOption[];
  miniGameKind: MiniGameKind;
  miniGameTitle: string;
  miniGameSubtitle: string;
  phase: 'dialogue' | 'minigame';
  selectedOptionReply: string | null;
  bonusCash: number;
  bonusRep: number;
  pspTarget?: PspTargetInfo;
}

export interface EmergencyPing {
  id: string;
  kind: 'speed' | '112';
  label: string;
  x: number;
  y: number;
  callerName: string;
  speedKmh?: number;
  createdAt: number;
}

export interface PspTargetInfo {
  id: string;
  name: string;
  isHuman: boolean;
  speedKmh: number;
  vehicleName: string;
  distanceMeters: number;
  drivingPoints: number;
  hasValidInsurance: boolean;
}

export type PortoLandmarkKind =
  | 'clerigos'
  | 'camara'
  | 'saobento'
  | 'lello'
  | 'bolsa'
  | 'se'
  | 'casadamusica'
  | 'bolhao'
  | 'ribeira'
  | 'caves_gaia'
  | 'serra_pilar';

export type FacadeStyle = 'granite' | 'azulejo' | 'ochre' | 'white_concrete';

export type StorySpeakerId = 'lucia' | 'jason' | 'tiago' | 'beatriz' | 'matos';

export interface StoryLine {
  speaker: StorySpeakerId;
  speakerName: string;
  role: string;
  accentHex: string;
  text: string;
}

export interface StoryDialogueSnapshot {
  chapterNumber: number;
  chapterTitle: string;
  line: StoryLine;
  index: number;
  total: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  shortName: string;
  cost: number;
  damage: number;
  cooldown: number;
  pellets: number;
  spread: number;
  bulletSpeed: number;
  life: number;
  isExplosive: boolean;
  description: string;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  roofColor: string;
  label: string;
  district: string;
  landmark: PortoLandmarkKind;
  facadeStyle: FacadeStyle;
  accentColor: string;
  floors: number;
  entranceX: number;
  entranceY: number;
  simActionLabel: string;
}

export interface CityTree {
  x: number;
  y: number;
  scale: number;
  angle: number;
  variant: 'plane' | 'cypress';
}

export interface ServiceZone {
  id: 'pay-n-spray' | 'garage';
  x: number;
  y: number;
  radius: number;
  label: string;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  maxSpeed: number;
  accel: number;
  turnSpeed: number;
  color: string;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  isPolice: boolean;
  sirenActive?: boolean;
  aiDriven: boolean;
  aiTimer: number;
  aiTargetAngle: number;
  sirenPhase: number;
  fireCooldown: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  nitro: number;
  cash: number;
  wantedStars: number;
  wantedDecayTimer: number;
  maxStarsReached: number;
  profession: ProfessionId;
  onDuty: boolean;
  drivingPoints: number;
  reputation: number;
  vehicleId: string | null;
  fireCooldown: number;
  dashCooldown: number;
  dashTimer: number;
  comboMultiplier: number;
  comboTimer: number;
  missionsCompleted: number;
  invulnTimer: number;
  currentWeapon: WeaponId;
  unlockedWeapons: WeaponId[];
}

export interface EnemyGuard {
  id: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  speed: number;
  fireCooldown: number;
  shirtColor: string;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  fromPolice: boolean;
  damage: number;
  isExplosive?: boolean;
  ownerId?: string;
}

export interface Pickup {
  id: string;
  kind: 'cash' | 'medkit' | 'armor' | 'nitro';
  x: number;
  y: number;
  value: number;
  bobPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

export interface Pedestrian {
  id: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  shirtColor: string;
  panicTimer: number;
}

export type MissionScenarioId =
  | 'saobento_bolsa'
  | 'clerigos_musica'
  | 'bolhao_gaia'
  | 'camara_se'
  | 'lello_musica';

export interface Mission {
  id: string;
  scenarioId: MissionScenarioId;
  chapterNumber: number;
  profession: ProfessionId;
  title: string;
  description: string;
  type: 'heist' | 'infiltration' | 'delivery' | 'evade';
  stage: 'go_to_building' | 'simulate_interior' | 'deliver';
  sourceBuildingId: string;
  sourceBuildingName: string;
  destBuildingId: string;
  destBuildingName: string;
  targetX: number;
  targetY: number;
  simLabel: string;
  simProgress: number;
  simDuration: number;
  rewardCash: number;
  miniGameKind: MiniGameKind;
  miniGameTitle: string;
  miniGameSubtitle: string;
  npcName: string;
  npcRole: string;
  npcColor: string;
  npcGreeting: string;
  npcOptions: NpcOption[];
  activityCompleted: boolean;
}

export interface UpgradeState {
  turboLevel: number;
  armorLevel: number;
  weaponLevel: number;
}

export interface RemotePlayer {
  id: string;
  name: string;
  character: CharacterId;
  profession: ProfessionId;
  onDuty: boolean;
  drivingPoints: number;
  sirenActive?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  vehicleType: VehicleType | null;
  vehicleColor: string;
  weaponId: WeaponId;
  hp: number;
  wantedStars: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  kind: 'chat' | 'system';
  timestamp: number;
}

export interface HudSnapshot {
  cash: number;
  life: LifeSimulationSnapshot;
  nearLifeLocation: LifeLocation | null;
  canInteractLifeLocation: boolean;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  nitro: number;
  wantedStars: number;
  speedKmh: number;
  vehicleName: string | null;
  vehicleHp: number;
  nearVehicleName: string | null;
  nearServiceZone: string | null;
  nearBuildingId: string | null;
  nearBuildingName: string | null;
  missionTitle: string;
  missionObjective: string;
  missionReward: number;
  missionBuilding: string;
  missionProgress: number;
  missionSimulating: boolean;
  gpsDistMeters: number;
  headlightsOn: boolean;
  sirenActive: boolean;
  profession: ProfessionId;
  professionTitle: string;
  professionColor: string;
  onDuty: boolean;
  drivingPoints: number;
  reputation: number;
  canInteractMission: boolean;
  activeActivity: ActiveLandmarkActivity | null;
  nearPspTarget: PspTargetInfo | null;
  emergencyPings: EmergencyPing[];
  storyChapter: number;
  completedChapters: number[];
  activeDialogue: StoryDialogueSnapshot | null;
  comboMultiplier: number;
  missionsCompleted: number;
  maxStarsReached: number;
  timeOfDayLabel: string;
  cameraMode: CameraMode;
  currentWeapon: WeaponId;
  unlockedWeapons: WeaponId[];
  toastText: string | null;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  nitro: boolean;
  handbrake: boolean;
  joyX: number;
  joyY: number;
  mouseX: number;
  mouseY: number;
  mouseActive: boolean;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  character: 'Lucía' | 'Jason';
  cash: number;
  missionsCompleted: number;
  maxStars: number;
  platform: 'desktop' | 'mobile';
  createdAt: string;
}
