﻿import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { TranslatePipe } from '../../pipes/translate';

@Component({
  selector: 'app-login',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe
  ],

  templateUrl: './login.html',

  styleUrl: './login.css'
})
export class Login {

  email = '';

  password = '';

  rememberMe = false;

  submitted = signal(false);

  loading = signal(false);

  errorKey = signal<string | null>(null);

  private readonly wishlist = inject(WishlistService);
  private readonly cart = inject(CartService);

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async onSubmit(
    form: NgForm
  ): Promise<void> {

    this.submitted.set(true);

    this.errorKey.set(null);

    if (form.invalid) {
      return;
    }

    this.loading.set(true);

    const result =
      await this.auth.login(
        this.email,
        this.password
      );

    this.loading.set(false);

    if (result.success) {

      await Promise.all([
        this.wishlist.fetchWishlist(),
        this.cart.fetchCart(),
      ]);

      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
      this.router.navigateByUrl(redirectTo || '/');

    } else {

      this.errorKey.set(
        result.message ??
        'auth.invalidCredentials'
      );
    }
  }
}