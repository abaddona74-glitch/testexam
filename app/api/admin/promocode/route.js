import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PromoCode from '@/models/PromoCode';
import { requireAdminAuth } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-logger';

export async function GET(request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    // Seed default codes if collection is empty
    const count = await PromoCode.countDocuments();
    if (count === 0) {
      const defaultCodes = [
        { code: 'dontgiveup', action: 'dontgiveup', description: 'Imtihon topshirish uchun motivatsiya (Public)' },
        { code: 'haveluckyday', action: 'haveluckyday', description: 'Omadli kun tilash (Public)' },
        { code: 'godmode', action: 'godmode', description: 'God Mode - barcha filtrlarni o\'chirish (Dev)' },
        { code: 'showhidden', action: 'showhidden', description: 'Yashirin narsalarni ko\'rsatish (Dev)' },
        { code: 'admin123', action: 'admin123', description: 'Admin huquqi (Dev)' }
      ];
      await PromoCode.insertMany(defaultCodes);
    }

    const codes = await PromoCode.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, codes });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();
    const { code, action, description, isActive } = data;

    if (!code || !action) {
      return NextResponse.json({ success: false, message: 'Code and Action are required' }, { status: 400 });
    }

    const newCode = new PromoCode({
      code: code.toLowerCase().trim(),
      action: action.trim(),
      description,
      isActive: isActive !== undefined ? isActive : true
    });

    await newCode.save();
    
    // Log Admin activity
    logActivity('server', 'admin_promocode_added', { code: newCode.code, action: newCode.action }, 'admin');

    return NextResponse.json({ success: true, code: newCode });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'Promo Code already exists' }, { status: 400 });
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
       return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const code = await PromoCode.findByIdAndDelete(id);
    if (code) {
       logActivity('server', 'admin_promocode_deleted', { code: code.code }, 'admin');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();
    const { id, code, action, description, isActive } = data;

    if (!id) {
       return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
    }

    const updated = await PromoCode.findByIdAndUpdate(id, {
        code: code.toLowerCase().trim(),
        action: action.trim(),
        description,
        isActive
    }, { new: true });

    if (updated) {
       logActivity('server', 'admin_promocode_updated', { code: updated.code }, 'admin');
    }

    return NextResponse.json({ success: true, code: updated });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'Promo Code already exists' }, { status: 400 });
    }
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
