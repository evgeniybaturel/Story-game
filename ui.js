// ============================================================
// UI ENGINE v2.0
// Интерфейс игры
// ============================================================



// ============================================================
// НАВИГАЦИЯ
// ============================================================


function showGameScreen(){

    document
    .getElementById("start-screen")
    ?.classList.add("hidden");


    document
    .getElementById("game-screen")
    ?.classList.remove("hidden");


    document
    .getElementById("final-screen")
    ?.classList.add("hidden");

}



function showFinalScreen(){

    document
    .getElementById("start-screen")
    ?.classList.add("hidden");


    document
    .getElementById("game-screen")
    ?.classList.add("hidden");


    document
    .getElementById("final-screen")
    ?.classList.remove("hidden");

}



function showStartScreen(){

    document
    .getElementById("start-screen")
    ?.classList.remove("hidden");


    document
    .getElementById("game-screen")
    ?.classList.add("hidden");


    document
    .getElementById("final-screen")
    ?.classList.add("hidden");

}





// ============================================================
// STATUS
// ============================================================


function updateUI(status,color){


    const el =
    document.getElementById(
        "chat-status"
    );


    if(!el)
        return;


    el.textContent =
    "● " + status;


    el.style.color=color;


}





function setLoading(value){


    const btn =
    document.getElementById(
        "send-btn"
    );


    const input =
    document.getElementById(
        "chat-input"
    );


    if(btn)
        btn.disabled=value;


    if(input)
        input.disabled=value;


}






// ============================================================
// СООБЩЕНИЯ
// ============================================================



function getChat(){

    return document
    .getElementById(
        "chat-messages"
    );

}




function typeMessage(element,text){


    let i=0;


    function write(){


        if(i < text.length){


            element.textContent +=
            text[i];


            i++;


            getChat()
            .scrollTop =
            getChat()
            .scrollHeight;


            setTimeout(
                write,
                12
            );

        }

    }


    write();

}





function addMessage(type,text){


    const chat =
    getChat();


    if(!chat)
        return;



    const msg =
    document.createElement(
        "div"
    );


    msg.className =
    `message message-${type}`;


    chat.appendChild(msg);



    typeMessage(
        msg,
        text
    );



    if(
        window.state &&
        window.state.messages
    ){

        window.state.messages.push({

            type:type,

            text:text,

            timestamp:
            Date.now()

        });

    }



    chat.scrollTop =
    chat.scrollHeight;


    return msg;

}





function addMessageInstant(type,text){


    const chat =
    getChat();


    const msg =
    document.createElement(
        "div"
    );


    msg.className =
    `message message-${type}`;


    msg.textContent=text;


    chat.appendChild(msg);



    if(
        window.state &&
        window.state.messages
    ){

        window.state.messages.push({

            type:type,

            text:text,

            timestamp:
            Date.now()

        });

    }



    chat.scrollTop =
    chat.scrollHeight;


}





function addSystemMessage(text){


    const chat =
    getChat();


    const msg =
    document.createElement(
        "div"
    );


    msg.className =
    "message message-system";


    msg.textContent=text;


    chat.appendChild(msg);


}





function removeLastSystemMessage(){


    const chat =
    getChat();


    const messages =
    chat.querySelectorAll(
        ".message-system"
    );


    if(messages.length){

        messages[
            messages.length-1
        ]
        .remove();

    }


}






// ============================================================
// ИНВЕНТАРЬ
// ============================================================


function openInventory(){


    const modal =
    document.getElementById(
        "modal"
    );


    const body =
    document.getElementById(
        "modal-body"
    );



    if(!modal || !body)
        return;




    const clues =
    window.state
    ?.progress
    ?.foundClues
    || [];





    if(clues.length===0){


        body.innerHTML =
        `
        <div class="empty">
        Улики пока не найдены
        </div>
        `;


    }
    else{


        body.innerHTML =

        clues.map(
        (clue,index)=>`

        <div class="clue-item">

            <div class="clue-text">

            🔎 ${index+1}. ${clue}

            </div>


            <div class="clue-meta">

            Найдено во время расследования

            </div>

        </div>

        `
        )
        .join("");

    }



    modal.classList.remove(
        "hidden"
    );

}





function closeModal(){

    document
    .getElementById("modal")
    ?.classList.add(
        "hidden"
    );

}







// ============================================================
// КНОПКИ
// ============================================================


document.addEventListener(
"DOMContentLoaded",
()=>{


    document
    .getElementById(
        "inventory-toggle"
    )
    ?.addEventListener(
        "click",
        openInventory
    );



    document
    .getElementById(
        "modal-close"
    )
    ?.addEventListener(
        "click",
        closeModal
    );



    document
    .getElementById(
        "modal"
    )
    ?.addEventListener(
        "click",
        e=>{

            if(
            e.target.id==="modal"
            )
                closeModal();

        }
    );


});



console.log(
"🎨 UI Engine v2.0 loaded"
);
