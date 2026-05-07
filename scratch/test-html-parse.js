const { XMLParser } = require('fast-xml-parser');

async function test() {
  const url = 'https://www.teletica.com/rss';
  const resp = await fetch(url);
  const text = await resp.text();
  try {
    const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    xmlParser.parse(text);
  } catch (err) {
    console.error('fast-xml-parser error:', err.message);
  }
}

test();
