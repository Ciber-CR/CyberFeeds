const { XMLParser } = require('fast-xml-parser');

async function test() {
  const url = 'https://www.teletica.com/rss';
  console.log(`Fetching ${url} with RSS Accept header...`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });
    const text = await resp.text();
    console.log('Text length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));

    const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = xmlParser.parse(text);
    
    if (parsed.rss) {
        console.log('SUCCESS: RSS found!');
    } else if (text.includes('<!DOCTYPE html>')) {
        console.log('STILL HTML :(');
    } else {
        console.log('Unknown format');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
