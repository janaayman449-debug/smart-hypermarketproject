import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  email = '';

  submitted = signal(false);
  loading = signal(false);
  sent = signal(false);
  errorKey = signal<string | null>(null);

  constructor(private auth: AuthService) {}

  async onSubmit(form: NgForm): Promise<void> {
    this.submitted.set(true);
    this.errorKey.set(null);

    if (form.invalid) return;

    this.loading.set(true);
    const result = await this.auth.forgotPassword(this.email);
    this.loading.set(false);

    if (result.success) {
      this.sent.set(true);
    } else {
      this.errorKey.set(result.message ?? 'auth.forgotPasswordFailed');
    }
  }
}