const teamMap = {
    blue: {
        name: "blue",
        points: 0,
        colorAsHex: "#3498DB"
    },
    red: {
        name: "red",
        points: 0,
        colorAsHex: "#E74C3C"
    }
}

const marqueeLetters = Array.from(document.querySelectorAll('.marquee__letter'));
const teams = {};

Object.values(teamMap).forEach((team) => {
    teams[team.name] = document.querySelector(`.points__team--${team.name}`);
});
console.log("💡 ~ teams:", teams)

let messagesConnectionErrors = 0;
let winner = null;

async function animate(team) {
    const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    const shoot = (angle, scalar) => {
        confetti({
            particleCount: random(5, 10),
            angle: random(angle - 5, angle + 5),
            spread: random(35, 55),
            startVelocity: random(35, 55),
            colors: ['#FFFFFF', team.colorAsHex, team.colorAsHex],
            scalar,
        });
    };

    for (let index = 0; index < 9; index++) {
        setTimeout(shoot, random(0, 200), index * 22.5, random(28, 32) / 10);
        setTimeout(shoot, random(100, 300), index * 22.5, random(18, 22) / 10);
    }

    document.documentElement.classList.add('goal', `goal--${team.name}`);

    if (team.points === 21) {
        document.documentElement.classList.add('win', `win--${team.name}`);
    }

    setTimeout(() => {
        teams[team.name].textContent = team.points;
    }, 150);

    await new Promise((resolve) => {
        marqueeLetters.at(-1).addEventListener('animationend', resolve);
    });
    document.documentElement.classList.remove('goal', `goal--${team.name}`);
}

function update(team) {
    const incremented = teamMap[team.name].points < team.points;
    teamMap[team.name].points = team.points;

    if (incremented && winner !== null) {
        return;
    } else if (document.documentElement.classList.contains('win')) {
        winner = null;
        document.documentElement.classList.remove('win', 'win--blue', 'win--red');
    }

    if (incremented) {
        if (team.points === 21) {
            winner = team;
        }

        animate(teamMap[team.name]);
    } else {
        teams[team.name].textContent = team.points;
    }
}

function setupMessages() {
    console.debug('setupMessages');
    const messages = new EventTarget();

    const error = (event) => {
        console.error('event-stream', event);
        ++messagesConnectionErrors;

        messages.removeEventListener('error', error);
        messages.removeEventListener('team', team);
        messages.close();

        setTimeout(() => setupMessages(), messagesConnectionErrors * 3000);
    };

    const open = (event) => {
        console.debug('event-stream', event);
        messagesConnectionErrors = 0;
    };

    const team = (event) => {
        console.debug('event-stream', event);
        update(JSON.parse(event.data));
    };

    messages.addEventListener('error', error);
    messages.addEventListener('open', open);
    messages.addEventListener('team', team);

    return messages;
}

const messages = setupMessages();

async function tools(action, name) {
    console.debug('tool', action, name);

    if (action === 'score') {
        const points = teamMap[name].points + 1;

        messages.dispatchEvent(
            new MessageEvent('team', {
                data: JSON.stringify({
                    name,
                    points,
                }),
            })
        );

        await new Promise((resolve) => {
            marqueeLetters.at(-1).addEventListener('animationend', resolve);
        });

        return;
    }

    if (action === 'reduce') {
        const points = teamMap[name].points - 1;
        messages.dispatchEvent(
            new MessageEvent('team', {
                data: JSON.stringify({
                    name,
                    points,
                }),
            })
        );

        await new Promise((resolve) => {
            marqueeLetters.at(-1).addEventListener('animationend', resolve);
        });

        return;
    }

    if (action === 'win') {
        document.documentElement.classList.toggle('win');
        document.documentElement.classList.toggle(`win--${name}`);

        await new Promise((resolve) => {
            setTimeout(resolve, 200);
        });

        return;
    }

    console.error(`unknown tool action: ${action}`);
}

const toolsEnable = () => {
    document.getElementById('tool-score-blue').disabled = false;
    document.getElementById('tool-win-blue').disabled = false;
    document.getElementById('tool-score-red').disabled = false;
    document.getElementById('tool-win-red').disabled = false;
};

document.getElementById('tool-score-blue').addEventListener('click', () => tools('score', 'blue'));
document.getElementById('tool-reduce-blue').addEventListener('click', () => tools('reduce', 'blue'));
document.getElementById('tool-win-blue').addEventListener('click', () => tools('win', 'blue'));
document.getElementById('tool-score-red').addEventListener('click', () => tools('score', 'red'));
document.getElementById('tool-reduce-red').addEventListener('click', () => tools('reduce', 'red'));
document.getElementById('tool-win-red').addEventListener('click', () => tools('win', 'red'));

toolsEnable();


if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.continuous = true;

    recognition.onresult = function (event) {
        console.log("1")
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.trim().toLowerCase();
        console.log("💡 ~ command:", command)
        if (command.includes('increase blue')) {
            tools('score', 'blue')
        }
        if (command.includes('increase red')) {
            tools('score', 'red')
        }
        if (command.includes('decrease blue')) {
            tools('reduce', 'blue')
        }
        if (command.includes('decrease red')) {
            tools('reduce', 'red')
        }
    };

    recognition.onend = function () {
        console.log("ended")
        recognition.start(); // Restart recognition when it ends
    };


    recognition.onerror = function (event) {
        console.error('Speech recognition error:', event.error);
    };

    // document.querySelector('body').addEventListener('click', function () {
    // });
    recognition.start();
} else {
    console.error('Speech recognition not supported in this browser.');
}