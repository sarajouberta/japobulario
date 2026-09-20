/*
Convierte la notación {漢字|かな} de los libros en <ruby>, para poner la lectura encima de la palabra.
La lectura se pone solo encima de los kanji: los grupos que no llevan ninguno (números como {1998|...}
o siglas como {CD|シーディー}) se escriben tal cual, sin nada encima.
También puede marcar en negrita un trozo del texto (la palabra de la tarjeta dentro de su ejemplo),
indicado con las posiciones [inicio, fin] del texto sin furigana.
 */
(function () {
    const KANJI = /[一-鿿々]/;
    const GROUP = /\{([^|{}]*)\|([^|{}]*)\}/g;

    //parte el texto en trozos: {texto, lectura} para los grupos con furigana y {texto, null} para el resto
    function parse(text) {
        const parts = [];
        let last = 0;
        for (const m of text.matchAll(GROUP)) {
            if (m.index > last) parts.push({ text: text.slice(last, m.index), reading: null });
            parts.push({ text: m[1], reading: m[2] });
            last = m.index + m[0].length;
        }
        if (last < text.length) parts.push({ text: text.slice(last), reading: null });
        return parts;
    }

    //el texto tal cual se lee, sin las marcas de furigana ({食|た}べる -> 食べる)
    function furiganaPlain(text) {
        return parse(text).map(p => p.text).join('');
    }

    //HTML con la lectura encima de los kanji. range (opcional) es [inicio, fin] sobre el texto sin
    //furigana: ese trozo va en negrita
    function furiganaHtml(text, range) {
        const [start, end] = range || [-1, -1];
        let html = '';
        let pos = 0;  //posición del trozo dentro del texto sin furigana
        for (const part of parse(text)) {
            const from = pos;
            const to = pos + part.text.length;
            pos = to;
            const bold = start < to && end > from;  //la negrita toca este trozo
            if (part.reading && KANJI.test(part.text)) {
                //un ruby no se puede partir por la mitad: si la negrita lo toca, va entero
                const ruby = `<ruby>${part.text}<rt>${part.reading}</rt></ruby>`;
                html += bold ? `<strong>${ruby}</strong>` : ruby;
            } else if (!bold) {
                html += part.text;
            } else {
                //texto normal: se corta justo donde empieza y donde acaba la negrita
                const a = Math.max(start, from) - from;
                const b = Math.min(end, to) - from;
                html += part.text.slice(0, a) + '<strong>' + part.text.slice(a, b) + '</strong>' + part.text.slice(b);
            }
        }
        return html.replace(/<\/strong><strong>/g, '');  //trozos seguidos en negrita: una sola marca
    }

    //frase de ejemplo lista para la tarjeta: con furigana y con la palabra de la tarjeta en negrita.
    //Las tarjetas propias no tienen furigana, así que se marca la palabra sobre la frase normal
    function exampleHtml(card, example) {
        if (!example.jaFurigana) return highlightWord(card, example.ja);
        return furiganaHtml(example.jaFurigana, findWord(card, furiganaPlain(example.jaFurigana)));
    }

    //findWord() y highlightWord() están en highlight-word.js, que se carga antes
    const { findWord, highlightWord } = (typeof module !== 'undefined') ? require('./highlight-word') : window;

    //en el navegador quedan disponibles como window.furiganaHtml...; en node se pueden importar para probarlos
    if (typeof module !== 'undefined') module.exports = { furiganaPlain, furiganaHtml, exampleHtml };
    else Object.assign(window, { furiganaPlain, furiganaHtml, exampleHtml });
})();
