import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Product } from '../models/hypermarket.models';

const API_BASE = 'http://localhost:5000/api/products';
const IMAGE_BASE = 'http://localhost:5000/uploads/';

@Injectable({ providedIn: 'root' })
export class ProductService {
  categoriesList = signal<string[]>([
    'Fresh Produce',
    'Dairy & Eggs',
    'Bakery',
    'Beverages',
    'Pantry & Grains',
    'Snacks',
    'Frozen Foods',
    'Meat & Poultry',
    'Household & Cleaning',
    'Personal Care',
  ]);

  private readonly _products = signal<Product[]>([]);
  readonly products = this._products.asReadonly();

  constructor(private http: HttpClient) {
    this.fetchProducts();
  }

  private fetchProducts(): void {
    this.http.get<any>(API_BASE)
      .pipe(
        map((res) => res.data.products.map((p: any) => this.mapFromApi(p)))
      )
      .subscribe({
        next: (mappedProducts) => {
          this._products.set(mappedProducts);
        },
        error: (err) => console.error('Failed to fetch products', err),
      });
  }

  private mapFromApi(p: any): Product {
    return {
      id: p._id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      description: p.description,
      image: p.image ? IMAGE_BASE + p.image : 'https://picsum.photos/seed/' + p._id + '/400/400',
    } as Product;
  }

  getProducts(): Product[] {
    return this._products();
  }

  getProductById(id: string): Product | undefined {
    return this._products().find((p) => p.id === id);
  }
//admin 
  addProduct(product: Partial<Product>, imageFile?: File | null): void {
    const formData = new FormData();
    formData.append('name', product.name ?? '');
    formData.append('category', product.category ?? '');
    formData.append('price', String(product.price ?? 0));
    formData.append('stock', String(product.stock ?? 0));
    formData.append('description', product.description || product.name || 'No description');
    if (imageFile) formData.append('image', imageFile);

    this.http.post<any>(API_BASE, formData).subscribe({
      next: (res) => {
        const newProduct = this.mapFromApi(res.data.product);
        this._products.update((prods) => [newProduct, ...prods]);
      },
      error: (err) => console.error('Failed to add product', err),
    });
  }

  updateProduct(id: string, product: Partial<Product>, imageFile?: File | null): void {
    const formData = new FormData();
    if (product.name) formData.append('name', product.name);
    if (product.category) formData.append('category', product.category);
    if (product.price !== undefined) formData.append('price', String(product.price));
    if (product.stock !== undefined) formData.append('stock', String(product.stock));
    if (product.description) formData.append('description', product.description);
    if (imageFile) formData.append('image', imageFile);

    this.http.patch<any>(`${API_BASE}/${id}`, formData).subscribe({
      next: (res) => {
        const updated = this.mapFromApi(res.data.product);
        this._products.update((prods) => prods.map((p) => (p.id === id ? updated : p)));
      },
      error: (err) => console.error('Failed to update product', err),
    });
  }

  deleteProduct(id: string): void {
    this.http.delete(`${API_BASE}/${id}`).subscribe({
      next: () => this._products.update((prods) => prods.filter((p) => p.id !== id)),
      error: (err) => console.error('Failed to delete product', err),
    });
  }
}