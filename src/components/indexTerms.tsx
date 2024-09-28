import React, { useState, useMemo } from 'react';
import Link from 'next/link'

type TermRec = {
    term: string;
    entry?: string;
    references?: {
        title: string;
        content: string;
        url?:string
    }[];
    seeAlso?: string[];
    subTerms?: TermRec[];
 }
function prepareData () {
const data = require('../../built/indexTerms.json')
const valide = data.filter(x=>Boolean(x.xnode.entry))
const seeAlso:string[][] = []

const generated:TermRec[] = valide.reduce((acc:TermRec[], x) => {
    const entries = x.xnode.entry;
    const {title, subtitle, url} = x
    const resEntries:TermRec[] = []
    entries.forEach((entry) => {
        const terms = entry.split(',').reverse();
        const termRecord:TermRec = terms.reduce((acc, term, index) => {
            if(index === 0) {
               const termRec = { term,entry,
                references: [{ title, content: subtitle, url }] }
                acc=termRec
            } else {
                const termRec = { term, subTerms: [acc] }
                acc=termRec
            }
            return acc
        }, {} as TermRec)
        resEntries.push(termRecord)
    })
    // prepare see also links
    if (entries.length > 1) {
        seeAlso.push(entries)
    }
    return [...acc, ...resEntries]
}, [] as TermRec[])

interface MergedTerm {
    [term:string] :  TermRec
}
const mergeTerms = (list: TermRec[]): TermRec[] => {
    return Object.values( list.reduce((acc, x) => {
        const termRec = x.term
        const exists = acc[termRec]
        if (!exists) {
            const extra = { } as { seeAlso : string[]}
            // for first time fill see also
            if(x?.entry) {
                const termKey = x.entry
                const see = [...seeAlso.filter(x=>x.includes(termKey))].flat().filter(x=>Boolean(x)).filter(x=>x!==termKey)
                if (see.length > 0) {
                    extra.seeAlso = see
                }
            }
            acc[termRec] = { ...x, ...extra}
        } else {
            // merge
            exists.references = [...(exists.references||[]), ...(x.references||[])]
            exists.seeAlso = [...(exists.seeAlso||[]), ...(x.seeAlso||[])]
            exists.subTerms = mergeTerms([...(exists.subTerms||[]), ...(x.subTerms||[])])
            
        }
       
        return acc
    }, {} as MergedTerm) ) 
}
const merged = mergeTerms(generated)
return merged
}


const styles: Record<string, React.CSSProperties> = {
  bubbleIndex: {
    // fontFamily: 'Arial, sans-serif',
    // maxWidth: '1000px',
    margin: '0 auto',
    // color: '#333',
    // backgroundColor: '#f9f9f9',
    padding: '20px',
    maxWidth: 'var(--spacing-width-max)',
  },
  title: {
    fontSize: '24px',
    textAlign: 'center',
    marginBottom: '20px',
    color: '#333',
  },
  alphabetGroup: {
    marginBottom: '30px',
  },
  alphabetLetter: {
    fontSize: '24px',
    color: '#555',
    marginBottom: '10px',
  },
  twoColumnLayout: {
    display: 'flex',
    gap: '200px',
  },
  column: {
    flex: 1,
  },
  indexEntry: {
    marginBottom: '15px',
  
  },
  termLine: {
    display: 'flex',
    'alignItems': 'baseline',
    justifyContent: 'space-between',
    marginBottom: '5px',
  },
  mainTerm: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginRight: '10px',
    color: '#333',
  },
  subTerm: {
    fontSize: '14px',
    fontWeight: 'normal',
    marginRight: '10px',
    color: '#444',
    marginLeft: '20px',
  },
  bubbles: {
    display: 'inline-flex',
    gap: '20px',
  },
  bubbleContainer: {
    position: 'relative',
  },
  bubble: {
    width: '20px',
    height: '20px',
    background: 'linear-gradient(145deg, #e6e6e6, #cccccc)',
    border: '2px solid #999',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#333',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'all 0.1s ease-in-out',
  },
  bubbleHover: {
    transform: 'scale(1.1)',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  },
  preview: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '5px',
    padding: '10px',
    width: '200px',
    zIndex: 1,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  previewTitle: {
    fontSize: '14px',
    margin: '0 0 5px',
    color: '#333',
  },
  previewContent: {
    fontSize: '12px',
    margin: 0,
    color: '#666',
  },
  seeAlso: {
    fontSize: '14px',
    color: '#777',
    marginTop: '5px',
    marginLeft: '3rem',
    'width': '5rem'  
},
  seeAlsoLabel: {
    fontStyle: 'italic',
  },
  seeAlsoItem: {
    color: '#555',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  hr:{
    'margin': '0 .5rem',
    'height': '1px',
    'border': '0',
    borderBottom: '1px dotted var(--color-dim)',
    'flex': '1 0 1rem',
    'opacity': '.25',
    maxWidth: 'var(--spacing-width-xl)',
  }
};

const BubbleLinks = ({ references }) => {
  const [activePreview, setActivePreview] = useState(null);
  const isOne = references.length === 1
  return (
    <div style={styles.bubbles}>
      {references.map((ref, index) => (
        <a href={ref.url} key={index}>
        <div
          key={index}
          style={styles.bubbleContainer}
          onMouseEnter={() => setActivePreview(index)}
          onMouseLeave={() => setActivePreview(null)}
        >
          <div style={{
            ...styles.bubble,
            ...(activePreview === index ? styles.bubbleHover : {})
          }}>
            {isOne ? '#' : index + 1}
          </div>
          {activePreview === index && (
            <div style={styles.preview}>
              <h3 style={styles.previewTitle}>{ref.title}</h3>
              <p style={styles.previewContent}>{ref.content}</p>
            </div>
          )}
        </div>
        </a>
      ))}
    </div>
  );
};

const SeeAlso = ({ references }) => (
  <div style={styles.seeAlso}>
    <span style={styles.seeAlsoLabel}>See Also: </span>
    {references.map((ref, index) => (
      <span key={index} style={styles.seeAlsoItem}>
        {ref}{index < references.length - 1 ? ', ' : ''}
      </span>
    ))}
  </div>
);

const IndexEntry = ({ term, references, subTerms, seeAlso, isSubTerm = false }) => {
  return (
    <div style={styles.indexEntry}>
      <div style={styles.termLine}>
        <span style={isSubTerm ? styles.subTerm : styles.mainTerm}>{term}</span>
        { references?.length ?  <hr style={styles.hr}/> : null}
        {references?.length ? <BubbleLinks references={references} /> : null}
      </div>
      { seeAlso?.length ?  <SeeAlso references={seeAlso} /> : null}
      {subTerms && subTerms.map((subTerm, index) => (
        <IndexEntry key={index} {...subTerm} isSubTerm={true} />
      ))}
    </div>
  );
};

const AlphabeticalGroup = ({ letter, entries }) => {
  const totalElements = entries.reduce((acc, x) => acc + 1 + (x.subTerms?.length || 0), 0);
  const midpoint = entries.length == 1 ? 1 : entries.findIndex((val,index,onj) => {
    const countRest = onj.slice(index).reduce((acc, x) => acc + 1 + (x.subTerms?.length || 0), 0);
    const middleVal = Math.ceil(totalElements / 2)
     if (countRest < middleVal)
        return true 
    if (index === onj.length - 1)
        return true
    return false
})

  const leftColumn = entries.slice(0, midpoint);
  const rightColumn = entries.slice(midpoint);

  return (
    <div style={styles.alphabetGroup}>
      <h2 style={styles.alphabetLetter}>{letter}</h2>
      <div style={styles.twoColumnLayout}>
        <div style={styles.column}>
          {leftColumn.map((entry, index) => (
            <IndexEntry key={index} {...entry} />
          ))}
        </div>
        <div style={styles.column}>
          {rightColumn.map((entry, index) => (
            <IndexEntry key={index} {...entry} />
          ))}
        </div>
      </div>
    </div>
  );
};

const BubbleIndex = ({ entries }) => {
  const groupedEntries = useMemo(() => {
    const groups = {};
    entries.forEach(entry => {
      const firstLetter = entry.term[0].toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(entry);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  return (
    <div style={styles.bubbleIndex}>
      {groupedEntries.map(([letter, groupEntries]) => (
        <AlphabeticalGroup key={letter} letter={letter} entries={groupEntries} />
      ))}
    </div>
  );
};

// Example usage with hierarchical structure
const exampleEntries: TermRec[] = [
  {
    term: "Artificial Intelligence",
    references: [{ title: "AI Overview", content: "AI is the simulation of human intelligence in machines." }],
    seeAlso: ["Machine Learning", "Neural Networks"],
    subTerms: [
      {
        term: "Machine Learning",
        references: [{ title: "ML Basics", content: "A subset of AI focused on the ability of machines to learn from data." }],
        seeAlso: ["Deep Learning"]
      },
      {
        term: "Neural Networks",
        references: [{ title: "NN Fundamentals", content: "Computing systems inspired by biological neural networks." }],
      }
    ]
  },
  {
    term: "Data Structures",
    references: [{ title: "DS Overview", content: "Ways of organizing data for efficient access and modification." }],
    seeAlso: ["Algorithms"],
    subTerms: [
      {
        term: "Arrays",
        references: [{ title: "Array Basics", content: "Contiguous memory locations for storing multiple items of the same type." }],
      },
      {
        term: "Linked Lists",
        references: [{ title: "Linked List Concepts", content: "Sequence of data elements connected via links." }],
      }
    ]
  },
  {
    term: "Programming Paradigms",
    references: [{ title: "Paradigm Overview", content: "Different approaches and mindsets of programming." }],
    subTerms: [
      {
        term: "Object-Oriented Programming",
        references: [{ title: "OOP Basics", content: "Programming paradigm based on the concept of 'objects'." }],
      },
      {
        term: "Functional Programming",
        references: [{ title: "FP Concepts", content: "Programming paradigm that treats computation as the evaluation of mathematical functions." }],
      }
    ]
  }
];

export const IndexTerms = ()=><BubbleIndex entries={prepareData()} />
export default function App() {
  return <BubbleIndex entries={exampleEntries} />;
}