// mermaid ships as ESM-only; podlite-web SSR unit tests never render diagrams,
// so a stub keeps the import resolvable under the CommonJS jest runner.
module.exports = {
  initialize: () => {},
  render: () => Promise.resolve({ svg: '' }),
}
