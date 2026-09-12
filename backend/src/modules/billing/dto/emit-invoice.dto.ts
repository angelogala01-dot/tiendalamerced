import { Type, Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPeruDocument, toDigitsOrUndefined } from '../../../shared/validators/peru';

export class EmitInvoiceDto {
  @ApiPropertyOptional({ enum: ['boleta', 'factura'] })
  @IsOptional()
  @IsEnum(['boleta', 'factura'])
  kind?: 'boleta' | 'factura';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  order_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sale_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toDigitsOrUndefined)
  @IsPeruDocument()
  document_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legal_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @ValidateIf((_, v) => Boolean(v))
  @Type(() => String)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}
