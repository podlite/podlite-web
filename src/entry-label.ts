import moment from 'moment'
import { getMaskedTextContent } from '@podlite/schema'
import { shortText } from './page-description'

type Entry = { title?: string | null; label?: string; node?: unknown; pubdate?: string | null }

// A note has no title, so its text names it in lists and in the links to the
// next and previous entry. The text goes out past the renderer, so a hidden word
// is written masked; the publisher masks a title itself, and for a neighbour, which
// it gives without its node, it writes the masked text as the label. A long note is
// cut as a page description is; a note with no text, a picture alone, is named by
// its date.
export const entryLabel = ({ title, label, node, pubdate }: Entry): string => {
  if (title) return title
  const text = (label ?? getMaskedTextContent(node)).replace(/\s+/g, ' ').trim()
  if (text) return shortText(text)
  return pubdate ? moment(pubdate).format('YYYY-MM-DD') : ''
}
