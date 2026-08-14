import { z } from 'zod';

const SKU_REGEX = /^[A-Z0-9]{2,6}-\d{4}-[A-Z0-9]{2,6}$/;

export const productFormSchema = z
  .object({
    sku: z
      .string()
      .min(1, 'El SKU es obligatorio')
      .transform((v) => v.trim().toUpperCase())
      .refine((v) => SKU_REGEX.test(v), {
        message: 'Formato inválido. Use CAT-0001-MARC (categoría-secuencia-marca)',
      }),
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
    slug: z.string().optional(),
    description: z.string().optional(),
    category_id: z.string().uuid('Seleccione una categoría válida'),
    brand_id: z.string().uuid('Seleccione una marca válida'),
    cost_price: z.coerce.number().min(0, 'El precio de costo no puede ser negativo'),
    sale_price: z.coerce
      .number()
      .min(0.01, 'El precio de venta debe ser mayor a 0'),
    stock_quantity: z.coerce
      .number()
      .int('El stock debe ser un número entero')
      .min(0, 'El stock no puede ser negativo'),
    min_stock: z.coerce
      .number()
      .int('El stock mínimo debe ser un número entero')
      .min(0, 'El stock mínimo no puede ser negativo'),
    is_active: z.boolean().optional(),
  })
  .refine((data) => data.sale_price >= data.cost_price, {
    message: 'El precio de venta no puede ser menor al precio de costo',
    path: ['sale_price'],
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'Formato no permitido. Use JPG, PNG o WEBP.';
  }
  return null;
}
