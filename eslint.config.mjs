import typescriptEslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'dist/',
      'out/',
      'node_modules/',
      'apps/python/',
      'lobehub/',
      'teleport/',
      '.omo/',
      '.opencode/',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
    ],
  },
  ...typescriptEslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
