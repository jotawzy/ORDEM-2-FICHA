
import { db, doc, getDoc, updateDoc } from "../firebase-config.js";
import { GerenciadorFotoInventario } from "../foto/foto-inventario.js";

const REPO_API = "https://api.github.com/repos/jotawzy/ORDEM-2-FICHA/contents/";
const REPO_RAW = "https://raw.githubusercontent.com/jotawzy/ORDEM-2-FICHA/main/";
const PASTA_ICONES = "assets/icones-inventario";

let inventarioItens = [];
let editandoIndex = null;
let fotoItemAtual = "";
let iconeItemAtual = "";
let gerenciadorFotoItem = null;
let fichaRef = null;
let caminhoBibliotecaAtual = PASTA_ICONES;
let cacheBiblioteca = new Map();

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function obterUrlIcone(caminho) {
    return REPO_RAW + caminho.split("/").map(encodeURIComponent).join("/");
}

function atualizarPreview() {
    const preview = document.getElementById("preview-foto-item-container");
    if (!preview) return;

    if (iconeItemAtual) {
        preview.innerHTML = `
            <img src="${obterUrlIcone(iconeItemAtual)}"
                style="width:100%;height:100%;object-fit:contain;padding:8px;">
        `;
    } else if (fotoItemAtual) {
        preview.innerHTML = `
            <img src="${fotoItemAtual}"
                style="width:100%;height:100%;object-fit:cover;">
        `;
    } else {
        preview.innerHTML = `
            <span style="font-size:11px;color:#71717a;">Sem foto ou ícone</span>
        `;
    }
}

function adicionarEstilosBiblioteca() {
    if (document.getElementById("estilos-biblioteca-icones")) return;

    const style = document.createElement("style");
    style.id = "estilos-biblioteca-icones";

    style.textContent = `
        #btn-biblioteca-icones {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            padding: 10px 13px;
            border: 1px solid #713b49;
            border-radius: 5px;
            background: #29171d;
            color: #e9dce0;
            font-size: 12px;
            cursor: pointer;
        }

        #btn-biblioteca-icones:hover {
            background: #42212b;
        }

        #modal-biblioteca-icones {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            align-items: center;
            justify-content: center;
            padding: 18px;
            background: rgba(0,0,0,.82);
        }

        #modal-biblioteca-icones.ativo {
            display: flex;
        }

        .biblioteca-painel {
            width: min(720px, 100%);
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #54303a;
            border-radius: 8px;
            background: #171316;
            color: #eee5e8;
            box-shadow: 0 15px 60px #0009;
        }

        .biblioteca-topo {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 17px;
            border-bottom: 1px solid #39252c;
        }

        .biblioteca-topo h3 {
            margin: 0;
            font-size: 16px;
        }

        .biblioteca-fechar,
        .biblioteca-voltar {
            border: 1px solid #493039;
            border-radius: 4px;
            padding: 7px 11px;
            background: #261b20;
            color: #eee5e8;
            cursor: pointer;
        }

        .biblioteca-controles {
            display: flex;
            gap: 8px;
            padding: 12px 17px;
            border-bottom: 1px solid #39252c;
        }

        .biblioteca-breadcrumb {
            min-width: 0;
            overflow: hidden;
            padding: 9px 17px 0;
            color: #b99da6;
            font-size: 11px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        #biblioteca-busca {
            width: 100%;
            min-width: 0;
            padding: 10px;
            border: 1px solid #493039;
            border-radius: 4px;
            outline: none;
            background: #211a1e;
            color: #fff;
        }

        #biblioteca-busca:focus {
            border-color: #a34d64;
        }

        .biblioteca-conteudo {
            min-height: 180px;
            overflow-y: auto;
            padding: 15px 17px 20px;
        }

        .biblioteca-grade {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
            gap: 10px;
        }

        .biblioteca-item {
            min-width: 0;
            min-height: 105px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 9px;
            padding: 12px 7px;
            border: 1px solid #392830;
            border-radius: 5px;
            background: #211a1e;
            color: #e9dce0;
            cursor: pointer;
        }

        .biblioteca-item:hover {
            border-color: #a34d64;
            background: #302027;
        }

        .biblioteca-item img {
            width: 46px;
            height: 46px;
            object-fit: contain;
        }

        .biblioteca-item span {
            max-width: 100%;
            overflow: hidden;
            font-size: 11px;
            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .biblioteca-pasta-icone {
            font-size: 34px;
            line-height: 46px;
        }

        .biblioteca-mensagem {
            padding: 30px 10px;
            color: #aa969d;
            font-size: 13px;
            text-align: center;
        }

        @media(max-width: 500px) {
            #modal-biblioteca-icones {
                padding: 8px;
            }

            .biblioteca-painel {
                max-height: 90vh;
            }

            .biblioteca-grade {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
        }
    `;

    document.head.appendChild(style);
}

function criarModalBiblioteca() {
    if (document.getElementById("modal-biblioteca-icones")) return;

    const modal = document.createElement("div");
    modal.id = "modal-biblioteca-icones";

    modal.innerHTML = `
        <div class="biblioteca-painel">
            <div class="biblioteca-topo">
                <h3>Biblioteca de ícones</h3>
                <button class="biblioteca-fechar" id="biblioteca-fechar">✕</button>
            </div>

            <div class="biblioteca-controles">
                <button class="biblioteca-voltar" id="biblioteca-voltar">← Voltar</button>
                <input id="biblioteca-busca" type="search"
                    placeholder="Buscar nesta pasta...">
            </div>

            <div class="biblioteca-breadcrumb" id="biblioteca-breadcrumb"></div>
            <div class="biblioteca-conteudo" id="biblioteca-conteudo">
                <div class="biblioteca-mensagem">Carregando biblioteca...</div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("biblioteca-fechar").addEventListener("click", fecharBiblioteca);

    modal.addEventListener("click", evento => {
        if (evento.target === modal) fecharBiblioteca();
    });

    document.getElementById("biblioteca-voltar").addEventListener("click", voltarPasta);

    document.getElementById("biblioteca-busca").addEventListener("input", () => {
        renderizarConteudoBiblioteca();
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") fecharBiblioteca();
    });
}

function fecharBiblioteca() {
    document.getElementById("modal-biblioteca-icones")?.classList.remove("ativo");
}

async function buscarPasta(caminho) {
    const cache = cacheBiblioteca.get(caminho);

    if (cache && Date.now() - cache.tempo < 180000) {
        return cache.itens;
    }

    const resposta = await fetch(
        REPO_API + caminho.split("/").map(encodeURIComponent).join("/")
    );

    if (!resposta.ok) {
        throw new Error("Não foi possível carregar esta pasta.");
    }

    const itens = await resposta.json();

    if (!Array.isArray(itens)) {
        throw new Error("A resposta da biblioteca é inválida.");
    }

    cacheBiblioteca.set(caminho, {
        itens,
        tempo: Date.now()
    });

    return itens;
}

async function abrirBiblioteca() {
    caminhoBibliotecaAtual = PASTA_ICONES;

    const modal = document.getElementById("modal-biblioteca-icones");
    modal.classList.add("ativo");

    document.getElementById("biblioteca-busca").value = "";

    await renderizarConteudoBiblioteca();
}

function voltarPasta() {
    if (caminhoBibliotecaAtual === PASTA_ICONES) return;

    const partes = caminhoBibliotecaAtual.split("/");
    partes.pop();

    caminhoBibliotecaAtual = partes.join("/");
    document.getElementById("biblioteca-busca").value = "";

    renderizarConteudoBiblioteca();
}

async function renderizarConteudoBiblioteca() {
    const conteudo = document.getElementById("biblioteca-conteudo");
    const breadcrumb = document.getElementById("biblioteca-breadcrumb");
    const btnVoltar = document.getElementById("biblioteca-voltar");
    const busca = document.getElementById("biblioteca-busca");

    if (!conteudo) return;

    breadcrumb.textContent = caminhoBibliotecaAtual.replaceAll("/", " / ");
    btnVoltar.disabled = caminhoBibliotecaAtual === PASTA_ICONES;
    btnVoltar.style.opacity = btnVoltar.disabled ? ".4" : "1";

    conteudo.innerHTML = `
        <div class="biblioteca-mensagem">Carregando...</div>
    `;

    try {
        const itens = await buscarPasta(caminhoBibliotecaAtual);
        const termo = busca.value.trim().toLowerCase();

        const filtrados = itens.filter(item => {
            if (item.type === "dir") {
                return item.name.toLowerCase().includes(termo);
            }

            return item.type === "file"
                && item.name.toLowerCase().endsWith(".svg")
                && item.name.toLowerCase().includes(termo);
        });

        filtrados.sort((a, b) => {
            if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        if (filtrados.length === 0) {
            conteudo.innerHTML = `
                <div class="biblioteca-mensagem">
                    Nenhuma pasta ou imagem SVG encontrada.
                </div>
            `;
            return;
        }

        const grade = document.createElement("div");
        grade.className = "biblioteca-grade";

        filtrados.forEach(item => {
            const botao = document.createElement("button");
            botao.className = "biblioteca-item";

            if (item.type === "dir") {
                botao.innerHTML = `
                    <div class="biblioteca-pasta-icone">📁</div>
                    <span>${escaparHTML(item.name)}</span>
                `;

                botao.addEventListener("click", () => {
                    caminhoBibliotecaAtual = item.path;
                    busca.value = "";
                    renderizarConteudoBiblioteca();
                });
            } else {
                const imagem = document.createElement("img");
                imagem.src = item.download_url || obterUrlIcone(item.path);
                imagem.alt = item.name;

                const nome = document.createElement("span");
                nome.textContent = item.name.replace(/\.svg$/i, "");

                botao.append(imagem, nome);

                botao.addEventListener("click", () => {
                    selecionarIcone(item.path);
                });
            }

            grade.appendChild(botao);
        });

        conteudo.innerHTML = "";
        conteudo.appendChild(grade);

    } catch (erro) {
        console.error("Erro na biblioteca de ícones:", erro);

        conteudo.innerHTML = `
            <div class="biblioteca-mensagem">
                Não foi possível carregar os ícones.<br>
                Verifique se a pasta existe no GitHub e tente novamente.
            </div>
        `;
    }
}

function selecionarIcone(caminho) {
    iconeItemAtual = caminho;
    fotoItemAtual = "";

    atualizarPreview();
    fecharBiblioteca();
}

function iniciarInventario() {
    const modalAddItem = document.getElementById("modal-add-item");
    const btnAbrirModalItem = document.getElementById("btn-abrir-modal-item");
    const modalItemFechar = document.getElementById("modal-item-fechar");
    const btnSalvarItem = document.getElementById("btn-salvar-item");
    const btnAbrirCorte = document.getElementById("btn-abrir-corte-foto-item");
    const previewContainer = document.getElementById("preview-foto-item-container");

    adicionarEstilosBiblioteca();
    criarModalBiblioteca();

    if (btnAbrirCorte) {
        const btnBiblioteca = document.createElement("button");
        btnBiblioteca.type = "button";
        btnBiblioteca.id = "btn-biblioteca-icones";
        btnBiblioteca.textContent = "Biblioteca de ícones";

        btnAbrirCorte.insertAdjacentElement("afterend", btnBiblioteca);

        btnBiblioteca.addEventListener("click", abrirBiblioteca);
    }

    gerenciadorFotoItem = new GerenciadorFotoInventario(novaFotoUrl => {
        fotoItemAtual = novaFotoUrl;
        iconeItemAtual = "";
        atualizarPreview();
    });

    if (btnAbrirCorte) {
        btnAbrirCorte.addEventListener("click", () => {
            iconeItemAtual = "";
            gerenciadorFotoItem.abrirModalParaEscolha(fotoItemAtual);
        });
    }

    if (previewContainer) {
        previewContainer.addEventListener("click", () => {
            iconeItemAtual = "";
            gerenciadorFotoItem.abrirModalParaEscolha(fotoItemAtual);
        });
    }

    const fichaId = localStorage.getItem("fichaIdAtiva");

    if (fichaId) {
        fichaRef = doc(db, "fichas", fichaId);
        carregarInventarioDoFirestore();
    }

    if (btnAbrirModalItem) {
        btnAbrirModalItem.addEventListener("click", () => {
            editandoIndex = null;
            fotoItemAtual = "";
            iconeItemAtual = "";

            document.getElementById("input-item-nome").value = "";
            document.getElementById("input-item-categoria").value = "0";
            document.getElementById("input-item-espacos").value = "1";
            document.getElementById("input-item-sub").value = "";
            document.getElementById("input-item-desc").value = "";

            atualizarPreview();

            if (modalAddItem) modalAddItem.classList.add("ativo");
        });
    }

    if (modalItemFechar) {
        modalItemFechar.addEventListener("click", () => {
            if (modalAddItem) modalAddItem.classList.remove("ativo");
        });
    }

    if (btnSalvarItem) {
        btnSalvarItem.addEventListener("click", async () => {
            const nome = document.getElementById("input-item-nome")?.value.trim();
            const categoria = document.getElementById("input-item-categoria")?.value || 0;
            const espacos = Number(document.getElementById("input-item-espacos")?.value) || 1;
            const subtitulo = document.getElementById("input-item-sub")?.value.trim();
            const descricao = document.getElementById("input-item-desc")?.value.trim();

            if (!nome) {
                alert("Por favor, informe o nome do item.");
                return;
            }

            const dadosItem = {
                nome,
                categoria,
                espacos,
                subtitulo,
                descricao,
                foto: fotoItemAtual,
                icone: iconeItemAtual
            };

            if (editandoIndex !== null) {
                inventarioItens[editandoIndex] = dadosItem;
            } else {
                inventarioItens.push(dadosItem);
            }

            editandoIndex = null;
            fotoItemAtual = "";
            iconeItemAtual = "";

            if (modalAddItem) modalAddItem.classList.remove("ativo");

            renderizarInventario();
            await salvarInventarioNoFirestore();
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarInventario);
} else {
    iniciarInventario();
}

async function carregarInventarioDoFirestore() {
    if (!fichaRef) return;

    try {
        const snap = await getDoc(fichaRef);

        if (snap.exists()) {
            const dados = snap.data();

            if (Array.isArray(dados.inventario)) {
                inventarioItens = dados.inventario;
                renderizarInventario();
            }
        }
    } catch (erro) {
        console.error("Erro ao carregar inventário:", erro);
    }
}

async function salvarInventarioNoFirestore() {
    if (!fichaRef) return;

    try {
        await updateDoc(fichaRef, {
            inventario: inventarioItens
        });
    } catch (erro) {
        console.error("Erro ao salvar inventário:", erro);
    }
}

function renderizarInventario() {
    const listaInventario = document.getElementById("lista-inventario");
    const pesoAtualSpan = document.getElementById("peso-atual");

    if (!listaInventario) return;

    listaInventario.innerHTML = "";

    const totalEspacos = inventarioItens.reduce(
        (acc, item) => acc + Number(item.espacos || 0), 0
    );

    if (pesoAtualSpan) pesoAtualSpan.textContent = totalEspacos;

    if (inventarioItens.length === 0) {
        listaInventario.innerHTML = `<div>Nenhum item no inventário.</div>`;
        return;
    }

    const colunaEsquerda = document.createElement("div");
    colunaEsquerda.className = "inventario-coluna";

    const colunaDireita = document.createElement("div");
    colunaDireita.className = "inventario-coluna";

    inventarioItens.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "item-card";

        const imagemItem = item.icone
            ? `<img src="${obterUrlIcone(item.icone)}" style="width:70px;height:70px;object-fit:contain;float:left;margin-right:12px;margin-bottom:5px;">`
            : item.foto
                ? `<img src="${item.foto}" style="width:70px;height:70px;object-fit:cover;float:left;margin-right:12px;margin-bottom:5px;">`
                : "";

        card.innerHTML = `
            <div class="item-header">
                <div class="item-info-principal">
                    <button class="item-seta">▼</button>
                    <span class="item-nome">${escaparHTML(item.nome)}</span>
                </div>
                <div class="item-detalhes-resumo">
                    <span>Categoria: ${escaparHTML(item.categoria)}</span>
                    <span>Espaços: ${escaparHTML(item.espacos)}</span>
                </div>
            </div>
            <div class="item-corpo-expandido">
                ${imagemItem}
                ${item.subtitulo ? `<div class="item-subtitulo">${escaparHTML(item.subtitulo)}</div>` : ""}
                <div class="item-descricao">${escaparHTML(item.descricao || "Sem descrição.")}</div>
                <div style="clear:both;"></div>
                <div class="item-acoes">
                    <button class="btn-editar-item" data-index="${index}">Editar</button>
                    <button class="btn-remover-item" data-index="${index}">Remover</button>
                </div>
            </div>
        `;

        card.querySelector(".item-header").addEventListener("click", () => {
            card.classList.toggle("expandido");
        });

        card.querySelector(".btn-editar-item").addEventListener("click", evento => {
            evento.stopPropagation();
            abrirModalEdicao(index);
        });

        card.querySelector(".btn-remover-item").addEventListener("click", evento => {
            evento.stopPropagation();
            removerItem(index);
        });

        if (index % 2 === 0) {
            colunaEsquerda.appendChild(card);
        } else {
            colunaDireita.appendChild(card);
        }
    });

    listaInventario.append(colunaEsquerda, colunaDireita);
}

function abrirModalEdicao(index) {
    const item = inventarioItens[index];
    if (!item) return;

    editandoIndex = index;
    fotoItemAtual = item.foto || "";
    iconeItemAtual = item.icone || "";

    document.getElementById("input-item-nome").value = item.nome || "";
    document.getElementById("input-item-categoria").value = item.categoria ?? "0";
    document.getElementById("input-item-espacos").value = item.espacos ?? "1";
    document.getElementById("input-item-sub").value = item.subtitulo || "";
    document.getElementById("input-item-desc").value = item.descricao || "";

    atualizarPreview();

    document.getElementById("modal-add-item")?.classList.add("ativo");
}

async function removerItem(index) {
    const item = inventarioItens[index];
    if (!item) return;

    const confirmar = confirm(
        `Tem certeza que deseja excluir "${item.nome}" do inventário?`
    );

    if (!confirmar) return;

    inventarioItens.splice(index, 1);

    renderizarInventario();
    await salvarInventarioNoFirestore();
}
