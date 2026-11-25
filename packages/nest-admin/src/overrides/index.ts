import type { CustomOverride } from '../types/resource'

/**
 * Per-resource escape hatch for the generic pages. Keys are resource route keys
 * (`user`, `api-key`, ...). Everything is optional:
 *
 *   list / detail / form : replace the generic page with your own component
 *   hiddenColumns        : column keys never shown in the list and detail pages
 *   columns              : explicit default list column order (replaces the automatic choice)
 *
 * Example:
 *   export const OVERRIDES: Record<string, CustomOverride> = {
 *     user: { hiddenColumns: ['address'], columns: ['id', 'name', 'email', 'role', 'isActive'] },
 *   }
 */
export const OVERRIDES: Record<string, CustomOverride> = {}
