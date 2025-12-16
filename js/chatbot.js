document.addEventListener('DOMContentLoaded', () => {
    const apiKeyMeta = document.querySelector('meta[name="gemini-api-key"]');
    const GEMINI_API_KEY = (apiKeyMeta?.content || '').trim();
    const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";


    const launcherBtn = document.getElementById('chatbot-launcher');
    const widget = document.getElementById('chatbot-widget');
    const closeBtn = document.getElementById('close-button');
    const form = document.getElementById('chatbot-form');
    const sendBtn = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    const messageArea = document.getElementById('message-area');
    const quickReplyBtns = document.querySelectorAll('.quick-reply-btn');
    const launcherDefaultContent = launcherBtn?.innerHTML;
    const launcherCloseContent = '<span aria-hidden="true">✕</span>';

    if (!launcherBtn || !widget || !closeBtn || !sendBtn || !userInput || !messageArea) return;

    let isChatOpen = false;

    // --- FUNÇÕES DE INTERFACE ---

    function toggleChat() {
        isChatOpen = !isChatOpen;
        widget.classList.toggle('open', isChatOpen);
        widget.setAttribute('aria-hidden', String(!isChatOpen));
        launcherBtn.setAttribute('aria-expanded', String(isChatOpen));
        launcherBtn.innerHTML = isChatOpen ? launcherCloseContent : launcherDefaultContent;
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

        if (!GEMINI_API_KEY) {
            messageArea.appendChild(createMessageElement('Configure a chave da API para enviar mensagens.', 'received'));
            return;
        }

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

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        sendMessage(userInput.value);
    });

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
            if (!isChatOpen) toggleChat();
            sendMessage(question);
        });
    });

    if (messageArea) {
        messageArea.appendChild(createMessageElement('Olá! Como posso ajudar na sua preparação para entrevistas hoje?', 'received'));
    }
});


async function callGeminiWithRetry(payload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) return res.json();

    if (res.status === 503) {
      await new Promise(r => setTimeout(r, 2000)); // espera 2s
      continue;
    }

    throw new Error(`Erro ${res.status}`);
  }

  throw new Error("Gemini indisponível após várias tentativas");
}