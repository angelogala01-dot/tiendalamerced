import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'cliente@correo.com' })
  @IsString()
  @MinLength(3, { message: 'Correo demasiado corto' })
  @Matches(/^.+@.+$/, { message: 'El correo debe contener @' })
  email: string;
}
