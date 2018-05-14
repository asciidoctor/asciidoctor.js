module.exports = {
  'env': {
    'node': true,
    'browser': true
  },
  "parserOptions": {"ecmaVersion": 8},
  'rules': {
    'space-before-function-paren': ['error', 'always'],
    'no-cond-assign': 'off',
    'no-undef': 'off',
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    // allow console in development
    'no-console': process.env.NODE_ENV === 'development' ? 'off' : 'error'
  }
};
