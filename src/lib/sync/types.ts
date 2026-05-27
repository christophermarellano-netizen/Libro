import type { AppSettings, Book, Bookmark, ReadingProgress, VocabEntry } from '../../types'

export interface CloudBook {
  id: string
  user_id: string
  local_id: number | null
  title: string
  author: string
  cover_source: string
  isbn: string | null
  page_count: number | null
  print_type: string | null
  physical_height_mm: number
  physical_width_mm: number
  physical_thickness_mm: number
  dimension_source: string
  spine_color_hex: string
  spine_text_color_hex: string
  preset_index: number | null
  storage_path: string
  cover_path: string
  added_at: number
  last_opened_at: number | null
  updated_at: number
}

export interface CloudProgress {
  book_id: string
  user_id: string
  cfi: string
  percentage: number
  updated_at: number
}

export interface CloudBookmark {
  id: string
  book_id: string
  user_id: string
  cfi: string
  label: string
  percentage: number
  created_at: number
}

export interface CloudVocab {
  id: string
  book_id: string | null
  user_id: string
  word: string
  translation: string
  context: string | null
  added_at: number
}

export interface CloudSettings {
  user_id: string
  deepl_api_key: string | null
  amazon_access_key: string | null
  amazon_secret_key: string | null
  amazon_partner_tag: string | null
  amazon_marketplace: string | null
  reader_font_size: number
  reader_font_family: string
  reader_theme: string
  reader_line_spacing: number
  reader_margin: number
  reader_translation_enabled: boolean
  reading_time_date: string | null
  reading_time_today_ms: number | null
  library_sort: string
  library_view: string
  updated_at: number
}

export function bookToCloudRow(book: Book, userId: string, cloudId: string): Omit<CloudBook, 'user_id'> & { user_id: string } {
  const now = Date.now()
  return {
    id: cloudId,
    user_id: userId,
    local_id: book.id ?? null,
    title: book.title,
    author: book.author,
    cover_source: book.coverSource,
    isbn: book.isbn ?? null,
    page_count: book.pageCount ?? null,
    print_type: book.printType ?? null,
    physical_height_mm: book.physicalHeightMm,
    physical_width_mm: book.physicalWidthMm,
    physical_thickness_mm: book.physicalThicknessMm,
    dimension_source: book.dimensionSource,
    spine_color_hex: book.spineColorHex,
    spine_text_color_hex: book.spineTextColorHex,
    preset_index: book.presetIndex ?? null,
    storage_path: `${userId}/${cloudId}/book.epub`,
    cover_path: `${userId}/${cloudId}/cover`,
    added_at: book.addedAt,
    last_opened_at: book.lastOpenedAt ?? null,
    updated_at: book.syncUpdatedAt ?? now,
  }
}

export function cloudRowToBookMeta(row: CloudBook): Omit<Book, 'epubBlob' | 'coverBlob'> {
  return {
    id: row.local_id ?? undefined,
    cloudId: row.id,
    title: row.title,
    author: row.author,
    coverSource: row.cover_source as Book['coverSource'],
    isbn: row.isbn ?? undefined,
    pageCount: row.page_count ?? undefined,
    printType: row.print_type ?? undefined,
    physicalHeightMm: row.physical_height_mm,
    physicalWidthMm: row.physical_width_mm,
    physicalThicknessMm: row.physical_thickness_mm,
    dimensionSource: row.dimension_source as Book['dimensionSource'],
    spineColorHex: row.spine_color_hex,
    spineTextColorHex: row.spine_text_color_hex,
    presetIndex: row.preset_index ?? undefined,
    addedAt: row.added_at,
    lastOpenedAt: row.last_opened_at ?? undefined,
    syncUpdatedAt: row.updated_at,
  }
}

export function settingsToCloudRow(settings: AppSettings, userId: string): CloudSettings {
  return {
    user_id: userId,
    deepl_api_key: settings.deeplApiKey ?? null,
    amazon_access_key: settings.amazonAccessKey ?? null,
    amazon_secret_key: settings.amazonSecretKey ?? null,
    amazon_partner_tag: settings.amazonPartnerTag ?? null,
    amazon_marketplace: settings.amazonMarketplace ?? null,
    reader_font_size: settings.readerFontSize,
    reader_font_family: settings.readerFontFamily,
    reader_theme: settings.readerTheme,
    reader_line_spacing: settings.readerLineSpacing,
    reader_margin: settings.readerMargin,
    reader_translation_enabled: settings.readerTranslationEnabled,
    reading_time_date: settings.readingTimeDate ?? null,
    reading_time_today_ms: settings.readingTimeTodayMs ?? null,
    library_sort: settings.librarySort,
    library_view: settings.libraryView,
    updated_at: settings.syncUpdatedAt ?? Date.now(),
  }
}

export function cloudRowToSettings(row: CloudSettings): Partial<AppSettings> {
  return {
    deeplApiKey: row.deepl_api_key ?? undefined,
    amazonAccessKey: row.amazon_access_key ?? undefined,
    amazonSecretKey: row.amazon_secret_key ?? undefined,
    amazonPartnerTag: row.amazon_partner_tag ?? undefined,
    amazonMarketplace: row.amazon_marketplace ?? undefined,
    readerFontSize: row.reader_font_size,
    readerFontFamily: row.reader_font_family,
    readerTheme: row.reader_theme as AppSettings['readerTheme'],
    readerLineSpacing: row.reader_line_spacing,
    readerMargin: row.reader_margin,
    readerTranslationEnabled: row.reader_translation_enabled,
    readingTimeDate: row.reading_time_date ?? undefined,
    readingTimeTodayMs: row.reading_time_today_ms ?? undefined,
    librarySort: row.library_sort as AppSettings['librarySort'],
    libraryView: row.library_view as AppSettings['libraryView'],
    syncUpdatedAt: row.updated_at,
  }
}

export function progressToCloudRow(
  progress: ReadingProgress,
  cloudBookId: string,
  userId: string,
): CloudProgress {
  return {
    book_id: cloudBookId,
    user_id: userId,
    cfi: progress.cfi,
    percentage: progress.percentage,
    updated_at: progress.updatedAt,
  }
}

export function bookmarkToCloudRow(
  bookmark: Bookmark,
  cloudBookId: string,
  userId: string,
): Omit<CloudBookmark, 'id'> & { id?: string } {
  return {
    id: bookmark.cloudId,
    book_id: cloudBookId,
    user_id: userId,
    cfi: bookmark.cfi,
    label: bookmark.label,
    percentage: bookmark.percentage,
    created_at: bookmark.createdAt,
  }
}

export function vocabToCloudRow(
  entry: VocabEntry,
  cloudBookId: string | null,
  userId: string,
): Omit<CloudVocab, 'id'> & { id?: string } {
  return {
    id: entry.cloudId,
    book_id: cloudBookId,
    user_id: userId,
    word: entry.word,
    translation: entry.translation,
    context: entry.context ?? null,
    added_at: entry.addedAt,
  }
}
