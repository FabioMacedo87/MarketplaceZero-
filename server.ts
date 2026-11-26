import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '32kb' }));

interface LeaderboardEntry {
  id: string;
  playerName: string;
  character: 'Lucía' | 'Jason';
  cash: number;
  missionsCompleted: number;
  maxStars: number;
  platform: 'desktop' | 'mobile';
  createdAt: string;
}

type CharacterId = 'lucia' | 'jason';
type VehicleType = 'coupe' | 'muscle' | 'buggy' | 'police' | 'taxi';
type WeaponId = 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'rpg';
type ProfessionId = 'psp' | 'taxi' | 'courier' | 'merchant' | 'paramedic';

interface ServerPlayer {
  id: string;
  roomId: string;
  name: string;
  character: CharacterId;
  profession: ProfessionId;
  onDuty: boolean;
  drivingPoints: number;
  sirenActive: boolean;
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

const VALID_WEAPONS = new Set<WeaponId>(['pistol', 'smg', 'shotgun', 'rifle', 'rpg']);
const VALID_VEHICLES = new Set<VehicleType>(['coupe', 'muscle', 'buggy', 'police', 'taxi']);
const VALID_PROFESSIONS = new Set<ProfessionId>(['psp', 'taxi', 'courier', 'merchant', 'paramedic']);

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeRoomId(raw: unknown): string {
  if (typeof raw !== 'string') return 'porto-ribeira';
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  return cleaned.length >= 2 ? cleaned : 'porto-ribeira';
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Piloto';
  const cleaned = raw.replace(/[<>]/g, '').trim().slice(0, 20);
  return cleaned.length >= 2 ? cleaned : 'Piloto';
}

function sanitizeColor(raw: unknown): string {
  if (typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  return '#F43F5E';
}

let leaderboardStore: LeaderboardEntry[] = [
  {
    id: 'lb-1',
    playerName: 'Lucía V.',
    character: 'Lucía',
    cash: 6450,
    missionsCompleted: 7,
    maxStars: 5,
    platform: 'desktop',
    createdAt: '2026-11-26',
  },
  {
    id: 'lb-2',
    playerName: 'Jason M.',
    character: 'Jason',
    cash: 4820,
    missionsCompleted: 5,
    maxStars: 4,
    platform: 'mobile',
    createdAt: '2026-11-25',
  },
  {
    id: 'lb-3',
    playerName: 'Diogo R.',
    character: 'Lucía',
    cash: 3190,
    missionsCompleted: 4,
    maxStars: 3,
    platform: 'mobile',
    createdAt: '2026-11-24',
  },
];

// Authoritative Live Multiplayer Rooms
const rooms = new Map<string, Map<string, { player: ServerPlayer; ws: WebSocket }>>();

function getRoom(roomId: string) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastRoom(roomId: string, payload: unknown, excludeId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const serialized = JSON.stringify(payload);
  for (const [pid, client] of room.entries()) {
    if (pid === excludeId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(serialized);
    }
  }
}

app.get('/api/health', (_req, res) => {
  let totalOnline = 0;
  for (const r of rooms.values()) totalOnline += r.size;
  res.json({ ok: true, service: 'PortoRush', onlinePlayers: totalOnline });
});

app.get('/api/game/leaderboard', (_req, res) => {
  res.json({ entries: leaderboardStore.slice(0, 10) });
});

app.post('/api/game/leaderboard', (req, res) => {
  const { playerName, character, cash, missionsCompleted, maxStars, platform } = req.body ?? {};
  const cleanName = sanitizeName(playerName) || 'Piloto do Porto';
  const cleanChar = character === 'Jason' ? 'Jason' : 'Lucía';
  const cleanCash = Math.round(clampNum(cash, 0, 9_999_999, 0));
  const cleanMissions = Math.round(clampNum(missionsCompleted, 0, 999, 0));
  const cleanStars = Math.round(clampNum(maxStars, 0, 5, 0));
  const cleanPlatform = platform === 'mobile' ? 'mobile' : 'desktop';

  const entry: LeaderboardEntry = {
    id: `lb-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
    playerName: cleanName,
    character: cleanChar,
    cash: cleanCash,
    missionsCompleted: cleanMissions,
    maxStars: cleanStars,
    platform: cleanPlatform,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  leaderboardStore = [entry, ...leaderboardStore]
    .sort((a, b) => b.cash - a.cash)
    .slice(0, 15);

  res.status(201).json({ entry, entries: leaderboardStore.slice(0, 10) });
});

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const runningViaTsx =
    process.env.npm_lifecycle_event === 'dev' ||
    process.execArgv.some((arg) => arg.includes('tsx'));
  const useStaticProd =
    process.env.NODE_ENV === 'production' || (!runningViaTsx && fs.existsSync(distPath));

  if (!useStaticProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/leonida' });

  wss.on('connection', (ws) => {
    const clientId = crypto.randomUUID().slice(0, 10);
    let currentRoomId = 'porto-ribeira';
    let joined = false;
    let lastChatAt = 0;
    let lastPspActionAt = 0;
    let lastEmergencyAt = 0;

    ws.on('message', (rawBuf) => {
      let msg: Record<string, unknown>;
      try {
        const text = rawBuf.toString('utf8');
        if (text.length > 4096) return;
        msg = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type;
      if (type === 'join') {
        if (joined) {
          const oldRoom = rooms.get(currentRoomId);
          oldRoom?.delete(clientId);
          broadcastRoom(currentRoomId, { type: 'player:leave', id: clientId });
        }
        currentRoomId = sanitizeRoomId(msg.roomId);
        const room = getRoom(currentRoomId);
        const prof = VALID_PROFESSIONS.has(msg.profession as ProfessionId)
          ? (msg.profession as ProfessionId)
          : 'taxi';

        const player: ServerPlayer = {
          id: clientId,
          roomId: currentRoomId,
          name: sanitizeName(msg.name),
          character: msg.character === 'jason' ? 'jason' : 'lucia',
          profession: prof,
          onDuty: msg.onDuty !== false,
          drivingPoints: Math.round(clampNum(msg.drivingPoints, 0, 12, 12)),
          sirenActive: Boolean(msg.sirenActive),
          x: clampNum(msg.x, 30, 3180, 1640),
          y: clampNum(msg.y, 30, 2370, 940),
          vx: 0,
          vy: 0,
          angle: clampNum(msg.angle, -Math.PI * 2, Math.PI * 2, -Math.PI / 2),
          speed: 0,
          vehicleType: null,
          vehicleColor: '#F43F5E',
          weaponId: VALID_WEAPONS.has(msg.weaponId as WeaponId) ? (msg.weaponId as WeaponId) : 'pistol',
          hp: 100,
          wantedStars: 0,
          updatedAt: Date.now(),
        };

        room.set(clientId, { player, ws });
        joined = true;

        const snapshot = Array.from(room.values()).map((c) => c.player);
        ws.send(
          JSON.stringify({
            type: 'welcome',
            id: clientId,
            roomId: currentRoomId,
            players: snapshot,
          }),
        );

        broadcastRoom(currentRoomId, { type: 'player:upsert', player }, clientId);
        broadcastRoom(currentRoomId, {
          type: 'chat:message',
          message: {
            id: `sys-${Date.now()}-${crypto.randomUUID().slice(0, 6)}-${clientId}`,
            sender: 'Porto Live',
            text: `${player.name} entrou em ${currentRoomId}.`,
            kind: 'system',
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (!joined) return;
      const room = rooms.get(currentRoomId);
      const entry = room?.get(clientId);
      if (!room || !entry) return;

      if (type === 'state') {
        const p = entry.player;
        p.x = clampNum(msg.x, 20, 3180, p.x);
        p.y = clampNum(msg.y, 20, 2380, p.y);
        p.vx = clampNum(msg.vx, -900, 900, 0);
        p.vy = clampNum(msg.vy, -900, 900, 0);
        p.angle = clampNum(msg.angle, -Math.PI * 4, Math.PI * 4, p.angle);
        p.speed = clampNum(msg.speed, -400, 900, 0);
        p.vehicleType = VALID_VEHICLES.has(msg.vehicleType as VehicleType)
          ? (msg.vehicleType as VehicleType)
          : null;
        p.vehicleColor = sanitizeColor(msg.vehicleColor);
        p.weaponId = VALID_WEAPONS.has(msg.weaponId as WeaponId) ? (msg.weaponId as WeaponId) : p.weaponId;
        p.hp = clampNum(msg.hp, 0, 150, p.hp);
        p.wantedStars = Math.round(clampNum(msg.wantedStars, 0, 5, p.wantedStars));
        if (VALID_PROFESSIONS.has(msg.profession as ProfessionId)) {
          p.profession = msg.profession as ProfessionId;
        }
        if (typeof msg.onDuty === 'boolean') {
          p.onDuty = msg.onDuty;
        }
        if (msg.drivingPoints !== undefined) {
          p.drivingPoints = Math.round(clampNum(msg.drivingPoints, 0, 12, p.drivingPoints));
        }
        if (typeof msg.sirenActive === 'boolean') {
          p.sirenActive = msg.sirenActive;
        }
        if (msg.character === 'jason' || msg.character === 'lucia') {
          p.character = msg.character;
        }
        p.updatedAt = Date.now();

        broadcastRoom(currentRoomId, { type: 'player:upsert', player: p }, clientId);
        return;
      }

      if (type === 'fire') {
        const weaponId = VALID_WEAPONS.has(msg.weaponId as WeaponId)
          ? (msg.weaponId as WeaponId)
          : entry.player.weaponId;
        const bx = clampNum(msg.x, 20, 3180, entry.player.x);
        const by = clampNum(msg.y, 20, 2380, entry.player.y);
        const angle = clampNum(msg.angle, -Math.PI * 4, Math.PI * 4, entry.player.angle);
        broadcastRoom(
          currentRoomId,
          {
            type: 'player:fire',
            id: clientId,
            weaponId,
            x: bx,
            y: by,
            angle,
          },
          clientId,
        );
        return;
      }

      if (type === 'hit') {
        const targetId = typeof msg.targetId === 'string' ? msg.targetId : '';
        const target = room.get(targetId);
        if (!target || targetId === clientId) return;
        const distSq =
          Math.pow(target.player.x - entry.player.x, 2) +
          Math.pow(target.player.y - entry.player.y, 2);
        if (distSq > 1100 * 1100) return;

        const dmg = Math.round(clampNum(msg.damage, 1, 150, 20));
        if (target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(
            JSON.stringify({
              type: 'player:hit',
              attackerId: clientId,
              attackerName: entry.player.name,
              damage: dmg,
            }),
          );
        }
        return;
      }

      if (type === 'psp:action') {
        const now = Date.now();
        if (now - lastPspActionAt < 4000) return;
        if (entry.player.profession !== 'psp' || !entry.player.onDuty) return;

        const targetId = typeof msg.targetId === 'string' ? msg.targetId : '';
        const target = room.get(targetId);
        if (!target || targetId === clientId) return;

        const distSq =
          Math.pow(target.player.x - entry.player.x, 2) +
          Math.pow(target.player.y - entry.player.y, 2);
        if (distSq > 260 * 260) return;

        lastPspActionAt = now;
        const actionKind = msg.actionKind === 'fine' ? 'fine' : 'warn';
        const fineAmount =
          actionKind === 'fine' ? Math.round(clampNum(msg.fineAmount, 50, 200, 90)) : 0;
        const reason =
          typeof msg.reason === 'string'
            ? msg.reason.replace(/[<>]/g, '').trim().slice(0, 80) || 'Fiscalização de trânsito'
            : 'Fiscalização de trânsito';

        if (target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(
            JSON.stringify({
              type: 'psp:noticed',
              officerName: entry.player.name,
              actionKind,
              fineAmount,
              reason,
            }),
          );
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'psp:confirmed',
              targetName: target.player.name,
              actionKind,
              fineAmount,
            }),
          );
        }
        broadcastRoom(currentRoomId, {
          type: 'chat:message',
          message: {
            id: `psp-${now}-${crypto.randomUUID().slice(0, 6)}-${clientId}`,
            sender: 'PSP Porto',
            text:
              actionKind === 'fine'
                ? `Agente ${entry.player.name} aplicou coima de €${fineAmount} a ${target.player.name} (${reason}).`
                : `Agente ${entry.player.name} emitiu aviso preventivo a ${target.player.name}.`,
            kind: 'system',
            timestamp: now,
          },
        });
        return;
      }

      if (type === 'emergency:call') {
        const now = Date.now();
        if (now - lastEmergencyAt < 3000) return;
        lastEmergencyAt = now;
        const kind = msg.kind === 'speed' ? 'speed' : '112';
        const px = clampNum(msg.x, 20, 3180, entry.player.x);
        const py = clampNum(msg.y, 20, 2380, entry.player.y);
        const speedKmh =
          msg.speedKmh !== undefined ? Math.round(clampNum(msg.speedKmh, 0, 350, 0)) : undefined;
        const label =
          typeof msg.label === 'string'
            ? msg.label.replace(/[<>]/g, '').trim().slice(0, 72) || 'Ocorrência no Porto'
            : 'Ocorrência no Porto';

        broadcastRoom(currentRoomId, {
          type: 'emergency:ping',
          id: `em-${now}-${crypto.randomUUID().slice(0, 6)}`,
          kind,
          label,
          x: px,
          y: py,
          callerName: entry.player.name,
          speedKmh,
          createdAt: now,
        });
        return;
      }

      if (type === 'chat') {
        const now = Date.now();
        if (now - lastChatAt < 700) return;
        lastChatAt = now;
        const text =
          typeof msg.text === 'string'
            ? msg.text.replace(/[<>]/g, '').trim().slice(0, 140)
            : '';
        if (!text) return;
        broadcastRoom(currentRoomId, {
          type: 'chat:message',
          message: {
            id: `msg-${now}-${crypto.randomUUID().slice(0, 6)}-${clientId}`,
            sender: entry.player.name,
            text,
            kind: 'chat',
            timestamp: now,
          },
        });
      }
    });

    ws.on('close', () => {
      if (!joined) return;
      const room = rooms.get(currentRoomId);
      const leaving = room?.get(clientId);
      if (room) {
        room.delete(clientId);
        if (room.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          broadcastRoom(currentRoomId, { type: 'player:leave', id: clientId });
          if (leaving) {
            broadcastRoom(currentRoomId, {
              type: 'chat:message',
              message: {
                id: `sys-${Date.now()}-${crypto.randomUUID().slice(0, 6)}-${clientId}`,
                sender: 'Porto Live',
                text: `${leaving.player.name} saiu da sessão.`,
                kind: 'system',
                timestamp: Date.now(),
              },
            });
          }
        }
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Porto Rush server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
