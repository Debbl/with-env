# @debbl/with-env

Load `.env` files the Next.js way, then run any command.

Next.js has the env-file behaviour most people actually want — a `.env.local`
that overrides `.env`, a mode-specific cascade, `$VAR` expansion, and real
environment variables always winning. It ships that logic as `@next/env`, but
only as an API. This is that API plus a process wrapper, so anything can use it:
`turbo`, `vite`, `wrangler`, `tsx`, a plain node script.

## Install

```bash
pnpm add -D @debbl/with-env
```

## CLI

```bash
with-env turbo run dev
with-env --prod turbo run build
with-env -c ../.. -- vite --port 3000
```

The first non-option argument starts the command. Everything after it is passed
through untouched, so the command keeps its own flags — `with-env turbo run dev
--filter web` gives `--filter web` to `turbo`, not to `with-env`. Use `--` when
the command itself looks like an option.

| Option            | Description                                     |
| ----------------- | ----------------------------------------------- |
| `-c, --cwd <dir>` | Directory to load env files from (default: cwd) |
| `--dev`           | Force the `.env.development*` cascade           |
| `--prod`          | Force the `.env.production*` cascade            |
| `-q, --quiet`     | Do not report on stderr which files were loaded |
| `-h, --help`      | Show help                                       |
| `-v, --version`   | Show the version                                |

The "loaded ..." line goes to stderr, never stdout, so piping the wrapped
command's output stays clean. The command's exit code is passed through, and
`SIGINT`/`SIGTERM` are forwarded to it.

## API

```ts
import { loadEnv } from '@debbl/with-env'

const { env, files } = loadEnv({ quiet: true })
```

`loadEnv` applies the files to `process.env` and returns the merged `env` plus
the `files` it read, in precedence order.

| Option  | Default                     | Description                                          |
| ------- | --------------------------- | ---------------------------------------------------- |
| `cwd`   | `process.cwd()`             | Directory to look in                                 |
| `dev`   | `NODE_ENV !== 'production'` | Development or production cascade                    |
| `quiet` | `false`                     | Silence `@next/env`'s error output                   |
| `force` | `false`                     | Reload even if this process already loaded env files |

## Resolution order

With `mode` being `development` or `production`, earlier files win:

1. `.env.{mode}.local`
2. `.env.local`
3. `.env.{mode}`
4. `.env`

Variables already set in the real environment are never overwritten, so
`FOO=1 with-env ...` beats every file.

## Caveats

**Turborepo filters env vars.** Since Turborepo 2.0 `envMode` defaults to
`strict`, which means tasks only receive the variables declared in
`turbo.json`. Loading files before `turbo` is necessary but not sufficient —
you also need:

```json
{
  "globalEnv": ["MY_SECRET"],
  "globalDependencies": [".env", ".env.local"]
}
```

`globalDependencies` makes the env files part of the cache key, so changing a
value does not hit a stale cache. `eslint-plugin-turbo`'s
`no-undeclared-env-vars` rule catches the ones you forget.

**`NODE_ENV=test` overrides the cascade.** `@next/env` selects the `test` mode
and skips `.env.local` entirely whenever `NODE_ENV` is `test`, regardless of
`--dev` / `--prod`.

**Env files are loaded once per process.** `@next/env` caches its result and
snapshots `process.env` on the first call. Pass `force` to reload.

**Sandboxed runtimes do not see `process.env`.** Wrapping `wrangler dev` loads
the files into the wrangler process, not into the Worker — Cloudflare populates
the Worker's `process.env` from `vars` and `.dev.vars`. Same for any runtime
with its own environment.

## License

MIT
