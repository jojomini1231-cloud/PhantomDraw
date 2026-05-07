import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4322')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Security
  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // Allow server-to-server and local healthcheck requests without Origin.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
