export type CoverSource = 'epub' | 'google-books' | 'open-library' | 'placeholder'

export type DimensionSource =
  | 'open-library-isbn'
  | 'open-library-title'
  | 'open-library-title-en'
  | 'open-library-author'
  | 'google-books-isbn'
  | 'google-books-title'
  | 'google-books-title-en'
  | 'google-books-author'
  | 'amazon-isbn'
  | 'amazon-title'
  | 'amazon-title-en'
  | 'inferred'
  | 'default'
  | 'manual'

export type LibraryView = 'grid' | 'coverflow' | 'shelf'

export type LibrarySort = 'recent' | 'title' | 'author'

export type ReaderTheme = 'light' | 'dark' | 'sepia'

export interface Book {
  id?: number
  cloudId?: string
  syncUpdatedAt?: number
  title: string
  author: string
  epubBlob: Blob
  coverBlob: Blob
  coverSource: CoverSource
  isbn?: string
  pageCount?: number
  printType?: string
  physicalHeightMm: number
  physicalWidthMm: number
  physicalThicknessMm: number
  dimensionSource: DimensionSource
  spineColorHex: string
  spineTextColorHex: string
  presetIndex?: number
  addedAt: number
  lastOpenedAt?: number
}

export interface ReadingProgress {
  bookId: number
  cfi: string
  percentage: number
  updatedAt: number
}

export interface Bookmark {
  id?: number
  cloudId?: string
  bookId: number
  cfi: string
  label: string
  percentage: number
  createdAt: number
}

export interface TocEntry {
  id: string
  href: string
  label: string
  subitems?: TocEntry[]
}

export interface SearchHit {
  cfi: string
  excerpt: string
  href?: string
}

export interface VocabEntry {
  id?: number
  cloudId?: string
  bookId: number
  word: string
  translation: string
  context?: string
  addedAt: number
}

export interface AppSettings {
  id: number
  syncUpdatedAt?: number
  deeplApiKey?: string
  amazonAccessKey?: string
  amazonSecretKey?: string
  amazonPartnerTag?: string
  amazonMarketplace?: string
  readerFontSize: number
  readerFontFamily: string
  readerTheme: ReaderTheme
  readerLineSpacing: number
  readerMargin: number
  readerTranslationEnabled: boolean
  readingTimeDate?: string
  readingTimeTodayMs?: number
  librarySort: LibrarySort
  libraryView: LibraryView
}

export interface EpubMetadata {
  title: string
  author: string
  isbn?: string
  pageCount?: number
  coverBlob?: Blob
  coverWidth?: number
  coverHeight?: number
}

export interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string
    authors?: string[]
    language?: string
    pageCount?: number
    printType?: string
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>
    dimensions?: {
      height?: string
      width?: string
      thickness?: string
    }
    imageLinks?: {
      extraLarge?: string
      large?: string
      medium?: string
      small?: string
      thumbnail?: string
      smallThumbnail?: string
    }
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  readerFontSize: 100,
  readerFontFamily: 'original',
  readerTheme: 'light',
  readerLineSpacing: 1.5,
  readerMargin: 16,
  readerTranslationEnabled: true,
  readingTimeTodayMs: 0,
  librarySort: 'recent',
  libraryView: 'grid',
}
