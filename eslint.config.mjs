import { FlatCompat } from '@eslint/eslintrc';
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      '**/.next/**',
      'node_modules/**',
      '**/node_modules/**',
      'next-env.d.ts',
      '**/next-env.d.ts',
    ],
  },
];
export default eslintConfig;
