import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { finalize, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const start = Date.now();

    return next.handle().pipe(
      tap({
        error: () => {},
      }),
      finalize(() => {
        const duration = Date.now() - start;

        this.logger.log(
          `${request.method} ${request.url.split('?')[0]} ${response.statusCode} ${duration}ms`,
        );
      }),
    );
  }
}
