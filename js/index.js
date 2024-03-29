// Initialization:- Check Mobile device or not
function mobileAndTabletCheck() {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
};

const CURRENTURL  = new URL(window.location.href);
const DEVICETYPE  = CURRENTURL.searchParams.get("device");

const ISTOUCHDEVICE = DEVICETYPE == 'android' ? true : mobileAndTabletCheck();
const MAX_TIMEOUT = 1000;
const MIN_TIMEOUT = ISTOUCHDEVICE ? 200 : 500;

const DECREMENT_INDEX = 40;

var totalBalloons = 0;
var poppedBalloons = 0;
var failedToPop = 0;
var highestPoppedBalloons = 0;
var gameOver = false;

showIntroAlert();

if (getCookie("firstVisit") != "no") {
    setCookie("firstVisit", "no", 3650);
    setCookie("highestPoppedBalloons", 0, 3650);
}
else {
    highestPoppedBalloons = parseInt(getCookie("highestPoppedBalloons"), 10);
    displayHighestPoppedBalloons();
}

$("#showIntroAlertModal").on('hide.bs.modal', function () {
    setTimeout(addBalloons, MAX_TIMEOUT);
});

function displayTotalBalloons() {
    document.getElementById("totalBalloons").innerHTML = totalBalloons;
}
function displayPoppedBalloons() {
    document.getElementById("poppedBalloons").innerHTML = poppedBalloons;
    document.title = `Balloon Pop (Score: ${poppedBalloons})`;
}
function displayFailedToPopBalloons() {
    document.getElementById("missedBalloons").innerHTML = failedToPop;
}
function displayHighestPoppedBalloons() {
    document.getElementById("highestPoppedBalloons").innerHTML = highestPoppedBalloons;
}

function getRandomCoordinate() {
    let randomX = Math.random() * (innerWidth - 200);
    let randomY = Math.random() * (innerHeight - 300);

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
    displayFailedToPopBalloons();
    document.getElementById("balloonBoard").innerHTML = "";
}

function removeBalloon(element) {
    element.remove();
    poppedBalloons++;
    displayPoppedBalloons();
    if (poppedBalloons > highestPoppedBalloons) {
        highestPoppedBalloons = poppedBalloons;
        setCookie("highestPoppedBalloons", highestPoppedBalloons, 3650);
        displayHighestPoppedBalloons();
    }
}

function incrementFailedToPop(element) {
    if (document.getElementById(element.id)) {
        element.remove()
        failedToPop++;
        displayFailedToPopBalloons();

        if (failedToPop == 20) {
            handleGameOver()
        }
    }
}

function handleGameOver() {
    gameOver = true;
    if (!navigator.share) {
        document.getElementById("shareScoreButton").hidden = true;
    }
    if (DEVICETYPE == 'android') {
        document.getElementById("shareScoreButton").hidden = false;
    }
    showGameOverPrompt(`Your Score is ${poppedBalloons}. Play Again?`);
}

function restartGame() {
    gameOver = false;
    resetGame();
    timeOut = MAX_TIMEOUT;
    addBalloons();
}


function addBalloons() {
    if (!gameOver) {
        let randomCoordinates = getRandomCoordinate();
        let balloon = document.createElement("div");
        balloon.className = "balloon";
        balloon.id = `bal${totalBalloons}`;
        balloon.style.left = randomCoordinates.x + 100 + "px";
        balloon.style.top = randomCoordinates.y + 100 + "px";

        if (ISTOUCHDEVICE) {
            balloon.ontouchstart = (e) => {
                removeBalloon(e.target);
            }
        }
        else {
            balloon.onmousedown = (e) => {
                removeBalloon(e.target);
            }
        }

        setTimeout(() => incrementFailedToPop(balloon), 5000);

        totalBalloons++;
        displayTotalBalloons();
        document.getElementById("balloonBoard").appendChild(balloon);
        if (!gameOver && (timeOut = timeOut >= MIN_TIMEOUT ? timeOut - parseInt(timeOut/DECREMENT_INDEX, 10) : timeOut)) {
            setTimeout(addBalloons, timeOut);
        }
    }
}


var timeOut = MAX_TIMEOUT;


function shareScore() {
    var shareData = {
        title: document.title,
        text: `I scored ${poppedBalloons} on Balloon Pop. Can you beat it?`,
        url: 'https://balloonpop.xyz/'
    }
    if (DEVICETYPE == 'android')
        AndroidShareHandler.nativeShare(shareData.title, shareData.text, shareData.url);
    else
        navigator.share(shareData);
}

function shareScoreOnTwitter() {
    var shareData = {
        title: document.title,
        text: `I scored ${poppedBalloons} on Balloon Pop. Can you beat it?`,
        url: 'https://balloonpop.xyz/'
    }

    var twitterShareUrl = `https://twitter.com/intent/tweet?hashtags=ballonPop&text=${shareData.text}&url=${shareData.url}`;
    
    if (DEVICETYPE == 'android')
        AndroidShareHandler.nativeTwitterShare(twitterShareUrl);
    else if (ISTOUCHDEVICE) {
        var phantomAnchor = document.createElement("a");
        phantomAnchor.setAttribute('href', twitterShareUrl);
        phantomAnchor.click();
    }
    else
        window.open(twitterShareUrl, '_blank').focus();
}

if (DEVICETYPE == 'android') {
    var anchorElements = document.getElementsByTagName('a');
    for(var i = 0; i < anchorElements.length; i++){
        anchorElements[i].onclick = function(event){ 
            event.preventDefault();
            AndroidShareHandler.nativeOpenBrowserLink(event.currentTarget.getAttribute('href'))
        } 
    }
}

// Registering views on db.
fetch(`https://homeip.harshankur.com/registerView?appId=balloonpop&deviceSize=${window.outerWidth > 960 && window.outerHeight > 960 ? "large" : window.outerWidth > 540 && window.outerHeight > 540 ? "medium" : "small"}`)
.then(data => data.json())
.then(response => console.log(`RESPONSE FROM VIEWCOUNTER => ${JSON.stringify(response)}`));