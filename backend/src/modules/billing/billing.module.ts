import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { NubefactClient } from './nubefact.client';
import { DecolectaClient } from './decolecta.client';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';

@Module({
  controllers: [BillingController, IdentityController],
  providers: [BillingService, NubefactClient, DecolectaClient, IdentityService],
  exports: [BillingService, IdentityService],
})
export class BillingModule {}
