import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5173,
		hmr: {
			clientPort: 5173
		}
	},
	// Vite 5 defaults are fine; keep config minimal to reduce risk
});
