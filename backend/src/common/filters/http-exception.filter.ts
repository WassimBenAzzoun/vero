import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as { message?: string | string[] }).message ??
            exception.message);
      code =
        (
          {
            400: 'VALIDATION_ERROR',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            429: 'RATE_LIMITED',
          } as Record<number, string>
        )[status] ?? 'REQUEST_FAILED';
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'code' in exceptionResponse &&
        typeof exceptionResponse.code === 'string'
      ) {
        code = exceptionResponse.code;
      }
    } else {
      const prismaError = exception as { code?: string };

      if (prismaError?.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
        code = 'CONFLICT';
      } else if (prismaError?.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Resource not found';
        code = 'NOT_FOUND';
      }
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url.split('?')[0],
    });
  }
}
