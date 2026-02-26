import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. CONFIGURACIÓN DE CORS (Debe ir antes de los middlewares)
  app.enableCors({
    // Reemplaza '*' por el dominio exacto de tu frontend
    origin: 'https://inglesapp-kappa.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // Mantener en true si tu curl mostró que se espera esto
  });

  // 2. MIDDLEWARES DE BODY PARSER
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // 3. DEBUG TEMPORAL (Opcional)
  app.use((req, res, next) => {
    res.setHeader('X-APP-BUILD', 'cors-fix-v1');
    next();
  });

  // 4. ARCHIVOS ESTÁTICOS / UPLOADS
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  // 5. ESCUCHA DEL SERVIDOR
  const port = Number(process.env.PORT) || 3000;
  // Importante: En Render '0.0.0.0' es necesario
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend NestJS corriendo en: http://localhost:${port}`);
  console.log(`🌍 Permitiendo CORS para: https://inglesapp-kappa.vercel.app`);
}

bootstrap();
