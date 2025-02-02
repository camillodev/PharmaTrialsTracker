import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { Server } from 'http';
import { OutlierLog } from '@db/schema';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';

export class WebSocketServer {
  private wss: WSServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WSServer({ 
      noServer: true,
    });

    this.setupConnectionHandler();
  }

  private setupConnectionHandler() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket client connected');
      // Track clinical-trial connections
      this.clients.add(ws);

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
        this.clients.delete(ws);
        try {
          ws.close();
        } catch (e) {
          console.error('Error closing WebSocket:', e);
        }
      });

      // Send welcome message
      try {
        ws.send(JSON.stringify({ 
          type: 'connection', 
          data: { message: 'Connected to Clinical Trial WebSocket Server' } 
        }));
      } catch (error) {
        console.error('Error sending welcome message:', error);
      }
    });
  }

  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
    // Check if it's a Vite HMR request
    if (request.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
      return; // Let Vite handle its own connections
    }

    // Accept clinical-trial protocol or any valid WebSocket connection
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      try {
        this.wss.emit('connection', ws, request);
      } catch (error) {
        console.error('Error during WebSocket upgrade:', error);
        socket.destroy();
      }
    });
  }

  broadcast(message: {
    type: string;
    data: OutlierLog;
  }) {
    const payload = JSON.stringify(message);
    this.clients.forEach(client => {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      } catch (error) {
        console.error('Error broadcasting message:', error);
        this.clients.delete(client);
        try {
          client.close();
        } catch (e) {
          console.error('Error closing errored client:', e);
        }
      }
    });
  }
}