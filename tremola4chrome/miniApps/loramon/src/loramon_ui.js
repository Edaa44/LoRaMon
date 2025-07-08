var LoramonScenario = null;

function setLoramonScenario(s) {
    console.log("Switching to scenario:", s);
    // Hide all loramon-* divs
    document.querySelectorAll('[id^="div:loramon-"]').forEach(div => {
        div.style.display = 'none';
    });
    // Show the target scenario
    const target = document.getElementById(`div:${s}`);
    if (target) target.style.display = 'block';
    else console.error("Scenario div not found:", s);

    LoramonScenario = s;

    // Update titles
    if (s === 'loramon-list') {
        document.getElementById("conversationTitle").innerHTML = 
            "<strong>LoRàMon Battles</strong><br>Challenge a friend!";
    } else if (s === 'loramon_battle') {
        const opponent = tremola.loramon.active[tremola.loramon.current].peer;
        document.getElementById("conversationTitle").innerHTML = 
            `<strong>Battling ${fid2display(opponent)}</strong>`;
    }
}
