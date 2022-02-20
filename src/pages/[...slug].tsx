import { contentData, getPostComponent } from "../utils"

export default function Page({ slug }) {
  const data = contentData().filter(({ publishUrl }) => {
    const url = "/" + slug.join("/")
    return publishUrl.match(url)
  })[0]
  // wrap all elements and add line link info
  return (
    <>
      <main>
        {/* 
            //@ts-ignore */}
        <article>
        {getPostComponent(data.node)}
        </article>
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
