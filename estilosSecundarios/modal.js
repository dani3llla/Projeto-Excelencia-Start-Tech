const overlay = document.getElementById("overlay-modal");
    const modalLogin = document.getElementById("modal-login");
    const modalCadastro = document.getElementById("modal-cadastro");
   
    function abrirModal(tipo) {
      
        overlay.classList.add('ativo');
   
        // Esconde ambos primeiro para garantir
        modalLogin.style.display = "none";
        modalCadastro.style.display = "none";
   
        // Mostra apenas o solicitado
        if (tipo === 'login') {
            modalLogin.style.display = "block";
        } else if (tipo === 'cadastro') {
            modalCadastro.style.display = "block";
        }
        // Impede rolagem do corpo atrás do modal
        document.body.style.overflow = "hidden";
    }
   
    function fecharModal() {
        overlay.classList.remove('ativo');
        // Retorna rolagem do corpo
        document.body.style.overflow = "auto";
   
         // Pequeno delay para limpar o display após a animação de fade out
        setTimeout(() => {
             if (!overlay.classList.contains('ativo')) {
                modalLogin.style.display = "none";
                modalCadastro.style.display = "none";
             }
        }, 300);
    }
   
    // Fechar ao clicar fora do modal (no overlay escuro)
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            fecharModal();
        }
    });
   
    // Tecla ESC para fechar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('ativo')) {
            fecharModal();
        }
    });

    // ================= LOGIN E PAGAMENTO =================

    // Variável para armazenar o plano selecionado
    let planoSelecionado = null;

    // Função para verificar se o usuário está logado
    function usuarioEstaLogado() {
        // Verifica se existe um token ou flag de login no localStorage
        return localStorage.getItem('usuarioLogado') === 'true';
    }

    // Função para verificar login antes de ir para pagamento
    function verificarLoginEIrParaPagamento(plano) {
        planoSelecionado = plano;
        
        if (usuarioEstaLogado()) {
            // Se já estiver logado, redireciona direto
            redirecionarParaPagamento(plano);
        } else {
            // Se não estiver logado, abre o modal de login
            abrirModal('login');
        }
    }

    // Função para redirecionar para página de pagamento
    function redirecionarParaPagamento(plano) {
        if (plano === 'free') {
            window.location.href = 'html/homeLogin.html';
        } else {
            window.location.href = `Pagina Pagamentos/Pagamentos.html?plano=${plano}`;
        }
    }

    // Modificar a função de login para incluir redirecionamento após sucesso
    function realizarLogin(event) {
        event.preventDefault();
        
        // Aqui você faria a validação real do login
        // Por enquanto, vamos simular um login bem-sucedido
        
        // Marca o usuário como logado
        localStorage.setItem('usuarioLogado', 'true');
        
        // Fecha o modal
        fecharModal();
        
        // Se há um plano selecionado, redireciona para pagamento
        if (planoSelecionado) {
            setTimeout(() => {
                redirecionarParaPagamento(planoSelecionado);
                planoSelecionado = null; // Limpa a seleção
            }, 300);
        }
    }

    // Modificar a função de cadastro para incluir redirecionamento após sucesso
    function realizarCadastro(event) {
        event.preventDefault();
        
        // Aqui você faria a validação real do cadastro
        // Por enquanto, vamos simular um cadastro bem-sucedido
        
        // Marca o usuário como logado após cadastro
        localStorage.setItem('usuarioLogado', 'true');
        
        // Fecha o modal
        fecharModal();
        
        // Se há um plano selecionado, redireciona para pagamento
        if (planoSelecionado) {
            setTimeout(() => {
                redirecionarParaPagamento(planoSelecionado);
                planoSelecionado = null; // Limpa a seleção
            }, 300);
        }
    }

    // fim do pagamento 


    // ================= MODAL =================





// Função para Cadastrar Usuário
async function cadastrarUsuario(event) {
    event.preventDefault();

    const nome = document.getElementById("cad-nome").value;
    const email = document.getElementById("cad-email").value;
    const senha = document.getElementById("cad-password").value;
    const confirmarSenha = document.getElementById("cad-confirm-password").value;

    if (senha !== confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    const dadosUsuario = {
        nome: nome,
        email: email,
        senha: senha
    };

    try {
        const response = await fetch("http://localhost:8080/api/usuarios", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dadosUsuario)
        });

        if (response.ok) {
            alert("Usuário cadastrado com sucesso!");

            fecharModal();
            abrirModal("login");

            // Limpar campos
            document.getElementById("cad-nome").value = "";
            document.getElementById("cad-email").value = "";
            document.getElementById("cad-password").value = "";
            document.getElementById("cad-confirm-password").value = "";

        } else {
            const erroData = await response.json().catch(() => ({}));
            alert(erroData.message || "Erro ao cadastrar usuário.");
        }
    } catch (error) {
        alert("Erro de conexão com o servidor.");
        console.error(error);
    }
}


// Função para fazer Login
async function fazerLogin(event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const senha = document.getElementById("login-password").value;

    const dadosLogin = { email, senha };

    try {
        const response = await fetch("http://localhost:8080/api/usuarios/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dadosLogin)
        });

        if (response.ok) {
            const usuarioLogado = await response.json();
            alert("Bem-vindo(a), " + usuarioLogado.nome + "!");

            fecharModal();

            // ============================================
            // SALVAR O NOME DO USUÁRIO NO NAVEGADOR
            // ============================================
            localStorage.setItem("usuarioNome", usuarioLogado.nome);
            localStorage.setItem("usuarioEmail", usuarioLogado.email);
            localStorage.setItem("usuarioId", usuarioLogado.id);

            // ========== REDIRECIONAR APÓS LOGIN ==========
            window.location.href = "/html/homeLogin.html";

        } else {
            alert("E-mail ou senha incorretos.");
        }
    } catch (error) {
        alert("Erro ao conectar ao servidor.");
        console.error(error);
    }

}
