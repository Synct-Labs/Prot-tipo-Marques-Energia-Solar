/* =====================================================================
   HELPERS HTTP (sem dependências externas)
   ===================================================================== */

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB é mais que suficiente para um pedido

function parseJSONBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("Corpo da requisição muito grande"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(Object.assign(new Error("JSON inválido"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function sendJSON(res, statusCode, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function getClientIP(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

// Serve um arquivo binário (ex: comprovante de pagamento) direto do banco.
// "inline" deixa o navegador abrir a imagem/PDF na hora em vez de baixar.
function sendBinary(res, statusCode, buffer, contentType, filename) {
  res.writeHead(statusCode, {
    "Content-Type": contentType || "application/octet-stream",
    "Content-Length": buffer.length,
    "Content-Disposition": `inline; filename="${(filename || "comprovante").replace(/"/g, "")}"`,
  });
  res.end(buffer);
}

module.exports = { parseJSONBody, sendJSON, sendBinary, getClientIP };
