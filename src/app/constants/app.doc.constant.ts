// Loads .env / .env.<APP_ENV> before the values below are read, whatever the import order
import 'lib/nest-core/constants/env.constant'

/**
 * Swagger `example:` values, so requests are pre-filled when trying them in the docs.
 *
 * Read from the MOCK_* env vars (the same accounts the seeds create) and fall back to a fake
 * placeholder when unset. Leave MOCK_* empty on production; Swagger is not served there anyway
 * (see src/main.ts).
 */
const env = (key: string, fallback: string): string => process.env[key] || fallback

export const DOC_EXAMPLE = {
  SADMIN_EMAIL: env('MOCK_SADMIN_EMAIL', 'superadmin@example.com'),

  ADMIN_EMAIL: env('MOCK_ADMIN_EMAIL', 'admin@example.com'),
  ADMIN_PASS: env('MOCK_ADMIN_PASS', 'Example@Pass1'),
  ADMIN_PHONE: env('MOCK_ADMIN_PHONE', '+84900000001'),

  CUSTOMER_EMAIL: env('MOCK_CUSTOMER_EMAIL', 'customer@example.com'),
  CUSTOMER_PASS: env('MOCK_CUSTOMER_PASS', 'Example@Pass1'),
  CUSTOMER_PHONE: env('MOCK_CUSTOMER_PHONE', '+84900000002'),
  CUSTOMER_CID: env('MOCK_CUSTOMER_CID', '001090000000'),

  TESTER_EMAIL: env('MOCK_TESTER_EMAIL', 'tester@example.com'),
  TESTER_PASS: env('MOCK_TESTER_PASS', 'Example@Pass1'),
  TESTER_PHONE: env('MOCK_TESTER_PHONE', '+84900000003'),
} as const
