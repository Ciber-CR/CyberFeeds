import { FEED_USER_AGENT, fetchWithRetry } from './reddit'

export function isYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (trimmed.startsWith('@')) return true
  return /(?:youtube\.com|youtu\.be)/i.test(trimmed)
}

/** Extract 11-character YouTube video ID from any link, guid, or embed url */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null
  const str = input.trim()

  // yt:video:VIDEO_ID
  const ytPrefix = str.match(/yt:video:([a-zA-Z0-9_-]{11})/i)
  if (ytPrefix) return ytPrefix[1]

  // https://www.youtube.com/watch?v=VIDEO_ID or /shorts/VIDEO_ID or /embed/VIDEO_ID
  const urlMatch = str.match(/(?:youtube\.com\/(?:watch\?.*?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i)
  if (urlMatch) return urlMatch[1]

  // Pure 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str

  return null
}

/** Get canonical YouTube GUID: always 'yt:video:VIDEO_ID' */
export function getYouTubeCanonicalGuid(item: any): string | null {
  const raw = item.guid?.['#text'] || item.guid || item.id || item['yt:videoId'] || item.link?.['@_href'] || item.link || ''
  const videoId = extractYouTubeVideoId(String(raw))
  if (videoId) return `yt:video:${videoId}`
  return null
}

/** Get high-quality thumbnail for YouTube video */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * Resolve any YouTube URL (handle @name, channel URL, playlist, custom URL)
 * to its canonical RSS XML feed URL (e.g. https://www.youtube.com/feeds/videos.xml?channel_id=UC...).
 */
export async function resolveYouTubeFeedUrl(rawUrl: string): Promise<string | null> {
  let url = rawUrl.trim()
  if (!isYouTubeUrl(url)) return null

  // If already a feed URL
  if (url.includes('youtube.com/feeds/videos.xml')) {
    return url.startsWith('http') ? url : `https://${url}`
  }

  // Direct channel ID URL: https://www.youtube.com/channel/UCxxxx
  const channelMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/i)
  if (channelMatch) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelMatch[1]}`
  }

  // Playlist URL: https://www.youtube.com/playlist?list=PLxxxx
  const playlistMatch = url.match(/youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/i)
  if (playlistMatch) {
    return `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistMatch[1]}`
  }

  // Format full URL for handle or custom username
  let targetUrl = url
  if (targetUrl.startsWith('@')) {
    targetUrl = `https://www.youtube.com/${targetUrl}`
  } else if (!targetUrl.startsWith('http')) {
    targetUrl = `https://${targetUrl}`
  }

  try {
    const resp = await fetchWithRetry(targetUrl, {
      headers: {
        'User-Agent': FEED_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, { timeoutMs: 5000, retries: 2 })

    if (!resp.ok) return null
    const text = await resp.text()

    // 1. Check for standard RSS link tag in HTML header
    const rssTagMatch = text.match(/<link[^>]+href=["'](https:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id=UC[a-zA-Z0-9_-]+)["']/i) ||
                        text.match(/<link[^>]+href=["']([^"']*\/feeds\/videos\.xml\?[^"']+)["']/i)
    if (rssTagMatch && rssTagMatch[1]) {
      const href = rssTagMatch[1]
      return href.startsWith('http') ? href : `https://www.youtube.com${href}`
    }

    // 2. Extract channelId / externalId from YouTube JSON / meta tags
    const idMatch = text.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/) ||
                    text.match(/"externalId":"(UC[a-zA-Z0-9_-]+)"/) ||
                    text.match(/<meta[^>]+itemprop=["']channelId["'][^>]+content=["'](UC[a-zA-Z0-9_-]+)["']/i) ||
                    text.match(/<meta[^>]+itemprop=["']identifier["'][^>]+content=["'](UC[a-zA-Z0-9_-]+)["']/i) ||
                    text.match(/channel_id=(UC[a-zA-Z0-9_-]+)/)

    if (idMatch && idMatch[1]) {
      return `https://www.youtube.com/feeds/videos.xml?channel_id=${idMatch[1]}`
    }
  } catch (err) {
    console.warn(`[YouTube] Failed to resolve channel feed for ${url}:`, err)
  }

  return null
}
