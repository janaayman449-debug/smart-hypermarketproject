import { Component, signal, inject, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { NotificationCenter } from '../notification-center/notification-center';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, NotificationCenter],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {

  protected readonly menuOpen = signal(false);
  protected readonly accountMenuOpen = signal(false);
  protected readonly isScrolled = signal(false);

  protected readonly language = inject(LanguageService);
  protected readonly cartService = inject(CartService);
  protected readonly wishlistService = inject(WishlistService);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cartCount = this.cartService.itemCount;
  protected readonly wishlistCount = this.wishlistService.count;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 12);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.accountMenuOpen.set(false);
  }

  protected toggleAccountMenu(): void {
    this.accountMenuOpen.update((open) => !open);
  }

  protected logout(): void {
    this.authService.logout();
    this.wishlistService.clear();
    this.cartService.clearLocal();
    this.accountMenuOpen.set(false);
    this.router.navigateByUrl('/');
  }
}