import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  // 1. Crear la app (Igual que tu proyecto exitoso)
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 2. CORS EXACTO al que te funciona (con Array y Credentials)
  app.enableCors({
    origin: ['https://inglesapp-kappa.vercel.app', 'http://localhost:4200'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 3. NO uses bodyParser manual si no es estrictamente necesario.
  // Nest ya maneja JSON hasta 100kb por defecto.
  // Si necesitas 10mb, configúralo en el create, no con app.use:
  // (Pero por ahora, probemos sin esto para descartar que sea el que traba)

  // 4. Estáticos
  const uploadDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  // 5. Puerto
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
