import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import babel from '@rollup/plugin-babel'
import { resolve } from 'node:path'

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'OvConfigurator',
            fileName: 'ov-configurator',
            formats: ['es', 'cjs', 'iife'],
        },
        target: 'es2015',
        rollupOptions: {
            plugins: [
                babel({
                    babelHelpers: 'bundled',
                    extensions: ['.ts', '.tsx', '.js'],
                    presets: [
                        [
                            '@babel/preset-env',
                            {
                                targets:
                                    '> 0.5%, last 2 versions, Firefox ESR, not dead, ie 11',
                                useBuiltIns: false,
                            },
                        ],
                    ],
                }),
            ],
        },
    },
    plugins: [
        dts({ entryRoot: 'src', outDir: 'dist', insertTypesEntry: true }),
    ],
})
