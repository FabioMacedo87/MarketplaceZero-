import type { Building, CityTree, LifeLocation, ServiceZone } from './types.ts';

export const WORLD_W = 3200;
export const WORLD_H = 2400;

// Porto avenues (Boavista, Carmelitas/Clérigos, Avenida dos Aliados, Cais da Ribeira, Cais de Gaia)
export const VERTICAL_ROADS = [240, 920, 1640, 2320, 3000];
export const HORIZONTAL_ROADS = [260, 880, 1520, 2140];
export const ROAD_WIDTH = 168;

// Rio Douro river channel separating Porto (west) from Vila Nova de Gaia (east)
export const RIVER_START_X = 2470;
export const RIVER_END_X = 2850;
// Bridges crossing Rio Douro: Ponte do Infante (y=260) and Ponte Dom Luís I (y=1520)
export const BRIDGE_YS = [260, 1520];
export const BRIDGE_HALF_WIDTH = 72;

export function isOnDouroBridge(y: number, margin = 0): boolean {
  return BRIDGE_YS.some((by) => Math.abs(y - by) <= BRIDGE_HALF_WIDTH - margin);
}

export function clampToPortoLand(
  x: number,
  y: number,
  prevX: number,
  radius: number,
): { x: number; y: number } {
  const cx = Math.max(35, Math.min(WORLD_W - 35, x));
  const cy = Math.max(35, Math.min(WORLD_H - 35, y));

  const minRiver = RIVER_START_X - radius;
  const maxRiver = RIVER_END_X + radius;

  if (cx > minRiver && cx < maxRiver && !isOnDouroBridge(cy, radius * 0.45)) {
    // Keep on whichever bank the actor came from, or clamp off the side of a bridge
    if (isOnDouroBridge(cy, -26)) {
      const nearestBridge = BRIDGE_YS.reduce((a, b) =>
        Math.abs(cy - a) < Math.abs(cy - b) ? a : b,
      );
      const clampedY =
        cy >= nearestBridge
          ? Math.min(cy, nearestBridge + BRIDGE_HALF_WIDTH - radius * 0.5)
          : Math.max(cy, nearestBridge - BRIDGE_HALF_WIDTH + radius * 0.5);
      return { x: cx, y: clampedY };
    }
    const distWest = Math.abs(prevX - minRiver);
    const distEast = Math.abs(prevX - maxRiver);
    return {
      x: distWest <= distEast ? minRiver : maxRiver,
      y: cy,
    };
  }

  return { x: cx, y: cy };
}

export const SERVICE_ZONES: ServiceZone[] = [
  {
    id: 'pay-n-spray',
    x: 1640,
    y: 880,
    radius: 66,
    label: 'Oficina Aliados ($150)',
  },
  {
    id: 'garage',
    x: 920,
    y: 1520,
    radius: 66,
    label: 'Garagem & Arsenal Clérigos',
  },
];

// Authentic Porto & Gaia Landmark Replicas
export const LIFE_LOCATIONS: LifeLocation[] = [
  {
    id: 'home-porto',
    kind: 'home',
    label: 'Apartamento do Porto',
    description: 'O teu espaço pessoal para descansar, cozinhar e tratar de ti',
    x: 930,
    y: 1560,
    radius: 92,
    markerColor: '#34D399',
    icon: '⌂',
    npcName: 'Amélia Costa',
    npcRole: 'Vizinha',
    npcColor: '#34D399',
    npcShirtColor: '#0F766E',
  },
  {
    id: 'cafe-ribeira',
    kind: 'cafe',
    label: 'Café da Ribeira',
    description: 'Atendimento, refeições e trabalho de barista junto ao Douro',
    x: 2235,
    y: 1820,
    radius: 92,
    markerColor: '#F59E0B',
    icon: '☕',
    npcName: 'Inês Martins',
    npcRole: 'Barista',
    npcColor: '#F59E0B',
    npcShirtColor: '#B45309',
  },
  {
    id: 'mercado-bolhao',
    kind: 'market',
    label: 'Mercado do Bolhão',
    description: 'Compra mantimentos e encontra trabalho no comércio',
    x: 1985,
    y: 790,
    radius: 92,
    markerColor: '#38BDF8',
    icon: 'M',
    npcName: 'Manuel Ferreira',
    npcRole: 'Comerciante',
    npcColor: '#38BDF8',
    npcShirtColor: '#1D4ED8',
  },
  {
    id: 'jardim-cordoaria',
    kind: 'garden',
    label: 'Jardim da Cordoaria',
    description: 'Espaço verde, convívio e trabalhos de jardinagem',
    x: 855,
    y: 1160,
    radius: 88,
    markerColor: '#4ADE80',
    icon: '✿',
    npcName: 'Teresa Rocha',
    npcRole: 'Jardineira',
    npcColor: '#4ADE80',
    npcShirtColor: '#166534',
  },
  {
    id: 'depot-gaia',
    kind: 'depot',
    label: 'Ponto Logístico de Gaia',
    description: 'Recolha e distribuição de encomendas entre as duas margens',
    x: 2925,
    y: 1190,
    radius: 92,
    markerColor: '#A78BFA',
    icon: 'D',
    npcName: 'Rui Carvalho',
    npcRole: 'Despachante',
    npcColor: '#A78BFA',
    npcShirtColor: '#6D28D9',
  },
  {
    id: 'construction-boavista',
    kind: 'construction',
    label: 'Estaleiro da Boavista',
    description: 'Trabalhos de manutenção e construção urbana',
    x: 855,
    y: 500,
    radius: 88,
    markerColor: '#FB923C',
    icon: 'C',
    npcName: 'Carlos Pinto',
    npcRole: 'Encarregado',
    npcColor: '#FB923C',
    npcShirtColor: '#9A3412',
  },
];

export const BUILDINGS: Building[] = [
  // Row 1 (Norte: Boavista -> Aliados -> Bolhão -> Gaia Norte)
  {
    id: 'casa-da-musica',
    x: 380,
    y: 390,
    w: 390,
    h: 340,
    color: '#E5E7EB',
    roofColor: '#CBD5E1',
    label: 'Casa da Música',
    district: 'Rotunda da Boavista',
    landmark: 'casadamusica',
    facadeStyle: 'white_concrete',
    accentColor: '#38BDF8',
    floors: 7,
    entranceX: 575,
    entranceY: 315,
    simActionLabel: 'Aceder ao Auditório Suggia',
  },
  {
    id: 'camara-municipal',
    x: 1060,
    y: 390,
    w: 440,
    h: 340,
    color: '#A8A29E',
    roofColor: '#334155',
    label: 'Câmara Municipal do Porto',
    district: 'Avenida dos Aliados',
    landmark: 'camara',
    facadeStyle: 'granite',
    accentColor: '#F59E0B',
    floors: 6,
    entranceX: 1280,
    entranceY: 790,
    simActionLabel: 'Desativar alarme na Sala Nobre',
  },
  {
    id: 'mercado-bolhao',
    x: 1780,
    y: 390,
    w: 410,
    h: 340,
    color: '#D6CFC2',
    roofColor: '#B45309',
    label: 'Mercado do Bolhão',
    district: 'Rua Formosa · Baixa',
    landmark: 'bolhao',
    facadeStyle: 'granite',
    accentColor: '#10B981',
    floors: 3,
    entranceX: 1985,
    entranceY: 790,
    simActionLabel: 'Recolher carga Vintage nas bancas',
  },
  {
    id: 'caves-sandeman',
    x: 2960,
    y: 410,
    w: 200,
    h: 310,
    color: '#E7E5E4',
    roofColor: '#9A3412',
    label: 'Caves Sandeman (Gaia)',
    district: 'Cais de Gaia',
    landmark: 'caves_gaia',
    facadeStyle: 'ochre',
    accentColor: '#EF4444',
    floors: 3,
    entranceX: 2925,
    entranceY: 565,
    simActionLabel: 'Registar entrega nos armazéns',
  },

  // Row 2 (Centro Histórico: Carmelitas/Lello -> Clérigos -> São Bento -> Gaia Centro)
  {
    id: 'livraria-lello',
    x: 380,
    y: 1020,
    w: 380,
    h: 340,
    color: '#E6DEC8',
    roofColor: '#7C2D12',
    label: 'Livraria Lello',
    district: 'Rua das Carmelitas',
    landmark: 'lello',
    facadeStyle: 'granite',
    accentColor: '#E11D48',
    floors: 4,
    entranceX: 570,
    entranceY: 945,
    simActionLabel: 'Recolher manuscrito na Escadaria',
  },
  {
    id: 'torre-clerigos',
    x: 1070,
    y: 1020,
    w: 420,
    h: 340,
    color: '#B8B0A2',
    roofColor: '#9A3412',
    label: 'Torre dos Clérigos',
    district: 'Campo dos Mártires da Pátria',
    landmark: 'clerigos',
    facadeStyle: 'granite',
    accentColor: '#F59E0B',
    floors: 12,
    entranceX: 1280,
    entranceY: 945,
    simActionLabel: 'Subir ao campanário dos Clérigos',
  },
  {
    id: 'estacao-sao-bento',
    x: 1780,
    y: 1020,
    w: 410,
    h: 340,
    color: '#C7C1B6',
    roofColor: '#1E293B',
    label: 'Estação de São Bento',
    district: 'Praça Almeida Garrett',
    landmark: 'saobento',
    facadeStyle: 'azulejo',
    accentColor: '#0284C7',
    floors: 5,
    entranceX: 1985,
    entranceY: 945,
    simActionLabel: 'Simular acesso ao Átrio dos Azulejos',
  },
  {
    id: 'caves-taylors',
    x: 2960,
    y: 1030,
    w: 200,
    h: 320,
    color: '#D6D3D1',
    roofColor: '#9A3412',
    label: 'Caves Graham’s & Taylor’s',
    district: 'Vila Nova de Gaia',
    landmark: 'caves_gaia',
    facadeStyle: 'ochre',
    accentColor: '#F59E0B',
    floors: 3,
    entranceX: 2925,
    entranceY: 1190,
    simActionLabel: 'Armazenar barris na Cave Histórica',
  },

  // Row 3 (Zona Histórica Sul: Palácio da Bolsa -> Sé Catedral -> Ribeira -> Serra do Pilar)
  {
    id: 'palacio-da-bolsa',
    x: 380,
    y: 1650,
    w: 400,
    h: 340,
    color: '#BFB8AA',
    roofColor: '#475569',
    label: 'Palácio da Bolsa',
    district: 'Praça do Infante Dom Henrique',
    landmark: 'bolsa',
    facadeStyle: 'granite',
    accentColor: '#FBBF24',
    floors: 5,
    entranceX: 580,
    entranceY: 1580,
    simActionLabel: 'Entregar documentos no Salão Árabe',
  },
  {
    id: 'se-do-porto',
    x: 1070,
    y: 1650,
    w: 420,
    h: 340,
    color: '#9C9488',
    roofColor: '#7C2D12',
    label: 'Sé do Porto (Catedral)',
    district: 'Terreiro da Sé',
    landmark: 'se',
    facadeStyle: 'granite',
    accentColor: '#38BDF8',
    floors: 8,
    entranceX: 1280,
    entranceY: 1580,
    simActionLabel: 'Proteger relíquias no Claustro da Sé',
  },
  {
    id: 'cais-da-ribeira',
    x: 1780,
    y: 1650,
    w: 410,
    h: 340,
    color: '#D97706',
    roofColor: '#B45309',
    label: 'Casario da Ribeira',
    district: 'Cais da Ribeira · Douro',
    landmark: 'ribeira',
    facadeStyle: 'ochre',
    accentColor: '#FB7185',
    floors: 5,
    entranceX: 2235,
    entranceY: 1820,
    simActionLabel: 'Contactar barqueiro no Cais da Estiva',
  },
  {
    id: 'serra-do-pilar',
    x: 2960,
    y: 1660,
    w: 200,
    h: 310,
    color: '#E7E5E4',
    roofColor: '#9A3412',
    label: 'Mosteiro da Serra do Pilar',
    district: 'Encosta de Gaia',
    landmark: 'serra_pilar',
    facadeStyle: 'granite',
    accentColor: '#34D399',
    floors: 7,
    entranceX: 2925,
    entranceY: 1815,
    simActionLabel: 'Observar a cidade no Miradouro',
  },
];

// European city trees (plane trees along Aliados, Boavista, Cordoaria, and cypresses near Sé/Gaia)
export const CITY_TREES: CityTree[] = [
  // Avenida dos Aliados central promenade trees
  { x: 1555, y: 460, scale: 1.0, angle: 0.4, variant: 'plane' },
  { x: 1555, y: 660, scale: 0.95, angle: 1.2, variant: 'plane' },
  { x: 1555, y: 1120, scale: 1.05, angle: 2.1, variant: 'plane' },
  { x: 1555, y: 1320, scale: 0.92, angle: 0.8, variant: 'plane' },
  { x: 1725, y: 460, scale: 0.98, angle: 1.7, variant: 'plane' },
  { x: 1725, y: 660, scale: 1.02, angle: 2.5, variant: 'plane' },
  { x: 1725, y: 1120, scale: 0.94, angle: 0.3, variant: 'plane' },
  { x: 1725, y: 1320, scale: 1.0, angle: 1.9, variant: 'plane' },

  // Jardim da Cordoaria & Clérigos
  { x: 855, y: 1080, scale: 1.15, angle: 0.5, variant: 'plane' },
  { x: 855, y: 1240, scale: 1.1, angle: 1.4, variant: 'plane' },
  { x: 995, y: 1080, scale: 1.05, angle: 2.2, variant: 'cypress' },
  { x: 995, y: 1280, scale: 1.1, angle: 0.9, variant: 'cypress' },

  // Cais da Ribeira riverside promenade trees
  { x: 2435, y: 440, scale: 0.95, angle: 0.6, variant: 'plane' },
  { x: 2435, y: 740, scale: 1.05, angle: 1.5, variant: 'plane' },
  { x: 2435, y: 1100, scale: 0.98, angle: 2.4, variant: 'plane' },
  { x: 2435, y: 1360, scale: 1.0, angle: 0.2, variant: 'plane' },
  { x: 2435, y: 1720, scale: 1.05, angle: 1.9, variant: 'plane' },
  { x: 2435, y: 1960, scale: 0.95, angle: 2.8, variant: 'plane' },

  // Jardins de Gaia & Serra do Pilar
  { x: 2895, y: 480, scale: 1.1, angle: 0.3, variant: 'cypress' },
  { x: 2895, y: 720, scale: 1.0, angle: 1.1, variant: 'plane' },
  { x: 2895, y: 1120, scale: 1.08, angle: 2.0, variant: 'cypress' },
  { x: 2895, y: 1740, scale: 1.15, angle: 0.7, variant: 'cypress' },
  { x: 2895, y: 1950, scale: 1.1, angle: 1.8, variant: 'cypress' },

  // Boavista & Praça do Infante
  { x: 320, y: 450, scale: 1.0, angle: 0.5, variant: 'plane' },
  { x: 320, y: 690, scale: 1.05, angle: 1.7, variant: 'plane' },
  { x: 320, y: 1720, scale: 1.02, angle: 2.3, variant: 'plane' },
  { x: 320, y: 1940, scale: 0.98, angle: 0.9, variant: 'plane' },
];

export const MISSION_WAYPOINTS: { x: number; y: number; area: string }[] = BUILDINGS.map((b) => ({
  x: b.entranceX,
  y: b.entranceY,
  area: b.label,
}));

export function resolveCircleRectCollision(
  cx: number,
  cy: number,
  r: number,
  rect: Building,
): { x: number; y: number; collided: boolean } {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= r * r) {
    return { x: cx, y: cy, collided: false };
  }

  const dist = Math.sqrt(distSq);
  if (dist > 0.0001) {
    const overlap = r - dist;
    return {
      x: cx + (dx / dist) * overlap,
      y: cy + (dy / dist) * overlap,
      collided: true,
    };
  }

  const leftDist = Math.abs(cx - rect.x);
  const rightDist = Math.abs(rect.x + rect.w - cx);
  const topDist = Math.abs(cy - rect.y);
  const bottomDist = Math.abs(rect.y + rect.h - cy);
  const minD = Math.min(leftDist, rightDist, topDist, bottomDist);
  if (minD === leftDist) return { x: rect.x - r, y: cy, collided: true };
  if (minD === rightDist) return { x: rect.x + rect.w + r, y: cy, collided: true };
  if (minD === topDist) return { x: cx, y: rect.y - r, collided: true };
  return { x: cx, y: rect.y + rect.h + r, collided: true };
}
