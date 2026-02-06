import Peer, { DataConnection } from 'peerjs';
import { GameState, MessageType, NetworkMessage, InputPayload } from '../types';

type MessageHandler = (msg: NetworkMessage) => void;

class NetworkManager {
  peer: Peer | null = null;
  connections: DataConnection[] = []; // Host keeps all, Client keeps Host
  hostConn: DataConnection | null = null; // For client only
  
  myId: string = '';
  isHost: boolean = false;
  
  private onMessageCallback: MessageHandler | null = null;
  private onConnectionCallback: ((conn: DataConnection) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  initialize(requestedId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer(requestedId || '', { debug: 1 });

      this.peer.on('open', (id) => {
        this.myId = id;
        console.log('PeerJS initialized with ID:', id);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        // If ID taken, maybe retry?
        reject(err);
      });
      
      this.peer.on('disconnected', () => {
         // Auto-reconnect to signaling server
         this.peer?.reconnect();
      });
    });
  }

  connectToHost(hostId: string) {
    if (!this.peer) return;
    this.isHost = false;
    const conn = this.peer.connect(hostId, { reliable: true });
    this.setupConnection(conn);
    this.hostConn = conn;
    this.connections.push(conn);
  }

  // Host Logic
  private handleIncomingConnection(conn: DataConnection) {
    if (this.connections.length >= 3 && this.isHost) {
        // Full room
        conn.close();
        return;
    }
    this.setupConnection(conn);
    this.connections.push(conn);
    if (this.onConnectionCallback) this.onConnectionCallback(conn);
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log('Connection opened:', conn.peer);
    });

    conn.on('data', (data: any) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(data as NetworkMessage);
      }
    });

    conn.on('close', () => {
      console.log('Connection closed:', conn.peer);
      this.connections = this.connections.filter(c => c.peer !== conn.peer);
      if (conn === this.hostConn && this.onDisconnectCallback) {
         this.onDisconnectCallback();
      }
    });
    
    conn.on('error', (err) => console.error('Conn error:', err));
  }

  send(msg: NetworkMessage) {
    const serialized = JSON.stringify(msg);
    // PeerJS send handles serialization usually, but keeping it explicit ensures types
    if (this.isHost) {
      // Broadcast to all clients
      this.connections.forEach(conn => {
        if(conn.open) conn.send(msg);
      });
    } else {
      // Send to host
      if (this.hostConn && this.hostConn.open) {
        this.hostConn.send(msg);
      }
    }
  }

  setMessageHandler(handler: MessageHandler) {
    this.onMessageCallback = handler;
  }
  
  setConnectionHandler(handler: (conn: DataConnection) => void) {
      this.onConnectionCallback = handler;
  }
  
  setDisconnectHandler(handler: () => void) {
      this.onDisconnectCallback = handler;
  }
}

export const networkManager = new NetworkManager();
