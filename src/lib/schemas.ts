import { z } from 'zod';
import { NextResponse } from 'next/server';

export const periodSchema = z.enum(['today', '7d', '30d', '90d']);
export type Period = z.infer<typeof periodSchema>;

export const createProductSchema = z.object({
  barcode: z.string().trim().min(1, 'Código requerido').max(50),
  name: z.string().trim().min(1, 'Nombre requerido').max(200),
  description: z.string().max(500).optional().default(''),
  category: z.string().max(100).optional().default('General'),
  unit_price: z.number().nonnegative().default(0),
  current_stock: z.number().int().nonnegative().default(0),
  min_stock: z.number().int().nonnegative().default(0),
});

export const updateProductSchema = z.object({
  barcode: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  unit_price: z.number().nonnegative().optional(),
  min_stock: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export const voidSaleSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const createSaleSchema = z.object({
  barcode: z.string().trim().min(1, 'Código requerido'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a cero'),
  discount: z.number().nonnegative().default(0),
  channel: z.string().trim().min(1).max(50).default('Mostrador'),
  // Para alta al vuelo cuando el barcode no está registrado.
  name: z.string().trim().min(1).max(200).optional(),
});

export const movementTypeSchema = z.enum(['entry', 'exit', 'adjustment']);
export const adjustmentDirectionSchema = z.enum(['increase', 'decrease']);

export const userRoleSchema = z.enum(['admin', 'worker']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const inviteUserSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  name: z.string().trim().min(1, 'Nombre requerido').max(200).optional(),
  role: userRoleSchema.default('worker'),
});

export const updateUserSchema = z.object({
  role: userRoleSchema.optional(),
  active: z.boolean().optional(),
});

export const createMovementSchema = z
  .object({
    // Identificamos al producto por barcode (el cliente lo conoce desde el combobox).
    // Para alta al vuelo cuando el barcode no está registrado, se acepta `name`.
    barcode: z.string().trim().min(1, 'Código requerido'),
    name: z.string().trim().min(1).max(200).optional(),
    type: movementTypeSchema,
    quantity: z.number().int().positive('La cantidad debe ser mayor a cero'),
    reason: z.string().max(500).optional().default(''),
    adjustment_direction: adjustmentDirectionSchema.nullable().optional(),
  })
  .refine(
    (data) => data.type !== 'adjustment' || data.adjustment_direction != null,
    {
      message: 'adjustment_direction es obligatorio cuando el tipo es adjustment',
      path: ['adjustment_direction'],
    },
  );

type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'JSON inválido' }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Datos inválidos',
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function parsePeriod(request: Request, fallback: Period = '7d'): Period {
  const url = new URL(request.url);
  const raw = url.searchParams.get('period');
  const result = periodSchema.safeParse(raw);
  return result.success ? result.data : fallback;
}
