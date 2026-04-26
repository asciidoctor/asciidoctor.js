import { execFileSync } from 'node:child_process'
import { copyFileSync, chmodSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const pkgDir = join(import.meta.dirname, '..')
const root = join(pkgDir, '..', '..')
const distDir = join(pkgDir, 'dist')

if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })

const platform = process.platform
const arch = process.arch

const platformName = platform === 'win32' ? 'win' : platform
const archName = arch === 'x64' ? 'amd64' : 'arm64'
const binaryName = `asciidoctor-${platformName}-${archName}${platform === 'win32' ? '.exe' : ''}`
const outputBinary = join(distDir, binaryName)
const blobPath = join(distDir, 'cli.blob')
const SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'

function run(bin, args, opts = {}) {
  console.log(`> ${[bin, ...args].join(' ')}`)
  execFileSync(bin, args, { stdio: 'inherit', ...opts })
}

const rollupBin = join(root, 'node_modules', '.bin', 'rollup')
const postjectBin = join(root, 'node_modules', '.bin', 'postject')

// 1. Bundle CLI to CJS
console.log('\n=== Bundling CLI ===')
run(rollupBin, ['-c'], { cwd: pkgDir })

// 2. Generate SEA blob
console.log('\n=== Generating SEA blob ===')
run(process.execPath, ['--experimental-sea-config', 'sea-config.json'], { cwd: pkgDir })

// 3. Copy Node.js binary and make it executable
console.log('\n=== Copying Node.js binary ===')
copyFileSync(process.execPath, outputBinary)
chmodSync(outputBinary, 0o755)

// 4. On macOS, strip the existing codesignature before injection
if (platform === 'darwin') {
  console.log('\n=== Removing existing codesignature ===')
  run('codesign', ['--remove-signature', outputBinary])
}

// 5. Inject SEA blob
console.log('\n=== Injecting SEA blob ===')
const postjectArgs = [outputBinary, 'NODE_SEA_BLOB', blobPath, '--sentinel-fuse', SEA_FUSE]
if (platform === 'darwin') postjectArgs.push('--macho-segment-name', 'NODE_SEA')
run(postjectBin, postjectArgs)

// 6. Sign the binary on macOS
if (platform === 'darwin') {
  console.log('\n=== Signing binary ===')
  run('codesign', ['--sign', '-', outputBinary])
}

console.log(`\nBinary built: ${outputBinary}`)
