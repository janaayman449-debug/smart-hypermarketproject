import { Component, signal, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { SocialAuthService } from '../../services/social-auth.service';
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
export class Login implements AfterViewInit {

  email = '';

  password = '';

  rememberMe = false;

  submitted = signal(false);

  loading = signal(false);

  errorKey = signal<string | null>(null);

  protected readonly social = inject(SocialAuthService);
  protected readonly socialError = signal<string | null>(null);

  protected socialBusy = this.social.busy;

  // The slot is now unconditionally in the template, so this setter fires on
  // first render and again whenever the page is re-entered.
  @ViewChild('googleBtn')
  set googleBtn(ref: ElementRef<HTMLElement> | undefined) {
    if (ref) {
      this.googleSlot = ref;
      void this.social.renderGoogleButton(ref.nativeElement);
    }
  }

  private googleSlot?: ElementRef<HTMLElement>;

  private readonly wishlist = inject(WishlistService);
  private readonly cart = inject(CartService);

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngAfterViewInit(): Promise<void> {
    await this.social.init();
  }

  /**
   * Fallback Google control. Google's own Identity Services button replaces this
   * one whenever the SDK is usable; when it is not, this button is what the user
   * sees and clicks, so it reports the real state rather than failing silently.
   */
  protected async onGoogle(): Promise<void> {
    this.socialError.set(null);
    const drawn = await this.social.renderGoogleButton(
      this.googleSlot?.nativeElement ?? document.createElement('div')
    );
    if (drawn) return;
    this.socialError.set(
      this.social.isGoogleConfigured()
        ? 'auth.social.googleUnavailable'
        : 'auth.social.googleNotConfigured'
    );
  }

  /** Finishes the sign-in exactly like the email/password path does. */
  private async completeSignIn(): Promise<void> {
    await Promise.all([
      this.wishlist.fetchWishlist(),
      this.cart.fetchCart(),
    ]);
    const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
    this.router.navigateByUrl(redirectTo || '/');
  }

  protected async onFacebook(): Promise<void> {
    this.socialError.set(null);
    const result = await this.social.signInWithFacebook();
    if (result.success) {
      await this.completeSignIn();
    } else if (result.message) {
      this.socialError.set(result.message);
    }
  }

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