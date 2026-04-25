import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { io, Socket } from 'socket.io-client';

describe('Generate flow (e2e)', () => {
  let app: INestApplication;
  let socket: Socket;
  let authToken: string;
  let apiKey: string;
  let serverPort: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // We need to listen to a real port for WebSocket to work
    await app.listen(0);
    const serverUrl = await app.getUrl();
    serverPort = parseInt(serverUrl.split(':').pop(), 10);
  });

  afterAll(async () => {
    if (socket) {
      socket.disconnect();
    }
    await app.close();
  });

  it('should authenticate, generate image and receive websocket progress', async () => {
    // 1. Generate API Key
    const keyRes = await request(app.getHttpServer())
      .post('/auth/generate-key')
      .expect(201);
    apiKey = keyRes.body.key;
    expect(apiKey).toBeDefined();

    // 2. Login to get JWT Token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ apiKey })
      .expect(200);
    authToken = loginRes.body.accessToken;
    expect(authToken).toBeDefined();

    // 3. Connect via WebSocket
    socket = io(`http://localhost:${serverPort}`, {
      auth: { token: authToken },
    });

    const connected = await new Promise((resolve) => {
      socket.on('connect', () => resolve(true));
      socket.on('connect_error', (err) => resolve(err.message));
    });
    expect(connected).toBe(true);

    // 4. Trigger image generation and wait for events
    const updates: any[] = [];
    const donePromise = new Promise((resolve, reject) => {
      socket.on('taskUpdate', (task) => {
        console.log('Received taskUpdate:', task.status);
        updates.push(task.status);
        if (task.status === 'success' || task.status === 'failed') {
          resolve(task);
        }
      });
      // fallback timeout
      setTimeout(() => reject(new Error('timeout waiting for taskUpdate')), 8000);
    });

    const generateRes = await request(app.getHttpServer())
      .post('/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prompt: 'a cute cat',
        type: 'txt2img',
      })
      .expect(201);

    expect(generateRes.body.taskId).toBeDefined();
    expect(generateRes.body.status).toBe('pending');

    // 5. Wait for WebSocket progress
    const finalTask: any = await donePromise;

    expect(finalTask.status).toBe('success');
    expect(finalTask.imageUrl).toBeDefined();
    
    // We should have received 'running' before 'success'
    expect(updates).toContain('running');
    expect(updates).toContain('success');
  }, 10000); // Give it enough timeout for generation simulation
});
