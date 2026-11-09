import * as fs from 'fs'
import * as path from 'path'

const scripts: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
).scripts

describe('export scripts', () => {
  it('export-built runs the steps after processing, in order, stopping at the first failure', () => {
    expect(scripts['export-built']).toBe('yarn install && yarn build && yarn makeindex && yarn detach_path')
  })

  it('export processes the documents once and then runs export-built', () => {
    expect(scripts.export).toBe('yarn process "$@" && yarn export-built')
  })
})
