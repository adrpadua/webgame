import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // prototypes/ holds throwaway simulation harnesses — CommonJS scripts run
  // with node directly, not shipped code. They are not held to the app's
  // rules; the engine-purity boundary below is what the lint is for.
  { ignores: ['dist', 'prototypes'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
        // Inside page.evaluate callbacks, code runs in the browser.
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        getComputedStyle: 'readonly',
        NodeFilter: 'readonly',
      },
    },
  },
  {
    // The type ramp and the spacing escape hatch (D-067). Documentation alone
    // already failed to hold this line — nine type steps accumulated under the
    // interface direction's silence — which is the same reason the plate's
    // padding rule needed a browser check rather than a paragraph.
    //
    // Only ARBITRARY values are refused. Tailwind's named sizes (`text-xs`,
    // `text-sm`, `text-lg`, `text-2xl`) are the other four steps and stay legal;
    // so does every arbitrary *geometry* value (`w-[74px]`, `pb-[60px]`), which
    // is a measured dimension rather than a rhythm.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // `text-[Npx]` outside the ramp. The lookahead lists the four
          // arbitrary steps; the other three are named classes.
          selector: 'Literal[value=/text-\\[(?!(?:9|10|11)px\\])/]',
          message:
            'Type sizes are the seven steps of the ramp (D-067): 9, 10, 11, 12, 14, 18, 24. Use text-[9px] / text-[10px] / text-[11px], or text-xs / text-sm / text-lg / text-2xl.',
        },
        {
          selector: 'TemplateElement[value.raw=/text-\\[(?!(?:9|10|11)px\\])/]',
          message:
            'Type sizes are the seven steps of the ramp (D-067): 9, 10, 11, 12, 14, 18, 24. Use text-[9px] / text-[10px] / text-[11px], or text-xs / text-sm / text-lg / text-2xl.',
        },
        {
          // The spacing escape hatch. Tailwind's default scale is the system
          // (D-067); an arbitrary gap is what bit, not the scale's width.
          selector: 'Literal[value=/(?:^|[^a-z-])(?:gap|space)-(?:[xy]-)?\\[/]',
          message: 'Spacing uses Tailwind scale steps (D-067). Replace the arbitrary gap with a step, or change the design.',
        },
        {
          selector: 'TemplateElement[value.raw=/(?:^|[^a-z-])(?:gap|space)-(?:[xy]-)?\\[/]',
          message: 'Spacing uses Tailwind scale steps (D-067). Replace the arbitrary gap with a step, or change the design.',
        },
      ],
    },
  },
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
  {
    // The catalog is injected into the component tree, not reached for
    // (ADR 0035). Components read it with `useCatalog()`; the singleton is
    // for the code that renders outside React and has no context to read.
    files: ['src/ui/**/*.ts', 'src/ui/**/*.tsx'],
    ignores: ['src/ui/onboarding/useFirstTurn.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/store/catalog',
              importNames: ['catalog'],
              message: 'Components read the catalog with useCatalog() (ADR 0035). The singleton is for code rendering outside React.',
            },
          ],
        },
      ],
    },
  },
)
