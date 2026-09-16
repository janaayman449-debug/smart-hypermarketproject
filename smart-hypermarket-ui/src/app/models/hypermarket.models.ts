export type OrderStatus = 'Placed' | 'Packed' | 'OutForDelivery' | 'Delivered' | 'Cancelled';
export type ReturnStatus = 'Pending' | 'Approved' | 'Rejected' | 'Refunded';
export interface Product {
  id: string;
  name: string;
  title?: string;
  price: number;
  description?: string;
  category: string;
  image?: string;
  stock: number;
  unit?: string;
  dietaryTag?: string;
  rating?: {
    rate: number;
    count: number;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  finalPrice: number;
  itemSubtotal: number;
  categoryDiscountAmount: number;
  categoryDiscountRate: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliverySlot: string;
  deliveryNotes?: string;
  paymentMethod: string;
  paymentStatus: string;
  cardLastFour?: string;
  orderStatus: OrderStatus;
  items: CartItem[];
  subtotal: number;
  categoryDiscountTotal: number;
  couponCode?: string;
  couponDiscountTotal: number;
  pointsRedeemed: number;
  pointsDiscountTotal: number;
  deliveryFee: number;
  grandTotal: number;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  refundAmount: number;
  reason: string;
  status: ReturnStatus;
  createdAt: string;
  notes?: string;
}

export interface ChatMessage {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  time?: string;
  timestamp?: Date;
  suggestions?: string[];
  productCard?: Product;
}