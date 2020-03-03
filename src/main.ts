import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

console.log(process.env)
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
