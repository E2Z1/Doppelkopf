let game;
function joinGame() {
    if (localStorage.getItem("game")) {showError("already in game; rejoining game..."); startGame(); return}
    if (document.getElementById("game_id").value.length != 5) {showError("invalid game id (not 5 characters)"); return}
    fetch("http://127.0.0.1:54321/functions/v1/join-game", {
        method: "POST",
        body: JSON.stringify({
            game_id: document.getElementById("game_id").value.toLowerCase(),
            session_id: localStorage.getItem("session_id")
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            if (json.success) {
                game = json;
                localStorage.setItem("game", JSON.stringify(game));
                for (let i = 0; i < Object.keys(json.players).length; i++) {
                    if (json.players[i].name == localStorage.getItem("username")) {
                        localStorage.setItem("indexInGame", i)
                    }
                }
                console.log(json);
                if (json.success) startGame(); else showError(json.message)
            } else showError(json.message);
        });
}

function showError(error) {
    const errorContainer = document.getElementById("errorContainer");
    errorContainer.innerHTML = "Error: "+error
    errorContainer.classList.add("show");
    setTimeout(() => {
        errorContainer.classList.remove("show");
    }, 3000);
}

async function getGame() {
    fetch("http://127.0.0.1:54321/functions/v1/getGame", {
        method: "POST",
        body: JSON.stringify({
            game_id: JSON.parse(localStorage.getItem("game")).game_id.toLowerCase(),
            session_id: localStorage.getItem("session_id")
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            if (json.success) {
                if (localStorage.getItem("game") != JSON.stringify(json)) {
                    console.log(json)
                    game = json;
                    localStorage.setItem("game", JSON.stringify(game));
                    renderCards()
                }
                if (!json.success) showError(json.message);
            } else showError(json.message);
        });
}

async function signUp(name, password) {
    if (name != "" && password != "") {
        fetch("http://127.0.0.1:54321/functions/v1/signUp", {
            method: "POST",
            body: JSON.stringify({
                name: name, pw: password
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())
            .then((json) => {
                if (json.success) {
                    localStorage.setItem("session_id", json.session_id)
                    localStorage.setItem("username", name)
                    window.location.href = "/"
                } else showError(json.message)
            });
    }
}

async function logIn(name, password) {
    fetch("http://127.0.0.1:54321/functions/v1/logIn", {
        method: "POST",
        body: JSON.stringify({
            name: name, pw: password
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            if (json.success) {
                localStorage.setItem("session_id", json.session_id)
                localStorage.setItem("username", name)
                window.location.href = "/"
            } else showError(json.message)
        });
}

function logOut() {
    localStorage.removeItem("session_id")
    localStorage.removeItem("username")
}

function updateNavbar() {
    Array.from(document.getElementsByClassName("loggedOutIn")).forEach(element => {
        element.remove()
    });
    if (localStorage.getItem("session_id")) {
        document.getElementsByClassName("navbar")[0].children[0].children[0].innerHTML += "<li class='loggedOutIn'><a onclick='logOut()' href=''>Log out ("+localStorage.getItem("username")+")</a></li>"
    } else {
        document.getElementsByClassName("navbar")[0].children[0].children[0].innerHTML += "<li class='loggedOutIn'><a href='/login/'>Log in</a></li>\n"
        document.getElementsByClassName("navbar")[0].children[0].children[0].innerHTML += "<li class='loggedOutIn'><a href='/signup/'>Sign up</a></li>"
    }
}

function renderCards() {
    game = JSON.parse(localStorage.getItem("game"));
    let html = ''
    const trick_cards = Object.keys(game.current_trick).length - 1;
    const starter = game.current_trick.start;
    for (let i = starter; i < trick_cards+starter;i++) {
        html += '<img class="trickCard" src="/cards/'+game.current_trick[i%4][0].toString()+'-'+game.current_trick[i%4][1].toString()+'.svg" style="--i:'+(4-localStorage.getItem("indexInGame")+i)%4+'">'
    }
    document.getElementById("current_trick").innerHTML = html;
    html = '';
    for (let i = 0; i<Object.keys(game.players).length;i++) {
        if (i == localStorage.getItem("indexInGame")) {
            userCards = game.players[i].cards;
            for (let j = 0; j<Object.keys(userCards).length;j++) {
                html += '<img class="card" onclick="placeCard('+j+')" src="/cards/'+userCards[j][0]+'-'+userCards[j][1]+'.svg" style="--i:'+(j-(Math.ceil(Object.keys(userCards).length/2)-1))+'">'
            }
            html += '<div class="tricks"></div>'
            document.getElementById("player0").innerHTML = html;
            html = '';
        } else {
            userCards = game.players[i].cards;
            for (let j = 0; j<userCards;j++) {
                html += '<img class="card" src="/cards/back.svg" style="--i:'+(j-(Math.ceil(userCards/2)-1))+'">'
            }
            html += '<p id="player-name">'+game.players[i].name+'</p>'
            html += '<div class="tricks"></div>'
            document.getElementById("player"+(4-localStorage.getItem("indexInGame")+i)%4).innerHTML = html;
            html = '';
        }
        for (let j = 0; j < game.players[i].tricks; j++) appendCardToTrick("player"+(4-localStorage.getItem("indexInGame")+i)%4); 
        if (isValid(game, i)) document.getElementById("player"+(4-localStorage.getItem("indexInGame")+i)%4).className = "their-turn"; else document.getElementById("player"+(4-localStorage.getItem("indexInGame")+i)%4).className = "";
    }

}
function isValid(data, playerId) {
    if (Object.keys(data.players).length != 4) return false;
    if (!(data.current_trick[(playerId+3)%4] || data.current_trick.start == playerId)) return false;
    if (data.current_trick[playerId]) return false;
    return true;
}
function placeCard(card) {
    fetch("http://127.0.0.1:54321/functions/v1/placeCard", {
        method: "POST",
        body: JSON.stringify({
            game_id: JSON.parse(localStorage.getItem("game")).game_id.toLowerCase(),
            session_id: localStorage.getItem("session_id"),
            card
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            if (json.success) {
                game = json;
                localStorage.setItem("game", JSON.stringify(game));
                renderCards()
            } else showError(json.message)
            console.log(json);
        });
}

function startGame() {
    if (document.getElementsByClassName("select-game")[0]) document.getElementsByClassName("select-game")[0].remove();
    if (document.getElementsByClassName("navbar")[0]) document.getElementsByClassName("navbar")[0].remove();
    const gameContainer = document.getElementsByClassName("game-container")[0];
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
    //setInterval(getGame, 1000);
    renderCards()
}

function leaveGame() {
    localStorage.removeItem("game")
    localStorage.removeItem("indexInGame")
}

function appendCardToTrick(id) {
    const cardStack = document.getElementById(id).getElementsByClassName("tricks")[0];
    const cardsLength = cardStack.children.length
    cardStack.innerHTML += '<img class="card" src="/cards/back.svg" style="transform: translate(-'+cardsLength/1.5+'px, -'+cardsLength/1.5+'px)">';
}