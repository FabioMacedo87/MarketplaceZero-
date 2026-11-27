import type { LifeAction, LifeJobId, LifeSimulationSnapshot } from './types.ts';

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
): LifeActionResult {
  let life = { ...current };
  let cash = currentCash;
  const fail = (message: string): LifeActionResult => ({
    ok: false,
    message,
    life: current,
    cash: currentCash,
  });

  switch (action) {
    case 'sleep': {
      const wakeTime = 7 * 60;
      let sleepMinutes: number;
      if (life.minuteOfDay >= 21 * 60 || life.minuteOfDay < wakeTime) {
        sleepMinutes = (wakeTime - life.minuteOfDay + 1440) % 1440;
        if (sleepMinutes < 240) sleepMinutes += 1440;
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
      const payment = payFromAvailableFunds(life, cash, 18);
      if (!payment.ok) return fail('Saldo insuficiente para comprar mantimentos.');
      life = { ...payment.life, groceries: life.groceries + 4, waterBottles: life.waterBottles + 6 };
      cash = payment.cash;
      return { ok: true, message: 'Compraste alimentos e água para casa (-18 €).', life, cash };
    }
    case 'eat_out': {
      const payment = payFromAvailableFunds(life, cash, 7.5);
      if (!payment.ok) return fail('Saldo insuficiente para pagar uma refeição.');
      life = advanceLifeSimulation(payment.life, 25);
      life.hunger = clamp(life.hunger + 46);
      life.mood = clamp(life.mood + 9);
      cash = payment.cash;
      return { ok: true, message: 'Fizeste uma refeição num café do Porto (-7,50 €).', life, cash };
    }
    case 'work_shift': {
      if (life.energy < 25) return fail('Estás demasiado cansado para iniciar um turno.');
      life = advanceLifeSimulation(life, 240);
      life.energy = clamp(life.energy - 8);
      life.jobExperience += 1;
      life.bankBalance += JOB_PAY[life.job];
      return {
        ok: true,
        message: `Turno de 4 horas concluído. Recebeste ${JOB_PAY[life.job]} € na conta bancária.`,
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
    const job = VALID_JOBS.includes(parsed.life.job as LifeJobId)
      ? (parsed.life.job as LifeJobId)
      : defaults.job;
    return {
      life: {
        day: safeNumber(parsed.life.day, defaults.day, 1, 100000),
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, life, cash }));
  } catch {
    // Storage can be unavailable in private browsing or when device storage is full.
  }
}
