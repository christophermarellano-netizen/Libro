import JSZip from 'jszip'
import { db } from '../db'
import { dimensionsFromPageCount } from './bookDimensions'
import { getSpinePreset, hashString, SPINE_PRESETS } from './spinePresets'
import { createSolidColorCover } from './epub'
import type { Book } from '../types'

interface PlaceholderSpec {
  title: string
  author: string
  color: string
  pageCount: number
}

const COVER_COLORS = [
  '#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653',
  '#4361ee', '#7209b7', '#f72585', '#4cc9f0', '#06d6a0',
  '#ef476f', '#ffd166', '#118ab2', '#073b4c', '#8338ec',
  '#fb5607', '#ff006e', '#3a86ff', '#8338ec', '#ffbe0b',
  '#588157', '#a3b18a', '#dad7cd', '#344e41', '#780000',
  '#c1121f', '#669bbc', '#003049', '#d62828', '#fcbf49',
  '#0077b6', '#00b4d8', '#90e0ef', '#9b5de5', '#f15bb5',
  '#00f5d4', '#fee440', '#00bbf9', '#9b2226', '#ca6702',
]

/** Realistic Spanish-fiction page counts from novella to epic. */
const PLACEHOLDER_SPECS: PlaceholderSpec[] = [
  { title: 'El amanecer silencioso', author: 'María Fernández', color: COVER_COLORS[0], pageCount: 384 },
  { title: 'Sombras del invierno', author: 'Carlos Ruiz', color: COVER_COLORS[1], pageCount: 224 },
  { title: 'La última estación', author: 'Ana Belén Torres', color: COVER_COLORS[2], pageCount: 312 },
  { title: 'Caminos de sal', author: 'Javier Morales', color: COVER_COLORS[3], pageCount: 128 },
  { title: 'Memorias de un jardín', author: 'Lucía Herrera', color: COVER_COLORS[4], pageCount: 448 },
  { title: 'El reloj de arena', author: 'Pedro Sánchez', color: COVER_COLORS[5], pageCount: 196 },
  { title: 'Noches en Lisboa', author: 'Elena Vidal', color: COVER_COLORS[6], pageCount: 268 },
  { title: 'La casa azul', author: 'Miguel Ángel Prieto', color: COVER_COLORS[7], pageCount: 672 },
  { title: 'Viento del sur', author: 'Carmen Delgado', color: COVER_COLORS[8], pageCount: 112 },
  { title: 'Cartas desde el mar', author: 'Roberto Gil', color: COVER_COLORS[9], pageCount: 340 },
  { title: 'El árbol de los sueños', author: 'Isabel Moreno', color: COVER_COLORS[10], pageCount: 248 },
  { title: 'Tras la lluvia', author: 'Francisco Luna', color: COVER_COLORS[11], pageCount: 512 },
  { title: 'La biblioteca oculta', author: 'Patricia Ríos', color: COVER_COLORS[12], pageCount: 168 },
  { title: 'Horizonte lejano', author: 'Antonio Vega', color: COVER_COLORS[13], pageCount: 296 },
  { title: 'El secreto del faro', author: 'Rosa Mendoza', color: COVER_COLORS[14], pageCount: 736 },
  { title: 'Tierra de olivos', author: 'Diego Castillo', color: COVER_COLORS[15], pageCount: 256 },
  { title: 'Un verano en Roma', author: 'Claudia Navarro', color: COVER_COLORS[16], pageCount: 284 },
  { title: 'La montaña dormida', author: 'Héctor Romero', color: COVER_COLORS[17], pageCount: 152 },
  { title: 'El canto de las aves', author: 'Sofía Blanco', color: COVER_COLORS[18], pageCount: 412 },
  { title: 'Puente sobre el río', author: 'Manuel Cortés', color: COVER_COLORS[19], pageCount: 232 },
  { title: 'Las luces de diciembre', author: 'Valentina Pérez', color: COVER_COLORS[20], pageCount: 356 },
  { title: 'El mapa olvidado', author: 'Andrés Fuentes', color: COVER_COLORS[21], pageCount: 96 },
  { title: 'Raíces profundas', author: 'Beatriz Campos', color: COVER_COLORS[22], pageCount: 584 },
  { title: 'La noche estrellada', author: 'Guillermo Ortiz', color: COVER_COLORS[23], pageCount: 244 },
  { title: 'Cuentos del mercado', author: 'Natalia Iglesias', color: COVER_COLORS[24], pageCount: 184 },
  { title: 'El último tren', author: 'Raúl Domínguez', color: COVER_COLORS[25], pageCount: 276 },
  { title: 'Mar adentro', author: 'Inés Molina', color: COVER_COLORS[26], pageCount: 468 },
  { title: 'La puerta entreabierta', author: 'Tomás Aguilar', color: COVER_COLORS[27], pageCount: 208 },
  { title: 'Senderos de luna', author: 'Paula Martín', color: COVER_COLORS[28], pageCount: 324 },
  { title: 'El jardín secreto', author: 'Fernando León', color: COVER_COLORS[29], pageCount: 172 },
  { title: 'Historias del café', author: 'Marta Serrano', color: COVER_COLORS[30], pageCount: 624 },
  { title: 'La torre de cristal', author: 'Óscar Peña', color: COVER_COLORS[31], pageCount: 260 },
  { title: 'Alas de papel', author: 'Cristina Ramos', color: COVER_COLORS[32], pageCount: 288 },
  { title: 'El lago espejo', author: 'Alberto Núñez', color: COVER_COLORS[33], pageCount: 136 },
  { title: 'Voces en la niebla', author: 'Silvia Garrido', color: COVER_COLORS[34], pageCount: 372 },
  { title: 'La ciudad dormida', author: 'Iván Suárez', color: COVER_COLORS[35], pageCount: 648 },
  { title: 'Río de estrellas', author: 'Adriana Cabrera', color: COVER_COLORS[36], pageCount: 104 },
  { title: 'El reino de las flores', author: 'Jorge Medina', color: COVER_COLORS[37], pageCount: 392 },
  { title: 'Tras el horizonte', author: 'Laura Ibáñez', color: COVER_COLORS[38], pageCount: 220 },
  { title: 'La última carta', author: 'Enrique Salazar', color: COVER_COLORS[39], pageCount: 436 },
]

const PLACEHOLDER_TITLES = new Set(PLACEHOLDER_SPECS.map((s) => s.title))
const PLACEHOLDER_BOOK_KEYS = new Set(
  PLACEHOLDER_SPECS.map((s) => `${s.title}|${s.author}`),
)

export function isSeedPlaceholderBook(book: Pick<Book, 'title' | 'author'>): boolean {
  return PLACEHOLDER_BOOK_KEYS.has(`${book.title}|${book.author}`)
}

function specForTitle(title: string): PlaceholderSpec | undefined {
  return PLACEHOLDER_SPECS.find((s) => s.title === title)
}

function uuid(): string {
  return crypto.randomUUID()
}

async function createMinimalEpub(title: string, author: string, pageCount: number): Promise<Blob> {
  const id = uuid()
  const zip = new JSZip()

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  )

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>es</dc:language>
    <dc:identifier id="uid">urn:uuid:${id}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().slice(0, 19)}Z</meta>
    <meta property="schema:numberOfPages">${pageCount}</meta>
  </metadata>
  <manifest>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter"/>
  </spine>
</package>`,
  )

  zip.file(
    'OEBPS/chapter.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <title>${escapeXml(title)}</title>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  <p><em>${escapeXml(author)}</em></p>
  <p>Este es un libro de prueba generado para la biblioteca de Libro. Puedes abrirlo para probar el lector, los marcadores y la búsqueda.</p>
  <p>La brisa de la tarde entraba suave por la ventana entreabierta, trayendo consigo el aroma de las flores del jardín y el murmullo lejano de la ciudad. Era uno de esos momentos en que el tiempo parece detenerse, invitándote a leer una página más.</p>
  <p>En la mesa, junto a la taza de café ya frío, descansaba un libro cuyas páginas amarillentas guardaban secretos de otras épocas. Cada capítulo era una puerta hacia un mundo distinto, un refugio para la imaginación.</p>
  <p>—¿Seguirás leyendo? —preguntó una voz desde el pasillo.</p>
  <p>—Solo un poco más —respondió, sin apartar la mirada del texto.</p>
  <p>Y así, entre párrafos y silencios, la noche fue llegando lentamente, tejiendo historias nuevas sobre las antiguas.</p>
</body>
</html>`,
  )

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function placeholderFields(spec: PlaceholderSpec): Omit<Book, 'id' | 'epubBlob' | 'coverBlob' | 'addedAt'> {
  const dims = dimensionsFromPageCount(spec.pageCount)
  const h = hashString(`${spec.title}|${spec.author}`)
  const presetIndex = h % SPINE_PRESETS.length
  const preset = getSpinePreset({ title: spec.title, author: spec.author, presetIndex })

  return {
    title: spec.title,
    author: spec.author,
    coverSource: 'placeholder',
    pageCount: spec.pageCount,
    printType: 'BOOK',
    physicalHeightMm: dims.physicalHeightMm,
    physicalWidthMm: dims.physicalWidthMm,
    physicalThicknessMm: dims.physicalThicknessMm,
    dimensionSource: 'manual',
    spineColorHex: preset.bg,
    spineTextColorHex: preset.fg,
    presetIndex,
  }
}

async function buildPlaceholderBook(spec: PlaceholderSpec, addedAt: number): Promise<Omit<Book, 'id'>> {
  const [epubBlob, coverBlob] = await Promise.all([
    createMinimalEpub(spec.title, spec.author, spec.pageCount),
    createSolidColorCover(spec.color),
  ])

  return {
    ...placeholderFields(spec),
    epubBlob,
    coverBlob,
    addedAt,
  }
}

export const PLACEHOLDER_SEED_KEY = 'libro-placeholder-seed-v2'
export const PLACEHOLDER_REFRESH_KEY = 'libro-placeholder-dims-v2'

export async function seedPlaceholderBooks(count = 40): Promise<number> {
  const specs = PLACEHOLDER_SPECS.slice(0, count)
  const now = Date.now()
  const books = await Promise.all(
    specs.map((spec, index) =>
      buildPlaceholderBook(spec, now - index * 60_000 - Math.floor(Math.random() * 30_000)),
    ),
  )
  await db.books.bulkAdd(books as Book[])
  return books.length
}

export async function refreshPlaceholderBooks(): Promise<number> {
  const all = await db.books.toArray()
  let updated = 0

  for (const book of all) {
    if (!book.id || !PLACEHOLDER_TITLES.has(book.title)) continue
    const spec = specForTitle(book.title)
    if (!spec) continue

    await db.books.update(book.id, placeholderFields(spec))
    updated++
  }

  return updated
}

export async function countPlaceholderBooks(): Promise<number> {
  const all = await db.books.toArray()
  return all.filter((b) => PLACEHOLDER_TITLES.has(b.title)).length
}
