import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../services/product.service';
import { Product } from '../../../models/hypermarket.models';
import { TranslatePipe } from '../../../pipes/translate';

interface ProductFormDraft {
  name: string;
  category: string;
  price: number | null;
  stock: number | null;
  description: string;
}

const EMPTY_DRAFT: ProductFormDraft = { name: '', category: '', price: null, stock: null, description: '' };

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './admin-products.html',
  styleUrl: '../admin.css',
})
export class AdminProducts {
  productService = inject(ProductService);

  showAddForm = signal(false);
  newProduct = signal<ProductFormDraft>({ ...EMPTY_DRAFT });
  addProductError = signal('');
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  showEditForm = signal(false);
  editingProductId = signal<string | null>(null);
  editProduct = signal<ProductFormDraft>({ ...EMPTY_DRAFT });
  editProductError = signal('');
  editSelectedFile: File | null = null;
  editPreviewUrl: string | null = null;

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
      this.addProductError.set('admin.fillAllFields');
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
      this.editProductError.set('admin.fillAllFieldsEdit');
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

  deleteProduct(id: string): void {
    this.productService.deleteProduct(id);
  }

  stockLabel(stock: number): string {
    if (stock === 0) return 'admin.outOfStock';
    if (stock <= 10) return 'admin.lowStock';
    return 'admin.inStock';
  }

  stockClass(stock: number): string {
    if (stock === 0) return 'stock-out';
    if (stock <= 10) return 'stock-low';
    return 'stock-ok';
  }
}