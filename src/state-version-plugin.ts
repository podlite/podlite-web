import { PodliteWebPlugin, PodliteWebPluginContext } from './plugins'
import * as CRC32 from 'crc-32'
import { publishRecord } from './shared'
import { getTextContentFromNode } from '@podlite/schema'
const version = require('../package.json').version
const plugin = (): PodliteWebPlugin => {
  const outCtx: PodliteWebPluginContext = {}
  let crc_sum = ''
  const onExit = ctx => {
    outCtx.stateVersion = CRC32.str(crc_sum) + '+v' + version
    return { ...ctx, ...outCtx }
  }
  const getStateVersion = (allREcords): string => {
    return allREcords.reduce((prev, current) => {
      return prev + CRC32.str(getTextContentFromNode(current.node))
    }, '')
  }
  const onProcess = (recs: publishRecord[]) => {
    crc_sum += getStateVersion(recs)
    return recs
  }

  return [onProcess, onExit]
}

export default plugin
