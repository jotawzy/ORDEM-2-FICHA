document.addEventListener('DOMContentLoaded', () => {
    const classeDropdown = document.getElementById('classe-dropdown');
    if (classeDropdown) {
        classeDropdown.addEventListener('change', function() {
            document.body.classList.remove('vigilante', 'analista', 'executor');
            this.classList.remove('bg-verde', 'bg-azul', 'bg-vermelho');

            if (this.value === 'vigilante') {
                document.body.classList.add('vigilante');
                this.classList.add('bg-verde');
            } else if (this.value === 'analista') {
                document.body.classList.add('analista');
                this.classList.add('bg-azul');
            } else if (this.value === 'executor') {
                document.body.classList.add('executor');
                this.classList.add('bg-vermelho');
            }
        });
    }

    function renderizarQuadradinhos(containerId, valor) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        let total = parseInt(valor);
        if (isNaN(total) || total <= 0) total = 0;

        for (let i = 0; i < total; i++) {
            const cb = document.createElement('div');
            cb.className = 'cb';
            cb.addEventListener('click', function() {
                this.classList.toggle('active');
            });
            container.appendChild(cb);
        }
    }

    const valPv = document.getElementById('val-pv');
    const valPd = document.getElementById('val-pd');

    if (valPv) renderizarQuadradinhos('grid-pv', valPv.innerText);
    if (valPd) renderizarQuadradinhos('grid-pd', valPd.innerText);

    if (valPv) {
        valPv.addEventListener('input', (e) => {
            renderizarQuadradinhos('grid-pv', e.target.innerText);
        });
    }

    if (valPd) {
        valPd.addEventListener('input', (e) => {
            renderizarQuadradinhos('grid-pd', e.target.innerText);
        });
    }
    
    [valPv, valPd].forEach(el => {
        if (el) {
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    el.blur();
                }
            });
        }
    });

    const periSelect = document.querySelector('.peri-subselect');
    if (periSelect) {
        ajustarLarguraSelect(periSelect);
        periSelect.addEventListener('change', () => ajustarLarguraSelect(periSelect));
    }

    const nivelSelect = document.querySelector('.caixa-nivel');
    if (nivelSelect) {
        ajustarLarguraSelect(nivelSelect);
        nivelSelect.addEventListener('change', () => ajustarLarguraSelect(nivelSelect));
    }

    const charName = document.querySelector('.char-name');
    const maxChars = 14;

    if (charName) {
        charName.addEventListener('input', () => {
            if (charName.textContent.length > maxChars) {
                charName.textContent = charName.textContent.substring(0, maxChars);
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(charName);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
    }

    const selectsAtributosPericia = document.querySelectorAll('.peri-attr-select');
    selectsAtributosPericia.forEach(select => {
        const linha = select.closest('.peri-linha');

        select.addEventListener('change', () => {
            atualizarDadoPericiaPorAtributo(linha);
        });
    });

    const observerAtributos = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            const target = mutation.target;
            if (target.closest('.attr-fisico')) {
                atualizarPericiasDoAtributo('fisico');
            } else if (target.closest('.attr-mente')) {
                atualizarPericiasDoAtributo('mente');
            } else if (target.closest('.attr-emocao')) {
                atualizarPericiasDoAtributo('emocao');
            }
        });
    });

    document.querySelectorAll('.attr-fisico .attr-dado, .attr-mente .attr-dado, .attr-emocao .attr-dado').forEach(el => {
        observerAtributos.observe(el, { characterData: true, childList: true, subtree: true, attributes: true });
    });
});

function ajustarLarguraSelect(el) {
    if (!el) return;
    const span = document.createElement('span');
    span.style.visibility = 'hidden';
    span.style.position = 'absolute';
    span.style.whiteSpace = 'nowrap';
    span.style.font = window.getComputedStyle(el).font;
    span.textContent = el.options[el.selectedIndex].text;
    document.body.appendChild(span);
    
    el.style.width = (span.offsetWidth + 8) + 'px';
    document.body.removeChild(span);
}

function obterValorAtributo(tipoAttr) {
    let seletorAttr = '';
    if (tipoAttr.includes('fisico')) seletorAttr = '.attr-fisico .attr-dado';
    else if (tipoAttr.includes('mente')) seletorAttr = '.attr-mente .attr-dado';
    else if (tipoAttr.includes('emocao')) seletorAttr = '.attr-emocao .attr-dado';
    
    const elDadoAttr = document.querySelector(seletorAttr);
    if (elDadoAttr) {
        return {
            faces: elDadoAttr.textContent.trim(),
            classeDado: Array.from(elDadoAttr.classList).find(c => c.startsWith('d') && c !== 'dado-shape') || 'd6'
        };
    }
    return { faces: '6', classeDado: 'd6' };
}

function atualizarDadoPericiaPorAtributo(periLinha) {
    const selectAttr = periLinha.querySelector('.peri-attr-select');
    const segundoDadoBtn = periLinha.querySelector('.dado-2');
    
    if (!selectAttr || !segundoDadoBtn) return;

    let attrEscolhido = selectAttr.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const infoAtributo = obterValorAtributo(attrEscolhido);

    segundoDadoBtn.className = Array.from(segundoDadoBtn.classList)
        .filter(c => !c.startsWith('d') || c === 'dado-shape' || c === 'dado-2')
        .join(' ');

    segundoDadoBtn.classList.add(infoAtributo.classeDado);
    segundoDadoBtn.textContent = infoAtributo.faces;
    segundoDadoBtn.setAttribute('data-val', infoAtributo.faces);
}

function atualizarPericiasDoAtributo(tipoAttr) {
    const selectsAtributosPericia = document.querySelectorAll('.peri-attr-select');
    selectsAtributosPericia.forEach(select => {
        let val = select.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (val.includes(tipoAttr)) {
            atualizarDadoPericiaPorAtributo(select.closest('.peri-linha'));
        }
    });
}

const descricoesPericias = {
    "ACROBACIA": "Movimentos de ginástica e parkour, andar de skate ou patins. <em>Físico</em>",
    "ANIMAIS": "Manejar animais, acalmar feras agressivas, cavalgar. <em>Emoção</em>",
    "APTIDÃO": `Conhecimento em um campo específico (veja a seguir). <em>Mente</em><br><br>• <strong>ARTES.</strong> Formas de arte, como música, dança, escrita, pintura, atuação e outras.<br>• <strong>ERUDIÇÃO.</strong> Conhecimento formal, como aritmética, geometria e astronomia — é a aptidão que um estudioso teria. Um personagem com d6 ou mais nesta Aptidão é alfabetizado. Caso contrário, é analfabeto.<br>• <strong>FOLCLORE.</strong> Costumes, tradições e lendas populares, ciclos da vida.<br>• <strong>GUERRA.</strong> Educação militar e estratégica.<br>• <strong>NOBREZA.</strong> Etiqueta, leis, heráldica, linhagens.<br>• <strong>RELIGIÃO.</strong> Deuses, mitos, profecias, cerimônias.`,
    "ATLETISMO": "Correr, saltar, escalar, nadar, remar. <em>Físico</em>",
    "CRIME": "Furtar objetos, abrir fechaduras, falsificar documentos. <em>Físico</em>",
    "DISCIPLINA": "Estudar, meditar, resistir a traumas e sustos. <em>Emoção</em>",
    "ENGANAÇÃO": "Mentir, disfarçar-se, seduzir. <em>Emoção</em>",
    "FURTIVIDADE": "Esconder-se, andar sem ser visto ou ouvido. <em>Físico</em>",
    "INTIMIDAR": "Assustar pessoas, coagi-las a fazerem o que você quer. <em>Emoção</em>",
    "INTUIÇÃO": "\"Sexto sentido\" para analisar pessoas e ambientes. <em>Emoção</em>",
    "INSPECIONAR": "Pesquisar documentos e bancos de dados, analisar evidências. <em>Mente</em>",
    "LUTA": "Atacar desarmado ou com armas corpo a corpo. <em>Físico</em>",
    "MEDICINA": "Primeiros socorros, tratamentos. <em>Mente</em>",
    "OFICIO": "Fabricar e consertar itens. <em>Mente</em>",
    "OCULTISMO": "Conhecimento sobre o paranormal. <em>Mente</em>",
    "PERCEPÇÃO": "Notar coisas através de visão, audição e olfato, revistar lugares. <em>Mente</em>",
    "PERSUASÃO": "Convencer pessoas com argumentos e lábia. <em>Emoção</em>",
    "PONTARIA": "Atirar com armas de arremesso ou de disparo. <em>Físico</em>",
    "SOBREVIVÊNCIA": "Montar acampamento, rastrear, acalmar animais ferozes. <em>Mente</em>",
    "VIGOR": "Manter o fôlego, resistir a venenos, suportar ferimentos. <em>Físico</em>"
};

const modal = document.getElementById('modal-pericia');
const modalTitulo = document.getElementById('modal-pericia-titulo');
const modalDesc = document.getElementById('modal-pericia-desc');
const modalFechar = document.getElementById('modal-pericia-fechar');

document.querySelectorAll('.peri-linha').forEach(linha => {
    const spanNome = linha.querySelector('.peri-nome');
    if (spanNome) {
        spanNome.style.cursor = 'default';
        
        spanNome.addEventListener('click', (e) => {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;

            let nomePericia = spanNome.textContent.replace(':', '').trim().toUpperCase();
            // Remove quebras de linha caso venham do HTML estruturado
            nomePericia = nomePericia.split('\n')[0].trim();

            if (modalTitulo) modalTitulo.textContent = nomePericia;
            if (modalDesc) modalDesc.innerHTML = descricoesPericias[nomePericia] || "Descrição indisponível.";
            if (modal) modal.classList.add('ativo');
        });
    }
});

if (modalFechar) {
    modalFechar.addEventListener('click', () => {
        modal.classList.remove('ativo');
    });
}

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('ativo');
    }
});