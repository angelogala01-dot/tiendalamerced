import { Module } from '@nestjs/common';
import { OptionalSupabaseAuthGuard } from '../../common/guards/optional-supabase-auth.guard';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { OpenAiClient } from './openai.client';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, OpenAiClient, OptionalSupabaseAuthGuard],
})
export class ChatbotModule {}
