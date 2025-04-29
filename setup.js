
function onLoadPage() {
    // canvas styling
    canvas.width = 768;
    canvas.height = 768;

    // pixel perfect
    canvas.style.imageRendering = "pixelated";
    canvas.oncontextmenu = (e) => e.preventDefault();
    ctx.imageSmoothingEnabled = false; // Standard
    ctx.msImageSmoothingEnabled = false; // For IE and Edge
    ctx.webkitImageSmoothingEnabled = false; // For Safari and Chrome

    console.log("page load function complete");
}

function toggleRulebook() {
    /**@type {HTMLDialogElement} */
    let dialog = document.getElementById("rulebook");
    dialog.addEventListener('click', () => {
        dialog.close();
    })
    dialog.showModal();

}