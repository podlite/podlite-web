import { ArticlesWithNavigation, Page, ProcessWithTemplate } from '@Components/service'
import { contentData, getSiteInfo } from '../utils'

export default function AnyPage(params) {
  const { slug, footer, item, current, prev, next } = params
  // wrap all elements and add line link info
  return (
    <>
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

  const footer = getSiteInfo().footer
  return { props: { slug, footer, item, prev, current, next } }
}
