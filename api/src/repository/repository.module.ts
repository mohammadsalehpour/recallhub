import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RepositoryPathResolverService } from './repository-path-resolver.service';

@Module({
  imports: [ConfigModule],
  providers: [RepositoryPathResolverService],
  exports: [RepositoryPathResolverService],
})
export class RepositoryModule {}
