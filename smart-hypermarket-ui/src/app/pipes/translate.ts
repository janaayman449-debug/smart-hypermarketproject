import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private languageService = inject(LanguageService);

  /**
   * `{{ 'key' | translate }}` or, with substitution,
   * `{{ 'key' | translate: { max: 4 } }}`.
   */
  transform(value: string, params?: Record<string, string | number>): string {
    return this.languageService.t(value, params);
  }
}
