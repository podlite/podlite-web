import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

// The build itself, on a site with a page whose doc: links name no published document.
const build = (...flags: string[]) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'links-warn-'))
  try {
    const pub = path.join(dir, 'pub')
    fs.mkdirSync(pub)
    fs.writeFileSync(path.join(pub, 'index.podlite'), '=begin pod :puburl</>\n=TITLE Home\n\nWelcome.\n=end pod\n')
    fs.writeFileSync(
      path.join(pub, 'page.podlite'),
      "=begin pod :puburl</page> :pubdate('2026-10-01 10:00:00')\n=TITLE Page\n\n" +
        'See L<doc:Missing> and L<doc:Home>.\n\nAnd L<doc:Absent> here.\n=end pod\n',
    )
    const args = ['bin/publisher.ts', '-d', pub, '-i', path.join(pub, 'index.podlite')]
    args.push('-b', path.join(dir, 'built'), '-p', path.join(dir, 'public'), '--preset', 'pubdate', '--no-lint')
    const run = spawnSync(path.resolve('node_modules/.bin/tsx'), [...args, ...flags, `${pub}/**/*.podlite`], {
      encoding: 'utf8',
    })
    return { status: run.status, output: `${run.stdout}${run.stderr}` }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

describe('a doc: link that does not resolve', () => {
  const named =
    /page\.podlite:4: .*doc:Missing: no published document is named Missing[\s\S]*page\.podlite:6: .*doc:Absent/

  it('stops the build by default and names every such link', () => {
    const { status, output } = build()
    expect(status).not.toBe(0)
    expect(output).toMatch(named)
  })

  it('lets the build go on with --links-warn, and names every such link in a warning', () => {
    const { status, output } = build('--links-warn')
    expect(status).toBe(0)
    expect(output).toMatch(/\[links\] a link does not resolve/)
    expect(output).toMatch(named)
  })
})
