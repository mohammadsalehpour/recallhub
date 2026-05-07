import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { N8nCallbackDto } from './dto/n8n-callback.dto';
import { N8nCallbackService } from './n8n-callback.service';
import { N8nSignatureGuard } from './n8n-signature.guard';

@Controller('integrations/n8n')
export class N8nCallbackController {
  constructor(private readonly callbackService: N8nCallbackService) {}

  @Get('health')
  health() {
    return { name: 'RecallHub n8n integration', status: 'ok' };
  }

  @Post('callback')
  @UseGuards(N8nSignatureGuard)
  callback(
    @Body() dto: N8nCallbackDto,
    @Headers('x-recallhub-timestamp') timestamp: string,
    @Headers('x-recallhub-signature') signature: string,
  ) {
    return this.callbackService.handleCallback(dto, { timestamp, signature });
  }

  @Post('execution-update')
  @UseGuards(N8nSignatureGuard)
  executionUpdate(
    @Body() dto: N8nCallbackDto,
    @Headers('x-recallhub-timestamp') timestamp: string,
    @Headers('x-recallhub-signature') signature: string,
  ) {
    return this.callbackService.handleCallback(dto, { timestamp, signature });
  }
}
