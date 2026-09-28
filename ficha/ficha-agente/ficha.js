import { db, doc, updateDoc, getDoc, auth } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const FICHA_ID_KEY = "fichaIdAtiva";
const COLECAO = "fichas";
const URL_LOGIN = "../auth/login.html";
const URL_PAINEL = "criar-ficha.html";
const DEBOUNCE = 500;
const TEMPO_EXPIRACAO_MS = 25 * 60 * 1000;

let fichaId = null;
let fichaRef = null;
let carregada = false;
let timerSalvamento = null;
let filaSalvamento = Promise.resolve();
let observadores = [];
let historicoLocal = [];

const root = document.documentElement;

const temas = {
    vigilante: {
        body: "vigilante",
        dropdown: "bg-verde",
        main: "--green-main",
        light: "--green-light",
        bright: "--green-bright",
        interna: "--green-interna",
        externa: "--green-externa",
        check: "--green-check"
    },
    analista: {
        body: "analista",
        dropdown: "bg-azul",
        main: "--blue-main",
        light: "--blue-light",
        bright: "--blue-bright",
        interna: "--blue-interna",
        externa: "--blue-externa",
        check: "--blue-check"
    },
    executor: {
        body: "executor",
        dropdown: "bg-vermelho",
        main: "--red-main",
        light: "--red-light",
        bright: "--red-bright",
        interna: "--red-interna",
        externa: "--red-externa",
        check: "--red-check"
    },
    medico: {
        body: "analista",
        dropdown: "bg-azul",
        main: "--blue-main",
        light: "--blue-light",
        bright: "--blue-bright",
        interna: "--blue-interna",
        externa: "--blue-externa",
        check: "--blue-check"
    }
};

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function numero(valor, padrao = 0) {
    const n = parseInt(String(valor ?? "").replace(/[^\d-]/g, ""), 10);
    return Number.isFinite(n) ? n : padrao;
}

function getDadoFaces(elemento) {
    if (!elemento) return 0;

    const dataVal = numero(elemento.getAttribute("data-val"), 0);
    if (dataVal > 0) return dataVal;

    for (const classe of elemento.classList) {
        if (/^d\d+$/.test(classe)) {
            const faces = numero(classe.substring(1), 0);
            if (faces > 0) return faces;
        }
    }

    return numero(elemento.textContent, 0);
}

function getDadoClasse(elemento) {
    const faces = getDadoFaces(elemento);
    return faces > 0 ? `d${faces}` : "";
}

function definirDado(elemento, faces) {
    if (!elemento || !faces) return;

    [4, 6, 8, 10, 12, 20].forEach(valor => {
        elemento.classList.remove(`d${valor}`);
    });

    elemento.classList.add(`d${faces}`);
    elemento.setAttribute("data-val", String(faces));
    elemento.textContent = String(faces);
}

function aplicarTema(perfil) {
    const chave = normalizar(perfil);
    const tema = temas[chave] || temas.vigilante;

    document.body.classList.remove("vigilante", "analista", "executor");
    document.body.classList.add(tema.body);

    const dropdown = document.getElementById("classe-dropdown");
    if (dropdown) {
        dropdown.classList.remove("bg-verde", "bg-azul", "bg-vermelho");
        dropdown.classList.add(tema.dropdown);
    }

    const valores = {};
    Object.entries(tema).forEach(([chaveTema, variavel]) => {
        if (["body", "dropdown"].includes(chaveTema)) return;
        const valor = getComputedStyle(root).getPropertyValue(variavel).trim();
        if (valor) valores[chaveTema] = valor;
    });

    const aliases = {
        main: ["--main", "--primary", "--primary-color", "--main-color", "--theme-main", "--color-main", "--cor-principal"],
        light: ["--main-light", "--primary-light", "--primary-color-light", "--theme-light", "--color-light"],
        bright: ["--main-bright", "--primary-bright", "--primary-color-bright", "--theme-bright", "--color-bright"],
        interna: ["--main-interna", "--primary-interna", "--theme-interna", "--color-interna"],
        externa: ["--main-externa", "--primary-externa", "--theme-externa", "--color-externa"],
        check: ["--main-check", "--primary-check", "--theme-check", "--color-check"]
    };

    Object.entries(aliases).forEach(([tipo, nomes]) => {
        if (!valores[tipo]) return;
        nomes.forEach(nome => root.style.setProperty(nome, valores[tipo]));
    });

    root.dataset.theme = chave;
    document.body.dataset.theme = chave;
}

function obterElementosPrincipais() {
    return {
        nome: document.querySelector(".char-name"),
        classe: document.getElementById("classe-dropdown"),
        ocupacao: document.querySelector(".btn-medico"),
        nivel: document.getElementById("nivel-dropdown"),
        pv: document.getElementById("val-pv"),
        pd: document.getElementById("val-pd")
    };
}

function obterEstadoQuadrados(container) {
    if (!container) return [];
    return [...container.querySelectorAll(".cb:not(.cb-vazio)")].map(elemento => elemento.classList.contains("active"));
}

function renderizarQuadrados(containerId, quantidade, estados = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    let total = Math.max(0, numero(quantidade, 0));

    for (let i = 0; i < total; i++) {
        const cb = document.createElement("div");
        cb.className = "cb";
        if (estados[i]) cb.classList.add("active");

        cb.addEventListener("click", () => {
            cb.classList.toggle("active");
            agendarSalvamento();
        });

        container.appendChild(cb);
    }
}

function atualizarGradePorValor(idValor, idGrid, estados = []) {
    const valor = document.getElementById(idValor);
    if (!valor) return;
    renderizarQuadrados(idGrid, numero(valor.textContent, 0), estados);
}

function coletarAtributos() {
    const resultado = {};
    [
        ["fisico", ".attr-fisico .attr-dado"],
        ["mente", ".attr-mente .attr-dado"],
        ["emocao", ".attr-emocao .attr-dado"]
    ].forEach(([nome, seletor]) => {
        const elemento = document.querySelector(seletor);
        resultado[nome] = {
            faces: getDadoFaces(elemento),
            dado: getDadoClasse(elemento)
        };
    });
    return resultado;
}

function restaurarAtributos(atributos) {
    if (!atributos || typeof atributos !== "object") return;
    [
        ["fisico", ".attr-fisico .attr-dado"],
        ["mente", ".attr-mente .attr-dado"],
        ["emocao", ".attr-emocao .attr-dado"]
    ].forEach(([nome, seletor]) => {
        const elemento = document.querySelector(seletor);
        const salvo = atributos[nome];
        if (!elemento || !salvo) return;

        const faces = numero(salvo.faces ?? salvo.valor ?? salvo.dado, 6);
        if (faces > 0) definirDado(elemento, faces);
    });
}

function coletarPericias() {
    return [...document.querySelectorAll(".peri-linha")].map((linha, indice) => {
        const dado1 = linha.querySelector(".peri-dado-1");
        const dado2 = linha.querySelector(".peri-dado-2");
        const attrSelect = linha.querySelector(".peri-attr-select");
        const subSelect = linha.querySelector(".peri-subselect");
        const nome = linha.querySelector(".peri-nome");

        return {
            indice,
            nome: nome ? nome.childNodes[0]?.textContent.trim() || nome.textContent.trim() : "",
            dado1: { faces: getDadoFaces(dado1), dado: getDadoClasse(dado1) },
            dado2: { faces: getDadoFaces(dado2), dado: getDadoClasse(dado2) },
            atributo: attrSelect?.value || "",
            subatributo: subSelect?.value || ""
        };
    });
}

function restaurarPericias(pericias) {
    if (!Array.isArray(pericias)) return;
    const linhas = [...document.querySelectorAll(".peri-linha")];

    pericias.forEach((salva, indice) => {
        const linha = linhas[indice];
        if (!linha || !salva) return;

        const dado1 = linha.querySelector(".peri-dado-1");
        const dado2 = linha.querySelector(".peri-dado-2");
        const attrSelect = linha.querySelector(".peri-attr-select");
        const subSelect = linha.querySelector(".peri-subselect");

        if (dado1 && salva.dado1) definirDado(dado1, numero(salva.dado1.faces ?? salva.dado1.valor, 4));
        if (dado2 && salva.dado2) definirDado(dado2, numero(salva.dado2.faces ?? salva.dado2.valor, 6));
        if (attrSelect && salva.atributo) attrSelect.value = salva.atributo;
        if (subSelect && salva.subatributo) subSelect.value = salva.subatributo;
    });
}

function coletarCheckboxes() {
    const checkboxes = [...document.querySelectorAll('input[type="checkbox"]:not(.modal-overlay input):not(#modal-nova-habilidade input):not(#modal-editar-habilidade input)')];
    return checkboxes.map((elemento, indice) => ({
        indice,
        id: elemento.id || "",
        name: elemento.name || "",
        checked: elemento.checked,
        value: elemento.value || ""
    }));
}

function restaurarCheckboxes(lista) {
    if (!Array.isArray(lista)) return;
    const checkboxes = [...document.querySelectorAll('input[type="checkbox"]:not(#modal-nova-habilidade input):not(#modal-editar-habilidade input)')];

    lista.forEach((salvo, indice) => {
        let elemento = salvo.id ? document.getElementById(salvo.id) : null;
        if (!elemento && salvo.name) {
            elemento = document.querySelector(`input[type="checkbox"][name="${CSS.escape(salvo.name)}"]`);
        }
        if (!elemento) elemento = checkboxes[indice];
        if (elemento) elemento.checked = Boolean(salvo.checked);
    });
}

function coletarHabilidades() {
    return [...document.querySelectorAll("#lista-habilidades > .hab-container")].map((container, indice) => {
        const titulo = container.querySelector(".hab-titulo-fundo");
        const texto = container.querySelector(".hab-texto");
        const tracks = [...container.querySelectorAll(".hab-barra-track")];

        const caixas = tracks.flatMap(track =>
            [...track.querySelectorAll(".cb:not(.cb-vazio)")].map(cb => cb.classList.contains("active"))
        );

        return {
            ordem: indice,
            id: container.dataset.id || `hab_${Date.now()}_${indice}`,
            nome: titulo?.textContent.trim() || "",
            descricaoHtml: texto?.innerHTML.trim() || "",
            temBarra: tracks.length > 0,
            qtdBarra: caixas.length,
            caixasAtivas: caixas
        };
    });
}

function renderizarHabilidadeFallback(habilidade) {
    const lista = document.getElementById("lista-habilidades");
    if (!lista) return null;

    const container = document.createElement("div");
    container.className = "hab-container";
    container.dataset.id = habilidade.id || `hab_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    let barraHtml = "";
    if (habilidade.temBarra && numero(habilidade.qtdBarra, 0) > 0) {
        let criados = 0;
        const total = numero(habilidade.qtdBarra, 0);

        while (criados < total) {
            const quantidade = Math.min(10, total - criados);
            barraHtml += '<div class="hab-barra-track">';
            for (let i = 0; i < 10; i++) {
                barraHtml += i < quantidade ? '<div class="cb"></div>' : '<div class="cb cb-vazio"></div>';
            }
            barraHtml += "</div>";
            criados += quantidade;
        }
    }

    container.innerHTML = `
        <div class="hab-titulo-fundo">${habilidade.nome || ""}</div>
        <div class="linha-hab-decorativa"></div>
        ${barraHtml}
        <div class="hab-texto">${habilidade.descricaoHtml || ""}</div>
    `;

    container.querySelectorAll(".hab-barra-track .cb:not(.cb-vazio)").forEach(cb => {
        cb.addEventListener("click", () => {
            cb.classList.toggle("active");
            agendarSalvamento();
        });
    });

    lista.appendChild(container);
    return container;
}

function restaurarHabilidades(habilidades) {
    const lista = document.getElementById("lista-habilidades");
    if (!lista || !Array.isArray(habilidades)) return;

    lista.innerHTML = "";
    habilidades
        .sort((a, b) => numero(a.ordem, 0) - numero(b.ordem, 0))
        .forEach(habilidade => {
            let container = null;
            if (window.gerenciadorHabilidades && typeof window.gerenciadorHabilidades.adicionarHabilidadeNaInterface === "function") {
                window.gerenciadorHabilidades.adicionarHabilidadeNaInterface(habilidade);
                container = lista.querySelector(`[data-id="${CSS.escape(habilidade.id)}"]`) || lista.lastElementChild;
            } else {
                container = renderizarHabilidadeFallback(habilidade);
            }

            if (!container) return;

            const caixas = [...container.querySelectorAll(".hab-barra-track .cb:not(.cb-vazio)")];
            const estados = Array.isArray(habilidade.caixasAtivas) ? habilidade.caixasAtivas : [];

            caixas.forEach((cb, indice) => {
                cb.classList.toggle("active", Boolean(estados[indice]));
            });

            container.dataset.id = habilidade.id || container.dataset.id;
        });
}

function limparRolagensExpiradas(historico) {
    if (!Array.isArray(historico)) return [];
    const agora = Date.now();
    return historico
        .filter(item => item && item.timestamp && (agora - item.timestamp) < TEMPO_EXPIRACAO_MS)
        .slice(-50);
}

function renderizarHistoricoUI(historico) {
    const container = document.getElementById("lista-historico-rolagens");
    if (!container) return;

    const rolagensValidas = limparRolagensExpiradas(historico).reverse();

    if (rolagensValidas.length === 0) {
        container.innerHTML = '<p class="historico-vazio">Nenhuma rolagem recente nos últimos 25 minutos.</p>';
        return;
    }

    const agora = Date.now();
    container.innerHTML = rolagensValidas.map(item => {
        const minAtras = Math.floor((agora - item.timestamp) / 60000);
        const tempoTexto = minAtras < 1 ? "Agora mesmo" : `há ${minAtras} min`;
        const detalhe = item.detalheTexto ? `<span class="hist-card-detalhe">${item.detalheTexto}</span>` : '';
        const classeDado = item.dadoClasse ? item.dadoClasse : '';

        return `
            <div class="item-historico-card">
                <div class="hist-card-esq">
                    <div class="hist-card-dado-icone ${classeDado}"></div>
                    <div class="hist-card-textos">
                        <span class="hist-card-titulo">${item.titulo}</span>
                        ${detalhe}
                        <span class="hist-card-tempo">${tempoTexto}</span>
                    </div>
                </div>
                <span class="hist-card-resultado">${item.resultadoTexto}</span>
            </div>
        `;
    }).join("");
}

window.adicionarRolagemHistorico = async function(novaRolagem) {
    if (!carregada || !fichaRef) return;

    const item = {
        id: `roll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        titulo: novaRolagem.titulo || "Rolagem",
        detalheTexto: novaRolagem.detalheTexto || null,
        resultadoTexto: novaRolagem.resultadoTexto,
        dadoClasse: novaRolagem.dadoClasse || "",
        timestamp: Date.now()
    };

    historicoLocal = limparRolagensExpiradas([...historicoLocal, item]);
    renderizarHistoricoUI(historicoLocal);

    try {
        await updateDoc(fichaRef, { historicoRolagens: historicoLocal });
    } catch (erro) {
        console.error("Erro ao salvar histórico de rolagem:", erro);
    }
};

function obterEstadoAtual() {
    const principais = obterElementosPrincipais();

    const nome = principais.nome?.textContent.trim() || "";
    const perfil = principais.classe?.value || "vigilante";
    const perfilTexto = principais.classe?.options[principais.classe.selectedIndex]?.text.trim() || perfil;
    const ocupacao = principais.ocupacao?.textContent.trim() || "";
    const nivel = numero(principais.nivel?.value, 1);
    const pv = numero(principais.pv?.textContent, 0);
    const pd = numero(principais.pd?.textContent, 0);

    historicoLocal = limparRolagensExpiradas(historicoLocal);

    return {
        nome,
        perfil,
        perfilNome: perfilTexto,
        classe: perfil,
        classeNome: perfilTexto,
        ocupacao,
        nivel,
        pv,
        pd,
        atributos: coletarAtributos(),
        pericias: coletarPericias(),
        habilidades: coletarHabilidades(),
        pvQuadrados: obterEstadoQuadrados(document.getElementById("grid-pv")),
        pdQuadrados: obterEstadoQuadrados(document.getElementById("grid-pd")),
        checkboxes: coletarCheckboxes(),
        historicoRolagens: historicoLocal
    };
}

function aplicarEstadoFicha(dados) {
    if (!dados || typeof dados !== "object") return;

    const principais = obterElementosPrincipais();

    if (dados.nome !== undefined && principais.nome) principais.nome.textContent = String(dados.nome);

    const perfilSalvo = dados.perfil ?? dados.classe ?? "vigilante";

    if (principais.classe) {
        principais.classe.value = String(perfilSalvo);
        const existe = [...principais.classe.options].some(option => option.value === String(perfilSalvo));

        if (!existe) {
            const normalizado = normalizar(perfilSalvo);
            const opcao = [...principais.classe.options].find(option => normalizar(option.value) === normalizado || normalizar(option.textContent) === normalizado);
            if (opcao) principais.classe.value = opcao.value;
        }
    }

    if (dados.ocupacao !== undefined && principais.ocupacao) principais.ocupacao.textContent = String(dados.ocupacao);
    if (dados.nivel !== undefined && principais.nivel) principais.nivel.value = String(dados.nivel);
    if (dados.pv !== undefined && principais.pv) principais.pv.textContent = String(dados.pv);
    if (dados.pd !== undefined && principais.pd) principais.pd.textContent = String(dados.pd);

    aplicarTema(principais.classe?.value || perfilSalvo);

    atualizarGradePorValor("val-pv", "grid-pv", dados.pvQuadrados || dados.vida?.quadrados || []);
    atualizarGradePorValor("val-pd", "grid-pd", dados.pdQuadrados || dados.pdEstado?.quadrados || []);

    restaurarAtributos(dados.atributos || dados.dados?.atributos);
    restaurarPericias(dados.pericias || dados.dados?.pericias);
    restaurarHabilidades(dados.habilidades || dados.dados?.habilidades || []);
    restaurarCheckboxes(dados.checkboxes || dados.dados?.checkboxes || []);

    historicoLocal = limparRolagensExpiradas(dados.historicoRolagens || dados.dados?.historicoRolagens || []);
    renderizarHistoricoUI(historicoLocal);

    aplicarTema(principais.classe?.value || dados.perfil || dados.classe || "vigilante");
}

function prepararHabilidadesExistentes() {
    document.querySelectorAll("#lista-habilidades .hab-barra-track .cb:not(.cb-vazio)").forEach(cb => {
        if (cb.dataset.fichaListener === "true") return;
        cb.dataset.fichaListener = "true";
        cb.addEventListener("click", () => agendarSalvamento());
    });
}

function coletarDados() {
    const estado = obterEstadoAtual();
    return {
        ...estado,
        dados: { ...estado }
    };
}

async function salvarAgora() {
    if (!fichaRef || !carregada) return false;

    const dados = coletarDados();
    filaSalvamento = filaSalvamento.catch(() => {}).then(() => updateDoc(fichaRef, dados));

    try {
        await filaSalvamento;
        return true;
    } catch (erro) {
        console.error("Erro ao salvar ficha:", erro);
        return false;
    }
}

function agendarSalvamento() {
    if (!carregada) return;
    clearTimeout(timerSalvamento);
    timerSalvamento = setTimeout(() => salvarAgora(), DEBOUNCE);
}

function configurarObservador(elemento) {
    if (!elemento) return;

    const observer = new MutationObserver(() => {
        if (carregada) agendarSalvamento();
    });

    observer.observe(elemento, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["class", "data-val", "style"]
    });

    observadores.push(observer);
}

function configurarEventos() {
    document.addEventListener("input", event => {
        const alvo = event.target;
        if (alvo instanceof Element && (alvo.closest(".char-name") || alvo.id === "val-pv" || alvo.id === "val-pd" || alvo.closest(".btn-medico"))) {
            agendarSalvamento();
        }
    });

    document.addEventListener("change", event => {
        const alvo = event.target;
        if (alvo instanceof Element) {
            if (alvo.closest("#classe-dropdown")) {
                aplicarTema(document.getElementById("classe-dropdown")?.value);
                agendarSalvamento();
                return;
            }
            if (alvo.closest("#nivel-dropdown") || alvo.closest(".peri-attr-select") || alvo.closest(".peri-subselect") || alvo.closest('input[type="checkbox"]')) {
                agendarSalvamento();
            }
        }
    });

    document.addEventListener("click", event => {
        if (!(event.target instanceof Element)) return;

        if (event.target.closest("#btn-voltar-painel") || event.target.closest(".btn-voltar")) return;

        if (event.target.closest(".cb") || event.target.closest(".attr-dado") || event.target.closest(".peri-dado-1") || event.target.closest(".peri-dado-2") || event.target.closest("#btn-adicionar-habilidade") || event.target.closest(".btn-editar") || event.target.closest(".hab-container")) {
            agendarSalvamento();
        }
    });

    const btnHistorico = document.getElementById("btn-historico");
    const modalHistorico = document.getElementById("modal-historico");
    const btnFecharHistorico = document.getElementById("btn-fechar-historico");

    if (btnHistorico && modalHistorico) {
        btnHistorico.addEventListener("click", () => {
            historicoLocal = limparRolagensExpiradas(historicoLocal);
            renderizarHistoricoUI(historicoLocal);
            modalHistorico.classList.remove("hidden");
        });
    }

    if (btnFecharHistorico && modalHistorico) {
        btnFecharHistorico.addEventListener("click", () => modalHistorico.classList.add("hidden"));
    }

    if (modalHistorico) {
        modalHistorico.addEventListener("click", (e) => {
            if (e.target === modalHistorico) modalHistorico.classList.add("hidden");
        });
    }

    document.addEventListener("click", async event => {
        if (!(event.target instanceof Element)) return;

        const botao = event.target.closest("#btn-voltar-painel, .btn-voltar");
        if (!botao) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        clearTimeout(timerSalvamento);
        const salvo = await salvarAgora();

        if (salvo) {
            window.location.href = URL_PAINEL;
        }
    }, true);

    window.addEventListener("pagehide", () => {
        if (!carregada) return;
        clearTimeout(timerSalvamento);
    });
}

function iniciarObservadores() {
    observadores.forEach(observer => observer.disconnect());
    observadores = [];

    [
        ".char-name",
        "#val-pv",
        "#val-pd",
        ".attr-fisico .attr-dado",
        ".attr-mente .attr-dado",
        ".attr-emocao .attr-dado",
        ".pericias-container",
        "#grid-pv",
        "#grid-pd",
        "#lista-habilidades"
    ].forEach(seletor => configurarObservador(document.querySelector(seletor)));
}

async function carregarFicha() {
    fichaId = localStorage.getItem(FICHA_ID_KEY);

    if (!fichaId) {
        window.location.href = URL_PAINEL;
        return;
    }

    fichaRef = doc(db, COLECAO, fichaId);

    try {
        const snapshot = await getDoc(fichaRef);

        if (!snapshot.exists()) {
            localStorage.removeItem(FICHA_ID_KEY);
            window.location.href = URL_PAINEL;
            return;
        }

        aplicarEstadoFicha(snapshot.data());
        prepararHabilidadesExistentes();
        carregada = true;
        iniciarObservadores();
    } catch (erro) {
        console.error("Erro ao carregar ficha:", erro);
    }
}

async function iniciar() {
    if (document.readyState === "loading") {
        await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
    }

    onAuthStateChanged(auth, async usuario => {
        if (!usuario) {
            window.location.href = URL_LOGIN;
            return;
        }

        configurarEventos();
        await carregarFicha();
    });
}

iniciar();