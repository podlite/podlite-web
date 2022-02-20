import "../styles/pod6.css"
import "../styles/new.css"
// import "../../datajsx/page.scss"
import type { AppProps } from "next/app"

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp
