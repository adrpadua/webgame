import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      // The Encounter Engine is a pure rules module (ADR 0019): no rendering,
      // no store, no browser framework may leak below the seam.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*', 'react/*'], message: 'The Encounter Engine must not import React (ADR 0019).' },
            { group: ['phaser', 'phaser/*'], message: 'The Encounter Engine must not import Phaser (ADR 0019).' },
            { group: ['zustand', 'zustand/*'], message: 'The Encounter Engine must not import the store (ADR 0019).' },
            { group: ['@/store/*', '@/ui/*', '@/board/*', '../store/*', '../ui/*', '../board/*'], message: 'The Encounter Engine must not import Workbench modules (ADR 0019).' },
          ],
        },
      ],
    },
  },
)
