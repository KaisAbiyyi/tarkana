import { getContext, setContext } from 'svelte';
import { createTranslator, DEFAULT_LOCALE, type Locale, type Translator } from '$lib/i18n';

const I18N_CONTEXT = Symbol('tarkana-i18n');

export type I18nContext = { locale: Locale; t: Translator };

export function setI18nContext(locale: Locale): I18nContext {
	const context = { locale, t: createTranslator(locale) };
	setContext(I18N_CONTEXT, context);
	return context;
}

export function getI18nContext(): I18nContext {
	return (
		getContext<I18nContext | undefined>(I18N_CONTEXT) ?? {
			locale: DEFAULT_LOCALE,
			t: createTranslator(DEFAULT_LOCALE)
		}
	);
}
