/**
 * This function shows a modal window with the title and message passed in argument and a destructive OK button
 */
function showIntroAlert() {
    $("#showIntroAlertModal").modal('show');
}

function closeAlert() {
    $("#showIntroAlertModal").modal('hide');
}

/**
 * This function prompts the user with the message and provides a share button and a restart button.
 * @param {string} message 
 */
function showGameOverPrompt(message) {
    document.getElementById("promptMessage").innerHTML  = message;

    $("#showGameOverPromptModal").modal({
        backdrop: 'static',
        keyboard: false
    });
}

function closePrompt() {
    $("#showGameOverPromptModal").modal('hide');
}


function isLowerCase(str) {
    return str == str.toLowerCase();
}


function openLinkInNewTab(lnk, toDownload = false) {
    let a       = document.createElement("a");
    document.body.appendChild(a);
    a.style     = "display: none";
    a.href      = lnk;
    if (toDownload) {
        a.download = lnk.substring(lnk.lastIndexOf('/') + 1);
    }
    else {
        a.target    = '_blank'
    }
    a.click();
    document.body.removeChild(a);
}