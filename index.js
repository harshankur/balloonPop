var totalBalloons = 0;
var poppedBalloons = 0;

function displayTotalBalloons() {
    document.getElementById("totalBalloons").innerHTML = totalBalloons;
}
function displayPoppedBalloons() {
    document.getElementById("poppedBalloons").innerHTML = poppedBalloons;
}

function getRandomCoordinate() {
    let randomX = Math.random()*(innerWidth-50);
    let randomY = Math.random()*(innerHeight-100);

    return {
        x: randomX,
        y: randomY
    };
}

function resetGame() {
    totalBalloons = 0;
    poppedBalloons = 0;
    displayTotalBalloons();
    displayPoppedBalloons();
    document.getElementById("balloonBoard").innerHTML = "";
}

function removeBalloon(element) {
    element.remove();
    poppedBalloons++;
    displayPoppedBalloons();
}


function addBalloons() {
    let randonCoordinates = getRandomCoordinate();
    let balloon = document.createElement("div");
    balloon.className = "balloon";
    balloon.style.left = randonCoordinates.x + "px";
    balloon.style.top = randonCoordinates.y + 50 + "px";

    balloon.onclick = (e) => {
        removeBalloon(e.target);
    }

    totalBalloons++;
    displayTotalBalloons();
    document.getElementById("balloonBoard").appendChild(balloon);
    if (timeOut = timeOut >= 100 ? timeOut - 10 : timeOut) {
        if (totalBalloons - poppedBalloons < 20) {
            setTimeout(addBalloons, timeOut);
        }
        else {
            if (confirm(`Game Over! Your Score is ${poppedBalloons}. Play Again?`)) {
                resetGame();
                timeOut = 1000;
                setTimeout(addBalloons, timeOut);
            }
        }
    }
}


var timeOut = 1000;
setTimeout(addBalloons, timeOut);
