async function findRss() {
  const url = 'https://www.teletica.com/rss';
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const text = await resp.text();
    const regex = /href="([^"]+)"[^>]*type="application\/(rss\+xml|atom\+xml)"/g;
    let match;
    console.log('Searching for RSS links...');
    while ((match = regex.exec(text)) !== null) {
        console.log('Found RSS link:', match[1]);
    }
    
    const regex2 = /href="([^"]+\.xml)"/g;
    while ((match = regex2.exec(text)) !== null) {
        console.log('Found .xml link:', match[1]);
    }

    const regex3 = /"rss":"([^"]+)"/g;
    while ((match = regex3.exec(text)) !== null) {
        console.log('Found json rss link:', match[1]);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

findRss();
