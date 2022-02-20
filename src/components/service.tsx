import styles from './service.module.css'
export const TestComponent = ({children})=>{
   var style = { "--count-columns ": children.length } as React.CSSProperties;
  return <div className={styles.Conatainer} style={style}>
      <h1>Got count:{children.length}</h1>
<div className={styles.row}>

    {children.map((i,c)=>(
        <div className={styles.column} key={c}>{i}</div>
    ))}
    </div>
</div>
}
    
export default TestComponent 