import { readFileSync } from 'node:fs'
import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import semver from 'semver'
import downdoc from 'downdoc'

// Returns the npm dist-tag to publish under, or undefined for the default (latest).
// Prereleases are published under "testing"; a version older than the currently
// published latest (i.e. a release from a maintenance branch) must not steal the
// "latest" tag, so it is published under e.g. "latest-4.0" instead (following the
// "latest-2" convention already used on the registry for the 2.x line).
const resolveDistTag = (pkg) => {
  if (semver.prerelease(pkg.version)) {
    return 'testing'
  }
  try {
    const latest = execFileSync(
      'npm',
      ['view', `${pkg.name}@latest`, 'version'],
      { encoding: 'utf8' }
    ).trim()
    if (latest && semver.gt(latest, pkg.version)) {
      return `latest-${semver.major(pkg.version)}.${semver.minor(pkg.version)}`
    }
  } catch {
    // package not published yet (or npm view failed) — default to latest
  }
  return undefined
}

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
      execFileSync('npm', ['pack', '--json'], {
        cwd: directory,
        encoding: 'utf8',
      })
    )
    const tgzPath = join(directory, filename)
    const args = ['publish', '--provenance', '--access', 'public', tgzPath]
    const distTag = resolveDistTag(pkg)
    if (distTag) {
      args.push('--tag', distTag)
    }
    execFileSync('npm', args, { stdio: 'inherit' })
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
