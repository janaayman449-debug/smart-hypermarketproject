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

  t(key: string): string {
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
    return result || key;
  }
}