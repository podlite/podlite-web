import { getArticlesGroupedByYearMonth, getPostComponent, getSiteInfo } from 'src/utils'
import moment from 'moment'
import 'moment/min/locales.min'
import styles from './service.module.css'
import cookieConsentStyles from './cookieConsentStyles.module.css'

import Link from 'next/link'
import { DataFeedContent } from 'bin/makeDataSource'
import { getFromTree, getTextContentFromNode } from '@podlite/schema'
import { useState } from 'react'
import { publishRecord } from '@podlite/publisher'
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

export const Contents = ({ locale = 'en', getThisNode }) => {
  moment.locale(locale)
  // get embeded json in =data blocks
  const [content] = getFromTree(getThisNode(), 'data').map(n => JSON.parse(getTextContentFromNode(n)))
  if (!content) {
    console.warn(
      `[React =Contents composnent] not found JSON. usually it defined by use =Include =Include doc:PLUGIN_DATA#articles `,
    )
    return null
  }

  const groupedByYearMonth = getArticlesGroupedByYearMonth(content)

  const res: JSX.Element[] = []
  for (const year of Object.keys(groupedByYearMonth).sort((a, b) => parseInt(b, 10) - parseInt(a, 10))) {
    const months: publishRecord[] = groupedByYearMonth[year]
    let isYearAlreadyPut = false
    for (const month of Object.keys(months).sort((a, b) => parseInt(b, 10) - parseInt(a, 10))) {
      const monthRecord = (
        <>
          <h3>
            {!isYearAlreadyPut && <time>{year}</time>}
            <time>
              {moment(`${year}-${parseInt(month, 10) + 1}`, ['YYYY-MM'])
                .format('MMMM')
                .toUpperCase()}
            </time>
          </h3>
          {months[month].map(({ publishUrl, title, pubdate, node }) => (
            <Link href={publishUrl} key={publishUrl}>
              <a href={publishUrl}>
                <p>{title || getTextContentFromNode(node)}</p>
                <hr />
                <time dateTime={moment(pubdate).format('YYYY-MM-DD')}>{moment(pubdate).format('Do')}</time>
              </a>
            </Link>
          ))}
        </>
      )
      isYearAlreadyPut = true
      res.push(monthRecord)
    }
  }
  return <div className="details">{res}</div>
}

export const ProcessWithTemplate = (item, default_footer) => {
  const { id, title, subtitle, footer, template, header } = item
  const { footer: footer_tempalte, header: header_tempalte } = template
  const renderFooter = footer_tempalte || footer || default_footer
  const renderHeader = header_tempalte || header
  return (
    <>
      {/* TODO: Deprecate =FOOTER and =HEADER 👇 */}
      {/* {renderHeader && getPostComponent(renderHeader, item)} */}
      {getPostComponent(item.template.node, item, { footer: default_footer })}
      {/* TODO: Deprecate =FOOTER and =HEADER 👇 */}
      {/* {renderFooter && getPostComponent(renderFooter, item)} */}
    </>
  )
}

const ArticlesWithNavigation = ({
  articles,
  prev,
  next,
  footer,
  renderNode,
}: {
  articles: publishRecord[]
  prev?: any
  next?: any
  footer: any
  renderNode: any
}) => {
  const makeLink = (title, url) => <Link href={url}>{title}</Link>
  return (
    <>
      {articles.map(({ publishUrl, node, ...args }: any) => getPostComponent(node, { publishUrl, node, ...args }))}

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
      {footer && getPostComponent(footer)}
    </>
  )
}

export const LastArticles = ({ count = 1, id, children, getThisNode, renderNode, getOpt }) => {
  // get embeded json in =data blocks
  const [content] = getFromTree(getThisNode(), 'data').map(n => JSON.parse(getTextContentFromNode(n)))
  if (!content) {
    console.warn(
      `[React =Contents composnent] not found JSON. usually it defined by use  =Include doc:PLUGIN_DATA#articles `,
    )
    return null
  }
  const source = () => content.filter(({ type = '' }: any) => type !== 'page')
  const articles = source().reverse().slice(0, count)
  const lastArticleUrl = articles[articles.length - 1].publishUrl
  const articleIndex = source().findIndex(({ publishUrl }) => publishUrl === lastArticleUrl)
  const prev = source()[articleIndex - 1]
  return (
    <>
      <ArticlesWithNavigation footer="" renderNode={renderNode} articles={articles.slice(0, count)} prev={prev} />
    </>
  )
}

export const HeaderCol = ({ id, children }: { id?: any; children: any }) => {
  var style = { '--count-columns ': children.length } as React.CSSProperties
  return (
    <header id={id} className={styles.Conatainer} style={style}>
      <div className={styles.row}>
        {children.map((i, c) => (
          <div className={styles.column} key={c}>
            {i}
          </div>
        ))}
      </div>
    </header>
  )
}

export const CookieConsent = ({ id, children, buttonCaption }) => {
  // Name of cookie to be set when dismissed
  const DISMISSED_COOKIE = 'cookieconsent_dismissed'
  const setCookie = (name, value, expiryDays, domain, path) => {
    expiryDays = expiryDays || 365
    let exdate = new Date()
    exdate.setDate(exdate.getDate() + expiryDays)
    let cookie = [name + '=' + value, 'expires=' + exdate.toUTCString(), 'path=' + path || '/']
    if (domain) {
      cookie.push('domain=' + domain)
    }
    if (document) document.cookie = cookie.join(';')
  }
  const isCookieConsentDismissed = () =>
    !process.browser
      ? 1
      : (document && document.cookie.indexOf(DISMISSED_COOKIE) > -1) || (window as any)?.navigator?.CookiesOK
  const [showConsent, setShowConsent] = useState(!isCookieConsentDismissed())
  const onOkClick = () => {
    setCookie(DISMISSED_COOKIE, 'yes', 365, window.location.hostname, '/'), setShowConsent(false)
  }
  return (
    showConsent && (
      <div>
        <div id={id} className={cookieConsentStyles.CookieConsentStyles}>
          <div className="content">{children}</div>
          <div className={cookieConsentStyles.okButton} onClick={onOkClick}>
            {buttonCaption || 'Got it!'}
          </div>
        </div>
      </div>
    )
  )
}
export default TestComponent
