jest.mock('../../generated/prisma/client', () => ({
  Prisma: {},
  PrismaClient: class {},
}));

import { WorkflowRunStatus } from '../../generated/prisma/enums';
import { ArtifactValidatorService } from '../../artifacts/artifact-validator.service';
import { N8nCallbackService } from './n8n-callback.service';

describe('N8nCallbackService replay policy', () => {
  it('does not persist artifacts or mutate runs for duplicate callback signatures', async () => {
    const prisma = {
      workflowRun: {
        findUnique: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000000001',
          projectId: '00000000-0000-4000-8000-000000000002',
          workItemId: '00000000-0000-4000-8000-000000000003',
          status: WorkflowRunStatus.running,
          workflowDefinition: { code: 'research.run' },
        }),
        update: jest.fn(),
      },
      n8nCallbackReceipt: {
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
      artifact: {
        create: jest.fn(),
      },
    };
    const service = new N8nCallbackService(
      prisma as never,
      { applyWorkflowOutcome: jest.fn() } as never,
      new ArtifactValidatorService(),
    );

    const result = await service.handleCallback(
      {
        runId: '00000000-0000-4000-8000-000000000001',
        workflowCode: 'research.run',
        status: 'succeeded',
        artifact: {
          type: 'research_findings',
          title: 'Research',
          contentJson: {
            summary: 'ok',
            recommendations: [],
            unknowns: [],
            risks: [],
          },
        },
      },
      { timestamp: '1760000000', signature: 'abc123' },
    );

    expect(result).toMatchObject({
      success: true,
      data: { alreadyProcessed: true, replayed: true },
    });
    expect(prisma.artifact.create).not.toHaveBeenCalled();
    expect(prisma.workflowRun.update).not.toHaveBeenCalled();
  });
});
