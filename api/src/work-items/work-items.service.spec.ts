import { BadRequestException } from '@nestjs/common';
import { ProjectStatus, WorkItemStatus } from '../generated/prisma/enums';

jest.mock('../generated/prisma/client', () => ({
  Prisma: {},
  PrismaClient: class {},
}));

import { WorkItemsService } from './work-items.service';

describe('WorkItemsService approval policy', () => {
  const workItem = {
    id: '00000000-0000-0000-0000-000000000001',
    projectId: '00000000-0000-0000-0000-000000000002',
    status: WorkItemStatus.needs_human_approval,
    riskLevel: 'medium',
    openQuestionsJson: [],
    metadataJson: {},
    project: {
      status: ProjectStatus.indexed,
      techStack: [],
      repositories: [],
      paths: [],
      configFiles: [],
    },
  };

  it('requires a final_document artifact before implementation approval', async () => {
    const service = new WorkItemsService(
      {
        workItem: {
          findUnique: jest.fn().mockResolvedValue(workItem),
        },
        artifact: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.submitHumanApproval(workItem.id, { decision: 'approve' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires waiver when open questions remain', async () => {
    const service = new WorkItemsService(
      {
        workItem: {
          findUnique: jest.fn().mockResolvedValue({
            ...workItem,
            openQuestionsJson: ['Which module owns this change?'],
          }),
        },
      } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.submitHumanApproval(workItem.id, { decision: 'approve' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'OPEN_QUESTIONS_REQUIRE_WAIVER',
      }),
    });
  });

  it('requires waiver when final document still has unknowns', async () => {
    const service = new WorkItemsService(
      {
        workItem: {
          findUnique: jest.fn().mockResolvedValue(workItem),
        },
        artifact: {
          findFirst: jest.fn().mockResolvedValue({
            id: '00000000-0000-0000-0000-000000000003',
            contentJson: {
              unknowns: ['Deployment branch policy is not specified'],
            },
          }),
        },
      } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.submitHumanApproval(workItem.id, { decision: 'approve' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'OPEN_QUESTIONS_REQUIRE_WAIVER',
      }),
    });
  });
});
