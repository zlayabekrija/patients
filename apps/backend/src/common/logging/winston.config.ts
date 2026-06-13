import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as winston from 'winston';
import { getRequestTraceId } from './request-context';
import {
  getRotationOptions,
  RotatingFileTransport,
} from './rotating-file.transport';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
};

function resolveLogDir() {
  return process.env.LOG_DIR ?? join(process.cwd(), 'logs');
}

function ensureLogDir(logDir: string) {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

function createLineFormat() {
  return winston.format.printf(
    ({
      timestamp,
      level,
      message,
      context,
      stack,
      durationMs,
      statusCode,
      traceId,
    }) => {
      const resolvedTraceId = traceId ?? getRequestTraceId();
      const parts = [timestamp];

      if (resolvedTraceId) {
        parts.push(`[traceId=${resolvedTraceId}]`);
      }

      parts.push(`[${context ?? 'App'}]`, `${level}:`, String(message));

      if (typeof statusCode === 'number') {
        parts.push(String(statusCode));
      }

      if (typeof durationMs === 'number') {
        parts.push(`${durationMs}ms`);
      }

      let line = parts.join(' ');

      if (typeof stack === 'string' && stack.length > 0) {
        line += `\n${stack}`;
      }

      return line;
    },
  );
}

export function createWinstonLogger(logDir = resolveLogDir()) {
  ensureLogDir(logDir);
  const rotation = getRotationOptions();
  const lineFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    createLineFormat(),
  );

  const transports: winston.transport[] = [
    new RotatingFileTransport({
      filename: join(logDir, 'info.log'),
      maxSizeBytes: rotation.maxSizeBytes,
      maxFiles: rotation.maxFiles,
      rotationMode: rotation.rotationMode,
      filter: (info) => info.level !== 'error',
    }),
    new RotatingFileTransport({
      filename: join(logDir, 'error.log'),
      maxSizeBytes: rotation.maxSizeBytes,
      maxFiles: rotation.maxFiles,
      rotationMode: rotation.rotationMode,
      filter: (info) => info.level === 'error',
    }),
  ];

  if (process.env.LOG_CONSOLE === 'true') {
    transports.push(
      new winston.transports.Console({
        format: lineFormat,
      }),
    );
  }

  return winston.createLogger({
    levels: LOG_LEVELS,
    level: 'debug',
    format: lineFormat,
    transports,
  });
}
