module.exports = {
  'extends': 'standard',
  'ignorePatterns': ['src/template-*.js'],
  'overrides': [
    {
      "files": ["*.js"],
      'rules': {
        'no-var': 'off'
      }
    }
  ]
}
