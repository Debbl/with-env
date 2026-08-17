import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadEnv } from '../src/index.ts'

const FIXTURE = fileURLToPath(new URL('./fixtures/app', import.meta.url))

beforeAll(() => {
  // `@next/env` picks the `test` cascade (and skips `.env.local`) whenever
  // NODE_ENV is `test`, which Vitest sets by default. It also snapshots
  // process.env on its very first call and restores that snapshot on every
  // later one, so both of these have to happen before any load.
  process.env.NODE_ENV = 'development'
  process.env.SHARED_FROM_SHELL = 'from-shell'
})

describe('loadEnv', () => {
  it('applies the development cascade', () => {
    const { env, files } = loadEnv({
      cwd: FIXTURE,
      dev: true,
      quiet: true,
      force: true,
    })

    expect(files).toEqual([
      '.env.development.local',
      '.env.local',
      '.env.development',
      '.env',
    ])
    expect(env.SHARED).toBe('development-local')
    expect(env.DEV_ONLY).toBe('dev')
    expect(env.PROD_ONLY).toBeUndefined()
  })

  it('applies the production cascade, skipping the missing .local file', () => {
    const { env, files } = loadEnv({
      cwd: FIXTURE,
      dev: false,
      quiet: true,
      force: true,
    })

    expect(files).toEqual(['.env.local', '.env.production', '.env'])
    expect(env.SHARED).toBe('local')
    expect(env.PROD_ONLY).toBe('prod')
    expect(env.DEV_ONLY).toBeUndefined()
  })

  it('writes the merged values into process.env', () => {
    loadEnv({ cwd: FIXTURE, dev: true, quiet: true, force: true })

    expect(process.env.SHARED).toBe('development-local')
  })

  it('expands $VAR references', () => {
    const { env } = loadEnv({
      cwd: FIXTURE,
      dev: true,
      quiet: true,
      force: true,
    })

    expect(env.EXPANDED).toBe('base-expanded')
  })

  it('lets the real environment win over the files', () => {
    const { env } = loadEnv({
      cwd: FIXTURE,
      dev: true,
      quiet: true,
      force: true,
    })

    expect(env.SHARED_FROM_SHELL).toBe('from-shell')
  })
})
