export interface Product {
  id: string;
  customId?: string; // SKU
  name: string;
  brand?: string;
  model?: string;
  description?: string;
  image?: string;
  specifications?: string;
  serialNo: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  category: string;
  warrantyPeriod?: string; // e.g. "12 Months"
  supplierId?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  loyaltyPoints?: number; // Earned loyalty points
  visitCount?: number; // Number of visits/purchases
  lastVisit?: string;
  createdAt: string;
  notes?: string;
}

export interface CartItem extends Product {
  quantity: number;
  discount?: number; // Per item discount
}

export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET' | 'TRANSFER' | 'OTHER';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'DUE';

export interface PaymentRecord {
  id: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
}

export interface Sale {
  id: string;
  invoiceNo: string; // Readable Invoice #
  items: CartItem[];
  subTotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  profit: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerId?: string;
  customerName?: string;
  createdAt: string;
  payments: PaymentRecord[];
}

export type RepairStatus = 'received' | 'in-progress' | 'waiting-for-parts' | 'ready' | 'delivered';

export interface RepairJob {
  id: string;
  jobId: string; // Readable ID
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  serialNo: string;
  issueDescription: string;
  status: RepairStatus;
  estimatedCost: number;
  advanceAmount?: number;
  assignedTechnician?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
