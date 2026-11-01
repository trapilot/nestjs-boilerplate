# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **yarn**. Database is MySQL via Prisma 7 (`@prisma/adapter-mariadb`).

```sh
yarn start:dev                 # watch mode
yarn start:debug               # watch + inspector
yarn start:repl                # Nest REPL against AppModule
yarn start:cli <command> [...] # run a nest-commander command, e.g. `yarn start:cli product:seed -i 100`
yarn build                     # prebuild runs `prisma generate`; webpack build via nest-cli
yarn bundle                    # ncc-bundle dist/main.js for production

yarn lint:fix                  # eslint --fix over src, libs, test
yarn format                    # prettier
yarn spell                     # cspell

yarn test:cov                  # unit tests (*.spec.ts under src/, libs/, test/)
yarn test:e2e                  # e2e tests (test/*.e2e-spec.ts, config test/jest-e2e.json)
npx jest path/to/file.spec.ts  # single unit test file
npx jest -t "test name"        # single test by name

yarn db:generate               # regenerate Prisma client into prisma/runtime (gitignored)
yarn db:migrate                # create a migration (--create-only; apply with db:deploy)
yarn db:deploy                 # apply migrations
yarn db:studio

yarn app:env create|generate   # create / fill .env (scripts/generate-env.ts)
yarn app:reset                 # wipe logs/uploads, force-reset DB, re-seed users/roles/tiers/facts, migrate permissions & roles
yarn migrate:permission && yarn migrate:role   # re-sync after changing ability subjects/actions
yarn schematics:generate       # scaffold a new module with packages/nest-schematics
```

`prisma/runtime` must exist before compiling or testing — run `yarn db:generate` after cloning or after editing `prisma/schema.prisma`.

Git hooks (husky): `pre-commit` runs `yarn test` (needs a reachable DB from `.env`); `commit-msg` enforces commitlint with types limited to `ci, doc, feat, fix, hotfix, refactor, revert, style, test`. lint-staged also runs `stop-only` to block committed `.only` tests.

## Architecture

### One entry point, two modes
[src/main.ts](src/main.ts) boots `AppModule` as an HTTP server when called with no args, and `CliModule` via nest-commander when given args (`yarn start:cli <cmd>`). Env vars are validated at startup against `AppEnvDto` in [src/shared/dtos](src/shared/dtos). [src/repl.ts](src/repl.ts) is the REPL entry.

### Internal libraries (`libs/`)
Infrastructure lives in local Nest libraries imported via path aliases `lib/nest-*` (see `tsconfig.json` paths; Jest `moduleNameMapper` in `package.json` and `test/jest-e2e.json` must mirror any new alias):
- `nest-core` — config loading, `ModuleBase`, shared enums (`ENUM_APP_API_TYPE`, `ENUM_APP_CMD_TYPE`, `ENUM_APP_API_ROUTE`), helpers, i18n `MessageService`, file utils.
- `nest-prisma` — `PrismaService`, Prisma extensions/utils/filters.
- `nest-auth` — JWT/API-key auth and CASL ability guards; app-specific abilities are injected via `NestAuthModule.forRoot({ factory: UserAbilityFactory, subjects, actions })` from [src/shared](src/shared).
- `nest-web` — request/response decorators (`ApiRequestPaging`, `ApiRequestData`, `RequestQueryList`, filter decorators), validation pipe, metrics, middleware hook.
- `nest-logger`, `nest-notifier` — logging (pino) and email/SMS/push providers.

Other aliases: `app/*`, `configs/*`, `modules/*`, `shared/*`, and `@runtime/prisma-client` (the generated Prisma client — import `Prisma` types from here, not `@prisma/client`).

### Feature modules and registration
Each module in `src/modules/<name>` extends `ModuleBase` and declares, as static fields, which controllers belong to which API surface and which CLI commands / cron tasks it provides:

```ts
export class ProductModule extends ModuleBase {
  static _controllers = { [ENUM_APP_API_TYPE.CMS]: [ProductAdminController], [ENUM_APP_API_TYPE.APP]: [ProductAppController] }
  static _commands = { [ENUM_APP_CMD_TYPE.SEED]: [ProductSeedCommand] }
  static _tasks = [...]
}
```

Controllers are **not** listed in the module's `@Module({controllers})`. Instead they are pulled in centrally, so adding a module/controller requires touching the registries in [src/app](src/app):
- [src/app/router/routes](src/app/router/routes) — `RoutesAdminModule` (`/admin`, CMS), `RoutesAppModule` (`/app`), `RoutesWebModule` (`/web`), `RoutesPublicModule` (`/`), each spreading `XModule.controllers(ENUM_APP_API_TYPE.X)`. Final URLs are `/<API_PREFIX>/<urlVersion>/<surface>/...`.
- [src/app/router/commands](src/app/router/commands) — `CommandsSeedModule` / `CommandsMigrateModule` via `XModule.commands(...)`. Seed commands are excluded in production.
- [src/app/worker/worker.module.ts](src/app/worker/worker.module.ts) — cron tasks via `XModule.tasks()`.
- Global middleware is attached by overriding `static middleware(consumer)` and wiring it in `NestWebModule.forRoot({ middleware })` in [src/app/app.module.ts](src/app/app.module.ts).
- WebSocket gateways live in [src/app/gateway](src/app/gateway) (enabled by `app.wssEnable`).

Module folder conventions (controllers, dtos, services, commands, tasks, transforms, listeners, etc.) are listed in [README.md](README.md). Controller naming: `<name>.admin.controller.ts`, `<name>.app.controller.ts`, etc., per surface.

### Patterns within modules
- Services wrap `PrismaService` directly and take `Prisma.<Model>*Args`; `findOrFail`/`differOrFail` throw Nest exceptions whose `message` is an **i18n key** (e.g. `module.product.notFound`) resolved from [src/resources/languages](src/resources/languages) (`en`, `vi`). Add keys to both languages.
- Endpoint auth/permissions/swagger/response shaping are configured declaratively in the `ApiRequest*` decorator (`jwtAccessToken.scope`, `user.abilities: [{ subject, actions }]`, `response.dto`). Ability subjects/actions are enums in [src/shared/enums/app.enum.ts](src/shared/enums/app.enum.ts); after adding one, run `yarn migrate:permission && yarn migrate:role`.
- Email/notification templates are in [src/resources/templates](src/resources/templates) (hbs), copied to `dist` as nest-cli assets.

### Other packages
- `packages/nest-admin` — Vite admin portal; built and moved to `public/admin` (`yarn admin:build && yarn admin:migrate`), served outside the API prefix.
- `packages/nest-schematics` — custom schematic used by `yarn schematics:generate`.

### Deployment
Docker image from [ci/Dockerfile](ci/Dockerfile); `make env STAGE=staging|production` copies `.env.<stage>` to `.env`. GitHub Actions in `.github/workflows` run migrations + `yarn test` against MySQL 8 on Node 22.
