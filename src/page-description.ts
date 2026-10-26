import { getMaskedTextContent } from '@podlite/schema'

const MAX = 160
const MIN_USEFUL = 40

// Cuts on a sentence boundary when one is close enough to the limit, on a word otherwise.
// The label of a note is cut by the same rule.
export const shortText = (text: string): string => {
  if (text.length <= MAX) return text
  // a cut between the two halves of a surrogate pair would leave half a character
  const head = text.slice(0, /[\uD800-\uDBFF]/.test(text[MAX - 1]) ? MAX - 1 : MAX)
  const sentence = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '))
  if (sentence > MAX / 2) return head.slice(0, sentence + 1)
  const word = head.lastIndexOf(' ')
  return (word > 0 ? head.slice(0, word) : head) + '…'
}

// A page without its own DESCRIPTION used to fall back to the title, which says nothing twice.
export function pageDescription(node: unknown, fallback: string): string {
  const found = firstParagraph(node)
  return found ? shortText(found) : fallback
}

function firstParagraph(node: any): string {
  if (!node) return ''
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = firstParagraph(child)
      if (found) return found
    }
    return ''
  }
  if (typeof node !== 'object') return ''
  if (node.type === 'block' && (node.name === 'head' || node.name === 'TITLE' || node.name === 'SUBTITLE')) return ''
  if (node.type === 'para') {
    // a hidden word stays masked; the mask keeps the length, so the choice of paragraph is the same
    const text = getMaskedTextContent(node).replace(/\s+/g, ' ').trim()
    return text.length >= MIN_USEFUL ? text : ''
  }
  return firstParagraph(node.content)
}
