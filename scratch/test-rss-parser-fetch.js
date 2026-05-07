const RssParser = require('rss-parser');

async function test() {
  const url = 'https://www.teletica.com/rss';
  const rp = new RssParser({ timeout: 10000 });
  try {
    await rp.parseURL(url);
    console.log('rss-parser SUCCESS on ' + url);
  } catch (err) {
    console.error('rss-parser error on ' + url + ':', err.message);
  }

  const url2 = 'https://www.teletica.com/rss/feed';
  try {
    await rp.parseURL(url2);
    console.log('rss-parser SUCCESS on ' + url2);
  } catch (err) {
    console.error('rss-parser error on ' + url2 + ':', err.message);
  }
}

test();
