class GerenciadorEdicao {
    constructor() {
        this.modoEdicaoAtivo = false;
        this.habilidadeSendoEditada = null;
        this.inicializarModalEdicaoDOM();
        this.configurarEventosEdicao();
    }

    inicializarModalEdicaoDOM() {
        if (document.getElementById('modal-editar-habilidade')) return;

        const modalHTML = `
            <div id="modal-editar-habilidade" class="modal-overlay">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Editar Habilidade</h2>
                        <button class="modal-fechar" id="fechar-modal-edit">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-group">
                            <label for="edit-hab-nome">Nome*</label>
                            <input type="text" id="edit-hab-nome" class="modal-input" placeholder="Nome da Habilidade">
                        </div>

                        <div class="modal-group modal-group-checkbox">
                            <input type="checkbox" id="edit-hab-tem-barra">
                            <label for="edit-hab-tem-barra">Habilidade com barra / recursos</label>
                        </div>

                        <div class="modal-group grupo-qtd-barra" id="edit-grupo-qtd-barra" style="display: none;">
                            <div class="hab-barra-config-row">
                                <label for="edit-hab-qtd-barra" style="margin-bottom: 0;">Quantidade de Espaços</label>
                                <input type="number" id="edit-hab-qtd-barra" class="modal-input hab-input-num" min="1" max="60" value="3">
                                <div id="edit-hab-barra-preview" class="hab-barra-preview"></div>
                            </div>
                        </div>

                        <div class="modal-group">
                            <label>Descrição* <span class="modal-label-hint"></span></label>
                            <div class="editor-toolbar">
                                <button type="button" class="editor-btn" data-cmd="bold"><b>B</b></button>
                                <button type="button" class="editor-btn" data-cmd="italic"><i>I</i></button>
                                <button type="button" class="editor-btn" data-cmd="underline"><u>U</u></button>
                            </div>
                            <div id="edit-hab-descricao" class="modal-input editor-contenteditable" contenteditable="true" placeholder="Descreva a habilidade..."></div>
                        </div>
                    </div>
                    <div class="modal-footer modal-footer-edit">
                        <button class="btn-modal btn-modal-excluir" id="btn-excluir-hab">Excluir</button>
                        <div class="modal-footer-right">
                            <button class="btn-modal btn-modal-cancelar" id="btn-cancelar-edit">Cancelar</button>
                            <button class="btn-modal btn-modal-adicionar" id="btn-salvar-edicao">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    atualizarPreviewBarraEdicao() {
        const previewContainer = document.getElementById('edit-hab-barra-preview');
        const inputQtd = document.getElementById('edit-hab-qtd-barra');
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

    configurarEventosEdicao() {
        const btnLapis = document.getElementById('btn-editar') || document.querySelector('.btn-editar');
        
        if (btnLapis) {
            btnLapis.addEventListener('click', () => this.alternarModoEdicao(btnLapis));
        }

        const modal = document.getElementById('modal-editar-habilidade');
        const btnFechar = document.getElementById('fechar-modal-edit');
        const btnCancelar = document.getElementById('btn-cancelar-edit');
        const btnSalvar = document.getElementById('btn-salvar-edicao');
        const btnExcluir = document.getElementById('btn-excluir-hab');
        const editor = document.getElementById('edit-hab-descricao');

        const checkboxBarraEdit = document.getElementById('edit-hab-tem-barra');
        const grupoBarraEdit = document.getElementById('edit-grupo-qtd-barra');
        const inputQtdBarraEdit = document.getElementById('edit-hab-qtd-barra');

        if (checkboxBarraEdit && grupoBarraEdit) {
            checkboxBarraEdit.addEventListener('change', () => {
                if (checkboxBarraEdit.checked) {
                    grupoBarraEdit.style.display = 'block';
                    this.atualizarPreviewBarraEdicao();
                } else {
                    grupoBarraEdit.style.display = 'none';
                }
            });
        }

        if (inputQtdBarraEdit) {
            inputQtdBarraEdit.addEventListener('input', () => {
                this.atualizarPreviewBarraEdicao();
            });
        }

        if (btnFechar) btnFechar.addEventListener('click', () => this.fecharModal());
        if (btnCancelar) btnCancelar.addEventListener('click', () => this.fecharModal());

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.fecharModal();
            });
        }

        document.querySelectorAll('#modal-editar-habilidade .editor-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const comando = btn.getAttribute('data-cmd');
                this.executarComandoEditor(comando);
            });
        });

        if (editor) {
            ['keyup', 'mouseup', 'focus'].forEach(evento => {
                editor.addEventListener(evento, () => this.atualizarEstadoBotoesToolbar());
            });

            editor.addEventListener('input', () => {
                if (window.gerenciadorHabilidades) {
                    window.gerenciadorHabilidades.tentarConverterDadoNoInput(editor);
                    window.gerenciadorHabilidades.limparFormatacoesOrfas(editor);
                }
                this.atualizarEstadoBotoesToolbar();
            });
        }

        if (btnSalvar) {
            btnSalvar.addEventListener('click', () => this.salvarEdicao());
        }

        if (btnExcluir) {
            btnExcluir.addEventListener('click', () => this.excluirHabilidade());
        }

        const listaHabilidades = document.getElementById('lista-habilidades');
        if (listaHabilidades) {
            listaHabilidades.addEventListener('click', (e) => {
                if (!this.modoEdicaoAtivo) return;
                const habContainer = e.target.closest('.hab-container');
                if (habContainer) {
                    e.stopPropagation();
                    this.abrirModalEdicao(habContainer);
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (!this.modoEdicaoAtivo) return;

            const attrDado = e.target.closest('.attr-dado');
            if (attrDado) {
                e.preventDefault();
                e.stopPropagation();
                this.ciclarPasseDado(attrDado);
                
                const attrBox = attrDado.closest('.attr-box');
                if (attrBox) {
                    const nomeAttrEl = attrBox.querySelector('.attr-nome');
                    if (nomeAttrEl) {
                        const nomeAtributo = nomeAttrEl.textContent.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                        this.atualizarPericiasPorAtributo(nomeAtributo, attrDado);
                    }
                }
                return;
            }

            const periDado1 = e.target.closest('.peri-dado-1');
            if (periDado1) {
                e.preventDefault();
                e.stopPropagation();
                this.ciclarPasseDado(periDado1);
                return;
            }

            const periDado2 = e.target.closest('.peri-dado-2');
            if (periDado2) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }, true);
    }

    ciclarPasseDado(dadoBtn) {
        const passes = [4, 6, 8, 10, 12, 20];
        
        let facesAtuais = 6;
        for (let cls of dadoBtn.classList) {
            if (cls.startsWith('d') && cls.length > 1) {
                const f = parseInt(cls.substring(1));
                if (!isNaN(f)) {
                    facesAtuais = f;
                    break;
                }
            }
        }

        let index = passes.indexOf(facesAtuais);
        let proximoIndex = (index === -1 || index === passes.length - 1) ? 0 : index + 1;
        let novoFace = passes[proximoIndex];

        passes.forEach(f => dadoBtn.classList.remove(`d${f}`));

        dadoBtn.classList.add(`d${novoFace}`);
        dadoBtn.setAttribute('data-val', novoFace);
        dadoBtn.textContent = novoFace;
    }

    atualizarPericiasPorAtributo(nomeAtributoNormalizado, attrDadoBtn) {
        let novoFacesAttr = 6;
        for (let cls of attrDadoBtn.classList) {
            if (cls.startsWith('d') && cls.length > 1) {
                const f = parseInt(cls.substring(1));
                if (!isNaN(f)) {
                    novoFacesAttr = f;
                    break;
                }
            }
        }

        const periLinhas = document.querySelectorAll('.peri-linha');
        periLinhas.forEach(linha => {
            const attrLabel = linha.querySelector('.peri-attr');
            if (attrLabel) {
                const textoAttrLinha = attrLabel.textContent.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                if (textoAttrLinha === nomeAtributoNormalizado) {
                    const dado2 = linha.querySelector('.peri-dado-2');
                    if (dado2) {
                        const passes = [4, 6, 8, 10, 12, 20];
                        passes.forEach(f => dado2.classList.remove(`d${f}`));
                        dado2.classList.add(`d${novoFacesAttr}`);
                        dado2.setAttribute('data-val', novoFacesAttr);
                        dado2.textContent = novoFacesAttr;
                    }
                }
            }
        });
    }

    alternarModoEdicao(btnLapis) {
        this.modoEdicaoAtivo = !this.modoEdicaoAtivo;
        btnLapis.classList.toggle('ativo', this.modoEdicaoAtivo);
        document.body.classList.toggle('modo-edicao-ativo', this.modoEdicaoAtivo);
    }

    abrirModalEdicao(habContainer) {
        this.habilidadeSendoEditada = habContainer;
        
        const nomeEl = habContainer.querySelector('.hab-titulo-fundo');
        const textoEl = habContainer.querySelector('.hab-texto');

        const inputNome = document.getElementById('edit-hab-nome');
        const editorDesc = document.getElementById('edit-hab-descricao');
        
        const checkboxBarra = document.getElementById('edit-hab-tem-barra');
        const grupoBarra = document.getElementById('edit-grupo-qtd-barra');
        const inputQtdBarra = document.getElementById('edit-hab-qtd-barra');

        if (inputNome && nomeEl) {
            inputNome.value = nomeEl.textContent.trim();
        }

        if (editorDesc && textoEl) {
            let htmlOriginal = textoEl.innerHTML.trim();
            htmlOriginal = htmlOriginal.replace(/^(<br\s*[\/]?>)+/gi, '').trim();
            editorDesc.innerHTML = htmlOriginal;
        }

        let qtdBarraExistente = 0;
        const cbs = habContainer.querySelectorAll('.hab-barra-track .cb:not(.cb-vazio)');
        if (cbs.length > 0) {
            qtdBarraExistente = cbs.length;
        }

        if (qtdBarraExistente > 0) {
            if (checkboxBarra) checkboxBarra.checked = true;
            if (grupoBarra) grupoBarra.style.display = 'block';
            if (inputQtdBarra) inputQtdBarra.value = qtdBarraExistente;
            this.atualizarPreviewBarraEdicao();
        } else {
            if (checkboxBarra) checkboxBarra.checked = false;
            if (grupoBarra) grupoBarra.style.display = 'none';
            if (inputQtdBarra) inputQtdBarra.value = '3';
            const preview = document.getElementById('edit-hab-barra-preview');
            if (preview) preview.innerHTML = '';
        }

        const modal = document.getElementById('modal-editar-habilidade');
        if (modal) modal.classList.add('ativo');
        this.atualizarEstadoBotoesToolbar();
    }

    fecharModal() {
        const modal = document.getElementById('modal-editar-habilidade');
        if (modal) modal.classList.remove('ativo');
        this.habilidadeSendoEditada = null;
    }

    atualizarEstadoBotoesToolbar() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        let node = selection.anchorNode;
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
        }

        const editor = document.getElementById('edit-hab-descricao');
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

        const btnBold = document.querySelector('#modal-editar-habilidade .editor-btn[data-cmd="bold"]');
        const btnItalic = document.querySelector('#modal-editar-habilidade .editor-btn[data-cmd="italic"]');
        const btnUnderline = document.querySelector('#modal-editar-habilidade .editor-btn[data-cmd="underline"]');

        if (btnBold) btnBold.classList.toggle('ativo', isBold);
        if (btnItalic) btnItalic.classList.toggle('ativo', isItalic);
        if (btnUnderline) btnUnderline.classList.toggle('ativo', isUnderline);
    }

    executarComandoEditor(tipo) {
        const editor = document.getElementById('edit-hab-descricao');
        editor.focus();
        document.execCommand(tipo, false, null);
        this.atualizarEstadoBotoesToolbar();
    }

    salvarEdicao() {
        if (!this.habilidadeSendoEditada) return;

        const inputNome = document.getElementById('edit-hab-nome');
        const editorDesc = document.getElementById('edit-hab-descricao');
        const checkboxBarra = document.getElementById('edit-hab-tem-barra');
        const inputQtdBarra = document.getElementById('edit-hab-qtd-barra');

        const novoNome = inputNome.value.trim();
        const descHtmlBruto = editorDesc.innerHTML.trim();

        if (!novoNome) {
            alert('Por favor, preencha o nome da habilidade.');
            return;
        }

        let descricaoFinal = descHtmlBruto;
        if (window.gerenciadorHabilidades && typeof window.gerenciadorHabilidades.processarDadosParaHTML === 'function') {
            descricaoFinal = window.gerenciadorHabilidades.processarDadosParaHTML(descHtmlBruto);
        }

        const nomeEl = this.habilidadeSendoEditada.querySelector('.hab-titulo-fundo');
        const textoEl = this.habilidadeSendoEditada.querySelector('.hab-texto');

        if (nomeEl) nomeEl.textContent = novoNome;
        if (textoEl) textoEl.innerHTML = descricaoFinal;

        // --- PRESERVAÇÃO DOS QUADRADINHOS SELECIONADOS ---
        const estadosAtivosAntigos = [];
        const cbsAntigos = this.habilidadeSendoEditada.querySelectorAll('.hab-barra-track .cb:not(.cb-vazio)');
        cbsAntigos.forEach(cb => {
            estadosAtivosAntigos.push(cb.classList.contains('active'));
        });

        // Remove as barras antigas
        const barrasAntigas = this.habilidadeSendoEditada.querySelectorAll('.hab-barra-track');
        barrasAntigas.forEach(barra => barra.remove());

        // Cria as novas barras mantendo o estado selecionado (active) de antes
        const temBarra = checkboxBarra ? checkboxBarra.checked : false;
        const qtdBarra = temBarra ? (parseInt(inputQtdBarra.value) || 3) : 0;

        if (temBarra && qtdBarra > 0) {
            let totalCriados = 0;
            let indiceGlobal = 0;
            while (totalCriados < qtdBarra) {
                const qtdNestaLinha = Math.min(10, qtdBarra - totalCriados);
                const trackDiv = document.createElement('div');
                trackDiv.className = 'hab-barra-track';

                for (let i = 0; i < 10; i++) {
                    const cb = document.createElement('div');
                    if (i < qtdNestaLinha) {
                        cb.className = 'cb';
                        
                        // Restaura o estado 'active' se o quadradinho já estava marcado antes
                        if (estadosAtivosAntigos[indiceGlobal]) {
                            cb.classList.add('active');
                        }

                        cb.addEventListener('click', function() {
                            this.classList.toggle('active');
                        });

                        indiceGlobal++;
                    } else {
                        cb.className = 'cb cb-vazio';
                    }
                    trackDiv.appendChild(cb);
                }

                this.habilidadeSendoEditada.insertBefore(trackDiv, textoEl);
                totalCriados += qtdNestaLinha;
            }
        }

        this.fecharModal();
    }

    excluirHabilidade() {
        if (!this.habilidadeSendoEditada) return;

        if (confirm('Tem certeza de que deseja excluir esta habilidade?')) {
            this.habilidadeSendoEditada.remove();
            this.fecharModal();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.gerenciadorEdicao = new GerenciadorEdicao();
});