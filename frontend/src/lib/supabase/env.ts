export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  const isPlaceholder =
    !url ||
    !anonKey ||
    url.includes('your-project') ||
    anonKey.includes('your-anon-key') ||
    anonKey === 'your-anon-key';

  if (isPlaceholder) {
    throw new Error(
      'Supabase no está configurado. Edita frontend/.env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  return { url, anonKey };
}
