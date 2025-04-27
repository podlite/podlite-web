import React from 'react'
import { getHighlighter } from 'shiki'

let highlighter: Awaited<ReturnType<typeof getHighlighter>> | null = null

const getCachedHighlighter = async () => {
  if (highlighter === null) {
    console.log('getHighlighter')
    highlighter = await getHighlighter({
      themes: ['one-light', 'catppuccin-latte', 'github-light', 'github-dark', 'vitesse-light'],
      langs: ['tsx', 'raku'],
    })
  }

  return highlighter
}

export const codeToHtml = async ({ code, language }: { code: string; language: string }) => {
  //   try {
  const highlighter = await getCachedHighlighter()
  await highlighter.loadLanguage('tsx')
  await highlighter.loadLanguage('typescript')
  await highlighter.loadLanguage('javascript')
  // await highlighter.loadLanguage('jsx')
  // await highlighter.loadLanguage('json')
  // await highlighter.loadLanguage('bash')
  // await highlighter.loadLanguage('html')
  await highlighter.loadLanguage('raku')
  await highlighter.loadLanguage(language)
  // await highlighter.loadLanguage('yaml')
  // await highlighter.loadLanguage('markdown')

  return highlighter.codeToHtml(code, {
    lang: language,
    themes: {
      light: 'one-light', //'vitesse-light',//'catppuccin-latte', // 'github-light',
      dark: 'github-dark',
    },
  })
}
