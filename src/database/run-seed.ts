import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { runSeed } from './initial.seed';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    await runSeed(app);
    console.log('🌱 Seed ejecutado correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando seed:', error);
  }

  await app.close();
}

bootstrap();
