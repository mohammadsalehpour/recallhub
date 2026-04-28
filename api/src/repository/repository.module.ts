import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RepositoryPathResolverService } from './repository-path-resolver.service';
import { SafeManifestParserService } from './safe-manifest-parser.service';
import { SecretRedactionService } from './secret-redaction.service';

@Module({
  imports: [ConfigModule],
  providers: [
    RepositoryPathResolverService,
    SafeManifestParserService,
    SecretRedactionService,
  ],
  exports: [
    RepositoryPathResolverService,
    SafeManifestParserService,
    SecretRedactionService,
  ],
})
export class RepositoryModule {}
