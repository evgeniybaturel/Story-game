// ============================================================
// GAME ENGINE v2.0
// Детектив на прогулке
// ============================================================


// ============================================================
// СОСТОЯНИЕ ИГРЫ
// ============================================================


window.state = {

    version:2,

    mode:"detective",

    isGenerating:false,

    isFinished:false,


    case:null,


    danetki:null,


    clues:[],


    messages:[],


    progress:{

        score:0,

        discovered:0,

        total:0

    }

};




// ============================================================
// ПОЛУЧЕНИЕ РЕЖИМА
// ============================================================


function getSelectedMode(){

    const btn =
        document.querySelector(
            ".mode-btn.active"
        );


    return btn ?
        btn.dataset.mode :
        "detective";

}





// ============================================================
// СТАРТ ИГРЫ
// ============================================================


async function initGame(){


    const key =
        getApiKey();


    if(!key){

        alert(
            "Введите API-ключ Groq"
        );

        return;

    }



    const mode =
        getSelectedMode();



    resetState(mode);



    showGameScreen();



    setLoading(true);



    addSystemMessage(
        mode==="detective"
        ?
        "🕵️ Создаём дело..."
        :
        "❓ Создаём загадку..."
    );



    try{


        if(mode==="detective"){


            const data =
                await generateDetectiveCase();



            state.case = data;



            state.progress.total =
                data.clues.length;



            document.getElementById(
                "case-title"
            ).textContent =
                data.title;



            addMessage(
                "ai",
                data.intro
            );



        }


        else{


            const data =
                await generateDanetka();



            state.danetki=data;



            document.getElementById(
                "case-title"
            ).textContent =
                "Данетка";


            addMessage(
                "ai",
                data.text
            );

        }



        removeLastSystemMessage();



        updateUI(
            "игра началась",
            "#34d399"
        );


        saveState();


    }

    catch(e){


        console.error(e);


        addSystemMessage(
            "❌ "+e.message
        );


    }


    finally{


        setLoading(false);


    }


}







// ============================================================
// СБРОС
// ============================================================


function resetState(mode){


    window.state={


        version:2,


        mode,


        isGenerating:false,


        isFinished:false,


        case:null,


        danetki:null,


        clues:[],


        messages:[],


        progress:{

            score:0,

            discovered:0,

            total:0

        }


    };


    document.getElementById(
        "chat-messages"
    ).innerHTML="";


}








// ============================================================
// ОТПРАВКА СООБЩЕНИЯ
// ============================================================


async function sendMessage(){


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



    state.isGenerating=true;


    setLoading(true);


    showThinking(true);



    try{


        let result;



        if(
            state.mode==="detective"
        ){


            result =
            await askDetective(

                state.case,

                state.messages,

                text

            );


        }

        else{


            result =
            await askDanetki(

                state.danetki,

                text

            );


        }




        processAnswer(result);



        saveState();



    }

    catch(e){


        addSystemMessage(
            "❌ "+e.message
        );


    }


    finally{


        state.isGenerating=false;


        setLoading(false);


        showThinking(false);



    }


}






// ============================================================
// ОБРАБОТКА ОТВЕТА AI
// ============================================================


function processAnswer(result){



    if(
        !result ||
        !result.text
    ){

        return;

    }



    addMessage(
        "ai",
        result.text
    );





    // --------------------
    // ДЕТЕКТИВ
    // --------------------


    if(
        state.mode==="detective"
    ){


        if(
            result.newClue
        ){


            const exists =
            state.clues.includes(
                result.newClue
            );



            if(!exists){


                state.clues.push(
                    result.newClue
                );


                state.progress.discovered++;


                updateCluesUI();

            }


        }



        if(result.progress){

            state.progress.score =
                result.progress;

        }


    }






    // --------------------
    // ДАНЕТКИ
    // --------------------


    else{


        if(
            result.answer==="solved"
        ){


            finishStory();


        }


    }



}
// ============================================================
// GAME ENGINE v2.0
// ЧАСТЬ 2/2
// ============================================================



// ============================================================
// ФИНАЛ
// ============================================================


async function finishStory(){


    if(state.isFinished)
        return;


    state.isFinished=true;


    updateUI(
        "завершение",
        "#f59e0b"
    );


    setLoading(true);



    addSystemMessage(
        "📝 Подводим итоги..."
    );



    try{


        let finalText;



        if(state.mode==="detective"){


            finalText =
            await generateFinal(

                state.case,

                state.messages,

                state.clues

            );


        }

        else{


            finalText =
            `
Разгадка:

${state.danetki.solution}
            `;


        }



        removeLastSystemMessage();



        document.getElementById(
            "final-title"
        ).textContent =
        state.mode==="detective"
        ?
        "🕵️ Дело раскрыто"
        :
        "❓ Загадка разгадана";



        document.getElementById(
            "final-story"
        ).textContent =
            finalText;



        document.getElementById(
            "final-steps"
        ).textContent =
            state.messages.length;



        document.getElementById(
            "final-clues"
        ).textContent =
            state.clues.length;



        showFinalScreen();



        saveState();



    }

    catch(e){


        console.error(e);


        document.getElementById(
            "final-title"
        ).textContent="Ошибка";


        document.getElementById(
            "final-story"
        ).textContent=e.message;


        showFinalScreen();


    }


    finally{


        setLoading(false);


    }


}






// ============================================================
// ПОДСКАЗКА
// ============================================================


async function giveHint(){


    if(state.isGenerating)
        return;


    if(state.mode==="danetki"){


        addSystemMessage(
            "💡 Подумайте о деталях ситуации"
        );


        return;

    }



    if(!state.case)
        return;



    const remaining =
        state.case.clues
        .filter(
            x=>!state.clues.includes(x)
        );



    if(remaining.length){


        addMessage(
            "ai",
            "💡 Возможно, стоит обратить внимание: "
            +
            remaining[
                Math.floor(
                    Math.random()*remaining.length
                )
            ]
        );


    }

    else{


        addMessage(
            "ai",
            "💡 Вы уже нашли все основные улики. Попробуйте восстановить последовательность событий."
        );


    }


}







// ============================================================
// СОХРАНЕНИЕ
// ============================================================


function saveState(){


    try{


        localStorage.setItem(

            "detective_game_v2",

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
            "detective_game_v2"
        );



        if(!raw)
            return false;



        const data =
        JSON.parse(raw);



        if(data.version!==2)
            return false;



        window.state=data;



        document.getElementById(
            "chat-messages"
        ).innerHTML="";



        state.messages.forEach(m=>{


            addMessageInstant(
                m.type,
                m.text
            );


        });




        if(state.case){


            document.getElementById(
                "case-title"
            ).textContent =
            state.case.title;


        }



        updateCluesUI();



        showGameScreen();



        return true;


    }

    catch(e){


        return false;


    }


}







// ============================================================
// ВЫХОД
// ============================================================


function exitToMain(){


    saveState();


    showStartScreen();


}








// ============================================================
// UI ОБНОВЛЕНИЕ УЛИК
// ============================================================


function updateCluesUI(){


    const count =
    document.getElementById(
        "clue-count"
    );


    const total =
    document.getElementById(
        "clue-total"
    );



    if(count)
        count.textContent =
        state.clues.length;



    if(total)
        total.textContent =
        state.progress.total || "?";



}







// ============================================================
// СОБЫТИЯ
// ============================================================


document.addEventListener(
"DOMContentLoaded",
()=>{


    document
    .querySelectorAll(".mode-btn")
    .forEach(btn=>{


        btn.addEventListener(
        "click",
        ()=>{


            document
            .querySelectorAll(".mode-btn")
            .forEach(
                b=>b.classList.remove("active")
            );


            btn.classList.add("active");


        });


    });





    document
    .getElementById("start-btn")
    .addEventListener(
        "click",
        initGame
    );





    document
    .getElementById("send-btn")
    .addEventListener(
        "click",
        sendMessage
    );





    document
    .getElementById("chat-input")
    .addEventListener(
        "keydown",
        e=>{

            if(e.key==="Enter")
                sendMessage();

        }
    );





    document
    .getElementById("hint-btn")
    .addEventListener(
        "click",
        giveHint
    );





    document
    .getElementById("exit-btn")
    .addEventListener(
        "click",
        exitToMain
    );





    document
    .getElementById("restart-btn")
    .addEventListener(
        "click",
        showStartScreen
    );





    document
    .getElementById("load-btn")
    .addEventListener(
        "click",
        ()=>{

            if(!loadState())
                alert(
                    "Нет сохранённой игры"
                );

        }
    );





    document
    .getElementById("copy-btn")
    .addEventListener(
    "click",
    async()=>{


        const text =
        document.getElementById(
            "final-title"
        ).textContent
        +
        "\n\n"
        +
        document.getElementById(
            "final-story"
        ).textContent;



        await navigator.clipboard
        .writeText(text);



    });


});






console.log(
"🕵️ Game Engine v2.0 loaded"
);
