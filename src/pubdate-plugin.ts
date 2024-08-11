import { getFromTree, getTextContentFromNode, makeAttrs, mkRootBlock, PodNode } from '@podlite/schema'
import { getPublishAttributes } from './node-utils'
import { PodliteWebPlugin, PodliteWebPluginContext } from './plugins'
import { addUrl, publishRecord } from './shared'
export interface PodliteWebPluginParams {
  [name: string]: any
}

