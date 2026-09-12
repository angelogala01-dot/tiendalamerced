import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsPeruDocument, toDigitsOrUndefined } from '../../../shared/validators/peru';

export class OrderItemDto {
  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsEnum(['cash', 'card', 'transfer', 'yape', 'plin'])
  payment_method?: 'cash' | 'card' | 'transfer' | 'yape' | 'plin';

  @IsOptional()
  @IsEnum(['delivery', 'pickup'])
  fulfillment_method?: 'delivery' | 'pickup';

  @IsOptional()
  @IsString()
  shipping_address?: string;

  @IsOptional()
  @IsString()
  shipping_city?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['boleta', 'factura'])
  voucher_type?: 'boleta' | 'factura';

  @IsOptional()
  @IsString()
  document_type?: string;

  @IsOptional()
  @Transform(toDigitsOrUndefined)
  @IsPeruDocument()
  document_number?: string;

  @IsOptional()
  @IsString()
  legal_name?: string;
}
