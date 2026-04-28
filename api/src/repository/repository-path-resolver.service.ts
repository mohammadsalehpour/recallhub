import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';

@Injectable()
export class RepositoryPathResolverService {
  private readonly allowedRoots: string[];

  constructor(configService: ConfigService) {
    this.allowedRoots = configService
      .getOrThrow<string>('ALLOWED_REPO_ROOTS')
      .split(',')
      .map((root) => root.trim())
      .filter(Boolean)
      .map((root) => resolve(root));
  }

  resolveUserPath(repoRoot: string): string {
    if (!repoRoot?.trim()) {
      throw new BadRequestException('repo_root is required');
    }

    if (!isAbsolute(repoRoot)) {
      throw new BadRequestException(
        'repo_root must be an absolute execution path',
      );
    }

    const normalized = resolve(repoRoot);

    if (!this.isInsideAllowedRoots(normalized)) {
      throw new BadRequestException({
        code: 'REPO_ROOT_NOT_ALLOWED',
        message: 'Repository root is outside configured allowed roots.',
        details: {
          repo_root: repoRoot,
          allowed_roots: this.allowedRoots,
        },
      });
    }

    return this.realpathOrParentChecked(normalized);
  }

  private realpathOrParentChecked(normalized: string): string {
    try {
      const real = realpathSync(normalized);

      if (!this.isInsideAllowedRoots(real)) {
        throw new BadRequestException({
          code: 'REPO_ROOT_SYMLINK_ESCAPE',
          message: 'Repository root resolves outside configured allowed roots.',
        });
      }

      return real;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const parent = resolve(dirname(normalized));
      if (!this.isInsideAllowedRoots(parent)) {
        throw new BadRequestException(
          'Repository parent is outside allowed roots',
        );
      }

      return normalized;
    }
  }

  private isInsideAllowedRoots(path: string): boolean {
    return this.allowedRoots.some((root) => {
      const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`;
      return path === root || path.startsWith(rootWithSep);
    });
  }
}
