import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  formatLogMessage,
  maskRequestUrl,
  sanitizeStackTrace,
} from '../utils/mask-pii';
import { FileLoggerService } from './file-logger.service';
import { getRequestTraceId } from './request-context';

type RequestWithTraceId = Request & { traceId?: string };

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly fileLogger: FileLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithTraceId>();
    const traceId = request.traceId ?? getRequestTraceId();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' &&
            exceptionResponse &&
            'message' in exceptionResponse
          ? formatLogMessage(
              (exceptionResponse as { message: unknown }).message,
            )
          : formatLogMessage(exception);

    const stack =
      exception instanceof Error
        ? sanitizeStackTrace(exception.stack ?? '')
        : undefined;

    const path = maskRequestUrl(request.originalUrl ?? request.url);

    if (status >= 500 || !(exception instanceof HttpException)) {
      this.fileLogger.error(
        `${request.method} ${path} failed with ${status}: ${message}`,
        stack,
        'ExceptionFilter',
      );
    } else {
      this.fileLogger.warn(
        `${request.method} ${path} responded with ${status}: ${message}`,
        'ExceptionFilter',
      );
    }

    const clientMessage =
      typeof exceptionResponse === 'object' &&
      exceptionResponse &&
      'message' in exceptionResponse
        ? (exceptionResponse as { message: string | string[] }).message
        : exception instanceof HttpException
          ? exception.message
          : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message: clientMessage,
      path,
      ...(traceId ? { traceId } : {}),
    });
  }
}
