import plugin from '../bin/mount-tests-plugin'
import { Prepared } from '../bin/mounts'
import { publishRecord } from '@podlite/publisher'

const mount = (dir: string | null) => ({ name: 'spec', repo: 'r', ref: 'main', dir, sha: null, from: 'cache' } as Prepared)
const record = (file: string) => ({ file, publishUrl: '/x' } as publishRecord)

describe('the test files of a mounted specification', () => {
  it('leave the records, and every other file stays', () => {
    const [process] = plugin([mount('.mounts/spec-v3.0'), mount(null)])
    const files = ['.mounts/spec-v3.0/t/a.podlite', '.mounts/spec-v3.0/Specification.pod6', './pub/t/note.podlite']
    expect(process(files.map(record)).map(r => r.file)).toEqual(files.slice(1))
  })
})
