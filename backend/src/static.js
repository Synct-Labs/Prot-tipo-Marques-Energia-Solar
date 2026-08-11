/* =====================================================================
   SERVIDOR DE ARQUIVOS ESTÁTICOS (sem dependências externas)
   ---------------------------------------------------------------------
   Serve o site (index.html, app.js, styles.css, logo-*, admin/*) a
   partir da raiz do projeto (um nível acima da pasta backend/).
   ===================================================================== */
const fs = require("fs");
const path = require("path");

const SITE_ROOT = path.join(__dirname, "..", "..");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const target = path.normalize(path.join(root, decoded));
  if (!target.startsWith(root)) return null; // bloqueia path traversal (../)
  return target;
}

function serveStatic(req, res) {
  let urlPath = req.url === "/" ? "/index.html" : req.url;
  let filePath = safeJoin(SITE_ROOT, urlPath);

  if (!filePath) {
    res.writeHead(400);
    res.end("Requisição inválida");
    return true;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  // Não expor a pasta backend/ (código-fonte, .env, banco de dados) via HTTP.
  const backendDir = path.join(SITE_ROOT, "backend");
  if (filePath.startsWith(backendDir)) {
    return false;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false; // deixa o chamador decidir (404 ou tentar outra rota)
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

module.exports = { serveStatic };
