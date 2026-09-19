/*
Modo estudio: navegación entre tarjetas (pintar la tarjeta, girarla, anterior/siguiente y contador).
Es común a todos los modos de estudio. Lo único que cambia entre modos es qué se pinta en cada cara,
y eso lo decide la función renderFaces(card) que se pasa desde la vista, que devuelve:
    { front: texto de la parte delantera, back: HTML de la parte trasera }
 */
function startStudy(flashcards, renderFaces) {
    let currentIndex = 0;
    const total = flashcards.length;
    if (total === 0) return;  //no hay tarjeta que pintar (la vista ya muestra un aviso)

    const front = document.getElementById('flashcard-front');
    const back = document.getElementById('flashcard-back');
    const counter = document.getElementById('counter');
    const flashcard = document.getElementById('flashcard');

    function renderCard(index) {
        const faces = renderFaces(flashcards[index]);
        front.textContent = faces.front;  //texto: la palabra o el kanji
        back.innerHTML = faces.back;      //HTML: significado, lectura, ejemplo...
        counter.textContent = `${index + 1} / ${total}`;
        //asegurarse de que la carta está "frontal" al cambiar
        flashcard.classList.remove('is-flipped');
    }
    function toggleFlip() {
        flashcard.classList.toggle('is-flipped');
    }
    function nextCard() {
        if (currentIndex < total - 1) {
            currentIndex++;
            renderCard(currentIndex);
        }
    }
    function prevCard() {
        if (currentIndex > 0) {
            currentIndex--;
            renderCard(currentIndex);
        }
    }

    // Exponer funciones globalmente porque los botones las llaman con onclick
    window.nextCard = nextCard;
    window.prevCard = prevCard;
    window.toggleFlip = toggleFlip;

    // Render inicial
    renderCard(currentIndex);
}
