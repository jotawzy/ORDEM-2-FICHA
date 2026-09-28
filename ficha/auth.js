import { 
    auth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged,
    signOut 
} from "./firebase-config.js";

const formLogin = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("password");
const btnGoogle = document.getElementById("google-login");
const msgErro = document.getElementById("mensagem-erro");

if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (msgErro) msgErro.textContent = "A processar...";
        const cadastrando = window.getIsRegisterMode ? window.getIsRegisterMode() : false;

        try {
            if (cadastrando) {
                await createUserWithEmailAndPassword(auth, emailInput.value, senhaInput.value);
            } else {
                await signInWithEmailAndPassword(auth, emailInput.value, senhaInput.value);
            }
            // REDIRECIONA PARA O PAINEL E NÃO PARA A FICHA
            window.location.href = "../ficha-agente/criar-ficha.html";
        } catch (error) {
            console.error("Erro de Auth:", error);
            if (msgErro) msgErro.textContent = "Erro: " + error.message;
        }
    });
}

if (btnGoogle) {
    btnGoogle.addEventListener("click", async () => {
        if (msgErro) msgErro.textContent = "A ligar ao Google...";
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // REDIRECIONA PARA O PAINEL E NÃO PARA A FICHA
            window.location.href = "../ficha-agente/criar-ficha.html";
        } catch (error) {
            console.error("Erro Google:", error);
            if (msgErro) msgErro.textContent = "Erro Google: " + error.message;
        }
    });
}

onAuthStateChanged(auth, (user) => {
    const caminho = window.location.pathname;
    if (user) {
        if (caminho.includes("login.html")) {
            // SE ESTIVER LOGADO E TENTAR ABRIR O LOGIN, VAI PARA O PAINEL
            window.location.href = "../ficha-agente/criar-ficha.html";
        }
    } else {
        if (caminho.includes("criar-ficha.html") || caminho.includes("ficha.html")) {
            window.location.href = "../auth/login.html";
        }
    }
});

window.fazerLogout = function() {
    signOut(auth).then(() => {
        window.location.href = "../auth/login.html";
    });
};