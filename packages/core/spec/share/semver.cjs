/* global define */
const toSemVer = (version) => {
  let semVer
  if (typeof version === 'string') {
    // ignore pre-release (.dev)
    const fragments = version.replace(/\.dev/g, '').split('.')
    semVer = {
      major: parseInt(fragments[0]),
      minor: parseInt(fragments[1]),
      patch: parseInt(fragments[2])
    }
  } else {
    semVer = version
  }
  return semVer
}

const semVer = (version) => {
  const currentSemver = toSemVer(version)
  return {
    lte: (ver) => {
      const semver = toSemVer(ver)
      if (currentSemver.major < semver.major) {
        return true
      }
      if (currentSemver.major === semver.major && currentSemver.minor < semver.minor) {
        return true
      }
      return currentSemver.major === semver.major && currentSemver.minor === semver.minor && currentSemver.patch <= semver.patch
    },
    gte: (ver) => {
      const semver = toSemVer(ver)
      if (currentSemver.major > semver.major) {
        return true
      }
      if (currentSemver.major === semver.major && currentSemver.minor > semver.minor) {
        return true
      }
      return currentSemver.major === semver.major && currentSemver.minor === semver.minor && currentSemver.patch >= semver.patch
    },
    gt: (ver) => {
      const semver = toSemVer(ver)
      if (currentSemver.major > semver.major) {
        return true
      }
      if (currentSemver.major === semver.major && currentSemver.minor > semver.minor) {
        return true
      }
      return currentSemver.major === semver.major && currentSemver.minor === semver.minor && currentSemver.patch > semver.patch
    },
    lt: (ver) => {
      const semver = toSemVer(ver)
      if (currentSemver.major < semver.major) {
        return true
      }
      if (currentSemver.major === semver.major && currentSemver.minor < semver.minor) {
        return true
      }
      return currentSemver.major === semver.major && currentSemver.minor === semver.minor && currentSemver.patch < semver.patch
    },
    eq: (ver) => {
      const semver = toSemVer(ver)
      return currentSemver.major === semver.major && currentSemver.minor === semver.minor && currentSemver.patch === semver.patch
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  // Node.
  module.exports = semVer
} else if (typeof define === 'function' && define.amd) {
  // AMD. Register a named module.
  define('semver', [''], function () {
    return semVer
  })
}
