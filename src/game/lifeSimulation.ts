import type { LifeAction, LifeContract, LifeJobId, LifeLocationKind, LifeSimulationSnapshot } from './types.ts';

const STORAGE_KEY = 'portugal-life-save-v1';
const JOB_PAY: Record<LifeJobId, number> = {
  barista: 36,
  retail: 38,
  courier: 46,
  gardener: 42,
  construction: 52,
};

export function createInitialLifeSimulation(): LifeSimulationSnapshot {
  return {
    day: 1,
    minuteOfDay: 7 * 60 + 30,
    energy: 88,
    hunger: 82,
    thirst: 84,
    hygiene: 92,
    mood: 82,
    bankBalance: 320,
    groceries: 2,
    waterBottles: 1,
    job: 'barista',
    jobExperience: 0,
    socialProgress: 0,
    studyProgress: 0,
    completedInteriorTasks: [],
    npcRelationships: {},
    npcMemories: {},
    cityDemand: { home: 42, cafe: 62, market: 66, garden: 48, depot: 56, construction: 60 },
    lifeContracts: createDailyLifeContracts(1, { home: 42, cafe: 62, market: 66, garden: 48, depot: 56, construction: 60 }),
    activeLifeContractId: null,
    completedLifeContracts: 0,
  };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

const VALID_JOBS: LifeJobId[] = ['barista', 'retail', 'courier', 'gardener', 'construction'];

const JOB_WORKPLACE: Record<LifeJobId, LifeLocationKind> = {
  barista: 'cafe',
  retail: 'market',
  courier: 'depot',
  gardener: 'garden',
  construction: 'construction',
};

const CONTRACT_INFO: Record<LifeJobId, { title: string; description: string; workplace: LifeLocationKind; residentId: string }> = {
  barista: { title: 'Reforço de serviço na Ribeira', description: 'Cumpre um turno de atendimento e ajuda o café a responder à procura.', workplace: 'cafe', residentId: 'cafe-ribeira' },
  retail: { title: 'Reposição urgente no Bolhão', description: 'Ajuda a organizar as bancas e a manter o mercado abastecido.', workplace: 'market', residentId: 'mercado-bolhao' },
  courier: { title: 'Distribuição entre margens', description: 'Apoia a operação logística e prepara as entregas do dia.', workplace: 'depot', residentId: 'depot-gaia' },
  gardener: { title: 'Manutenção da Cordoaria', description: 'Ajuda a equipa a cuidar dos canteiros e dos caminhos do jardim.', workplace: 'garden', residentId: 'jardim-cordoaria' },
  construction: { title: 'Obra de melhoria na Boavista', description: 'Reforça a equipa numa tarefa de manutenção e construção urbana.', workplace: 'construction', residentId: 'construction-boavista' },
};

const VALID_LOCATION_KINDS: LifeLocationKind[] = ['home', 'cafe', 'market', 'garden', 'depot', 'construction'];

export function createDailyLifeContracts(
  day: number,
  cityDemand: Record<LifeLocationKind, number>,
): LifeContract[] {
  return VALID_JOBS.map((job, index) => {
    const info = CONTRACT_INFO[job];
    const demand = Math.max(0, Math.min(100, cityDemand[info.workplace] ?? 50));
    const dayVariation = ((day + index * 2) % 5) * 2;
    const reward = Math.round(JOB_PAY[job] * 0.82 + demand * 0.16 + 12 + dayVariation);
    return {
      id: 'life-contract-' + day + '-' + job,
      job,
      title: info.title,
      description: info.description,
      workplace: info.workplace,
      reward,
      expiresOnDay: day + 1,
      residentId: info.residentId,
    };
  });
}

export function getLifeSupplyPrice(life: LifeSimulationSnapshot): number {
  const demand = life.cityDemand?.market ?? 50;
  const relationship = life.npcRelationships?.['mercado-bolhao'] ?? 0;
  const discount = relationship >= 70 ? 0.15 : relationship >= 40 ? 0.07 : 0;
  return Math.round(18 * (0.8 + demand * 0.004) * (1 - discount) * 100) / 100;
}

export function getLifeMealPrice(life: LifeSimulationSnapshot): number {
  const demand = life.cityDemand?.cafe ?? 50;
  const relationship = life.npcRelationships?.['cafe-ribeira'] ?? 0;
  const discount = relationship >= 70 ? 0.12 : relationship >= 40 ? 0.05 : 0;
  return Math.round(7.5 * (0.8 + demand * 0.004) * (1 - discount) * 100) / 100;
}

export function getLifeShiftPay(life: LifeSimulationSnapshot, job: LifeJobId = life.job): number {
  const workplace = JOB_WORKPLACE[job];
  const demand = life.cityDemand?.[workplace] ?? 50;
  const residentId = CONTRACT_INFO[job].residentId;
  const relationship = life.npcRelationships?.[residentId] ?? 0;
  const trustBonus = relationship >= 75 ? 0.08 : relationship >= 45 ? 0.04 : 0;
  return Math.round(JOB_PAY[job] * (0.85 + demand * 0.003) * (1 + trustBonus));
}

const ACTION_WORKPLACE: Partial<Record<LifeAction, LifeLocationKind>> = {
  sleep: 'home',
  shower: 'home',
  cook: 'home',
  buy_supplies: 'market',
  eat_out: 'cafe',
};

export function getRequiredWorkplace(job: LifeJobId): LifeLocationKind {
  return JOB_WORKPLACE[job];
}

export function advanceLifeSimulation(
  current: LifeSimulationSnapshot,
  elapsedGameMinutes: number,
): LifeSimulationSnapshot {
  const minutes = Math.max(0, Math.min(1440, elapsedGameMinutes));
  if (minutes === 0) return current;

  let minuteOfDay = current.minuteOfDay + minutes;
  let day = current.day;
  while (minuteOfDay >= 1440) {
    minuteOfDay -= 1440;
    day += 1;
  }

  const cityDemand = { ...current.cityDemand };
  let lifeContracts = [...current.lifeContracts];
  let activeLifeContractId = current.activeLifeContractId;
  if (day > current.day) {
    for (const kind of VALID_LOCATION_KINDS) {
      const previous = cityDemand[kind] ?? 50;
      const driftToAverage = (50 - previous) * 0.08;
      const dailyVariation = (((day + VALID_LOCATION_KINDS.indexOf(kind) * 2) % 5) - 2) * 1.5;
      cityDemand[kind] = clamp(previous + driftToAverage + dailyVariation, 20, 85);
    }
    const active = lifeContracts.find((contract) => contract.id === activeLifeContractId);
    lifeContracts = createDailyLifeContracts(day, cityDemand);
    if (active && active.expiresOnDay >= day) lifeContracts.push(active);
    else activeLifeContractId = null;
  }
  lifeContracts = lifeContracts.filter((contract) => contract.expiresOnDay >= day);

  const hunger = clamp(current.hunger - minutes * 0.09);
  const thirst = clamp(current.thirst - minutes * 0.13);
  const energy = clamp(current.energy - minutes * 0.055);
  const hygiene = clamp(current.hygiene - minutes * 0.05);
  const needsUnderPressure = hunger < 25 || thirst < 25 || energy < 20;
  const mood = clamp(current.mood - minutes * (needsUnderPressure ? 0.075 : 0.012));

  return {
    ...current,
    day,
    minuteOfDay,
    completedInteriorTasks: day > current.day ? [] : [...current.completedInteriorTasks],
    cityDemand,
    lifeContracts,
    activeLifeContractId,
    hunger,
    thirst,
    energy,
    hygiene,
    mood,
  };
}

export interface LifeActionResult {
  ok: boolean;
  message: string;
  life: LifeSimulationSnapshot;
  cash: number;
}

function payFromAvailableFunds(
  life: LifeSimulationSnapshot,
  cash: number,
  amount: number,
): { ok: boolean; life: LifeSimulationSnapshot; cash: number } {
  if (cash >= amount) return { ok: true, life, cash: cash - amount };
  const shortfall = amount - cash;
  if (life.bankBalance < shortfall) return { ok: false, life, cash };
  return {
    ok: true,
    life: { ...life, bankBalance: life.bankBalance - shortfall },
    cash: 0,
  };
}

export function performLifeAction(
  current: LifeSimulationSnapshot,
  currentCash: number,
  action: LifeAction,
  locationKind: LifeLocationKind | null = null,
): LifeActionResult {
  let life = { ...current };
  let cash = currentCash;
  const fail = (message: string): LifeActionResult => ({
    ok: false,
    message,
    life: current,
    cash: currentCash,
  });

  const requiredLocation = ACTION_WORKPLACE[action];
  if (requiredLocation && locationKind !== requiredLocation) {
    const names: Record<LifeLocationKind, string> = {
      home: 'Apartamento do Porto',
      cafe: 'Café da Ribeira',
      market: 'Mercado do Bolhão',
      garden: 'Jardim da Cordoaria',
      depot: 'Ponto Logístico de Gaia',
      construction: 'Estaleiro da Boavista',
    };
    return fail(`Esta atividade exige que estejas em ${names[requiredLocation]}.`);
  }

  if (action === 'work_shift' && locationKind !== JOB_WORKPLACE[life.job]) {
    const names: Record<LifeLocationKind, string> = {
      home: 'Apartamento do Porto',
      cafe: 'Café da Ribeira',
      market: 'Mercado do Bolhão',
      garden: 'Jardim da Cordoaria',
      depot: 'Ponto Logístico de Gaia',
      construction: 'Estaleiro da Boavista',
    };
    return fail(`Para trabalhar como ${life.job}, desloca-te a ${names[JOB_WORKPLACE[life.job]]}.`);
  }

  switch (action) {
    case 'sleep': {
      const wakeTime = 7 * 60;
      let sleepMinutes: number;
      if (life.minuteOfDay >= 21 * 60 || life.minuteOfDay < wakeTime) {
        sleepMinutes = (wakeTime - life.minuteOfDay + 1440) % 1440;
      } else {
        sleepMinutes = 8 * 60;
      }
      life = advanceLifeSimulation(life, sleepMinutes);
      life.energy = clamp(life.energy + 82);
      life.mood = clamp(life.mood + 12);
      return { ok: true, message: 'Descansaste. Recuperaste energia e bem-estar.', life, cash };
    }
    case 'shower':
      life = advanceLifeSimulation(life, 20);
      life.hygiene = clamp(life.hygiene + 65);
      return { ok: true, message: 'Tomaste banho e recuperaste higiene.', life, cash };
    case 'cook':
      if (life.groceries < 1) return fail('Não tens mantimentos. Compra alimentos primeiro.');
      life = advanceLifeSimulation(life, 30);
      life.groceries -= 1;
      life.hunger = clamp(life.hunger + 48);
      life.mood = clamp(life.mood + 6);
      return { ok: true, message: 'Preparaste uma refeição em casa.', life, cash };
    case 'drink':
      if (life.waterBottles < 1) return fail('Não tens água disponível. Compra mantimentos.');
      life.waterBottles -= 1;
      life.thirst = clamp(life.thirst + 48);
      return { ok: true, message: 'Bebeste água e recuperaste hidratação.', life, cash };
    case 'buy_supplies': {
      const price = getLifeSupplyPrice(life);
      const payment = payFromAvailableFunds(life, cash, price);
      if (!payment.ok) return fail('Saldo insuficiente para comprar mantimentos (' + price.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) + ').');
      life = {
        ...payment.life,
        groceries: life.groceries + 4,
        waterBottles: life.waterBottles + 6,
        cityDemand: { ...life.cityDemand, market: clamp((life.cityDemand.market ?? 50) + 2, 0, 100) },
      };
      cash = payment.cash;
      return { ok: true, message: 'Compraste alimentos e água para casa (-' + price.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) + ').', life, cash };
    }
    case 'eat_out': {
      const price = getLifeMealPrice(life);
      const payment = payFromAvailableFunds(life, cash, price);
      if (!payment.ok) return fail('Saldo insuficiente para pagar uma refeição (' + price.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) + ').');
      life = advanceLifeSimulation(payment.life, 25);
      life.hunger = clamp(life.hunger + 46);
      life.mood = clamp(life.mood + 9);
      life.cityDemand = { ...life.cityDemand, cafe: clamp((life.cityDemand.cafe ?? 50) + 2, 0, 100) };
      cash = payment.cash;
      return { ok: true, message: 'Fizeste uma refeição num café do Porto (-' + price.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) + ').', life, cash };
    }
    case 'work_shift': {
      if (life.energy < 25) return fail('Estás demasiado cansado para iniciar um turno.');
      const shiftPay = getLifeShiftPay(life);
      const workplace = JOB_WORKPLACE[life.job];
      life = advanceLifeSimulation(life, 240);
      life.energy = clamp(life.energy - 8);
      life.jobExperience += 1;
      life.bankBalance += shiftPay;
      life.cityDemand = { ...life.cityDemand, [workplace]: clamp((life.cityDemand[workplace] ?? 50) - 3, 0, 100) };
      return {
        ok: true,
        message: `Turno de 4 horas concluído. Recebeste ${shiftPay.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })} na conta bancária, ajustado à procura local.`,
        life,
        cash,
      };
    }
    case 'socialise':
      life = advanceLifeSimulation(life, 30);
      life.mood = clamp(life.mood + 14);
      life.socialProgress = clamp(life.socialProgress + 12);
      return { ok: true, message: 'Passaste tempo com outras pessoas e melhoraste o teu bem-estar.', life, cash };
    case 'study':
      if (life.energy < 15) return fail('Precisas de descansar antes de estudar.');
      life = advanceLifeSimulation(life, 60);
      life.studyProgress += 1;
      life.mood = clamp(life.mood + 3);
      return { ok: true, message: 'Terminaste uma sessão de estudo e desenvolveste competências.', life, cash };
    case 'withdraw_50':
      if (life.bankBalance < 50) return fail('Não tens 50 € disponíveis na conta.');
      life.bankBalance -= 50;
      cash += 50;
      return { ok: true, message: 'Levantaste 50 € da conta bancária.', life, cash };
    default:
      return fail('Ação desconhecida.');
  }
}

export function selectLifeJob(
  current: LifeSimulationSnapshot,
  job: LifeJobId,
): LifeSimulationSnapshot {
  return { ...current, job };
}

export function loadLifeSave(): { life: LifeSimulationSnapshot; cash: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { life?: Partial<LifeSimulationSnapshot>; cash?: number };
    if (!parsed.life || typeof parsed.life !== 'object') return null;
    const defaults = createInitialLifeSimulation();
    const savedDay = safeNumber(parsed.life.day, defaults.day, 1, 100000);
    const rawDemand = (parsed.life.cityDemand ?? {}) as Partial<Record<LifeLocationKind, unknown>>;
    const cityDemand: Record<LifeLocationKind, number> = {
      home: safeNumber(rawDemand.home, defaults.cityDemand.home, 0, 100),
      cafe: safeNumber(rawDemand.cafe, defaults.cityDemand.cafe, 0, 100),
      market: safeNumber(rawDemand.market, defaults.cityDemand.market, 0, 100),
      garden: safeNumber(rawDemand.garden, defaults.cityDemand.garden, 0, 100),
      depot: safeNumber(rawDemand.depot, defaults.cityDemand.depot, 0, 100),
      construction: safeNumber(rawDemand.construction, defaults.cityDemand.construction, 0, 100),
    };
    const lifeContracts: LifeContract[] = Array.isArray(parsed.life.lifeContracts)
      ? parsed.life.lifeContracts.filter((value): value is LifeContract => {
          if (!value || typeof value !== 'object') return false;
          const contract = value as Partial<LifeContract>;
          return typeof contract.id === 'string' && /^life-contract-[0-9]+-[a-z]+$/.test(contract.id)
            && VALID_JOBS.includes(contract.job as LifeJobId)
            && VALID_LOCATION_KINDS.includes(contract.workplace as LifeLocationKind)
            && typeof contract.title === 'string' && typeof contract.description === 'string'
            && typeof contract.reward === 'number' && Number.isFinite(contract.reward)
            && typeof contract.expiresOnDay === 'number' && Number.isFinite(contract.expiresOnDay)
            && typeof contract.residentId === 'string' && /^[a-z0-9-]{2,48}$/.test(contract.residentId);
        }).slice(0, 8)
      : createDailyLifeContracts(savedDay, cityDemand);
    const savedActiveContractId = typeof parsed.life.activeLifeContractId === 'string'
      && lifeContracts.some((contract) => contract.id === parsed.life?.activeLifeContractId)
      ? parsed.life.activeLifeContractId
      : null;
    const job = VALID_JOBS.includes(parsed.life.job as LifeJobId)
      ? (parsed.life.job as LifeJobId)
      : defaults.job;
    return {
      life: {
        day: savedDay,
        minuteOfDay: safeNumber(parsed.life.minuteOfDay, defaults.minuteOfDay, 0, 1439.999),
        energy: safeNumber(parsed.life.energy, defaults.energy, 0, 100),
        hunger: safeNumber(parsed.life.hunger, defaults.hunger, 0, 100),
        thirst: safeNumber(parsed.life.thirst, defaults.thirst, 0, 100),
        hygiene: safeNumber(parsed.life.hygiene, defaults.hygiene, 0, 100),
        mood: safeNumber(parsed.life.mood, defaults.mood, 0, 100),
        bankBalance: safeNumber(parsed.life.bankBalance, defaults.bankBalance, 0, 100000000),
        groceries: safeNumber(parsed.life.groceries, defaults.groceries, 0, 999),
        waterBottles: safeNumber(parsed.life.waterBottles, defaults.waterBottles, 0, 999),
        job,
        jobExperience: safeNumber(parsed.life.jobExperience, defaults.jobExperience, 0, 100000),
        socialProgress: safeNumber(parsed.life.socialProgress, defaults.socialProgress, 0, 100),
        studyProgress: safeNumber(parsed.life.studyProgress, defaults.studyProgress, 0, 100000),
        completedInteriorTasks: Array.isArray(parsed.life.completedInteriorTasks)
          ? parsed.life.completedInteriorTasks
              .filter((id): id is string => typeof id === 'string' && /^[a-z0-9-]{2,64}$/.test(id))
              .slice(0, 80)
          : [],
        npcRelationships: parsed.life.npcRelationships && typeof parsed.life.npcRelationships === 'object'
          ? Object.fromEntries(Object.entries(parsed.life.npcRelationships as Record<string, unknown>)
              .filter(([id, value]) => /^[a-z0-9-]{2,48}$/.test(id) && typeof value === 'number' && Number.isFinite(value))
              .map(([id, value]) => [id, Math.max(0, Math.min(100, Number(value)))]))
          : {},
        npcMemories: parsed.life.npcMemories && typeof parsed.life.npcMemories === 'object'
          ? Object.fromEntries(Object.entries(parsed.life.npcMemories as Record<string, unknown>)
              .filter(([id, value]) => /^[a-z0-9-]{2,48}$/.test(id) && Array.isArray(value))
              .map(([id, value]) => [id, (value as unknown[])
                .filter((tag): tag is string => typeof tag === 'string' && /^[a-z0-9-]{2,40}$/.test(tag))
                .slice(-12)]))
          : {},
        cityDemand,
        lifeContracts,
        activeLifeContractId: savedActiveContractId,
        completedLifeContracts: safeNumber(parsed.life.completedLifeContracts, 0, 0, 1000000),
      },
      cash: safeNumber(parsed.cash, 650, 0, 100000000),
    };
  } catch {
    return null;
  }
}

export function saveLifeSave(life: LifeSimulationSnapshot, cash: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, life, cash }));
  } catch {
    // Storage can be unavailable in private browsing or when device storage is full.
  }
}
