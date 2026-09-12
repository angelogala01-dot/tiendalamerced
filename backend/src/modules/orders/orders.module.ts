import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [SettingsModule, PromotionsModule, BillingModule, NotificationsModule, MailModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
