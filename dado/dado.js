function executarQuandoCarregar(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
}

executarQuandoCarregar(() => {
    inicializarAtributos();
    inicializarPericias();
});

function obterContainerNotificacao() {
    let container = document.getElementById('toast-container-dados');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container-dados';
        container.style.cssText = "position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 99999;";
        document.body.appendChild(container);
    }
    return container;
}

function extrairFaces(dadoBtn) {
    let maxFaces = 6;
    if (!dadoBtn) return maxFaces;
    
    for (let cls of dadoBtn.classList) {
        if (cls.startsWith('d') && cls.length > 1) {
            const faces = parseInt(cls.substring(1));
            if (!isNaN(faces)) {
                maxFaces = faces;
                break;
            }
        }
    }
    if (!maxFaces || isNaN(maxFaces)) {
        maxFaces = parseInt(dadoBtn.textContent) || 6;
    }
    return maxFaces;
}

function mostrarNotificacao({ titulo, detalheTexto, resultadoTexto, dadoElemento }) {
    const container = obterContainerNotificacao();

    const toast = document.createElement('div');
    toast.className = 'toast-dado';

    const detalheHTML = detalheTexto ? `<span class="toast-detalhe">${detalheTexto}</span>` : '';

    toast.innerHTML = `
        <div class="toast-info">
            <span class="toast-titulo">${titulo}</span>
            ${detalheHTML}
        </div>
        <span class="toast-resultado">${resultadoTexto}</span>
        <button class="toast-fechar" onclick="this.parentElement.remove()">&times;</button>
    `;

    const dadoClone = dadoElemento.cloneNode(true);
    dadoClone.classList.remove('attr-dado', 'peri-dado-1', 'peri-dado-2', 'hovered');
    dadoClone.textContent = '';
    toast.prepend(dadoClone);

    const dadoClasse = Array.from(dadoClone.classList).join(' ');

    container.appendChild(toast);

    // Envia os dados para o histórico com o timestamp exato do momento do clique
    if (typeof window.adicionarRolagemHistorico === 'function') {
        window.adicionarRolagemHistorico({
            titulo,
            detalheTexto,
            resultadoTexto,
            dadoClasse,
            timestamp: Date.now()
        });
    }

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }
    }, 8000);
}

function inicializarAtributos() {
    const attrBoxes = document.querySelectorAll('.attr-box');
    attrBoxes.forEach(box => {
        const nomeEl = box.querySelector('.attr-nome');
        const dadoBtn = box.querySelector('.attr-dado');
        
        if (nomeEl && dadoBtn) {
            dadoBtn.addEventListener('click', () => {
                const titulo = nomeEl.textContent.trim();
                const faces = extrairFaces(dadoBtn);
                const resultado = Math.floor(Math.random() * faces) + 1;

                mostrarNotificacao({
                    titulo: titulo,
                    detalheTexto: null,
                    resultadoTexto: resultado,
                    dadoElemento: dadoBtn
                });
            });
        }
    });
}

function inicializarPericias() {
    const periLinhas = document.querySelectorAll('.peri-linha');
    
    periLinhas.forEach(linha => {
        const nomeEl = linha.querySelector('.peri-nome');
        const dado1 = linha.querySelector('.peri-dado-1');
        const dado2 = linha.querySelector('.peri-dado-2');
        
        if (nomeEl && dado1 && dado2) {

            [dado1, dado2].forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    dado1.classList.add('hovered');
                    dado2.classList.add('hovered');
                });
                btn.addEventListener('mouseleave', () => {
                    dado1.classList.remove('hovered');
                    dado2.classList.remove('hovered');
                });
            });

            const rolarPericia = () => {
                let titulo = "";
                
                const selectSub = linha.querySelector('.peri-subselect');
                if (selectSub) {
                    titulo = selectSub.options[selectSub.selectedIndex].text;
                } else {
                    if (nomeEl.childNodes[0] && nomeEl.childNodes[0].nodeValue) {
                        titulo = nomeEl.childNodes[0].nodeValue.trim();
                    } else {
                        titulo = nomeEl.textContent.trim();
                    }
                }

                const faces1 = extrairFaces(dado1);
                const faces2 = extrairFaces(dado2);
                
                const val1 = Math.floor(Math.random() * faces1) + 1;
                const val2 = Math.floor(Math.random() * faces2) + 1;
                const soma = val1 + val2;

                const dadoMaior = faces1 >= faces2 ? dado1 : dado2;

                mostrarNotificacao({
                    titulo: titulo,
                    detalheTexto: `[ ${val1} + ${val2} ]`,
                    resultadoTexto: soma,
                    dadoElemento: dadoMaior
                });
            };

            dado1.addEventListener('click', rolarPericia);
            dado2.addEventListener('click', rolarPericia);
        }
    });
}