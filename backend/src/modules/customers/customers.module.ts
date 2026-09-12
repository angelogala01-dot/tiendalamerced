import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [MailModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
