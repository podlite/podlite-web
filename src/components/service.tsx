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
    
export default TestComponent 