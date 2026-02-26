import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ AUMENTAR LÍMITE PARA JSON (base64, etc.)
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // ✅ Middleware CORS "forzado" (incluye preflight OPTIONS)
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;

    const allowed = new Set([
      'https://inglesapp-kappa.vercel.app',
      'http://localhost:4200',
      'http://localhost:5173',
      'http://localhost:3001',
    ]);

    if (origin && (allowed.has(origin) || origin.endsWith('.vercel.app'))) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      );
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }

    // Responder preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });

  // ✅ Asegurar que exista la carpeta uploads en runtime
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  // ✅ Servir /uploads/* públicamente
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  // ✅ Puedes dejarlo o quitarlo (con el middleware ya basta)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend NestJS escuchando en puerto ${port}`);
}

bootstrap();
