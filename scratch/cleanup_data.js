const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  const { data, error } = await supabase
    .from('clients')
    .delete()
    .eq('raison_sociale', 'Fournisseur');
    
  if (error) console.error(error);
  else console.log('Deleted accidental client');
}

cleanup();
