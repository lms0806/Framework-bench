import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function createApp() {
  return NestFactory.create(AppModule);
}

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  await app.listen(port, process.env.HOST ?? '0.0.0.0');
}

if (require.main === module) {
  void bootstrap();
}
