export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	requestId?: string;
	path?: string;
	method?: string;
	status?: number;
	durationMs?: number;
	context?: LogContext;
	error?: {
		name: string;
		message: string;
		stack?: string;
	};
}

const SENSITIVE_KEY_PATTERNS = [
	'authorization',
	'cookie',
	'set-cookie',
	'access_token',
	'refresh_token',
	'apikey',
	'api_key',
	'servicerolekey',
	'service_role_key',
	'secret',
	'password',
	'token',
	'session',
	'credential',
	'bearer'
];

export function isSensitiveKey(key: string): boolean {
	const normalized = key.toLowerCase().replace(/[-_]/g, '');
	return SENSITIVE_KEY_PATTERNS.some((pattern) => {
		const normPattern = pattern.replace(/[-_]/g, '');
		return normalized === normPattern || normalized.includes(normPattern);
	});
}

export function sanitizeContext(context?: LogContext): LogContext | undefined {
	if (!context) return undefined;
	const sanitized: LogContext = {};

	for (const [key, value] of Object.entries(context)) {
		if (isSensitiveKey(key)) {
			sanitized[key] = '[REDACTED]';
		} else if (Array.isArray(value)) {
			sanitized[key] = value.map((item) =>
				item && typeof item === 'object' ? sanitizeContext(item as LogContext) : item
			);
		} else if (value && typeof value === 'object') {
			sanitized[key] = sanitizeContext(value as LogContext);
		} else {
			sanitized[key] = value;
		}
	}
	return sanitized;
}

export function log(entry: Omit<LogEntry, 'timestamp'>): void {
	const logPayload: LogEntry = {
		timestamp: new Date().toISOString(),
		...entry,
		context: sanitizeContext(entry.context)
	};

	const formatted = JSON.stringify(logPayload);

	switch (entry.level) {
		case 'error':
			console.error(formatted);
			break;
		case 'warn':
			console.warn(formatted);
			break;
		case 'info':
		case 'debug':
		default:
			console.log(formatted);
			break;
	}
}

export const logger = {
	debug: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) =>
		log({ level: 'debug', message, ...meta }),
	info: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) =>
		log({ level: 'info', message, ...meta }),
	warn: (message: string, meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message'>) =>
		log({ level: 'warn', message, ...meta }),
	error: (
		message: string,
		error?: unknown,
		meta?: Omit<LogEntry, 'timestamp' | 'level' | 'message' | 'error'>
	) => {
		const errorObj =
			error instanceof Error
				? { name: error.name, message: error.message, stack: error.stack }
				: error
					? { name: 'UnknownError', message: String(error) }
					: undefined;
		log({ level: 'error', message, error: errorObj, ...meta });
	}
};
