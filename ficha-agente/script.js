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