import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiAuthGuard } from './api-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ApiAuthGuard, PermissionsGuard, RolesGuard],
  exports: [ApiAuthGuard, PermissionsGuard, RolesGuard],
})
export class AuthModule {}
