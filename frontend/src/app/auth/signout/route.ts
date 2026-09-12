import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Sesión ya inválida — igual respondemos OK
  }
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // ignore
  }
  return NextResponse.redirect(new URL('/', request.url));
}
