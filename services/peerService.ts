
import { Peer, DataConnection } from "peerjs";

const LOBBY_PREFIX = "DUO_ARENA_v6_";

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ],
    iceTransportPolicy: 'all' as RTCIceTransportPolicy
  }
};

export class PeerService {
  peer: Peer | null = null;
  connections: Map<string, DataConnection> = new Map();
  onData: ((data: any, senderId: string) => void) | null = null;
  onPeerConnected: ((peerId: string) => void) | null = null;
  onPeerDisconnected: ((peerId: string) => void) | null = null;
  onSignalingStateChange: ((state: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR') => void) | null = null;
  
  myId: string = '';
  private playerName: string = '';
  private heartbeatInterval: any = null;
  private isReconnecting: boolean = false;

  async init(name: string): Promise<string> {
    this.playerName = name;
    if (this.peer && !this.peer.destroyed) return this.myId;

    const targetId = `${LOBBY_PREFIX}${name.replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 7)}`;
    
    return new Promise((resolve) => {
      this.peer = new Peer(targetId, PEER_CONFIG);

      this.peer.on('open', (id) => {
        this.myId = id;
        this.isReconnecting = false;
        if (this.onSignalingStateChange) this.onSignalingStateChange('CONNECTED');
        this.startHeartbeat();
        resolve(id);
      });

      this.peer.on('error', (err: any) => {
        console.warn(`PeerJS Error [${err.type}]`);
        if (['network', 'server-error', 'socket-error'].includes(err.type)) {
          this.handleSignalingLoss();
        }
        if (this.onSignalingStateChange) this.onSignalingStateChange('ERROR');
      });

      this.peer.on('disconnected', () => {
        this.handleSignalingLoss();
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });
    });
  }

  private handleSignalingLoss() {
    if (this.isReconnecting || !this.peer) return;
    this.isReconnecting = true;
    if (this.onSignalingStateChange) this.onSignalingStateChange('RECONNECTING');
    
    setTimeout(() => {
      if (this.peer && this.peer.disconnected) {
        this.peer.reconnect();
      }
    }, 3000);
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.peer && !this.peer.disconnected) {
        (this.peer as any).socket?.send({ type: 'HEARTBEAT' });
      }
    }, 15000);
  }

  connect(peerId: string) {
    if (!this.peer || this.peer.destroyed) return;
    const fullId = peerId.includes(LOBBY_PREFIX) ? peerId : `${LOBBY_PREFIX}${peerId}`;
    const conn = this.peer.connect(fullId, { reliable: true });
    this.setupConnection(conn);
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      if (this.onPeerConnected) this.onPeerConnected(conn.peer);
    });

    conn.on('data', (data: any) => {
      if (data?.type === 'HEARTBEAT') return;
      if (this.onData) this.onData(data, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.onPeerDisconnected) this.onPeerDisconnected(conn.peer);
    });
  }

  send(data: any) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send(data);
    });
  }

  cleanup() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.connections.forEach(conn => conn.close());
    if (this.peer) this.peer.destroy();
  }
}

export const peerService = new PeerService();
