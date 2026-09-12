import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuth } from '../../common/decorators/staff-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalSupabaseAuthGuard } from '../../common/guards/optional-supabase-auth.guard';
import { ChatbotService } from './chatbot.service';
import { ChatDto } from './dto/chat.dto';
import type { User } from '@supabase/supabase-js';

@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly service: ChatbotService) {}

  @Post('chat')
  @UseGuards(OptionalSupabaseAuthGuard)
  chat(@Body() body: ChatDto, @CurrentUser() user?: User) {
    const sessionId = body.sessionId?.trim() || crypto.randomUUID();
    return this.service.chat(body.message, sessionId, user?.id);
  }

  @Get('faq')
  getFaq() {
    return this.service.getFaq();
  }

  @Get('faq/admin')
  @AdminAuth()
  getFaqAdmin() {
    return this.service.findAllFaqAdmin();
  }

  @Post('faq')
  @AdminAuth()
  createFaq(@Body() body: { question: string; answer: string; category?: string; keywords?: string[] }) {
    return this.service.createFaq(body);
  }

  @Patch('faq/:id')
  @AdminAuth()
  updateFaq(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateFaq(id, body);
  }

  @Delete('faq/:id')
  @AdminAuth()
  deleteFaq(@Param('id') id: string) {
    return this.service.deleteFaq(id);
  }
}
