import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

const TOKEN_KEY = 'sh_token';
const SESSION_KEY = 'sh_current_user';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        // التوكن منتهي أو غير صالح: نمسح الجلسة ونرجع لصفحة اللوجين
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(SESSION_KEY);
        router.navigate(['/login']);
      }

      if (error.status === 403) {
        console.error('Access denied:', error.error?.message);
      }

      return throwError(() => error);
    })
  );
};