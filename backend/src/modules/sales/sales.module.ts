import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [BillingModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
