import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dashboardDirectory = fileURLToPath(new URL(".", import.meta.url));
const repositoryDirectory = normalize(join(dashboardDirectory, "../.."));
const ledgerPath = join(repositoryDirectory, "docs/artifacts/project-coordination.md");
const port = Number(process.env.DASHBOARD_PORT || 4173);

function stripMarkdown(value) {
  return value.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
}

function getSection(markdown, heading) {
  const expression = new RegExp(`## ${heading}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`);
  return markdown.match(expression)?.[1] ?? "";
}

function readCoordinationTable(markdown) {
  return getSection(markdown, "Active Status And Handoffs")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) => line.split("|").slice(1, -1).map((cell) => stripMarkdown(cell)))
    .filter((cells) => cells.length === 3)
    .map(([area, state, next]) => ({ area, state, next }));
}

async function coordinationPayload() {
  const [markdown, metadata] = await Promise.all([readFile(ledgerPath, "utf8"), stat(ledgerPath)]);
  const lanes = readCoordinationTable(markdown);
  const stateText = lanes.map((lane) => lane.state.toLowerCase()).join(" ");
  return {
    updatedAt: metadata.mtime.toISOString(),
    lanes,
    summary: {
      completed: (stateText.match(/complete/g) ?? []).length,
      review: (stateText.match(/review pending/g) ?? []).length,
      openQuestions: (getSection(markdown, "Open Questions And Assumptions").match(/\*\*Open:/g) ?? []).length,
    },
  };
}

const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

createServer(async (request, response) => {
  try {
    if (request.url === "/api/coordination") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify(await coordinationPayload()));
      return;
    }

    const requestPath = request.url === "/" ? "index.html" : decodeURIComponent(request.url).replace(/^\//, "");
    const filePath = normalize(join(dashboardDirectory, requestPath));
    if (!filePath.startsWith(dashboardDirectory)) throw new Error("Invalid path");
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Coordination dashboard: http://127.0.0.1:${port}`);
});
