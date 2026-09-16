import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Order, OrderStatus, ReturnRequest, ReturnStatus } from '../models/hypermarket.models';
import { AuthService } from './auth.service';

const API_BASE = 'http://localhost:5000/api/orders';
const RETURNS_API = 'http://localhost:5000/api/returns';
const IMAGE_BASE = 'http://localhost:5000/uploads/';

interface BackendOrderItem {
  product: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
}

interface BackendOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliverySlot?: string;
  items: BackendOrderItem[];
  subtotal: number;
  categoryDiscountTotal: number;
  couponDiscountTotal: number;
  pointsRedeemed: number;
  pointsDiscountTotal: number;
  deliveryFee: number;
  grandTotal: number;
  paymentMethod: 'Cash' | 'Card';
  paymentStatus: 'Pending' | 'Paid';
  cardLastFour?: string;
  orderStatus: OrderStatus;
  createdAt: string;
}

interface BackendReturn {
  _id: string;
  order: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  reason: string;
  refundAmount: number;
  notes?: string;
  status: ReturnStatus;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly _orders = signal<Order[]>([]);
  private readonly _returns = signal<ReturnRequest[]>([]);

  readonly orders = this._orders.asReadonly();
  readonly returns = this._returns.asReadonly();

  constructor() {
    this.refreshOrders();
    this.refreshReturns();
  }

  private mapFromApi(o: BackendOrder): Order {
    return {
      id: o._id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      deliveryAddress: o.deliveryAddress,
      deliveryCity: o.deliveryCity,
      deliverySlot: o.deliverySlot ?? '',
      items: o.items.map((i) => ({
        product: {
          id: i.product,
          name: i.name,
          image: i.image ? IMAGE_BASE + i.image : '',
          price: i.price,
        } as any,
        quantity: i.quantity,
        categoryDiscountRate: 0,
        categoryDiscountAmount: 0,
        itemSubtotal: i.price * i.quantity,
        finalPrice: i.price * i.quantity,
      })),
      subtotal: o.subtotal,
      categoryDiscountTotal: o.categoryDiscountTotal,
      couponDiscountTotal: o.couponDiscountTotal,
      pointsRedeemed: o.pointsRedeemed,
      pointsDiscountTotal: o.pointsDiscountTotal,
      deliveryFee: o.deliveryFee,
      grandTotal: o.grandTotal,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      cardLastFour: o.cardLastFour,
      orderStatus: o.orderStatus,
      createdAt: o.createdAt,
    } as Order;
  }

  /** يجيب طلبات المستخدم الحالي لو مسجل دخول، أو كل الطلبات لو أدمن) */
  async refreshOrders(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this._orders.set([]);
      return;
    }

    try {
      const endpoint = this.auth.isAdmin() ? API_BASE : `${API_BASE}/mine`;
      const res = await firstValueFrom(
        this.http.get<{ data: { orders: BackendOrder[] } }>(endpoint)
      );
      this._orders.set(res.data.orders.map((o) => this.mapFromApi(o)));
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  }

  /** ينشئ الأوردر من محتوى سلة المستخدم في الباك اند (الآيتمز مش بتتبعت من الفرونت). */
  async createOrder(data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliverySlot?: string;
    deliveryNotes?: string;
    subtotal: number;
    categoryDiscountTotal: number;
    couponCode?: string;
    couponDiscountTotal: number;
    pointsRedeemed: number;
    pointsDiscountTotal: number;
    deliveryFee: number;
    grandTotal: number;
    paymentMethod: 'Cash' | 'Card';
    paymentStatus: 'Pending' | 'Paid';
    cardLastFour?: string;
  }): Promise<Order> {
    const res = await firstValueFrom(
      this.http.post<{ data: { order: BackendOrder } }>(API_BASE, data)
    );
    const order = this.mapFromApi(res.data.order);
    this._orders.update((list) => [order, ...list]);
    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${API_BASE}/${orderId}/status`, { status })
      );
      this._orders.update((list) =>
        list.map((o) => (o.id === orderId ? { ...o, orderStatus: status } : o))
      );
    } catch (err) {
      console.error('Failed to update order status', err);
    }
  }

  getOrderById(id: string): Order | undefined {
    return this._orders().find((o) => o.id === id);
  }

  isReturnEligible(order: Order): boolean {
    if (order.orderStatus !== 'Delivered') return false;
    const daysSince = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 3600 * 24);
    return daysSince <= 14;
  }

  // ---------------- returns (مربوطة بالباك اند الحقيقي) ----------------
  async refreshReturns(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this._returns.set([]);
      return;
    }

    try {
      const endpoint = this.auth.isAdmin() ? RETURNS_API : `${RETURNS_API}/mine`;
      const res = await firstValueFrom(
        this.http.get<{ data: { returns: BackendReturn[] } }>(endpoint)
      );
      this._returns.set(res.data.returns.map((r) => this.mapReturnFromApi(r)));
    } catch (err) {
      console.error('Failed to fetch returns', err);
    }
  }

  private mapReturnFromApi(r: BackendReturn): ReturnRequest {
    return {
      id: r._id,
      orderId: r.order,
      orderNumber: r.orderNumber,
      customerName: r.customerName,
      productName: r.productName,
      reason: r.reason,
      refundAmount: r.refundAmount,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt,
    };
  }

  async createReturnRequest(input: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    productName: string;
    reason: string;
    refundAmount: number;
    notes?: string;
  }): Promise<ReturnRequest> {
    const res = await firstValueFrom(
      this.http.post<{ data: { return: BackendReturn } }>(RETURNS_API, {
        orderId: input.orderId,
        productName: input.productName,
        reason: input.reason,
        refundAmount: input.refundAmount,
        notes: input.notes,
      })
    );
    const request = this.mapReturnFromApi(res.data.return);
    this._returns.update((list) => [request, ...list]);
    return request;
  }

  async updateReturnStatus(returnId: string, status: ReturnStatus): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(`${RETURNS_API}/${returnId}/status`, { status })
      );
      this._returns.update((list) =>
        list.map((r) => (r.id === returnId ? { ...r, status } : r))
      );
    } catch (err) {
      console.error('Failed to update return status', err);
    }
  }

  getReturnsForOrder(orderId: string): ReturnRequest[] {
    return this._returns().filter((r) => r.orderId === orderId);
  }
}