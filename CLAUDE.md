# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use **pnpm** only (enforced by `preinstall`). Node >= 22.18, pnpm >= 10.25.

```sh
pnpm start:dev                      # API in watch mode (nest project "api", entry src/main.ts)
pnpm start:debug                    # same, with inspector
pnpm start:cli <command>            # nest-commander CLI (src/cli.ts), e.g. seed:role, seed:policy, seed:user
pnpm start:repl                     # Nest REPL (src/repl.ts)
pnpm build                          # prebuild runs `prisma generate`; builds both "api" and "cli" with webpack
pnpm bundle                         # ncc single-file bundle of dist/main.js

pnpm lint                           # eslint --fix, then lint-staged
pnpm format                         # prettier on src/, libs/, test/
pnpm spell                          # cspell
pnpm deadcode                       # ts-prune

pnpm test:cov                       # unit tests (*.spec.ts under src/, libs/, test/)
pnpm test:e2e                       # e2e tests (*.e2e-spec.ts, config test/jest-e2e.json)
npx jest path/to/file.spec.ts       # single test file
npx jest -t "test name"             # single test by name
```

There are currently no `*.spec.ts` files; tests pass via `--passWithNoTests`.

### Database (Prisma 7, PostgreSQL 18 + pgvector)

```sh
pnpm db:generate     # generate the client into prisma/runtime (gitignored); run after every schema change
pnpm db:migrate      # create a migration (--create-only), does not apply it
pnpm db:deploy       # apply migrations
pnpm db:clear        # db push --force-reset (wipes the DB)
pnpm db:studio
pnpm app:reset       # clear logs/uploads/temporary, reset DB, seed role + policy + user
```

- Migrations live in `prisma/migrations` (first one is `0_init`, with `migration_lock.toml` pinned to `postgresql`). `db:migrate` creates a new migration (does not apply it), `db:deploy` applies pending ones, and `db:clear` runs `prisma migrate reset --force` (wipes the DB and re-applies migrations).
- Search filters (`contains`) use `mode: 'insensitive'` because PostgreSQL is case-sensitive by default. Emails are lower-cased on input (`@ToString({ format: 'lowercase' })` on DTOs, social-login payloads, seeds), so lookups and unique constraints on email are case-consistent.
- Raw SQL must use PostgreSQL syntax (quoted camelCase columns, `$n` placeholders, `ON CONFLICT`); see the queue consumer's `FOR UPDATE SKIP LOCKED` query.
- Schema: `prisma/schema.prisma`; config: `prisma.config.ts` (reads `DATABASE_URL`).
- Import the generated client from `@runtime/prisma-client`, never from `@prisma/client`.

### Generators and sub-packages

- `pnpm schematics:build` then `pnpm schematics:generate`: scaffold a new module from `packages/nest-schematics` into `src/modules`.
- `pnpm admin:build` then `pnpm admin:migrate`: build the internal admin portal (`packages/nest-admin`) and move it to `public/admin`.

## Environment

- Env files load from `.env` then `.env.${APP_ENV}` (`ENV_CONFIG` in `libs/nest-core`). `make env STAGE=staging` copies `.env.staging` to `.env`.
- `src/main.ts` validates `process.env` against `src/app/dtos/app.env.dto.ts` at startup and refuses to boot on invalid env; add new env vars there.
- Feature flags in env: `APP_ROUTER` (HTTP routes), `APP_WORKER` (job queue worker), `APP_WEBSOCKET`, `APP_TENANT` (multi-tenant Prisma), `DATABASE_REPLICATION`, `DATABASE_DEBUG`.
- `pnpm app:env:generate` / `pnpm app:keys:generate` run `scripts/generate-env.ts` / `scripts/generate-keys.ts`.

## Architecture

NestJS 11 monorepo (Nest CLI `projects` in `nest-cli.json`): two apps (`api`, `cli`) sharing `src/`, plus four internal libraries in `libs/`.

### Path aliases (tsconfig + jest moduleNameMapper)

`app/*`, `configs/*`, `modules/*`, `tools/*` → `src/...`; `lib/nest-core`, `lib/nest-web`, `lib/nest-auth`, `lib/nest-prisma` → `libs/<name>/src`; `@runtime/prisma-client` → `prisma/runtime/client`. If you add an alias, update `tsconfig.json`, the `jest` block in `package.json`, and `test/jest-e2e.json`.

### Libraries (`libs/`)

Each lib is a dynamic module configured with `forRoot()` in `src/app/app.module.ts` (API) and `src/app/cli.module.ts` (CLI).

- **nest-core**: config loading, logger, cache, i18n messages (`MessageService`), `HelperService` (dates), push/SMS/mail dispatchers and drivers, utils (`StrUtil`, `FileUtil`, ...), `ScopeContext`/`@OnScope`, and the abstract worker contracts (`WorkerProducer`, `WorkerConsumer`, `WorkerScanner`, `IWorkerHandler`).
- **nest-web**: the HTTP layer. `NestWebModule.forRoot({ router, worker, metrics })` registers route groups, global validation (422 + `ValidateException`), request logging, conditional middlewares, and the job worker. Also provides the request decorators used by every controller (`@ApiRequestPaging`, `@ApiRequestData`, `@RequestQueryList`, `@RequestQueryFilter*`, `@RequestBody`, `@RequestParam`, ...).
- **nest-auth**: JWT access/refresh, API-key scope, Apple/Google social login, and CASL abilities. Abilities are defined by `src/app/helpers/user.ability.factory.ts` with subjects/actions from `src/app/enums/user.enum.ts`.
- **nest-prisma**: `PrismaService` (MariaDB/PG adapters, read replicas, multi-tenant, utility extensions for paging/list/export), plus the Prisma-backed worker implementation (`PrismaWorkerProducer`/`Consumer`/`Scanner`).

### Routing

Controllers are **not** registered in their feature modules. They are listed in route-group modules in `src/app/routes/`, which `NestWebModule` mounts under a path prefix (`EnumRoutePath`):

- `routes.admin.module.ts`: CMS/admin (`*.admin.controller.ts`, `user.auth.controller.ts`)
- `routes.app.module.ts`: mobile app (`*.app.controller.ts`, `*.auth.controller.ts`)
- `routes.web.module.ts`, `routes.public.module.ts`

The global prefix and URI versioning come from config (`app.http.prefix`, `app.urlVersion.prefix`). `admin/`, `health/`, and `metrics/` are excluded from the prefix. When you add a controller, also add it (and its feature module import) to the right routes module.

Auth and policies are declared per endpoint inside the `@ApiRequest*` decorator options (`jwtAccessToken.scope`, `user.abilities: [{ subject, actions }]`), not through separate guards.

### Background jobs (DB-backed queue, not BullMQ)

Jobs are rows in the `QueueJob` table, with cursor state in `QueueCursor`. The flow:

1. A `@Cron` method in `modules/<x>/schedulers/*.scheduler.ts` calls a service `enqueue*` method, which calls `WorkerProducer.publish(topic, { version, priority, startDate, message })`.
2. A **scan** handler (`IWorkerHandler`, `topic` + `version`) uses `WorkerScanner.runWithCursor({ retrieve, process, chunking })` to page through records and publish **proc** jobs in batches.
3. A **proc** handler does the actual work.

Topics are enums in the module (e.g. `EnumCustomerQueue`); versions are in `*_QUEUE_SCAN_VERSION` / `*_QUEUE_PROC_VERSION` constants. Bump a version to reset the cursor or invalidate old jobs. **Every handler must be registered** in the `worker.modules[].handlers` list in `src/app/app.module.ts`. Handlers live in `modules/<x>/handlers/`.

### Domain

Two kinds of account, kept fully separate (own tables, sessions, 2FA, auth scope):

- **User** (`modules/user`): admin staff using the CMS portal; one role per user (`User.roleId`); policies come from `role` / `policy` (CASL). `Role.type` (`EnumRoleType`: SUPER_ADMIN, ADMIN, USER; ranks in `modules/role/helpers/role.util.ts`, lower = more powerful) drives the hierarchy: a requester can only view/manage/assign roles with rank >= their own, and SUPER_ADMIN bypasses policies (`can('manage', 'all')`).
- **Customer** (`modules/customer`): end users of the mobile app and web; receive notifications/pushes (`modules/notification`).

Other modules: `content` (static pages shown in the app), `setting`, `api-key`, `app-version`, `country`, `district`, `dashboard`, `activity-log`.

Session naming: one value identifies a login session, named by the family of fields it sits in. Next to other `login*` fields it is `loginToken` (`IAuthUserSession` / JWT payload, `IAuthTokenGenerate`, `User.loginToken` / `Customer.loginToken` beside `loginDate`). Next to other `user*` fields it is `userToken` (`*Session.userToken` beside `ipAddress`/`userAgent`, `IAuthUserSessionCache`, `IAuthLoginOptions`, the `x-user-token` header alongside `x-user-ott` / `x-user-otp` / `x-user-agent`). The single-login check compares `User/Customer.loginToken` with the JWT `loginToken`. `CUSTOMER_AUTH_VALIDATOR` / `USER_AUTH_VALIDATOR` are Nest provider tokens whose value must equal the `EnumAuthScopeType` scope, because the scope guard resolves the validator with `ModuleRef.get(payload.scopeType)`.

### Feature module layout

`src/modules/<name>/` uses folders as needed: `constants` (incl. `*.doc.constant.ts` for Swagger texts), `controllers` (`<name>.<admin|app|auth|web|public>.controller.ts`), `dtos` (`<name>.request.<action>.dto.ts`, `<name>.response.<kind>.dto.ts`), `enums`, `events`/`listeners` (event-emitter), `handlers` (queue), `helpers`, `interfaces`, `schedulers`, `services`, `transforms`, `middleware`. The full list of allowed folders is in README.md.

### CLI and seeds

`src/cli.ts` boots `CliModule` with nest-commander. Seed commands (`@Command`) live in `src/app/data/seeds/` (loaded through `DataSeedModule`) and `src/app/seeds/`. Mock data for development is in `src/app/data/mocks/` (`DataMockModule`).

### Resources

i18n strings: `src/resources/languages/{en,vi}`; email templates (hbs): `src/resources/templates/{en,vi}`. These are copied to `dist` as build assets.

## Conventions

- Commits follow commitlint with allowed types: `ci, doc, feat, fix, hotfix, refactor, revert, style, test` (note `doc`, not `docs`). The Husky + lint-staged pre-commit runs eslint and `stop-only` (no `.only` in tests).
- Prettier and ESLint config: `.prettierrc`, `eslint.config.mjs`. TypeScript runs with `strictNullChecks: false` and `noImplicitAny: false`.
- CI (`.github/workflows/ci.yml`) runs `pnpm db:deploy` against PostgreSQL 18 (`pgvector/pgvector:pg18`), then `pnpm test`, with Postgres 18 and Valkey 8 as CI services. Deployment uses `ci/Dockerfile` and `docker-compose.yml` (see `Makefile`).
