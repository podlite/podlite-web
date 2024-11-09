import { publishRecord } from '@podlite/publisher'
import { PodNode } from '@podlite/schema'
import Head from 'next/head'
import { contentData } from 'src/serverside'
import { generateRedirects } from 'src/utils/redirects'
import { DataFeedContent } from '../../bin/makeDataSource'
import { getPostComponent, getSiteInfo } from '../utils'
import { writeRss } from '../utils/rss'
import { generateSitemap } from '../utils/sitemap'

const Home = ({ title, node, footer, favicon, template, item }: IndexProps) => {
  if (template) {
    item.template = template
  }
  const processTemplate = (item: publishRecord, template: publishRecord) => {
    const { footer: footer_tempalte, header: header_tempalte } = template
    const renderFooter = footer_tempalte
    const renderHeader = header_tempalte
    return (
      <>
        {renderHeader && getPostComponent(renderHeader, item)}
        {getPostComponent(item?.template?.node || item.node, item)}
        {renderFooter && getPostComponent(renderFooter, item)}
      </>
    )
  }
  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta name="description" content={title} />
        <link rel="shortcut icon" href={`/${favicon}`} />
      </Head>
      <main id="body">
        {template && processTemplate(item, template)}

        {!template && getPostComponent(node)}
        {!template && footer && getPostComponent(footer)}
      </main>
    </div>
  )
}
interface SiteProps extends Partial<DataFeedContent['siteInfo']> {}
export interface IndexProps {
  url?: string
  title: string
  node: PodNode
  footer: PodNode
  favicon: string
  item: publishRecord
  template?: publishRecord | null
}

export async function getStaticProps(): Promise<{ props: IndexProps }> {
  writeRss()
  generateSitemap()
  generateRedirects()
  const { title, node, footer, favicon, item }: IndexProps = getSiteInfo()
  let template: publishRecord | null = null
  if (item.template_file) {
    // @ts-ignore
    template = contentData().find(({ file }) => file === item.template_file) || null
  } else {
    console.log('no template found')
  }
  return { props: { title, node, footer, favicon, item, template } }
}
export default Home
