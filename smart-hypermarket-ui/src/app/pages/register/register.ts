import { Component, signal, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SocialAuthService } from '../../services/social-auth.service';
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
export class Register implements AfterViewInit {
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';

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

  constructor(private auth: AuthService, private router: Router) {}

  async ngAfterViewInit(): Promise<void> {
    await this.social.init();
  }

  /** Fallback Google control; see the note in the login component. */
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

  protected async onFacebook(): Promise<void> {
    this.socialError.set(null);
    const result = await this.social.signInWithFacebook();
    if (result.success) {
      await Promise.all([
        this.wishlist.fetchWishlist(),
        this.cart.fetchCart(),
      ]);
      this.router.navigateByUrl('/');
    } else if (result.message) {
      this.socialError.set(result.message);
    }
  }

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