const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://whyfmogbayqwaeddoxwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSettings() {
    console.log("🔍 Checking crm_settings keys...");

    // We can't select * if RLS blocks it for anon.
    // But we can try. If it fails, I can't verify unless I use a Service Role Key in this script.
    // I don't have the SR Key here (it's in the Env of the Function).
    // I only have the ANON key in the file I saw earlier.

    // Attempting to read with Anon Key (might fail if RLS is strict)
    const { data, error } = await supabase
        .from('crm_settings')
        .select('category, key, value')
        .eq('key', 'anthropic_api_key');

    if (error) {
        console.error("❌ Error reading Settings:", error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkSettings();
