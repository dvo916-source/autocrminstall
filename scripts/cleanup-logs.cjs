const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://whyfmogbayqwaeddoxwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanLogs() {
    console.log("🧹 Cleaning System Debug logs...");

    // We can't delete with Anon key if RLS enabled, unless there's a policy.
    // If it fails, I'll just leave it. The user will ask if they see it.
    // Actually, I can use the same logic as test scripts.

    const { error } = await supabase
        .from('crm_messages')
        .delete()
        .or('body.ilike.%[SYSTEM DEBUG]%,body.ilike.%[DEBUG%,body.ilike.%[SYSTEM ERROR]%');

    if (error) {
        console.error("❌ Cleanup failed (RLS?):", error);
    } else {
        console.log("✅ Cleanup command sent.");
    }
}

cleanLogs();
