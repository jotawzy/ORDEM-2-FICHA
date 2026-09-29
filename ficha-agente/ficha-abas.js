(function () {
    const ficha = document.querySelector(".ficha-wrapper");
    const nav = document.getElementById("nav-abas");
    const toggle = document.getElementById("nav-abas-toggle");
    const menu = document.getElementById("nav-abas-menu");

    if (!ficha || !nav || !toggle || !menu) return;

    const itens = [...menu.querySelectorAll("[data-aba-alvo]")];
    const abas = itens.map(item => item.dataset.abaAlvo);

    // abrir fechar
    function definirMenu(aberto) {
        menu.classList.toggle("aberto", aberto);
        toggle.setAttribute("aria-expanded", String(aberto));
    }

    // trocar aba
    function trocarAba(aba) {
        if (!abas.includes(aba)) aba = abas[0];

        ficha.setAttribute("data-aba", aba);

        itens.forEach(item => {
            const atual = item.dataset.abaAlvo === aba;
            item.classList.toggle("atual", atual);
            item.setAttribute("aria-current", atual ? "page" : "false");
        });

        window.scrollTo(0, 0);
    }

    toggle.addEventListener("click", () => {
        definirMenu(!menu.classList.contains("aberto"));
    });

    itens.forEach(item => {
        item.addEventListener("click", () => {
            trocarAba(item.dataset.abaAlvo);
            definirMenu(false);
        });
    });

    document.addEventListener("click", event => {
        if (!nav.contains(event.target)) definirMenu(false);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") definirMenu(false);
    });

    trocarAba(ficha.getAttribute("data-aba") || abas[0]);
})();