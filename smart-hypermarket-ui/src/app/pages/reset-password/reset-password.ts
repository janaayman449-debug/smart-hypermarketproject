import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  email = '';
  token = '';
  newPassword = '';
  confirmPassword = '';

  submitted = signal(false);
  loading = signal(false);
  success = signal(false);
  errorKey = signal<string | null>(null);
  linkInvalid = signal(false);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.email = params.get('email') ?? '';
    this.token = params.get('token') ?? '';

    if (!this.email || !this.token) {
      this.linkInvalid.set(true);
    }
  }

  get passwordsMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.newPassword !== this.confirmPassword;
  }

  async onSubmit(form: NgForm): Promise<void> {
    this.submitted.set(true);
    this.errorKey.set(null);

    if (form.invalid || this.passwordsMismatch) return;

    this.loading.set(true);
    const result = await this.auth.resetPassword(this.email, this.token, this.newPassword);
    this.loading.set(false);

    if (result.success) {
      this.success.set(true);
      setTimeout(() => this.router.navigateByUrl('/login'), 2500);
    } else {
      this.errorKey.set(result.message ?? 'auth.resetPasswordFailed');
    }
  }
}