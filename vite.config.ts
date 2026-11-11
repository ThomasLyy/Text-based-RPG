import { defineConfig } from "vite";

// Relative paths, so the same build works at a site's root and in a sub-folder (GitHub Pages serves from one).
export default defineConfig({ base: "./" });
