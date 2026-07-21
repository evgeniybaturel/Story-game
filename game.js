// ============================================================
// GAME ENGINE v2.1
// Детектив на прогулке
// ============================================================


// ============================================================
// СОСТОЯНИЕ ИГРЫ
// ============================================================

window.state = {

    version: "2.1",

    messages: [],

    storyId: Date.now(),

    mode: "detective",

    isGenerating: false,

    isFinished: false,


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


    danetki: {

        situation: "",
        solution: "",
        hint: "",
        facts: []

    },


    progress: {

        actions: [],
        foundClues: []

    }

};




// ============================================================
// ПОЛУЧЕНИЕ РЕЖИМА
// ============================================================

function getSelectedMode(){

    const active =
    document.querySelector(
        ".mode-btn.active"
    );


    return active
        ? active.dataset.mode
        : "detective";

}




// ============================================================
// СТАРТ ИГРЫ
// ============================================================

function initGame(){


    const apiKey =
    getApiKey();


    if(!apiKey){

        alert(
            "Введите API-ключ Groq"
        );

        return;

    }



    state.messages=[];

    state.storyId =
    Date.now();

    state.mode =
    getSelectedMode();

    state.isGenerating=false;

    state.isFinished=false;



    state.case={

        title:"",
        description:"",
        mystery:"",
        solution:"",
        genre:"",
        characters:[],
        locations:[],
        clues:[]

    };



    state.danetki={

        situation:"",
        solution:"",
        hint:"",
        facts:[]

    };



    state.progress={

        actions:[],
        foundClues:[]

    };



    document
    .getElementById(
        "chat-messages"
    )
    .innerHTML="";



    showGameScreen();



    addSystemMessage(
        state.mode==="detective"
        ?
        "🕵️ ИИ создаёт дело..."
        :
        "❓ ИИ придумывает данетку..."
    );


    updateUI(
        "создание",
        "#fbbf24"
    );



    generateStory();

}





// ============================================================
// СОЗДАНИЕ НОВОЙ ИСТОРИИ
// ============================================================


async function generateStory(){


    const apiKey =
    getApiKey();



    const isDetective =
    state.mode==="detective";



    const prompt =
    isDetective

?

`
Ты ведущий детективной игры.

Создай одно логичное расследование.

Верни строго JSON:

{
"title":"",
"description":"",
"mystery":"",
"genre":"",
"solution":"",
"characters":[],
"locations":[],
"clues":[
{
"name":"",
"place":"",
"meaning":""
}
]
}


ВАЖНЫЕ ПРАВИЛА:

1. Игрок должен расследовать, а не читать рассказ.
2. В description НЕ раскрывай решение.
3. Решение должно объяснять ВСЁ.
4. Должно быть минимум 5 настоящих улик.
5. Каждая улика должна находиться в конкретном месте.
6. Персонажи должны иметь мотивы.
7. Не создавай невозможных событий.

Пример:

Плохо:
"Произошло нечто странное."

Хорошо:
"В старом доме найдено письмо человека, который исчез неделю назад."
`

:

`
Ты ведущий игры Данетки.

Создай загадочную ситуацию.

Верни JSON:

{
"situation":"",
"solution":"",
"hint":"",
"facts":[]
}


Правила:

1. Ситуация должна быть короткой.
2. Разгадка должна объяснять каждый факт.
3. На вопросы игрока можно отвечать Да/Нет.
4. Не должно быть противоречий.
5. Игрок должен понимать, что именно нужно разгадать.
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
                        "Ты создаёшь логические игры. Отвечай только JSON."
                    },

                    {
                        role:"user",
                        content:prompt
                    }

                ],


                temperature:0.5,

                max_tokens:900,


                response_format:{
                    type:"json_object"
                }

            })

        });



        if(!response.ok){

            throw new Error(
                "Ошибка API: "
                +response.status
            );

        }



        const data =
        await response.json();



        const result =
        JSON.parse(
            data
            .choices[0]
            .message
            .content
        );



        removeLastSystemMessage();



        if(isDetective){


            state.case={

                title:
                result.title || "Новое дело",

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
                state.case.description
            );


        }
        else{


            state.danetki={

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
                state.danetki.situation
            );

        }



        updateUI(
            isDetective
            ?
            "расследование"
            :
            "загадка",
            "#34d399"
        );



        saveState();


    }
    catch(error){


        console.error(
            error
        );


        removeLastSystemMessage();


        addSystemMessage(
            "❌ Ошибка создания: "
            +
            error.message
        );

    }

}

// ============================================================
// ОТПРАВКА ВОПРОСА ИГРОКА
// ============================================================


function sendMessage(){


    if(
        state.isGenerating ||
        state.isFinished
    )
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



    state.progress.actions.push(
        text
    );



    state.isGenerating=true;


    setLoading(true);



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


        `Ты ведущий игры.
        Отвечай строго по правилам режима.
        Не начинай новую историю.`,


        (response, clue)=>{


            state.isGenerating=false;

            setLoading(false);



            if(
                response.startsWith("❌")
            ){

                addSystemMessage(
                    response
                );

                return;

            }





            // =========================
            // ДАНЕТКИ
            // =========================


            if(
                state.mode==="danetki"
            ){


                if(
                    clue==="УГАДАЛ"
                ){

                    addMessage(
                        "ai",
                        "🎉 Вы разгадали загадку!"
                    );


                    finishStory();

                    return;

                }


            }





            // =========================
            // ДЕТЕКТИВ
            // =========================


            if(
                state.mode==="detective"
                &&
                clue
            ){


                const exists =
                state.progress
                .foundClues
                .some(

                    c=>
                    c.toLowerCase()
                    ===
                    clue.toLowerCase()

                );



                if(!exists){

                    state.progress
                    .foundClues
                    .push(
                        clue
                    );

                }


            }





            addMessage(
                "ai",
                response
            );



            updateUI(

                state.mode==="detective"
                ?
                "расследование"
                :
                "загадка",

                "#34d399"

            );



            saveState();


        }

    );


}






// ============================================================
// ФИНАЛ ИГРЫ
// ============================================================


function finishStory(){


    if(
        state.isFinished
    )
        return;



    state.isFinished=true;



    updateUI(
        "завершено",
        "#f59e0b"
    );




    let result="";



    if(
        state.mode==="detective"
    ){


        result =
`
🕵️ Дело: ${state.case.title}


Настоящее происшествие:

${state.case.solution}


Найденные улики:

${
state.progress.foundClues.length
?
state.progress.foundClues.join("\n")
:
"Улик не найдено"
}
`;



    }
    else{


        result =
`
❓ Разгадка:


${state.danetki.solution}


Подсказка:

${state.danetki.hint}
`;

    }




    document
    .getElementById(
        "final-title"
    )
    .textContent =

    state.mode==="detective"
    ?
    "Дело раскрыто"
    :
    "Загадка разгадана";





    document
    .getElementById(
        "final-story"
    )
    .textContent =
    result;




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

            JSON.stringify(
                state
            )

        );



        const btn =
        document.getElementById(
            "load-btn"
        );



        if(btn)
            btn.style.display =
            "block";


    }
    catch(e){

        console.error(
            "Save error",
            e
        );

    }


}







// ============================================================
// ЗАГРУЗКА
// ============================================================


function loadState(){


    try{


        const saved =
        localStorage.getItem(
            "detective_chat_state"
        );



        if(!saved)
            return false;



        const data =
        JSON.parse(
            saved
        );



        window.state=data;



        const chat =
        document
        .getElementById(
            "chat-messages"
        );



        chat.innerHTML="";



        state.messages
        .forEach(

            m=>{

                const div =
                document
                .createElement(
                    "div"
                );


                div.className =
                `
                message
                message-${m.type}
                `;


                div.textContent =
                m.text;



                chat.appendChild(
                    div
                );

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


        console.error(
            e
        );


        return false;


    }


}








// ============================================================
// ВЫХОД
// ============================================================


function exitToMain(){


    if(
        state.isGenerating
    )
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
    .querySelectorAll(
        ".mode-btn"
    )
    .forEach(

        btn=>{


            btn.addEventListener(

            "click",

            ()=>{


                document
                .querySelectorAll(
                    ".mode-btn"
                )
                .forEach(

                    b=>
                    b.classList
                    .remove(
                        "active"
                    )

                );


                btn.classList
                .add(
                    "active"
                );



                state.mode =
                btn.dataset.mode;


            });

        }

    );





    document
    .getElementById(
        "start-btn"
    )
    ?.addEventListener(
        "click",
        initGame
    );





    document
    .getElementById(
        "send-btn"
    )
    ?.addEventListener(
        "click",
        sendMessage
    );





    document
    .getElementById(
        "chat-input"
    )
    ?.addEventListener(

        "keydown",

        e=>{

            if(
                e.key==="Enter"
            )
                sendMessage();

        }

    );





    document
    .getElementById(
        "load-btn"
    )
    ?.addEventListener(

        "click",

        loadState

    );





    document
    .getElementById(
        "restart-btn"
    )
    ?.addEventListener(

        "click",

        showStartScreen

    );





    document
    .getElementById(
        "exit-btn"
    )
    ?.addEventListener(

        "click",

        exitToMain

    );



});







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
"🕵️ Game Engine v2.1 loaded"
);
