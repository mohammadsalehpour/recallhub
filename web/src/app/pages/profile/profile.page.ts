import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';

@Component({
  selector: 'app-profile-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-title">
      <span class="eyebrow">P04 Profile</span>
      <h1>User Profile</h1>
      <p>پروفایل، عکس کاربر و تغییر کلمه عبور از همین صفحه مدیریت می‌شود.</p>
    </section>

    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <div class="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Profile</h2>
        <div class="mb-5 flex items-center gap-4">
          <img
            class="h-20 w-20 rounded-full border border-slate-200 object-cover"
            [src]="avatar()"
            alt="Profile avatar"
          />
          <div class="field min-w-0 flex-1">
            <label for="avatar">بارگذاری عکس پروفایل</label>
            <input id="avatar" type="file" accept="image/*" (change)="selectAvatar($event)" />
          </div>
        </div>

        <form class="grid gap-4" [formGroup]="profileForm" (ngSubmit)="saveProfile()">
          <div class="form-grid">
            <div class="field"><label for="firstName">نام</label><input id="firstName" formControlName="first_name" /></div>
            <div class="field"><label for="lastName">نام خانوادگی</label><input id="lastName" formControlName="last_name" /></div>
            <div class="field"><label for="mobile">شماره موبایل</label><input id="mobile" formControlName="mobile" /></div>
            <div class="field"><label for="email">ایمیل</label><input id="email" [value]="user()?.email" disabled /></div>
          </div>
          <button class="btn primary w-fit" type="submit">ذخیره پروفایل</button>
        </form>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Change Password</h2>
        <form class="grid gap-4" [formGroup]="passwordForm" (ngSubmit)="changePassword()">
          <div class="field">
            <label for="currentPassword">کلمه عبور فعلی</label>
            <input id="currentPassword" type="password" formControlName="current_password" autocomplete="current-password" />
          </div>
          <div class="field">
            <label for="newPassword">کلمه عبور جدید</label>
            <input id="newPassword" type="password" formControlName="new_password" autocomplete="new-password" />
          </div>
          <button class="btn primary w-fit" type="submit">تغییر کلمه عبور</button>
        </form>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  protected readonly state = inject(AppStateService);

  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly avatarDataUrl = signal('');
  protected readonly user = computed(() => this.state.currentUser());
  protected readonly avatar = computed(
    () =>
      this.avatarDataUrl() ||
      this.user()?.avatar_url ||
      `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#dbeafe"/><text x="48" y="56" text-anchor="middle" font-size="28" font-family="Arial" font-weight="700" fill="#1d4ed8">${this.initials()}</text></svg>`)}`,
  );

  protected readonly profileForm = this.fb.group({
    first_name: [this.user()?.first_name ?? '', Validators.required],
    last_name: [this.user()?.last_name ?? '', Validators.required],
    mobile: [this.user()?.mobile ?? '', Validators.required],
  });
  protected readonly passwordForm = this.fb.group({
    current_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected initials() {
    const user = this.user();
    return `${user?.first_name?.[0] ?? 'R'}${user?.last_name?.[0] ?? 'H'}`.toUpperCase();
  }

  selectAvatar(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.avatarDataUrl.set(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    await this.capture(async () => {
      const user = await this.api.updateProfile({
        ...this.profileForm.getRawValue(),
        avatar_url: this.avatarDataUrl() || this.user()?.avatar_url,
      });
      this.state.refreshUser(user);
      this.notice.set('پروفایل ذخیره شد.');
    });
  }

  async changePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    await this.capture(async () => {
      await this.api.changePassword(this.passwordForm.getRawValue());
      this.passwordForm.reset();
      this.notice.set('کلمه عبور تغییر کرد.');
    });
  }

  private async capture(work: () => Promise<void>) {
    this.notice.set('');
    this.error.set('');
    try {
      await work();
    } catch (error) {
      this.error.set(messageFromError(error));
    }
  }
}
