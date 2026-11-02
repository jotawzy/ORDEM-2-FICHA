export class GerenciadorFotoInventario {
    constructor(aoConcluirCorteCallback) {
        this.larguraMinima = 500;
        this.alturaMinima = 500;
        this.tamanhoMaximoArquivoBytes = 5 * 1024 * 1024;
        this.limiteFirestoreBytes = 150 * 1024;

        this.aoConcluirCorte = aoConcluirCorteCallback;
        this.imagemCarregada = null;
        this.dataUrlResultado = "";

        this.cropViewportLargura = 260;
        this.cropViewportAltura = 260;
        this.cropEscalaMinima = 1;
        this.cropEscalaMaxima = 4;
        this.cropEscalaAtual = 1;
        this.cropOffsetX = 0;
        this.cropOffsetY = 0;

        this.inicializar();
    }

    inicializar() {
        this.criarModalSeNecessario();
        this.buscarElementos();
        this.configurarEventos();
    }

    criarModalSeNecessario() {
        this.modal = document.getElementById("modal-foto-inventario");
        if (this.modal) return;

        this.modal = document.createElement("div");
        this.modal.id = "modal-foto-inventario";
        this.modal.innerHTML = `
            <div class="modal-container-foto" style="position: relative; width: min(850px, 92vw); max-height: 90vh; overflow: auto; background: #18181b; border: 1px solid var(--main-color, #a8321d); border-radius: 12px; padding: 20px; color: #fff; box-shadow: 0 20px 60px rgba(0,0,0,0.85);">
                <div class="modal-header-foto" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                    <h2 style="margin: 0; font-family: var(--font-title, sans-serif); font-size: 1.25rem;">Ajustar Foto do Item (500x500)</h2>
                    <button type="button" id="fechar-modal-foto-inv" style="background:none; border:none; color:#888; font-size:22px; cursor:pointer;">&times;</button>
                </div>

                <div class="modal-body-foto-layout" style="display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 16px;">
                    <div class="painel-recorte" style="background: #111113; border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column;">
                        <h3 class="painel-titulo" style="margin: 0 0 10px; font-size: 0.82rem; text-transform: uppercase;">Recorte</h3>
                        <div id="crop-image-container-inv" class="crop-palco" style="position: relative; height: 260px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: repeating-conic-gradient(#202020 0% 25%, #151515 0% 50%) 50% / 16px 16px; border-radius: 6px; cursor: grab; touch-action: none;">
                            <p id="instrucoes-upload-inv" style="color: #8a8a8a; font-size: 0.85rem; text-align: center; padding: 20px;">
                                Escolha uma imagem de no mínimo 500x500px.
                            </p>
                        </div>
                        <div class="crop-controles" style="display: flex; align-items: center; gap: 12px; margin-top: 10px;">
                            <label style="font-size: 0.8rem; color: #ccc;">Zoom</label>
                            <input type="range" id="crop-zoom-slider-inv" min="0" max="100" value="0" style="flex: 1; accent-color: var(--main-color, #a8321d); cursor: pointer;">
                        </div>
                    </div>

                    <div class="painel-preview" style="background: #111113; border-radius: 8px; padding: 14px 16px; display: flex; flex-direction: column; align-items: center;">
                        <h3 class="painel-titulo" style="margin: 0 0 10px; font-size: 0.82rem; text-transform: uppercase;">Pré-visualização</h3>
                        <div id="preview-resultado-inv" style="width: 160px; height: 160px; background: repeating-conic-gradient(#202020 0% 25%, #151515 0% 50%) 50% / 16px 16px; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            <span style="color: #666; font-size: 0.75rem;">Sem imagem</span>
                        </div>
                        <p style="margin: 10px 0 0; font-size: 0.75rem; color: #777; text-align: center;">Como o ícone aparecerá no item.</p>
                    </div>
                </div>

                <div class="modal-footer-foto" style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 18px;">
                    <span id="foto-aviso-inv" style="margin-right: auto; font-size: 0.78rem; color: #ff7b72;" hidden></span>
                    <input type="file" id="input-arquivo-foto-inv" accept="image/png, image/jpeg, image/webp" hidden>
                    <button type="button" id="btn-escolher-outra-inv" style="background: transparent; color: #aaa; border: none; padding: 9px 12px; cursor: pointer; font-weight: 600;">Escolher imagem</button>
                    <button type="button" id="btn-cancelar-foto-inv" style="background: transparent; color: #bbb; border: none; padding: 9px 16px; cursor: pointer;">Cancelar</button>
                    <button type="button" id="btn-confirmar-foto-inv" style="background: var(--main-color, #a8321d); color: #fff; border: none; padding: 9px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Confirmar</button>
                </div>
            </div>
        `;

        this.modal.style.position = "fixed";
        this.modal.style.inset = "0";
        this.modal.style.width = "100%";
        this.modal.style.height = "100%";
        this.modal.style.display = "none";
        this.modal.style.alignItems = "center";
        this.modal.style.justifyContent = "center";
        this.modal.style.background = "rgba(0, 0, 0, 0.88)";
        this.modal.style.zIndex = "999999"; // Garantido acima de qualquer outro modal

        document.body.appendChild(this.modal);
    }

    buscarElementos() {
        this.modal = document.getElementById("modal-foto-inventario");
        this.inputArquivo = document.getElementById("input-arquivo-foto-inv");
        this.btnEscolher = document.getElementById("btn-escolher-outra-inv");
        this.btnConfirmar = document.getElementById("btn-confirmar-foto-inv");
        this.btnFechar = document.getElementById("fechar-modal-foto-inv");
        this.btnCancelar = document.getElementById("btn-cancelar-foto-inv");
        this.previewContainer = document.getElementById("preview-resultado-inv");
        this.avisoElemento = document.getElementById("foto-aviso-inv");
        this.cropSliderZoom = document.getElementById("crop-zoom-slider-inv");
    }

    configurarEventos() {
        if (this.btnEscolher && this.inputArquivo) {
            this.btnEscolher.addEventListener("click", () => this.inputArquivo.click());
            this.inputArquivo.addEventListener("change", (e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) {
                    this.validarImagem(arquivo);
                }
                e.target.value = "";
            });
        }

        const fechar = () => { if (this.modal) this.modal.style.display = "none"; };
        if (this.btnFechar) this.btnFechar.addEventListener("click", fechar);
        if (this.btnCancelar) this.btnCancelar.addEventListener("click", fechar);

        if (this.btnConfirmar) {
            this.btnConfirmar.addEventListener("click", () => {
                if (!this.imagemCarregada && !this.dataUrlResultado) {
                    alert("Escolha uma imagem antes de confirmar.");
                    return;
                }
                this.gerarImagemFinal();
                if (this.modal) this.modal.style.display = "none";
                if (this.aoConcluirCorte) this.aoConcluirCorte(this.dataUrlResultado);
            });
        }

        if (this.modal) {
            this.modal.addEventListener("click", (e) => {
                if (e.target === this.modal) fechar();
            });
        }
    }

    abrirModalParaEscolha(urlExistente = "") {
        if (!this.modal) return;
        this.modal.style.display = "flex";
        this.exibirAviso("");
        this.dataUrlResultado = urlExistente;

        if (urlExistente) {
            const img = new Image();
            img.onload = () => {
                this.prepararImagemCarregada(img);
            };
            img.src = urlExistente;
        } else {
            if (this.inputArquivo) this.inputArquivo.click();
        }
    }

    exibirAviso(mensagem, tipo = "erro") {
        if (!this.avisoElemento) return;
        if (!mensagem) {
            this.avisoElemento.hidden = true;
            this.avisoElemento.textContent = "";
            return;
        }
        this.avisoElemento.hidden = false;
        this.avisoElemento.textContent = mensagem;
        this.avisoElemento.setAttribute("data-tipo", tipo);
    }

    validarImagem(arquivo) {
        if (arquivo.size > this.tamanhoMaximoArquivoBytes) {
            this.exibirAviso("O arquivo é muito grande (máx: 5MB).");
            return;
        }

        const leitor = new FileReader();
        leitor.onload = (e) => {
            const url = e.target.result;
            const imagem = new Image();
            imagem.onload = () => {
                const largura = imagem.naturalWidth;
                const altura = imagem.naturalHeight;

                if (largura < this.larguraMinima || altura < this.alturaMinima) {
                    this.exibirAviso(`Aviso: Imagem pequena (${largura}x${altura}px). Recomendado: min 500x500px.`);
                } else {
                    this.exibirAviso("");
                }

                this.prepararImagemCarregada(imagem);
            };
            imagem.onerror = () => {
                this.exibirAviso("Não foi possível carregar a imagem.");
            };
            imagem.src = url;
        };
        leitor.readAsDataURL(arquivo);
    }

    prepararImagemCarregada(imagem) {
        this.imagemCarregada = imagem;
        this.garantirCanvasPreview();
        this.iniciarFerramentaCorte(imagem);
    }

    garantirCanvasPreview() {
        if (!this.previewContainer) return;
        let canvas = document.getElementById("canvas-preview-foto-inv");
        if (!canvas) {
            this.previewContainer.innerHTML = "";
            canvas = document.createElement("canvas");
            canvas.id = "canvas-preview-foto-inv";
            canvas.width = this.larguraMinima;
            canvas.height = this.alturaMinima;
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.display = "block";
            canvas.style.objectFit = "cover";
            this.previewContainer.appendChild(canvas);
        }
        this.canvasPreview = canvas;
    }

    iniciarFerramentaCorte(imagem) {
        const areaRecorte = document.getElementById("crop-image-container-inv");
        if (!areaRecorte) return;

        areaRecorte.innerHTML = "";

        const viewportLargura = 260;
        const viewportAltura = 260;
        this.cropViewportLargura = viewportLargura;
        this.cropViewportAltura = viewportAltura;

        const viewport = document.createElement("div");
        viewport.style.position = "relative";
        viewport.style.width = `${viewportLargura}px`;
        viewport.style.height = `${viewportAltura}px`;
        viewport.style.overflow = "hidden";
        viewport.style.background = "#000";
        viewport.style.borderRadius = "6px";
        viewport.style.cursor = "grab";
        viewport.style.touchAction = "none";

        const imgArraste = document.createElement("img");
        imgArraste.src = imagem.src;
        imgArraste.draggable = false;
        imgArraste.style.position = "absolute";
        imgArraste.style.transformOrigin = "top left";
        viewport.appendChild(imgArraste);
        this.cropImgElemento = imgArraste;
        this.cropViewportElemento = viewport;
        areaRecorte.appendChild(viewport);

        const escalaMinima = Math.max(
            viewportLargura / imagem.naturalWidth,
            viewportAltura / imagem.naturalHeight
        );

        this.cropEscalaMinima = escalaMinima;
        this.cropEscalaMaxima = escalaMinima * 4;
        this.cropEscalaAtual = escalaMinima;

        this.cropOffsetX = (viewportLargura - imagem.naturalWidth * escalaMinima) / 2;
        this.cropOffsetY = (viewportAltura - imagem.naturalHeight * escalaMinima) / 2;

        this.aplicarTransformCrop();
        this.configurarEventosCrop();
        this.desenharPreview();

        if (this.cropSliderZoom) {
            this.cropSliderZoom.value = "0";
            this.cropSliderZoom.oninput = (e) => {
                const perc = Number(e.target.value) / 100;
                const novaEscala = this.cropEscalaMinima + perc * (this.cropEscalaMaxima - this.cropEscalaMinima);
                this.definirZoom(novaEscala);
            };
        }
    }

    aplicarTransformCrop() {
        if (!this.cropImgElemento || !this.imagemCarregada) return;
        const escala = this.cropEscalaAtual;
        this.cropImgElemento.style.width = `${this.imagemCarregada.naturalWidth * escala}px`;
        this.cropImgElemento.style.height = `${this.imagemCarregada.naturalHeight * escala}px`;
        this.cropImgElemento.style.transform = `translate(${this.cropOffsetX}px, ${this.cropOffsetY}px)`;
    }

    clampOffsetsCrop() {
        if (!this.imagemCarregada) return;
        const larguraExibida = this.imagemCarregada.naturalWidth * this.cropEscalaAtual;
        const alturaExibida = this.imagemCarregada.naturalHeight * this.cropEscalaAtual;

        const minX = this.cropViewportLargura - larguraExibida;
        const minY = this.cropViewportAltura - alturaExibida;

        this.cropOffsetX = Math.min(0, Math.max(minX, this.cropOffsetX));
        this.cropOffsetY = Math.min(0, Math.max(minY, this.cropOffsetY));
    }

    configurarEventosCrop() {
        const viewport = this.cropViewportElemento;
        if (!viewport) return;

        let arrastando = false, inicioX = 0, inicioY = 0, initX = 0, initY = 0;

        viewport.onpointerdown = (e) => {
            arrastando = true;
            inicioX = e.clientX;
            inicioY = e.clientY;
            initX = this.cropOffsetX;
            initY = this.cropOffsetY;
            try { viewport.setPointerCapture(e.pointerId); } catch(err){}
        };

        viewport.onpointermove = (e) => {
            if (!arrastando) return;
            this.cropOffsetX = initX + (e.clientX - inicioX);
            this.cropOffsetY = initY + (e.clientY - inicioY);
            this.clampOffsetsCrop();
            this.aplicarTransformCrop();
            this.desenharPreview();
        };

        const fim = () => { arrastando = false; };
        viewport.onpointerup = fim;
        viewport.onpointercancel = fim;

        // Zoom com o scroll (wheel) do mouse
        viewport.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            const novaEscala = Math.min(this.cropEscalaMaxima, Math.max(this.cropEscalaMinima, this.cropEscalaAtual + delta * (this.cropEscalaMaxima - this.cropEscalaMinima)));
            this.definirZoom(novaEscala);
        };
    }

    definirZoom(novaEscala) {
        if (!this.imagemCarregada) return;
        const centroX = this.cropViewportLargura / 2;
        const centroY = this.cropViewportAltura / 2;
        const imgX = (centroX - this.cropOffsetX) / this.cropEscalaAtual;
        const imgY = (centroY - this.cropOffsetY) / this.cropEscalaAtual;

        this.cropEscalaAtual = novaEscala;
        this.cropOffsetX = centroX - imgX * this.cropEscalaAtual;
        this.cropOffsetY = centroY - imgY * this.cropEscalaAtual;

        this.clampOffsetsCrop();
        this.aplicarTransformCrop();
        this.desenharPreview();

        if (this.cropSliderZoom) {
            const amplitude = this.cropEscalaMaxima - this.cropEscalaMinima || 1;
            const percentual = (this.cropEscalaAtual - this.cropEscalaMinima) / amplitude;
            this.cropSliderZoom.value = String(Math.round(percentual * 100));
        }
    }

    desenharPreview() {
        if (!this.canvasPreview || !this.imagemCarregada) return;
        const ctx = this.canvasPreview.getContext("2d");
        ctx.clearRect(0, 0, this.larguraMinima, this.alturaMinima);

        const sx = -this.cropOffsetX / this.cropEscalaAtual;
        const sy = -this.cropOffsetY / this.cropEscalaAtual;
        const sLargura = this.cropViewportLargura / this.cropEscalaAtual;
        const sAltura = this.cropViewportAltura / this.cropEscalaAtual;

        ctx.drawImage(
            this.imagemCarregada,
            sx, sy, sLargura, sAltura,
            0, 0, this.larguraMinima, this.alturaMinima
        );
    }

    gerarImagemFinal() {
        if (!this.canvasPreview || !this.imagemCarregada) return;
        this.desenharPreview();

        let qualidade = 0.9;
        let resultado = this.canvasPreview.toDataURL("image/webp", qualidade);
        
        while (resultado.length * 0.75 > this.limiteFirestoreBytes && qualidade > 0.3) {
            qualidade -= 0.1;
            resultado = this.canvasPreview.toDataURL("image/webp", qualidade);
        }

        this.dataUrlResultado = resultado;
    }

    definirFotoExterna(url) {
        this.dataUrlResultado = url;
        if (url && this.previewContainer) {
            this.previewContainer.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else if (this.previewContainer) {
            this.previewContainer.innerHTML = `<span style="color: #666; font-size: 0.75rem;">Sem imagem</span>`;
        }
    }
}