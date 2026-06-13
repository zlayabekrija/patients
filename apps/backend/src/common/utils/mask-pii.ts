const EMAIL_PATTERN =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_PATTERN = /\+?[\d][\d\s().-]{6,}[\d]/g;

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');

  if (at <= 0) {
    return '***';
  }

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  const domainName = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : '';

  return `${local[0] ?? '*'}***@${domainName[0] ?? '*'}***${tld}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 4) {
    return '***';
  }

  return `***${digits.slice(-4)}`;
}

export function maskName(name: string): string {
  const trimmed = name.trim();

  if (!trimmed) {
    return '***';
  }

  return `${trimmed[0]}***`;
}

export function maskSetupUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.searchParams.has('token')) {
      parsed.searchParams.set('token', '[REDACTED]');
    }

    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
}

export function maskPiiInText(text: string): string {
  return text
    .replace(EMAIL_PATTERN, (match) => maskEmail(match))
    .replace(PHONE_PATTERN, (match) => maskPhone(match));
}

const SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'email',
  'password',
  'phone',
  'phoneNumber',
]);

export function maskRequestUrl(url: string): string {
  const [path, query] = url.split('?');

  if (!query) {
    return maskPiiInText(path);
  }

  const params = new URLSearchParams(query);

  for (const key of params.keys()) {
    if (SENSITIVE_QUERY_PARAMS.has(key)) {
      params.set(key, '[REDACTED]');
    }
  }

  return maskPiiInText(`${path}?${params.toString()}`);
}

export function sanitizeStackTrace(stack: string): string {
  return maskPiiInText(stack);
}

export function formatLogMessage(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return maskPiiInText(value);
  }

  if (value instanceof Error) {
    return maskPiiInText(value.message);
  }

  if (typeof value === 'object') {
    try {
      return maskPiiInText(JSON.stringify(value));
    } catch {
      return maskPiiInText(String(value));
    }
  }

  return maskPiiInText(String(value));
}

export function sanitizeForLog(value: unknown): unknown {
  if (typeof value === 'string') {
    return maskPiiInText(value);
  }

  if (value instanceof Error) {
    return maskPiiInText(value.message);
  }

  return value;
}
