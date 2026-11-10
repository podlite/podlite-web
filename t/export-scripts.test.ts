import * as fs from 'fs'
import * as path from 'path'

const scripts: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
).scripts

describe('export scripts', () => {
  it('export-built runs the steps after processing, in order, stopping at the first failure', () => {
    expect(scripts['export-built']).toBe('yarn install && yarn build && yarn makeindex && yarn detach_path')
  })

  it('process installs without removing node_modules', () => {
    expect(scripts.process).toBe('yarn install && yarn clean && yarn publisher_path "$@"')
  })

  it('publisher_path reinstalls from scratch only for a site with its own package.json', () => {
    expect(scripts.publisher_path).toBe(
      'yarn  attach_path ${0:-pub}; yarn install; yarn publisher  -d ${0}  "$@" ${0}\'/**/*.{pod6,podlite}\' && ( [ ! -e ${0}/package.json ] || ( ( (cd ${0} && yarn post_plugin) ; true ) && yarn ci ) )',
    )
  })

  it('export processes the documents once and then runs export-built', () => {
    expect(scripts.export).toBe('yarn process "$@" && yarn export-built')
  })
})
