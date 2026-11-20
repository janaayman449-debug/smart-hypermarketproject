import { Injectable, signal, effect } from '@angular/core';
import { translations } from './translations';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  lang = signal<'ar' | 'en'>('ar');

  constructor() {
    effect(() => {
      const currentLang = this.lang();
      const dir = currentLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', currentLang);
    });
  }

  toggle(): void {
    this.lang.update((current) => (current === 'ar' ? 'en' : 'ar'));
  }

  /**
   * Resolves a dotted key for the active language.
   *
   * `params` performs a simple {{name}} substitution on the resolved string,
   * so a single translation entry can carry a dynamic value (a file size, a
   * count) without needing a key per possible number.
   *
   * If the key is missing, the key itself is returned so the UI degrades to a
   * readable identifier instead of blanking out.
   */
  t(key: string, params?: Record<string, string | number>): string {
    const currentLang = this.lang();
    const keys = key.split('.');
    let result: any = translations[currentLang];

    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        return key;
      }
    }

    if (typeof result !== 'string') {
      return key;
    }

    if (!params) {
      return result;
    }

    return result.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) =>
      params[name] !== undefined ? String(params[name]) : match
    );
  }
}