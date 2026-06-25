const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const uploadDir = process.env.UPLOAD_DIR || path.join(root, "uploads");
const storeFile = path.join(dataDir, "store.json");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const userAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

ensureStorage();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/data") {
      sendJson(res, readStore());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/audio") {
      sendJson(res, listAudioFiles());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/links") {
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const item = await createLinkItem(payload);
      const store = readStore();
      store.links = store.links.filter((link) => link.url !== item.url);
      store.links.unshift(item);
      writeStore(store);
      sendJson(res, item, 201);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/posts") {
      const body = await readBody(req, 25_000_000);
      const payload = JSON.parse(body || "{}");
      const post = createPost(payload);
      const store = readStore();
      store.posts.unshift(post);
      writeStore(store);
      sendJson(res, post, 201);
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/links/")) {
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const store = readStore();
      store.links = store.links.filter((item) => item.id !== id);
      writeStore(store);
      sendJson(res, { ok: true });
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/posts/")) {
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const store = readStore();
      store.posts = store.posts.filter((item) => item.id !== id);
      writeStore(store);
      sendJson(res, { ok: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/preview") {
      const body = await readBody(req);
      const { url: targetUrl } = JSON.parse(body || "{}");
      const preview = await getPreview(targetUrl);
      sendJson(res, preview);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/image") {
      await proxyImage(url.searchParams.get("url"), res);
      return;
    }

    const filePath = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    serveFile(path.join(root, filePath), res);
  } catch (error) {
    sendJson(res, { error: "server_error", message: error.message }, 500);
  }
});

server.listen(port, host, () => {
  console.log(`台湾铁杆粉栖息地已启动：http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
});

async function createLinkItem(payload) {
  const parsed = parseShare(String(payload.text || payload.url || ""));
  if (!parsed.url) throw new Error("missing url");

  const preview = await getPreview(parsed.url).catch(() => ({}));
  return {
    id: createId(),
    kind: payload.kind === "dance" ? "dance" : "travel",
    title: preview.title || parsed.title || "未命名收藏",
    url: parsed.url,
    cover: preview.cover || parsed.cover || "",
    sourceUrl: preview.sourceUrl || parsed.url,
    savedAt: Date.now()
  };
}

function createPost(payload) {
  const text = String(payload.text || "").trim();
  if (!text && !Array.isArray(payload.images)) throw new Error("empty post");

  const images = Array.isArray(payload.images)
    ? payload.images.slice(0, 1).map(saveDataImage).filter(Boolean)
    : [];

  return {
    id: createId(),
    author: String(payload.author || "zhiya & yukiri").trim().slice(0, 30),
    text: text.slice(0, 2000),
    images,
    createdAt: Date.now()
  };
}

function saveDataImage(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i);
  if (!match) return "";

  const mime = match[1].toLowerCase();
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, Buffer.from(match[2], "base64"));
  return `/uploads/${fileName}`;
}

async function getPreview(targetUrl) {
  if (!/^https?:\/\//i.test(targetUrl || "")) {
    return {};
  }

  const targetHost = new URL(targetUrl).hostname;
  const response = await fetch(targetUrl, {
    redirect: "follow",
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
      referer: pickReferer(targetHost)
    }
  });

  const html = await response.text();
  const title =
    pickNoteTitle(html) ||
    pickMeta(html, ["og:title", "twitter:title", "description"]) ||
    pickTitle(html) ||
    "";
  const rawCover =
    pickFirstNoteImage(html) ||
    pickUsefulImage(pickMeta(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"])) ||
    pickImageFromHtml(html) ||
    "";
  const cover = rawCover ? `/api/image?url=${encodeURIComponent(rawCover)}` : "";

  return {
    title: cleanText(title),
    cover,
    sourceUrl: response.url || targetUrl,
    ok: Boolean(rawCover)
  };
}

async function proxyImage(targetUrl, res) {
  if (!/^https?:\/\//i.test(targetUrl || "")) {
    res.writeHead(400);
    res.end("bad image url");
    return;
  }

  const response = await fetch(targetUrl, {
    headers: {
      "user-agent": userAgent,
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      referer: pickReferer(new URL(targetUrl).hostname)
    }
  });

  if (!response.ok) {
    res.writeHead(response.status);
    res.end("image fetch failed");
    return;
  }

  res.writeHead(200, {
    "content-type": response.headers.get("content-type") || "image/jpeg",
    "cache-control": "public, max-age=86400"
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}

function parseShare(text) {
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  const url = urlMatch ? trimUrl(urlMatch[0]) : "";
  const allUrls = [...text.matchAll(/https?:\/\/[^\s]+/gi)].map((match) => trimUrl(match[0]));
  const cover = allUrls.find((item) => /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(item) && item !== url) || "";
  const beforeUrl = url ? text.slice(0, text.indexOf(urlMatch[0])) : text;
  const firstLine = beforeUrl.split(/\n/).map((line) => line.trim()).find(Boolean) || "";
  const title = firstLine
    .replace(/\s*Hi[，,].*$/i, "")
    .replace(/\s*来【小红书】.*$/i, "")
    .replace(/\s*复制此链接.*$/i, "")
    .trim();
  return { title, url, cover };
}

function trimUrl(url) {
  return url.replace(/[，。！？、,.!?]+$/g, "");
}

function pickMeta(html, names) {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    const reversed = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapeRegExp(name)}["'][^>]*>`,
      "i"
    );
    const match = html.match(pattern) || html.match(reversed);
    if (match) return decodeHtml(match[1]);
  }
  return "";
}

function pickTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1]) : "";
}

function pickNoteTitle(html) {
  const unescaped = unescapeHtmlPayload(html);
  const matches = [...unescaped.matchAll(/"title"\s*:\s*"([^"]{4,160})"/g)];
  const found = matches
    .map((match) => decodeJsonString(match[1]))
    .find((title) => !/小红书|打开App|登录|广告/.test(title));
  return found || "";
}

function pickFirstNoteImage(html) {
  const unescaped = unescapeHtmlPayload(html);
  const imgTags = [...unescaped.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const firstNoteImg = imgTags.find((tag) => /normal_note_first_img|data-xhs-img/i.test(tag));
  const src = firstNoteImg ? pickAttribute(firstNoteImg, "src") : "";
  if (isUsefulNoteImage(src)) return src;

  const normalCover = imgTags
    .map((tag) => pickAttribute(tag, "src"))
    .find((item) => isUsefulNoteImage(item));
  return normalCover || "";
}

function pickImageFromHtml(html) {
  const unescaped = unescapeHtmlPayload(html);
  const matches = [
    ...unescaped.matchAll(/https?:\/\/[^"'`\s<>]+?(?:\.jpg|\.jpeg|\.png|\.webp|!h5_1080jpg)(?:\?[^"'`\s<>]*)?/gi),
    ...unescaped.matchAll(/https?:\/\/[^"'`\s<>]*(?:douyinpic|byteimg|xhscdn)[^"'`\s<>]*/gi)
  ];
  const found = matches.map((match) => match[0]).find((item) => isUsefulNoteImage(item));
  return found || "";
}

function cleanText(value) {
  return decodeHtml(String(value || ""))
    .replace(/\s+/g, " ")
    .replace(/\s+-\s+小红书\s*$/i, "")
    .replace(/\s+-\s+抖音\s*$/i, "")
    .replace(/^抖音\s*-\s*/i, "")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeJsonString(value) {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`);
  } catch {
    return value.replaceAll("\\u002F", "/").replaceAll("\\/", "/");
  }
}

function unescapeHtmlPayload(html) {
  return html
    .replaceAll("\\u002F", "/")
    .replaceAll("\\/", "/")
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"');
}

function pickAttribute(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

function pickUsefulImage(url) {
  return isUsefulNoteImage(url) ? url : "";
}

function isUsefulNoteImage(url) {
  if (!url) return false;
  if (/avatar|favicon|picasso-static|fe-platform|static|logo|icon/i.test(url)) return false;
  if (/xhscdn\.com|xiaohongshu\.com/i.test(url)) return /sns-webpic|sns-img|sns-na/i.test(url);
  if (/douyinpic\.com|byteimg\.com|douyinstatic\.com/i.test(url)) return true;
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(url);
}

function pickReferer(hostname) {
  if (/douyin|iesdouyin|byteimg|douyinpic/i.test(hostname)) return "https://www.douyin.com/";
  if (/xiaohongshu|xhslink|xhscdn/i.test(hostname)) return "https://www.xiaohongshu.com/";
  return "https://www.google.com/";
}

function readStore() {
  ensureStorage();
  try {
    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8"));
    return {
      links: Array.isArray(parsed.links) ? parsed.links : [],
      posts: Array.isArray(parsed.posts) ? parsed.posts : []
    };
  } catch {
    return { links: [], posts: [] };
  }
}

function writeStore(store) {
  ensureStorage();
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

function ensureStorage() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(storeFile)) {
    fs.writeFileSync(storeFile, JSON.stringify({ links: [], posts: [] }, null, 2));
  }
}

function listAudioFiles() {
  const places = [
    { dir: root, prefix: "" },
    { dir: path.join(root, "audio"), prefix: "audio/" }
  ];
  const seen = new Set();
  const tracks = [];

  for (const place of places) {
    if (!fs.existsSync(place.dir)) continue;
    for (const fileName of fs.readdirSync(place.dir)) {
      if (!/\.mp3$/i.test(fileName)) continue;
      const src = `${place.prefix}${fileName}`;
      if (seen.has(src)) continue;
      seen.add(src);
      tracks.push({
        title: path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, " "),
        src
      });
    }
  }

  return tracks;
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readBody(req, maxLength = 200_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxLength) {
        req.destroy();
        reject(new Error("request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function serveFile(file, res) {
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const type = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp3": "audio/mpeg"
  }[ext] || "application/octet-stream";

  res.writeHead(200, { "content-type": type });
  fs.createReadStream(file).pipe(res);
}
