import {
  bindTarget,
  findAnchor,
  getSafeNodeId,
  getTextContentFromNode,
  guardedTextLeaves,
  isCovered,
  sameDocTarget,
} from '@podlite/schema'

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

// The anchor the page gave the block hidden text names, a name the page shows already,
// or none. It is read from the page and never made up from the text: the helpers that
// find an address fall back to the text itself when the page has no such block.
const pageAnchor = (target: string, ctx: PageContext): string | undefined => {
  if (target === '#') return undefined
  const bindings = ctx?.__bindings as Parameters<typeof bindTarget>[1] | undefined
  if (bindings)
    for (const name of [target, target.replace(/\s+/g, ' ')]) {
      const bound = bindTarget(name.slice(1), bindings)
      if (!bound.found) continue
      // a copy of the context, so asking takes no anchor from the headings still to come
      const id =
        ctx?.__anchors?.byNode.get(bound.node) ?? getSafeNodeId(bound.node as any, { ...ctx, __fragments: new Map() })
      return id == null ? undefined : `#${id}`
    }
  return named(target, ctx)
}

// The address a link goes to. An anchor in the page is the id the page gave the
// heading or block, by the same rule: as written, with its spaces run together the
// way a wrapped line runs them, or by the anchors of the page, which a heading with
// a run of spaces in its text is found by. Anything else keeps its written form,
// unless the address was hidden text: then only an anchor the page found is given.
export const anchorHref = (
  meta: string | null | undefined,
  ctx: PageContext,
  link?: unknown,
  hidden = false,
): string | undefined => {
  const target = meta?.trim()
  // A link the tree generated, such as a table of contents entry, names its heading by
  // the key the parse gave it. The key is not a name the page has: the address is the
  // anchor of that heading, or none.
  if (typeof keyOf(link) === 'string') return target === undefined ? undefined : byKey(target, ctx, link)
  const written = target?.replace(/\s/g, '-')
  if (!target?.startsWith('#')) return hidden ? undefined : written || '#'
  if (hidden) return pageAnchor(target, ctx)
  const found = sameDocTarget(target, ctx) ?? sameDocTarget(target.replace(/\s+/g, ' '), ctx) ?? named(target, ctx)
  return found || written || '#'
}

// The address of a link node, as the page's link rule writes it: its target, or its
// text when it has none. A text hidden in whole or in part is hidden in the address
// too, so such a link goes nowhere, unless the page found the heading it names.
export const linkAddress = (node: { meta?: string | null }, ctx: PageContext): string | undefined => {
  if (node.meta !== null && node.meta !== undefined) return anchorHref(node.meta, ctx, node)
  const hidden = isCovered({ guarded: guardedTextLeaves(node).some(leaf => leaf.guarded) }, ctx as any)
  return anchorHref(getTextContentFromNode(node as any), ctx, node, hidden)
}
