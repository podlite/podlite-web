import { ProcessWithTemplate } from '@Components/service'
import type { publishRecord } from '@podlite/publisher'
import { PodNode } from '@podlite/schema'
import Head from 'next/head'
import { contentData, getPage, readRecord } from 'src/serverside'
import { generateRedirects } from 'src/utils/redirects'
import { DataFeedContent } from '../../bin/makeDataSource'
import { Indexing } from '../../bin/indexing-policy-plugin'
import { getPostComponent, getSiteInfo } from '../utils'
import { writeRss } from '../utils/rss'
import { generateSitemap } from '../utils/sitemap'

type HomeProps = Omit<IndexProps, 'title' | 'node'>

const Home = ({ footer, favicon, template, item }: HomeProps) => {
  if (template) {
    item.template = template
  }
  return (
    <div>
      <Head>
        <link rel="shortcut icon" href={`/${favicon}`} />
      </Head>
      <main id="body" data-pagefind-ignore={item?.indexing?.search === false ? true : undefined}>{ProcessWithTemplate(item, footer)}</main>
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
  item: publishRecord & { indexing?: Indexing }
  template?: publishRecord | null
  templateFile?: string | null
}

export async function getStaticProps(): Promise<{ props: HomeProps }> {
  writeRss()
  generateSitemap()
  generateRedirects()
  const { footer, favicon, templateFile }: IndexProps = getSiteInfo()
  const item: any = getPage('/')
  let template: publishRecord | null = null

  const template_file = item.template_file || templateFile || 'defaultTemplate/defaultSiteTemplate.podlite'
  if (template_file) {
    //@ts-ignore
    const templateRecord = contentData().find(({ file }) => file.endsWith(template_file))
    template = templateRecord ? readRecord(templateRecord) : null

    if (!template) {
      console.error(`Template not found. Processed file: ${item.file} Template file:${template_file}`)
      process.exit(1)
    }
  }
  return { props: { footer, favicon, item, template } }
}
export default Home
