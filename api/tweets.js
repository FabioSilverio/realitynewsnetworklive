function decodeHTMLEntities(text) {
  if (!text) return "";
  const map = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&#x2F;": "/",
    "&#x27;": "'",
    "&#x60;": "`"
  };
  return text.replace(/&(?:amp|lt|gt|quot|#39|apos|#x2F|#x27|#x60);/g, (m) => map[m] || m);
}

function parseRSS(xml) {
  const items = [];
  const regex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const block = m[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/);
    const link = block.match(/<link>([\s\S]*?)<\/link>/);
    const date = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (title && link) {
      items.push({
        text: decodeHTMLEntities(title[1].trim()),
        url: link[1].trim().replace(/^https?:\/\/nitter\./, "https://x."),
        date: date ? date[1].trim() : ""
      });
    }
  }
  return items.slice(0, 20);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const instances = [
    "https://nitter.privacydev.net",
    "https://nitter.projectsegfault.com",
    "https://nitter.mint.lgbt",
    "https://nitter.cz"
  ];

  for (const base of instances) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10000);
      const r = await fetch(`${base}/faaretz/rss`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/rss+xml,application/xml,text/xml,*/*"
        },
        signal: controller.signal
      });
      clearTimeout(t);
      if (!r.ok) continue;
      const xml = await r.text();
      if (!xml.includes("<item>")) continue;
      const tweets = parseRSS(xml);
      if (tweets.length === 0) continue;
      return res.status(200).json({ tweets, source: base, updated: new Date().toISOString() });
    } catch {
      continue;
    }
  }

  return res.status(503).json({ error: "Nitter instances unavailable", tweets: [] });
}
