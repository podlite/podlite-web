import { getMaskedTextContent } from '@podlite/schema'

type Entry = { title?: string | null; node?: unknown }

// A note has no title, so its text names it in lists and in the links to the
// next and previous entry. The text goes out past the renderer, so a hidden word
// is written masked. The publisher masks a title itself.
export const entryLabel = ({ title, node }: Entry): string => title || getMaskedTextContent(node)
