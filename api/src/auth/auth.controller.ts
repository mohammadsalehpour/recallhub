import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermissions } from './permissions.decorator';
import { ApiAuthGuard, RecallHubAuth } from './api-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AuthService } from './auth.service';
import {
  AssignPermissionDto,
  AssignRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './dto/admin.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, ForgotPasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { RegisterDto } from './dto/register.dto';

type AuthenticatedRequest = Request & {
  recallhubAuth?: RecallHubAuth;
};

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('auth/forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Get('auth/me')
  @UseGuards(ApiAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(this.requireSubject(request));
  }

  @Patch('auth/profile')
  @UseGuards(ApiAuthGuard)
  updateProfile(@Req() request: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(this.requireSubject(request), dto);
  }

  @Post('auth/change-password')
  @UseGuards(ApiAuthGuard)
  changePassword(@Req() request: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(this.requireSubject(request), dto);
  }

  @Get('admin/users')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('user.read')
  listUsers() {
    return this.authService.listUsers();
  }

  @Patch('admin/users/:id')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('user.manage')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.authService.updateUser(id, dto);
  }

  @Post('admin/users/:id/roles')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('user.manage')
  assignUserRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.authService.assignUserRole(id, dto);
  }

  @Delete('admin/users/:id/roles/:roleId')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('user.manage')
  removeUserRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.authService.removeUserRole(id, roleId);
  }

  @Get('admin/roles')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('role.read')
  listRoles() {
    return this.authService.listRoles();
  }

  @Post('admin/roles')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('role.manage')
  createRole(@Body() dto: CreateRoleDto) {
    return this.authService.createRole(dto);
  }

  @Patch('admin/roles/:id')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('role.manage')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.authService.updateRole(id, dto);
  }

  @Get('admin/permissions')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('role.read')
  listPermissions() {
    return this.authService.listPermissions();
  }

  @Post('admin/roles/:id/permissions')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('role.manage')
  assignRolePermission(@Param('id') id: string, @Body() dto: AssignPermissionDto) {
    return this.authService.assignRolePermission(id, dto);
  }

  @Delete('admin/roles/:id/permissions/:permissionId')
  @UseGuards(ApiAuthGuard, PermissionsGuard)
  @RequirePermissions('role.manage')
  removeRolePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.authService.removeRolePermission(id, permissionId);
  }

  private requireSubject(request: AuthenticatedRequest) {
    return request.recallhubAuth?.subject ?? '';
  }
}
