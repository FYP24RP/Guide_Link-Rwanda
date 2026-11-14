// Safe Supabase client fallback for build stability
export const supabase = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    upsert: () => Promise.resolve({ error: null })
  })
};
