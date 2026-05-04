import { readFileSync } from 'node:fs'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import semver from 'semver'
import pacote from 'pacote'
import { publish as npmPublish } from 'libnpmpublish'
import downdoc from 'downdoc'

const publish = async (directory) => {
  const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
  if (process.env.DRY_RUN) {
    console.log(`${pkg.name}@${pkg.version}`)
  } else {
    const inputReadme = join(directory, 'README.adoc')
    const hiddenReadme = join(directory, '.README.adoc')
    const outputReadme = join(directory, 'README.md')
    const asciidoc = await fsp.readFile(inputReadme, 'utf8')
    await fsp.writeFile(outputReadme, `${downdoc(asciidoc)}\n`, 'utf8')
    await fsp.rename(inputReadme, hiddenReadme)
    const [{ filename }] = JSON.parse(
      execFileSync('npm', ['pack', '--json'], { cwd: directory })
    )
    const tgzPath = join(directory, filename)
    const manifest = await pacote.manifest(`file:${tgzPath}`)
    const tarData = await pacote.tarball(`file:${tgzPath}`)
    const tag = semver.prerelease(pkg.version) ? 'testing' : 'latest'
    await npmPublish(manifest, tarData, {
      access: 'public',
      defaultTag: tag,
      forceAuth: { token: process.env.NPM_AUTH_TOKEN },
    })
    await fsp.rename(hiddenReadme, inputReadme)
    await fsp.unlink(outputReadme)
    await fsp.unlink(tgzPath)
  }
}

try {
  if (process.env.DRY_RUN) {
    console.warn(
      'Dry run! To publish the release, run the command again without DRY_RUN environment variable'
    )
  }
  const projectRootDirectory = join(import.meta.dirname, '..')
  await fsp.cp(
    join(projectRootDirectory, 'packages', 'core', 'types'),
    join(projectRootDirectory, 'packages', 'asciidoctor', 'types'),
    { recursive: true }
  )
  await publish(join(projectRootDirectory, 'packages', 'core'))
  await publish(join(projectRootDirectory, 'packages', 'asciidoctor'))
} catch (e) {
  console.log('Unable to publish the packages', e)
  process.exit(1)
}
