import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

/** The ERP lives under this path; the public website owns everything else. */
const APP_BASE = "/computercentre/";

const root = fileURLToPath(new URL(".", import.meta.url));
const websiteDir = path.join(root, "website");
const distDir = path.join(root, "dist");

/**
 * What website/cms.js needs to read the content the ERP saves: the same
 * Supabase project and public (anon) key the ERP itself is built with.
 */
function cmsConfig(env: Record<string, string>) {
  const config = { url: env.VITE_SUPABASE_URL || "", key: env.VITE_SUPABASE_ANON_KEY || "" };
  return `window.CMS_CONFIG = ${JSON.stringify(config)};\n`;
}

/** Every page of the website, named for the ERP's page picker. */
function websitePages() {
  return fs
    .readdirSync(websiteDir)
    .filter((f) => f.endsWith(".html"))
    .sort()
    .map((f) => {
      const name = f.slice(0, -5);
      const html = fs.readFileSync(path.join(websiteDir, f), "utf8");
      const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "";
      const heading = h1.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
      return { name, heading: heading.slice(0, 80) };
    });
}

/**
 * The public website (plain HTML in `website/`) is served from the site root,
 * next to the ERP. In dev it is served straight from disk; on build it is
 * copied into `dist/` around the ERP's own `dist/computercentre/`, together
 * with the host redirects that keep the ERP's client-side routes and the old
 * `.php` addresses working.
 */
function website(env: Record<string, string>): Plugin {
  return {
    name: "public-website",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || "/").split("?")[0]);
        if (url.startsWith(APP_BASE) || url === APP_BASE.slice(0, -1)) return next();
        if (url === "/cms-config.js") {
          res.setHeader("Content-Type", "text/javascript");
          return res.end(cmsConfig(env));
        }
        if (url === "/cms-pages.json") {
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify(websitePages()));
        }
        let file = path.join(websiteDir, url === "/" ? "index.html" : url);
        if (file.endsWith(".php")) file = file.slice(0, -4) + ".html";
        if (!file.startsWith(websiteDir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
        const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };
        res.setHeader("Content-Type", types[path.extname(file).toLowerCase()] || "application/octet-stream");
        fs.createReadStream(file).pipe(res);
      });
    },
    buildStart() {
      fs.rmSync(distDir, { recursive: true, force: true });
    },
    closeBundle() {
      fs.cpSync(websiteDir, distDir, { recursive: true });
      fs.writeFileSync(path.join(distDir, "cms-config.js"), cmsConfig(env));
      fs.writeFileSync(path.join(distDir, "cms-pages.json"), JSON.stringify(websitePages()));
      const pages = fs.readdirSync(websiteDir).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5));
      const redirects = [
        `${APP_BASE.slice(0, -1)}  ${APP_BASE}  301`,
        `${APP_BASE}*  ${APP_BASE}index.html  200`,
        ...pages.map((p) => `/${p}.php  /${p}.html  301`),
      ];
      fs.writeFileSync(path.join(distDir, "_redirects"), redirects.join("\n") + "\n");
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: APP_BASE,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), website({ ...loadEnv(mode, root, "VITE_"), ...process.env } as Record<string, string>)],
  build: {
    outDir: "dist/computercentre",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [
          { name: "charts", test: /node_modules\/(recharts|d3-|victory-vendor)/ },
          { name: "ui", test: /node_modules\/@radix-ui/ },
          { name: "react", test: /node_modules\/(react|react-dom|react-router)/ },
          { name: "icons", test: /node_modules\/lucide-react/ },
          { name: "data", test: /node_modules\/(@tanstack|date-fns|zod)/ },
        ] },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
