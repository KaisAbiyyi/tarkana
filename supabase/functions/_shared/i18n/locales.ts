export const LOCALES = [
	'en',
	'id',
	'es',
	'fr',
	'de',
	'pt',
	'zh',
	'ja',
	'ko',
	'ar',
	'hi',
	'ru'
] as const;

export type Locale = (typeof LOCALES)[number];
export type TextDirection = 'ltr' | 'rtl';

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'tarkana-locale';

export const LOCALE_OPTIONS: readonly { value: Locale; label: string }[] = [
	{ value: 'en', label: 'English' },
	{ value: 'id', label: 'Bahasa Indonesia' },
	{ value: 'es', label: 'Español' },
	{ value: 'fr', label: 'Français' },
	{ value: 'de', label: 'Deutsch' },
	{ value: 'pt', label: 'Português' },
	{ value: 'zh', label: '简体中文' },
	{ value: 'ja', label: '日本語' },
	{ value: 'ko', label: '한국어' },
	{ value: 'ar', label: 'العربية' },
	{ value: 'hi', label: 'हिन्दी' },
	{ value: 'ru', label: 'Русский' }
];

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && LOCALES.includes(value as Locale);
}

export function resolveLocale(value: unknown): Locale {
	return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getTextDirection(locale: Locale): TextDirection {
	return locale === 'ar' ? 'rtl' : 'ltr';
}
