import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  points: number;
  avatar?: string;
  role: 'customer' | 'admin' | 'staff';
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin' | 'staff';
  ordersCount: number;
  createdAt: string;
}

const API_BASE = 'http://localhost:5000/api/auth';
const TOKEN_KEY = 'sh_token';
const SESSION_KEY = 'sh_current_user';

interface BackendAuthResponse {
  status: string;
  message: string;
  token: string;
  data: {
  user: {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin' | 'staff';
  points: number;
};
  };
}

interface DecodedToken {
  id: string;
  role: string;
  exp: number;
  iat: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _currentUser = signal<AuthUser | null>(this.readSession());
  private readonly _isLoading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly isLoggedIn = computed(() => this._currentUser() !== null && this.isTokenValid());

  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> {
    this._isLoading.set(true);

    try {
      const res = await firstValueFrom(
        this.http.post<BackendAuthResponse>(`${API_BASE}/login`, { email, password })
      );

      this.persistSession(res);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err?.error?.message ?? 'auth.invalidCredentials',
      };
    } finally {
      this._isLoading.set(false);
    }
  }

  async register(
    fullName: string,
    email: string,
    password: string,
    phone: string
  ): Promise<{ success: boolean; message?: string }> {
    this._isLoading.set(true);

    try {
      const res = await firstValueFrom(
        this.http.post<BackendAuthResponse>(`${API_BASE}/signup`, {
          name: fullName,
          email,
          password,
          phone,
        })
      );

      this.persistSession(res);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err?.error?.message ?? 'auth.emailTaken',
      };
    } finally {
      this._isLoading.set(false);
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      await firstValueFrom(
        this.http.post(`${API_BASE}/forgot-password`, { email })
      );
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err?.error?.message ?? 'auth.forgotPasswordFailed',
      };
    }
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await firstValueFrom(
        this.http.post(`${API_BASE}/reset-password`, { email, token, newPassword })
      );
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err?.error?.message ?? 'auth.resetPasswordFailed',
      };
    }
  }

  async getAllUsers(): Promise<AdminUserSummary[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { users: AdminUserSummary[] } }>(`${API_BASE}/users`)
      );
      return res.data.users;
    } catch (err) {
      console.error('Failed to fetch users', err);
      return [];
    }
  }

  logout(): void {
    this._currentUser.set(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  isAdmin(): boolean {
    return this._currentUser()?.role === 'admin';
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** يفك تشفير الـ JWT ويرجع الـ payload بتاعه، أو null لو مش موجود أو تالف. */
  private getDecodedToken(): DecodedToken | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      return jwtDecode<DecodedToken>(token);
    } catch {
      return null;
    }
  }

  /** يتأكد إن التوكن موجود، سليم، ولسه ساري (مش منتهي الصلاحية). */
  isTokenValid(): boolean {
    const decoded = this.getDecodedToken();
    if (!decoded) return false;

    const expirationDate = new Date(decoded.exp * 1000);
    if (expirationDate < new Date()) {
      // التوكن منتهي: نظّف الجلسة تلقائيًا
      this.logout();
      return false;
    }

    return true;
  }

  /** يرجع الـ role من التوكن نفسه (بدل الاعتماد بس على الـ signal). */
  getRole(): string | null {
    const decoded = this.getDecodedToken();
    return decoded?.role ?? null;
  }

  updateProfile(updates: Partial<Pick<AuthUser, 'name' | 'phone' | 'address'>>): void {
    const user = this._currentUser();
    if (!user) return;

    const updatedUser: AuthUser = { ...user, ...updates };
    this._currentUser.set(updatedUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
  }

  private persistSession(res: BackendAuthResponse): void {
    const user: AuthUser = {
      id: res.data.user.id,
      name: res.data.user.name,
      email: res.data.user.email,
      phone: res.data.user.phone,
      address: '',
      points: res.data.user.points,
      role: res.data.user.role,
    };

    this._currentUser.set(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, res.token);
  }

  private readSession(): AuthUser | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}