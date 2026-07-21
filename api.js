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

    const fullHistory = messages
        .filter(m => m.type !== 'system')
        .map(m => `${m.type === 'ai' ? 'ИИ' : 'Игроки'}: ${m.text}`)
        .join('\n');

    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    const userInput = lastUserMessage ? lastUserMessage.text : 'Начало';

    const allClues = state.clues.length > 0 
        ? `\nУЖЕ НАЙДЕННЫЕ УЛИКИ (НЕ ПОВТОРЯЙ ИХ):\n${state.clues.map((c, i) => `${i+1}. ${c}`).join('\n')}`
        : '';

    let summary = `
КРАТКАЯ СВОДКА:
- Режим: ${state.mode === 'detective' ? 'Детектив' : 'Данетки'}
- Завязка: ${state.opening || 'нет'}
- Улик найдено: ${state.clues.length}
`;

    let userPrompt = '';

    if (state.mode === 'detective') {
        userPrompt = `
Ты — ведущий детективной игры (режим ДЕТЕКТИВ).

${summary}

Вот ПОЛНАЯ ИСТОРИЯ:
${fullHistory}
${allClues}

Сейчас игроки написали: "${userInput}"

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Твой ответ (2-3 предложения). В КАЖДОМ ОТВЕТЕ ДОБАВЛЯЙ НОВУЮ ИНФОРМАЦИЮ.",
  "clue": "Если игрок нашёл НОВУЮ улику — напиши её сюда. Если нет — оставь пустым."
}

ПРАВИЛА ДЛЯ ДЕТЕКТИВА:
1. НЕ ПОВТОРЯЙСЯ — каждый ответ даёт НОВУЮ информацию
2. ПРОДВИГАЙ СЮЖЕТ — если игрок спросил про предмет, расскажи о нём и дай новое направление
3. В КОНЦЕ ОТВЕТА намекни на следующее действие: "Может, стоит проверить комнату хозяина?"
4. НЕ ЗАВОДИ В ТУПИК — если игрок не знает, что делать, дай подсказку через сюжет
5. НЕ ПОВТОРЯЙ уже найденные улики
6. ВВОДИ НОВЫХ ПЕРСОНАЖЕЙ, если это логично
`;
    } else {
        userPrompt = `
Ты — ведущий игры ДАНЕТКИ.

${summary}

Вот что уже спрашивали игроки:
${fullHistory}

Сейчас игроки спросили: "${userInput}"

Ты загадал ситуацию: "${state.opening}"
Разгадка: "${state.solution}"

ОТВЕТЬ В ФОРМАТЕ JSON:
{
  "text": "Ответ на вопрос игрока. ТОЛЬКО 'Да', 'Нет', 'Не имеет значения' или 'Не могу ответить'.",
  "clue": "Если игрок угадал разгадку полностью — напиши 'УГАДАЛ'. Если нет — оставь пустым."
}

ПРАВИЛА ДЛЯ ДАНЕТОК:
1. Отвечай ТОЛЬКО "Да", "Нет", "Не имеет значения" или "Не могу ответить"
2. Если игрок спрашивает "Кто такой X?" или "Что такое Y?" — дай КРАТКОЕ пояснение (1 предложение) в тексте
3. Если игрок написал "Подсказка" — дай намёк в тексте
4. Если игрок написал свою версию и угадал — напиши "УГАДАЛ" в clue
5. Будь строгим, не давай разгадку просто так
`;
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt || 'Ты — ведущий игры. Отвечай по делу, коротко, без воды. НЕ НАЧИНАЙ ЗАНОВО. Отвечай ТОЛЬКО В ФОРМАТЕ JSON.' },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 280,
                response_format: { type: 'json_object' }
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
                throw new Error('Не удалось распарсить JSON');
            }
        }
        
        let text = parsed.text || 'Продолжайте.';
        let clue = parsed.clue || '';
        
        if (clue && state.clues.some(c => c.toLowerCase() === clue.toLowerCase())) {
            clue = '';
        }
        
        if (text.length > 350) {
            text = text.slice(0, 347) + '...';
        }
        
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
