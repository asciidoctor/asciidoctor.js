import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'test.mjs',
  output: {
    file: 'bundle.js',
    format: 'es'
  },
  plugins: [resolve()]
};
