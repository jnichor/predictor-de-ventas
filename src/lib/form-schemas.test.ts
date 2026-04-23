import { describe, it, expect } from 'vitest';
import {
  loginFormSchema,
  saleFormSchema,
  movementFormSchema,
  productFormSchema,
  inviteFormSchema,
} from './form-schemas';

describe('loginFormSchema', () => {
  it('acepta datos válidos', () => {
    const result = loginFormSchema.safeParse({
      email: 'admin@tienda.com',
      password: 'secret',
    });
    expect(result.success).toBe(true);
  });
  it('rechaza email inválido', () => {
    const result = loginFormSchema.safeParse({ email: 'no-es-email', password: 'secret' });
    expect(result.success).toBe(false);
  });
  it('rechaza email vacío', () => {
    const result = loginFormSchema.safeParse({ email: '', password: 'secret' });
    expect(result.success).toBe(false);
  });
  it('rechaza password vacío', () => {
    const result = loginFormSchema.safeParse({ email: 'x@y.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('saleFormSchema', () => {
  it('acepta venta básica', () => {
    const r = saleFormSchema.safeParse({
      barcode: '7751234567890',
      quantity: 2,
      discount: 0,
      channel: 'Mostrador',
    });
    expect(r.success).toBe(true);
  });
  it('rechaza quantity 0', () => {
    const r = saleFormSchema.safeParse({
      barcode: 'x',
      quantity: 0,
      discount: 0,
      channel: 'Mostrador',
    });
    expect(r.success).toBe(false);
  });
  it('rechaza quantity negativo', () => {
    const r = saleFormSchema.safeParse({
      barcode: 'x',
      quantity: -1,
      discount: 0,
      channel: 'Mostrador',
    });
    expect(r.success).toBe(false);
  });
  it('rechaza quantity decimal', () => {
    const r = saleFormSchema.safeParse({
      barcode: 'x',
      quantity: 1.5,
      discount: 0,
      channel: 'Mostrador',
    });
    expect(r.success).toBe(false);
  });
  it('rechaza descuento negativo', () => {
    const r = saleFormSchema.safeParse({
      barcode: 'x',
      quantity: 1,
      discount: -5,
      channel: 'Mostrador',
    });
    expect(r.success).toBe(false);
  });
  it('rechaza canal fuera del enum', () => {
    const r = saleFormSchema.safeParse({
      barcode: 'x',
      quantity: 1,
      discount: 0,
      channel: 'Whatsapp',
    });
    expect(r.success).toBe(false);
  });
});

describe('movementFormSchema', () => {
  it('acepta entrada válida', () => {
    const r = movementFormSchema.safeParse({
      barcodeOrName: 'x',
      type: 'entry',
      quantity: 10,
      reason: 'Proveedor',
      adjustmentDirection: 'increase',
    });
    expect(r.success).toBe(true);
  });
  it('rechaza cantidad 0', () => {
    const r = movementFormSchema.safeParse({
      barcodeOrName: 'x',
      type: 'entry',
      quantity: 0,
      reason: '',
      adjustmentDirection: 'increase',
    });
    expect(r.success).toBe(false);
  });
  it('rechaza tipo inválido', () => {
    const r = movementFormSchema.safeParse({
      barcodeOrName: 'x',
      type: 'hack',
      quantity: 1,
      reason: '',
      adjustmentDirection: 'increase',
    });
    expect(r.success).toBe(false);
  });
  it('rechaza motivo demasiado largo', () => {
    const r = movementFormSchema.safeParse({
      barcodeOrName: 'x',
      type: 'entry',
      quantity: 1,
      reason: 'x'.repeat(501),
      adjustmentDirection: 'increase',
    });
    expect(r.success).toBe(false);
  });
});

describe('productFormSchema', () => {
  it('acepta producto válido', () => {
    const r = productFormSchema.safeParse({
      barcode: '775...',
      name: 'Arroz 1kg',
      category: 'Abarrotes',
      description: '',
      unitPrice: 4.5,
      currentStock: 50,
      minStock: 10,
    });
    expect(r.success).toBe(true);
  });
  it('rechaza nombre vacío', () => {
    const r = productFormSchema.safeParse({
      barcode: 'x',
      name: '',
      category: '',
      description: '',
      unitPrice: 0,
      currentStock: 0,
      minStock: 0,
    });
    expect(r.success).toBe(false);
  });
  it('rechaza precio negativo', () => {
    const r = productFormSchema.safeParse({
      barcode: 'x',
      name: 'y',
      category: '',
      description: '',
      unitPrice: -1,
      currentStock: 0,
      minStock: 0,
    });
    expect(r.success).toBe(false);
  });
  it('rechaza stock mínimo decimal', () => {
    const r = productFormSchema.safeParse({
      barcode: 'x',
      name: 'y',
      category: '',
      description: '',
      unitPrice: 0,
      currentStock: 0,
      minStock: 1.5,
    });
    expect(r.success).toBe(false);
  });
});

describe('inviteFormSchema', () => {
  it('acepta worker sin nombre', () => {
    const r = inviteFormSchema.safeParse({
      email: 'ana@tienda.com',
      name: '',
      role: 'worker',
    });
    expect(r.success).toBe(true);
  });
  it('acepta admin con nombre', () => {
    const r = inviteFormSchema.safeParse({
      email: 'juan@tienda.com',
      name: 'Juan Pérez',
      role: 'admin',
    });
    expect(r.success).toBe(true);
  });
  it('rechaza rol custom', () => {
    const r = inviteFormSchema.safeParse({
      email: 'x@y.com',
      name: '',
      role: 'superuser',
    });
    expect(r.success).toBe(false);
  });
  it('rechaza email inválido', () => {
    const r = inviteFormSchema.safeParse({
      email: 'not-email',
      name: '',
      role: 'worker',
    });
    expect(r.success).toBe(false);
  });
});
