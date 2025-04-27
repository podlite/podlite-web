import path from 'path'
import fse from 'fs-extra'
import { Command } from 'commander'
import next from 'next'

const script = path.basename(process.argv[1])

const packagePath = process.cwd()
const buildPath = path.join(packagePath, './lib')
const srcPath = path.join(packagePath, './src')

async function addWorkspace(workspaces) {
  const packageData = await fse.readFile(path.resolve(packagePath, './package.json'), 'utf8')
  const { ...packageDataOther } = JSON.parse(packageData)

  const newPackageData = {
    ...packageDataOther,
  }
  newPackageData.workspaces = workspaces

  return newPackageData
}

async function updateNextConfigFile(workspace_path) {
  const packageData = await fse.readFile(path.resolve(packagePath, './next.config.js'), 'utf8')

  function replaceContent(originalCode, newContent) {
    const regex = /\/\/@@[\s\S]*?\/\/@@/
    return originalCode.replace(regex, `//@@\n${newContent}\n//@@`)
  }
  if (workspace_path) {
    const dstPackageData = await fse.readFile(path.resolve(workspace_path, './package.json'), 'utf8')
    const { name, ...packageDataOther } = JSON.parse(dstPackageData)
    const isSrcExists = fse.existsSync(path.resolve(workspace_path, './src'))
    return replaceContent(
      packageData,
      isSrcExists
        ? `config.resolve.alias['${name}'] = path.resolve('${workspace_path}/src')`
        : `config.resolve.alias['${name}'] = path.resolve('${workspace_path}')`,
    )
  }
  return replaceContent(packageData, `config.resolve.alias['@NONE'] = path.resolve('./src')`)
}

async function run() {
  const program = new Command()
  program.name('attachExternal').description('service tool')

  program
    //.option('-d, --index [path]', 'path to index file', 'index.podlite')
    .argument('[path to dir...]', 'path to posts')

  program.parse(process.argv)
  const [atpath] = program.args
  console.log('path', atpath)
  try {
    if (!fse.existsSync(atpath + '/package.json')) {
      console.log(`[${script}] No package.json file found in the directory`)
      process.exit(1)
    }
    {
      const packageData = await addWorkspace([atpath])
      const targetPath = path.resolve(packagePath, './package.json')
      console.log(`[${script} addWorkspace ] Writing to ${targetPath}`)
      await fse.writeFile(targetPath, JSON.stringify(packageData, null, 2), 'utf8')
    }
    {
      // now update next path config
      const nextConfigData = await updateNextConfigFile(atpath)
      const targetPath = path.resolve(packagePath, './next.config.js')
      console.log(`[${script} updateNextConfigFile ] Writing to ${targetPath}`)
      await fse.writeFile(targetPath, nextConfigData, 'utf8')
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
