const FEED_URL = "https://fabiosilverio.substack.com/feed";

module.exports = async (req, res) => {
  try {
    const response = await fetch(FEED_URL, {
      headers: { "User-Agent": "RSN-Live/1.0" },
    });
    if (!response.ok) throw new Error(`Feed returned ${response.status}`);

    const xml = await response.text();
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = re.exec(xml)) && items.length < 6) {
      const block = match[1];
      const title = (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
        block.match(/<title>([\s\S]*?)<\/title>/) ||
        [])[1] || "";
      const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "";
      const desc = (block.match(
        /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/
      ) || block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "";
      const date = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "";
      items.push({
        title: title.trim(),
        link: link.trim(),
        description: desc.trim().slice(0, 140),
        date: date.trim(),
      });
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ items });
  } catch (err) {
    res.status(502).json({ error: err.message, items: [] });
  }
};