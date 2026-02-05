
import { Peer, DataConnection } from "peerjs";

const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

export class PeerService {
  peer: Peer | null = null;
  connections: Map<string, DataConnection> = new Map();
  hostConnection: DataConnection | null = null;
  
  onData: ((data: any, senderId: string) => void) | null = null;
  onPeerConnected: ((peerId: string) => void) | null = null;
  onPeerDisconnected: ((peerId: string) => void) | null = null;
  onConnect: (() => void) | null = null;
  onClose: (() => void) | null = null;
  onError: ((err: any) => void) | null = null;
  
  myId: string = '';
  private heartbeatInterval: any = null;

  constructor() {}

  async init(customId?: string): Promise<string> {
    this.cleanup();
    
    return new Promise((resolve, reject) => {
      this.peer = new Peer(customId || '', PEER_CONFIG);

      this.peer.on('open', (id) => {
        this.myId = id;
        resolve(id);
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (this.onError) this.onError(err);
        if (!this.myId) reject(err);
      });

      this.peer.on('connection', (conn) => {
        this.handleConnection(conn);
      });
    });
  }

  connect(hostId: string) {
    if (!this.peer) return;
    try {
        const conn = this.peer.connect(hostId, { reliable: true });
        this.handleConnection(conn, true);
    } catch (e) {
        if (this.onError) this.onError(e);
    }
  }

  handleConnection(conn: DataConnection, isOutgoingToHost = false) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      if (isOutgoingToHost) {
          this.hostConnection = conn;
          if (this.onConnect) this.onConnect();
          this.send({ type: 'JOIN_REQUEST', peerId: this.myId });
      } else {
          if (this.onPeerConnected) this.onPeerConnected(conn.peer);
      }
      this.startHeartbeat();
    });

    conn.on('data', (data) => {
      if (data?.type === 'HEARTBEAT') return;
      if (this.onData) this.onData(data, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (isOutgoingToHost) {
          this.hostConnection = null;
          if (this.onClose) this.onClose();
      } else {
          if (this.onPeerDisconnected) this.onPeerDisconnected(conn.peer);
      }
    });

    conn.on('error', (err) => {
        if (this.onError) this.onError(err);
    });
  }

  send(data: any, targetPeerId?: string) {
    if (targetPeerId) {
        const conn = this.connections.get(targetPeerId);
        if (conn && conn.open) conn.send(data);
    } else {
        this.connections.forEach(conn => {
            if (conn.open) conn.send(data);
        });
    }
  }

  private startHeartbeat() {
      if (this.heartbeatInterval) return;
      this.heartbeatInterval = setInterval(() => {
          this.connections.forEach(conn => {
              if (conn.open) conn.send({ type: 'HEARTBEAT' });
          });
      }, 5000);
  }

  private stopHeartbeat() {
      if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
      }
  }

  cleanup() {
    this.stopHeartbeat();
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    this.hostConnection = null;
    if (this.peer) {
        this.peer.destroy();
        this.peer = null;
    }
    this.myId = '';
  }

  destroy() {
    this.cleanup();
  }
}

export const peerService = new PeerService();
