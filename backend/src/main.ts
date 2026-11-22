import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { mountWeb } from './web';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  if (process.env.NODE_ENV === 'production')
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy:
        process.env.SERVE_WEB === 'true'
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                  "'self'",
                  "'unsafe-inline'",
                  'https://accounts.google.com',
                  'https://apis.google.com',
                ],
                styleSrc: [
                  "'self'",
                  "'unsafe-inline'",
                  'https://accounts.google.com',
                ],
                imgSrc: ["'self'", 'data:', 'blob:'],
                fontSrc: ["'self'", 'data:'],
                connectSrc: ["'self'", 'data:', 'blob:', 'https://accounts.google.com'],
                frameSrc: ['https://accounts.google.com'],
                upgradeInsecureRequests:
                  process.env.NODE_ENV === 'production' ? [] : null,
              },
            }
          : undefined,
    }),
  );
  mountWeb(app);

  app.enableCors({
    origin: config
      .getOrThrow<string>('app.corsOrigin')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vero API')
    .setDescription('Vero shop review API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document);

  await app.listen(config.get<number>('app.port') ?? 3000);
}

void bootstrap();
