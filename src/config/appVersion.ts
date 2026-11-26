export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.1'

export const APP_BUILD_ID: string =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev'

export function formatAppVersionLabel(
  version: string = APP_VERSION,
  buildId: string = APP_BUILD_ID,
): string {
  return `v${version} (${buildId})`
}
