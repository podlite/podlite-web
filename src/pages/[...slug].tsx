import { ArticlesWithNavigation, Page, ProcessWithTemplate } from '@Components/service'
import { publishRecord } from '@podlite/publisher'
import Head from 'next/head'
import { contentData } from 'src/serverside'
import { IndexProps } from '.'
import { getSiteInfo } from '../utils'

export default function AnyPage(params) {
  const { siteTitle, favicon, slug, footer, item, current, prev, next, template } = params
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
        <meta name="description" content={siteTitle + ' ' + (item as publishRecord).title} />
        <link rel="shortcut icon" href={`/${favicon}`} />
      </Head>
      <main>
        {item.template ? (
          ProcessWithTemplate(item, footer)
        ) : item.type === 'page' ? (
          Page(item, footer)
        ) : (
          <ArticlesWithNavigation footer={footer} articles={[current]} prev={prev} next={next} />
        )}
      </main>
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
  const prev = allData[articleIndex - 1] || false
  const current: any = allData[articleIndex] || false
  const next = allData[articleIndex + 1] || false
  const { title: siteTitle, favicon }: IndexProps = getSiteInfo()
  let template = null
  if (item.template_file) {
    //@ts-ignore
    template = contentData().find(({ file }) => file === item.template_file)
  } else {
    console.warn('no template found')
  }
  const footer = getSiteInfo().footer
  return { props: { slug, footer, item, prev, current, next, template, siteTitle, favicon } }
}
