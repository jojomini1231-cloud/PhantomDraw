import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { ApiKey } from './../src/auth/entities/api-key.entity';
import { io, Socket } from 'socket.io-client';
import type { Server } from 'http';

describe('Generate flow (e2e)', () => {
  let app: INestApplication;
  let socket: Socket;
  let authToken: string;
  let apiKey: string;
  let serverPort: number;
  let apiKeyRepository: Repository<ApiKey>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    apiKeyRepository = app.get<Repository<ApiKey>>(getRepositoryToken(ApiKey));

    await app.listen(0);
    const serverUrl = await app.getUrl();
    serverPort = parseInt(serverUrl.split(':').pop()!, 10);
  });

  afterAll(async () => {
    if (socket) {
      socket.disconnect();
    }
    await app.close();
  });

  it('should reject public API key self-service signup', async () => {
    await request(app.getHttpServer() as Server)
      .post('/auth/generate-key')
      .expect(403);
  });

  it('should authenticate, generate image and receive websocket progress', async () => {
    apiKey = `pd_${randomUUID().replace(/-/g, '')}`;
    await apiKeyRepository.save(
      apiKeyRepository.create({
        key: apiKey,
        quota: 100,
        multiplier: 10,
        isActive: true,
      }),
    );
    expect(apiKey).toBeDefined();

    const loginRes = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({ apiKey })
      .expect(200);
    authToken = (loginRes.body as { accessToken: string }).accessToken;
    expect(authToken).toBeDefined();

    socket = io(`http://localhost:${serverPort}`, {
      auth: { token: authToken },
    });

    const connected = await new Promise((resolve) => {
      socket.on('connect', () => resolve(true));
      socket.on('connect_error', (err) => resolve(err.message));
    });
    expect(connected).toBe(true);

    const updates: string[] = [];
    const donePromise = new Promise<{ status: string; imageUrl?: string }>(
      (resolve, reject) => {
        socket.on(
          'taskUpdate',
          (task: { status: string; imageUrl?: string }) => {
            console.log('Received taskUpdate:', task.status);
            updates.push(task.status);
            if (task.status === 'success' || task.status === 'failed') {
              resolve(task);
            }
          },
        );
        setTimeout(
          () => reject(new Error('timeout waiting for taskUpdate')),
          8000,
        );
      },
    );

    const generateRes = await request(app.getHttpServer() as Server)
      .post('/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prompt: 'a cute cat',
        type: 'txt2img',
      })
      .expect(201);

    const generateBody = generateRes.body as { taskId: string; status: string };
    expect(generateBody.taskId).toBeDefined();
    expect(generateBody.status).toBe('pending');

    const finalTask = await donePromise;

    expect(finalTask.status).toBe('success');
    expect(finalTask.imageUrl).toBeDefined();

    expect(updates).toContain('running');
    expect(updates).toContain('success');
  }, 10000);
});
