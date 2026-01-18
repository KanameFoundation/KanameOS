import { defineConfig } from 'vite';
import { resolve } from 'path';
import config from './package.json';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
    plugins: [
        commonjs(),
    ],
    define: {
        WEBOS_VERSION: JSON.stringify(config.version),
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            output: {
                entryFileNames: 'assets/kaname.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
                silenceDeprecations: ['legacy-js-api'],
            },
        },
    },
    server: {
        port: 8000,
    },
});
