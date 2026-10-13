import { defineConfig } from 'vite';
export default defineConfig({ base: process.env.GITHUB_PAGES === 'true' ? '/arena-cikpus-3d/' : './' });
