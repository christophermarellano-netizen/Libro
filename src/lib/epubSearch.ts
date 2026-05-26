import type { SearchHit, TocEntry } from '../types'

type EpubBookInstance = {
  loaded: { navigation: Promise<{ toc: unknown[] }>; spine: Promise<unknown> }
  spine: { spineItems: Array<{
    linear?: string
    href?: string
    load: (loader: (url: string) => Promise<object>) => Promise<void>
    search: (query: string) => Array<{ cfi: string; excerpt: string }>
  }> }
  load: (path: string) => Promise<object>
}

export async function loadToc(book: EpubBookInstance): Promise<TocEntry[]> {
  const nav = await book.loaded.navigation
  const mapItems = (items: Array<{ id: string; href: string; label: string; subitems?: unknown[] }>): TocEntry[] =>
    items.map((item) => ({
      id: item.id,
      href: item.href,
      label: item.label,
      subitems: item.subitems?.length
        ? mapItems(item.subitems as Array<{ id: string; href: string; label: string; subitems?: unknown[] }>)
        : undefined,
    }))
  return mapItems((nav.toc ?? []) as Array<{ id: string; href: string; label: string; subitems?: unknown[] }>)
}

export async function searchEpub(book: EpubBookInstance, query: string): Promise<SearchHit[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  await book.loaded.spine
  const hits: SearchHit[] = []
  const maxResults = 40

  for (const item of book.spine.spineItems) {
    if (hits.length >= maxResults) break
    if (item.linear === 'no') continue

    await item.load(book.load.bind(book))
    const matches = item.search(trimmed) as Array<{ cfi: string; excerpt: string }>
    for (const match of matches) {
      hits.push({
        cfi: match.cfi,
        excerpt: match.excerpt,
        href: item.href,
      })
      if (hits.length >= maxResults) break
    }
  }

  return hits
}

export function chapterLabelForHref(toc: TocEntry[], href: string): string | undefined {
  const target = href.split('#')[0]
  let found: string | undefined

  const walk = (items: TocEntry[]) => {
    for (const item of items) {
      const itemHref = item.href.split('#')[0]
      if (target.endsWith(itemHref) || itemHref.endsWith(target)) {
        found = item.label
      }
      if (item.subitems) walk(item.subitems)
    }
  }

  walk(toc)
  return found
}
