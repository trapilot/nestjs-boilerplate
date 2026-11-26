export const ENV = {
  // Generated services call paths without the `/api/admin` prefix. The portal is served by the
  // API itself (/admin), so the relative default works on every host; override for a remote API.
  apiBaseURL: (import.meta.env.VITE_API_BASE_URL as string) || '/api/admin',
  version: import.meta.env.VITE_APP_VERSION as string,
  tenantId: import.meta.env.VITE_APP_TENANT_ID as string,
  tinyMCE: import.meta.env.VITE_APP_TINYMCE_KEY as string,
  // Only for an API that answers `x-security-mode: signature` (APP routes; admin routes need no
  // signature). Anything here ships in the public bundle, so it is no secret from a browser user.
  requestSecurityKey: import.meta.env.VITE_REQUEST_SECURITY_KEY as string,
}
