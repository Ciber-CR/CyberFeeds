/** Viewport point at the center of a fully decoded <img>, or null if it is not paintable. */
export function imageCopyPoint(img: HTMLImageElement): { x: number; y: number } | null {
  if (!img.complete || img.naturalWidth === 0) return null
  const r = img.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return null
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
}

/**
 * Copy an image already shown in the UI. Prefers Chromium's copyImageAt (original
 * decoded bytes, no network). Falls back to a session-cached URL fetch.
 */
export async function copyArticleImage(opts: {
  img?: HTMLImageElement | null
  url?: string | null
}): Promise<void> {
  const point = opts.img ? imageCopyPoint(opts.img) : null
  if (point) {
    try {
      const at = await window.api.copyImageAt(point.x, point.y)
      if (at?.ok) return
    } catch (err) {
      console.error('[CopyImage] copyImageAt failed:', err)
    }
  }
  const url = opts.url || opts.img?.currentSrc || opts.img?.src
  if (url) {
    const result = await window.api.copyImageToClipboard(url)
    if (!result?.ok) {
      console.error('[CopyImage] Fetch fallback failed:', result?.error)
    }
  }
}

export function featuredThumbImg(articleId: string): HTMLImageElement | null {
  return document.querySelector(
    `.article-item[data-article-id="${CSS.escape(articleId)}"] .article-thumbnail img`
  )
}
