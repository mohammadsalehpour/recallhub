import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AssignPermissionDto, AssignRoleDto, CreateRoleDto, UpdateRoleDto, UpdateUserDto } from './dto/admin.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, ForgotPasswordDto, UpdateProfileDto } from './dto/profile.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';

type PermissionView = {
  id: string;
  code: string;
  description: string | null;
};

type RoleView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: PermissionView[];
};

type UserWithRoles = {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: {
    role: {
      id: string;
      code: string;
      name: string;
      description: string | null;
      rolePermissions: {
        permission: PermissionView;
      }[];
    };
  }[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.password_confirmation) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: this.normalizeEmail(dto.email) },
          { username: this.normalizeUsername(dto.username) },
          { mobile: this.normalizeMobile(dto.mobile) },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A user with this email, username, or mobile already exists');
    }

    const userCount = await this.prisma.user.count();
    const initialRoleCode = userCount === 0 ? 'admin' : 'viewer';
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { code: initialRoleCode },
      select: { id: true },
    });

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.first_name.trim(),
        lastName: dto.last_name.trim(),
        mobile: this.normalizeMobile(dto.mobile),
        username: this.normalizeUsername(dto.username),
        email: this.normalizeEmail(dto.email),
        passwordHash: this.passwordService.hash(dto.password),
        roles: {
          create: [{ roleId: role.id }],
        },
      },
      include: this.userInclude(),
    });

    return this.authResponse(user, false);
  }

  async login(dto: LoginDto) {
    const user = await this.findUserForLogin(dto.identifier);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!this.passwordService.verify(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      include: this.userInclude(),
    });

    return this.authResponse(updated, Boolean(dto.remember_me));
  }

  async me(userId: string) {
    const user = await this.findUserOrThrow(userId);
    return this.serializeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.first_name?.trim(),
        lastName: dto.last_name?.trim(),
        mobile: dto.mobile ? this.normalizeMobile(dto.mobile) : undefined,
        avatarUrl: dto.avatar_url?.trim() || undefined,
      },
      include: this.userInclude(),
    });

    return this.serializeUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!this.passwordService.verify(dto.current_password, user.passwordHash)) {
      throw new ForbiddenException('Current password is incorrect');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: this.passwordService.hash(dto.new_password) },
    });

    return { changed: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserForLogin(dto.identifier);
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.passwordResetRequest.create({
        data: {
          userId: user.id,
          tokenHash: this.tokenHash(token),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
    }

    return {
      requested: true,
      message: 'If the account exists, a password reset request has been recorded.',
    };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: this.userInclude(),
    });
    return users.map((user) => this.serializeUser(user));
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.first_name?.trim(),
        lastName: dto.last_name?.trim(),
        mobile: dto.mobile ? this.normalizeMobile(dto.mobile) : undefined,
        email: dto.email ? this.normalizeEmail(dto.email) : undefined,
        username: dto.username ? this.normalizeUsername(dto.username) : undefined,
        status: dto.status,
      },
      include: this.userInclude(),
    });

    return this.serializeUser(user);
  }

  async assignUserRole(userId: string, dto: AssignRoleDto) {
    await this.ensureUser(userId);
    await this.ensureRole(dto.role_id);
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: dto.role_id } },
      update: {},
      create: { userId, roleId: dto.role_id },
    });
    return this.me(userId);
  }

  async removeUserRole(userId: string, roleId: string) {
    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
    return this.me(userId);
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ system: 'desc' }, { code: 'asc' }],
      include: this.roleInclude(),
    });
    return roles.map((role) => this.serializeRole(role));
  }

  async createRole(dto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        code: this.normalizeRoleCode(dto.code),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        system: Boolean(dto.system),
      },
      include: this.roleInclude(),
    });
    return this.serializeRole(role);
  }

  async updateRole(roleId: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
      },
      include: this.roleInclude(),
    });
    return this.serializeRole(role);
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
  }

  async assignRolePermission(roleId: string, dto: AssignPermissionDto) {
    await this.ensureRole(roleId);
    await this.ensurePermission(dto.permission_id);
    await this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: dto.permission_id } },
      update: {},
      create: { roleId, permissionId: dto.permission_id },
    });
    return this.getRole(roleId);
  }

  async removeRolePermission(roleId: string, permissionId: string) {
    await this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
    return this.getRole(roleId);
  }

  private async getRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: this.roleInclude(),
    });
    if (!role) throw new NotFoundException('Role not found');
    return this.serializeRole(role);
  }

  private async ensureUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
  }

  private async ensureRole(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
    if (!role) throw new NotFoundException('Role not found');
  }

  private async ensurePermission(permissionId: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      select: { id: true },
    });
    if (!permission) throw new NotFoundException('Permission not found');
  }

  private async findUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: this.userInclude(),
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private findUserForLogin(identifier: string) {
    const normalized = identifier.trim().toLowerCase();
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { username: normalized },
          { mobile: identifier.trim() },
        ],
      },
      include: this.userInclude(),
    });
  }

  private authResponse(user: UserWithRoles, rememberMe: boolean) {
    const serialized = this.serializeUser(user);
    const payload = {
      sub: serialized.id,
      roles: serialized.roles.map((role) => role.code),
      permissions: serialized.permissions.map((permission) => permission.code),
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.getOrThrow<string>('APP_JWT_SECRET'),
        expiresIn: rememberMe ? '30d' : '12h',
      }),
      token_type: 'Bearer',
      expires_in: rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60,
      user: serialized,
    };
  }

  private serializeUser(user: UserWithRoles) {
    const roles = user.roles.map(({ role }) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
    }));
    const permissionsByCode = new Map<string, PermissionView>();
    for (const { role } of user.roles) {
      for (const { permission } of role.rolePermissions) {
        permissionsByCode.set(permission.code, permission);
      }
    }

    return {
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      full_name: `${user.firstName} ${user.lastName}`.trim(),
      mobile: user.mobile,
      username: user.username,
      email: user.email,
      avatar_url: user.avatarUrl,
      status: user.status,
      last_login_at: user.lastLoginAt,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      roles,
      permissions: [...permissionsByCode.values()].sort((left, right) =>
        left.code.localeCompare(right.code),
      ),
    };
  }

  private serializeRole(role: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    system: boolean;
    rolePermissions: { permission: PermissionView }[];
  }): RoleView & { system: boolean } {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      system: role.system,
      permissions: role.rolePermissions
        .map(({ permission }) => permission)
        .sort((left, right) => left.code.localeCompare(right.code)),
    };
  }

  private userInclude() {
    return {
      roles: {
        include: {
          role: {
            include: this.roleInclude(),
          },
        },
      },
    } as const;
  }

  private roleInclude() {
    return {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    } as const;
  }

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private normalizeUsername(value: string) {
    return value.trim().toLowerCase();
  }

  private normalizeMobile(value: string) {
    return value.trim();
  }

  private normalizeRoleCode(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, '_');
  }

  private tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
