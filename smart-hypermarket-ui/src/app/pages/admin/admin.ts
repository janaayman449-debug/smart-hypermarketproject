import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService, AdminUserSummary } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { Product, ReturnStatus } from '../../models/hypermarket.models';

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const MESSAGES_API = 'http://localhost:5000/api/messages';

type AdminTab = 'products' | 'orders' | 'customers' | 'analytics' | 'messages' | 'returns';
type OrderStatusFilter = 'All' | 'Placed' | 'OutForDelivery' | 'Delivered' | 'Cancelled';

interface ProductFormDraft {
  name: string;
  category: string;
  price: number | null;
  stock: number | null;
  description: string;
}

const EMPTY_DRAFT: ProductFormDraft = {
  name: '',
  category: '',
  price: null,
  stock: null,
  description: '',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminComponent implements OnInit {
  authService = inject(AuthService);
  productService = inject(ProductService);
  protected readonly orderService = inject(OrderService);
  private readonly http = inject(HttpClient);

  activeTab = signal<AdminTab>('products');

  // ---- إضافة منتج ----
  showAddForm = signal(false);
  newProduct = signal<ProductFormDraft>({ ...EMPTY_DRAFT });
  addProductError = signal('');
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  // ---- تعديل منتج ----
  showEditForm = signal(false);
  editingProductId = signal<string | null>(null);
  editProduct = signal<ProductFormDraft>({ ...EMPTY_DRAFT });
  editProductError = signal('');
  editSelectedFile: File | null = null;
  editPreviewUrl: string | null = null;

  // ---- Customers (حقيقية من الباك اند) ----
  customers = signal<AdminUserSummary[]>([]);

  orderStatusFilter = signal<OrderStatusFilter>('All');

  filteredOrders = computed(() => {
    const filter = this.orderStatusFilter();
    const list = this.orderService.orders();
    return filter === 'All' ? list : list.filter((o) => o.orderStatus === filter);
  });

  totalRevenue = computed(() =>
    this.orderService.orders().reduce((sum, o) => sum + o.grandTotal, 0)
  );

  lowStockCount = computed(() =>
    this.productService.products().filter((p) => p.stock <= 10).length
  );

  // ---- Messages ----
  messages = signal<ContactMessage[]>([]);
  messagesLoading = signal(false);
  messagesError = signal('');

  unreadMessagesCount = computed(() =>
    this.messages().filter((m) => !m.read).length
  );

  pendingReturnsCount = computed(() =>
    this.orderService.returns().filter((r) => r.status === 'Pending').length
  );

  ngOnInit(): void {
    this.orderService.refreshOrders();
    this.orderService.refreshReturns();
  }

  setTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    if (tab === 'messages' && this.messages().length === 0) {
      this.loadMessages();
    }
    if (tab === 'customers' && this.customers().length === 0) {
      this.loadCustomers();
    }
  }

  async loadCustomers(): Promise<void> {
    const users = await this.authService.getAllUsers();
    this.customers.set(users);
  }

  setOrderFilter(status: OrderStatusFilter): void {
    this.orderStatusFilter.set(status);
  }

  async changeOrderStatus(
    orderId: string,
    status: 'Placed' | 'OutForDelivery' | 'Delivered' | 'Cancelled'
  ): Promise<void> {
    await this.orderService.updateOrderStatus(orderId, status);
  }

  async changeReturnStatus(
    returnId: string,
    status: ReturnStatus
  ): Promise<void> {
    await this.orderService.updateReturnStatus(returnId, status);
  }

  // ================= إضافة منتج =================
  openAddForm(): void {
    this.newProduct.set({ ...EMPTY_DRAFT });
    this.selectedFile = null;
    this.previewUrl = null;
    this.addProductError.set('');
    this.showAddForm.set(true);
  }

  cancelAddProduct(): void {
    this.showAddForm.set(false);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile = file;

    if (file) {
      const reader = new FileReader();
      reader.onload = () => (this.previewUrl = reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.previewUrl = null;
    }
  }

  submitAddProduct(): void {
    const draft = this.newProduct();

    if (!draft.name.trim() || !draft.category.trim() || draft.price === null || draft.stock === null) {
      this.addProductError.set('Fill in all fields before adding a product.');
      return;
    }

    this.productService.addProduct(
      {
        name: draft.name.trim(),
        category: draft.category.trim(),
        price: draft.price,
        stock: draft.stock,
        description: draft.description.trim() || undefined,
      },
      this.selectedFile
    );

    this.showAddForm.set(false);
  }

  // ================= تعديل منتج =================
  openEditForm(product: Product): void {
    this.editingProductId.set(product.id);
    this.editProduct.set({
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      description: product.description ?? '',
    });
    this.editSelectedFile = null;
    this.editPreviewUrl = product.image ?? null;
    this.editProductError.set('');
    this.showEditForm.set(true);
  }

  cancelEditProduct(): void {
    this.showEditForm.set(false);
    this.editingProductId.set(null);
  }

  onEditFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.editSelectedFile = file;

    if (file) {
      const reader = new FileReader();
      reader.onload = () => (this.editPreviewUrl = reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  submitEditProduct(): void {
    const id = this.editingProductId();
    const draft = this.editProduct();

    if (!id) return;

    if (!draft.name.trim() || !draft.category.trim() || draft.price === null || draft.stock === null) {
      this.editProductError.set('Fill in all fields before saving.');
      return;
    }

    this.productService.updateProduct(
      id,
      {
        name: draft.name.trim(),
        category: draft.category.trim(),
        price: draft.price,
        stock: draft.stock,
        description: draft.description.trim() || undefined,
      },
      this.editSelectedFile
    );

    this.showEditForm.set(false);
    this.editingProductId.set(null);
  }

  // ================= حذف منتج =================
  deleteProduct(id: string): void {
    this.productService.deleteProduct(id);
  }

  stockLabel(stock: number): string {
    if (stock === 0) return 'Out of stock';
    if (stock <= 10) return 'Low stock';
    return 'In stock';
  }

  stockClass(stock: number): string {
    if (stock === 0) return 'stock-out';
    if (stock <= 10) return 'stock-low';
    return 'stock-ok';
  }

  // ================= Messages =================
  private authHeaders() {
    const token = this.authService.getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  async loadMessages(): Promise<void> {
    this.messagesLoading.set(true);
    this.messagesError.set('');
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: { messages: ContactMessage[] } }>(
          MESSAGES_API,
          this.authHeaders()
        )
      );
      this.messages.set(res.data.messages);
    } catch (err) {
      console.error('Failed to load messages', err);
      this.messagesError.set('تعذر تحميل الرسائل.');
    } finally {
      this.messagesLoading.set(false);
    }
  }

  async markMessageRead(msg: ContactMessage): Promise<void> {
    if (msg.read) return;
    try {
      await firstValueFrom(
        this.http.patch(`${MESSAGES_API}/${msg._id}/read`, {}, this.authHeaders())
      );
      this.messages.update((list) =>
        list.map((m) => (m._id === msg._id ? { ...m, read: true } : m))
      );
    } catch (err) {
      console.error('Failed to mark message as read', err);
    }
  }
}