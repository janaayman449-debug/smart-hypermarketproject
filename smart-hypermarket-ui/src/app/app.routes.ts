import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home').then((m) => m.Home),
    title: 'سمارت هايبر ماركت | الرئيسية',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/products/products').then((m) => m.Products),
    title: 'سمارت هايبر ماركت | المنتجات',
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./pages/product-details/product-details').then((m) => m.ProductDetails),
    title: 'سمارت هايبر ماركت | تفاصيل المنتج',
  },
  {
    path: 'offers',
    loadComponent: () =>
      import('./pages/offers/offers').then((m) => m.Offers),
    title: 'سمارت هايبر ماركت | العروض',
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./pages/categories/categories').then((m) => m.Categories),
    title: 'سمارت هايبر ماركت | الأقسام',
  },
  {
    path: 'features',
    loadComponent: () =>
      import('./pages/features/features').then((m) => m.Features),
    title: 'سمارت هايبر ماركت | مميزاتنا',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./contact/contact').then((m) => m.Contact),
    title: 'سمارت هايبر ماركت | اتصل بنا',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then((m) => m.Login),
    title: 'سمارت هايبر ماركت | تسجيل الدخول',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register').then((m) => m.Register),
    title: 'سمارت هايبر ماركت | حساب جديد',
  },
    {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
    title: 'سمارت هايبر ماركت | نسيت كلمة المرور',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then((m) => m.ResetPassword),
    title: 'سمارت هايبر ماركت | إعادة تعيين كلمة المرور',
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./pages/cart/cart').then((m) => m.Cart),
    title: 'سمارت هايبر ماركت | السلة',
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/checkout/checkout').then((m) => m.Checkout),
    title: 'سمارت هايبر ماركت | إتمام الطلب',
  },
  {
    path: 'wishlist',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/wishlist/wishlist').then((m) => m.Wishlist),
    title: 'سمارت هايبر ماركت | المفضلة',
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile').then((m) => m.Profile),
    title: 'سمارت هايبر ماركت | حسابي',
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/orders/orders').then((m) => m.Orders),
    title: 'سمارت هايبر ماركت | طلباتي',
  },
  {
    path: 'returns',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/returns/returns').then((m) => m.Returns),
    title: 'سمارت هايبر ماركت | الإرجاع والاسترداد',
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    title: 'لوحة التحكم | سمارت هايبر ماركت',
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      {
        path: 'products',
        loadComponent: () => import('./pages/admin/admin-products/admin-products').then((m) => m.AdminProducts),
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/admin/admin-orders/admin-orders').then((m) => m.AdminOrders),
      },
      {
        path: 'offers',
        loadComponent: () => import('./pages/admin/admin-offers/admin-offers').then((m) => m.AdminOffers),
      },
      {
        path: 'customers',
        loadComponent: () => import('./pages/admin/admin-customers/admin-customers').then((m) => m.AdminCustomers),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./pages/admin/admin-analytics/admin-analytics').then((m) => m.AdminAnalytics),
      },
      {
        path: 'messages',
        loadComponent: () => import('./pages/admin/admin-messages/admin-messages').then((m) => m.AdminMessages),
      },
      {
        path: 'returns',
        loadComponent: () => import('./pages/admin/admin-returns/admin-returns').then((m) => m.AdminReturns),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];