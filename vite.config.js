import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	base: './',
	resolve: {
		alias: {
			'vue': 'vue/dist/vue.esm-bundler.js',
		},
	},
	define: {
		__VUE_OPTIONS_API__: true,
		__VUE_PROD_DEVTOOLS__: false,
		__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
	},
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				chord: resolve(__dirname, 'chord.html'),
				scale: resolve(__dirname, 'scale.html'),
			},
		},
	},
});
