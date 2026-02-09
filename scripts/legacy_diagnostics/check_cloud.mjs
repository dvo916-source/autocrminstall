const URL = "https://whyfmogbayqwaeddoxwf.supabase.co/rest/v1/estoque?select=nome&limit=10";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeWZtb2diYXlxd2FlZGRveHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NTQyMjksImV4cCI6MjA4NTAzMDIyOX0.CUTT4JXNpoeqa_uzb8C3XkxVXqqRdtNdTqqg9t8SO8U";

fetch(URL, {
    headers: {
        "apikey": KEY,
        "Authorization": "Bearer " + KEY
    }
})
    .then(r => r.json())
    .then(data => console.log("Dados Nuvem:", JSON.stringify(data, null, 2)))
    .catch(e => console.error("Erro:", e.message));
