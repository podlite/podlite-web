import { findAnchor, getTextContentFromNode, sameDocTarget } from '@podlite/schema'

type AnchorIndex = Parameters<typeof findAnchor>[1]
export type PageContext = { __anchors?: AnchorIndex; __bindings?: unknown } | undefined

const keyOf = (link: unknown): unknown =>
  link && typeof link === 'object' ? (link as { headingRef?: unknown }).headingRef : undefined

// @podlite/schema takes the link as a fourth argument from the release with heading keys;
// an older release declares three and leaves a fourth unread
const byKey = (target: string, ctx: PageContext, link: unknown): string | undefined =>
  (sameDocTarget as unknown as (target: string, ctx: unknown, index?: unknown, link?: unknown) => string | undefined)(
    target,
    ctx,
    ctx?.__anchors,
    link,
  ) ?? undefined

const named = (target: string, ctx: PageContext): string | undefined => {
  const anchor = findAnchor(target.slice(1), ctx?.__anchors)
  return anchor === undefined ? undefined : `#${anchor}`
}

// The address a link goes to. An anchor in the page is the id the page gave the
// heading or block, by the same rule: as written, with its spaces run together the
// way a wrapped line runs them, or by the anchors of the page, which a heading with
// a run of spaces in its text is found by. Anything else keeps its written form.
export const anchorHref = (meta: string | null | undefined, ctx: PageContext, link?: unknown): string | undefined => {
  const target = meta?.trim()
  // A link the tree generated, such as a table of contents entry, names its heading by
  // the key the parse gave it. The key is not a name the page has: the address is the
  // anchor of that heading, or none.
  if (typeof keyOf(link) === 'string') return target === undefined ? undefined : byKey(target, ctx, link)
  const written = target?.replace(/\s/g, '-')
  if (!target?.startsWith('#')) return written || '#'
  const found = sameDocTarget(target, ctx) ?? sameDocTarget(target.replace(/\s+/g, ' '), ctx) ?? named(target, ctx)
  return found || written || '#'
}

// The address of a link node, as the page's link rule writes it: its target, or its
// text when it has none.
export const linkAddress = (node: { meta?: string | null }, ctx: PageContext): string | undefined => {
  const meta = node.meta === null || node.meta === undefined ? getTextContentFromNode(node as any) : node.meta
  return anchorHref(meta, ctx, node)
}
