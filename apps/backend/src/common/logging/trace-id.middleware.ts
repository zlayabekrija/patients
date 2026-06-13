import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from './request-context';

const TRACE_HEADER = 'x-request-id';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers[TRACE_HEADER];
    const traceId =
      typeof incoming === 'string' && incoming.trim().length > 0
        ? incoming.trim()
        : randomUUID();

    req.traceId = traceId;
    res.setHeader('X-Request-Id', traceId);

    runWithRequestContext({ traceId }, () => next());
  }
}
