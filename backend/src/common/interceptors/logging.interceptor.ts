import {
  CallHandler,
  ExecutionContext,
  Injectable,
  HttpException,
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
    let failedStatus:number|undefined;

    return next.handle().pipe(
      tap({
        error: (error:unknown) => {failedStatus=error instanceof HttpException?error.getStatus():500;},
      }),
      finalize(() => {
        const duration = Date.now() - start;

        this.logger.log(
          `${request.method} ${request.url.split('?')[0]} ${failedStatus||response.statusCode} ${duration}ms`,
        );
      }),
    );
  }
}
