import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';

@Pipe({
  name: 'localize',
  pure: false,
})
export class LocalizePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string): string {
    return this.i18n._(key);
  }
}
