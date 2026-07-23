// ============================================================
// UI ENGINE v2.0
// Детектив на прогулке
// ============================================================



// ============================================================
// ЭКРАНЫ
// ============================================================


function showGameScreen(){

    document
    .getElementById("start-screen")
    .classList.add("hidden");


    document
    .getElementById("game-screen")
    .classList.remove("hidden");


    document
    .getElementById("final-screen")
    .classList.add("hidden");

}





function showFinalScreen(){

    document
    .getElementById("start-screen")
    .classList.add("hidden");


    document
    .getElementById("game-screen")
    .classList.add("hidden");


    document
    .getElementById("final-screen")
    .classList.remove("hidden");

}





function showStartScreen(){

    document
    .getElementById("start-screen")
    .classList.remove("hidden");


    document
    .getElementById("game-screen")
    .classList.add("hidden");


    document
    .getElementById("final-screen")
    .classList.add("hidden");

}






// ============================================================
// STATUS
// ============================================================


function updateUI(text,color){


    const status =
    document.getElementById(
        "chat-status"
    );


    if(!status)
        return;



    status.textContent =
        "● " + text;



    status.style.color=color;


}






// ============================================================
// LOADING
// ============================================================


function setLoading(value){


    const send =
    document.getElementById(
        "send-btn"
    );


    const input =
    document.getElementById(
        "chat-input"
    );



    if(send)
        send.disabled=value;



    if(input)
        input.disabled=value;


}






function showThinking(value){


    const status =
    document.getElementById(
        "chat-status"
    );


    if(!status)
        return;



    if(value){


        status.textContent =
        "● думает...";


        status.style.color =
        "#fbbf24";


    }

}








// ============================================================
// СООБЩЕНИЯ
// ============================================================


const chatMessages =
document.getElementById(
    "chat-messages"
);





function scrollBottom(){

    if(chatMessages)

        chatMessages.scrollTop =
        chatMessages.scrollHeight;

}







function typeMessage(element,text){


    let i=0;


    const timer =
    setInterval(()=>{


        element.textContent +=
        text[i];


        i++;


        scrollBottom();



        if(i>=text.length)

            clearInterval(timer);



    },15);


}







function addMessage(type,text){


    const box =
    document.createElement(
        "div"
    );



    box.className =
    "message message-"+type;



    chatMessages.appendChild(
        box
    );



    typeMessage(
        box,
        text
    );



    saveMessage(
        type,
        text
    );



    return box;


}






function addMessageInstant(type,text){


    const box =
    document.createElement(
        "div"
    );



    box.className =
    "message message-"+type;


    box.textContent=text;



    chatMessages.appendChild(
        box
    );



    scrollBottom();



    saveMessage(
        type,
        text
    );



}






function saveMessage(type,text){


    if(
        window.state &&
        window.state.messages
    ){


        window.state.messages.push({

            type,

            text,

            time:
            Date.now()

        });


    }

}






function addSystemMessage(text){


    const box =
    document.createElement(
        "div"
    );


    box.className =
    "message message-system";


    box.textContent=text;



    chatMessages.appendChild(
        box
    );



    scrollBottom();


}






function removeLastSystemMessage(){


    const list =
    document.querySelectorAll(
        ".message-system"
    );


    if(list.length)


        list[list.length-1]
        .remove();


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
    state.clues || [];



    if(clues.length===0){


        body.innerHTML =
        `
        <div class="empty">
        Улик пока нет
        </div>
        `;


    }

    else{


        body.innerHTML =
        clues.map(
        (c,i)=>`

        <div class="clue-item">

            <div class="clue-text">
            ${i+1}. ${c}
            </div>

            <div class="clue-meta">
            Найдено
            </div>

        </div>

        `
        ).join("");

    }



    modal.classList.remove(
        "hidden"
    );


}






function closeModal(){


    document
    .getElementById("modal")
    .classList.add("hidden");


}







// ============================================================
// DOM
// ============================================================


document.addEventListener(
"DOMContentLoaded",
()=>{


    const inventory =
    document.getElementById(
        "inventory-toggle"
    );


    if(inventory)

        inventory.onclick =
        openInventory;




    const close =
    document.getElementById(
        "modal-close"
    );


    if(close)

        close.onclick =
        closeModal;




    const modal =
    document.getElementById(
        "modal"
    );


    if(modal)

        modal.onclick=e=>{

            if(e.target===modal)

                closeModal();

        };



});





console.log(
"🎨 UI Engine v2.0 loaded"
);
