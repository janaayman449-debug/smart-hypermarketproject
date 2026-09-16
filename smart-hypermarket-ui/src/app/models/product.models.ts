// قم بتعديل interface Product لتستقبل string أو number للـ id
export interface Product {
  id: string | number;
  title?: string;
  name?: string;
  price: number;
  description?: string;
  category?: string;
  image?: string;
  stock?: number;
  unit?: string;
  rating?: {
    rate: number;
    count: number;
  };
}