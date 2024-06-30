it('detect parser type', () => {
  expect(getParserTypeforFile('somefile.txt')).toEqual('default')
  expect(getParserTypeforFile('somefile.pod6')).toEqual('podlite')
  expect(getParserTypeforFile('somefile.podlite')).toEqual('podlite')
  expect(getParserTypeforFile('somefile.md')).toEqual('markdown')
  expect(getParserTypeforFile('somefile.markdown')).toEqual('markdown')
  expect(getParserTypeforFile('somefile.tsx')).toEqual('default')
})

