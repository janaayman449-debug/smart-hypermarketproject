import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-newsletter-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './newsletter-form.html',
  styleUrl: './newsletter-form.css',
})
export class NewsletterForm {
  email = signal('');
  touched = signal(false);
  submitted = signal(false);

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  isValidEmail = computed(() => this.emailPattern.test(this.email()));
  showError = computed(() => this.touched() && !this.isValidEmail());

  onEmailChange(value: string): void {
    this.email.set(value);
  }

  onBlur(): void {
    this.touched.set(true);
  }

  onSubmit(): void {
    this.touched.set(true);

    if (!this.isValidEmail()) {
      return;
    }

    console.log('Subscribed with:', this.email());

    this.submitted.set(true);
    this.email.set('');
    this.touched.set(false);

    setTimeout(() => this.submitted.set(false), 4000);
  }
}