const { XMLParser } = require('fast-xml-parser');

async function test() {
  const url = 'https://www.teletica.com/rss';
  console.log(`Fetching ${url}...`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const text = await resp.text();
    console.log('Text length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));

    const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = xmlParser.parse(text);
    
    console.log('Keys in parsed:', Object.keys(parsed));
    if (parsed.rss) console.log('Keys in parsed.rss:', Object.keys(parsed.rss));
    
    const channel = parsed.rss?.channel || parsed.feed || parsed;
    console.log('Channel title:', channel.title);
    
    const rawItems = Array.isArray(channel.item) ? channel.item : 
                     Array.isArray(channel.entry) ? channel.entry : 
                     channel.item ? [channel.item] : 
                     channel.entry ? [channel.entry] : [];
    
    console.log('Items found:', rawItems.length);
    if (rawItems.length > 0) {
        console.log('First item title:', rawItems[0].title);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
