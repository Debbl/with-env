export interface ParsedArgs {
  cwd: string | undefined
  dev: boolean | undefined
  quiet: boolean
  help: boolean
  version: boolean
  /** The command to run, followed by its own arguments. */
  command: string[]
}

/**
 * Parse the arguments that belong to `with-env` itself and stop at the first
 * one that does not, so the command keeps its own flags untouched.
 *
 * @throws when an option that needs a value does not get one
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    cwd: undefined,
    dev: undefined,
    quiet: false,
    help: false,
    version: false,
    command: [],
  }

  let index = 0

  while (index < argv.length) {
    const arg = argv[index]

    if (arg === '--') {
      index++
      break
    } else if (arg === '-h' || arg === '--help') {
      parsed.help = true
    } else if (arg === '-v' || arg === '--version') {
      parsed.version = true
    } else if (arg === '-q' || arg === '--quiet') {
      parsed.quiet = true
    } else if (arg === '--dev') {
      parsed.dev = true
    } else if (arg === '--prod') {
      parsed.dev = false
    } else if (arg === '-c' || arg === '--cwd') {
      if (index + 1 >= argv.length) {
        throw new Error(`${arg} needs a directory`)
      }

      parsed.cwd = argv[index + 1]
      index++
    } else if (arg.startsWith('--cwd=')) {
      parsed.cwd = arg.slice('--cwd='.length)
    } else {
      // Not ours: the command starts here.
      break
    }

    index++
  }

  parsed.command = argv.slice(index)

  return parsed
}
