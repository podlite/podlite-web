import { ArticlesWithNavigation, Page } from "@Components/service"
import { contentData, getPostComponent } from "../utils"

export default function AnyPage({ slug }) {

  const checkSlug = (slug) => ({ publishUrl }) => {
    const url = "/" + slug.join("/")
    return publishUrl === url
  }
  const item: any = contentData().find(checkSlug(slug))
  const allData = item.type !== 'page' ? contentData().filter(({type=''}:any)=>type !== 'page') :  contentData()
  const articleIndex = allData.findIndex(checkSlug(slug))
  const prev = allData[articleIndex - 1]
  const current:any = allData[articleIndex]
  const next = allData[articleIndex + 1]
  // wrap all elements and add line link info
  return (
    <>
      <main>
      { item.type === 'page' ? 
        Page(item)   : <ArticlesWithNavigation articles={[current]} prev={prev} next={next}/>
    }
      </main>
    </>
  )
}

export async function getStaticPaths() {
  const paths = contentData().map(({ publishUrl }) => {
    const slug = publishUrl.split("/").slice(1)
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
  return { props: { slug } }
}
