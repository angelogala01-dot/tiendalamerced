import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { OpenAiClient } from './openai.client';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService, OpenAiClient],
})
export class ChatbotModule {}
