import type { LifeLocationKind } from './types.ts';

export interface OutdoorNpcSchedule { x: number; y: number; activity: string }
export interface InteriorNpcSchedule { x: number; z: number; activity: string }
interface Block<T> { from: number; to: number; value: T }

function pick<T>(blocks: Block<T>[], minuteOfDay: number): T {
  const minute = ((Math.floor(minuteOfDay) % 1440) + 1440) % 1440;
  return (blocks.find((block) => minute >= block.from && minute < block.to) ?? blocks[0]).value;
}

const outdoor: Record<LifeLocationKind, Block<OutdoorNpcSchedule>[]> = {
  home: [
    { from: 0, to: 420, value: { x: -12, y: 4, activity: 'em casa a descansar' } },
    { from: 420, to: 540, value: { x: -18, y: -12, activity: 'a começar o dia' } },
    { from: 540, to: 900, value: { x: 12, y: -10, activity: 'a tratar da vizinhança' } },
    { from: 900, to: 1140, value: { x: 16, y: 12, activity: 'a passear pelo bairro' } },
    { from: 1140, to: 1440, value: { x: -12, y: 4, activity: 'em casa a descansar' } },
  ],
  cafe: [
    { from: 0, to: 390, value: { x: -24, y: 10, activity: 'a preparar a abertura' } },
    { from: 390, to: 660, value: { x: -12, y: -18, activity: 'a preparar cafés' } },
    { from: 660, to: 900, value: { x: 18, y: -10, activity: 'a servir clientes' } },
    { from: 900, to: 1200, value: { x: -12, y: -18, activity: 'a trabalhar ao balcão' } },
    { from: 1200, to: 1440, value: { x: 20, y: 12, activity: 'a fechar o café' } },
  ],
  market: [
    { from: 0, to: 420, value: { x: -22, y: 10, activity: 'a preparar as bancas' } },
    { from: 420, to: 660, value: { x: -16, y: -16, activity: 'a organizar produtos' } },
    { from: 660, to: 960, value: { x: 18, y: -10, activity: 'a atender clientes' } },
    { from: 960, to: 1140, value: { x: -10, y: 18, activity: 'a repor mercadoria' } },
    { from: 1140, to: 1440, value: { x: 18, y: 12, activity: 'a fechar a banca' } },
  ],
  depot: [
    { from: 0, to: 360, value: { x: -18, y: 4, activity: 'a preparar a expedição' } },
    { from: 360, to: 600, value: { x: -18, y: -14, activity: 'a separar encomendas' } },
    { from: 600, to: 900, value: { x: 18, y: -10, activity: 'a carregar a carrinha' } },
    { from: 900, to: 1140, value: { x: 16, y: 16, activity: 'a registar entregas' } },
    { from: 1140, to: 1440, value: { x: -18, y: 4, activity: 'a terminar o turno' } },
  ],
  garden: [
    { from: 0, to: 420, value: { x: -16, y: 10, activity: 'a preparar ferramentas' } },
    { from: 420, to: 660, value: { x: -14, y: -14, activity: 'a regar canteiros' } },
    { from: 660, to: 900, value: { x: 14, y: -12, activity: 'a cuidar da sebe' } },
    { from: 900, to: 1140, value: { x: 18, y: 12, activity: 'a limpar os caminhos' } },
    { from: 1140, to: 1440, value: { x: -16, y: 10, activity: 'a arrumar ferramentas' } },
  ],
  construction: [
    { from: 0, to: 420, value: { x: -18, y: 8, activity: 'a preparar a obra' } },
    { from: 420, to: 660, value: { x: -14, y: -14, activity: 'a medir e marcar' } },
    { from: 660, to: 900, value: { x: 10, y: -12, activity: 'a executar alvenaria' } },
    { from: 900, to: 1140, value: { x: 18, y: 12, activity: 'a limpar a obra' } },
    { from: 1140, to: 1440, value: { x: -18, y: 8, activity: 'a guardar ferramentas' } },
  ],
};

const interior: Record<LifeLocationKind, Block<InteriorNpcSchedule>[]> = {
  home: [
    { from: 0, to: 420, value: { x: 5, z: -3.4, activity: 'a descansar no quarto' } },
    { from: 420, to: 600, value: { x: -5, z: -2.2, activity: 'a preparar o pequeno-almoço' } },
    { from: 600, to: 1080, value: { x: 5, z: -3.4, activity: 'a tratar da casa' } },
    { from: 1080, to: 1320, value: { x: 0, z: 0.5, activity: 'a descansar na sala' } },
    { from: 1320, to: 1440, value: { x: 5, z: -3.4, activity: 'a preparar-se para dormir' } },
  ],
  cafe: [
    { from: 0, to: 390, value: { x: 2, z: 4, activity: 'a abrir o café' } },
    { from: 390, to: 660, value: { x: -5, z: -2.1, activity: 'a preparar bebidas' } },
    { from: 660, to: 900, value: { x: 5, z: 1.6, activity: 'a servir as mesas' } },
    { from: 900, to: 1200, value: { x: -5, z: -2.1, activity: 'a trabalhar na máquina de café' } },
    { from: 1200, to: 1440, value: { x: 2, z: 4, activity: 'a fechar o café' } },
  ],
  market: [
    { from: 0, to: 420, value: { x: -5.6, z: -2.3, activity: 'a preparar prateleiras' } },
    { from: 420, to: 660, value: { x: 5.5, z: 1.4, activity: 'a organizar produtos' } },
    { from: 660, to: 1020, value: { x: 0, z: -3.1, activity: 'a atender na caixa' } },
    { from: 1020, to: 1200, value: { x: -5.6, z: -2.3, activity: 'a repor mercadoria' } },
    { from: 1200, to: 1440, value: { x: 2, z: 4, activity: 'a fechar o mercado' } },
  ],
  depot: [
    { from: 0, to: 360, value: { x: 0, z: -3, activity: 'a preparar o terminal' } },
    { from: 360, to: 600, value: { x: -5.5, z: -2.3, activity: 'a separar encomendas' } },
    { from: 600, to: 900, value: { x: 5.5, z: 1.2, activity: 'a carregar volumes' } },
    { from: 900, to: 1140, value: { x: 0, z: -3, activity: 'a registar expedições' } },
    { from: 1140, to: 1440, value: { x: 2, z: 4, activity: 'a terminar o turno' } },
  ],
  garden: [
    { from: 0, to: 420, value: { x: 1, z: -4.4, activity: 'a preparar jardinagem' } },
    { from: 420, to: 660, value: { x: -5.5, z: -2.2, activity: 'a regar canteiros' } },
    { from: 660, to: 900, value: { x: 1, z: -4.4, activity: 'a podar a sebe' } },
    { from: 900, to: 1140, value: { x: 5.5, z: 1.3, activity: 'a limpar caminhos' } },
    { from: 1140, to: 1440, value: { x: 2, z: 4, activity: 'a arrumar ferramentas' } },
  ],
  construction: [
    { from: 0, to: 420, value: { x: 5.2, z: -2.8, activity: 'a preparar o estaleiro' } },
    { from: 420, to: 660, value: { x: -5.4, z: -2.3, activity: 'a medir materiais' } },
    { from: 660, to: 900, value: { x: 0, z: -3, activity: 'a assentar tijolos' } },
    { from: 900, to: 1140, value: { x: 5.5, z: 1.2, activity: 'a limpar a obra' } },
    { from: 1140, to: 1440, value: { x: 2, z: 4, activity: 'a guardar ferramentas' } },
  ],
};

export function getOutdoorNpcSchedule(kind: LifeLocationKind, minuteOfDay: number): OutdoorNpcSchedule {
  return pick(outdoor[kind], minuteOfDay);
}
export function getInteriorNpcSchedule(kind: LifeLocationKind, minuteOfDay: number): InteriorNpcSchedule {
  return pick(interior[kind], minuteOfDay);
}
