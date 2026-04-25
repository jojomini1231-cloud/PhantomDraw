import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class GenerateGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map(); // apiKey -> socketId

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify(token);
      this.userSockets.set(payload.key, client.id);
      console.log(`Client connected: ${payload.key} (${client.id})`);
    } catch (error) {
      console.error('WebSocket connection rejected:', error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [key, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(key);
        console.log(`Client disconnected: ${key} (${client.id})`);
        break;
      }
    }
  }

  sendTaskUpdate(apiKey: string, task: any) {
    const socketId = this.userSockets.get(apiKey);
    if (socketId) {
      this.server.to(socketId).emit('taskUpdate', task);
    }
  }
}
