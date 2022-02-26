import "../styles/pod6.css"
import "../../built/styles.css"
import type { AppProps } from "next/app"

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp
