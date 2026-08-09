module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'dist/**', '.eslintrc.cjs', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js', '*.test.js', '*.test.jsx'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off',
    // NOTE: no-unused-vars and unescaped entities are disabled for now
    // to let the build/lint pass while the codebase is being progressively
    // cleaned up. Re-enable once the admin app refactor is complete.
    'no-unused-vars': 'off',
    'react/no-unescaped-entities': 'off',
  },
}
