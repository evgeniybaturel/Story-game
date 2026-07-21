// ============================================================
// API — GROQ ENGINE v2.0
// Игровой ведущий с контролем логики
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


// ============================================================
// ОСНОВНОЙ ЗАПРОС
// ============================================================

async function callGroq(messages, callback) {

    const apiKey = getApiKey();

    if (!apiKey) {
        callback('❌ API ключ не найден', '');
        return;
    }


    const lastMessage =
        messages.filter(m => m.type === 'user').pop();


    const playerAction =
        lastMessage ? lastMessage.text : 'Начало';


    let prompt = "";


    // ========================================================
    // ДЕТЕКТИВ
    // ========================================================

    if (state.mode === "detective") {


        const gameCase = state.case || {};


        prompt = `
Ты ведущий детективной игры.

ТВОЯ ГЛАВНАЯ ЗАДАЧА:
Реагировать на действия игрока.
Игрок управляет расследованием.
Ты НЕ пишешь рассказ сам.

ТЕКУЩЕЕ ДЕЛО:

Название:
${gameCase.title}

Описание:
${gameCase.description}


Персонажи:
${JSON.stringify(gameCase.characters || [])}


Локации:
${JSON.stringify(gameCase.locations || [])}


Доступные скрытые улики:
${JSON.stringify(gameCase.clues || [])}


Уже найденные улики:
${JSON.stringify(state.progress.foundClues || [])}



Действие игрока:
"${playerAction}"


ПРАВИЛА:

1. Отвечай только на действие игрока.
2. Не добавляй новые события без причины.
3. Не создавай новых персонажей.
4. Не раскрывай разгадку сразу.
5. Если игрок проверяет объект — опиши только результат проверки.
6. Улика появляется только если она есть среди доступных.
7. Не противоречь предыдущим ответам.


Ответ JSON:

{
"text":"ответ игроку 2-4 предложения",
"clue":"название найденной улики или пустая строка"
}

`;

    }



    // ========================================================
    // ДАНЕТКИ
    // ========================================================

    else {


        const facts =
            state.danetki?.facts || [];


        prompt = `

Ты ведущий игры Данетки.


СИТУАЦИЯ:

${state.danetki.situation}


РАЗГАДКА:

${state.danetki.solution}



ФАКТЫ:

${JSON.stringify(facts)}



ВОПРОС ИГРОКА:

"${playerAction}"



Твоя задача:
Определить ответ только по фактам.


Возможные ответы:

Да
Нет
Не имеет значения


Правила:

1. Никогда не меняй разгадку.
2. Не додумывай новые факты.
3. Не объясняй ответ.
4. Не раскрывай решение.
5. Если игрок угадал решение полностью — clue = УГАДАЛ.


JSON:

{
"text":"Да/Нет/Не имеет значения",
"clue":""
}

`;

    }



    try {


        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method:"POST",

                headers:{
                    "Content-Type":"application/json",
                    "Authorization":`Bearer ${apiKey}`
                },


                body:JSON.stringify({

                    model:
                    "llama-3.3-70b-versatile",


                    messages:[

                        {
                            role:"system",

                            content:
                            `
Ты игровой движок.
Будь строгим.
Не фантазируй.
Следуй правилам игры.
Отвечай только JSON.
`
                        },


                        {
                            role:"user",
                            content:prompt
                        }

                    ],


                    temperature:
                    state.mode === "danetki"
                    ? 0.1
                    : 0.3,


                    max_tokens:300,


                    response_format:{
                        type:"json_object"
                    }

                })
            }
        );



        if(!response.ok){

            const error =
            await response.json();

            throw new Error(
                error.error?.message ||
                "Ошибка API"
            );
        }



        const data =
        await response.json();



        let raw =
        data.choices[0]
        .message.content;



        let result;


        try{

            result =
            JSON.parse(raw);

        }
        catch{

            const match =
            raw.match(/\{[\s\S]*\}/);

            if(match){

                result =
                JSON.parse(match[0]);

            }
            else{

                throw new Error(
                    "Ошибка JSON"
                );

            }
        }



        callback(

            result.text ||
            "Продолжайте расследование.",


            result.clue ||
            ""

        );



    }
    catch(error){

        console.error(error);

        callback(
            "❌ Ошибка: " +
            error.message,
            ""
        );

    }

}



// ============================================================
// ЗАГРУЗКА API КЛЮЧА
// ============================================================

document.addEventListener(
'DOMContentLoaded',
()=>{

    const saved =
    localStorage.getItem(
        'groq_api_key'
    );


    const input =
    document.getElementById(
        'api-key'
    );


    if(saved && input){

        input.value =
        saved;

    }

});
