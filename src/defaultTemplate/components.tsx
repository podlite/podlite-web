import styles from '../components/service.module.css'
import Link from 'next/link'
import { getTextContentFromNode } from '@podlite/schema'
import moment from 'moment'
import { getSiteInfo } from 'src/utils'

export const DefaultTemplateComponent = ({ id: er, children, item, renderNode, getOpt }) => {
  const { id, title, subtitle, footer, template, header, shortUrl, publishUrl, pubdate } = item
  const [_, domain = ''] = getSiteInfo().url.split(/\/\//)
  const { footer: default_footer } = getOpt() || { footer: null }
  const result_footer = footer || default_footer
  // special renedring for root page
  if (publishUrl === '/') {
    return (
      <>
        {item && renderNode(item.node)}
        {result_footer && renderNode(result_footer)}
      </>
    )
  }
  const Article: React.FC = () => (
    <article key={id}>
      <header>
        {item.publishUrl !== '/' && <h1>{title}</h1>}
        {subtitle && <div className="abstract">{subtitle}</div>}
      </header>
      {item && renderNode(item.node)}
      <footer>
        {shortUrl && (
          <>
            <a href={shortUrl}>
              {domain}
              {shortUrl}
            </a>

            <Link href={publishUrl}>{moment(pubdate).format('H:mm on YYYY-MM-DD')}</Link>
          </>
        )}
      </footer>
    </article>
  )
  if (item.type === 'page') {
    return (
      <>
        <Article />
        <TestComponent id="nav">
          <></>
          <div className="navigate">{/* &nbsp; */}</div>
          <></>
        </TestComponent>
        {result_footer && renderNode(result_footer)}
      </>
    )
  } else {
    const makeLink = (title, url) => <Link href={url}>{title}</Link>
    const { prev, next } = item?.pluginsData?.navigate ? item.pluginsData.navigate : { prev: false, next: false }
    return (
      <>
        <Article />
        <TestComponent id="nav">
          {prev && makeLink(prev.title || getTextContentFromNode(prev.node), prev.publishUrl)}
          {
            <div className="navigate">
              {prev ? makeLink('←', prev.publishUrl) : <Link href="#"> </Link>}
              <Link href="/">↑</Link>
              {next ? makeLink('→', next.publishUrl) : <Link href="#"> </Link>}
            </div>
          }
          {next && makeLink(next.title || getTextContentFromNode(next.node), next.publishUrl)}
        </TestComponent>
        {result_footer && renderNode(result_footer)}
      </>
    )
  }
  // if (item?.pluginsData?.moduleInfo) {
  //   return (
  //     <TwoColumnLayout
  //       LeftContent={Article}
  //       RightContent={() => (
  //         <>
  //           <RakuModuleInfo data={item?.pluginsData?.moduleInfo} />
  //         </>
  //       )}
  //     />
  //   );
  // }
  return <Article />
}

export const TestComponent = ({ id, children }) => {
  var style = { '--count-columns ': children.length } as React.CSSProperties
  return (
    <div id={id} className={styles.Conatainer} style={style}>
      <div className={styles.row}>
        {children.map((i, c) => (
          <div className={styles.column} key={c}>
            {i}
          </div>
        ))}
      </div>
    </div>
  )
}

// export const Page = (item, footer) => {
//   const { title, node, shortUrl, key, publishUrl, pubdate, subtitle } = item
//   return (
//     <>
//       <article key={key}>
//         <header>
//           <h1>{title}</h1>
//           {subtitle && <div className="abstract">{subtitle}</div>}
//         </header>
//         {getPostComponent(node, item)}
//       </article>
//       <TestComponent id="nav">
//         <></>
//         <div className="navigate">
//           &nbsp;<Link href="/">↑</Link>&nbsp;
//         </div>
//         <></>
//       </TestComponent>
//       {footer && getPostComponent(footer, item)}
//     </>
//   )
// }
