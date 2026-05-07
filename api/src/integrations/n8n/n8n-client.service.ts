import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

type WorkflowDefinitionLike = {
  code: string;
  n8nPath?: string | null;
};

type WorkflowRunLike = {
  id: string;
  inputJson?: unknown;
};

@Injectable()
export class N8nClientService {
  constructor(private readonly configService: ConfigService) {}

  async triggerWorkflow(
    definition: WorkflowDefinitionLike,
    run: WorkflowRunLike,
  ) {
    if (!definition.n8nPath) {
      throw new Error(`Workflow ${definition.code} has no n8nPath`);
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = {
      runId: run.id,
      workflowCode: definition.code,
      callbackUrl: this.configService.getOrThrow<string>('N8N_CALLBACK_URL'),
      timestamp,
      input: run.inputJson ?? {},
      contextPacket: this.contextPacketFromInput(run.inputJson),
    };
    const rawBody = JSON.stringify(body);
    const signature = createHmac(
      'sha256',
      this.configService.getOrThrow<string>('N8N_TRIGGER_SECRET'),
    )
      .update(`${timestamp}.${run.id}.${rawBody}`)
      .digest('hex');

    const response = await fetch(this.webhookUrl(definition.n8nPath), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-recallhub-timestamp': timestamp,
        'x-recallhub-run-id': run.id,
        'x-recallhub-workflow-code': definition.code,
        'x-recallhub-trigger-signature': signature,
      },
      body: rawBody,
    });

    if (!response.ok) {
      throw new Error(
        `n8n trigger failed with HTTP ${response.status}: ${await response.text()}`,
      );
    }

    return {
      statusCode: response.status,
      responseText: await response.text(),
    };
  }

  private webhookUrl(n8nPath: string): string {
    const base = this.configService
      .getOrThrow<string>('N8N_INTERNAL_BASE_URL')
      .replace(/\/+$/, '');
    const path = n8nPath.replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  private contextPacketFromInput(input: unknown): unknown {
    if (!input || typeof input !== 'object') {
      return undefined;
    }

    return (input as { contextPacket?: unknown }).contextPacket;
  }
}
