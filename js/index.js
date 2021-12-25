var totalBalloons = 0;
var poppedBalloons = 0;
var failedToPop = 0;
var gameOver = false;

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
    failedToPop = 0;
    displayTotalBalloons();
    displayPoppedBalloons();
    document.getElementById("balloonBoard").innerHTML = "";
}

function removeBalloon(element) {
    element.remove();
    poppedBalloons++;
    displayPoppedBalloons();
}

function incrementFailedToPop(element) {
    if (document.getElementById(element.id)) {
        element.remove()
        failedToPop++;

        if (failedToPop == 20) {
            handleGameOver()
        }
    }
}

function handleGameOver() {
    gameOver = true;
    showPrompt("Game Over!", `Your Score is ${poppedBalloons}. Play Again?`, "Restart", "restartGame()");
}

function restartGame() {
    gameOver = false;
    resetGame();
    timeOut = 1000;
    addBalloons();
}


function addBalloons() {
    if (!gameOver) {
        let randomCoordinates = getRandomCoordinate();
        let balloon = document.createElement("div");
        balloon.className = "balloon";
        balloon.id = `bal${totalBalloons}`;
        balloon.style.left = randomCoordinates.x + "px";
        balloon.style.top = randomCoordinates.y + 50 + "px";
    
        balloon.onclick = (e) => {
            removeBalloon(e.target);
        }
    
        setTimeout(() => incrementFailedToPop(balloon), 5000);
    
        totalBalloons++;
        displayTotalBalloons();
        document.getElementById("balloonBoard").appendChild(balloon);
        if (!gameOver && (timeOut = timeOut >= 550 ? timeOut - 10 : timeOut)) {
            setTimeout(addBalloons, timeOut);
        }
    }
}


var timeOut = 1000;
setTimeout(addBalloons, timeOut);
