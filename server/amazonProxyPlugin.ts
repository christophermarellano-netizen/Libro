import type { Plugin } from 'vite'
import amazonPaapi from 'amazon-paapi'

interface AmazonSearchBody {
  keywords: string
  credentials: {
    accessKey: string
    secretKey: string
    partnerTag: string
    marketplace: string
  }
}

function sendJson(res: import('http').ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export function amazonProxyPlugin(): Plugin {
  const handler = async (
    req: import('http').IncomingMessage,
    res: import('http').ServerResponse,
    next: () => void,
  ) => {
    if (!req.url?.startsWith('/api/amazon/search')) {
      next()
      return
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }

    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw) as AmazonSearchBody
      const { keywords, credentials } = body

      if (!keywords || !credentials?.accessKey || !credentials?.secretKey || !credentials?.partnerTag) {
        sendJson(res, 400, { error: 'Missing keywords or Amazon credentials' })
        return
      }

      const commonParameters = {
        AccessKey: credentials.accessKey,
        SecretKey: credentials.secretKey,
        PartnerTag: credentials.partnerTag,
        PartnerType: 'Associates',
        Marketplace: credentials.marketplace || 'www.amazon.es',
      }

      const requestParameters = {
        Keywords: keywords,
        SearchIndex: 'Books',
        ItemCount: 1,
        Resources: [
          'ItemInfo.ProductInfo',
          'ItemInfo.ContentInfo',
          'ItemInfo.Title',
          'Images.Primary.Large',
          'Images.Primary.Medium',
        ],
      }

      const response = await amazonPaapi.SearchItems(commonParameters, requestParameters)
      const item = response?.SearchResult?.Items?.[0]

      if (!item) {
        sendJson(res, 404, { error: 'No items found' })
        return
      }

      const isbn =
        item.ItemInfo?.ExternalIds?.ISBNs?.DisplayValues?.[0] ??
        item.ItemInfo?.ExternalIds?.EANs?.DisplayValues?.[0]

      sendJson(res, 200, {
        item: {
          ItemInfo: item.ItemInfo,
          Images: item.Images,
          ISBN: isbn,
        },
        confidence: 0.9,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Amazon lookup failed'
      sendJson(res, 502, { error: message })
    }
  }

  return {
    name: 'amazon-proxy',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
