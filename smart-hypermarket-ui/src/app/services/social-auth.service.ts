import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, AuthUser } from './auth.service';
import { API_URL } from '../config/api.config';

const API_BASE = `${API_URL}/auth`;

const GOOGLE_SDK = 'https://accounts.google.com/gsi/client';
const FACEBOOK_SDK = 'https://connect.facebook.net/en_US/sdk.js';

export type SocialProvider = 'google' | 'facebook';

export interface SocialLoginResult {
  success: boolean;
  /** Translation key, or a raw provider message when nothing better exists. */
  message?: string;
  needsLinking?: boolean;
  email?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, cfg: Record<string, unknown>) => void;
        };
      };
    };
    FB?: {
      init: (cfg: Record<string, unknown>) => void;
      login: (
        cb: (res: { authResponse?: { accessToken?: string } }) => void,
        opts: Record<string, unknown>
      ) => void;
    };
  }
}

/**
 * Real Google Identity Services + Facebook Login integration.
 *
 * The provider SDK runs in the browser and returns an opaque credential. This
 * service forwards that credential to our own backend, which verifies it
 * against the provider before issuing the application's JWT. The frontend
 * never asserts who the user is.
 */
@Injectable({ providedIn: 'root' })
export class SocialAuthService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly googleReady = signal(false);
  readonly facebookReady = signal(false);
  readonly busy = signal<SocialProvider | null>(null);

  private googleClientId = '';
  private facebookAppId = '';

  // Signals, not plain fields: the template's @if blocks must re-evaluate the
  // moment config arrives, otherwise the Google host element is never created.
  private readonly googleConfigured = signal(false);
  private readonly facebookConfigured = signal(false);
  private readonly configLoaded = signal(false);

  /** True once we know which providers exist, so the section can render/hide. */
  readonly available = this.configLoaded.asReadonly();
  readonly isGoogleConfigured = this.googleConfigured.asReadonly();
  readonly isFacebookConfigured = this.facebookConfigured.asReadonly();

  /**
   * True once Google's official button has actually been drawn into the host.
   * The UI keeps a styled "Continue with Google" button in the DOM at all times
   * so the control is always present and clickable; this only tells it to step
   * aside for Google's own button when the SDK is genuinely working.
   */
  readonly googleRendered = signal(false);

  private loadScript(src: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id) as HTMLScriptElement | null;
      if (existing) {
        if (existing.dataset['loaded'] === 'true') return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('script failed')), {
          once: true,
        });
        return;
      }
      const el = document.createElement('script');
      el.id = id;
      el.src = src;
      el.async = true;
      el.defer = true;
      el.addEventListener(
        'load',
        () => {
          el.dataset['loaded'] = 'true';
          resolve();
        },
        { once: true }
      );
      el.addEventListener('error', () => reject(new Error('script failed')), {
        once: true,
      });
      document.head.appendChild(el);
    });
  }

  /**
   * Fetches the public ids from our backend and loads whichever provider
   * scripts are needed. Called from the login and register pages.
   */
  async init(): Promise<void> {
    if (this.configLoaded()) return;

    let cfg: {
      googleClientId: string;
      facebookAppId: string;
      googleEnabled: boolean;
      facebookEnabled: boolean;
    };

    try {
      const res = await firstValueFrom(
        this.http.get<{ data: typeof cfg }>(`${API_BASE}/social/config`)
      );
      cfg = res.data;
    } catch {
      // Provider config unreachable: the email/password form still works.
      return;
    }

    this.googleClientId = cfg.googleClientId;
    this.facebookAppId = cfg.facebookAppId;
    this.googleConfigured.set(cfg.googleEnabled && !!cfg.googleClientId);
    this.facebookConfigured.set(cfg.facebookEnabled && !!cfg.facebookAppId);
    this.configLoaded.set(true);

    if (this.facebookConfigured()) {
      try {
        await this.loadScript(FACEBOOK_SDK, 'fb-sdk');
        window.FB?.init({
          appId: this.facebookAppId,
          cookie: true,
          xfbml: false,
          version: 'v21.0',
        });
        this.facebookReady.set(true);
      } catch {
        this.facebookConfigured.set(false);
      }
    }
  }

  /**
   * Renders the official Google Identity Services button into `host`.
   * Google requires its own rendered button for the popup flow; a styled <div>
   * is not a substitute. Returns true when the official button was drawn.
   */
  async renderGoogleButton(host: HTMLElement): Promise<boolean> {
    if (!this.googleConfigured()) return false;
    try {
      await this.loadScript(GOOGLE_SDK, 'google-gsi');
      if (!window.google?.accounts?.id) return false;

      host.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) void this.signInWithGoogle(response.credential);
        },
        ux_mode: 'popup',
      });
      window.google.accounts.id.renderButton(host, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        locale: document.documentElement.lang === 'ar' ? 'ar' : 'en',
        width: Math.min(320, host.offsetWidth || 320),
      });
      this.googleReady.set(true);
      this.googleRendered.set(true);
      return true;
    } catch {
      // Script blocked or network failure: keep the styled button visible so the
      // control never disappears, and let the click handler explain the state.
      return false;
    }
  }

  private async exchange(
    provider: SocialProvider,
    body: Record<string, string>
  ): Promise<SocialLoginResult> {
    this.busy.set(provider);
    try {
      const res = await firstValueFrom(
        this.http.post<{ token: string; data: { user: AuthUser } }>(
          `${API_BASE}/social/${provider}`,
          body
        )
      );
      this.auth.adoptSession(res.token, res.data.user);
      return { success: true };
    } catch (err: any) {
      const code = err?.error?.code;
      if (code === 'ACCOUNT_LINK_REQUIRED') {
        return {
          success: false,
          needsLinking: true,
          email: err?.error?.email,
          message: 'auth.social.accountExists',
        };
      }
      if (code === 'PROVIDER_NOT_CONFIGURED') {
        return { success: false, message: 'auth.social.notConfigured' };
      }
      if (code === 'EMAIL_NOT_VERIFIED') {
        return { success: false, message: 'auth.social.emailNotVerified' };
      }
      if (code === 'EMAIL_REQUIRED') {
        return { success: false, message: 'auth.social.emailRequired' };
      }
      return { success: false, message: 'auth.social.failed' };
    } finally {
      this.busy.set(null);
    }
  }

  signInWithGoogle(credential: string): Promise<SocialLoginResult> {
    return this.exchange('google', { credential });
  }

  /** Opens the real Facebook login dialog and exchanges the returned token. */
  signInWithFacebook(): Promise<SocialLoginResult> {
    return new Promise<SocialLoginResult>((resolve) => {
      if (!window.FB) {
        // The button is always on screen; say plainly what is missing.
        resolve({ success: false, message: 'auth.social.facebookNotConfigured' });
        return;
      }
      window.FB.login(
        (res) => {
          const token = res?.authResponse?.accessToken;
          if (!token) {
            // The user closed the dialog - not an error worth alarming about.
            resolve({ success: false, message: 'auth.social.cancelled' });
            return;
          }
          void this.exchange('facebook', { accessToken: token }).then(resolve);
        },
        { scope: 'email,public_profile' }
      );
    });
  }
}
