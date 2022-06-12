import { contentData, ContentRecord, getArticlesGroupedByYearMonth, getPostComponent, getSiteInfo } from 'src/utils';
import moment from 'moment';
import 'moment/min/locales.min'
import styles from './service.module.css'
import Link from 'next/link'
import { DataFeedContent } from 'bin/makeDataSource';
import { getTextContentFromNode } from '@podlite/schema';
export const TestComponent = ({id,children})=>{
   var style = { "--count-columns ": children.length } as React.CSSProperties;
  return <div id={id} className={styles.Conatainer} style={style}>
    <div className={styles.row}>

        {children.map((i,c)=><div className={styles.column} key={c}>{i}</div>)}
    </div>
</div>
}

export const Contents = ({locale='en'})=>{
moment.locale(locale)
const groupedByYearMonth = getArticlesGroupedByYearMonth()

const res:JSX.Element[] = []
for ( const  year of  Object.keys(groupedByYearMonth).sort((a,b)=> parseInt(b,10)-parseInt(a,10)) ) {
    const months:DataFeedContent["all"] = groupedByYearMonth[year]
    let isYearAlreadyPut = false;
    for ( const month of Object.keys(months).sort((a,b)=> parseInt(b,10)-parseInt(a,10)) ) {
        const monthRecord = <>
        <h3>{ !isYearAlreadyPut && <time>{year}</time> } 
            <time>{ moment(`${year}-${parseInt(month,10)+1}`).format('MMMM').toUpperCase()}</time>
        </h3>
        { months[month].map(({publishUrl,title,pubdate, node },index)=>(
            <a key={index} href={publishUrl}><p>{title || getTextContentFromNode(node)}</p><hr/><time dateTime={moment(pubdate).format('YYYY-MM-DD')}>{moment(pubdate).format('Do')}</time></a>       
           ))
        }
        </>
        isYearAlreadyPut=true;
        res.push(monthRecord)
    }

}
return <div className="details">{res}</div>
}

export const Article = ({title, node, shortUrl, key,publishUrl, pubdate})=>{
    const [ _ , domain = '' ]  = getSiteInfo().url.split(/\/\//)
    return (
        <article key={key}>
        <header><h1>{title}</h1></header>
        {getPostComponent(node)}
        <footer><a href={shortUrl}>{domain}{shortUrl}</a><Link href={publishUrl}>{moment(pubdate).format('H:mm on YYYY-MM-DD')}</Link></footer>
        </article>
)}

export const Page = ({title, node, shortUrl, key,publishUrl, pubdate})=>(
  <>
    <article key={key}>
    <header><h1>{title}</h1></header>
    {getPostComponent(node)}
    </article>
        <TestComponent id="nav">
        <></>
        { <Link href='/'>🔼</Link> }
        <></>
    </TestComponent>
  </>
)

export const ArticlesWithNavigation = ({articles, prev, next }:{articles:any[],prev?:any, next?:any})=>{
  const makeLink = (title, url) => <Link href={url}>{title}</Link>
  return (<>
    { 
        articles.map(({publishUrl, ...args}:any)=>Article({key:publishUrl, publishUrl, ...args}))
    }
    <TestComponent id="nav">
        { prev && makeLink(prev.title || getTextContentFromNode(prev.node), prev.publishUrl)}
        { <div className="navigate">{prev && makeLink("←", prev.publishUrl)}<Link href='/'>🔼</Link>{next &&makeLink("→", next.publishUrl)}</div>}
        { next && makeLink(next.title || getTextContentFromNode(next.node), next.publishUrl)}
    </TestComponent>
  </>
)}


export const LastArticles = ({count=1, id,children})=>{
    const source =()=>contentData().filter(({type=''}:any)=>type !== 'page')
    const  articles = source().reverse().slice(0,count)
    const lastArticleUrl = articles[articles.length-1].publishUrl
    const articleIndex =source().findIndex(({publishUrl})=>publishUrl===lastArticleUrl)
    const prev = source()[articleIndex - 1]
    return (
        <>
         <ArticlesWithNavigation articles={articles} prev={prev}/>
        </>
    )
 }
 
    
export default TestComponent