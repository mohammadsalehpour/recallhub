import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import fa from '../i18n/fa.json';
import en from '../i18n/en.json';

export type Locale = 'fa' | 'en';
export type TextDirection = 'rtl' | 'ltr';

const storageKey = 'recallhub.locale';
const dictionaries = { fa, en };

export type TranslationKey = keyof typeof fa;

export type LocaleOption = {
  code: Locale;
  labelKey: TranslationKey;
  flag: 'ir' | 'us';
};

function normalizeLocale(value: string | null | undefined): Locale {
  return value === 'en' || value === 'fa' ? value : 'fa';
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  readonly locale = signal<Locale>(normalizeLocale(localStorage.getItem(storageKey)));
  readonly direction = computed<TextDirection>(() => (this.locale() === 'fa' ? 'rtl' : 'ltr'));
  readonly locales: LocaleOption[] = [
    { code: 'fa', labelKey: 'language.fa', flag: 'ir' },
    { code: 'en', labelKey: 'language.en', flag: 'us' },
  ];
  readonly activeLocale = computed(
    () => this.locales.find((locale) => locale.code === this.locale()) ?? this.locales[0],
  );

  constructor() {
    effect(() => {
      const locale = this.locale();
      localStorage.setItem(storageKey, locale);
      this.document.documentElement.lang = locale;
      this.document.documentElement.dir = this.direction();
    });
  }

  setLocale(locale: Locale) {
    this.locale.set(locale);
  }

  _(key: TranslationKey | string): string {
    const lookupKey = key as TranslationKey;
    return dictionaries[this.locale()][lookupKey] ?? dictionaries.fa[lookupKey] ?? key;
  }

  format(key: TranslationKey | string, params: Record<string, string | number>): string {
    return Object.entries(params).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      this._(key),
    );
  }
}
