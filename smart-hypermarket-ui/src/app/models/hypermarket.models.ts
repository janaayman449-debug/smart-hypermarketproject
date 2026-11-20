export type OrderStatus = 'Placed' | 'Packed' | 'OutForDelivery' | 'Delivered' | 'Cancelled';
export type ReturnStatus = 'Pending' | 'Approved' | 'Rejected' | 'Refunded';

/**
 * Machine keys for notification types. The human-readable title and body are
 * resolved by the UI from its translation table, so one stored row renders
 * correctly in both Arabic and English.
 */
export type NotificationType =
  | 'order_created'
  | 'payment_proof_required'
  | 'payment_proof_submitted'
  | 'payment_verified'
  | 'payment_rejected'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  audience: 'customer' | 'admin';
  order?: string | null;
  orderNumber?: string | null;
  data?: {
    orderNumber?: string;
    reason?: string;
    status?: string;
    grandTotal?: number;
  };
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

/** InstaPay receiving account, served from backend configuration. */
export interface InstapayInfo {
  method: string;
  accountName: string;
  accountId: string;
  accountNumber: string;
  bankName: string;
  configured: boolean;
}

export interface InstapayResponse {
  instapay: InstapayInfo;
  copyText: string;
  maxUploadBytes: number;
  acceptedFormats: string[];
}

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

/**
 * InstaPay lifecycle.
 *
 * Pending        -> order placed, no transfer proof uploaded yet
 * ProofSubmitted -> screenshot uploaded, waiting for an admin decision
 * Verified       -> an admin confirmed the transfer (this is the only "paid")
 * Rejected       -> an admin rejected it; the customer can upload a new proof
 *
 * "Paid" is a legacy value that only pre-InstaPay card orders can carry.
 */
export type PaymentStatus = 'Pending' | 'ProofSubmitted' | 'Verified' | 'Rejected' | 'Paid';

export type PaymentMethod = 'Cash' | 'InstaPay';

/** Metadata only. The image bytes are never exposed to a public URL. */
export interface PaymentProof {
  fileName: string;
  originalName?: string;
  mimeType: string;
  size: number;
  reference?: string | null;
  uploadedAt: string;
}

/** The admin decision trail. Present once an admin has reviewed the proof. */
export interface PaymentReview {
  decision?: 'Verified' | 'Rejected' | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
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
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentProof?: PaymentProof | null;
  paymentReview?: PaymentReview | null;
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