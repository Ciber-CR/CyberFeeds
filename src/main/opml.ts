import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import fs from 'fs'
import type { Feed, Folder } from './types'

interface OpmlOutline {
  '@_text'?: string
  '@_title'?: string
  '@_type'?: string
  '@_xmlUrl'?: string
  '@_htmlUrl'?: string
  outline?: OpmlOutline | OpmlOutline[]
}

export interface OpmlImportResult {
  feeds: Array<{ title: string; url: string; link?: string; folderName?: string }>
}

export function importOpml(filePath: string): OpmlImportResult {
  const content = fs.readFileSync(filePath, 'utf-8')
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(content)

  const feeds: OpmlImportResult['feeds'] = []
  const body = parsed?.opml?.body
  if (!body) return { feeds }

  function processOutline(outline: OpmlOutline, folderName?: string): void {
    const xmlUrl = outline['@_xmlUrl'] || outline['xmlUrl']
    const text = outline['@_text'] || outline['@_title'] || outline['text'] || outline['title']
    const htmlUrl = outline['@_htmlUrl'] || outline['htmlUrl']

    if (xmlUrl) {
      feeds.push({ title: String(text || xmlUrl), url: String(xmlUrl), link: htmlUrl ? String(htmlUrl) : undefined, folderName })
    } else if (outline.outline) {
      const children = Array.isArray(outline.outline) ? outline.outline : [outline.outline]
      children.forEach(child => processOutline(child, text ? String(text) : undefined))
    }
  }

  const outlines = Array.isArray(body.outline) ? body.outline : body.outline ? [body.outline] : []
  outlines.forEach((o: OpmlOutline) => processOutline(o))

  return { feeds }
}

export function exportOpml(feeds: Feed[], folders: Folder[]): string {
  const grouped = new Map<string, Feed[]>()

  for (const feed of feeds) {
    const key = feed.folderId || ''
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(feed)
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true
  })

  const outlines: object[] = []

  // Unfoldered feeds
  const unfiled = grouped.get('') || []
  for (const feed of unfiled) {
    outlines.push({
      '@_text': feed.title,
      '@_title': feed.title,
      '@_type': 'rss',
      '@_xmlUrl': feed.url,
      '@_htmlUrl': feed.link || ''
    })
  }

  // Foldered feeds
  for (const folder of folders) {
    const folderFeeds = grouped.get(folder.id) || []
    if (folderFeeds.length === 0) continue
    outlines.push({
      '@_text': folder.name,
      '@_title': folder.name,
      outline: folderFeeds.map(feed => ({
        '@_text': feed.title,
        '@_title': feed.title,
        '@_type': 'rss',
        '@_xmlUrl': feed.url,
        '@_htmlUrl': feed.link || ''
      }))
    })
  }

  const xml = builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    opml: {
      '@_version': '2.0',
      head: { title: 'CyberFeeds Subscriptions' },
      body: { outline: outlines }
    }
  })

  return xml
}

// Suppress unused warning
void XMLParser
