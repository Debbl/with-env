import { describe, expect, it } from 'vitest'
import { parseArgs } from '../src/args.ts'

describe('parseArgs', () => {
  it('stops at the command and leaves its flags alone', () => {
    const args = parseArgs([
      '--quiet',
      'turbo',
      'run',
      'dev',
      '--filter',
      'web',
    ])

    expect(args.quiet).toBe(true)
    expect(args.command).toEqual(['turbo', 'run', 'dev', '--filter', 'web'])
  })

  it('never claims a flag that comes after the command', () => {
    const args = parseArgs(['node', '--help'])

    expect(args.help).toBe(false)
    expect(args.command).toEqual(['node', '--help'])
  })

  it('treats -- as an explicit separator', () => {
    const args = parseArgs(['--prod', '--', 'vite', '--port', '3000'])

    expect(args.dev).toBe(false)
    expect(args.command).toEqual(['vite', '--port', '3000'])
  })

  it('reads --cwd in both forms', () => {
    expect(parseArgs(['--cwd', '../..', 'node']).cwd).toBe('../..')
    expect(parseArgs(['--cwd=../..', 'node']).cwd).toBe('../..')
  })

  it('throws when --cwd has no value', () => {
    expect(() => parseArgs(['--cwd'])).toThrow('--cwd needs a directory')
  })

  it('reports no command when only options are given', () => {
    expect(parseArgs(['--quiet']).command).toEqual([])
  })
})
