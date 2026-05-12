import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiAuthGuard } from './api-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionsGuard } from './permissions.guard';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [ConfigModule, JwtModule.register({ global: true }), PrismaModule],
  controllers: [AuthController],
  providers: [ApiAuthGuard, AuthService, PasswordService, PermissionsGuard, RolesGuard],
  exports: [ApiAuthGuard, AuthService, JwtModule, PermissionsGuard, RolesGuard],
})
export class AuthModule {}
