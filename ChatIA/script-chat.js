// ========== CONFIGURAÇÕES ==========
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api', // Altere para sua URL de API
    ENDPOINTS: {
        SEND_MESSAGE: '/chat/message',
        GET_CONVERSATIONS: '/chat/conversations',
        CREATE_CONVERSATION: '/chat/conversations',
        DELETE_CONVERSATION: '/chat/conversasions/:id'
    },
    TIMEOUT: 30000 // 30 segundos
};

// ========== ELEMENTOS DO DOM ==========
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatForm = document.getElementById('chatForm');
const messagesArea = document.getElementById('messagesArea');
const chatHistory = document.getElementById('chatHistory');
const newChatBtn = document.getElementById('newChatBtn');
const backHomeBtn = document.getElementById('backHomeBtn');
const chatTitle = document.getElementById('chatTitle');

// ========== ESTADO DA APLICAÇÃO ==========
let currentChatId = '1';
let isLoading = false;
let conversationMessages = {};

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    initializeChat();
});

function initializeChat() {
    setupEventListeners();
    loadConversation(currentChatId);
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Envio de mensagens
    chatForm.addEventListener('submit', sendMessage);
    
    // Auto-resize do input
    messageInput.addEventListener('input', autoResizeInput);
    messageInput.addEventListener('keydown', handleKeyDown);
    
    // Nova conversa
    newChatBtn.addEventListener('click', createNewConversation);
    
    // Voltar para home
    backHomeBtn.addEventListener('click', goBackHome);
    
    // Histórico de conversas
    chatHistory.addEventListener('click', handleChatItemClick);
}

// ========== FUNCIONALIDADES DE MENSAGENS ==========
async function sendMessage(e) {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message || isLoading) return;
    
    // Desabilitar envio
    isLoading = true;
    sendBtn.disabled = true;
    
    try {
        // Adicionar mensagem do usuário ao DOM
        clearEmptyState();
        addMessageToDOM(message, 'user');
        
        // Limpar input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Armazenar mensagem localmente
        if (!conversationMessages[currentChatId]) {
            conversationMessages[currentChatId] = [];
        }
        conversationMessages[currentChatId].push({
            id: Date.now(),
            text: message,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
        
        // Mostrar indicador de digitação
        showTypingIndicator();
        
        // Enviar para API
        const response = await sendMessageToAPI(message);
        
        // Remover indicador de digitação
        removeTypingIndicator();
        
        // Adicionar resposta da IA
        if (response && response.text) {
            addMessageToDOM(response.text, 'ai', response.analysis);
            conversationMessages[currentChatId].push({
                id: Date.now(),
                text: response.text,
                sender: 'ai',
                analysis: response.analysis,
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
        }
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        removeTypingIndicator();
        showErrorMessage('Erro ao enviar mensagem. Tente novamente.');
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

async function sendMessageToAPI(message) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEND_MESSAGE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatId: currentChatId,
                message: message,
                userId: getUserId() // Implementar conforme necessário
            }),
            timeout: API_CONFIG.TIMEOUT
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Erro na requisição da API:', error);
        // Retornar resposta simulada se API falhar (para testes)
        return {
            text: 'Ótima resposta! Você demonstrou um bom conhecimento. Agora vamos para a próxima pergunta...',
            analysis: {
                score: 8.5,
                feedback: 'Excelente explicação técnica'
            }
        };
    }
}

/* =============================================== */
/* ========== MODAL DE SETUP - INÍCIO ========== */
/* =============================================== */

// ========== SETUP MODAL ==========
function showSetupModal() {
    setupModal.style.display = 'flex';
}

async function handleStartInterview() {
    // Validar seleções
    if (!professionalAreaSelect.value) {
        alert('Por favor, selecione uma área profissional');
        return;
    }

    // Armazenar configurações
    currentSettings = {
        area: professionalAreaSelect.value,
        difficulty: difficultySelect.value,
        duration: parseInt(durationSelect.value),
        evaluationType: evaluationTypeSelect.value
    };

    try {
        // Se estiver em modo de teste, pular acesso à câmera
        if (API_CONFIG.TEST_MODE) {
            console.log('Modo de teste ativado - câmera simulada');
            // Criar um canvas como substituto para a câmera
            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');
            
            // Preencher com cor escura
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Adicionar texto
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Modo de Teste - Câmera Simulada', canvas.width / 2, canvas.height / 2);
            
            // Converter para stream
            const stream = canvas.captureStream(30);
            mediaStream = stream;
            localVideo.srcObject = stream;
        } else {
            // Solicitar acesso à câmera e microfone normalmente
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });

            // Configurar vídeo
            localVideo.srcObject = mediaStream;
        }

        // Configurar áudio
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        mediaRecorder = new MediaRecorder(mediaStream);
        setupMediaRecorder();

        // Esconder modal e mostrar vídeo
        setupModal.style.display = 'none';
        videoContainer.style.display = 'flex';

        // Iniciar entrevista
        await startInterview();

    } catch (error) {
        console.error('Erro ao acessar câmera/microfone:', error);
        console.log('Tentando modo de teste como fallback...');
        
        // Fallback: usar modo de teste mesmo assim
        API_CONFIG.TEST_MODE = true;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Modo de Teste', canvas.width / 2, canvas.height / 2 - 50);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Arial';
            ctx.fillText('Câmera não disponível - Continuando em modo teste', canvas.width / 2, canvas.height / 2 + 50);
            
            const stream = canvas.captureStream(30);
            mediaStream = stream;
            localVideo.srcObject = stream;

            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            mediaRecorder = new MediaRecorder(mediaStream);
            setupMediaRecorder();

            setupModal.style.display = 'none';
            videoContainer.style.display = 'flex';

            await startInterview();
        } catch (fallbackError) {
            console.error('Erro no fallback de teste:', fallbackError);
        }
    }
}

/* =============================================== */
/* ========== MODAL DE SETUP - FIM ============= */
/* =============================================== */





// ========== FUNÇÕES DE DOM ==========
function addMessageToDOM(text, sender, analysis = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const avatarClass = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
    
    messageDiv.innerHTML = `
        ${sender === 'user' ? '' : `<div class="message-avatar ${sender}"><i class="${avatarClass}"></i></div>`}
        <div class="message-content">
            <div class="message-bubble">
                ${escapeHtml(text)}
                ${analysis ? `<div class="message-analysis">${formatAnalysis(analysis)}</div>` : ''}
            </div>
            <div class="message-time">${timestamp}</div>
        </div>
        ${sender === 'user' ? `<div class="message-avatar ${sender}"><i class="${avatarClass}"></i></div>` : ''}
    `;
    
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar ai">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    messagesArea.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

function showErrorMessage(text) {
    addMessageToDOM(`❌ ${text}`, 'ai');
}

function clearEmptyState() {
    const emptyState = messagesArea.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
}

function scrollToBottom() {
    setTimeout(() => {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }, 0);
}

function autoResizeInput() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
}

// ========== VOLTAR PARA HOME ==========
function goBackHome() {
    // usar caminho relativo a partir das páginas na pasta ChatIA
    window.location.href = '../html/homeLogin.html';
}

// ========== GERENCIAMENTO DE CONVERSAS ==========
async function loadConversation(chatId) {
    currentChatId = chatId;
    messagesArea.innerHTML = '';
    
    // Carregar mensagens armazenadas localmente
    if (conversationMessages[chatId]) {
        conversationMessages[chatId].forEach(msg => {
            addMessageToDOM(msg.text, msg.sender, msg.analysis);
        });
    } else {
        // Carregar da API
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/chat/conversations/${chatId}`,
                { headers: { 'Authorization': `Bearer ${getAuthToken()}` } }
            );
            
            if (response.ok) {
                const data = await response.json();
                conversationMessages[chatId] = data.messages;
                data.messages.forEach(msg => {
                    addMessageToDOM(msg.text, msg.sender, msg.analysis);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar conversa:', error);
            showEmptyState();
        }
    }
    
    updateActiveChatItem(chatId);
}

function showEmptyState() {
    messagesArea.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <i class="fas fa-comments"></i>
            </div>
            <div class="empty-text">Comece uma conversa</div>
            <div class="empty-subtext">Digite sua primeira mensagem para iniciar</div>
        </div>
    `;
}

async function createNewConversation() {
    try {
        const response = await fetch(
            `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_CONVERSATION}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    title: `Conversa ${new Date().toLocaleDateString('pt-BR')}`
                })
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            currentChatId = data.id;
            conversationMessages[currentChatId] = [];
            loadConversation(currentChatId);
        }
    } catch (error) {
        console.error('Erro ao criar conversa:', error);
    }
}

function handleChatItemClick(e) {
    if (e.target.classList.contains('chat-item')) {
        const chatId = e.target.dataset.chatId;
        loadConversation(chatId);
    }
}

function updateActiveChatItem(chatId) {
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.chatId === chatId) {
            item.classList.add('active');
            chatTitle.textContent = item.textContent;
        }
    });
}

// ========== FUNÇÕES AUXILIARES ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatAnalysis(analysis) {
    if (!analysis) return '';
    return `<small>Score: ${analysis.score || 0}/10 - ${analysis.feedback || ''}</small>`;
}

function getUserId() {
    // Implementar obtenção do ID do usuário
    return localStorage.getItem('userId') || 'guest';
}

function getAuthToken() {
    // Implementar obtenção do token de autenticação
    return localStorage.getItem('authToken') || '';
}

// ========== FUNÇÕES NÃO IMPLEMENTADAS (para expansão futura) ==========
document.getElementById('attachBtn').addEventListener('click', () => {
    console.log('Funcionalidade de anexo não implementada');
});

document.getElementById('microphoneBtn').addEventListener('click', () => {
    console.log('Funcionalidade de microfone não implementada');
});

document.getElementById('shareBtn').addEventListener('click', () => {
    console.log('Funcionalidade de compartilhamento não implementada');
});

document.getElementById('moreOptionsBtn').addEventListener('click', () => {
    console.log('Menu de opções não implementado');
});