import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(800)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sessionId?: string;
}
