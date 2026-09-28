class GerenciadorFotoPersonagem {
    constructor() {
        this.larguraMinima = 485;
        this.alturaMinima = 1510;

        this.tamanhoMaximoArquivoBytes = 5 * 1024 * 1024;

        // Orçamento de bytes (string base64) para o campo `fotoUrl` no Firestore.
        // Ajuste este valor se a ficha tiver muitos outros campos grandes.
        this.limiteFirestoreBytes = 700 * 1024;

        this.imagemAtualTemp = null;

        // Imagem validada (Image já carregada), usada como fonte para o canvas.
        this.imagemCarregada = null;
        this.precisaRecorte = false;

        // Canvas único de 510x1510 que representa o resultado final/preview.
        this.canvasPreview = null;

        // Estado da ferramenta de corte.
        this.cropViewportElemento = null;
        this.cropImgElemento = null;
        this.cropSliderZoom = null;
        this.cropViewportLargura = 0;
        this.cropViewportAltura = 0;
        this.cropEscalaMinima = 1;
        this.cropEscalaMaxima = 1;
        this.cropEscalaAtual = 1;
        this.cropOffsetX = 0;
        this.cropOffsetY = 0;

        this.charImage = null;
        this.btnFoto = null;
        this.modal = null;
        this.inputArquivo = null;
        this.btnEscolher = null;
        this.btnConfirmar = null;
        this.btnFechar = null;

        this.db = null;
        this.auth = null;
        this.doc = null;
        this.getDoc = null;
        this.updateDoc = null;
        this.fichaRef = null;
        this.fichaId = null;
        this.firebaseInicializado = false;

        this.inicializar();
    }

    async inicializar() {
        this.charImage = document.querySelector(".char-image");

        if (!this.charImage) {
            console.error("FOTO: .char-image não foi encontrada.");
            return;
        }

        this.criarBotaoSeNecessario();
        this.criarModalSeNecessario();
        this.buscarElementos();
        this.configurarEventos();

        await this.inicializarFirebase();
    }

    criarBotaoSeNecessario() {
        this.btnFoto = document.getElementById("btn-foto-personagem");

        if (this.btnFoto) {
            return;
        }

        this.btnFoto = document.createElement("button");
        this.btnFoto.id = "btn-foto-personagem";
        this.btnFoto.type = "button";
        this.btnFoto.setAttribute("aria-label", "Alterar foto do personagem");
        this.btnFoto.innerHTML = '<i class="fa-solid fa-plus"></i>';

        this.btnFoto.style.position = "absolute";
        this.btnFoto.style.left = "48.25%";
        this.btnFoto.style.top = "72%";
        this.btnFoto.style.width = "52px";
        this.btnFoto.style.height = "52px";
        this.btnFoto.style.display = "flex";
        this.btnFoto.style.alignItems = "center";
        this.btnFoto.style.justifyContent = "center";
        this.btnFoto.style.padding = "0";
        this.btnFoto.style.margin = "0";
        this.btnFoto.style.border = "2px solid currentColor";
        this.btnFoto.style.borderRadius = "50%";
        this.btnFoto.style.background = "transparent";
        this.btnFoto.style.color = "var(--main-color)";
        this.btnFoto.style.fontSize = "25px";
        this.btnFoto.style.cursor = "pointer";
        this.btnFoto.style.zIndex = "50";
        this.btnFoto.style.pointerEvents = "auto";

        const wrapper = document.querySelector(".ficha-wrapper");

        if (!wrapper) {
            console.error("FOTO: .ficha-wrapper não foi encontrada.");
            return;
        }

        wrapper.appendChild(this.btnFoto);
    }

    criarModalSeNecessario() {
        this.modal = document.getElementById("modal-foto-personagem");

        if (this.modal) {
            return;
        }

        this.modal = document.createElement("div");
        this.modal.id = "modal-foto-personagem";

        this.modal.innerHTML = `
            <div class="modal-container-foto">
                <div class="modal-header-foto">
                    <h2>Ajustar Foto do Personagem</h2>
                    <button type="button" id="fechar-modal-foto" aria-label="Fechar">&times;</button>
                </div>

                <div class="modal-conteudo-foto">
                    <div class="foto-preview-box">
                        <h3>Pré-visualização</h3>
                        <div id="preview-resultado">
                            <span>Sem imagem</span>
                        </div>
                        <p>Assim a imagem aparecerá na ficha.</p>
                    </div>

                    <div class="foto-upload-box">
                        <div id="crop-image-container">
                            <p id="instrucoes-upload">
                                Escolha um PNG de corpo inteiro com fundo transparente.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="modal-footer-foto">
                    <input type="file" id="input-arquivo-foto" accept="image/png" hidden>
                    <button type="button" id="btn-escolher-outra">Escolher outra imagem</button>
                    <button type="button" id="btn-confirmar-foto">Confirmar</button>
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
        this.modal.style.background = "rgba(0, 0, 0, 0.75)";
        this.modal.style.zIndex = "99999";

        const container = this.modal.querySelector(".modal-container-foto");

        if (container) {
            container.style.width = "min(850px, 92vw)";
            container.style.maxHeight = "90vh";
            container.style.overflow = "auto";
            container.style.background = "var(--interna-color, #181818)";
            container.style.border = "1px solid var(--main-color, #555)";
            container.style.borderRadius = "12px";
            container.style.padding = "20px";
            container.style.color = "#fff";
        }

        document.body.appendChild(this.modal);
    }

    buscarElementos() {
        this.btnFoto = document.getElementById("btn-foto-personagem");
        this.modal = document.getElementById("modal-foto-personagem");
        this.inputArquivo = document.getElementById("input-arquivo-foto");
        this.btnEscolher = document.getElementById("btn-escolher-outra");
        this.btnConfirmar = document.getElementById("btn-confirmar-foto");
        this.btnFechar = document.getElementById("fechar-modal-foto");
    }

    configurarEventos() {
        if (this.btnFoto) {
            this.btnFoto.addEventListener("click", evento => {
                evento.preventDefault();
                evento.stopPropagation();
                this.abrirModal();
            });
        }

        if (this.btnFechar) {
            this.btnFechar.addEventListener("click", evento => {
                evento.preventDefault();
                evento.stopPropagation();
                this.fecharModal();
            });
        }

        if (this.btnEscolher && this.inputArquivo) {
            this.btnEscolher.addEventListener("click", evento => {
                evento.preventDefault();
                evento.stopPropagation();
                this.inputArquivo.click();
            });

            this.inputArquivo.addEventListener("change", evento => {
                const arquivo = evento.target.files?.[0];

                if (!arquivo) {
                    return;
                }

                this.validarImagem(arquivo);
                evento.target.value = "";
            });
        }

        if (this.btnConfirmar) {
            this.btnConfirmar.addEventListener("click", async evento => {
                evento.preventDefault();
                evento.stopPropagation();

                if (!this.imagemCarregada && !this.imagemAtualTemp) {
                    alert("Escolha uma imagem antes de confirmar.");
                    return;
                }

                const textoOriginal = this.btnConfirmar.textContent;
                this.btnConfirmar.disabled = true;
                this.btnConfirmar.textContent = "Salvando...";

                try {
                    const preparado = await this.prepararImagemFinalParaConfirmacao();

                    if (!preparado) {
                        return;
                    }

                    const sucesso = await this.confirmarFoto();

                    if (sucesso) {
                        this.fecharModal();
                    }
                } finally {
                    this.btnConfirmar.disabled = false;
                    this.btnConfirmar.textContent = textoOriginal;
                }
            });
        }

        if (this.modal) {
            this.modal.addEventListener("click", evento => {
                if (evento.target === this.modal) {
                    this.fecharModal();
                }
            });
        }

        document.addEventListener("keydown", evento => {
            if (evento.key === "Escape") {
                this.fecharModal();
            }
        });
    }

    abrirModal() {
        if (!this.modal) {
            return;
        }

        this.modal.style.display = "flex";
    }

    fecharModal() {
        if (!this.modal) {
            return;
        }

        this.modal.style.display = "none";
    }

    async inicializarFirebase() {
        try {
            const firebase = await import("../firebase-config.js");

            this.db = firebase.db;
            this.auth = firebase.auth;
            this.doc = firebase.doc;
            this.getDoc = firebase.getDoc;
            this.updateDoc = firebase.updateDoc;

            this.fichaId = localStorage.getItem("fichaIdAtiva");

            if (!this.fichaId) {
                console.warn("FOTO: nenhum ID de ficha encontrado.");
                return;
            }

            this.fichaRef = this.doc(this.db, "fichas", this.fichaId);
            this.firebaseInicializado = true;

            await this.aguardarUsuario();
        } catch (erro) {
            console.error("FOTO: erro ao inicializar Firebase.", erro);
        }
    }

    aguardarUsuario() {
        return new Promise(resolve => {
            if (this.auth.currentUser) {
                this.carregarFotoSalva().then(resolve).catch(() => resolve());
                return;
            }

            let finalizado = false;

            import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js")
                .then(({ onAuthStateChanged }) => {
                    const cancelar = onAuthStateChanged(this.auth, async user => {
                        if (finalizado) {
                            return;
                        }

                        if (user) {
                            finalizado = true;
                            cancelar();

                            try {
                                await this.carregarFotoSalva();
                            } catch (erro) {
                                console.error("FOTO: erro ao carregar foto salva.", erro);
                            }

                            resolve();
                        }
                    });

                    setTimeout(() => {
                        if (!finalizado) {
                            finalizado = true;
                            cancelar();
                            resolve();
                        }
                    }, 10000);
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    async carregarFotoSalva() {
        if (!this.firebaseInicializado || !this.fichaRef) {
            return;
        }

        try {
            const snapshot = await this.getDoc(this.fichaRef);

            if (!snapshot.exists()) {
                return;
            }

            const dados = snapshot.data();

            if (!dados || !dados.fotoUrl) {
                return;
            }

            this.aplicarFotoVisual(dados.fotoUrl);
            this.imagemAtualTemp = dados.fotoUrl;
            this.carregarImagemSalvaParaPreview(dados.fotoUrl);

            console.log("FOTO: imagem salva carregada do Firestore.");
        } catch (erro) {
            console.error("FOTO: erro ao carregar imagem do Firestore.", erro);
        }
    }

    carregarImagemSalvaParaPreview(url) {
        const imagem = new Image();

        imagem.onload = () => {
            this.imagemCarregada = imagem;
            this.precisaRecorte = false;

            this.garantirCanvasPreview();
            this.desenharPreview();
            this.limparAreaRecorte("Foto atual da ficha. Escolha outra imagem para alterar.");
        };

        imagem.onerror = () => {
            console.warn(
                "FOTO: não foi possível pré-carregar a imagem salva para o preview do modal."
            );
        };

        imagem.src = url;
    }

    validarImagem(arquivo) {
        if (arquivo.type !== "image/png") {
            alert("A imagem precisa estar no formato PNG.");
            return;
        }

        if (arquivo.size > this.tamanhoMaximoArquivoBytes) {
            const tamanhoMB = (arquivo.size / (1024 * 1024)).toFixed(2);

            alert(
                `O arquivo é muito grande.\n\n` +
                `Tamanho recebido: ${tamanhoMB} MB\n` +
                `Tamanho máximo permitido: 5 MB`
            );

            return;
        }

        const leitor = new FileReader();

        leitor.onload = evento => {
            const url = evento.target.result;
            const imagem = new Image();

            imagem.onload = () => {
                const largura = imagem.naturalWidth;
                const altura = imagem.naturalHeight;

                if (largura < this.larguraMinima || altura < this.alturaMinima) {
                    alert(
                        `A imagem é muito pequena.\n\n` +
                        `Tamanho recebido: ${largura} x ${altura}px\n` +
                        `Tamanho mínimo: ${this.larguraMinima} x ${this.alturaMinima}px`
                    );

                    return;
                }

                this.prepararImagemCarregada(imagem, largura, altura);
            };

            imagem.onerror = () => {
                alert("Não foi possível carregar o PNG.");
            };

            imagem.src = url;
        };

        leitor.onerror = () => {
            alert("Não foi possível ler o arquivo.");
        };

        leitor.readAsDataURL(arquivo);
    }

    prepararImagemCarregada(imagem, largura, altura) {
        this.imagemCarregada = imagem;
        this.imagemAtualTemp = null;

        this.garantirCanvasPreview();

        const exato = largura === this.larguraMinima && altura === this.alturaMinima;

        if (exato) {
            this.precisaRecorte = false;
            this.limparAreaRecorte("Imagem no tamanho exato — nenhum ajuste necessário.");
            this.desenharPreview();
        } else {
            this.precisaRecorte = true;
            this.iniciarFerramentaCorte(imagem);
        }
    }

    garantirCanvasPreview() {
        const preview = document.getElementById("preview-resultado");

        if (!preview) {
            return null;
        }

        let canvas = document.getElementById("canvas-preview-foto");

        if (!canvas) {
            preview.innerHTML = "";

            canvas = document.createElement("canvas");
            canvas.id = "canvas-preview-foto";
            canvas.width = this.larguraMinima;
            canvas.height = this.alturaMinima;

            canvas.style.width = "100%";
            canvas.style.height = "auto";
            canvas.style.display = "block";
            canvas.style.margin = "0 auto";
            canvas.style.background =
                "repeating-conic-gradient(#2a2a2a 0% 25%, #1c1c1c 0% 50%) 50% / 16px 16px";

            preview.appendChild(canvas);
        }

        this.canvasPreview = canvas;
        return canvas;
    }

    limparAreaRecorte(mensagem) {
        const areaRecorte = document.getElementById("crop-image-container");

        if (!areaRecorte) {
            return;
        }

        areaRecorte.innerHTML = "";

        const texto = document.createElement("p");
        texto.textContent = mensagem;
        texto.style.opacity = "0.8";
        texto.style.fontSize = "13px";

        areaRecorte.appendChild(texto);
    }

    iniciarFerramentaCorte(imagem) {
        const areaRecorte = document.getElementById("crop-image-container");

        if (!areaRecorte) {
            return;
        }

        areaRecorte.innerHTML = "";

        const alturaViewport = Math.min(window.innerHeight * 0.5, 560);
        const larguraViewport = alturaViewport * (this.larguraMinima / this.alturaMinima);

        this.cropViewportLargura = larguraViewport;
        this.cropViewportAltura = alturaViewport;

        const viewport = document.createElement("div");
        viewport.id = "crop-viewport";
        viewport.style.position = "relative";
        viewport.style.width = `${larguraViewport}px`;
        viewport.style.height = `${alturaViewport}px`;
        viewport.style.overflow = "hidden";
        viewport.style.margin = "0 auto";
        viewport.style.background = "#000";
        viewport.style.border = "1px solid var(--main-color, #555)";
        viewport.style.borderRadius = "6px";
        viewport.style.cursor = "grab";
        viewport.style.touchAction = "none";
        viewport.style.userSelect = "none";

        const imgArraste = document.createElement("img");
        imgArraste.src = imagem.src;
        imgArraste.draggable = false;
        imgArraste.alt = "Imagem selecionada";
        imgArraste.style.position = "absolute";
        imgArraste.style.left = "0px";
        imgArraste.style.top = "0px";
        imgArraste.style.maxWidth = "none";
        imgArraste.style.maxHeight = "none";
        imgArraste.style.transformOrigin = "top left";
        imgArraste.style.userSelect = "none";
        imgArraste.style.pointerEvents = "none";

        viewport.appendChild(imgArraste);
        areaRecorte.appendChild(viewport);

        const controles = document.createElement("div");
        controles.id = "crop-controles";
        controles.style.display = "flex";
        controles.style.alignItems = "center";
        controles.style.gap = "8px";
        controles.style.marginTop = "10px";
        controles.style.maxWidth = `${larguraViewport}px`;
        controles.style.marginLeft = "auto";
        controles.style.marginRight = "auto";

        const rotuloZoom = document.createElement("span");
        rotuloZoom.textContent = "Zoom";
        rotuloZoom.style.fontSize = "13px";
        rotuloZoom.style.whiteSpace = "nowrap";

        const sliderZoom = document.createElement("input");
        sliderZoom.type = "range";
        sliderZoom.id = "crop-zoom-slider";
        sliderZoom.min = "0";
        sliderZoom.max = "100";
        sliderZoom.value = "0";
        sliderZoom.style.flex = "1";

        controles.appendChild(rotuloZoom);
        controles.appendChild(sliderZoom);
        areaRecorte.appendChild(controles);

        const dica = document.createElement("p");
        dica.textContent = "Arraste a imagem para posicionar. Use o controle para aplicar zoom.";
        dica.style.fontSize = "12px";
        dica.style.opacity = "0.75";
        dica.style.marginTop = "6px";
        dica.style.textAlign = "center";

        areaRecorte.appendChild(dica);

        const escalaMinima = Math.max(
            larguraViewport / imagem.naturalWidth,
            alturaViewport / imagem.naturalHeight
        );

        this.cropEscalaMinima = escalaMinima;
        this.cropEscalaMaxima = escalaMinima * 3;
        this.cropEscalaAtual = escalaMinima;

        const larguraExibida = imagem.naturalWidth * escalaMinima;
        const alturaExibida = imagem.naturalHeight * escalaMinima;

        this.cropOffsetX = (larguraViewport - larguraExibida) / 2;
        this.cropOffsetY = (alturaViewport - alturaExibida) / 2;

        this.cropImgElemento = imgArraste;
        this.cropViewportElemento = viewport;
        this.cropSliderZoom = sliderZoom;

        this.aplicarTransformCrop();
        this.configurarEventosCrop();
        this.desenharPreview();
    }

    aplicarTransformCrop() {
        if (!this.cropImgElemento || !this.imagemCarregada) {
            return;
        }

        const escala = this.cropEscalaAtual;

        this.cropImgElemento.style.width = `${this.imagemCarregada.naturalWidth * escala}px`;
        this.cropImgElemento.style.height = `${this.imagemCarregada.naturalHeight * escala}px`;
        this.cropImgElemento.style.transform =
            `translate(${this.cropOffsetX}px, ${this.cropOffsetY}px)`;
    }

    clampOffsetsCrop() {
        if (!this.imagemCarregada) {
            return;
        }

        const larguraExibida = this.imagemCarregada.naturalWidth * this.cropEscalaAtual;
        const alturaExibida = this.imagemCarregada.naturalHeight * this.cropEscalaAtual;

        const minX = this.cropViewportLargura - larguraExibida;
        const minY = this.cropViewportAltura - alturaExibida;

        this.cropOffsetX = Math.min(0, Math.max(minX, this.cropOffsetX));
        this.cropOffsetY = Math.min(0, Math.max(minY, this.cropOffsetY));
    }

    configurarEventosCrop() {
        const viewport = this.cropViewportElemento;

        if (!viewport) {
            return;
        }

        let arrastando = false;
        let inicioX = 0;
        let inicioY = 0;
        let offsetInicialX = 0;
        let offsetInicialY = 0;

        const iniciarArraste = (x, y) => {
            arrastando = true;
            inicioX = x;
            inicioY = y;
            offsetInicialX = this.cropOffsetX;
            offsetInicialY = this.cropOffsetY;
            viewport.style.cursor = "grabbing";
        };

        const moverArraste = (x, y) => {
            if (!arrastando) {
                return;
            }

            this.cropOffsetX = offsetInicialX + (x - inicioX);
            this.cropOffsetY = offsetInicialY + (y - inicioY);

            this.clampOffsetsCrop();
            this.aplicarTransformCrop();
            this.desenharPreview();
        };

        const finalizarArraste = () => {
            arrastando = false;
            viewport.style.cursor = "grab";
        };

        viewport.addEventListener("pointerdown", evento => {
            evento.preventDefault();

            try {
                viewport.setPointerCapture(evento.pointerId);
            } catch (erro) {
                // Alguns ambientes não suportam pointer capture; a interação
                // continua funcionando normalmente sem ela.
            }

            iniciarArraste(evento.clientX, evento.clientY);
        });

        viewport.addEventListener("pointermove", evento => {
            if (!arrastando) {
                return;
            }

            evento.preventDefault();
            moverArraste(evento.clientX, evento.clientY);
        });

        viewport.addEventListener("pointerup", finalizarArraste);
        viewport.addEventListener("pointercancel", finalizarArraste);

        viewport.addEventListener("pointerleave", () => {
            if (arrastando) {
                finalizarArraste();
            }
        });

        viewport.addEventListener(
            "wheel",
            evento => {
                evento.preventDefault();

                const direcao = evento.deltaY > 0 ? -1 : 1;
                this.alterarZoom(direcao * 0.05);
            },
            { passive: false }
        );

        if (this.cropSliderZoom) {
            this.cropSliderZoom.addEventListener("input", evento => {
                const percentual = Number(evento.target.value) / 100;
                const amplitude = this.cropEscalaMaxima - this.cropEscalaMinima;
                const novaEscala = this.cropEscalaMinima + percentual * amplitude;

                this.definirZoom(novaEscala, false);
            });
        }
    }

    alterarZoom(deltaPercentual) {
        const amplitude = this.cropEscalaMaxima - this.cropEscalaMinima;
        const novaEscala = this.cropEscalaAtual + deltaPercentual * amplitude;

        this.definirZoom(novaEscala, true);
    }

    definirZoom(novaEscala, atualizarSlider) {
        if (!this.imagemCarregada) {
            return;
        }

        const escalaAnterior = this.cropEscalaAtual;
        const escalaClamp = Math.min(
            this.cropEscalaMaxima,
            Math.max(this.cropEscalaMinima, novaEscala)
        );

        const centroX = this.cropViewportLargura / 2;
        const centroY = this.cropViewportAltura / 2;

        const pontoImagemX = (centroX - this.cropOffsetX) / escalaAnterior;
        const pontoImagemY = (centroY - this.cropOffsetY) / escalaAnterior;

        this.cropEscalaAtual = escalaClamp;

        this.cropOffsetX = centroX - pontoImagemX * escalaClamp;
        this.cropOffsetY = centroY - pontoImagemY * escalaClamp;

        this.clampOffsetsCrop();
        this.aplicarTransformCrop();
        this.desenharPreview();

        if (atualizarSlider && this.cropSliderZoom) {
            const amplitude = this.cropEscalaMaxima - this.cropEscalaMinima || 1;
            const percentual = (escalaClamp - this.cropEscalaMinima) / amplitude;

            this.cropSliderZoom.value = String(Math.round(percentual * 100));
        }
    }

    desenharPreview() {
        if (!this.canvasPreview || !this.imagemCarregada) {
            return;
        }

        const ctx = this.canvasPreview.getContext("2d");

        if (!ctx) {
            return;
        }

        ctx.clearRect(0, 0, this.larguraMinima, this.alturaMinima);

        if (this.precisaRecorte) {
            const sx = -this.cropOffsetX / this.cropEscalaAtual;
            const sy = -this.cropOffsetY / this.cropEscalaAtual;
            const sLargura = this.cropViewportLargura / this.cropEscalaAtual;
            const sAltura = this.cropViewportAltura / this.cropEscalaAtual;

            ctx.drawImage(
                this.imagemCarregada,
                sx,
                sy,
                sLargura,
                sAltura,
                0,
                0,
                this.larguraMinima,
                this.alturaMinima
            );
        } else {
            ctx.drawImage(this.imagemCarregada, 0, 0, this.larguraMinima, this.alturaMinima);
        }
    }

    async prepararImagemFinalParaConfirmacao() {
        if (!this.imagemCarregada) {
            return Boolean(this.imagemAtualTemp);
        }

        if (!this.canvasPreview) {
            this.garantirCanvasPreview();
        }

        this.desenharPreview();

        try {
            const dataUrlFinal = this.comprimirCanvas(this.canvasPreview);
            this.imagemAtualTemp = dataUrlFinal;
            return true;
        } catch (erro) {
            console.error("FOTO: erro ao gerar imagem final.", erro);
            alert("Não foi possível processar a imagem. Tente novamente.");
            return false;
        }
    }

    comprimirCanvas(canvas) {
        let dataUrl = canvas.toDataURL("image/png");

        if (this.tamanhoDataUrlEmBytes(dataUrl) <= this.limiteFirestoreBytes) {
            return dataUrl;
        }

        // PNG ficou grande demais: tenta WebP com transparência, reduzindo a
        // qualidade até caber no orçamento definido para o Firestore.
        // (Se o navegador não suportar codificação WebP em canvas, o próprio
        // toDataURL retorna PNG novamente, então o laço apenas confirma isso
        // e devolve o melhor resultado obtido.)
        let qualidade = 0.92;
        let melhorResultado = dataUrl;

        while (qualidade >= 0.3) {
            const tentativa = canvas.toDataURL("image/webp", qualidade);
            const tamanhoTentativa = this.tamanhoDataUrlEmBytes(tentativa);

            melhorResultado = tentativa;

            if (tamanhoTentativa <= this.limiteFirestoreBytes) {
                return tentativa;
            }

            qualidade -= 0.1;
        }

        console.warn(
            "FOTO: não foi possível reduzir a imagem abaixo do limite recomendado para o " +
            "Firestore. Salvando o melhor resultado obtido."
        );

        return melhorResultado;
    }

    tamanhoDataUrlEmBytes(dataUrl) {
        const virgula = dataUrl.indexOf(",");
        const base64 = virgula >= 0 ? dataUrl.slice(virgula + 1) : dataUrl;

        return Math.ceil((base64.length * 3) / 4);
    }

    aplicarFotoVisual(url) {
        const charImage = document.querySelector(".char-image");

        if (!charImage) {
            console.error("FOTO: .char-image não encontrada.");
            return false;
        }

        charImage.style.setProperty(
            "background",
            `url("${url}") no-repeat center bottom`,
            "important"
        );

        charImage.style.setProperty("background-image", `url("${url}")`, "important");
        charImage.style.setProperty("background-repeat", "no-repeat", "important");
        charImage.style.setProperty("background-position", "center bottom", "important");
        charImage.style.setProperty("background-size", "contain", "important");
        charImage.style.setProperty("filter", "none", "important");
        charImage.style.setProperty("transition", "none", "important");

        charImage.dataset.fotoPersonalizada = "true";

        return true;
    }

    async confirmarFoto() {
        if (!this.imagemAtualTemp) {
            return false;
        }

        const aplicado = this.aplicarFotoVisual(this.imagemAtualTemp);

        if (!aplicado) {
            return false;
        }

        if (!this.firebaseInicializado || !this.fichaRef) {
            alert(
                "A foto foi aplicada na ficha, mas não foi possível conectar ao Firebase para salvá-la."
            );

            return false;
        }

        try {
            await this.updateDoc(this.fichaRef, {
                fotoUrl: this.imagemAtualTemp
            });

            console.log("FOTO: imagem salva permanentemente no Firestore.");
            return true;
        } catch (erro) {
            console.error("FOTO: erro ao salvar imagem no Firestore.", erro);

            alert("A foto foi aplicada na ficha, mas ocorreu um erro ao salvá-la no Firestore.");

            return false;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.gerenciadorFotoPersonagem = new GerenciadorFotoPersonagem();
});