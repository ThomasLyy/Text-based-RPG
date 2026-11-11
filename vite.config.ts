import { defineConfig } from "vite";

// Relative paths, so the same build works at a site's root, in a sub-folder and inside the Android app.
export default defineConfig({ base: "./" });
