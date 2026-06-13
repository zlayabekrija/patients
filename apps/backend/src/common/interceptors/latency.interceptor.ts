import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';

@Injectable()
export class LatencyInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const latencyMs = Math.floor(Math.random() * 400) + 100;
    const shouldFail = Math.random() < 0.05;

    return next.handle().pipe(
      delay(latencyMs),
      mergeMap((value) => {
        if (shouldFail) {
          return throwError(
            () =>
              new ServiceUnavailableException(
                'Simulated transient failure. Please retry.',
              ),
          );
        }

        return [value];
      }),
    );
  }
}
