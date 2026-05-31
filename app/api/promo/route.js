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

    // Auto-seed if collection is completely empty and they hit this endpoint
    const count = await PromoCode.countDocuments();
    if (count === 0) {
      const defaultCodes = [
        { code: 'dontgiveup', action: 'dontgiveup', description: 'Imtihon topshirish uchun motivatsiya (Public)' },
        { code: 'haveluckyday', action: 'haveluckyday', description: 'Omadli kun tilash (Public)' },
        { code: 'godmode', action: 'godmode', description: 'God Mode - barcha filtrlarni o\'chirish (Dev)' },
        { code: 'showhidden', action: 'showhidden', description: 'Yashirin narsalarni ko\'rsatish (Dev)' },
        { code: 'admin123', action: 'admin123', description: 'Admin huquqi (Dev)' },
        { code: 'upload_privilege', action: 'upload_privilege', description: 'Upload ruxsati (Dev)' },
        { code: 'no_copy_paste', action: 'copy_paste_privilege', description: 'Copy-Paste ruxsati (Dev)' },
        { code: 'correct_answers', action: 'show_correct', description: 'To\'g\'ri javoblarni ko\'rsatish (Dev)' }
      ];
      await PromoCode.insertMany(defaultCodes);
      
      const newlySeeded = defaultCodes.find(c => c.code === code.toLowerCase().trim());
      if (newlySeeded) {
         return NextResponse.json({ success: true, action: newlySeeded.action, code: newlySeeded.code });
      }
    }

    // Fallback for hardcoded codes just in case they aren't in DB yet
    const PUBLIC_PROMO_CODES = new Set(['dontgiveup', 'haveluckyday']);
    const DEV_PROMO_CODES = new Set(['godmode', 'showhidden', 'admin123', 'upload_privilege', 'no_copy_paste', 'correct_answers']);
    const ALLOWED = new Set([...PUBLIC_PROMO_CODES, ...DEV_PROMO_CODES]);

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
