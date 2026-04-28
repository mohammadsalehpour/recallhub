import { Injectable } from '@nestjs/common';
import { spawnSync } from 'node:child_process';

type ManifestParseResult = {
  manifest?: Record<string, unknown>;
  warning?: string;
};

@Injectable()
export class SafeManifestParserService {
  parseOdooManifest(content: string): ManifestParseResult {
    const result = spawnSync(
      'python3',
      [
        '-c',
        [
          'import ast, json, sys',
          'text = sys.stdin.read()',
          'try:',
          '    node = ast.parse(text, mode="eval")',
          '    value = ast.literal_eval(node.body)',
          '    if not isinstance(value, dict):',
          '        raise ValueError("manifest root must be dict")',
          '    print(json.dumps(value, ensure_ascii=False))',
          'except Exception as exc:',
          '    print(str(exc), file=sys.stderr)',
          '    sys.exit(2)',
        ].join('\n'),
      ],
      {
        input: content,
        encoding: 'utf8',
        timeout: 1000,
        maxBuffer: 1024 * 1024,
      },
    );

    if (result.status !== 0) {
      return {
        warning:
          result.stderr?.trim() ||
          result.error?.message ||
          'manifest parse failed',
      };
    }

    try {
      return { manifest: JSON.parse(result.stdout) as Record<string, unknown> };
    } catch {
      return { warning: 'manifest parser returned invalid JSON' };
    }
  }
}
