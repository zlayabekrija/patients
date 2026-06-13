import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { maskRequestUrl } from '../utils/mask-pii';
import { FileLoggerService } from './file-logger.service';
import { getRequestTraceId } from './request-context';

type RequestWithTraceId = {
  method: string;
  originalUrl?: string;
  url: string;
  traceId?: string;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly fileLogger: FileLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithTraceId>();
    const response = http.getResponse<{ statusCode: number }>();
    const startedAt = Date.now();
    const path = maskRequestUrl(request.originalUrl ?? request.url);
    const traceId = request.traceId ?? getRequestTraceId();

    return next.handle().pipe(
      tap({
        next: () => {
          this.fileLogger.logRequest(`${request.method} ${path}`, {
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
            traceId,
          });
        },
        error: () => {
          this.fileLogger.logRequest(`${request.method} ${path}`, {
            statusCode: response.statusCode || 500,
            durationMs: Date.now() - startedAt,
            traceId,
          });
        },
      }),
    );
  }
}
