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
	'x-api-key',
	'servicerolekey',
	'service_role_key',
	'secret',
	'client_secret',
	'clientsecret',
	'password',
	'passphrase',
	'private_key',
	'privatekey',
	'token',
	'session',
	'credential',
	'bearer',
	'database_url',
	'databaseurl',
	'postgres_url',
	'direct_url'
];

export function isSensitiveKey(key: string): boolean {
	const normalized = key.toLowerCase().replace(/[-_]/g, '');
	return SENSITIVE_KEY_PATTERNS.some((pattern) => {
		const normPattern = pattern.replace(/[-_]/g, '');
		return normalized === normPattern || normalized.includes(normPattern);
	});
}

/**
 * Recursively sanitizes a log context, replacing sensitive key values with [REDACTED].
 * Circular references are guarded using a WeakSet to prevent stack overflow.
 */
export function sanitizeContext(
	context?: LogContext,
	seen: WeakSet<object> = new WeakSet()
): LogContext | undefined {
	if (!context) return undefined;
	if (typeof context !== 'object') return context;

	if (seen.has(context)) {
		return { '[Circular]': true };
	}
	seen.add(context);

	const sanitized: LogContext = {};

	for (const [key, value] of Object.entries(context)) {
		if (isSensitiveKey(key)) {
			sanitized[key] = '[REDACTED]';
		} else if (Array.isArray(value)) {
			sanitized[key] = value.map((item) =>
				item && typeof item === 'object' ? sanitizeContext(item as LogContext, seen) : item
			);
		} else if (value && typeof value === 'object') {
			sanitized[key] = sanitizeContext(value as LogContext, seen);
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
		const errorPayload =
			error instanceof Error
				? {
						name: error.name,
						message: error.message,
						stack: error.stack
					}
				: error
					? { name: 'Error', message: String(error) }
					: undefined;

		log({
			level: 'error',
			message,
			error: errorPayload,
			...meta
		});
	}
};
