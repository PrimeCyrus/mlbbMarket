const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  let url = '';
  let key = '';
  
  for (const line of envContent.split('\n')) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      url = line.split('=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      key = line.split('=')[1].trim();
    }
  }

  const supabase = createClient(url, key);
  
  const { data, error } = await supabase.from('listings').select('id, image_urls').order('created_at', { ascending: false }).limit(3);
  console.log("Error:", error);
  console.log("Recent Listings:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
