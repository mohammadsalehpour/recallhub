import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { I18nService, Locale } from '../core/i18n.service';
import { LocalizePipe } from './localize.pipe';

@Component({
  selector: 'app-language-switcher',
  imports: [NgTemplateOutlet, LocalizePipe],
  template: `
    <div class="language-switcher" [attr.aria-label]="'language.label' | localize">
      <button
        class="language-trigger"
        type="button"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
      >
        <ng-container [ngTemplateOutlet]="flag" [ngTemplateOutletContext]="{ $implicit: i18n.activeLocale().flag }" />
        <span>{{ i18n.activeLocale().labelKey | localize }}</span>
        <span class="language-chevron" aria-hidden="true">⌄</span>
      </button>

      @if (open()) {
        <div class="language-menu" role="menu">
          @for (locale of i18n.locales; track locale.code) {
            <button
              class="language-option"
              type="button"
              role="menuitemradio"
              [class.active]="i18n.locale() === locale.code"
              [attr.aria-checked]="i18n.locale() === locale.code"
              (click)="setLocale(locale.code)"
            >
              <ng-container [ngTemplateOutlet]="flag" [ngTemplateOutletContext]="{ $implicit: locale.flag }" />
              <span>{{ locale.labelKey | localize }}</span>
            </button>
          }
        </div>
      }

      <ng-template #flag let-flag>
        @if (flag === 'ir') {
          <svg viewBox="0 0 36 24" aria-hidden="true">
            <rect width="36" height="8" fill="#239f40" />
            <rect y="8" width="36" height="8" fill="#fff" />
            <rect y="16" width="36" height="8" fill="#da0000" />
            <circle cx="18" cy="12" r="3.1" fill="none" stroke="#da0000" stroke-width="1.5" />
          </svg>
        } @else {
          <svg viewBox="0 0 36 24" aria-hidden="true">
            <rect width="36" height="24" fill="#b22234" />
            <path d="M0 2h36M0 6h36M0 10h36M0 14h36M0 18h36M0 22h36" stroke="#fff" stroke-width="2" />
            <rect width="16" height="13" fill="#3c3b6e" />
            <g fill="#fff">
              <circle cx="3" cy="3" r=".7" /><circle cx="7" cy="3" r=".7" /><circle cx="11" cy="3" r=".7" />
              <circle cx="5" cy="6" r=".7" /><circle cx="9" cy="6" r=".7" /><circle cx="13" cy="6" r=".7" />
              <circle cx="3" cy="9" r=".7" /><circle cx="7" cy="9" r=".7" /><circle cx="11" cy="9" r=".7" />
            </g>
          </svg>
        }
      </ng-template>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly open = signal(false);

  protected setLocale(locale: Locale) {
    this.i18n.setLocale(locale);
    this.open.set(false);
  }
}
