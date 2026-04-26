import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = new Logger('Bootstrap');
  const apiPrefix = process.env.API_PREFIX ?? 'api';

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());
  app.enableCors({
    origin: (process.env.FRONTEND_URL ?? '').split(','),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EarnHub Simulator API')
    .setDescription('Task-based reward simulator built with NestJS, MongoDB, Redis, JWT, and S3.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Admin')
    .addTag('Users')
    .addTag('Tasks')
    .addTag('Wallet')
    .addTag('Referrals')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.enableShutdownHooks();
  app.useLogger(logger);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`Server listening on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/${apiPrefix}/docs`);
}

void bootstrap();
