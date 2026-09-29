class GerenciadorHabilidades {
    constructor() {
        this.inicializarModalDOM();
        this.configurarEventos();
    }

    inicializarModalDOM() {
        if (document.getElementById('modal-nova-habilidade')) return;

        const modalHTML = `
            <div id="modal-nova-habilidade" class="modal-overlay">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Nova Habilidade</h2>
                        <button class="modal-fechar" id="fechar-modal-hab">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-group">
                            <label for="hab-nome">Nome*</label>
                            <input type="text" id="hab-nome" class="modal-input" placeholder="Nova Habilidade">
                        </div>

                        <!-- Checkbox empilhado -->
                        <div class="modal-group modal-group-checkbox">
                            <input type="checkbox" id="hab-tem-barra">
                            <label for="hab-tem-barra">Habilidade com barra / recursos</label>
                        </div>

                        <!-- Configuração da barra -->
                        <div class="modal-group grupo-qtd-barra" id="grupo-qtd-barra" style="display: none;">
                            <div class="hab-barra-config-row">
                                <label for="hab-qtd-barra" style="margin-bottom: 0;">Quantidade de Espaços</label>
                                <input type="number" id="hab-qtd-barra" class="modal-input hab-input-num" min="1" max="60" value="3">
                                <div id="hab-barra-preview" class="hab-barra-preview"></div>
                            </div>
                        </div>

                        <div class="modal-group">
                            <label>Descrição* <span class="modal-label-hint"></span></label>
                            <div class="editor-toolbar">
                                <button type="button" class="editor-btn" data-cmd="bold"><b>B</b></button>
                                <button type="button" class="editor-btn" data-cmd="italic"><i>I</i></button>
                                <button type="button" class="editor-btn" data-cmd="underline"><u>U</u></button>
                            </div>
                            <div id="hab-descricao" class="modal-input editor-contenteditable" contenteditable="true" placeholder="Descreva a habilidade..."></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-modal btn-modal-cancelar" id="btn-cancelar-hab">Cancelar</button>
                        <button class="btn-modal btn-modal-adicionar" id="btn-salvar-hab">Adicionar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    configurarEventos() {
        const modal = document.getElementById('modal-nova-habilidade');
        const btnAbrir = document.getElementById('btn-adicionar-habilidade');
        const btnFechar = document.getElementById('fechar-modal-hab');
        const btnCancelar = document.getElementById('btn-cancelar-hab');
        const btnSalvar = document.getElementById('btn-salvar-hab');
        const editor = document.getElementById('hab-descricao');
        
        const checkboxBarra = document.getElementById('hab-tem-barra');
        const grupoBarra = document.getElementById('grupo-qtd-barra');
        const inputQtdBarra = document.getElementById('hab-qtd-barra');

        if (btnAbrir) {
            btnAbrir.addEventListener('click', () => this.abrirModal());
        }

        if (btnFechar) btnFechar.addEventListener('click', () => this.fecharModal());
        if (btnCancelar) btnCancelar.addEventListener('click', () => this.fecharModal());
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.fecharModal();
            });
        }

        if (checkboxBarra && grupoBarra) {
            checkboxBarra.addEventListener('change', () => {
                if (checkboxBarra.checked) {
                    grupoBarra.style.display = 'block';
                    this.atualizarPreviewBarra();
                } else {
                    grupoBarra.style.display = 'none';
                }
            });
        }

        if (inputQtdBarra) {
            inputQtdBarra.addEventListener('input', () => {
                this.atualizarPreviewBarra();
            });
        }

        document.querySelectorAll('.editor-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const comando = btn.getAttribute('data-cmd');
                this.executarComandoEditor(comando);
            });
        });

        if (editor) {
            // Evita colagem de estilos inline e cores de fundo indesejadas
            editor.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                document.execCommand('insertText', false, text);
            });

            ['keyup', 'mouseup', 'focus'].forEach(evento => {
                editor.addEventListener(evento, () => this.atualizarEstadoBotoesToolbar());
            });

            editor.addEventListener('input', () => {
                this.tentarConverterDadoNoInput(editor);
                this.atualizarEstadoBotoesToolbar();
                this.limparFormatacoesOrfas(editor);
            });
        }

        if (btnSalvar) {
            btnSalvar.addEventListener('click', () => this.salvarHabilidade());
        }
    }

    atualizarPreviewBarra() {
        const previewContainer = document.getElementById('hab-barra-preview');
        const inputQtd = document.getElementById('hab-qtd-barra');
        if (!previewContainer || !inputQtd) return;

        previewContainer.innerHTML = '';
        let qtd = parseInt(inputQtd.value);
        if (isNaN(qtd) || qtd < 1) qtd = 1;
        if (qtd > 60) qtd = 60;

        let totalCriados = 0;
        while (totalCriados < qtd) {
            const qtdNestaLinha = Math.min(10, qtd - totalCriados);
            const trackDiv = document.createElement('div');
            trackDiv.className = 'hab-barra-track';

            for (let i = 0; i < 10; i++) {
                const cbPreview = document.createElement('div');
                if (i < qtdNestaLinha) {
                    cbPreview.className = 'cb';
                } else {
                    cbPreview.className = 'cb cb-vazio';
                }
                trackDiv.appendChild(cbPreview);
            }

            previewContainer.appendChild(trackDiv);
            totalCriados += qtdNestaLinha;
        }
    }

    abrirModal() {
        const modal = document.getElementById('modal-nova-habilidade');
        const inputNome = document.getElementById('hab-nome');
        const editorDesc = document.getElementById('hab-descricao');
        const checkboxBarra = document.getElementById('hab-tem-barra');
        const grupoBarra = document.getElementById('grupo-qtd-barra');
        const inputQtdBarra = document.getElementById('hab-qtd-barra');
        
        if (inputNome) inputNome.value = '';
        if (editorDesc) editorDesc.innerHTML = '';
        if (checkboxBarra) checkboxBarra.checked = false;
        if (grupoBarra) grupoBarra.style.display = 'none';
        if (inputQtdBarra) inputQtdBarra.value = '3';
        
        if (modal) modal.classList.add('ativo');
        this.atualizarEstadoBotoesToolbar();
    }

    fecharModal() {
        const modal = document.getElementById('modal-nova-habilidade');
        if (modal) modal.classList.remove('ativo');
    }

    atualizarEstadoBotoesToolbar() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        let node = selection.anchorNode;
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
        }

        const editor = document.getElementById('hab-descricao');
        if (!editor || !editor.contains(node)) return;

        let isBold = false;
        let isItalic = false;
        let isUnderline = false;

        let curr = node;
        while (curr && curr !== editor) {
            if (curr.tagName === 'STRONG' || curr.tagName === 'B') isBold = true;
            if (curr.tagName === 'EM' || curr.tagName === 'I') isItalic = true;
            if (curr.tagName === 'U') isUnderline = true;
            curr = curr.parentNode;
        }

        const btnBold = document.querySelector('.editor-btn[data-cmd="bold"]');
        const btnItalic = document.querySelector('.editor-btn[data-cmd="italic"]');
        const btnUnderline = document.querySelector('.editor-btn[data-cmd="underline"]');

        if (btnBold) btnBold.classList.toggle('ativo', isBold);
        if (btnItalic) btnItalic.classList.toggle('ativo', isItalic);
        if (btnUnderline) btnUnderline.classList.toggle('ativo', isUnderline);
    }

    executarComandoEditor(tipo) {
        const editor = document.getElementById('hab-descricao');
        editor.focus();
        document.execCommand(tipo, false, null);
        this.atualizarEstadoBotoesToolbar();
    }

    limparFormatacoesOrfas(editor) {
        const selection = window.getSelection();
        const strongs = editor.querySelectorAll('strong, b');

        strongs.forEach(el => {
            if (el.textContent.trim() === '+') {
                let next = el.nextSibling;
                while (next && next.nodeType === Node.TEXT_NODE && next.nodeValue.trim() === '') {
                    next = next.nextSibling;
                }

                const isSeguidoPorDado = next && next.nodeType === Node.ELEMENT_NODE && next.classList && next.classList.contains('dado-base-inline');

                if (!isSeguidoPorDado) {
                    const textNode = document.createTextNode('+');
                    
                    let cursorEstavaProximo = false;
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        if (range.startContainer === el || el.contains(range.startContainer) || range.startContainer === el.nextSibling) {
                            cursorEstavaProximo = true;
                        }
                    }

                    el.parentNode.replaceChild(textNode, el);

                    if (cursorEstavaProximo) {
                        const newRange = document.createRange();
                        newRange.setStart(textNode, textNode.nodeValue.length);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                }
            }
        });
    }

    tentarConverterDadoNoInput(editor) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return false;

        const range = selection.getRangeAt(0);
        if (!range.collapsed) return false;

        const node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE) return false;

        const textContent = node.nodeValue;
        const offset = range.startOffset;
        const textBeforeCursor = textContent.substring(0, offset);

        const regexPalavraImpeto = /\b(espaço[s]?|espaco[s]?|ímpeto|impeto)\*$/i;
        const matchImpeto = textBeforeCursor.match(regexPalavraImpeto);

        if (matchImpeto) {
            const fullMatch = matchImpeto[0];
            const inicioTexto = textContent.substring(0, offset - fullMatch.length);
            const fimTexto = textContent.substring(offset);

            const fragment = document.createDocumentFragment();
            if (inicioTexto) {
                fragment.appendChild(document.createTextNode(inicioTexto));
            }

            const spanImpeto = document.createElement('span');
            spanImpeto.className = 'impeto';
            spanImpeto.contentEditable = "false";
            fragment.appendChild(spanImpeto);

            const textNodeFim = document.createTextNode(fimTexto);
            fragment.appendChild(textNodeFim);

            node.parentNode.replaceChild(fragment, node);

            const newRange = document.createRange();
            newRange.setStart(textNodeFim, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            return true;
        }

        const regexPalavraDado = /(\+)?\s*\b(\d*)d(4|6|8|10|12|20)$/i;
        const matchDado = textBeforeCursor.match(regexPalavraDado);

        if (!matchDado) return false;

        const fullMatch = matchDado[0];
        const plus = matchDado[1];
        const qtd = matchDado[2];
        const faces = matchDado[3];
        const quantidade = qtd ? parseInt(qtd) : 1;

        const inicioTexto = textContent.substring(0, offset - fullMatch.length);
        const fimTexto = textContent.substring(offset);

        const fragment = document.createDocumentFragment();
        
        if (inicioTexto) {
            fragment.appendChild(document.createTextNode(inicioTexto));
        }

        if (plus) {
            const strongEl = document.createElement('strong');
            strongEl.textContent = '+';
            fragment.appendChild(strongEl);
        }

        for (let i = 0; i < quantidade; i++) {
            const span = document.createElement('span');
            span.className = `dado-base-inline d${faces}`;
            span.contentEditable = "false";
            span.textContent = faces;
            fragment.appendChild(span);
        }

        const textNodeFim = document.createTextNode(fimTexto);
        fragment.appendChild(textNodeFim);

        node.parentNode.replaceChild(fragment, node);

        const newRange = document.createRange();
        newRange.setStart(textNodeFim, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        return true;
    }

    processarDadosParaHTML(htmlContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Limpa estilos inline indesejados (fundo, cores, fontes coladas)
        tempDiv.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));

        const regexDados = /(\+)?\s*\b(\d*)d(4|6|8|10|12|20)\b/gi;
        const regexImpeto = /\b(espaço[s]?|espaco[s]?|ímpeto|impeto)\*\b/gi;

        const substituirEmNos = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                let texto = node.nodeValue;
                let modificado = false;

                if (regexImpeto.test(texto)) {
                    regexImpeto.lastIndex = 0;
                    texto = texto.replace(regexImpeto, '<span class="impeto" contenteditable="false"></span>');
                    modificado = true;
                }

                regexDados.lastIndex = 0;
                if (regexDados.test(texto)) {
                    regexDados.lastIndex = 0;
                    texto = texto.replace(regexDados, (match, plus, qtd, faces) => {
                        const quantidade = qtd ? parseInt(qtd) : 1;
                        let dadosHtml = '';
                        if (plus) {
                            dadosHtml += '<strong>+</strong>';
                        }
                        for (let i = 0; i < quantidade; i++) {
                            dadosHtml += `<span class="dado-base-inline d${faces}" contenteditable="false">${faces}</span>`;
                        }
                        return dadosHtml;
                    });
                    modificado = true;
                }

                if (modificado) {
                    const spanTemp = document.createElement('span');
                    spanTemp.innerHTML = texto;
                    node.parentNode.replaceChild(spanTemp, node);
                }
            } else {
                node.childNodes.forEach(subNode => substituirEmNos(subNode));
            }
        };

        substituirEmNos(tempDiv);

        let htmlLimpo = tempDiv.innerHTML
            .replace(/&nbsp;/g, ' ')
            .replace(/(<[a-z1-6]+[^>]*>)\s+/gi, '$1')
            .trim();

        return htmlLimpo;
    }

    salvarHabilidade() {
        const nomeInput = document.getElementById('hab-nome').value.trim();
        const editorDesc = document.getElementById('hab-descricao');
        
        // Pega o HTML e remove espaços, &nbsp; e quebras no início do texto
        let descHtmlBruto = editorDesc.innerHTML
            .replace(/^(<br\s*\/?>|&nbsp;|\s)+/gi, '')
            .trim();

        const checkboxBarra = document.getElementById('hab-tem-barra');
        const inputQtdBarra = document.getElementById('hab-qtd-barra');

        if (!nomeInput) {
            alert('Por favor, preencha o nome da habilidade.');
            return;
        }

        const descricaoFinal = this.processarDadosParaHTML(descHtmlBruto);
        const temBarra = checkboxBarra ? checkboxBarra.checked : false;
        const qtdBarra = temBarra ? (parseInt(inputQtdBarra.value) || 3) : 0;

        const novaHabilidadeData = {
            id: 'hab_' + Date.now(),
            nome: nomeInput,
            descricaoHtml: descricaoFinal,
            temBarra: temBarra,
            qtdBarra: qtdBarra,
            criadoEm: new Date().toISOString()
        };

        this.adicionarHabilidadeNaInterface(novaHabilidadeData);
        this.fecharModal();
    }

    adicionarHabilidadeNaInterface(hab) {
        const containerHabilidades = document.getElementById('lista-habilidades');
        if (!containerHabilidades) return;

        const novoContainer = document.createElement('div');
        novoContainer.className = 'hab-container';
        novoContainer.setAttribute('data-id', hab.id);

        let barraHtml = '';
        if (hab.temBarra && hab.qtdBarra > 0) {
            let totalCriados = 0;
            while (totalCriados < hab.qtdBarra) {
                const qtdNestaLinha = Math.min(10, hab.qtdBarra - totalCriados);
                barraHtml += `<div class="hab-barra-track">`;
                for (let i = 0; i < 10; i++) {
                    if (i < qtdNestaLinha) {
                        barraHtml += `<div class="cb"></div>`;
                    } else {
                        barraHtml += `<div class="cb cb-vazio"></div>`;
                    }
                }
                barraHtml += `</div>`;
                totalCriados += qtdNestaLinha;
            }
        }

        novoContainer.innerHTML = `
            <div class="hab-titulo-fundo">${hab.nome}</div>
            <div class="linha-hab-decorativa"></div>
            ${barraHtml}
            <div class="hab-texto">${hab.descricaoHtml.trim()}</div>
        `;

        const slots = novoContainer.querySelectorAll('.hab-barra-track .cb:not(.cb-vazio)');
        slots.forEach(cb => {
            cb.addEventListener('click', function() {
                this.classList.toggle('active');
            });
        });

        containerHabilidades.appendChild(novoContainer);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gerenciadorHabilidades = new GerenciadorHabilidades();
});