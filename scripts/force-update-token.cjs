const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://whyfmogbayqwaeddoxwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U";
const TOKEN = "EAAV0QJNCwowBQrUibfr0RJbHKcXBhzGZCHkEK88A5ZBg2sdLMmZCdr1ZAr9sTdVZBrADdPIZC0w0hS6bHxJQPv1QX4S4WvCBWTx5cbDvTAwUTJMzXohylPisywCr3y0iZAZBZCFjYXjiHX6sKCf2JqpFOzZCyAZCalMaGkX3RwFkoDjW78P1SJm9wRc5dlHMRzfwwZDZD";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateToken() {
    console.log("🛠️ Force-updating Meta Token in DB...");

    // Attempt update (Might fail due to RLS if Anon key doesn't have permission)
    const { data, error } = await supabase
        .from('crm_settings')
        .update({ value: TOKEN })
        .eq('category', 'meta_api')
        .eq('key', 'access_token')
        .select();

    if (error) {
        console.error("❌ Error updating DB:", error);
    } else {
        console.log("✅ Token Updated Successfully in DB:", data);
    }
}

updateToken();
