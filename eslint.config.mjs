import globals from 'globals'
import pluginJs from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'

export default [
  { files: ['**/*.js'] },
  { ignores: ['**/*.min.js'] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        $: 'readonly',
        ol: 'readonly',
        Utils: 'readonly'
      }
    }
  },
  pluginJs.configs.recommended,
  {
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
      '@stylistic/block-spacing': ['error', 'always'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/comma-spacing': ['error', { before: false, after: true }],
      '@stylistic/comma-style': ['error', 'last'],
      '@stylistic/computed-property-spacing': ['error', 'never'],
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/function-call-spacing': ['error', 'never'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/indent-binary-ops': ['error', 2],
      '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],
      '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
      '@stylistic/lines-between-class-members': ['error', 'always'],
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],
      '@stylistic/no-floating-decimal': 'error',
      '@stylistic/no-multi-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 2 }],
      '@stylistic/no-tabs': 'error',
      '@stylistic/no-trailing-spaces': ['error', { skipBlankLines: false, ignoreComments: false }],
      '@stylistic/no-whitespace-before-property': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/operator-linebreak': ['error', 'after'],
      '@stylistic/padded-blocks': ['error', { blocks: 'never', classes: 'never', switches: 'never' }],
      '@stylistic/quote-props': ['error', 'consistent-as-needed'],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/rest-spread-spacing': ['error', 'never'],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/semi-spacing': ['error', { before: false, after: true }],
      '@stylistic/space-before-blocks': ['error', 'always'],
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/space-in-parens': ['error', 'never'],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/space-unary-ops': ['error', { nonwords: false, words: true }],
      '@stylistic/template-curly-spacing': ['error', 'never'],
      '@stylistic/template-tag-spacing': ['error', 'never'],
      '@stylistic/wrap-iife': ['error', 'any', { functionPrototypeMethods: true }],

      'no-unused-vars': ['error', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all'
      }]
    }
  }
]
