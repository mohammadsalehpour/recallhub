import { BadRequestException } from '@nestjs/common';
import { WorkflowExecutor } from '../generated/prisma/enums';

jest.mock('../generated/prisma/client', () => ({
  Prisma: {},
  PrismaClient: class {},
}));

import { WorkflowsService } from './workflows.service';

describe('WorkflowsService policy', () => {
  it('rejects direct lifecycle workflow runs so WorkItem policy cannot be bypassed', async () => {
    const service = new WorkflowsService(
      {
        workflowDefinition: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'workflow-definition-id',
            code: 'research.run',
            active: true,
            executor: WorkflowExecutor.n8n,
          }),
        },
      } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createRun('research.run', {
        workItemId: '00000000-0000-0000-0000-000000000001',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
