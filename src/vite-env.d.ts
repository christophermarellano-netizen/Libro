/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'amazon-paapi' {
  const amazonPaapi: {
    SearchItems: (
      common: Record<string, string>,
      request: Record<string, unknown>,
    ) => Promise<{
      SearchResult?: {
        Items?: Array<{
          ItemInfo?: Record<string, unknown>
          Images?: Record<string, unknown>
        }>
      }
    }>
  }
  export default amazonPaapi
}

declare module 'epubjs' {
  export interface Rendition {
    display(target?: string): Promise<void>
    next(): Promise<void>
    prev(): Promise<void>
    destroy(): void
    on(event: string, callback: (...args: unknown[]) => void): void
    themes: {
      register(name: string, styles: Record<string, Record<string, string>>): void
      select(name: string): void
      fontSize(size: string): void
      font(family: string): void
      override(property: string, value: string, priority?: boolean): void
      removeOverride(property: string): void
    }
    getContents(): Array<{ document: Document }>
  }

  export interface Book {
    renderTo(element: HTMLElement, options?: Record<string, unknown>): Rendition
    destroy(): void
    ready: Promise<void>
    locations: {
      generate(chars?: number): Promise<void>
      length(): number
      cfiFromPercentage(pct: number): string | null
    }
  }

  export default function ePub(input: ArrayBuffer | string): Book
}
