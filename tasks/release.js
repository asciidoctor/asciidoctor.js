import log from 'bestikk-log'
import { release } from './module/release.js'

const [releaseVersion] = process.argv.slice(2)

if (!releaseVersion) {
  log.error(
    'Release version is undefined, please specify a version `npm run release 1.0.0`'
  )
  process.exit(9)
}

release(releaseVersion)
