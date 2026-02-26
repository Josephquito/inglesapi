import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ AUMENTAR LÍMITE PARA JSON (base64, etc.)
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // ✅ Asegurar que exista la carpeta uploads en runtime
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  // ✅ Servir /uploads/* públicamente
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  app.enableCors({
    origin: (origin, callback) => {
      const allowedExact = new Set([
        'https://inglesapp-kappa.vercel.app',
        'http://localhost:4200',
        'http://localhost:3001',
        'http://localhost:5173',
      ]);

      // Requests sin Origin (Postman, server-to-server)
      if (!origin) return callback(null, true);

      // Permitir Vercel (preview y prod) DEVOLVIENDO EL ORIGIN
      if (origin.endsWith('.vercel.app')) return callback(null, origin);

      if (allowedExact.has(origin)) return callback(null, origin);

      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend NestJS escuchando en puerto ${port}`);
}
bootstrap();
