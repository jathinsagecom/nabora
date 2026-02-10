import { createClient } from '../../../lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect based on type
      if (type === 'recovery') {
        // Password reset — redirect to update password page (build later)
        return NextResponse.redirect(`${origin}/dashboard`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Something went wrong — redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
