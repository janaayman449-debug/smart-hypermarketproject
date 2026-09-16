import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';

  submitted = signal(false);
  loading = signal(false);
  errorKey = signal<string | null>(null);

  private readonly wishlist = inject(WishlistService);
  private readonly cart = inject(CartService);

  constructor(private auth: AuthService, private router: Router) {}

  get passwordsMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  async onSubmit(form: NgForm): Promise<void> {
    this.submitted.set(true);
    this.errorKey.set(null);

    if (form.invalid || this.passwordsMismatch) return;

    this.loading.set(true);
    const result = await this.auth.register(this.fullName, this.email, this.password, this.phone);
    this.loading.set(false);

    if (result.success) {
      await Promise.all([
        this.wishlist.fetchWishlist(),
        this.cart.fetchCart(),
      ]);

      this.router.navigateByUrl('/');
    } else {
      this.errorKey.set(result.message ?? 'auth.registerFailed');
    }
  }
}