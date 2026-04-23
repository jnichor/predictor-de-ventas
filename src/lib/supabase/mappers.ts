export type ProductRow = {
  id: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  unit_price: number;
  current_stock: number;
  min_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SaleRow = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  channel: string;
  sold_at: string;
  sold_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  voided_reason: string | null;
};

export type MovementRow = {
  id: string;
  product_id: string;
  type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
  created_by: string | null;
};

export function mapProduct(row: ProductRow) {
  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    description: row.description,
    category: row.category,
    unitPrice: Number(row.unit_price),
    currentStock: Number(row.current_stock),
    minStock: Number(row.min_stock),
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSale(row: SaleRow) {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    discount: Number(row.discount),
    total: Number(row.total),
    channel: row.channel,
    soldAt: row.sold_at,
    soldBy: row.sold_by ?? '',
    voidedAt: row.voided_at ?? null,
    voidedBy: row.voided_by ?? null,
    voidedReason: row.voided_reason ?? null,
  };
}

export function mapMovement(row: MovementRow) {
  return {
    id: row.id,
    productId: row.product_id,
    type: row.type,
    quantity: Number(row.quantity),
    reason: row.reason,
    referenceId: row.reference_id ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by ?? '',
  };
}
