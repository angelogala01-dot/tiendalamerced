import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOrderDto } from './create-order.dto';

describe('CreateOrderDto', () => {
  it('rechaza pedidos sin items', async () => {
    const dto = plainToInstance(CreateOrderDto, { items: [] });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('acepta pedido válido', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      items: [{ product_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }],
      payment_method: 'yape',
      fulfillment_method: 'pickup',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('acepta boleta y datos de documento', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      items: [{ product_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
      payment_method: 'yape',
      voucher_type: 'boleta',
      document_type: 'DNI',
      document_number: '12345678',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  it('rechaza DNI que no tenga 8 dígitos', async () => {
    const dto = plainToInstance(CreateOrderDto, {
      items: [{ product_id: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
      payment_method: 'yape',
      voucher_type: 'boleta',
      document_type: 'DNI',
      document_number: '1234567',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'document_number')).toBe(true);
  });
});
