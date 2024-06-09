import { Head, Html, Main, NextScript } from 'next/document'
import { getData } from 'src/utils'

export default function Document() {
  return (
    <Html className="bg-default">
      <Head>
        <LoadGoogleTagManager />
        <InitGoogleTagManager />
      </Head>
      <body>
        <GoogleTagManagerNoScript />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

const GTM_ID = getData().siteInfo.gtmId

function LoadGoogleTagManager() {
  if (!GTM_ID) return null
  return (
    // eslint-disable-next-line @next/next/next-script-for-ga
    <script
      dangerouslySetInnerHTML={{
        __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer', '${GTM_ID}');
            `,
      }}
    />
  )
}

function InitGoogleTagManager() {
  if (!GTM_ID) return null
  return (
    <>
      {/* Global Site Tag (gtag.js) - Google Analytics */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GTM_ID}', {
                page_path: window.location.pathname,
              });
            `,
        }}
      />
    </>
  )
}

function GoogleTagManagerNoScript() {
  if (!GTM_ID) return null
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      ></iframe>
    </noscript>
  )
}
