import * as fs from 'fs'
import {POSTS_PATH} from '../src/utils'
import { podlite as podlite_core } from "podlite";
import makeAttrs from 'pod6/built/helpers/config'
import {getFromTree, getTextContentFromNode, makeInterator, PodNode} from '@podlite/schema'
// plan
// prepare built/files-[id].json
const glob = require('glob') 

type pubRecord = { type: string, pubdate: string, node: PodNode, description: PodNode, file:string}

export function isExistsPubdate(node: PodNode) {
    let isShouldBePublished = false
    const rules = {
        ":block": (node, ctx, interator)=>{
            
            const config = makeAttrs(node, ctx);
            if (config.exists('pubdate')) {
                isShouldBePublished = true; 
                return
            }
            if (Array.isArray(node.content))  { interator(node.content) }
        },

    }
    const transformer = makeInterator(rules)
    const res = transformer(node, {})
    return isShouldBePublished
}
let count = 0;
const allFiles = glob.sync(`${POSTS_PATH}/**/*.pod6`).map( (f:any) => {
    count++
    const testData = fs.readFileSync(f).toString()
    let podlite = podlite_core({ importPlugins: true }).use({
        });
    let tree = podlite.parse(testData);
    const asAst = podlite.toAstResult(tree).interator;
    // now check if tree contains block with :pubdate attribute
    // '* :pubdate'
    if (!isExistsPubdate(asAst)) { return }
    // extract notes
    
    const notes:pubRecord[] = 
                    getFromTree(asAst, "para")
                    .filter(n=>makeAttrs(n,{}).exists('pubdate'))
                    .map((n:PodNode) => {
                        const pubdate = makeAttrs(n,{}).getFirstValue('pubdate')
                        return {
                            pubdate,
                            type:'note',
                            node:n,
                            description: n,
                            file:f,
                        }
                    })


    let articles:pubRecord[] = []
    const  getArticles = (array) => {
        // collect alias 
        const aliases  = array.filter(i=>i.type=='alias')
        // at first collect all levels
        const levels = array.filter( node => node.level && node.name === 'head' ) || []
        const nodesWithPubdate = levels.filter( node => {
             return makeAttrs(node,{}).exists('pubdate')
          } )
        if (nodesWithPubdate.length > 0 ) {
            const nodePublished = nodesWithPubdate[0]
            // get next header with same level
            const nextHeader = levels
                                .slice( levels.indexOf(nodePublished) +1 ) // ignore this and previous nodes
                                .filter( node => node.level <= nodePublished.level) // stop then found the same or lower level
                                .shift() 
    
            let lastIndexOfArticleNode = !nextHeader ? array.length
                                                     : array.indexOf(nextHeader)
            const articleContent = array.slice(array.indexOf(nodePublished)+1,lastIndexOfArticleNode)
            if (articleContent.length) {
                const description = getFromTree(articleContent, "para")[0]
                 const pubdate = makeAttrs(nodePublished,{}).getFirstValue('pubdate')
                articles.push( {pubdate,type:'page', node:articleContent, description, file:f} )
            }
        }
        array.forEach( node => { if (Array.isArray(node.content) ) {
            getArticles(node.content)
            }
        })
    };
    getArticles([asAst])
    // note get full posts
     const pages:pubRecord[] = getFromTree(asAst, "pod")
                .filter(n=>makeAttrs(n,{}).exists('pubdate'))
                .map((n:PodNode) => {
                    const pubdate = makeAttrs(n,{}).getFirstValue('pubdate')
                    return {
                        pubdate,
                        type:'page',
                        node:n,
                        file:f
                    }
                })
    console.log(` pages: ${pages.length} articles: ${articles.length}, notes: ${notes.length} from ${f}`)
    return [...pages, ...articles, ...notes].map(item => {

        return {...item, file:f}
    })
}).filter(Boolean)
// flatten
type publishRecord  =  pubRecord & {
    title: string | undefined, 
    publishUrl: string;

 }
// declare type pubRecord = { type: string, pubdate: string, node: PodNode, description: PodNode, file: string, publishUrl: string}
const nodes:publishRecord[] = []
allFiles.flat().map((record:pubRecord)=>{
    // filling title
    let title 
    makeInterator({
        'NAME': ( node, ctx, interator ) => { 
            title = getTextContentFromNode(node)
        },
        'TITLE':( node, ctx, interator ) => { 
            title=getTextContentFromNode(node)
        }
    })(record.node, {})
    // prepare publishUrl
    const conf = makeAttrs(record.node,{})
    const publishUrl = conf.exists('publishUrl') ?  conf.getFirstValue('publishUrl') : 'UNKNOPEN'

    nodes.push({...record, title, publishUrl})
})
console.log(JSON.stringify(nodes, null, 2))