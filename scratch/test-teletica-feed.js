const { XMLParser } = require('fast-xml-parser');
const RssParser = require('rss-parser');

async function test() {
  const url = 'https://www.teletica.com/rss/feed';
  console.log(`Fetching ${url}...`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, text/html, */*'
      }
    });
    const text = await resp.text();
    console.log('Text length:', text.length);

    console.log('\n--- Testing rss-parser ---');
    try {
      const rp = new RssParser();
      await rp.parseString(text);
      console.log('rss-parser: SUCCESS');
    } catch (e) {
      console.error('rss-parser:', e.message);
    }

    console.log('\n--- Testing fast-xml-parser ---');
    try {
      const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      xmlParser.parse(text);
      console.log('fast-xml-parser: SUCCESS');
    } catch (e) {
      console.error('fast-xml-parser:', e.message);
    }

  } catch (err) {
    console.error('Network Error:', err);
  }
}

test();
