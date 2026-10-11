/**
 * Lays the Next.js website (site/out) over dist/, after `vite build` has put
 * the ERP in dist/computercentre/ and the older React pages around it.
 *
 * A page built in Next replaces the old page of the same name, at the same
 * address. Those pages no longer carry cms.js, so they come off the list the
 * ERP's Website Content editor offers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, "site", "out");
const dist = path.join(root, "dist");

if (!fs.existsSync(out)) throw new Error("site/out is missing: run the site's build first.");
if (!fs.existsSync(path.join(dist, "computercentre"))) throw new Error("dist/ is missing the ERP: run vite build first.");

fs.cpSync(out, dist, { recursive: true });

const nextPages = fs.readdirSync(out).filter((f) => f.endsWith(".html") && f !== "404.html").map((f) => f.slice(0, -5));
const listFile = path.join(dist, "cms-pages.json");
if (fs.existsSync(listFile)) {
  const list = JSON.parse(fs.readFileSync(listFile, "utf8"));
  fs.writeFileSync(listFile, JSON.stringify(list.filter((p) => !nextPages.includes(p.name))));
}

console.log(`website: ${nextPages.length} Next.js pages laid over dist/ (${nextPages.join(", ")})`);
