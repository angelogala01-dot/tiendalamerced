import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PromotionsModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
