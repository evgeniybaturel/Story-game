// ============================================================
// GAME ENGINE v2.0
// Детектив на прогулке
// ============================================================


// ============================================================
// СОСТОЯНИЕ ИГРЫ
// ============================================================

window.state = {

    version: "2.0",

    messages: [],

    storyId: Date.now(),

    mode: "detective",

    isGenerating: false,

    isFinished: false,


    // Детектив

    case: {

        title: "",

        description: "",

        mystery: "",

        solution: "",

        genre: "",

        characters: [],

        locations: [],

        clues: []

    },


    // Данетки

    danetki: {

        situation: "",

        solution: "",

        hint: "",

        facts: []

    },


    // Прогресс

    progress: {

        actions: [],

        foundClues: []

    }

};




// ============================================================
// ВЫБОР РЕЖИМА
// ============================================================

function getSelectedMode(){

    const active =
        document.querySelector(".mode-btn.active");


    return active
        ? active.dataset.mode
        : "detective";

}




// ============================================================
// НОВАЯ ИГРА
// ============================================================

function initGame(){


    const apiKey = getApiKey();


    if(!apiKey){

        alert(
            "Введите API-ключ Groq"
        );

        return;

    }



    state.messages = [];

    state.storyId = Date.now();

    state.isFinished = false;

    state.isGenerating = false;


    state.mode =
        getSelectedMode();



    state.case = {

        title:"",
        description:"",
        mystery:"",
        solution:"",
        genre:"",
        characters:[],
        locations:[],
        clues:[]

    };


    state.danetki = {

        situation:"",
        solution:"",
        hint:"",
        facts:[]

    };


    state.progress = {

        actions:[],
        foundClues:[]

    };



    document
    .getElementById(
        "chat-messages"
    )
    .innerHTML="";



    showGameScreen();


    updateUI(
        "создание дела...",
        "#fbbf24"
    );


    addSystemMessage(
        state.mode==="detective"
        ? "ИИ создаёт расследование..."
        : "ИИ придумывает данетку..."
    );


    generateStory();

}




// ============================================================
// СОЗДАНИЕ ДЕЛА
// ============================================================

async function generateStory(){


    const apiKey =
        getApiKey();


    const detective =
    state.mode==="detective";



    const prompt = detective

?
`
Создай детективную игру.

Верни JSON:

{
"title":"",
"description":"",
"mystery":"",
"genre":"",
"characters":[],
"locations":[],
"solution":"",
"clues":[
{
"name":"",
"location":"",
"secret":""
}
]
}


Правила:

- одна главная тайна;
- максимум 5 персонажей;
- максимум 4 места;
- минимум 5 улик;
- у каждой улики есть логическое место нахождения;
- решение должно быть заранее определено;
- не раскрывай решение в description.

Описание должно дать игроку цель расследования.
`

:

`
Создай данетку.


JSON:

{
"situation":"",
"solution":"",
"hint":"",
"facts":[]
}


Правила:

- ситуация странная, но логичная;
- разгадка объясняет всё;
- факты должны позволять отвечать Да/Нет;
- не должно быть противоречий.
`;



    try{


        const response =
        await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {

            method:"POST",

            headers:{

                "Content-Type":
                "application/json",

                "Authorization":
                `Bearer ${apiKey}`

            },


            body:JSON.stringify({

                model:
                "llama-3.3-70b-versatile",

                messages:[

                    {
                        role:"system",
                        content:
                        "Ты генератор логических игр. Только JSON."
                    },

                    {
                        role:"user",
                        content:prompt
                    }

                ],

                temperature:0.4,

                max_tokens:700,

                response_format:{
                    type:"json_object"
                }

            })

        });



        const data =
        await response.json();



        const result =
        JSON.parse(
            data.choices[0]
            .message.content
        );



        removeLastSystemMessage();



        if(detective){


            state.case = {

                title:
                result.title || "Дело",

                description:
                result.description || "",

                mystery:
                result.mystery || "",

                genre:
                result.genre || "",

                solution:
                result.solution || "",

                characters:
                result.characters || [],

                locations:
                result.locations || [],

                clues:
                result.clues || []

            };


            addMessage(
                "ai",
                result.description
            );


        }
        else{


            state.danetki = {

                situation:
                result.situation || "",

                solution:
                result.solution || "",

                hint:
                result.hint || "",

                facts:
                result.facts || []

            };


            addMessage(
                "ai",
                result.situation
            );

        }



        updateUI(
            "расследование",
            "#34d399"
        );


        saveState();


    }
    catch(error){


        console.error(error);


        removeLastSystemMessage();


        addSystemMessage(
            "❌ Ошибка создания игры: "
            +error.message
        );


    }

}

// ============================================================
// ОТПРАВКА ДЕЙСТВИЯ ИГРОКА
// ============================================================

function sendMessage(){


    if(state.isGenerating || state.isFinished)
        return;



    const input =
        document.getElementById(
            "chat-input"
        );


    const text =
        input.value.trim();


    if(!text)
        return;



    input.value="";


    addMessageInstant(
        "user",
        text
    );


    state.progress.actions.push(text);



    setLoading(true);


    state.isGenerating=true;


    updateUI(
        "ИИ думает...",
        "#fbbf24"
    );



    if(
        text.toLowerCase()
        .includes("сдаюсь")
    ){

        finishStory();
        return;

    }



    callGroq(
        state.messages,

        (response, clue)=>{


            if(response.startsWith("❌")){

                addSystemMessage(response);

                state.isGenerating=false;

                setLoading(false);

                return;

            }



            // Данетки — победа

            if(
                state.mode==="danetki" &&
                clue==="УГАДАЛ"
            ){

                addMessage(
                    "ai",
                    "🎉 Вы разгадали загадку!"
                );


                finishStory();

                return;

            }



            // Новая улика

            if(
                clue &&
                state.mode==="detective"
            ){


                const exists =
                state.progress.foundClues
                .some(
                    c =>
                    c.toLowerCase()
                    ===clue.toLowerCase()
                );


                if(!exists){

                    state.progress
                    .foundClues
                    .push(clue);

                }

            }



            addMessage(
                "ai",
                response
            );



            state.isGenerating=false;


            setLoading(false);


            updateUI(
                state.mode==="detective"
                ? "расследование"
                :"загадка",
                "#34d399"
            );


            saveState();


        }
    );

}




// ============================================================
// ФИНАЛ
// ============================================================

function finishStory(){


    if(state.isFinished)
        return;


    state.isFinished=true;



    const finalText =
    state.mode==="detective"

    ?

`Дело: ${state.case.title}

Настоящее решение:
${state.case.solution}

Найденные улики:
${state.progress.foundClues.join(", ") || "нет"}`


    :

`Разгадка:

${state.danetki.solution}`;



    document
    .getElementById(
        "final-title"
    )
    .textContent =
    state.mode==="detective"
    ? "Дело раскрыто"
    : "Загадка разгадана";



    document
    .getElementById(
        "final-story"
    )
    .textContent =
    finalText;



    document
    .getElementById(
        "final-steps"
    )
    .textContent =
    state.messages.length;



    saveState();


    showFinalScreen();

}



// ============================================================
// СОХРАНЕНИЕ
// ============================================================

function saveState(){


    try{


        localStorage.setItem(

            "detective_chat_state",

            JSON.stringify(state)

        );


        const btn =
        document.getElementById(
            "load-btn"
        );


        if(btn)
            btn.style.display="block";


    }
    catch(e){

        console.error(
            "Ошибка сохранения",
            e
        );

    }

}




// ============================================================
// ЗАГРУЗКА
// ============================================================

function loadState(){


    try{


        const raw =
        localStorage.getItem(
            "detective_chat_state"
        );


        if(!raw)
            return false;



        const data =
        JSON.parse(raw);



        if(
            data.version!=="2.0"
        ){

            localStorage.removeItem(
                "detective_chat_state"
            );

            return false;

        }



        window.state=data;



        const chat =
        document.getElementById(
            "chat-messages"
        );


        chat.innerHTML="";



        state.messages.forEach(
            m=>{


                const div =
                document.createElement(
                    "div"
                );


                div.className =
                `message message-${m.type}`;


                div.textContent =
                m.text;


                chat.appendChild(div);


            }
        );



        showGameScreen();


        updateUI(
            "продолжено",
            "#34d399"
        );



        return true;


    }
    catch(e){

        console.error(e);

        return false;

    }


}




// ============================================================
// ВЫХОД
// ============================================================

function exitToMain(){


    if(state.isGenerating)
        return;



    saveState();


    showStartScreen();

}




// ============================================================
// КНОПКИ
// ============================================================


document.addEventListener(
"DOMContentLoaded",
()=>{


    document
    .getElementById(
        "start-btn"
    )
    .addEventListener(
        "click",
        initGame
    );



    document
    .getElementById(
        "send-btn"
    )
    .addEventListener(
        "click",
        sendMessage
    );



    document
    .getElementById(
        "chat-input"
    )
    .addEventListener(
        "keydown",
        e=>{

            if(e.key==="Enter")
                sendMessage();

        }
    );



    document
    .getElementById(
        "load-btn"
    )
    .addEventListener(
        "click",
        ()=>{


            if(!loadState())
                alert(
                    "Нет сохранения"
                );


        }
    );



    document
    .getElementById(
        "restart-btn"
    )
    .addEventListener(
        "click",
        showStartScreen
    );



    document
    .getElementById(
        "exit-btn"
    )
    .addEventListener(
        "click",
        exitToMain
    );


});




// ============================================================
// АВТОПОКАЗ КНОПКИ ЗАГРУЗКИ
// ============================================================


if(
localStorage.getItem(
"detective_chat_state"
)
){

    const btn =
    document.getElementById(
        "load-btn"
    );


    if(btn)
        btn.style.display="block";

}



console.log(
"🕵️ Game Engine v2.0 loaded"
);
