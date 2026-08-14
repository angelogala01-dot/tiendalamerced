import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeliverOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(400)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photo_url?: string;
}
