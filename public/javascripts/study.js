/*
Modo estudio: navegación entre tarjetas (pintar la tarjeta, girarla, anterior/siguiente y contador).
Es común a todos los modos de estudio. Lo único que cambia entre modos es qué se pinta en cada cara,
y eso lo decide la función renderFaces(card) que se pasa desde la vista, que devuelve:
    { front: texto de la parte delantera, back: HTML de la parte trasera }
También lleva el botón "Aprendida": cada tarjeta trae card.learned, y al pulsarlo se guarda en el
servidor (POST /japobulario/study/learned/:id) para el usuario de la sesión.
 */
function startStudy(flashcards, renderFaces) {
    let currentIndex = 0;
    const total = flashcards.length;
    if (total === 0) return;  //no hay tarjeta que pintar (la vista ya muestra un aviso)

    const front = document.getElementById('flashcard-front');
    const back = document.getElementById('flashcard-back');
    const counter = document.getElementById('counter');
    const flashcard = document.getElementById('flashcard');
    const learnedButton = document.getElementById('learned-button');
    const learnedError = document.getElementById('learned-error');

    //el botón dice si la tarjeta actual está aprendida (los textos vienen traducidos de la vista)
    function renderLearned() {
        const learned = flashcards[currentIndex].learned;
        learnedButton.textContent = learned ? learnedButton.dataset.labelOn : learnedButton.dataset.label;
        learnedButton.classList.toggle('is-learned', learned);
    }

    function renderCard(index) {
        const faces = renderFaces(flashcards[index]);
        front.textContent = faces.front;  //texto: la palabra o el kanji
        back.innerHTML = faces.back;      //HTML: significado, lectura, ejemplo...
        counter.textContent = `${index + 1} / ${total}`;
        learnedError.hidden = true;
        renderLearned();
        //asegurarse de que la carta está "frontal" al cambiar
        flashcard.classList.remove('is-flipped');
    }
    function toggleFlip() {
        flashcard.classList.toggle('is-flipped');
    }
    //pone o quita la marca de la tarjeta actual. Mientras se guarda, el botón no se puede pulsar otra vez
    async function toggleLearned() {
        const card = flashcards[currentIndex];
        const learned = !card.learned;
        learnedButton.disabled = true;
        learnedError.hidden = true;
        try {
            const response = await fetch(`/japobulario/study/learned/${card._id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learned }),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            card.learned = (await response.json()).learned;
        } catch (error) {
            console.error('No se ha podido guardar la marca de aprendida:', error);
            learnedError.hidden = false;
        }
        learnedButton.disabled = false;
        //si mientras tanto se ha cambiado de tarjeta, el botón ya es de otra: no se toca
        if (flashcards[currentIndex] === card) renderLearned();
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
    window.toggleLearned = toggleLearned;

    // Render inicial
    renderCard(currentIndex);
}
