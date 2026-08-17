#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { constants } from 'node:os'
import process from 'node:process'
import spawn from 'cross-spawn'
import { parseArgs } from './args.ts'
import { loadEnv } from './index.ts'

const HELP = `
  with-env - load .env files the Next.js way, then run any command

  Usage
    $ with-env [options] <command> [...args]

  Options
    -c, --cwd <dir>  Directory to load env files from (default: cwd)
        --dev        Force the .env.development* cascade
        --prod       Force the .env.production* cascade
    -q, --quiet      Do not report on stderr which env files were loaded
    -h, --help       Show this help
    -v, --version    Show the version

  The first non-option argument starts the command; everything after it is
  passed through untouched. Use -- to run a command that looks like an option.

  Examples
    $ with-env turbo run dev
    $ with-env --prod turbo run build
    $ with-env -c ../.. -- vite --port 3000
`

function fail(message: string): never {
  console.error(`with-env: ${message}`)
  process.exit(1)
}

function readVersion(): string {
  const contents = readFileSync(
    new URL('../package.json', import.meta.url),
    'utf8',
  )

  return (JSON.parse(contents) as { version: string }).version
}

function run(): void {
  let args

  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }

  if (args.version) {
    process.stdout.write(`${readVersion()}\n`)
    return
  }

  if (args.help || args.command.length === 0) {
    process.stdout.write(HELP)
    if (!args.help) process.exitCode = 1
    return
  }

  const { files } = loadEnv({
    cwd: args.cwd,
    dev: args.dev,
    quiet: args.quiet,
  })

  if (!args.quiet) {
    // stderr, so this never mixes into the wrapped command's stdout.
    process.stderr.write(
      files.length > 0
        ? `with-env: loaded ${files.join(', ')}\n`
        : `with-env: no env files found in ${args.cwd ?? process.cwd()}\n`,
    )
  }

  const [command, ...commandArgs] = args.command
  const child = spawn(command, commandArgs, { stdio: 'inherit' })

  const forward = (signal: 'SIGINT' | 'SIGTERM') => {
    if (child.exitCode === null) child.kill(signal)
  }

  process.on('SIGINT', () => forward('SIGINT'))
  process.on('SIGTERM', () => forward('SIGTERM'))

  child.on('error', (error) => {
    fail(`failed to run \`${command}\`: ${error.message}`)
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(128 + constants.signals[signal])
    }

    process.exit(code ?? 1)
  })
}

run()
