import { getArticlesGroupedByYearMonth, getPostComponent, getSiteInfo } from 'src/utils'
import moment from 'moment'
import 'moment/min/locales.min'
import styles from './service.module.css'
import cookieConsentStyles from './cookieConsentStyles.module.css'

import Link from 'next/link'
import { DataFeedContent } from 'bin/makeDataSource'
import { getTextContentFromNode } from '@podlite/schema'
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

export const Contents = ({ locale = 'en' }) => {
  moment.locale(locale)
  const groupedByYearMonth = getArticlesGroupedByYearMonth()

  const res: JSX.Element[] = []
  for (const year of Object.keys(groupedByYearMonth).sort((a, b) => parseInt(b, 10) - parseInt(a, 10))) {
    const months: DataFeedContent['all'] = groupedByYearMonth[year]
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

export const Article = item => {
  const { title, node, shortUrl, key, publishUrl, pubdate, subtitle } = item
  const [_, domain = ''] = getSiteInfo().url.split(/\/\//)
  return (
    <article key={key}>
      <header>
        <h1>{title}</h1>
        {subtitle && <div className="abstract">{subtitle}</div>}
      </header>
      {getPostComponent(node, item)}
      <footer>
        <a href={shortUrl}>
          {domain}
          {shortUrl}
        </a>
        <Link href={publishUrl}>{moment(pubdate).format('H:mm on YYYY-MM-DD')}</Link>
      </footer>
    </article>
  )
}

export const Page = (item, footer) => {
  const { title, node, shortUrl, key, publishUrl, pubdate, subtitle } = item
  return (
    <>
      <article key={key}>
        <header>
          <h1>{title}</h1>
          {subtitle && <div className="abstract">{subtitle}</div>}
        </header>
        {getPostComponent(node, item)}
      </article>
      <TestComponent id="nav">
        <></>
        <div className="navigate">
          &nbsp;<Link href="/">↑</Link>&nbsp;
        </div>
        <></>
      </TestComponent>
      {footer && getPostComponent(footer, item)}
    </>
  )
}
export const ProcessWithTemplate = (item, default_footer) => {
  const { id, title, subtitle, footer, template, header } = item
  const { footer: footer_tempalte, header: header_tempalte } = template
  const renderFooter = footer_tempalte || footer || default_footer
  const renderHeader = header_tempalte || header
  return (
    <>
      {renderHeader && getPostComponent(renderHeader, item)}
      {/* <article key={id}>
        <header>
          <h1>{title}</h1>
          {subtitle && <div className="abstract">{subtitle}</div>}
        </header> */}
      {getPostComponent(item.template.node, item)}
      {/* </article> */}
      {renderFooter && getPostComponent(renderFooter, item)}
    </>
  )
}
export const ArticlesWithNavigation = ({
  articles,
  prev,
  next,
  footer,
}: {
  articles: any[]
  prev?: any
  next?: any
  footer: any
}) => {
  const makeLink = (title, url) => <Link href={url}>{title}</Link>
  return (
    <>
      {articles.map(({ publishUrl, ...args }: any) => Article({ key: publishUrl, publishUrl, ...args }))}
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

export const LastArticles = ({ count = 1, id, children }) => {
  const { articles: articles10, prev: prev1 } = require('../../built/lastArticles.json') as {
    articles: publishRecord[]
    prev: any
  }
  const articles = articles10.slice(0, count)
  // TODO:: restore functionality
  //   const source = () => contentData().filter(({ type = '' }: any) => type !== 'page')
  //   const articles = source().reverse().slice(0, count)
  //   const lastArticleUrl = articles[articles.length - 1].publishUrl
  //   const articleIndex = source().findIndex(({ publishUrl }) => publishUrl === lastArticleUrl)
  //   const prev = source()[articleIndex - 1]
  const prev = null
  return (
    <>
      <ArticlesWithNavigation footer="" articles={articles.slice(0, count)} prev={prev} />
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
