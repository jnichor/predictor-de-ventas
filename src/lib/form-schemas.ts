import { z } from 'zod';

// =============================================================================
// Form schemas — usados por los formularios del cliente con react-hook-form + zod.
// Estos validan la entrada del usuario ANTES de enviarla al server.
// Los servidores validan con sus propios schemas en src/lib/schemas.ts.
// Tener ambos es defense-in-depth intencional: no confiamos en el cliente.
// =============================================================================

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, 'Ingresá tu correo').email('Correo inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const saleFormSchema = z.object({
  barcode: z.string().trim().min(1, 'Falta el código de barras'),
  quantity: z.coerce
    .number({ error: 'Cantidad inválida' })
    .int('Debe ser un entero')
    .positive('La cantidad debe ser mayor a cero'),
  discount: z.coerce
    .number({ error: 'Descuento inválido' })
    .nonnegative('El descuento no puede ser negativo')
    .default(0),
  channel: z.enum(['Mostrador', 'Delivery', 'Online']),
});
export type SaleFormValues = z.infer<typeof saleFormSchema>;

export const movementFormSchema = z
  .object({
    barcodeOrName: z.string().trim().min(1, 'Falta el código o nombre del producto'),
    type: z.enum(['entry', 'exit', 'adjustment']),
    quantity: z.coerce
      .number({ error: 'Cantidad inválida' })
      .int('Debe ser un entero')
      .positive('La cantidad debe ser mayor a cero'),
    reason: z.string().max(500, 'Motivo demasiado largo').optional().default(''),
    adjustmentDirection: z.enum(['increase', 'decrease']).default('increase'),
  })
  .refine(
    (data) => data.type !== 'adjustment' || !!data.adjustmentDirection,
    {
      message: 'Elegí la dirección del ajuste',
      path: ['adjustmentDirection'],
    },
  );
export type MovementFormValues = z.infer<typeof movementFormSchema>;

export const productFormSchema = z.object({
  barcode: z.string().trim().min(1, 'Falta el código de barras').max(50),
  name: z.string().trim().min(1, 'Falta el nombre').max(200),
  category: z.string().trim().max(100).optional().default(''),
  description: z.string().max(500, 'Descripción demasiado larga').optional().default(''),
  unitPrice: z.coerce
    .number({ error: 'Precio inválido' })
    .nonnegative('El precio no puede ser negativo')
    .default(0),
  currentStock: z.coerce
    .number({ error: 'Stock inválido' })
    .int('Debe ser un entero')
    .nonnegative('El stock no puede ser negativo')
    .default(0),
  minStock: z.coerce
    .number({ error: 'Stock mínimo inválido' })
    .int('Debe ser un entero')
    .nonnegative('El stock mínimo no puede ser negativo')
    .default(0),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;

export const inviteFormSchema = z.object({
  email: z.string().trim().min(1, 'Ingresá el email').email('Email inválido'),
  name: z.string().trim().max(200).optional().default(''),
  role: z.enum(['admin', 'worker']),
});
export type InviteFormValues = z.infer<typeof inviteFormSchema>;
