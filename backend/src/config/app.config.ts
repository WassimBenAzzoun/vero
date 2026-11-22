import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: Number.parseInt(process.env.PORT ?? '3000', 10),

  nodeEnv: process.env.NODE_ENV ?? 'development',

  jwtSecret: process.env.JWT_SECRET!,

  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',

  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',

  throttling: {
    ttl: Number.parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: Number.parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
}));
