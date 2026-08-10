import { ProcessWithTemplate } from '@Components/service'
import { publishRecord } from '@podlite/publisher'
import { getTextContentFromNode } from '@podlite/schema'
import Head from 'next/head'
import { contentData, getPage, readRecord } from 'src/serverside'
import { IndexProps } from '.'
import { getSiteInfo } from '../utils'
import { pageDescription } from '../page-description'

export default function AnyPage(params) {
  const { siteTitle, favicon, footer, item, template } = params
  if (template) {
    item.template = template
  }

  // wrap all elements and add line link info
  return (
    <>
      <Head>
        <title>
          {(item as publishRecord).title} - {siteTitle}
        </title>
        <meta
          name="description"
          content={
            item.description
              ? getTextContentFromNode(item.description)
              : pageDescription(item.node, siteTitle + ' ' + (item as publishRecord).title)
          }
        />
        <link rel="shortcut icon" href={`/${favicon}`} />
      </Head>
      <main>{ProcessWithTemplate(item, footer)}</main>
    </>
  )
}

export async function getStaticPaths() {
  const paths = contentData()
    .filter(({ publishUrl }) => publishUrl !== '/')
    .filter(({ publishUrl }) => Boolean(publishUrl))
    .map(({ publishUrl }) => {
      const slug = publishUrl.split('/').slice(1)
      return {
        params: {
          slug,
        },
      }
    })

  return { paths, fallback: false }
}

export async function getStaticProps({ params }) {
  const { slug } = params

  const checkSlug =
    slug =>
    ({ publishUrl }: { publishUrl?: string | null }) => {
      const url = '/' + slug.join('/')
      return publishUrl === url
    }
  const found: any = contentData().find(checkSlug(slug))
  const item: any = found ? getPage(found.publishUrl) : null

  if (!item) {
    const url = '/' + slug.join('/')
    const near: any = contentData().find(
      ({ publishUrl }: any) => typeof publishUrl === 'string' && publishUrl.replace(/\/+$/, '') === url,
    )
    console.error(
      `Page not found for ${url} among ${contentData().length} records.` +
        (near ? ` Closest publish url: ${JSON.stringify(near.publishUrl)} in ${near.file}` : ''),
    )
    process.exit(1)
  }

  const { title: siteTitle, favicon, templateFile }: IndexProps = getSiteInfo()
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
  const footer = getSiteInfo().footer
  return { props: { footer, item, template, siteTitle, favicon } }
}
