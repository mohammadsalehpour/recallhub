-- CreateEnum
CREATE TYPE "recallhub_core"."UserStatus" AS ENUM ('invited', 'active', 'suspended', 'disabled');

-- CreateTable
CREATE TABLE "recallhub_core"."rh_users" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "recallhub_core"."UserStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_core"."rh_roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rh_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_core"."rh_permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recallhub_core"."rh_user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "recallhub_core"."rh_role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "recallhub_core"."rh_password_reset_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rh_password_reset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rh_users_mobile_key" ON "recallhub_core"."rh_users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "rh_users_username_key" ON "recallhub_core"."rh_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "rh_users_email_key" ON "recallhub_core"."rh_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rh_roles_code_key" ON "recallhub_core"."rh_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "rh_permissions_code_key" ON "recallhub_core"."rh_permissions"("code");

-- CreateIndex
CREATE INDEX "rh_user_roles_role_id_idx" ON "recallhub_core"."rh_user_roles"("role_id");

-- CreateIndex
CREATE INDEX "rh_role_permissions_permission_id_idx" ON "recallhub_core"."rh_role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "rh_password_reset_requests_user_id_idx" ON "recallhub_core"."rh_password_reset_requests"("user_id");

-- CreateIndex
CREATE INDEX "rh_password_reset_requests_token_hash_idx" ON "recallhub_core"."rh_password_reset_requests"("token_hash");

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_user_roles" ADD CONSTRAINT "rh_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "recallhub_core"."rh_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_user_roles" ADD CONSTRAINT "rh_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "recallhub_core"."rh_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_role_permissions" ADD CONSTRAINT "rh_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "recallhub_core"."rh_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_role_permissions" ADD CONSTRAINT "rh_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "recallhub_core"."rh_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recallhub_core"."rh_password_reset_requests" ADD CONSTRAINT "rh_password_reset_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "recallhub_core"."rh_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed baseline permissions and roles.
INSERT INTO "recallhub_core"."rh_permissions" ("id", "code", "description", "created_at")
VALUES
  ('10000000-0000-4000-8000-000000000001', 'project.read', 'Read project profiles and configuration', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000002', 'project.create', 'Create projects', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000003', 'project.update', 'Update project profiles and detected metadata', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000004', 'project.archive', 'Archive projects', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000005', 'project.configure_repository', 'Configure project repositories and paths', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000006', 'project.sync', 'Run project memory sync', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000007', 'memory.read', 'Read project memory', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000008', 'memory.write', 'Write project memory artifacts', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000009', 'memory.commit', 'Create memory commits', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000010', 'work_item.read', 'Read work items', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000011', 'work_item.create', 'Create work items', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000012', 'work_item.update', 'Update work items', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000013', 'work_item.analyze', 'Analyze work items', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000014', 'work_item.research', 'Run research workflows', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000015', 'work_item.generate_spec', 'Generate development specs', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000016', 'work_item.review', 'Review documents', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000017', 'work_item.approve', 'Approve implementation gates', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000018', 'work_item.implement', 'Plan implementation', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000019', 'work_item.validate', 'Run validation and simulation', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000020', 'workflow.read', 'Read workflow definitions and runs', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000021', 'workflow.run', 'Run workflows', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000022', 'workflow.retry', 'Retry workflow runs', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000023', 'workflow.cancel', 'Cancel workflow runs', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000024', 'audit.read', 'Read audit logs', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000025', 'settings.write', 'Run administrative settings actions', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000026', 'user.read', 'Read users', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000027', 'user.manage', 'Manage users and role assignments', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000028', 'role.read', 'Read roles and permissions', CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000029', 'role.manage', 'Manage roles and permission assignments', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "recallhub_core"."rh_roles" ("id", "code", "name", "description", "system", "created_at", "updated_at")
VALUES
  ('20000000-0000-4000-8000-000000000001', 'admin', 'Admin', 'Full RecallHub administration', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000002', 'owner', 'Owner', 'Legacy owner alias with full access', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000003', 'project_owner', 'Project Owner', 'Own and configure projects', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000004', 'architect', 'Architect', 'Create, review, and approve technical work', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000005', 'developer', 'Developer', 'Create and implement development work', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000006', 'reviewer', 'Reviewer', 'Review documents and approvals', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000007', 'operator', 'Operator', 'Operate syncs and workflow runs', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000008', 'ops', 'Ops', 'Operational admin tasks', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('20000000-0000-4000-8000-000000000009', 'viewer', 'Viewer', 'Read-only access', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "recallhub_core"."rh_role_permissions" ("role_id", "permission_id", "assigned_at")
SELECT roles.id, permissions.id, CURRENT_TIMESTAMP
FROM "recallhub_core"."rh_roles" roles
JOIN "recallhub_core"."rh_permissions" permissions ON (
  roles.code IN ('admin', 'owner')
  OR (roles.code = 'project_owner' AND permissions.code IN (
    'project.read', 'project.create', 'project.update', 'project.archive', 'project.configure_repository', 'project.sync',
    'memory.read', 'memory.write', 'memory.commit',
    'work_item.read', 'work_item.create', 'work_item.update', 'work_item.analyze', 'work_item.research',
    'work_item.generate_spec', 'work_item.review', 'work_item.approve', 'work_item.implement', 'work_item.validate',
    'workflow.read', 'workflow.run', 'workflow.retry', 'workflow.cancel', 'audit.read'
  ))
  OR (roles.code = 'architect' AND permissions.code IN (
    'project.read', 'memory.read', 'memory.write',
    'work_item.read', 'work_item.create', 'work_item.update', 'work_item.analyze', 'work_item.research',
    'work_item.generate_spec', 'work_item.review', 'work_item.approve', 'work_item.implement',
    'workflow.read', 'workflow.run', 'audit.read'
  ))
  OR (roles.code = 'developer' AND permissions.code IN (
    'project.read', 'memory.read', 'memory.commit',
    'work_item.read', 'work_item.create', 'work_item.update', 'work_item.analyze', 'work_item.research',
    'work_item.generate_spec', 'work_item.implement', 'work_item.validate',
    'workflow.read', 'workflow.run'
  ))
  OR (roles.code = 'reviewer' AND permissions.code IN (
    'project.read', 'memory.read', 'work_item.read', 'work_item.review', 'work_item.approve', 'workflow.read'
  ))
  OR (roles.code = 'operator' AND permissions.code IN (
    'project.read', 'project.sync', 'memory.read', 'work_item.read',
    'workflow.read', 'workflow.retry', 'workflow.cancel', 'audit.read'
  ))
  OR (roles.code = 'ops' AND permissions.code IN (
    'project.read', 'project.sync', 'memory.read', 'work_item.read',
    'workflow.read', 'workflow.run', 'workflow.retry', 'workflow.cancel', 'audit.read', 'settings.write'
  ))
  OR (roles.code = 'viewer' AND permissions.code IN (
    'project.read', 'memory.read', 'work_item.read', 'workflow.read'
  ))
)
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
