import makeInterator from "@podlite/schema/lib/ast-inerator"
import React from "react"
import { addUrl } from "../src/shared"
import { convertFileLinksToUrl, parseFiles } from "../src/node-utils"
import { getTextContentFromNode } from "@podlite/schema"

it("parseFiles", () => {
  const arr = parseFiles("./t/test-linking/*.pod6")
  // console.log(JSON.stringify(arr, null, 2));
  expect(arr.length).toEqual(2)
  // console.log(parseToHtml(nodes));
  // expect(parseToHtml(pod)).toMatchInlineSnapshot(
  // expect(true).toEqual(true)
})
it("collect links", () => {
  const arr = parseFiles("./t/test-linking/*.pod6")
  const converted = convertFileLinksToUrl(addUrl(arr))
  const res = converted
    .map(({ node }) => {
      let links: any[] = []
      makeInterator({
        "L<>": ({ content, meta }) => {
          links = [...links, meta ? meta : getTextContentFromNode(content)]
        },
      })(node, {})
      return links
    })
    .flat()

  expect(res).toMatchInlineSnapshot(`
    Array [
      "/2023/4/1/2",
    ]
  `)
})
