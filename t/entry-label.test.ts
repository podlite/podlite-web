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

  it('is the label the publisher gives a neighbour, which comes without its node', () => {
    expect(entryLabel({ title: null, label: 'A note about ██████ and nothing else.' })).toBe(
      'A note about ██████ and nothing else.',
    )
  })

  it('is the text of a note, a hidden word masked', () => {
    const label = entryLabel({ title: null, node: note('=para\nA note about G<Numbat> and nothing else.\n') })
    expect(label).not.toContain('Numbat')
    expect(label).toContain('A note about ██████ and nothing else.')
  })

  it('is cut as a page description is when the note is long', () => {
    const long = 'A long note. ' + 'Word '.repeat(80)
    const label = entryLabel({ title: null, label: long })
    expect(label.length).toBeLessThanOrEqual(161)
    expect(label.startsWith('A long note.')).toBe(true)
  })

  it('is the date of a note with no text, a picture alone', () => {
    const picture = note('=para\nP<|https://example.org/photo.png>\n')
    expect(entryLabel({ title: null, label: '', pubdate: '2024-01-03T10:00:00Z' })).toBe('2024-01-03')
    expect(entryLabel({ title: null, node: picture, pubdate: '2024-01-03T10:00:00Z' })).toBe('2024-01-03')
  })

  it('keeps a character whole where the cut falls inside it', () => {
    const label = entryLabel({ title: null, label: 'a'.repeat(159) + '\u{1F600} tail' })
    expect(label).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/)
    expect(label.endsWith('…')).toBe(true)
  })
})
