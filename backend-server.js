import express from 'express'
import https from 'https'
import http from 'http'
import { URL } from 'url'

const app = express()
const PORT = 3000

app.use(express.json())

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.header('Access-Control-Allow-Credentials', 'true')
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// API endpoint to forward requests to FileMaker
app.all('/api/filemaker/*', (req, res) => {
  try {
    // Extract the target path from the request
    const targetPath = req.path.replace('/api/filemaker', '')
    const targetHost = req.query.host
    const targetPort = req.query.port || 443

    if (!targetHost) {
      return res.status(400).json({ error: 'Missing host parameter' })
    }

    // Build the full URL.
    // IMPORTANT: preserve the raw incoming query string to avoid double-encoding
    // OData system query options like `$select`, `$top`, etc. FileMaker's parser is strict.
    const rawQuery = (req.originalUrl.split('?')[1] || '').trim()
    const filteredQueryString = rawQuery
      ? rawQuery
          .split('&')
          .filter((pair) => pair && !pair.startsWith('host=') && !pair.startsWith('port='))
          .join('&')
      : ''

    const targetUrl = new URL(
      `https://${targetHost}${targetPath}${filteredQueryString ? '?' + filteredQueryString : ''}`
    )

    console.log(`[${new Date().toISOString()}] Request query params:`, req.query)
    console.log(`[${new Date().toISOString()}] Filtered query string:`, filteredQueryString)
    console.log(`[${new Date().toISOString()}] ${req.method} ${targetUrl.href}`)

    // Prepare request options
    const requestOptions = {
      hostname: targetUrl.hostname,
      port: targetPort,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
      rejectUnauthorized: false, // Allow self-signed certificates
    }

    // Remove problematic headers
    delete requestOptions.headers['origin']
    delete requestOptions.headers['referer']
    delete requestOptions.headers['host']
    delete requestOptions.headers['connection']

    // Make the request to FileMaker
    const protocol = https
    const filemakerReq = protocol.request(requestOptions, (filemakerRes) => {
      console.log(`[${new Date().toISOString()}] Response status: ${filemakerRes.statusCode}`)
      console.log(`[${new Date().toISOString()}] Response headers:`, filemakerRes.headers)

      // Forward response headers
      Object.keys(filemakerRes.headers).forEach((key) => {
        const lowerKey = key.toLowerCase()
        if (!lowerKey.startsWith('access-control-') && lowerKey !== 'content-encoding') {
          res.setHeader(key, filemakerRes.headers[key])
        }
      })

      res.statusCode = filemakerRes.statusCode

      // Capture response body for logging errors
      let responseBody = ''
      filemakerRes.on('data', (chunk) => {
        responseBody += chunk.toString()
      })

      filemakerRes.on('end', () => {
        if (filemakerRes.statusCode >= 400) {
          console.error(`[${new Date().toISOString()}] Error response body:`, responseBody)
        } else if (req.path.includes('Webhook')) {
          console.log(`[${new Date().toISOString()}] Webhook response body:`, responseBody.substring(0, 500))
        }
        console.log(`[${new Date().toISOString()}] Response piped successfully`)
      })

      filemakerRes.pipe(res)

      filemakerRes.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] Response error:`, error.message)
      })
    })

    filemakerReq.on('error', (error) => {
      console.error('FileMaker request error:', error.message)
      res.status(502).json({ error: 'Bad Gateway', details: error.message })
    })

    filemakerReq.on('timeout', () => {
      console.error('FileMaker request timeout')
      filemakerReq.destroy()
      res.status(504).json({ error: 'Gateway Timeout' })
    })

    // Forward request body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // req.body is already parsed by express.json(), so we need to stringify it
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
      console.log(`[${new Date().toISOString()}] Request body:`, body)
      console.log(`[${new Date().toISOString()}] req.body object:`, req.body)
      console.log(`[${new Date().toISOString()}] Body length:`, Buffer.byteLength(body))
      
      // Set content-length header
      const bodyBuffer = Buffer.from(body)
      filemakerReq.setHeader('Content-Length', bodyBuffer.length)
      
      // Write body and end request
      filemakerReq.write(bodyBuffer)
      filemakerReq.end()
    } else {
      filemakerReq.end()
    }
  } catch (error) {
    console.error('Backend error:', error.message)
    res.status(400).json({ error: 'Bad Request', details: error.message })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Debug endpoint to test body parsing
app.post('/debug/body', (req, res) => {
  console.log('DEBUG: Raw body received')
  console.log('DEBUG: req.body:', req.body)
  console.log('DEBUG: Content-Type:', req.headers['content-type'])
  console.log('DEBUG: Content-Length:', req.headers['content-length'])
  res.json({ received: req.body })
})

app.listen(PORT, () => {
  console.log(`\n🚀 FileMaker Backend Server running on http://localhost:${PORT}`)
  console.log(`\nAPI Endpoint: http://localhost:${PORT}/api/filemaker/*`)
  console.log(`\nUsage:`)
  console.log(`  POST http://localhost:${PORT}/api/filemaker/fmi/odata/v4/Contacts/Webhook.GetAll?host=192.168.0.24`)
  console.log(`\nThe backend will:`)
  console.log(`  - Accept self-signed SSL certificates`)
  console.log(`  - Handle CORS automatically`)
  console.log(`  - Forward all requests to FileMaker Server`)
  console.log(`\nStop with Ctrl+C\n`)
})
