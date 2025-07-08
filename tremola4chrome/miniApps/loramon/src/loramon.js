/* loramon.js */

"use strict";

// Register with miniApps system
const globalWindow = window.top || window;
if (!globalWindow.miniApps) {
    globalWindow.miniApps = {}; 
}

globalWindow.miniApps["LoRàMon"] = {
    handleRequest: function(command, args) {
        console.log("LoRàMon handling request:", command);
        switch (command) {
            case "onBackPressed":
                if (LoramonScenario == 'loramon_battle') {
                    setLoramonScenario('loramon_selection');
                } else if (LoramonScenario == 'loramon_selection') {
                    setLoramonScenario('loramon_list');
                } else {
                    quitApp();
                }
                break;
            case "plus_button":
                loremon_new_game();
                break;
            case "members_confirmed":
                loramon_new_game_confirmed();
                break;
            case "b2f_initialize":
                loramon_load_list();
                break;
            case "b2f_new_event":
                loramon_load_list();
                break;
            case "incoming_notification":
                decodeLoramonRequest(args.args);
                break;
        }
        return "Response from LoRàMon";
    }
};

// Game states
var loramon_iwon = '(I won)';
var loramon_ilost = '(I lost)';
var loramon_ogaveup = '(peer gave up)';
var loramon_igaveup = '(I gave up)';
var currentBattleId = null;
var isProcessing = false;

// Simple Pokémon database
const LoRàMon = [
    { id: 1, name: "Eggvance", hp: 35, attack: 40, sprite: "eggvance.svg" },
    { id: 2, name: "SSIO", hp: 35, attack: 40, sprite: "ssio.svg" },
    { id: 3, name: "Ugandan", hp: 35, attack: 40, sprite: "ugandan.svg" },
    { id: 4, name: "AppKO", hp: 35, attack: 40, sprite: "appko.svg" }
];

function decodeLoramonRequest(request) {
    loramon_on_rx(request, 0);
}


function loramon_init() { 
    setLoramonScenario('loramon_list'); // Initialize the app
    loramon_load_list();
}

function loramon_load_list() {
    closeOverlay();
    let lst = document.getElementById('div:loramon_list');
    lst.innerHTML = '';
    
    if (typeof tremola.loramon == "undefined") {
        tremola.loramon = { 'active': {}, 'closed': {} };
    }
    
    for (var nm in tremola.loramon.active) {
        if (nm == "undefined") continue;
        
        let g = tremola.loramon.active[nm];
        let item = document.createElement('div');
        
        var row = "<button class='loramon_list_button' onclick='loramon_load_selection(\"" + nm + "\");' style='overflow: hidden; width: 70%; background-color: #ebf4fa;'>";
        row += "<div style='white-space: nowrap;'><div style='text-overflow: ellipsis; overflow: hidden;'>"
        row += "Battle with " + fid2display(g.peer) + "<br>";
        row += g.state;
        if (g.state == 'closed') {
            row += " " + g.close_reason;
        } else if (g.state == 'invited') {
            row += " (click here to accept)";
        }
        row += "</div></button></div>";
        
        var btxt;
        if (g.state == 'invited') btxt = 'decline';
        else if (g.state == 'closed') btxt = 'delete';
        else btxt = 'end';
        
        row += `<button class='loramon_list_button' style='width: 20%; text-align: center;' onclick='loramon_list_callback("${nm}","${btxt}")'>${btxt}</button>`;
        item.innerHTML = row;
        lst.appendChild(item);
    }
}

function loramon_load_selection(nm) {
    let g = tremola.loramon.active[nm];
    
     if (!tremola.loramon.active[nm]) {
        console.error("Game not found:", nm);
        return;
    }
    if (g.state == 'invited') {
        loramon_list_callback(nm, 'accept');
        return;
    }
   
    
    // Load LoRàMon selection screen
    let sel = document.getElementById('div:loramon_selection');
    sel.innerHTML = '<h2>Choose your LoRàMon</h2>';
    
    LORAMON.forEach(p => {
        let btn = document.createElement('button');
        btn.className = 'loramon_select_button';
        btn.innerHTML = `
            <img src="${miniAppDirectory}assets/${p.sprite}" width="50">
            <div>${p.name}</div>
            <div>HP: ${p.hp} ATK: ${p.attack}</div>
        `;
        btn.onclick = () => loramon_select(nm, p.id);
        sel.appendChild(btn);
    });
    
    setLoramonScenario('loramon_selection');
}

function loramon_select(nm, loramonId) {
    let g = tremola.loramon.active[nm];
    g.myLoramon = loramonId;
    
    let json = {
        type: 'S', // Selection
        nm: nm,
        loramon: loramonId,
        from: myId
    };
    writeLogEntry(JSON.stringify(json));
    
    if (g.theirLoramon) {
        loramon_start_battle(nm);
    } else {
        loramon_load_waiting(nm);
    }
}

function loramon_load_waiting(nm) {
    let wait = document.getElementById('div:loramon_waiting');
    wait.innerHTML = '<h2>Waiting for opponent to choose...</h2>';
    setLoramonScenario('loramon_waiting');
}

function loramon_start_battle(nm) {
    currentBattleId = nm; // Store current battle ID
    let g = tremola.loramon.active[nm];
    
    // Update battle screen elements directly
    document.getElementById('loramon_opponent_sprite').src = 
        `${miniAppDirectory}assets/${LORAMON[g.theirLoramon-1].sprite}`;
    document.getElementById('loramon_opponent_name').textContent = 
        LORAMON[g.theirLoramon-1].name;
    document.getElementById('loramon_player_sprite').src = 
        `${miniAppDirectory}assets/${LORAMON[g.myLoramon-1].sprite}`;
    document.getElementById('loramon_player_name').textContent = 
        LORAMON[g.myLoramon-1].name;
    
    setLoramonScenario('loramon_battle');
}

function loramon_attack(nm) {
    // In a real implementation, this would calculate battle results
    if (isProcessing) return;
    isProcessing = true;

    let json = {
        type: 'A', // Attack
        nm: nm,
        from: myId
    };
    writeLogEntry(JSON.stringify(json));
    setTimeout(() => isProcessing = false, 1000); // Reset after animation
}

function loramon_new_game() {
    launchContactsMenu('LoRàMon Battle', 'Pick a friend to battle with');
}

function loramon_new_game_confirmed() {
    for (var m in tremola.contacts) {
        if (m != myId && document.getElementById(m).checked) {
            let randomNum = Math.floor(Math.random() * 1000000);
            let json = { 
                type: 'N', 
                from: myId, 
                to: m, 
                nm: myId + "" + m + "" + randomNum 
            };
            writeLogEntry(JSON.stringify(json));
            break;
        }
    }
    if (curr_scenario == 'members') {
        setLoramonScenario('loramon_list');
    }
}

function loramon_list_callback(nm, action) {
    let g = tremola.loramon.active[nm];
    
    if (action == 'accept') {
        let json = { type: 'A', nm: nm };
        writeLogEntry(JSON.stringify(json));
    }
    else if (action == 'end' || action == 'decline') {
        let json = { type: 'E', nm: nm, from: myId };
        writeLogEntry(JSON.stringify(json));
    }
    else if (action == 'delete') {
        delete tremola.loramon.active[nm];
        tremola.loramon.closed[nm] = g.peer;
        persist();
    }
    
    loramon_load_list();
}

function loramon_on_rx(args, index=0) {
    if (typeof tremola.loramon == "undefined") {
        tremola.loramon = { 'active': {}, 'closed': {} };
    }
    
    let pa = tremola.loramon.active;
    
    if (args[index].type == 'N') { // New game invitation
        if (args[index].from != myId && args[index].to != myId) return;
        
        pa[args[index].nm] = {
            'peer': args[index].to == myId ? args[index].from : args[index].to,
            'state': args[index].to == myId ? 'invited' : 'inviting',
            'close_reason': '',
            'myLoramon': null,
            'theirLoramon': null
        };
        
        persist();
        if (LoramonScenario == 'loramon_list') {
            loramon_load_list();
        }
        return;
    }
    
    let g = pa[args[index].nm];
    
    if (args[index].type == 'A') { // Accept
        if (g.state == 'inviting' || g.state == 'invited') {
            g.state = 'selection';
            persist();
            if (LoramonScenario == 'loramon_list') {
                loramon_load_list();
            }
        }
        return;
    }
    
    if (args[index].type == 'E') { // End
        g.state = 'closed';
        g.close_reason = 'by ' + (args[index].from == myId ? 'myself' : 'peer');
    } 
    else if (args[index].type == 'S') { // LoRàMon selection
        if (args[index].from == myId) {
            g.myLoramon = args[index].loramon;
        } else {
            g.theirLoramon = args[index].loramon;
        }
        
        if (g.myLoramon && g.theirLoramon) {
            g.state = 'battle';
            if (LoramonScenario == 'loramon_waiting' || LoramonScenario == 'loramon_selection') {
                loramon_start_battle(args[index].nm);
            }
        }
    }
    else if (args[index].type == 'A') { // Attack
        // Battle logic would go here
        // For now, just end the game
        g.state = 'closed';
        g.close_reason = args[index].from == myId ? loramon_iwon : loramon_ilost;
    }
    
    persist();
    
    if (LoramonScenario == 'loramon_list') {
        Loramon_load_list();
    }
}

// Helper function to set scenario
function setLoramonScenario(scenario) {
    LoramonScenario = scenario;
    // Hide all divs first
    document.querySelectorAll('[id^="div:loramon-"]').forEach(div => {
        div.style.display = 'none';
    });
    // Show the current scenario
    document.getElementById(`div:${scenario}`).style.display = 'block';
}