module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    sourceType: 'module',
    extraFileExtensions: ['.json'],
  },
  plugins: ['@typescript-eslint', 'n8n-nodes-base'],
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'n8n-nodes-base/node-dirname-against-convention': 'error',
    'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'error',
    'n8n-nodes-base/node-param-array-type-assertion': 'error',
    'n8n-nodes-base/node-param-description-missing-from-dynamic-options': 'warn',
  },
  ignorePatterns: ['dist/**', 'node_modules/**', '**/*.js'],
};
