/**
 * This function shows a modal window with the title and message passed in argument and a destructive OK button
 * @param {string} title 
 * @param {string} message 
 */
 function showAlert(title, message) {
    document.getElementById("showAlertModalLabel").innerText    = title;
    document.getElementById("alertMessage").innerHTML           = message;

    $("#showAlertModal").modal('show');
}

function closeAlert() {
    $("#showAlertModal").modal('hide');

    document.getElementById("showAlertModalLabel").innerText    = "Alert";
    document.getElementById("alertMessage").innerHTML           = "Message";
}

/**
 * This function prompts the user with the title, message and provides a cancel button and a button with proceedButtonText.
 * This function also sets the action to be called by the proceed button
 * @param {string} title 
 * @param {string} message 
 * @param {string} proceedButtonText Text to be shown in the proceed button
 * @param {string} proceedButtonAction Action to be executed when the proceed button is pressed
 * @param {string} cancelButtonText Text to be shown in the cancel button
 */
function showPrompt(title, message, proceedButtonText, proceedButtonAction, cancelButtonText, cancelButtonAction) {
    document.getElementById("showPromptModalLabel").innerText   = title;
    document.getElementById("promptMessage").innerHTML          = message;
    document.getElementById("promptProceedButton").innerText    = proceedButtonText;
    document.getElementById("promptProceedButton").setAttribute('onclick', "closePrompt(); " + proceedButtonAction);
    if (cancelButtonText != undefined) document.getElementById("promptCancelButton").innerText    = cancelButtonText;
    if (cancelButtonAction != undefined) document.getElementById("promptCancelButton").setAttribute('onclick', "closePrompt(); " + cancelButtonAction)

    $("#showPromptModal").modal('show');
}

function closePrompt() {
    $("#showPromptModal").modal('hide');

    document.getElementById("showPromptModalLabel").innerText   = "Prompt";
    document.getElementById("promptMessage").innerText          = "Message";
    document.getElementById("promptProceedButton").innerText    = "Proceed";
    document.getElementById("promptCancelButton").innerText    = "Cancel";

    document.getElementById("promptCancelButton").setAttribute('onclick', "closePrompt(); ")
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