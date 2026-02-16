import { NextResponse } from 'next/server'

export function middleware(request) {
  // Vercel orqali kelayotgan sorovlarda .geo obyekti mavjud bo'ladi
  // Agar lokal kompyuterda bo'lsa, u undefined bo'lishi mumkin
  const { nextUrl: url, geo } = request
  
  // IP manzil orqali davlat kodi (masalan: 'UZ', 'US', 'RU')
  // Vercel da 'x-vercel-ip-country' headeri ham ishlaydi
  const country = geo?.country || request.headers.get('x-vercel-ip-country') || 'Unknown'
  const city = geo?.city || request.headers.get('x-vercel-ip-city') || 'Unknown'
  const region = geo?.region || request.headers.get('x-vercel-ip-region') || 'Unknown'

  // Konsolga chiqaramiz (Vercel loglarida korinadi)
  console.log(`Foydalanuvchi kirdi: Davlat: ${country}, Shahar: ${city}, Region: ${region}`)

  // MISOLLAR (Taskingizga qarab yoqishingiz mumkin):
  
  // 1. Agar foydalanuvchi O'zbekistondan bo'lsa va til tanlamagan bo'lsa
  // if (country === 'UZ' && !request.cookies.get('NEXT_LOCALE')) {
  //   return NextResponse.redirect(new URL('/uz', request.url))
  // }

  // 2. Bloklangan davlatlar (masalan, test uchun)
  // if (country === 'RU') {
  //   return new NextResponse('Access Denied for your region', { status: 403 })
  // }

  return NextResponse.next()
}

// Middleware qaysi yo'llarda ishlashini belgilash
export const config = {
  matcher: [
    // Barcha sahifalar uchun ishlaydi, lekin statik fayllar (_next, images, favicon) bundan mustasno
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
