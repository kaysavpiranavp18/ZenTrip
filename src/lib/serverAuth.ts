import { NextRequest } from 'next/server';
import { createServerSupabase } from './supabase';

export async function getUserFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Fallback to Supabase cookie used by the client SDK
    let accessToken = token;
    if (!accessToken) {
      try {
        const cookie = request.cookies.get('sb-access-token');
        accessToken = cookie?.value || null;
      } catch {
        accessToken = null;
      }
    }

    if (!accessToken) return null;
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export default getUserFromRequest;
