import { PodNode } from "@podlite/schema"
import path from "path"

// export const POSTS_PATH = path.join(process.cwd(), "/data")
export const POSTS_PATH = process.env.POSTS_PATH || path.join(process.cwd(), "/pub")

export const DATA_PATH = path.join(process.cwd(), "/built/data.json")
export const IMAGE_LIB = path.join(process.cwd(), "/built/images.ts")
export const COMPONENTS_LIB = path.join(process.cwd(),"/built/components.ts")
export const STYLES_LIB = path.join(process.cwd(),"/built/styles.css")


export const PAGES_FILE_PATH = path.join(process.cwd())
export const ASSETS_PATH = path.join(process.cwd(), "/public/assets")
export const PUBLIC_PATH = path.join(process.cwd(), "/public")

export type SiteInfo = {
    postsPerPage: 4
    favicon: "./favicon.png"
    url: "http://example.com"
    pathPrefix: "/"
    title: "Example"
    subtitle: "Example"
    globalStyles?: string
    node: PodNode
    author: {
      name: "Your name here"
      photo: "./photo.jpg"
      bio: "Keeping this page up to date 💻."
      [name: string]: string
    }
  }
  
export const defaultIndexPage = `
=begin pod  
= :postsPerPage<4> :favicon<./favicon.png>
= :url<http://example.com>
= :pathPrefix("/")

=TITLE 📝 How to make a great post
=SUBTITLE This is a subtitle

=for AUTHOR 
= :name<Your name here>
= :photo<./photo.jpg>
= :bio<Keeping this page up to date 💻.>
= :contact

=para 
Hey, this is a test page!


Powered by podlite.

=end pod
`