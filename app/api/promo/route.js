import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PromoCode from '@/models/PromoCode';

export async function POST(request) {
  try {
    await dbConnect();
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ success: false, message: 'Code is required' }, { status: 400 });
    }

    const promo = await PromoCode.findOne({ code: code.toLowerCase().trim(), isActive: true }).lean();

    if (promo) {
      return NextResponse.json({ success: true, action: promo.action, code: promo.code });
    }

    // Fallback for hardcoded codes just in case they aren't in DB yet
    const PUBLIC_PROMO_CODES = new Set(['dontgiveup', 'haveluckyday']);
    const DEV_PROMO_CODES = new Set(['godmode', 'showhidden', 'admin123']);
    const ALLOWED = process.env.NODE_ENV === 'production' 
       ? PUBLIC_PROMO_CODES 
       : new Set([...PUBLIC_PROMO_CODES, ...DEV_PROMO_CODES]);

    const codeStr = code.toLowerCase().trim();
    if (ALLOWED.has(codeStr)) {
       return NextResponse.json({ success: true, action: codeStr, code: codeStr });
    }

    return NextResponse.json({ success: false, message: 'Invalid or inactive promo code' }, { status: 404 });
  } catch (error) {
    console.error('Promo Check Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
