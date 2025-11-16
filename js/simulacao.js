document.addEventListener("DOMContentLoaded", function () {
    const selectAreas = document.querySelectorAll("select");
    const btnIniciar = document.querySelector(".btn-iniciar");

    selectAreas.forEach(select => {
        select.addEventListener("change", () => {
            console.log("Alterado:", select.value);
        });
    });

    btnIniciar.addEventListener("click", () => {
        alert("Simulação iniciada!");
    });

    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            console.log("Menu:", item.textContent);
        });
    });
});
