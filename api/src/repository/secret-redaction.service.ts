import { Injectable } from '@nestjs/common';

const SECRET_PATTERNS = [
  /(password\s*[:=]\s*)[^\s"']+/gi,
  /(passwd\s*[:=]\s*)[^\s"']+/gi,
  /(secret\s*[:=]\s*)[^\s"']+/gi,
  /(api[_-]?key\s*[:=]\s*)[^\s"']+/gi,
  /(token\s*[:=]\s*)[^\s"']+/gi,
  /(authorization\s*[:=]\s*)[^\n]+/gi,
];

@Injectable()
export class SecretRedactionService {
  redact(content: string): string {
    return SECRET_PATTERNS.reduce(
      (redacted, pattern) => redacted.replace(pattern, '$1[REDACTED]'),
      content,
    );
  }

  looksSensitivePath(relativePath: string): boolean {
    const normalized = relativePath.toLowerCase();
    return (
      normalized.endsWith('.env') ||
      normalized.includes('/.env') ||
      normalized.endsWith('.pem') ||
      normalized.endsWith('.key') ||
      normalized.includes('credential') ||
      normalized.includes('secret')
    );
  }
}
