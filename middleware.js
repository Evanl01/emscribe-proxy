import { NextResponse } from 'next/server'

export function middleware(request) {
  // Handle CORS for API routes only
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()

    // Production-ready allowed origins
    const allowedOrigins = [
      // Production origins
      'https://d2okt95q961mml.cloudfront.net', // Your CloudFront distribution
      'https://enscribe-web-prod-static.s3.amazonaws.com', // Your S3 bucket (if direct access)

      // Development origins (ALWAYS include these, not just in NODE_ENV=development)
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',

      // Add more production domains as needed
      // 'https://your-custom-domain.com',
    ]

    const origin = request.headers.get('origin')

    // Check if the request origin is in our allowed list
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }

    // Set other CORS headers
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400') // Cache preflight for 24 hours

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: response.headers
      })
    }

    return response
  }

  return NextResponse.next()
}

// Configure which paths this middleware should run on
export const config = {
  matcher: '/api/:path*'
}