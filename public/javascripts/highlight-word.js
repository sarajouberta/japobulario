/*
Busca la palabra de la tarjeta dentro de su frase de ejemplo para poder marcarla en negrita.
En la frase la palabra suele aparecer conjugada o con otra escritura, así que se prueban varias formas:
la palabra y su lectura, sin 〈する〉 / （な） / 〜, con y sin la parte opcional entre corchetes ([お]ゆ),
separando alternativas (・ /) y recortando el final para las formas conjugadas (答える -> 答えます).
 */
(function () {
    const JAPANESE = /[\u3040-\u30ff\u4e00-\u9fff]/;
    const HIRAGANA = /[\u3041-\u3096]/;
    const KANJI = /[\u4e00-\u9fff]/;
    const PARTICLE_END = /[がをにへとはの]$/;  //sin で ni も: también son terminaciones de verbo (すんで, ひいても)

    //formas de la palabra que se buscan en la frase, de más larga a más corta
    function candidates(card) {
        const out = [];
        for (const src of [card.word, card.reading]) {
            if (!src) continue;
            //〜ご, 〜で...: sufijos y partículas, que van pegados a otra palabra
            const suffix = /^[〜~]/.test(src.replace(/^[（(［\[][^）)］\]]*[）)］\]]/, ''));
            const base = src.replace(/〈[^〉]*〉|（[^）]*）|\([^)]*\)/g, '').replace(/[〜~]/g, '');
            //con la parte opcional entre corchetes ([お]ゆ -> おゆ) y sin ella (-> ゆ):
            const variants = [base.replace(/[［\[\]］]/g, ''), base.replace(/［[^］]*］|\[[^\]]*\]/g, '')];
            for (const variant of variants) {
                for (const alt of variant.split(/[・／/]/)) {
                    const w = alt.trim();
                    //verbos con する: する -> します, しません, させる...
                    if (w.endsWith('する')) {
                        for (const stem of ['し', 'さ', 'せ']) out.push({ text: w.slice(0, -2) + stem, trimmed: true, suffix });
                    }
                    for (let n = w.length; n >= 1; n--) {
                        out.push({ text: w.slice(0, n), trimmed: n < w.length, suffix });
                    }
                }
            }
        }
        return out.sort((a, b) => b.text.length - a.text.length);
    }

    //devuelve [inicio, fin] de la palabra dentro de la frase, o null si no se encuentra
    function findWord(card, sentence) {
        for (const c of candidates(card)) {
            if (!c.text) continue;
            const oneKana = c.text.length === 1 && !KANJI.test(c.text);
            let i = sentence.indexOf(c.text);
            while (i !== -1) {
                const wordStart = i === 0 || !JAPANESE.test(sentence[i - 1]);
                //un solo kana solo vale al principio de una palabra (así no se marcan partículas sueltas)
                if (!oneKana || wordStart || c.suffix) {
                    let end = i + c.text.length;
                    //forma conjugada: se incluye el kana que sigue (行 -> 行きます)
                    if (c.trimmed) while (end < sentence.length && HIRAGANA.test(sentence[end])) end++;
                    //con un solo kana recortado (いる -> い), si lo encontrado acaba en partícula es otra
                    //palabra (いぬが), no el verbo conjugado (います): se sigue buscando
                    const otherWord = oneKana && c.trimmed && PARTICLE_END.test(sentence.slice(i, end));
                    if (!otherWord) return [i, end];
                }
                i = sentence.indexOf(c.text, i + 1);
            }
        }
        return null;
    }

    //frase con la palabra de la tarjeta en negrita (si no se encuentra, la frase tal cual)
    function highlightWord(card, sentence) {
        const found = findWord(card, sentence);
        if (!found) return sentence;
        const [start, end] = found;
        return sentence.slice(0, start) + '<strong>' + sentence.slice(start, end) + '</strong>' + sentence.slice(end);
    }

    //en el navegador queda disponible como window.highlightWord; en node se puede importar para probarlo
    if (typeof module !== 'undefined') module.exports = { findWord, highlightWord };
    else window.highlightWord = highlightWord;
})();
