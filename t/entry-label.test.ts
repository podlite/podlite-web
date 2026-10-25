import { podlite } from 'podlite'
import { entryLabel } from '../src/entry-label'

const note = (text: string): any => {
  const p = podlite({ importPlugins: true })
  return p.toAst(p.parse(text, { podMode: 1 }))
}

describe('the label of an entry', () => {
  it('is its title when it has one', () => {
    expect(entryLabel({ title: 'Six years later', node: note('=para\nText.\n') })).toBe('Six years later')
  })

  it('is the text of a note, a hidden word masked', () => {
    const label = entryLabel({ title: null, node: note('=para\nA note about G<Numbat> and nothing else.\n') })
    expect(label).not.toContain('Numbat')
    expect(label).toContain('A note about ██████ and nothing else.')
  })
})
