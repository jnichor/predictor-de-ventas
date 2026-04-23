import { describe, it, expect } from 'vitest';
import {
  createProductSchema,
  updateProductSchema,
  createSaleSchema,
  createMovementSchema,
  voidSaleSchema,
  inviteUserSchema,
  updateUserSchema,
  periodSchema,
} from './schemas';

describe('createProductSchema (server)', () => {
  it('acepta producto con defaults', () => {
    const r = createProductSchema.safeParse({
      barcode: 'x',
      name: 'y',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.description).toBe('');
      expect(r.data.category).toBe('General');
      expect(r.data.unit_price).toBe(0);
    }
  });
  it('rechaza barcode vacío', () => {
    expect(createProductSchema.safeParse({ barcode: '', name: 'y' }).success).toBe(false);
  });
  it('rechaza nombre muy largo', () => {
    expect(
      createProductSchema.safeParse({ barcode: 'x', name: 'y'.repeat(201) }).success,
    ).toBe(false);
  });
});

describe('updateProductSchema (server)', () => {
  it('permite update parcial', () => {
    expect(updateProductSchema.safeParse({ unit_price: 99.9 }).success).toBe(true);
  });
  it('permite active flag', () => {
    expect(updateProductSchema.safeParse({ active: false }).success).toBe(true);
  });
  it('rechaza min_stock negativo', () => {
    expect(updateProductSchema.safeParse({ min_stock: -1 }).success).toBe(false);
  });
});

describe('createSaleSchema (server)', () => {
  it('acepta venta mínima', () => {
    const r = createSaleSchema.safeParse({ barcode: '775', quantity: 1 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.discount).toBe(0);
      expect(r.data.channel).toBe('Mostrador');
    }
  });
  it('acepta con name (alta al vuelo)', () => {
    const r = createSaleSchema.safeParse({
      barcode: '775',
      quantity: 1,
      name: 'Producto nuevo',
    });
    expect(r.success).toBe(true);
  });
  it('rechaza cantidad 0', () => {
    expect(createSaleSchema.safeParse({ barcode: '775', quantity: 0 }).success).toBe(false);
  });
});

describe('createMovementSchema (server)', () => {
  it('acepta entry sin adjustment_direction', () => {
    const r = createMovementSchema.safeParse({
      barcode: '775',
      type: 'entry',
      quantity: 10,
    });
    expect(r.success).toBe(true);
  });
  it('rechaza adjustment sin direction', () => {
    const r = createMovementSchema.safeParse({
      barcode: '775',
      type: 'adjustment',
      quantity: 1,
    });
    expect(r.success).toBe(false);
  });
  it('acepta adjustment con direction válida', () => {
    const r = createMovementSchema.safeParse({
      barcode: '775',
      type: 'adjustment',
      quantity: 1,
      adjustment_direction: 'increase',
    });
    expect(r.success).toBe(true);
  });
  it('rechaza tipo fuera del enum', () => {
    const r = createMovementSchema.safeParse({
      barcode: '775',
      type: 'transfer',
      quantity: 1,
    });
    expect(r.success).toBe(false);
  });
});

describe('voidSaleSchema', () => {
  it('acepta sin motivo', () => {
    expect(voidSaleSchema.safeParse({}).success).toBe(true);
  });
  it('acepta con motivo', () => {
    expect(voidSaleSchema.safeParse({ reason: 'Error' }).success).toBe(true);
  });
  it('rechaza motivo muy largo', () => {
    expect(voidSaleSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('inviteUserSchema', () => {
  it('aplica default role=worker', () => {
    const r = inviteUserSchema.safeParse({ email: 'x@y.com' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.role).toBe('worker');
  });
  it('rechaza email inválido', () => {
    expect(inviteUserSchema.safeParse({ email: 'not-email' }).success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('acepta cambio de role', () => {
    expect(updateUserSchema.safeParse({ role: 'admin' }).success).toBe(true);
  });
  it('acepta active boolean', () => {
    expect(updateUserSchema.safeParse({ active: false }).success).toBe(true);
  });
  it('rechaza role inválido', () => {
    expect(updateUserSchema.safeParse({ role: 'owner' }).success).toBe(false);
  });
});

describe('periodSchema', () => {
  it('acepta valores permitidos', () => {
    for (const v of ['today', '7d', '30d', '90d']) {
      expect(periodSchema.safeParse(v).success).toBe(true);
    }
  });
  it('rechaza otros', () => {
    expect(periodSchema.safeParse('5d').success).toBe(false);
    expect(periodSchema.safeParse(null).success).toBe(false);
  });
});
