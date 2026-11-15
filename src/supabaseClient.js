import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://gwwkdhgpfaandekxjsjy.supabase.co', 
  'YOUR_SUPABASE_ANON_KEY'
)

const { data, error } = await supabase.from('your_table_name').select('*')
