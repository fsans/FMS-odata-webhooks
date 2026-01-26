import http from 'http'
import https from 'https'
import { URL } from 'url'

const PROXY_PORT = 3001
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000']

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin

  // Set CORS headers - always allow localhost origins
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Max-Age', '86400')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Parse the request URL
  if (!req.url.startsWith('/proxy')) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found. Use /proxy?target=https://host/path' }))
    return
  }

  try {
    // Extract target URL from query parameter
    const urlObj = new URL(req.url, 'http://localhost:3001')
    const targetUrlStr = urlObj.searchParams.get('target')
    
    if (!targetUrlStr) {
      throw new Error('Missing target parameter')
    }
    
    if (!targetUrlStr.startsWith('https://') && !targetUrlStr.startsWith('http://')) {
      throw new Error('Invalid URL format')
    }

    const targetUrl = new URL(targetUrlStr)
    console.log(`[${new Date().toISOString()}] ${req.method} ${targetUrl.href}`)

    // Prepare request options
    const requestOptions = {
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
      rejectUnauthorized: false, // Allow self-signed certificates
    }

    // Remove proxy-specific and problematic headers
    delete requestOptions.headers['origin']
    delete requestOptions.headers['referer']
    delete requestOptions.headers['content-length']
    delete requestOptions.headers['connection']

    // Make the request to FileMaker Server
    const protocol = targetUrl.protocol === 'https:' ? https : http
    const proxyReq = protocol.request(requestOptions, (proxyRes) => {
      console.log(`[${new Date().toISOString()}] Response status: ${proxyRes.statusCode}`)
      
      // Forward response headers (but skip content-encoding and CORS headers we already set)
      Object.keys(proxyRes.headers).forEach((key) => {
        const lowerKey = key.toLowerCase()
        if (lowerKey !== 'content-encoding' && !lowerKey.startsWith('access-control-')) {
          res.setHeader(key, proxyRes.headers[key])
        }
      })

      // Write status code and pipe response
      res.statusCode = proxyRes.statusCode
      proxyRes.pipe(res)
    })

    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error.message)
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Bad Gateway', details: error.message }))
    })

    proxyReq.on('timeout', () => {
      console.error('Proxy request timeout')
      proxyReq.destroy()
      res.writeHead(504, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Gateway Timeout' }))
    })

    // Forward request body
    let bodyChunks = []
    req.on('data', (chunk) => {
      bodyChunks.push(chunk)
    })
    req.on('end', () => {
      const body = Buffer.concat(bodyChunks).toString()
      if (body) {
        console.log(`[${new Date().toISOString()}] Request body: ${body}`)
      }
      proxyReq.end(body)
    })
    req.on('error', (error) => {
      console.error('Request error:', error.message)
      proxyReq.destroy()
    })
  } catch (error) {
    console.error('Proxy error:', error.message)
    console.error('Request URL:', req.url)
    console.error('Stack:', error.stack)
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Bad Request', details: error.message }))
  }
})

server.listen(PROXY_PORT, () => {
  console.log(`\n🔄 CORS Proxy Server running on http://localhost:${PROXY_PORT}`)
  console.log(`\nUsage: POST http://localhost:${PROXY_PORT}/proxy/https://192.168.0.24/fmi/odata/v4`)
  console.log(`\nThe proxy will:`)
  console.log(`  - Handle CORS preflight requests (OPTIONS)`)
  console.log(`  - Accept self-signed SSL certificates`)
  console.log(`  - Forward all requests to FileMaker Server`)
  console.log(`\nStop with Ctrl+C\n`)
})
