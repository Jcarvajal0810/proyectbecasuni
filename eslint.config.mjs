import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * ESLint flat config directo (sin FlatCompat): `eslint-config-next` 16 ya
 * exporta arrays planos. `ignores` va primero y suelto para que se aplique a
 * todo, incluidos los archivos lintados por los plugins.
 */
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      // Generado por `npm run test:coverage`. No es código fuente y no debe
      // aparecer en el lint del repositorio.
      'coverage/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;