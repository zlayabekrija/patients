import {
  Injectable,
  LoggerService,
  LogLevel,
} from '@nestjs/common';
import type { Logger as WinstonLogger } from 'winston';
import {
  formatLogMessage,
  sanitizeStackTrace,
} from '../utils/mask-pii';
import { getRequestTraceId } from './request-context';
import { createWinstonLogger } from './winston.config';

@Injectable()
export class FileLoggerService implements LoggerService {
  private readonly logger: WinstonLogger;

  constructor() {
    this.logger = createWinstonLogger();
  }

  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    const formattedMessage = formatLogMessage(message);
    const stack =
      trace ??
      (message instanceof Error
        ? sanitizeStackTrace(message.stack ?? '')
        : undefined);

    this.logger.error(formattedMessage, {
      context,
      stack: stack ? sanitizeStackTrace(stack) : undefined,
      traceId: getRequestTraceId(),
    });
  }

  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.write('verbose', message, context);
  }

  logRequest(
    message: string,
    meta: { statusCode: number; durationMs: number; traceId?: string },
  ) {
    this.logger.log('http', message, {
      context: 'HTTP',
      statusCode: meta.statusCode,
      durationMs: meta.durationMs,
      traceId: meta.traceId ?? getRequestTraceId(),
    });
  }

  setLogLevels?(levels: LogLevel[]) {
    const level = levels.includes('debug')
      ? 'debug'
      : levels.includes('verbose')
        ? 'verbose'
        : 'info';
    this.logger.level = level;
  }

  private write(
    level: 'info' | 'warn' | 'debug' | 'verbose',
    message: unknown,
    context?: string,
  ) {
    this.logger.log(level, formatLogMessage(message), {
      context,
      traceId: getRequestTraceId(),
    });
  }
}
