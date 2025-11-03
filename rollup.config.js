import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { babel } from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import typescript from '@rollup/plugin-typescript';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import commonjs from '@rollup/plugin-commonjs';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

// Détecte automatiquement le mode dev si --watch est utilisé
const isDev = process.argv.includes('--watch') || process.env.NODE_ENV === 'development';
console.log('🔧 Mode développement:', isDev);

const extensions = ['.ts', '.tsx'];

const indexConfig = {
  context: 'this',
  plugins: [
    // Résolution des modules
    resolve({
      extensions,
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    json(),

    // TypeScript Paths d'abord
    typescriptPaths({
      preserveExtensions: true,
      absolute: false,
    }),

    // TypeScript
    typescript({
      tsconfig: './tsconfig.json',
      declaration: !isDev, // Désactiver les déclarations en mode dev pour plus de rapidité
      declarationDir: !isDev ? './dist' : undefined,
    }),

    // Babel pour la transpilation
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: ['solid', '@babel/preset-typescript'],
      extensions,
    }),

    // CSS avec Tailwind
    postcss({
      plugins: [autoprefixer(), tailwindcss()],
      extract: false,
      modules: false,
      autoModules: false,
      minimize: !isDev,
      inject: false,
    }),

    // Minification seulement en production
    ...(isDev
      ? []
      : [
          terser({
            output: { comments: false },
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
          }),
        ]),

    // Live reload seulement en dev (serveur lancé séparément)
    ...(isDev ? [livereload({ watch: 'dist' })] : []),
  ],
};

const configs = [
  {
    ...indexConfig,
    input: './src/web.ts',
    output: {
      file: 'dist/web.js',
      format: 'es',
      sourcemap: isDev,
    },
  },
  {
    ...indexConfig,
    input: './src/web.ts',
    output: {
      file: 'dist/web.umd.js',
      format: 'umd',
      name: 'FlowiseEmbed',
      sourcemap: isDev,
    },
  },
];

export default configs;
