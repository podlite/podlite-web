/*
=NAME
extract-changelog.mjs - Manage and extract changelog entries for podlite-web

=SYNOPSIS
node scripts/extract-changelog.mjs [options]

=DESCRIPTION
Processes CHANGELOG.podlite for a single-package project.
Forked from podlite monorepo — simplified (no aggregate, no workspaces).

=OPTIONS
  --update     Rename 'Upcoming' → current version, insert new 'Upcoming'
  --summary    Extract changes for current version (Markdown output)
  --dry-run    Show what would change without writing (use with --update)

=NOTE
SYNC: core logic forked from podlite/scripts/extract-changelog.mjs — sync changes manually
*/
import fs from 'fs'
import path from 'path'

const cwd = process.cwd()

const renameHeaderInPodlite = (src, from, to) => {
  const regex = new RegExp(`^=head1 ${from}$`, 'm')
  return src.replace(regex, `=head1 ${to}`)
}

const insertRecordBeforeRelease = (src, before, newHeader) => {
  const regex = new RegExp(`^=head1 ${before}$`, 'm')
  return src.replace(regex, `=head1 ${newHeader}\n\n=head1 ${before}`)
}

const isReleaseEmptyContent = (changelog, release) => {
  const headerRegex = new RegExp(`^=head1\\s+${release}\\s*$`, 'm')
  const match = headerRegex.exec(changelog)
  if (!match) return true

  const start = match.index + match[0].length
  const nextHeaderRegex = /^=head1\s+/gm
  nextHeaderRegex.lastIndex = start
  const nextMatch = nextHeaderRegex.exec(changelog)
  const end = nextMatch ? nextMatch.index : changelog.length

  const content = changelog.substring(start, end)
  return !/\S/.test(content)
}

const getReleaseContent = (changelog, version) => {
  const headerRegex = /^=head1\s+(.*)$/gm
  let match
  const headers = []
  while ((match = headerRegex.exec(changelog)) !== null) {
    headers.push({
      version: match[1].trim(),
      start: match.index + match[0].length,
      index: match.index,
    })
  }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    const end = headers[i + 1] ? headers[i + 1].index : changelog.length
    const sectionContent = changelog.substring(h.start, end)

    if (h.version === version) {
      const mdContent = sectionContent
        .replace(/^=item\s+/gm, '- ')
        .replace(/C<([^>]+)>/g, '`$1`')
        .replace(/C<< ([^>]+) >>/g, '`$1`')
        .trim()
      return mdContent
    }
  }
  return undefined
}

function run() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  // Find changelog
  const changelogPath = ['CHANGELOG.podlite', 'CHANGELOG.pod6']
    .map(f => path.resolve(cwd, f))
    .find(f => fs.existsSync(f))

  if (!changelogPath) {
    console.error('ERROR: No CHANGELOG.podlite or CHANGELOG.pod6 found.')
    process.exit(1)
  }

  const pkgPath = path.resolve(cwd, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const version = pkg.version
  let changelog = fs.readFileSync(changelogPath, 'utf8')

  if (args.includes('--update')) {
    if (isReleaseEmptyContent(changelog, 'Upcoming')) {
      if (dryRun) {
        console.log('Upcoming section is empty. Nothing to update.')
      } else {
        console.log('Upcoming section is empty. Skipping.')
      }
      process.exit(dryRun ? 1 : 0)
    }

    changelog = renameHeaderInPodlite(changelog, 'Upcoming', version)
    changelog = insertRecordBeforeRelease(changelog, version, 'Upcoming')

    if (dryRun) {
      console.log(`Would update ${path.basename(changelogPath)}: Upcoming → ${version}`)
    } else {
      fs.writeFileSync(changelogPath, changelog)
      console.log(`Updated ${path.basename(changelogPath)}: Upcoming → ${version}`)
    }
    return
  }

  if (args.includes('--summary')) {
    const content = getReleaseContent(changelog, version)
    if (content) {
      console.log(content)
    }
  }
}

run()
