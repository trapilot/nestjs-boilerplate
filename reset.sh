#!/bin/sh -ex

# Wipe uploads/logs, recreate the DB from prisma/migrations, seed role, policy, user, user-role
pnpm app:reset;

pnpm start:cli seed:api-key;
pnpm start:cli seed:app-version;
pnpm start:cli seed:setting;
