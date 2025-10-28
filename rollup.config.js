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

const isDev = process.env.NODE_ENV === 'development';

const extensions = ['.ts', '.tsx'];

const indexConfig = {
  context: 'this',
  plugins: [
    // Résolution des modules
    resolve({ 
      extensions, 
      browser: true,
      preferBuiltins: false 
    }),
    commonjs(),
    json(),
    
    // TypeScript
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist'
    }),
    typescriptPaths({ preserveExtensions: true }),
    
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
    ...(isDev ? [] : [
      terser({ 
        output: { comments: false },
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      })
    ]),
    
    // Serveur de développement
    ...(isDev
      ? [
          serve({
            open: true,
            verbose: true,
            contentBase: ['dist', 'public'],
            host: 'localhost',
            port: 5678,
          }),
          livereload({ watch: 'dist' }),
        ]
      : []),
  ],
};

const configs = [
  {
    ...indexConfig,
    input: './src/web.ts',
    output: {
      file: 'dist/web.js',
      format: 'es',
    },
  },
  {
    ...indexConfig,
    input: './src/web.ts',
    output: {
      file: 'dist/web.umd.js',
      format: 'umd',
      name: 'FlowiseEmbed',
    },
  },
];

export default configs;
