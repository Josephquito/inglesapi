import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. CORS: Configuración robusta para Vercel y Localhost
  app.enableCors({
    origin: [
      'https://inglesapp-kappa.vercel.app', // Tu frontend en Vercel
      'http://localhost:4200', // Tu desarrollo local
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    credentials: true,
  });

  // 2. Middlewares de Body Parser
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // 3. Gestión de archivos estáticos (Uploads)
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  // 4. Configuración del puerto para Render
  const port = process.env.PORT || 3000;

  // Escuchar en '0.0.0.0' es vital para que Render asigne el puerto correctamente
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend corriendo en puerto: ${port}`);
  console.log(`✅ CORS habilitado para: https://inglesapp-kappa.vercel.app`);
}

bootstrap();
