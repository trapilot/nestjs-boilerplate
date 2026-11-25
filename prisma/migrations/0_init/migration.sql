-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EnumJobStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "EnumJobBatchMode" AS ENUM ('SEQUENTIAL', 'PARALLEL');

-- CreateEnum
CREATE TYPE "EnumApiKeyType" AS ENUM ('SYSTEM', 'CLIENT', 'DEFAULT');

-- CreateEnum
CREATE TYPE "EnumPlatformType" AS ENUM ('IOS', 'AOS', 'WEB');

-- CreateEnum
CREATE TYPE "EnumVerificationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "EnumVerificationMethod" AS ENUM ('SIGN_UP', 'RESET_PASSWORD', 'FORGOT_PASSWORD', 'CHANGE_PASSWORD');

-- CreateEnum
CREATE TYPE "EnumNotificationChannel" AS ENUM ('SMS', 'EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EnumNotificationMethod" AS ENUM ('TEXT', 'REFERENCE');

-- CreateEnum
CREATE TYPE "EnumPushType" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "EnumPushStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "EnumPushResult" AS ENUM ('SENT', 'FAILED', 'INVALID');

-- CreateEnum
CREATE TYPE "EnumRoleType" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT NOT NULL DEFAULT 'SYSTEM',
    "value" TEXT NOT NULL,
    "refer" TEXT,
    "isVisible" BOOLEAN DEFAULT true,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "deletedBy" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_cursors" (
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastId" INTEGER,
    "batchId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_cursors_pkey" PRIMARY KEY ("name","version")
);

-- CreateTable
CREATE TABLE "queue_jobs" (
    "id" SERIAL NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobHash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "status" "EnumJobStatus" NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3) NOT NULL,
    "thresholdAt" TIMESTAMP(3) NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "persistent" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "result" JSONB,
    "metadata" JSONB,
    "parentId" INTEGER,
    "batchNo" INTEGER,
    "batchMode" "EnumJobBatchMode",
    "batchTotal" INTEGER NOT NULL DEFAULT 0,
    "batchDone" INTEGER NOT NULL DEFAULT 0,
    "batchFailed" INTEGER NOT NULL DEFAULT 0,
    "heartbeatAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_job_archives" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "jobName" TEXT NOT NULL,
    "payload" JSONB,
    "result" JSONB,
    "metadata" JSONB,
    "retryCount" INTEGER NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_job_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_job_failures" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "jobName" TEXT NOT NULL,
    "payload" JSONB,
    "result" JSONB,
    "metadata" JSONB,
    "retryCount" INTEGER NOT NULL,
    "lastError" TEXT,
    "failedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_job_failures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "type" "EnumApiKeyType" NOT NULL DEFAULT 'CLIENT',
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "isDeprecated" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "startDate" TIMESTAMP(3),
    "untilDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_versions" (
    "id" SERIAL NOT NULL,
    "type" "EnumPlatformType" NOT NULL DEFAULT 'IOS',
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "url" TEXT,
    "isForce" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "alpha2Code" TEXT NOT NULL,
    "alpha3Code" TEXT NOT NULL,
    "phoneCode" JSONB NOT NULL,
    "continent" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "isVisible" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" SERIAL NOT NULL,
    "countryId" INTEGER,
    "name" JSONB,
    "isActive" BOOLEAN DEFAULT true,
    "isVisible" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "refId" INTEGER,
    "refType" TEXT,
    "channel" "EnumNotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "type" "EnumNotificationMethod" NOT NULL DEFAULT 'TEXT',
    "title" JSONB NOT NULL,
    "description" JSONB,
    "content" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pushes" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "type" "EnumPushType" NOT NULL DEFAULT 'ONCE',
    "status" "EnumPushStatus" DEFAULT 'PENDING',
    "year" INTEGER,
    "month" INTEGER,
    "day" INTEGER,
    "weekday" INTEGER,
    "hour" INTEGER,
    "minute" INTEGER,
    "second" INTEGER,
    "sinceDate" TIMESTAMP(3),
    "untilDate" TIMESTAMP(3),
    "retryCount" INTEGER DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "isImmediate" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "startAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "pushes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EnumRoleType" NOT NULL DEFAULT 'USER',
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" SERIAL NOT NULL,
    "title" JSONB,
    "context" TEXT,
    "path" TEXT,
    "subject" TEXT NOT NULL,
    "bitwise" INTEGER DEFAULT 0,
    "sorting" INTEGER DEFAULT 0,
    "isVisible" BOOLEAN DEFAULT true,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_roles_policies" (
    "policyId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "bitwise" INTEGER DEFAULT 0,
    "assignedBy" INTEGER,
    "assignedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "_roles_policies_pkey" PRIMARY KEY ("policyId","roleId")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "type" TEXT,
    "roleId" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "address" TEXT,
    "phoneRegion" TEXT,
    "phoneNumber" TEXT,
    "loginToken" TEXT,
    "loginDate" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "passwordConfirm" TEXT,
    "passwordAttempt" INTEGER DEFAULT 0,
    "passwordExpired" TIMESTAMP(3),
    "signUpFrom" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "isDeleted" BOOLEAN DEFAULT false,
    "isEmailVerified" BOOLEAN DEFAULT true,
    "isPhoneVerified" BOOLEAN DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_two_factors" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "secret" TEXT,
    "iv" TEXT,
    "backupCodes" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requiredSetup" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "user_two_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "jti" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userToken" TEXT NOT NULL,
    "userAgent" JSONB NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" INTEGER,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_verifications" (
    "id" SERIAL NOT NULL,
    "channel" "EnumVerificationChannel" NOT NULL,
    "type" "EnumVerificationMethod" NOT NULL,
    "code" TEXT NOT NULL,
    "userId" INTEGER,
    "phone" TEXT,
    "email" TEXT,
    "attempts" INTEGER DEFAULT 1,
    "isActive" BOOLEAN DEFAULT true,
    "isVerified" BOOLEAN DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "refId" TEXT,
    "countryId" INTEGER,
    "districtId" INTEGER,
    "email" TEXT,
    "name" TEXT,
    "citizenId" TEXT,
    "appleId" TEXT,
    "phone" TEXT,
    "locale" TEXT,
    "gender" TEXT,
    "address" TEXT,
    "avatar" TEXT,
    "birthDate" TIMESTAMP(3),
    "phoneRegion" TEXT,
    "phoneNumber" TEXT,
    "birthYear" INTEGER,
    "birthMonth" INTEGER,
    "birthDay" INTEGER,
    "loginToken" TEXT,
    "loginDate" TIMESTAMP(3),
    "password" TEXT,
    "passwordAttempt" INTEGER DEFAULT 0,
    "passwordExpired" TIMESTAMP(3),
    "isActive" BOOLEAN DEFAULT true,
    "isVisible" BOOLEAN DEFAULT true,
    "isDeleted" BOOLEAN DEFAULT false,
    "isPushable" BOOLEAN DEFAULT true,
    "isNotifiable" BOOLEAN DEFAULT true,
    "isPromotable" BOOLEAN DEFAULT true,
    "isEmailVerified" BOOLEAN DEFAULT false,
    "isPhoneVerified" BOOLEAN DEFAULT false,
    "promoViaApp" BOOLEAN DEFAULT false,
    "promoViaEmail" BOOLEAN DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_two_factors" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "secret" TEXT,
    "iv" TEXT,
    "backupCodes" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requiredSetup" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "customer_two_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_deletions" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_deletions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_sessions" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "jti" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userToken" TEXT NOT NULL,
    "userAgent" JSONB NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,
    "updatedAt" TIMESTAMP(3),
    "updatedBy" INTEGER,

    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_devices" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "type" TEXT,
    "model" TEXT,
    "version" TEXT,
    "token" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "customer_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_verifications" (
    "id" SERIAL NOT NULL,
    "channel" "EnumVerificationChannel" NOT NULL,
    "type" "EnumVerificationMethod" NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" INTEGER,
    "phone" TEXT,
    "email" TEXT,
    "attempts" INTEGER DEFAULT 1,
    "isActive" BOOLEAN DEFAULT true,
    "isVerified" BOOLEAN DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "customer_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notifications" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "notificationId" INTEGER,
    "pushId" INTEGER,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "refId" INTEGER,
    "refType" TEXT,
    "isRead" BOOLEAN DEFAULT false,
    "pushedAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_pushes" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "pushId" INTEGER NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "status" "EnumPushResult" NOT NULL,
    "errorCode" TEXT,
    "pushedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pushes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" JSONB,
    "content" JSONB,
    "thumbnail" TEXT,
    "sorting" INTEGER DEFAULT 0,
    "isVisible" BOOLEAN DEFAULT true,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "customerId" INTEGER,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_code_key" ON "settings"("code");

-- CreateIndex
CREATE INDEX "settings_type_idx" ON "settings"("type");

-- CreateIndex
CREATE INDEX "queue_jobs_status_id_idx" ON "queue_jobs"("status", "id");

-- CreateIndex
CREATE INDEX "queue_jobs_status_heartbeatAt_idx" ON "queue_jobs"("status", "heartbeatAt");

-- CreateIndex
CREATE INDEX "queue_jobs_status_thresholdAt_idx" ON "queue_jobs"("status", "thresholdAt");

-- CreateIndex
CREATE INDEX "queue_jobs_status_startAt_priority_idx" ON "queue_jobs"("status", "startAt", "priority");

-- CreateIndex
CREATE INDEX "queue_jobs_parentId_batchNo_idx" ON "queue_jobs"("parentId", "batchNo");

-- CreateIndex
CREATE UNIQUE INDEX "queue_jobs_jobHash_key" ON "queue_jobs"("jobHash");

-- CreateIndex
CREATE INDEX "queue_job_archives_jobName_idx" ON "queue_job_archives"("jobName");

-- CreateIndex
CREATE INDEX "queue_job_failures_jobName_idx" ON "queue_job_failures"("jobName");

-- CreateIndex
CREATE UNIQUE INDEX "app_versions_type_key" ON "app_versions"("type");

-- CreateIndex
CREATE INDEX "countries_name_alpha2Code_alpha3Code_continent_createdAt_idx" ON "countries"("name", "alpha2Code", "alpha3Code", "continent", "createdAt");

-- CreateIndex
CREATE INDEX "countries_createdAt_idx" ON "countries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "countries_alpha2Code_key" ON "countries"("alpha2Code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_alpha3Code_key" ON "countries"("alpha3Code");

-- CreateIndex
CREATE INDEX "pushes_status_retryCount_idx" ON "pushes"("status", "retryCount");

-- CreateIndex
CREATE INDEX "roles_type_createdAt_idx" ON "roles"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "policies_subject_key" ON "policies"("subject");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_two_factors_userId_key" ON "user_two_factors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_userToken_key" ON "user_sessions"("userToken");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_userId_isRevoked_expiredAt_idx" ON "user_sessions"("userId", "isRevoked", "expiredAt");

-- CreateIndex
CREATE INDEX "user_sessions_createdAt_idx" ON "user_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "user_sessions_updatedAt_idx" ON "user_sessions"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_appleId_key" ON "customers"("appleId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_isActive_email_idx" ON "customers"("isActive", "email");

-- CreateIndex
CREATE INDEX "customers_isActive_phone_idx" ON "customers"("isActive", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "customer_two_factors_customerId_key" ON "customer_two_factors"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_sessions_userToken_key" ON "customer_sessions"("userToken");

-- CreateIndex
CREATE INDEX "customer_sessions_customerId_idx" ON "customer_sessions"("customerId");

-- CreateIndex
CREATE INDEX "customer_sessions_customerId_isRevoked_expiredAt_idx" ON "customer_sessions"("customerId", "isRevoked", "expiredAt");

-- CreateIndex
CREATE INDEX "customer_sessions_createdAt_idx" ON "customer_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "customer_sessions_updatedAt_idx" ON "customer_sessions"("updatedAt");

-- CreateIndex
CREATE INDEX "customer_devices_customerId_idx" ON "customer_devices"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_devices_customerId_token_key" ON "customer_devices"("customerId", "token");

-- CreateIndex
CREATE INDEX "customer_verifications_customerId_idx" ON "customer_verifications"("customerId");

-- CreateIndex
CREATE INDEX "customer_notifications_customerId_pushedAt_isRead_idx" ON "customer_notifications"("customerId", "pushedAt", "isRead");

-- CreateIndex
CREATE INDEX "customer_pushes_customerId_createdAt_idx" ON "customer_pushes"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_pushes_customerId_pushId_idx" ON "customer_pushes"("customerId", "pushId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_createdAt_id_idx" ON "activity_logs"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_customerId_createdAt_id_idx" ON "activity_logs"("customerId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_action_createdAt_idx" ON "activity_logs"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_createdBy_createdAt_idx" ON "activity_logs"("createdBy", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pushes" ADD CONSTRAINT "pushes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pushes" ADD CONSTRAINT "pushes_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pushes" ADD CONSTRAINT "pushes_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_roles_policies" ADD CONSTRAINT "_roles_policies_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_roles_policies" ADD CONSTRAINT "_roles_policies_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_two_factors" ADD CONSTRAINT "user_two_factors_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_two_factors" ADD CONSTRAINT "user_two_factors_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_two_factors" ADD CONSTRAINT "user_two_factors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_verifications" ADD CONSTRAINT "user_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_two_factors" ADD CONSTRAINT "customer_two_factors_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_two_factors" ADD CONSTRAINT "customer_two_factors_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_two_factors" ADD CONSTRAINT "customer_two_factors_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_deletions" ADD CONSTRAINT "customer_deletions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_devices" ADD CONSTRAINT "customer_devices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_verifications" ADD CONSTRAINT "customer_verifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_pushId_fkey" FOREIGN KEY ("pushId") REFERENCES "pushes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_pushes" ADD CONSTRAINT "customer_pushes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_pushes" ADD CONSTRAINT "customer_pushes_pushId_fkey" FOREIGN KEY ("pushId") REFERENCES "pushes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written (Prisma cannot express CHECK constraints): an activity log row belongs to
-- exactly one owner, an admin staff User (userId) or a Customer (customerId)
ALTER TABLE "activity_logs"
  ADD CONSTRAINT "activity_logs_owner_check" CHECK (num_nonnulls("userId", "customerId") = 1);
