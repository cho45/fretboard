import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
