import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsPeruPhone, IsPeruTaxId, toDigitsOrUndefined } from '../../../shared/validators/peru';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  contact_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @Transform(emptyToUndefined)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toDigitsOrUndefined)
  @IsPeruPhone()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toDigitsOrUndefined)
  @IsPeruTaxId()
  tax_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(emptyToUndefined)
  notes?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
