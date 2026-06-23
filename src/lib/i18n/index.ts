import { DEFAULT_LOCALE, type Locale } from './locales';
import { localeIndexes, messages, type MessageKey } from './messages';

export type MessageParams = Record<string, string | number>;
export type Translator = (key: MessageKey, params?: MessageParams) => string;

export function translate(locale: Locale, key: MessageKey, params: MessageParams = {}): string {
	const template =
		messages[key][localeIndexes[locale]] ?? messages[key][localeIndexes[DEFAULT_LOCALE]];
	return template.replace(/\{(\w+)\}/g, (match, name: string) =>
		Object.hasOwn(params, name) ? String(params[name]) : match
	);
}

export function createTranslator(locale: Locale): Translator {
	return (key, params) => translate(locale, key, params);
}

export function formatNumber(
	locale: Locale,
	value: number,
	options?: Intl.NumberFormatOptions
): string {
	return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(
	locale: Locale,
	value: Date | string,
	options?: Intl.DateTimeFormatOptions
): string {
	return new Intl.DateTimeFormat(locale, options).format(
		typeof value === 'string' ? new Date(value) : value
	);
}

export {
	DEFAULT_LOCALE,
	LOCALE_COOKIE,
	LOCALE_OPTIONS,
	LOCALES,
	getTextDirection,
	isLocale,
	resolveLocale
} from './locales';
export type { Locale, TextDirection } from './locales';
export type { MessageKey } from './messages';
