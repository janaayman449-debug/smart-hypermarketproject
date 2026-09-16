import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../pipes/translate';

const API_BASE = 'http://localhost:5000/api/messages';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  submitted = signal(false);
  sending = signal(false);
  errorMsg = signal(false);

  contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    subject: ['', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  get nameField() {
    return this.contactForm.get('name');
  }
  get emailField() {
    return this.contactForm.get('email');
  }
  get subjectField() {
    return this.contactForm.get('subject');
  }
  get messageField() {
    return this.contactForm.get('message');
  }

  async onSubmit(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.errorMsg.set(false);

    try {
      await firstValueFrom(
        this.http.post(API_BASE, this.contactForm.value)
      );

      this.submitted.set(true);
      this.contactForm.reset();
      setTimeout(() => this.submitted.set(false), 5000);
    } catch (err) {
      console.error('Failed to send message', err);
      this.errorMsg.set(true);
    } finally {
      this.sending.set(false);
    }
  }
}