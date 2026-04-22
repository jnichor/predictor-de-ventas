export type Product = {
  id: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  reason: string;
  referenceId?: string;
  createdAt: string;
  createdBy: string;
};

export type Sale = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  channel: string;
  soldAt: string;
  soldBy: string;
};

export type TrendPoint = {
  label: string;
  value: number;
};
