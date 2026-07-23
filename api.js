// ============================================================
// API v2.0 — GROQ ENGINE
// Детектив на прогулке
// ============================================================


const GROQ_MODEL = "llama-3.3-70b-versatile";


// ============================================================
// API KEY
// ============================================================


function getApiKey() {

    const input = document.getElementById("api-key");

    const key = input ? input.value.trim() : "";

    if (key) {
        localStorage.setItem(
            "groq_api_key",
            key
        );

        return key;
    }


    return localStorage.getItem(
        "groq_api_key"
    ) || "";

}



// ============================================================
// ОСНОВНОЙ ЗАПРОС
// ============================================================


async function groqRequest(system, user, temperature = 0.4) {


    const apiKey = getApiKey();


    if (!apiKey) {

        throw new Error(
            "API ключ не найден"
        );

    }



    const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {

            method:"POST",

            headers:{

                "Content-Type":"application/json",

                "Authorization":
                    `Bearer ${apiKey}`

            },


            body:JSON.stringify({

                model:GROQ_MODEL,


                messages:[

                    {
                        role:"system",
                        content:system
                    },

                    {
                        role:"user",
                        content:user
                    }

                ],


                temperature,

                max_tokens:700

            })

        }

    );



    if (!response.ok) {


        const err =
            await response.json();


        throw new Error(
            err.error?.message ||
            "Ошибка Groq"
        );

    }



    const data =
        await response.json();



    let text =
        data.choices[0]
        .message
        .content
        .trim();



    return parseJSON(text);


}



// ============================================================
// JSON PARSER
// ============================================================


function parseJSON(text){


    try {

        return JSON.parse(text);

    }

    catch(e){


        const match =
            text.match(/\{[\s\S]*\}/);


        if(match){

            return JSON.parse(match[0]);

        }


        throw new Error(
            "AI вернул неправильный JSON"
        );

    }

}



// ============================================================
// СОЗДАНИЕ ДЕТЕКТИВНОГО ДЕЛА
// ============================================================


async function generateDetectiveCase(){


const system = `

Ты создаёшь дела для детективной игры.

Главное правило:
СОЗДАЙ ЛОГИЧНУЮ ИСТИНУ.
Она никогда не должна меняться.

Игрок видит только intro.

Скрытая правда хранится отдельно.


Ответ только JSON:

{
"title":"",
"intro":"",
"solution":"",
"characters":[],
"facts":[],
"clues":[]
}


facts — реальные факты дела.

clues — улики, которые можно найти.

`;



const user = `

Создай новое детективное дело.

Жанры:
кража,
исчезновение,
тайна,
шпионаж,
семейный секрет.

Требования:

- минимум 3 персонажа;
- минимум 5 фактов;
- минимум 5 возможных улик;
- решение должно объяснять всё;
- никаких случайных противоречий.

`;



return await groqRequest(
    system,
    user,
    0.8
);


}




// ============================================================
// СОЗДАНИЕ ДАНЕТКИ
// ============================================================


async function generateDanetka(){


const system = `

Ты создаёшь логические данетки.

Ситуация должна иметь ОДНУ правильную разгадку.


Ответ JSON:

{
"text":"",
"solution":"",
"facts":[]
}


facts — список фактов,
по которым можно отвечать
Да / Нет / Не важно.

`;



const user = `

Создай сложную, но честную данетку.

Правила:

- ситуация короткая;
- решение логичное;
- все ответы должны следовать из facts;
- нельзя менять решение.

`;



return await groqRequest(
    system,
    user,
    0.8
);


}



// ============================================================
// ПРОВЕРКА ДЕЙСТВИЯ ДЕТЕКТИВА
// ============================================================


async function askDetective(caseData, history, input){



const system = `

Ты ведущий детективной игры.


У тебя есть скрытая правда дела.


Ты НЕ можешь:

- менять факты;
- придумывать новую правду;
- отрицать найденные улики.


Ответ JSON:

{
"text":"",
"newClue":"",
"progress":0
}


Если игрок нашёл настоящую улику —
добавь её в newClue.


`;



const user = `


Дело:

${JSON.stringify(caseData)}



История:

${JSON.stringify(history)}



Действие игрока:

${input}



Ответь как ведущий.


`;



return await groqRequest(
    system,
    user
);


}



// ============================================================
// ПРОВЕРКА ДАНЕТКИ
// ============================================================


async function askDanetki(game,input){


const system = `

Ты ведущий Данетки.


Отвечай только по фактам.


JSON:

{
"text":"",
"answer":"yes|no|irrelevant|solved"
}


Не раскрывай решение,
пока игрок не разгадал.


`;



const user = `


Ситуация:

${game.text}


Факты:

${JSON.stringify(game.facts)}


Решение:

${game.solution}



Вопрос игрока:

${input}



`;



return await groqRequest(
    system,
    user
);


}




// ============================================================
// ФИНАЛ
// ============================================================


async function generateFinal(caseData, history, clues){


const system = `

Ты ведущий детективной игры.

Напиши красивый финал.

Не придумывай новых фактов.


`;



const user = `


Истина:

${JSON.stringify(caseData)}


Найденные улики:

${JSON.stringify(clues)}


История:

${JSON.stringify(history)}



Объясни:

- что произошло;
- почему;
- что игроки нашли.


`;



const result =
    await groqRequest(
        system,
        user
    );


return result.text || JSON.stringify(result);

}



// ============================================================


document.addEventListener(
"DOMContentLoaded",
()=>{


const saved =
localStorage.getItem(
"groq_api_key"
);


if(saved){

const input =
document.getElementById(
"api-key"
);


if(input)
input.value=saved;


}


});


console.log(
"🤖 API Engine v2.0 loaded"
);
