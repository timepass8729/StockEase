export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl: string;
  sku: string;
  category: string;
  costPrice: number;
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export const formatToRupees = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

export interface Transaction {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod?: string;
  timestamp: Date;
  total: number;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
}