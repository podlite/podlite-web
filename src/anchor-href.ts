import { findAnchor, sameDocTarget } from '@podlite/schema'

type AnchorIndex = Parameters<typeof findAnchor>[1]
export type PageContext = { __anchors?: AnchorIndex; __bindings?: unknown } | undefined

const named = (target: string, ctx: PageContext): string | undefined => {
  const anchor = findAnchor(target.slice(1), ctx?.__anchors)
  return anchor === undefined ? undefined : `#${anchor}`
}

// The address a link goes to. An anchor in the page is the id the page gave the
// heading or block, by the same rule: as written, with its spaces run together the
// way a wrapped line runs them, or by the anchors of the page, which a heading with
// a run of spaces in its text is found by. Anything else keeps its written form.
export const anchorHref = (meta: string | null | undefined, ctx: PageContext): string => {
  const target = meta?.trim()
  const written = target?.replace(/\s/g, '-')
  if (!target?.startsWith('#')) return written || '#'
  const found = sameDocTarget(target, ctx) ?? sameDocTarget(target.replace(/\s+/g, ' '), ctx) ?? named(target, ctx)
  return found || written || '#'
}
