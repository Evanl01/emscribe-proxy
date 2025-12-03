import { NextResponse } from 'next/server'

export function middleware(request) {
  // Handle CORS for API routes only
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    
    // Production-ready allowed origins
    const allowedOrigins = [
    //   'https://emscribe-web.pages.dev', // CloudFlare Pages (if you use it)
    //   'https://d1234567890123.cloudfront.net', // Replace with your actual CloudFront distribution domain
    //   'https://your-custom-domain.com', // Replace with your custom domain if you have one
      // Add localhost for development testing if needed
      ...(process.env.NODE_ENV === 'development' ? [
        'http://localhost:3000', 
        // 'http://localhost:3001'
    ] : [])
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