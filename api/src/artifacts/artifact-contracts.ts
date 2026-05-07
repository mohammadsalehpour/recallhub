export const CALLBACK_ENVELOPE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://recallhub.dev/contracts/n8n/callback-envelope.schema.json',
  title: 'RecallHub n8n Callback Envelope',
  type: 'object',
  additionalProperties: false,
  required: ['runId', 'workflowCode', 'status'],
  properties: {
    runId: { type: 'string', format: 'uuid' },
    workflowCode: {
      type: 'string',
      enum: [
        'project.scan',
        'task.analyze',
        'research.run',
        'document.generate_spec',
        'document.review',
        'document.finalize',
        'document.revise',
        'implementation.plan',
        'execution.simulate',
      ],
    },
    status: { type: 'string', enum: ['succeeded', 'failed'] },
    n8nExecutionId: { type: 'string', minLength: 1 },
    artifact: {
      type: 'object',
      additionalProperties: false,
      required: ['type'],
      properties: {
        type: {
          type: 'string',
          enum: [
            'scan_result',
            'research_plan',
            'research_findings',
            'development_spec',
            'review',
            'final_document',
            'implementation_plan',
            'validation_report',
            'handover',
          ],
        },
        title: { type: 'string' },
        contentMarkdown: { type: 'string' },
        contentJson: { type: 'object' },
      },
    },
    error: {
      type: 'object',
      additionalProperties: true,
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: {},
      },
    },
  },
  allOf: [
    {
      if: {
        properties: { status: { const: 'succeeded' } },
        required: ['status'],
      },
      then: { required: ['artifact'] },
    },
    {
      if: { properties: { status: { const: 'failed' } }, required: ['status'] },
      then: { required: ['error'] },
    },
  ],
} as const;

export const DEVELOPMENT_SPEC_ARTIFACT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://recallhub.dev/contracts/n8n/development-spec-artifact.schema.json',
  title: 'DevelopmentSpecArtifact',
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'goals', 'scope', 'plan', 'openQuestions'],
  properties: {
    summary: { type: 'string' },
    goals: { type: 'array', items: { type: 'string' } },
    scope: {
      type: 'object',
      additionalProperties: false,
      required: ['in', 'out'],
      properties: {
        in: { type: 'array', items: { type: 'string' } },
        out: { type: 'array', items: { type: 'string' } },
      },
    },
    plan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['step', 'why', 'expectedOutcome'],
        properties: {
          step: { type: 'string' },
          why: { type: 'string' },
          expectedOutcome: { type: 'string' },
        },
      },
    },
    openQuestions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const PROJECT_SCAN_ARTIFACT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://recallhub.dev/contracts/n8n/project-scan-artifact.schema.json',
  title: 'ProjectScanArtifact',
  type: 'object',
  additionalProperties: false,
  required: ['repository', 'modules', 'files'],
  properties: {
    repository: {
      type: 'object',
      additionalProperties: false,
      required: ['repoRoot'],
      properties: {
        repoRoot: { type: 'string' },
        branch: { type: 'string' },
        commitSha: { type: 'string' },
      },
    },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['moduleName', 'modulePath', 'moduleType'],
        properties: {
          moduleName: { type: 'string' },
          modulePath: { type: 'string' },
          moduleType: { type: 'string' },
          depends: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    files: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['filePath', 'contentHash'],
        properties: {
          filePath: { type: 'string' },
          contentHash: { type: 'string' },
          fileKind: { type: 'string' },
          containsSecrets: { type: 'boolean' },
        },
      },
    },
  },
} as const;

const TEXT_ARRAY_SCHEMA = { type: 'array', items: { type: 'string' } } as const;

export const REVIEW_ARTIFACT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://recallhub.dev/contracts/n8n/review-artifact.schema.json',
  title: 'ReviewArtifact',
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'reviewerRole',
    'decision',
    'score',
    'notesMd',
    'blockers',
    'warnings',
    'recommendations',
    'unknowns',
  ],
  properties: {
    summary: { type: 'string' },
    reviewerRole: { type: 'string' },
    decision: {
      type: 'string',
      enum: ['approved', 'changes_requested', 'rejected'],
    },
    score: { type: 'number', minimum: 0, maximum: 1 },
    notesMd: { type: 'string' },
    blockers: TEXT_ARRAY_SCHEMA,
    warnings: TEXT_ARRAY_SCHEMA,
    recommendations: TEXT_ARRAY_SCHEMA,
    unknowns: TEXT_ARRAY_SCHEMA,
  },
} as const;

export const GENERIC_STRUCTURED_ARTIFACT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://recallhub.dev/contracts/n8n/generic-structured-artifact.schema.json',
  title: 'GenericStructuredArtifact',
  type: 'object',
  additionalProperties: true,
  required: ['summary', 'recommendations', 'unknowns', 'risks'],
  properties: {
    summary: { type: 'string' },
    recommendations: TEXT_ARRAY_SCHEMA,
    unknowns: TEXT_ARRAY_SCHEMA,
    risks: TEXT_ARRAY_SCHEMA,
  },
} as const;
