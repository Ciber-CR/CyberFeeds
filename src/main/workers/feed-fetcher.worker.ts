// Feed Fetcher Worker Thread
// Runs outside the main thread — fetches and parses RSS feeds in parallel
// No Electron APIs allowed here

import { parentPort, workerData } from 'worker_threads'
import RssParser from 'rss-parser'
import crypto from 'crypto'
import { XMLParser } from 'fast-xml-parser'

interface WorkerMessage {
  feeds: Array<{ id: string; url: string }>
  concurrency?: number
}

interface ParsedArticle {
  id: string
  feedId: string
  title: string
  link: string
  pubDate: number
  content: string
  snippet: string
  author?: string
  guid: string
  thumbnail?: string
}

interface FeedResult {
  feedId: string
  articles: ParsedArticle[]
  error?: string
  lastFetched: number
}

const parser = new RssParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'CyberFeeds/2.0 RSS Reader',
    Accept: 'application/rss+xml, application/xml, text/xml, */*'
  }
})

function makeId(feedId: string, guid: string): string {
  return crypto.createHash('sha1').update(`${feedId}:${guid}`).digest('hex')
}

function cleanHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}

/**
 * Extract the best thumbnail URL from an RSS item.
 * Priority: media:content → media:thumbnail → rss-parser fields → enclosure → og:image → first <img>
 */
function extractThumbnail(item: any): string | undefined {
  // 1. media:content (image type, with url)
  const mediaContent = item['media:content']
  if (mediaContent && typeof mediaContent === 'object') {
    const mc = Array.isArray(mediaContent) ? mediaContent.find((m: any) => m['@_type']?.startsWith('image')) || mediaContent[0] : mediaContent
    const url = mc['@_url'] || mc.url
    if (url) return url
  }

  // 2. media:thumbnail
  const mediaThumbnail = item['media:thumbnail']
  if (mediaThumbnail && typeof mediaThumbnail === 'object') {
    const mt = Array.isArray(mediaThumbnail) ? mediaThumbnail[0] : mediaThumbnail
    const url = mt['@_url'] || mt.url
    if (url) return url
  }

  // 3. rss-parser: item.thumbnail (string URL)
  if (item.thumbnail) return item.thumbnail

  // 4. rss-parser: item.thumbnails (array of { url, width, height })
  if (item.thumbnails && Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
    // Pick highest resolution
    const best = item.thumbnails.reduce((a: any, b: any) =>
      (a.width || 0) * (a.height || 0) > (b.width || 0) * (b.height || 0) ? a : b
    )
    if (best.url) return best.url
  }

  // 5. rss-parser: item.media.thumbnail (nested in media group)
  if (item.media && item.media.thumbnail) {
    const mt = item.media.thumbnail
    if (typeof mt === 'string') return mt
    if (mt.url) return mt.url
    if (mt['@_url']) return mt['@_url']
  }

  // 6. rss-parser: item.media.content (nested media:content)
  if (item.media && item.media.content) {
    const mc = Array.isArray(item.media.content) ? item.media.content[0] : item.media.content
    if (mc && mc.url && !mc.url.includes('youtube.com/watch')) return mc.url
  }

  // 7. enclosure with image type
  const enclosures = item.enclosures || item['media:enclosure']
  if (enclosures) {
    const enc = Array.isArray(enclosures) ? enclosures : [enclosures]
    for (const e of enc) {
      const url = e['@_url'] || e.url
      const type = (e['@_type'] || e.type || '').toLowerCase()
      if (url && type.startsWith('image')) return url
    }
  }

  // 8. og:image meta tag in content
  const rawContent = item['content:encoded'] || item.content || ''
  const ogMatch = rawContent.match(/<meta\s+(?:property|"og:image")\s*=\s*"(og:image)"\s+content\s*=\s*"([^"]+)"/i)
    || rawContent.match(/<meta\s+content\s*=\s*"([^"]+)"\s+(?:property|"og:image")\s*=\s*"(og:image)"/i)
  if (ogMatch) return ogMatch[1]

  // 9. First <img> tag in content
  const imgMatch = rawContent.match(/<img[^>]+src\s*=\s*"([^"]+)"/i)
  if (imgMatch) return imgMatch[1]

  // 10. YouTube fallback: extract video ID from link and construct thumbnail URL
  const link = item.link || ''
  const ytMatch = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/)
  if (ytMatch) {
    return `https://i.ytimg.com/vi/${ytMatch[1]}/maxresdefault.jpg`
  }

  return undefined
}

async function fetchFeed(feedId: string, url: string): Promise<FeedResult> {
  const lastFetched = Date.now()
  try {
    let feed: any
    try {
      feed = await parser.parseURL(url)
    } catch (err) {
      console.error(`[Worker] Standard RSS parsing failed for ${url}, trying robust fallback...`, err)
      const resp = await fetch(url)
      let text = await resp.text()

      if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
        const lowerUrl = url.toLowerCase()
        if (lowerUrl.endsWith('/rss') || lowerUrl.endsWith('/rss/')) {
          const guessUrl = lowerUrl.endsWith('/') ? `${url}feed` : `${url}/feed`
          const guessResp = await fetch(guessUrl)
          if (guessResp.ok) {
            text = await guessResp.text()
          }
        }
      }

      const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
      const parsed = xmlParser.parse(text)
      const channel = parsed.rss?.channel || parsed.feed || parsed
      const rawItems = Array.isArray(channel.item) ? channel.item : 
                       Array.isArray(channel.entry) ? channel.entry : 
                       channel.item ? [channel.item] : 
                       channel.entry ? [channel.entry] : []
      
      const items: any[] = []
      rawItems.forEach((item: any) => {
        const title = item.title?.['#text'] || item.title || 'Untitled'
        const link = item.link?.['@_href'] || item.link || ''
        const content = item['content:encoded'] || item.content?.['#text'] || item.content || item.description || ''
        const pubDate = item.pubDate || item.published || item.updated || ''
        const guid = item.guid?.['#text'] || item.guid || item.id || link
        items.push({ title, link, content, contentSnippet: truncate(cleanHtml(content), 300), pubDate, guid })
      })

      if (items.length === 0) {
        if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
          throw new Error('The URL provided is a webpage, not an RSS feed.')
        }
        throw err
      }
      feed = { items }
    }

    const articles: ParsedArticle[] = (feed.items || []).slice(0, 100).map(item => {
      const guid = item.guid || item.link || item.title || String(Math.random())
      const id = makeId(feedId, guid)
      const rawContent = item['content:encoded'] || item.content || item.contentSnippet || ''
      const rawSnippet = item.contentSnippet || cleanHtml(rawContent)
      const pubDate = item.pubDate ? new Date(item.pubDate).getTime() : lastFetched
      const thumbnail = extractThumbnail(item)

      return {
        id,
        feedId,
        title: item.title?.trim() || '(No title)',
        link: item.link || '',
        pubDate: isNaN(pubDate) ? lastFetched : pubDate,
        content: rawContent,
        snippet: truncate(cleanHtml(rawSnippet), 300),
        author: item.creator || item.author || undefined,
        guid,
        thumbnail
      }
    })
    return { feedId, articles, lastFetched }
  } catch (err) {
    return { feedId, articles: [], error: String(err), lastFetched }
  }
}

async function run(): Promise<void> {
  const msg: WorkerMessage = workerData
  const { feeds, concurrency = 5 } = msg

  // Process in batches for controlled concurrency
  for (let i = 0; i < feeds.length; i += concurrency) {
    const batch = feeds.slice(i, i + concurrency)
    const results = await Promise.all(batch.map(f => fetchFeed(f.id, f.url)))
    for (const result of results) {
      parentPort!.postMessage(result)
    }
  }

  parentPort!.postMessage({ done: true })
}

run().catch(err => {
  parentPort!.postMessage({ error: String(err), done: true })
})
