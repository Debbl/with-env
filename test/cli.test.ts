import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const CLI = fileURLToPath(new URL('../dist/cli.mjs', import.meta.url))
const FIXTURE = fileURLToPath(new URL('./fixtures/app', import.meta.url))
const ECHO_ARGS = fileURLToPath(
  new URL('./fixtures/echo-args.mjs', import.meta.url),
)

// These drive the built artifact under plain Node, which is the only place
// CJS/ESM interop problems in the bundle actually surface: Vite's interop
// papers over them, so importing the source would not catch a regression.
beforeAll(() => {
  if (!existsSync(CLI)) {
    throw new Error(
      'dist/cli.mjs is missing, run `pnpm build` before `pnpm test`',
    )
  }
})

function run(args: string[], env: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

function readEnvVar(name: string, args: string[], env: Record<string, string>) {
  return run(
    [
      ...args,
      process.execPath,
      '-e',
      `process.stdout.write(process.env.${name} ?? '')`,
    ],
    env,
  )
}

describe('cli', () => {
  it('prints its own version', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string }

    expect(run(['--version']).stdout.trim()).toBe(pkg.version)
  })

  it('loads the development cascade into the child process', () => {
    const { stdout, status } = readEnvVar('SHARED', ['-q', '-c', FIXTURE], {
      NODE_ENV: 'development',
    })

    expect(status).toBe(0)
    expect(stdout).toBe('development-local')
  })

  it('loads the production cascade into the child process', () => {
    const { stdout } = readEnvVar('SHARED', ['-q', '-c', FIXTURE], {
      NODE_ENV: 'production',
    })

    expect(stdout).toBe('local')
  })

  it('reports the loaded files on stderr, leaving stdout clean', () => {
    const { stdout, stderr } = readEnvVar('SHARED', ['-c', FIXTURE], {
      NODE_ENV: 'development',
    })

    expect(stderr).toContain('.env.local')
    expect(stdout).toBe('development-local')
  })

  it('forwards the command its own flags', () => {
    const { stdout } = run([
      '-q',
      '-c',
      FIXTURE,
      process.execPath,
      ECHO_ARGS,
      '--port',
      '3000',
      '--help',
    ])

    expect(stdout).toBe('--port|3000|--help')
  })

  it('passes the command exit code through', () => {
    const { status } = run([
      '-q',
      '-c',
      FIXTURE,
      process.execPath,
      '-e',
      'process.exit(3)',
    ])

    expect(status).toBe(3)
  })

  it('exits 1 with usage when no command is given', () => {
    const { status, stdout } = run(['-q'])

    expect(status).toBe(1)
    expect(stdout).toContain('Usage')
  })

  it('exits 1 when the command does not exist', () => {
    const { status, stderr } = run([
      '-q',
      '-c',
      FIXTURE,
      'definitely-not-a-real-command',
    ])

    expect(status).toBe(1)
    expect(stderr).toContain('failed to run')
  })
})
