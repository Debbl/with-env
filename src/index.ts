import process from 'node:process'
import nextEnv from '@next/env'

// `@next/env` is CJS bundled by ncc, so its named exports are not statically
// analysable. A named import type-checks but throws under native ESM.
const { loadEnvConfig } = nextEnv

const SILENT_LOG = {
  info: () => {},
  error: () => {},
}

export interface LoadEnvOptions {
  /**
   * Directory to look for env files in.
   *
   * @default process.cwd()
   */
  cwd?: string
  /**
   * Load the development cascade (`.env.development*`) instead of the
   * production one (`.env.production*`).
   *
   * Ignored when `NODE_ENV` is `test`, which always selects the test cascade.
   *
   * @default process.env.NODE_ENV !== 'production'
   */
  dev?: boolean
  /**
   * Silence `@next/env`'s output. It only ever writes when a file that exists
   * cannot be read or parsed, so this hides errors rather than progress.
   *
   * @default false
   */
  quiet?: boolean
  /**
   * Reload even if env files were already loaded in this process. `@next/env`
   * caches its result so a long-lived dev server only pays for it once.
   *
   * @default false
   */
  force?: boolean
}

export interface LoadEnvResult {
  /** The merged environment, already applied to `process.env`. */
  env: Record<string, string | undefined>
  /**
   * Names of the env files that were loaded, in precedence order
   * (for example `['.env.local', '.env']`). Relative to `cwd`.
   */
  files: string[]
}

/**
 * Load env files into `process.env` using Next.js' resolution order.
 *
 * With `mode` being `test` when `NODE_ENV` is `test`, otherwise `development`
 * or `production` depending on `dev`:
 *
 * 1. `.env.{mode}.local`
 * 2. `.env.local` (skipped when `mode` is `test`)
 * 3. `.env.{mode}`
 * 4. `.env`
 *
 * Earlier files win, `$VAR` references are expanded, and variables that are
 * already set in the real environment are never overwritten.
 */
export function loadEnv(options: LoadEnvOptions = {}): LoadEnvResult {
  const {
    cwd = process.cwd(),
    dev = process.env.NODE_ENV !== 'production',
    quiet = false,
    force = false,
  } = options

  const { combinedEnv, loadedEnvFiles } = loadEnvConfig(
    cwd,
    dev,
    quiet ? SILENT_LOG : console,
    force,
  )

  return {
    env: combinedEnv,
    files: loadedEnvFiles.map((file) => file.path),
  }
}
