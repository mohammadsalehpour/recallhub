import { BadRequestException, Injectable } from '@nestjs/common';
import Ajv2020, { ErrorObject, ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import {
  CALLBACK_ENVELOPE_SCHEMA,
  DEVELOPMENT_SPEC_ARTIFACT_SCHEMA,
  GENERIC_STRUCTURED_ARTIFACT_SCHEMA,
  PROJECT_SCAN_ARTIFACT_SCHEMA,
  REVIEW_ARTIFACT_SCHEMA,
} from './artifact-contracts';

type CallbackArtifact = {
  type: string;
  contentJson?: unknown;
};

type CallbackEnvelope = {
  status: string;
  artifact?: CallbackArtifact;
};

@Injectable()
export class ArtifactValidatorService {
  private readonly callbackEnvelopeValidator: ValidateFunction;
  private readonly artifactValidators: Record<string, ValidateFunction>;

  constructor() {
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      strictRequired: false,
    });
    addFormats(ajv);

    this.callbackEnvelopeValidator = ajv.compile(CALLBACK_ENVELOPE_SCHEMA);
    this.artifactValidators = {
      development_spec: ajv.compile(DEVELOPMENT_SPEC_ARTIFACT_SCHEMA),
      scan_result: ajv.compile(PROJECT_SCAN_ARTIFACT_SCHEMA),
      review: ajv.compile(REVIEW_ARTIFACT_SCHEMA),
      research_plan: ajv.compile(GENERIC_STRUCTURED_ARTIFACT_SCHEMA),
      research_findings: ajv.compile(GENERIC_STRUCTURED_ARTIFACT_SCHEMA),
      final_document: ajv.compile(GENERIC_STRUCTURED_ARTIFACT_SCHEMA),
      implementation_plan: ajv.compile(GENERIC_STRUCTURED_ARTIFACT_SCHEMA),
      validation_report: ajv.compile(GENERIC_STRUCTURED_ARTIFACT_SCHEMA),
      handover: ajv.compile(GENERIC_STRUCTURED_ARTIFACT_SCHEMA),
    };
  }

  validateCallbackEnvelope(envelope: unknown) {
    if (!this.callbackEnvelopeValidator(envelope)) {
      throw new BadRequestException({
        code: 'INVALID_N8N_CALLBACK_ENVELOPE',
        errors: this.formatErrors(this.callbackEnvelopeValidator.errors),
      });
    }

    const typed = envelope as CallbackEnvelope;
    if (typed.status === 'succeeded' && typed.artifact) {
      this.validateArtifactContent(typed.artifact);
    }
  }

  private validateArtifactContent(artifact: CallbackArtifact) {
    const validator = this.artifactValidators[artifact.type];
    if (!validator) {
      return;
    }

    if (!validator(artifact.contentJson)) {
      throw new BadRequestException({
        code: 'INVALID_N8N_ARTIFACT',
        artifactType: artifact.type,
        errors: this.formatErrors(validator.errors),
      });
    }
  }

  private formatErrors(errors: ErrorObject[] | null | undefined) {
    return (errors ?? []).map((error) => ({
      instancePath: error.instancePath,
      schemaPath: error.schemaPath,
      keyword: error.keyword,
      message: error.message,
      params: error.params,
    }));
  }
}
