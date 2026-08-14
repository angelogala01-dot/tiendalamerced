import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuth } from '../../common/decorators/staff-auth.decorator';
import { ChatbotService } from './chatbot.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly service: ChatbotService) {}

  @Post('chat')
  chat(@Body() body: ChatDto) {
    const sessionId = body.sessionId?.trim() || crypto.randomUUID();
    return this.service.chat(body.message, sessionId);
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
