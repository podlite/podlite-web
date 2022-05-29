import styles from './service.module.css'
export const TestComponent = ({id,children})=>{
   var style = { "--count-columns ": children.length } as React.CSSProperties;
  return <div id={id} className={styles.Conatainer} style={style}>
    <div className={styles.row}>

        {children.map((i,c)=>(
            <div className={styles.column} key={c}>{i}</div>
        ))}
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
        { months[month].map(({publishUrl,title,pubdate, node })=>(
            <a href={publishUrl}><p>{title || getTextContentFromNode(node)}</p><hr/><time dateTime={moment(pubdate).format('YYYY-MM-DD')}>{moment(pubdate).format('Do')}</time></a>       
           ))
        }
        </>
        isYearAlreadyPut=true;
        res.push(monthRecord)
    }

}
    
export default TestComponent 