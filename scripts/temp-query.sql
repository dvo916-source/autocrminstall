SELECT phone, body, direction, created_at, status 
FROM crm_conversations c 
JOIN crm_messages m ON c.id = m.conversation_id 
WHERE c.phone LIKE '%55859%' 
ORDER BY m.created_at DESC 
LIMIT 10;
