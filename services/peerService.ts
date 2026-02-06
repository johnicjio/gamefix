
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
  private reconnectInterval: any = null;

  constructor() {}

  async init(customId?: string): Promise<string> {
    // If we already have an active peer with the same ID, just return it
    if (this.peer && !this.peer.destroyed && this.myId && (!customId || customId === this.myId)) {
        if (this.peer.disconnected) {
            this.peer.reconnect();
        }
        return this.myId;
    }

    this.cleanup();
    
    return new Promise((resolve, reject) => {
      this.peer = new Peer(customId || '', PEER_CONFIG);

      this.peer.on('open', (id) => {
        this.myId = id;
        this.stopReconnect();
        resolve(id);
      });

      this.peer.on('error', (err: any) => {
        console.error('Peer error:', err?.type, err);
        
        if (err?.type === 'peer-unavailable') {
             if (this.onError) this.onError(err);
        } else if (err?.type === 'network' || err?.type === 'server-error' || err?.message === 'Lost connection to server.') {
             // Suppress alert, try reconnect
             console.warn('Network issue detected. Attempting signaling reconnect...');
             this.startReconnect();
        } else {
             if (this.onError) this.onError(err);
             if (!this.myId) reject(err);
        }
      });

      this.peer.on('disconnected', () => {
          console.warn('Peer disconnected from server.');
          this.startReconnect();
      });

      this.peer.on('close', () => {
          console.warn('Peer destroyed.');
          this.cleanup();
      });

      this.peer.on('connection', (conn) => {
        this.handleConnection(conn);
      });
    });
  }

  private startReconnect() {
      if (this.reconnectInterval) return;
      
      // Try once immediately
      if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
          this.peer.reconnect();
      }

      this.reconnectInterval = setInterval(() => {
          if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
              console.log('Reconnecting to signaling server...');
              this.peer.reconnect();
          } else {
              this.stopReconnect();
          }
      }, 3000);
  }

  private stopReconnect() {
      if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
      }
  }

  connect(hostId: string) {
    if (!this.peer || this.peer.destroyed) return;
    try {
        if (this.peer.disconnected) this.peer.reconnect();
        
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
          // Send join request immediately
          setTimeout(() => {
            if (conn.open) conn.send({ type: 'JOIN_REQUEST', peerId: this.myId });
          }, 500);
      } else {
          if (this.onPeerConnected) this.onPeerConnected(conn.peer);
      }
      this.startHeartbeat();
    });

    conn.on('data', (data) => {
      if ((data as any)?.type === 'HEARTBEAT') return;
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
        console.error("Connection Error:", err);
        if (this.onError) this.onError(err);
    });
  }

  send(data: any, targetPeerId?: string) {
    // If disconnected from signaling, P2P might still work, but we check if we need to reconnect
    if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
        this.peer.reconnect();
    }

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
      }, 3000);
  }

  private stopHeartbeat() {
      if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
      }
  }

  cleanup() {
    this.stopHeartbeat();
    this.stopReconnect();
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    this.hostConnection = null;
    if (this.peer) {
        // Only destroy if we are truly done (e.g. app unmount or manual disconnect)
        // But for cleanup during init, we destroy old one
        if (!this.peer.destroyed) this.peer.destroy();
        this.peer = null;
    }
    this.myId = '';
  }

  destroy() {
    this.cleanup();
  }
}

export const peerService = new PeerService();
