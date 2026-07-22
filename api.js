// ============================================================
// API — ЗАПРОСЫ К GROQ
// ============================================================

function getApiKey() {
    const input = document.getElementById('api-key');
    const key = input ? input.value.trim() : '';
    if (key) {
        localStorage.setItem('groq_api_key', key);
        return key;
    }
    return localStorage.getItem('groq_api_key') || '';
}

async function callGroq(messages, systemPrompt, callback) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        callback('❌ Ошибка: API-ключ не найден.', '');
        return;
    }

    // Получаем последнее сообщение игрока
    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    const userInput = lastUserMessage ? lastUserMessage.text : 'Начало';

    // Формируем промпт БЕЗ дублирования истории
    let userPrompt = systemPrompt + '\n\n';
    userPrompt += `Игрок написал: "${userInput}"\n\n`;
    userPrompt += `ОТВЕТЬ В ФОРМАТЕ JSON: { "text": "...", "clue": "" }`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-4-maverick-17b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        let rawText = data.choices?.[0]?.message?.content?.trim() || '';
        
        if (!rawText) {
            throw new Error('Пустой ответ');
        }
        
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (e) {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                parsed = { text: rawText, clue: '' };
            }
        }
        
        const text = parsed.text || 'Продолжайте.';
        const clue = parsed.clue || '';
        
        callback(text, clue);
    } catch (error) {
        console.error('Groq ошибка:', error);
        callback('❌ Ошибка: ' + (error.message || 'Неизвестная ошибка'), '');
    }
}

// Восстановление ключа
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('groq_api_key');
    if (saved) {
        const input = document.getElementById('api-key');
        if (input) input.value = saved;
    }
});
