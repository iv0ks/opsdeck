import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default tseslint.config(
  {
    ignores: ['dist/', '.next/', 'node_modules/', 'drizzle/', 'next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Config files and tests live outside src/. Let the type-aware linter
          // fall back to the default project for them instead of erroring.
          allowDefaultProject: ['*.js', '*.ts', '*.mjs', 'tests/*.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // commitlint.config.js mirrors the other labs (anonymous default export).
      'import/no-anonymous-default-export': 'off',
    },
  },
);
