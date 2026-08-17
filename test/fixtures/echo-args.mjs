import process from 'node:process'

process.stdout.write(process.argv.slice(2).join('|'))
