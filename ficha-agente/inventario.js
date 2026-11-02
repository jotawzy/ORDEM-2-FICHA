import { db, auth, doc, getDoc, updateDoc } from "../firebase-config.js";
import { GerenciadorFotoInventario } from "../foto/foto-inventario.js";

let inventarioItens = [];
let editandoIndex = null;
let fotoItemAtual = "";
let gerenciadorFotoItem = null;
let fichaRef = null;

function iniciarInventario() {
    const modalAddItem = document.getElementById('modal-add-item');
    const btnAbrirModalItem = document.getElementById('btn-abrir-modal-item');
    const modalItemFechar = document.getElementById('modal-item-fechar');
    const btnSalvarItem = document.getElementById('btn-salvar-item');
    const btnAbrirCorte = document.getElementById('btn-abrir-corte-foto-item');
    const previewContainer = document.getElementById('preview-foto-item-container');

    // Inicializa o gerenciador de corte de foto do item
    gerenciadorFotoItem = new GerenciadorFotoInventario((novaFotoUrl) => {
        fotoItemAtual = novaFotoUrl;
        if (previewContainer) {
            previewContainer.innerHTML = `<img src="${novaFotoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
    });

    if (btnAbrirCorte) {
        btnAbrirCorte.addEventListener('click', () => {
            gerenciadorFotoItem.abrirModalParaEscolha(fotoItemAtual);
        });
    }
    if (previewContainer) {
        previewContainer.addEventListener('click', () => {
            gerenciadorFotoItem.abrirModalParaEscolha(fotoItemAtual);
        });
    }

    // Conecta ao Firestore
    const fichaId = localStorage.getItem("fichaIdAtiva");
    if (fichaId) {
        fichaRef = doc(db, "fichas", fichaId);
        carregarInventarioDoFirestore();
    }

    if (btnAbrirModalItem) {
        btnAbrirModalItem.addEventListener('click', () => {
            editandoIndex = null;
            fotoItemAtual = ""; // Zera a foto para garantir item limpo do zero
            
            document.getElementById('input-item-nome').value = '';
            document.getElementById('input-item-categoria').value = '0';
            document.getElementById('input-item-espacos').value = '1';
            document.getElementById('input-item-sub').value = '';
            document.getElementById('input-item-desc').value = '';

            // Reseta o preview do modal para "Sem foto"
            if (previewContainer) {
                previewContainer.innerHTML = `<span style="font-size: 11px; color: #71717a;">Sem foto</span>`;
            }

            if (modalAddItem) modalAddItem.classList.add('ativo');
        });
    }

    if (modalItemFechar) {
        modalItemFechar.addEventListener('click', () => {
            if (modalAddItem) modalAddItem.classList.remove('ativo');
        });
    }

    if (btnSalvarItem) {
        btnSalvarItem.addEventListener('click', async () => {
            const nome = document.getElementById('input-item-nome')?.value.trim();
            const categoria = document.getElementById('input-item-categoria')?.value || 0;
            const espacos = Number(document.getElementById('input-item-espacos')?.value) || 1;
            const subtitulo = document.getElementById('input-item-sub')?.value.trim();
            const descricao = document.getElementById('input-item-desc')?.value.trim();

            if (!nome) {
                alert('Por favor, informe o nome do item.');
                return;
            }

            const dadosItem = { 
                nome, 
                categoria, 
                espacos, 
                subtitulo, 
                descricao, 
                foto: fotoItemAtual 
            };

            if (editandoIndex !== null) {
                inventarioItens[editandoIndex] = dadosItem;
            } else {
                inventarioItens.push(dadosItem);
            }
            
            editandoIndex = null;
            fotoItemAtual = "";
            if (modalAddItem) modalAddItem.classList.remove('ativo');

            renderizarInventario();
            await salvarInventarioNoFirestore();
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarInventario);
} else {
    iniciarInventario();
}

async function carregarInventarioDoFirestore() {
    if (!fichaRef) return;
    try {
        const snap = await getDoc(fichaRef);
        if (snap.exists()) {
            const dados = snap.data();
            if (dados.inventario && Array.isArray(dados.inventario)) {
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
        await updateDoc(fichaRef, { inventario: inventarioItens });
    } catch (erro) {
        console.error("Erro ao salvar inventário:", erro);
    }
}

function renderizarInventario() {
    const listaInventario = document.getElementById('lista-inventario');
    const pesoAtualSpan = document.getElementById('peso-atual');
    if (!listaInventario) return;

    listaInventario.innerHTML = '';
    const totalEspacos = inventarioItens.reduce((acc, item) => acc + Number(item.espacos || 0), 0);
    if (pesoAtualSpan) pesoAtualSpan.textContent = totalEspacos;

    if (inventarioItens.length === 0) {
        listaInventario.innerHTML = `<div>Nenhum item no inventário.</div>`;
        return;
    }

    // Cria as duas colunas independentes no DOM
    const colunaEsquerda = document.createElement('div');
    colunaEsquerda.className = 'inventario-coluna';

    const colunaDireita = document.createElement('div');
    colunaDireita.className = 'inventario-coluna';

    inventarioItens.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        const fotoCorpo = item.foto ? `<img src="${item.foto}" style="width: 65px; height: 65px; object-fit: cover; border-radius: 6px; float: left; margin-right: 12px; margin-bottom: 5px; border: 1px solid #3f3f46;">` : '';

        card.innerHTML = `
            <div class="item-header">
                <div class="item-info-principal">
                    <button class="item-seta">▼</button>
                    <span class="item-nome">${item.nome}</span>
                </div>
                <div class="item-detalhes-resumo">
                    <span>Categoria: ${item.categoria}</span>
                    <span>Espaços: ${item.espacos}</span>
                </div>
            </div>
            <div class="item-corpo-expandido">
                ${fotoCorpo}
                ${item.subtitulo ? `<div class="item-subtitulo">${item.subtitulo}</div>` : ''}
                <div class="item-descricao">${item.descricao || 'Sem descrição.'}</div>
                <div style="clear: both;"></div>
                <div class="item-acoes">
                    <button class="btn-editar-item" data-index="${index}">Editar</button>
                    <button class="btn-remover-item" data-index="${index}">Remover</button>
                </div>
            </div>
        `;

        card.querySelector('.item-header').addEventListener('click', () => {
            card.classList.toggle('expandido');
        });

        card.querySelector('.btn-editar-item').addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModalEdicao(index);
        });

        card.querySelector('.btn-remover-item').addEventListener('click', (e) => {
            e.stopPropagation(); 
            removerItem(index);
        });

        // Distribui os itens: pares na coluna esquerda, ímpares na coluna direita
        if (index % 2 === 0) {
            colunaEsquerda.appendChild(card);
        } else {
            colunaDireita.appendChild(card);
        }
    });

    listaInventario.appendChild(colunaEsquerda);
    listaInventario.appendChild(colunaDireita);
}