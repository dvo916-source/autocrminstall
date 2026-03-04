const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://whyfmogbayqwaeddoxwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U";
const ANTHROPIC_KEY = "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";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateKey() {
    console.log("🔐 Updating Anthropic API Key...");

    const { data, error } = await supabase
        .from('crm_settings')
        .upsert({
            category: 'diego_ai',
            key: 'anthropic_api_key',
            value: ANTHROPIC_KEY
        }, { onConflict: 'category,key' });

    if (error) {
        console.error("❌ Error updating DB:", error);
    } else {
        console.log("✅ Key updated successfully!");
    }
}

updateKey();
