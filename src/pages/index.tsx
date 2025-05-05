import { ProcessWithTemplate } from '@Components/service'
import { publishRecord } from '@podlite/publisher'
import { getTextContentFromNode, PodNode } from '@podlite/schema'
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
  return (
    <div>
      <Head>
        <title>{title}</title>
        <meta name="description" content={item.description ? getTextContentFromNode(item.description) : title} />
        <link rel="shortcut icon" href={`/${favicon}`} />
      </Head>
      <main id="body">{ProcessWithTemplate(item, footer)}</main>
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
  templateFile?: string | null
}

export async function getStaticProps(): Promise<{ props: IndexProps }> {
  writeRss()
  generateSitemap()
  generateRedirects()
  const { title, node, footer, favicon, templateFile }: IndexProps = getSiteInfo()
  const item: any = contentData().find(({ publishUrl }) => publishUrl === '/')
  let template: publishRecord | null = null

  const template_file = item.template_file || templateFile || 'defaultTemplate/defaultSiteTemplate.podlite'
  if (template_file) {
    //@ts-ignore
    template = contentData().find(({ file }) => file.endsWith(template_file)) || null

    if (!template) {
      console.error(`Template not found. Processed file: ${item.file} Template file:${template_file}`)
      process.exit(1)
    }
  }
  return { props: { title, node, footer, favicon, item, template } }
}
export default Home
