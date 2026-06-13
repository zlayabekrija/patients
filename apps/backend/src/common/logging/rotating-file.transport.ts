import {
  appendFileSync,
  closeSync,
  existsSync,
  openSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'fs';
import { basename, dirname, join } from 'path';
import Transport from 'winston-transport';
import type { Logform } from 'winston';

export type LogRotationMode = 'size' | 'day';

export type RotatingFileTransportOptions = {
  filename: string;
  maxSizeBytes: number;
  maxFiles: number;
  rotationMode: LogRotationMode;
  filter?: (info: Logform.TransformableInfo) => boolean;
};

const MESSAGE = Symbol.for('message');

export function resolveRotationMode(): LogRotationMode {
  return process.env.LOG_ROTATION === 'day' ? 'day' : 'size';
}

export function resolveMaxSizeBytes() {
  const configured = Number(process.env.LOG_MAX_SIZE_BYTES);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : 10 * 1024 * 1024;
}

export function resolveMaxFiles() {
  const configured = Number(process.env.LOG_MAX_FILES);
  return Number.isFinite(configured) && configured >= 2
    ? Math.floor(configured)
    : 5;
}

export class RotatingFileTransport extends Transport {
  private currentDate = new Date().toISOString().slice(0, 10);
  private readonly logName: string;

  constructor(private readonly options: RotatingFileTransportOptions) {
    super();
    this.logName = basename(options.filename, '.log');
    this.rotateIfStaleByDay();
  }

  log(info: Logform.TransformableInfo, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (this.options.filter && !this.options.filter(info)) {
      callback();
      return;
    }

    const line =
      (info[MESSAGE] as string | undefined) ??
      `${info.timestamp} ${info.level}: ${info.message}`;

    try {
      appendFileSync(this.options.filename, `${line}\n`, 'utf8');
      this.maybeRotate();
    } catch (error) {
      this.emit('error', error);
    }

    callback();
  }

  private rotateIfStaleByDay() {
    if (this.options.rotationMode !== 'day') {
      return;
    }

    const { filename } = this.options;
    if (!existsSync(filename)) {
      return;
    }

    const modifiedDate = statSync(filename).mtime.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    if (modifiedDate !== today) {
      this.currentDate = today;
      this.rotate();
    }
  }

  private maybeRotate() {
    if (this.options.rotationMode === 'day') {
      const today = new Date().toISOString().slice(0, 10);
      if (today !== this.currentDate && existsSync(this.options.filename)) {
        this.rotate();
        this.currentDate = today;
      }
      return;
    }

    if (!existsSync(this.options.filename)) {
      return;
    }

    const { size } = statSync(this.options.filename);
    if (size >= this.options.maxSizeBytes) {
      this.rotate();
    }
  }

  private rotate() {
    const { filename, maxFiles } = this.options;
    const dir = dirname(filename);
    const oldest = join(dir, `${this.logName}-${maxFiles}.log`);

    if (existsSync(oldest)) {
      unlinkSync(oldest);
    }

    for (let index = maxFiles - 1; index >= 2; index -= 1) {
      const from = join(dir, `${this.logName}-${index}.log`);
      const to = join(dir, `${this.logName}-${index + 1}.log`);

      if (existsSync(from)) {
        renameSync(from, to);
      }
    }

    closeSync(openSync(filename, 'a'));

    if (existsSync(filename)) {
      renameSync(filename, join(dir, `${this.logName}-2.log`));
    }
  }
}

export function getRotationOptions() {
  return {
    maxSizeBytes: resolveMaxSizeBytes(),
    maxFiles: resolveMaxFiles(),
    rotationMode: resolveRotationMode(),
  };
}
