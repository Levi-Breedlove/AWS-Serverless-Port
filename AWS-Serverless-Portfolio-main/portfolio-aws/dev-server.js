const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const url = require("url");

const HOST = process.env.HOST || "127.0.0.1";
const PORT_FROM_ENV = process.env.PORT;
const DEFAULT_PORT = 4173;
const START_PORT =
  PORT_FROM_ENV === undefined || PORT_FROM_ENV === ""
    ? DEFAULT_PORT
    : Number(PORT_FROM_ENV);
const ROOT = __dirname;
const DEV_SERVER_REPLACE =
  process.env.DEV_SERVER_REPLACE === undefined ? true : process.env.DEV_SERVER_REPLACE !== "0";
const DEV_SERVER_INFO_PATH = "/__devserver";
const DEV_SERVER_SHUTDOWN_PATH = "/__devserver_shutdown";
const DEV_SERVER_SHUTDOWN_TOKEN = crypto.randomBytes(16).toString("hex");
const DEV_SERVER_STATE_FILE = (() => {
  const hash = crypto.createHash("sha1").update(ROOT).digest("hex").slice(0, 10);
  return path.join(os.tmpdir(), `portfolio-aws-dev-server-${hash}.json`);
})();
const LIVE_RELOAD_ENABLED =
  process.env.LIVE_RELOAD === undefined ? true : process.env.LIVE_RELOAD !== "0";
const LIVE_RELOAD_PATH = "/__livereload";
const MAX_PORT_TRIES = 20;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const liveReloadClients = new Set();
const ignoredDirNames = new Set(["node_modules", ".git"]);
const watchers = new Map();
let watchersStarted = false;
let shuttingDown = false;

let server = null;
let portTries = 0;
let activePort = Number.isFinite(START_PORT) ? START_PORT : DEFAULT_PORT;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeConnectHost(host) {
  if (!host) return "127.0.0.1";
  if (host === "0.0.0.0" || host === "::") return "127.0.0.1";
  return host;
}

function safeUnlink(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

function readDevServerState() {
  try {
    return JSON.parse(fs.readFileSync(DEV_SERVER_STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeDevServerState() {
  try {
    fs.writeFileSync(
      DEV_SERVER_STATE_FILE,
      JSON.stringify(
        {
          pid: process.pid,
          host: HOST,
          port: activePort,
          root: ROOT,
          token: DEV_SERVER_SHUTDOWN_TOKEN,
          startedAt: Date.now(),
        },
        null,
        2
      )
    );
  } catch {
    // ignore
  }
}

function clearDevServerStateIfOwned() {
  const state = readDevServerState();
  if (!state || state.pid !== process.pid) return;
  safeUnlink(DEV_SERVER_STATE_FILE);
}

function httpGet({ host, port, reqPath, timeoutMs }) {
  return new Promise((resolve) => {
    const req = http.request({ host, port, path: reqPath, method: "GET" }, (res) => {
      res.resume();
      resolve({ statusCode: res.statusCode || 0 });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ statusCode: 0 });
    });
    req.on("error", () => resolve({ statusCode: 0 }));
    req.end();
  });
}

async function waitForPortToClose(host, port) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const { statusCode } = await httpGet({
      host,
      port,
      reqPath: DEV_SERVER_INFO_PATH,
      timeoutMs: 200,
    });
    if (statusCode === 0) return true;
    await delay(100);
  }
  return false;
}

async function tryShutdownPreviousInstance() {
  if (!DEV_SERVER_REPLACE) return false;
  if (PORT_FROM_ENV !== undefined && PORT_FROM_ENV !== "") return false;

  const state = readDevServerState();
  if (!state || typeof state.port !== "number" || typeof state.token !== "string") return false;
  if (state.pid === process.pid) return false;

  const connectHost = normalizeConnectHost(state.host || HOST);
  const shutdownPath = `${DEV_SERVER_SHUTDOWN_PATH}?token=${encodeURIComponent(state.token)}`;
  const { statusCode } = await httpGet({
    host: connectHost,
    port: state.port,
    reqPath: shutdownPath,
    timeoutMs: 800,
  });

  if (statusCode !== 200) {
    safeUnlink(DEV_SERVER_STATE_FILE);
    return false;
  }

  const closed = await waitForPortToClose(connectHost, state.port);
  if (closed) safeUnlink(DEV_SERVER_STATE_FILE);
  return closed;
}

function broadcastReload() {
  const payload = `event: reload\ndata: ${Date.now()}\n\n`;
  for (const client of liveReloadClients) {
    try {
      client.write(payload);
    } catch {
      liveReloadClients.delete(client);
    }
  }
}

let reloadTimer = null;
function scheduleReload() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    broadcastReload();
  }, 120);
}

function injectLiveReload(html) {
  if (!LIVE_RELOAD_ENABLED) return html;
  if (html.includes(LIVE_RELOAD_PATH)) return html;

  const snippet = `\n<!-- dev-server live reload -->\n<script>\n(() => {\n  if (window.__devServerLiveReloadInstalled) return;\n  window.__devServerLiveReloadInstalled = true;\n  if (typeof EventSource === 'undefined') return;\n  const es = new EventSource('${LIVE_RELOAD_PATH}');\n  es.addEventListener('reload', () => window.location.reload());\n})();\n</script>\n`;

  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${snippet}</body>`);
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${snippet}</head>`);
  return `${html}${snippet}`;
}

function createServer() {
  return http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsed.pathname || "/");
    const requestedPath = pathname.endsWith("/") ? `${pathname}index.html` : pathname;

    if (pathname === DEV_SERVER_INFO_PATH) {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(
        JSON.stringify({
          name: "portfolio-aws-dev-server",
          pid: process.pid,
          host: HOST,
          port: activePort,
          root: ROOT,
        })
      );
      return;
    }

    if (pathname === DEV_SERVER_SHUTDOWN_PATH) {
      const tokenFromQuery = parsed.query?.token;
      const token =
        (Array.isArray(tokenFromQuery) ? tokenFromQuery[0] : tokenFromQuery) ||
        req.headers["x-dev-server-token"];

      if (token !== DEV_SERVER_SHUTDOWN_TOKEN) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }

      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Shutting down");
      setTimeout(() => shutdown(0), 10).unref();
      return;
    }

    if (LIVE_RELOAD_ENABLED && pathname === LIVE_RELOAD_PATH) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");
      liveReloadClients.add(res);
      req.on("close", () => {
        liveReloadClients.delete(res);
      });
      return;
    }

    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(ROOT, safePath);

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        if (error.code === "ENOENT") {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Not Found");
          return;
        }

        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Internal Server Error");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });

      if (ext === ".html") {
        res.end(injectLiveReload(data.toString("utf8")));
        return;
      }

      res.end(data);
    });
  });
}

function startWatchers() {
  if (!LIVE_RELOAD_ENABLED || watchersStarted || shuttingDown) return;
  watchersStarted = true;

  function listDirsRecursive(rootDir) {
    const dirs = [rootDir];
    const queue = [rootDir];
    while (queue.length > 0) {
      const current = queue.pop();
      let entries;
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (ignoredDirNames.has(entry.name)) continue;
        if (entry.name.startsWith(".")) continue;
        const nextDir = path.join(current, entry.name);
        dirs.push(nextDir);
        queue.push(nextDir);
      }
    }
    return dirs;
  }

  function addWatcher(dir) {
    if (watchers.has(dir)) return;
    try {
      const watcher = fs.watch(dir, { persistent: true }, (_eventType, filename) => {
        if (!filename) {
          scheduleReload();
          return;
        }

        const name = typeof filename === "string" ? filename : filename.toString();
        if (!name || name.startsWith(".")) return;
        if (name.includes("node_modules")) return;
        scheduleReload();

        const fullPath = path.join(dir, name);
        try {
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            for (const nested of listDirsRecursive(fullPath)) addWatcher(nested);
          }
        } catch {
          // ignore
        }
      });

      watcher.on("error", () => {
        watchers.delete(dir);
      });

      watchers.set(dir, watcher);
    } catch {
      // ignore (e.g. too many watchers)
    }
  }

  for (const dir of listDirsRecursive(ROOT)) addWatcher(dir);
}

function stopWatchers() {
  for (const watcher of watchers.values()) {
    try {
      watcher.close();
    } catch {
      // ignore
    }
  }
  watchers.clear();
  watchersStarted = false;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const client of liveReloadClients) {
    try {
      client.end();
    } catch {
      // ignore
    }
  }
  liveReloadClients.clear();

  stopWatchers();

  const cleanupAndExit = () => {
    clearDevServerStateIfOwned();
    process.exit(exitCode);
  };

  if (!server || !server.listening) {
    cleanupAndExit();
    return;
  }

  server.close(cleanupAndExit);
  setTimeout(cleanupAndExit, 1_000).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => clearDevServerStateIfOwned());

function onServerError(error) {
  if (error && error.code === "EADDRINUSE") {
    if (PORT_FROM_ENV !== undefined && PORT_FROM_ENV !== "") {
      console.error(
        `Port ${activePort} is already in use. Stop the other process or run with a different port, e.g. PORT=${
          activePort + 1
        } npm run dev`
      );
      process.exit(1);
    }

    if (portTries >= MAX_PORT_TRIES) {
      console.error(
        `Port ${DEFAULT_PORT} is already in use and ${MAX_PORT_TRIES} subsequent ports were unavailable. Set PORT=... and retry.`
      );
      process.exit(1);
    }

    const nextPort = activePort + 1;
    portTries += 1;
    console.warn(`Port ${activePort} is in use; trying ${nextPort}...`);
    activePort = nextPort;

    server = createServer();
    server.on("error", onServerError);
    server.listen(activePort, HOST, onServerListening);
    return;
  }

  console.error(error);
  process.exit(1);
}

function onServerListening() {
  const address = server.address();
  if (address && typeof address === "object" && typeof address.port === "number") {
    activePort = address.port;
  }
  writeDevServerState();
  console.log(`Dev server running at http://${HOST}:${activePort}`);
  if (LIVE_RELOAD_ENABLED) startWatchers();
}

async function main() {
  await tryShutdownPreviousInstance();

  server = createServer();
  server.on("error", onServerError);
  server.listen(activePort, HOST, onServerListening);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
