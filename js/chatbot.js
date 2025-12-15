document.addEventListener('DOMContentLoaded', () => {
    // ⚠️ SUBSTITUA PELA SUA CHAVE DE API DO GEMINI
    // LEMBRE-SE: EXPOR ESTA CHAVE NO FRONT-END É INSEGURO.
    const GEMINI_API_KEY = "${GEMINI-API-KEY}"; 
    const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";


    const launcherBtn = document.getElementById('chatbot-launcher');
    const widget = document.getElementById('chatbot-widget');
    const closeBtn = document.getElementById('close-button');
    const sendBtn = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    const messageArea = document.getElementById('message-area');
    const quickReplyBtns = document.querySelectorAll('.quick-reply-btn');

    let isChatOpen = false;

    // --- FUNÇÕES DE INTERFACE ---

    function toggleChat() {
        isChatOpen = !isChatOpen;
        widget.style.display = isChatOpen ? 'flex' : 'none';
        launcherBtn.textContent = isChatOpen ? '✕' : '💬';
        scrollToBottom();
    }

    function createMessageElement(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        
        // Simples conversão de Markdown para HTML básico (quebras de linha)
        messageDiv.innerHTML = text.replace(/\n/g, '<br>');

        return messageDiv;
    }

    function scrollToBottom() {
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // --- LÓGICA DE ENVIO E INTEGRAÇÃO GEMINI ---

    async function sendMessage(text) {
        if (!text.trim()) return;

        // 1. Mostrar a mensagem do usuário
        messageArea.appendChild(createMessageElement(text, 'sent'));
        userInput.value = '';
        scrollToBottom();
        
        // Desabilita input e botão para evitar spam
        userInput.disabled = true;
        sendBtn.disabled = true;


        // 2. Montar o corpo da requisição (Prompt)
        const prompt = `Você é um assistente especializado em entrevistas de emprego. Responda de forma clara, profissional e acolhedora.\n\nPergunta: ${text}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
            // Você pode adicionar 'config' aqui, como 'temperature'
        };

        // 3. Chamar a API do Gemini
        try {
            const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                // Trata erros de HTTP (4xx, 5xx)
                const errorData = await response.json();
                console.error("Erro da API Gemini:", errorData);
                throw new Error(`Erro ${response.status}: ${errorData.error.message}`);
            }

            const data = await response.json();
            
            let botResponse = "Não foi possível extrair a resposta.";

            // Extração segura da resposta (usando a mesma estrutura dos DTOs que você viu no Java)
            try {
                botResponse = data.candidates[0].content.parts[0].text;
            } catch (e) {
                console.error("Erro ao analisar a resposta da API:", e);
                botResponse = "Recebemos uma resposta incompleta ou inválida da IA.";
            }

            // 4. Mostrar a resposta do bot
            messageArea.appendChild(createMessageElement(botResponse, 'received'));

        } catch (error) {
            console.error("Erro no Chatbot:", error);
            messageArea.appendChild(createMessageElement(`Desculpe, houve um erro ao processar sua solicitação: ${error.message || 'Erro de rede.'}`, 'received'));
        } finally {
            // Reabilita input e botão
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
            scrollToBottom();
        }
    }

    // --- EVENT LISTENERS ---

    launcherBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    // Envio de mensagem pelo botão
    sendBtn.addEventListener('click', () => {
        sendMessage(userInput.value);
    });

    // Envio de mensagem pela tecla ENTER
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !userInput.disabled) {
            e.preventDefault();
            sendMessage(userInput.value);
        }
    });

    // Perguntas Rápidas
    quickReplyBtns.forEach(button => {
        button.addEventListener('click', (e) => {
            const question = e.target.textContent;
            sendMessage(question);
        });
    });

});