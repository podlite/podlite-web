import { ProcessWithTemplate } from '@Components/service'
import { publishRecord } from '@podlite/publisher'
import { getTextContentFromNode } from '@podlite/schema'
import Head from 'next/head'
import { contentData } from 'src/serverside'
import { IndexProps } from '.'
import { getSiteInfo } from '../utils'

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
              : siteTitle + ' ' + (item as publishRecord).title
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
    ({ publishUrl }) => {
      const url = '/' + slug.join('/')
      return publishUrl === url
    }
  const item: any = contentData().find(checkSlug(slug))
  const allData = item.type !== 'page' ? contentData().filter(({ type = '' }: any) => type !== 'page') : contentData()
  const articleIndex = allData.findIndex(checkSlug(slug))
  const { title: siteTitle, favicon, templateFile }: IndexProps = getSiteInfo()
  let template = null
  const template_file = item.template_file || templateFile || 'defaultTemplate/defaultSiteTemplate.podlite'
  if (template_file) {
    //@ts-ignore
    template = contentData().find(({ file }) => file.endsWith(template_file)) || null

    if (!template) {
      console.error(`Template not found. Processed file: ${item.file} Template file:${template_file}`)
      process.exit(1)
    }
  }
  const footer = getSiteInfo().footer
  return { props: { footer, item, template, siteTitle, favicon } }
}
