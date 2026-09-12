import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsPeruDocument, IsPeruPhone, toDigitsOrUndefined } from '../../../shared/validators/peru';

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  full_name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toDigitsOrUndefined)
  @IsPeruPhone()
  phone?: string;

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
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
