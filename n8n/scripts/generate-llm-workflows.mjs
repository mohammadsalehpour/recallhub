import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, 'workflows', 'stubs');

const workflows = [
  {
    file: 'task.analyze.json',
    id: 'iTsqtGS07nj9nVQe',
    code: 'task.analyze',
    artifactType: 'research_plan',
    active: true,
    prompt:
      'Analyze the work item intake. Return a research plan with assumptions, unknowns, and next questions. Do not invent project facts.',
    schemaKind: 'researchPlan',
  },
  {
    file: 'research.run.json',
    id: 'SMVvW4YUzTeIZmSq',
    code: 'research.run',
    artifactType: 'research_findings',
    active: true,
    prompt:
      'Synthesize research findings from the provided RecallHub context. If source material is missing, mark the finding unknown instead of guessing.',
    schemaKind: 'researchFindings',
  },
  {
    file: 'document.generate_spec.json',
    id: 'r5znscvOgD2bTtYR',
    code: 'document.generate_spec',
    artifactType: 'development_spec',
    active: true,
    prompt:
      'Generate a development specification that follows the RecallHub DevelopmentSpecArtifact contract exactly.',
    schemaKind: 'developmentSpec',
  },
  {
    file: 'document.review.json',
    id: 'kI1XFxuHkkwjGrIc',
    code: 'document.review',
    artifactType: 'review',
    active: true,
    prompt:
      'Review the provided document/spec for implementation risk, missing context, contradictions, and readiness.',
    schemaKind: 'review',
  },
  {
    file: 'document.finalize.json',
    id: 'x9o1dR3uyG7gQ9kP',
    code: 'document.finalize',
    artifactType: 'final_document',
    active: true,
    prompt:
      'Consolidate the approved material into a final implementation-ready document. Preserve uncertainty explicitly.',
    schemaKind: 'finalDocument',
  },
  {
    file: 'document.revise.json',
    id: 'KfP6m4VN8rZVD1Ga',
    code: 'document.revise',
    artifactType: 'final_document',
    active: false,
    prompt:
      'Revise the document using the provided review feedback. Keep changes traceable and call out unresolved questions.',
    schemaKind: 'finalDocument',
  },
  {
    file: 'implementation.plan.json',
    id: 'PfS6ckOo2ZlB891s',
    code: 'implementation.plan',
    artifactType: 'implementation_plan',
    active: true,
    prompt:
      'Create a practical implementation plan with ordered tasks, dependencies, validation steps, risks, and unknowns.',
    schemaKind: 'implementationPlan',
  },
  {
    file: 'execution.simulate.json',
    id: 'mJrf3Y8K4JwBb3nQ',
    code: 'execution.simulate',
    artifactType: 'validation_report',
    active: true,
    prompt:
      'Simulate execution and validation from the provided plan. Report checks, likely failures, unknowns, and residual risk.',
    schemaKind: 'validationReport',
  },
];

const textArray = { type: 'array', items: { type: 'string' } };

const schemas = {
  developmentSpec: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'contentMarkdown', 'contentJson'],
    properties: {
      title: { type: 'string' },
      contentMarkdown: { type: 'string' },
      contentJson: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'goals', 'scope', 'plan', 'openQuestions', 'risks'],
        properties: {
          summary: { type: 'string' },
          goals: textArray,
          scope: {
            type: 'object',
            additionalProperties: false,
            required: ['in', 'out'],
            properties: {
              in: textArray,
              out: textArray,
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
          openQuestions: textArray,
          risks: textArray,
        },
      },
    },
  },
  researchPlan: genericSchema({
    plan: textArray,
    questions: textArray,
    requiredContext: textArray,
  }),
  researchFindings: genericSchema({
    findings: textArray,
    sources: textArray,
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
  }),
  review: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'contentMarkdown', 'contentJson'],
    properties: {
      title: { type: 'string' },
      contentMarkdown: { type: 'string' },
      contentJson: {
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
          decision: { type: 'string', enum: ['approved', 'changes_requested', 'rejected'] },
          score: { type: 'number', minimum: 0, maximum: 1 },
          notesMd: { type: 'string' },
          blockers: textArray,
          warnings: textArray,
          recommendations: textArray,
          unknowns: textArray,
        },
      },
    },
  },
  finalDocument: genericSchema({
    sections: textArray,
    acceptedChanges: textArray,
    remainingQuestions: textArray,
  }),
  implementationPlan: genericSchema({
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'priority', 'dependencies'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['p0', 'p1', 'p2', 'p3'] },
          dependencies: textArray,
        },
      },
    },
    validationPlan: textArray,
  }),
  validationReport: genericSchema({
    checks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'status', 'notes'],
        properties: {
          name: { type: 'string' },
          status: { type: 'string', enum: ['passed', 'failed', 'unknown', 'not_run'] },
          notes: { type: 'string' },
        },
      },
    },
    residualRisk: textArray,
  }),
};

function genericSchema(extraProperties) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'contentMarkdown', 'contentJson'],
    properties: {
      title: { type: 'string' },
      contentMarkdown: { type: 'string' },
      contentJson: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'recommendations', 'unknowns', 'risks', ...Object.keys(extraProperties)],
        properties: {
          summary: { type: 'string' },
          recommendations: textArray,
          unknowns: textArray,
          risks: textArray,
          ...extraProperties,
        },
      },
    },
  };
}

function buildWorkflow(config) {
  const slug = config.code.replaceAll('.', '-').replaceAll('_', '-');
  const jsCode = buildCode(config);

  return {
    id: config.id,
    name: `RecallHub LLM - ${config.code}`,
    active: config.active,
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: `recallhub/${config.code}`,
          responseMode: 'onReceived',
          options: {},
        },
        id: `${slug}-webhook`,
        name: 'RecallHub Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [240, 300],
        webhookId: `recallhub-${slug}`,
      },
      {
        parameters: { jsCode },
        id: `${slug}-build-callback`,
        name: 'Build LLM Artifact Callback',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [520, 300],
      },
      {
        parameters: {
          method: 'POST',
          url: '={{$json.callbackUrl}}',
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: 'x-recallhub-timestamp', value: '={{$json.callbackTimestamp}}' },
              { name: 'x-recallhub-run-id', value: '={{$json.callbackBody.runId}}' },
              { name: 'x-recallhub-signature', value: '={{$json.callbackSignature}}' },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody: '={{$json.callbackBody}}',
          options: {},
        },
        id: `${slug}-post-callback`,
        name: 'POST RecallHub Callback',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [800, 300],
      },
    ],
    connections: {
      'RecallHub Webhook': {
        main: [[{ node: 'Build LLM Artifact Callback', type: 'main', index: 0 }]],
      },
      'Build LLM Artifact Callback': {
        main: [[{ node: 'POST RecallHub Callback', type: 'main', index: 0 }]],
      },
    },
    settings: { executionOrder: 'v1' },
    tags: [],
  };
}

function buildCode(config) {
  const runtimeConfig = {
    workflowCode: config.code,
    artifactType: config.artifactType,
    prompt: config.prompt,
    schemaName: `recallhub_${config.code.replaceAll('.', '_')}_artifact`,
    responseSchema: schemas[config.schemaKind],
  };

  return String.raw`const crypto = require('crypto');
const config = ${JSON.stringify(runtimeConfig, null, 2)};

const incoming = $input.first().json;
const body = incoming.body && typeof incoming.body === 'object' ? incoming.body : incoming;
const headers = incoming.headers || {};
const runId = body.runId;
const workflowCode = body.workflowCode || config.workflowCode;
const timestamp = String(body.timestamp || Math.floor(Date.now() / 1000));
const triggerSecret = $env.N8N_TRIGGER_SECRET || '';
const headerSignature = headerValue(headers, 'x-recallhub-trigger-signature');
const triggerRaw = JSON.stringify(body);
const expectedTriggerSignature = triggerSecret
  ? crypto.createHmac('sha256', triggerSecret).update(timestamp + '.' + runId + '.' + triggerRaw).digest('hex')
  : '';

let status = 'succeeded';
let error;
let artifact;

try {
  if (!runId) {
    throw recallhubError('MISSING_RUN_ID', 'runId is required');
  }
  if (workflowCode !== config.workflowCode) {
    throw recallhubError('WORKFLOW_CODE_MISMATCH', 'Expected ' + config.workflowCode + ', got ' + workflowCode);
  }
  if (!triggerSecret) {
    throw recallhubError('MISSING_TRIGGER_SECRET', 'N8N_TRIGGER_SECRET is required');
  }
  if (!headerSignature) {
    throw recallhubError('MISSING_TRIGGER_SIGNATURE', 'NestJS trigger signature header is required');
  }
  if (headerSignature !== expectedTriggerSignature) {
    throw recallhubError('INVALID_TRIGGER_SIGNATURE', 'NestJS trigger signature did not match');
  }

  artifact = await buildArtifact(body);
} catch (caught) {
  status = 'failed';
  error = serializeError(caught);
}

const callbackBody = status === 'succeeded'
  ? { runId, workflowCode: config.workflowCode, status, n8nExecutionId: String($execution.id), artifact }
  : { runId, workflowCode: config.workflowCode, status, n8nExecutionId: String($execution.id), error };
const callbackRaw = JSON.stringify(callbackBody);
const callbackTimestamp = String(Math.floor(Date.now() / 1000));
const callbackSecret = $env.N8N_CALLBACK_SECRET || '';
const callbackSignature = crypto.createHmac('sha256', callbackSecret)
  .update(callbackTimestamp + '.' + runId + '.' + callbackRaw)
  .digest('hex');

return [{
  json: {
    callbackUrl: body.callbackUrl || $env.N8N_CALLBACK_URL || 'http://api:3000/api/v1/integrations/n8n/callback',
    callbackBody,
    callbackTimestamp,
    callbackSignature,
  },
}];

async function buildArtifact(triggerBody) {
  const mode = ($env.N8N_LLM_MODE || 'openai').toLowerCase();
  if (mode === 'contract_stub') {
    return contractArtifact(triggerBody);
  }
  if (mode !== 'openai') {
    throw recallhubError('UNSUPPORTED_LLM_MODE', 'Unsupported N8N_LLM_MODE: ' + mode);
  }

  const apiKey = $env.OPENAI_API_KEY || '';
  if (!apiKey) {
    throw recallhubError('MISSING_LLM_API_KEY', 'OPENAI_API_KEY is required when N8N_LLM_MODE=openai');
  }

  const baseUrl = ($env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = $env.N8N_LLM_MODEL || '';
  if (!model) {
    throw recallhubError('MISSING_LLM_MODEL', 'N8N_LLM_MODEL is required when N8N_LLM_MODE=openai');
  }
  const timeoutMs = Number($env.N8N_LLM_TIMEOUT_MS || 60000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(baseUrl + '/responses', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'developer',
            content: [
              {
                type: 'input_text',
                text: developerPrompt(),
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: userPrompt(triggerBody),
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: config.schemaName,
            strict: true,
            schema: config.responseSchema,
          },
        },
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responseJson;
    try {
      responseJson = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw recallhubError('OPENAI_INVALID_JSON', 'OpenAI response was not JSON', { responseText: responseText.slice(0, 1000) });
    }

    if (!response.ok) {
      throw recallhubError('OPENAI_HTTP_ERROR', 'OpenAI request failed with HTTP ' + response.status, responseJson);
    }

    const outputText = extractOutputText(responseJson);
    if (!outputText) {
      throw recallhubError('OPENAI_EMPTY_OUTPUT', 'OpenAI response did not include output text', responseJson);
    }

    let generated;
    try {
      generated = JSON.parse(outputText);
    } catch {
      throw recallhubError('OPENAI_OUTPUT_PARSE_ERROR', 'OpenAI output was not valid JSON', { outputText });
    }

    return normalizeArtifact(generated, 'openai', model);
  } catch (caught) {
    if (caught && caught.name === 'AbortError') {
      throw recallhubError('OPENAI_TIMEOUT', 'OpenAI request timed out after ' + timeoutMs + 'ms');
    }
    throw caught;
  } finally {
    clearTimeout(timeout);
  }
}

function developerPrompt() {
  return [
    'You are RecallHub n8n executor.',
    'n8n is only an automation and LLM executor. It must not persist domain data.',
    'Return one JSON object only. It must match the provided JSON schema exactly.',
    'Do not invent facts. If context is missing, write unknown or needs_user_input in the relevant fields.',
    'Produce artifact content for workflow ' + config.workflowCode + ' and artifact type ' + config.artifactType + '.',
    config.prompt,
  ].join('\n');
}

function userPrompt(triggerBody) {
  return JSON.stringify({
    runId: triggerBody.runId,
    workflowCode: triggerBody.workflowCode,
    input: triggerBody.input || {},
    contextPacket: triggerBody.contextPacket || null,
  }, null, 2);
}

function normalizeArtifact(generated, source, model) {
  if (!generated || typeof generated !== 'object' || Array.isArray(generated)) {
    throw recallhubError('INVALID_LLM_ARTIFACT', 'LLM output must be an object');
  }
  if (!generated.contentJson || typeof generated.contentJson !== 'object' || Array.isArray(generated.contentJson)) {
    throw recallhubError('INVALID_LLM_ARTIFACT', 'LLM output must include object contentJson');
  }

  return {
    type: config.artifactType,
    title: String(generated.title || config.workflowCode + ' artifact'),
    contentMarkdown: String(generated.contentMarkdown || '# ' + config.workflowCode),
    contentJson: generated.contentJson,
  };
}

function contractArtifact(triggerBody) {
  const title = 'Local contract artifact for ' + config.workflowCode;
  if (config.artifactType === 'development_spec') {
    return {
      type: config.artifactType,
      title,
      contentMarkdown: '# Development Spec\n\nLocal contract mode. Set N8N_LLM_MODE=openai and OPENAI_API_KEY for real LLM output.',
      contentJson: {
        summary: 'Local contract mode development spec.',
        goals: ['Verify RecallHub workflow transport and callback handling'],
        scope: {
          in: ['Signed trigger', 'Signed callback', 'Artifact validation'],
          out: ['Real LLM generation'],
        },
        plan: [
          {
            step: 'Configure OPENAI_API_KEY',
            why: 'Real LLM mode requires provider credentials',
            expectedOutcome: 'n8n generates this artifact through the OpenAI Responses API',
          },
        ],
        openQuestions: [],
        risks: ['Local contract mode is not production LLM output'],
      },
    };
  }
  if (config.artifactType === 'review') {
    return {
      type: config.artifactType,
      title,
      contentMarkdown: '# Document Review\n\nLocal contract mode. Set N8N_LLM_MODE=openai and OPENAI_API_KEY for real LLM output.',
      contentJson: {
        summary: 'Local contract mode review artifact.',
        reviewerRole: 'n8n-local-contract',
        decision: 'changes_requested',
        score: 0.5,
        notesMd: 'Local contract mode does not perform a real review.',
        blockers: [],
        warnings: ['Local contract mode is not production LLM output'],
        recommendations: ['Configure OPENAI_API_KEY before production use'],
        unknowns: [],
      },
    };
  }

  return {
    type: config.artifactType,
    title,
    contentMarkdown: '# ' + config.workflowCode + '\n\nLocal contract mode. Set N8N_LLM_MODE=openai and OPENAI_API_KEY for real LLM output.',
    contentJson: {
      summary: 'Local contract mode artifact.',
      recommendations: ['Configure OPENAI_API_KEY before production use'],
      unknowns: [],
      risks: ['Local contract mode is not production LLM output'],
      receivedInput: triggerBody.input || {},
    },
  };
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === 'string') {
    return responseJson.output_text.trim();
  }

  const texts = [];
  for (const item of responseJson.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') {
        texts.push(content.text);
      }
    }
  }

  return texts.join('\n').trim();
}

function headerValue(headers, name) {
  const direct = headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
  if (direct) return Array.isArray(direct) ? direct[0] : direct;

  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  if (!found) return undefined;
  return Array.isArray(found[1]) ? found[1][0] : found[1];
}

function recallhubError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function serializeError(caught) {
  return {
    code: caught && caught.code ? String(caught.code) : 'N8N_LLM_WORKFLOW_ERROR',
    message: caught && caught.message ? String(caught.message) : 'Unknown n8n LLM workflow error',
    details: caught && caught.details ? caught.details : undefined,
  };
}`;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const workflow of workflows) {
  const outPath = join(OUT_DIR, workflow.file);
  writeFileSync(outPath, `${JSON.stringify(buildWorkflow(workflow), null, 2)}\n`);
  console.log(`generated ${outPath}`);
}
