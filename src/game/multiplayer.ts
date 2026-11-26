import type {
  CharacterId,
  ChatMessage,
  EmergencyPing,
  ProfessionId,
  RemotePlayer,
  VehicleType,
  WeaponId,
} from './types.ts';

export interface MultiplayerCallbacks {
  onStatusChange: (connected: boolean, onlineCount: number, roomId: string) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onRemoteFire: (evt: {
    id: string;
    weaponId: WeaponId;
    x: number;
    y: number;
    angle: number;
  }) => void;
  onHitReceived: (evt: { attackerId: string; attackerName: string; damage: number }) => void;
  onPspNoticed: (evt: {
    officerName: string;
    actionKind: 'warn' | 'fine';
    fineAmount: number;
    reason: string;
  }) => void;
  onPspConfirmed: (evt: {
    targetName: string;
    actionKind: 'warn' | 'fine';
    fineAmount: number;
  }) => void;
  onEmergencyPing: (ping: EmergencyPing) => void;
}

export class LeonidaMultiplayerClient {
  public localId: string | null = null;
  public roomId = 'porto-ribeira';
  public connected = false;
  public remotePlayers = new Map<string, RemotePlayer>();

  private ws: WebSocket | null = null;
  private callbacks: MultiplayerCallbacks;
  private playerName = 'Piloto do Porto';
  private character: CharacterId = 'lucia';
  private profession: ProfessionId = 'taxi';
  private lastSendAt = 0;
  private reconnectTimer: number | null = null;
  private intentionalClose = false;
  private reconnectAttempt = 0;

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(
    name: string,
    roomId: string,
    character: CharacterId,
    profession: ProfessionId = 'taxi',
  ) {
    this.playerName = name.trim().slice(0, 20) || 'Piloto do Porto';
    this.roomId =
      roomId
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 24) || 'porto-ribeira';
    this.character = character;
    this.profession = profession;
    this.intentionalClose = false;
    this.openSocket();
  }

  private openSocket() {
    this.clearReconnect();
    if (this.ws) {
      const oldWs = this.ws;
      this.ws = null;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onclose = null;
      oldWs.onerror = null;
      try {
        oldWs.close();
      } catch {
        // Ignore close error
      }
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws/leonida`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempt = 0;
      ws.send(
        JSON.stringify({
          type: 'join',
          name: this.playerName,
          roomId: this.roomId,
          character: this.character,
          profession: this.profession,
          onDuty: true,
          drivingPoints: 12,
        }),
      );
      this.notifyStatus();
    };

    ws.onmessage = (ev) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(ev.data)) as Record<string, unknown>;
      } catch {
        return;
      }

      if (data.type === 'welcome') {
        this.localId = typeof data.id === 'string' ? data.id : null;
        this.roomId = typeof data.roomId === 'string' ? data.roomId : this.roomId;
        this.remotePlayers.clear();
        if (Array.isArray(data.players)) {
          for (const raw of data.players) {
            const p = raw as RemotePlayer;
            if (p && p.id && p.id !== this.localId) {
              this.remotePlayers.set(p.id, {
                ...p,
                profession: p.profession ?? 'taxi',
                onDuty: p.onDuty ?? true,
                drivingPoints: p.drivingPoints ?? 12,
              });
            }
          }
        }
        this.notifyStatus();
        return;
      }

      if (data.type === 'player:upsert') {
        const p = data.player as RemotePlayer | undefined;
        if (p && p.id && p.id !== this.localId) {
          this.remotePlayers.set(p.id, {
            ...p,
            profession: p.profession ?? 'taxi',
            onDuty: p.onDuty ?? true,
            drivingPoints: p.drivingPoints ?? 12,
          });
          this.notifyStatus();
        }
        return;
      }

      if (data.type === 'player:leave') {
        const id = typeof data.id === 'string' ? data.id : '';
        if (id && this.remotePlayers.delete(id)) {
          this.notifyStatus();
        }
        return;
      }

      if (data.type === 'player:fire') {
        const id = typeof data.id === 'string' ? data.id : '';
        if (!id || id === this.localId) return;
        this.callbacks.onRemoteFire({
          id,
          weaponId: (data.weaponId as WeaponId) ?? 'pistol',
          x: Number(data.x) || 0,
          y: Number(data.y) || 0,
          angle: Number(data.angle) || 0,
        });
        return;
      }

      if (data.type === 'player:hit') {
        this.callbacks.onHitReceived({
          attackerId: String(data.attackerId ?? ''),
          attackerName: String(data.attackerName ?? 'Jogador'),
          damage: Number(data.damage) || 20,
        });
        return;
      }

      if (data.type === 'psp:noticed') {
        this.callbacks.onPspNoticed({
          officerName: String(data.officerName ?? 'Agente PSP'),
          actionKind: data.actionKind === 'fine' ? 'fine' : 'warn',
          fineAmount: Number(data.fineAmount) || 0,
          reason: String(data.reason ?? 'Fiscalização rodoviária'),
        });
        return;
      }

      if (data.type === 'psp:confirmed') {
        this.callbacks.onPspConfirmed({
          targetName: String(data.targetName ?? 'Condutor'),
          actionKind: data.actionKind === 'fine' ? 'fine' : 'warn',
          fineAmount: Number(data.fineAmount) || 0,
        });
        return;
      }

      if (data.type === 'emergency:ping') {
        this.callbacks.onEmergencyPing({
          id: String(data.id ?? `em-${Date.now()}`),
          kind: data.kind === 'speed' ? 'speed' : '112',
          label: String(data.label ?? 'Ocorrência no Porto'),
          x: Number(data.x) || 1640,
          y: Number(data.y) || 940,
          callerName: String(data.callerName ?? 'Cidadão'),
          speedKmh: data.speedKmh !== undefined ? Number(data.speedKmh) : undefined,
          createdAt: Number(data.createdAt) || Date.now(),
        });
        return;
      }

      if (data.type === 'chat:message') {
        const msg = data.message as ChatMessage | undefined;
        if (msg && msg.id && msg.text) {
          this.callbacks.onChatMessage(msg);
        }
      }
    };

    ws.onclose = () => {
      this.connected = false;
      this.ws = null;
      this.notifyStatus();
      if (!this.intentionalClose) {
        const delay = Math.min(8000, 1200 * Math.pow(1.5, this.reconnectAttempt));
        this.reconnectAttempt += 1;
        this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay);
      }
    };

    ws.onerror = () => {
      // Handled by onclose
    };
  }

  public sendState(payload: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    speed: number;
    vehicleType: VehicleType | null;
    vehicleColor: string;
    character: CharacterId;
    profession: ProfessionId;
    onDuty: boolean;
    drivingPoints: number;
    sirenActive: boolean;
    weaponId: WeaponId;
    hp: number;
    wantedStars: number;
  }) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    if (now - this.lastSendAt < 50) return;
    this.lastSendAt = now;
    this.ws.send(JSON.stringify({ type: 'state', ...payload }));
  }

  public sendPspAction(
    targetId: string,
    actionKind: 'warn' | 'fine',
    fineAmount: number,
    reason: string,
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'psp:action',
        targetId,
        actionKind,
        fineAmount,
        reason,
      }),
    );
  }

  public sendEmergencyCall(
    kind: 'speed' | '112',
    x: number,
    y: number,
    label: string,
    speedKmh?: number,
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'emergency:call',
        kind,
        x,
        y,
        label,
        speedKmh,
      }),
    );
  }

  public sendFire(weaponId: WeaponId, x: number, y: number, angle: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'fire', weaponId, x, y, angle }));
  }

  public sendHit(targetId: string, damage: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'hit', targetId, damage }));
  }

  public sendChat(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const clean = text.trim().slice(0, 140);
    if (!clean) return;
    this.ws.send(JSON.stringify({ type: 'chat', text: clean }));
  }

  private notifyStatus() {
    const count = this.connected ? this.remotePlayers.size + 1 : 0;
    this.callbacks.onStatusChange(this.connected, count, this.roomId);
  }

  private clearReconnect() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public disconnect() {
    this.intentionalClose = true;
    this.clearReconnect();
    this.remotePlayers.clear();
    if (this.ws) {
      const oldWs = this.ws;
      this.ws = null;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onclose = null;
      oldWs.onerror = null;
      try {
        oldWs.close();
      } catch {
        // Ignore
      }
    }
    this.connected = false;
    this.notifyStatus();
  }
}
