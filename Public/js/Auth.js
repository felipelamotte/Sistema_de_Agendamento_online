// /js/Auth.js

// ==============================================
// CONFIGURAÇÕES GLOBAIS 🎯
// ==============================================
const API_URL_BASE = 'http://localhost:4000/api';
// Armazenamento temporário das especialidades
let especialidadesSelecionadas = [];

// ==============================================
// 1. Mapeamento de Event Listeners
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    // Paciente
    document.getElementById('form-login-paciente')?.addEventListener('submit', realizarLoginPaciente);
    document.getElementById('form-cadastro-paciente')?.addEventListener('submit', realizarCadastroPaciente);

    // Médico
    // O ID no HTML revisado é 'container-medico-login' mas o form é 'form-login-medico'
    document.getElementById('form-login-medico')?.addEventListener('submit', realizarLoginMedico);
    document.getElementById('form-cadastro-medico')?.addEventListener('submit', realizarCadastroMedico);

    // NOVO: Listener para adicionar especialidade
    document.getElementById('select-adicionar-especialidade')?.addEventListener('change', adicionarEspecialidade);

    // NOVO: Listener para o botão de adicionar especialidade personalizada
    document.querySelector('.btn-adicionar-personalizada')?.addEventListener('click', adicionarEspecialidadePersonalizada);
    
    // Inicializa o estado visual das especialidades ao carregar a tela
    renderizarEspecialidades();
    
    // Inicializa a navegação para a tela de seleção de perfil
    navigateTo('selecao-perfil');
});


// ==============================================
// 2. FUNÇÕES DE NAVEGAÇÃO E UTILS (Pacote único)
// ==============================================

/**
 * Função centralizada para controlar a visibilidade das seções.
 * Usada por todos os botões de navegação e redirecionamentos pós-cadastro/login.
 */
function navigateTo(targetId) {
    // Lista de todos os containers de navegação principais (baseado no HTML revisado)
    const allContainers = [
        'selecao-perfil', 
        'container-paciente-login', 
        'container-paciente-cadastro', 
        'container-medico-login', 
        'container-medico-cadastro'
    ];

    allContainers.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Oculta todos os containers
            el.classList.add('hidden');
        }
    });

    // Limpa todas as mensagens de status antes de navegar
    ['login-message', 'cadastro-message', 'login-medico-message', 'cadastro-medico-message'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
    
    // Mostra o container alvo
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
        targetElement.classList.remove('hidden');
    }
}


function selecionarPerfil(perfil) {
    resetEspecialidades(); // Limpa a lista de especialidades ao mudar de perfil
    if (perfil === 'paciente') {
        navigateTo('container-paciente-login'); 
    } else if (perfil === 'medico') {
        navigateTo('container-medico-login');
    }
}

function voltarSelecao() {
    resetEspecialidades(); 
    navigateTo('selecao-perfil');
}

// Funções de alternância (Chamadas pelos links no HTML)
function mostrarCadastroPaciente() { navigateTo('container-paciente-cadastro'); }
function mostrarLoginPaciente() { navigateTo('container-paciente-login'); }
function mostrarCadastroMedico() { 
    resetEspecialidades(); 
    navigateTo('container-medico-cadastro'); 
}
function mostrarLoginMedico() { navigateTo('container-medico-login'); }


// ==============================================
// 3. FUNÇÕES DE GESTÃO DE ESPECIALIDADES 
// ==============================================

function renderizarEspecialidades() {
    const listaDiv = document.getElementById('lista-especialidades-selecionadas');
    // Campo hidden para onde o valor será enviado no form
    const inputFinal = document.getElementById('cadastro-medico-especialidade-final'); 
    if (!listaDiv || !inputFinal) return; 

    listaDiv.innerHTML = '';
    const messageDisplay = document.getElementById('cadastro-medico-message');

    if (especialidadesSelecionadas.length === 0) {
        listaDiv.innerHTML = '<span class="mensagem-sem-especialidade">Nenhuma especialidade adicionada.</span>';
        inputFinal.value = '';
        inputFinal.removeAttribute('required'); 
        messageDisplay.textContent = 'Adicione pelo menos uma especialidade para cadastrar.';
        messageDisplay.style.color = 'red';
    } else {
        inputFinal.setAttribute('required', 'required'); 
        // Atualiza o input hidden com a lista para ser enviada (string separada por vírgula)
        inputFinal.value = especialidadesSelecionadas.join(','); 
        messageDisplay.textContent = ''; // Limpa a mensagem de erro
        
        // Renderiza as tags (usando a classe do Auth.css)
        especialidadesSelecionadas.forEach(especialidade => {
            const tag = document.createElement('span');
            tag.textContent = especialidade;
            tag.classList.add('especialidade-tag'); // Classe do Auth.css
            
            const btnRemover = document.createElement('button');
            btnRemover.textContent = 'x';
            btnRemover.classList.add('remover-especialidade-btn'); // Classe do Auth.css
            // O botão de remoção chama a função global com a especialidade atual
            btnRemover.onclick = (e) => {
                e.preventDefault(); // Impede o envio do formulário
                removerEspecialidade(especialidade);
            };
            
            tag.appendChild(btnRemover);
            listaDiv.appendChild(tag);
        });
    }
}

function adicionarEspecialidade(event) {
    const select = event.target;
    const especialidade = select.value;
    const inputPersonalizadoDiv = document.getElementById('input-especialidade-personalizada');
    
    // 1. Lógica para mostrar/esconder o campo de texto
    if (especialidade === 'Outra') { // Valor 'Outra' no HTML revisado
        inputPersonalizadoDiv.classList.remove('hidden');
        document.getElementById('campo-especialidade-personalizada').focus();
        select.value = ""; // Reseta o select
        return;
    } else {
        inputPersonalizadoDiv.classList.add('hidden');
    }

    // 2. Lógica para adicionar especialidade da lista pré-definida
    if (especialidade && especialidade !== 'Outra' && !especialidadesSelecionadas.includes(especialidade)) {
        especialidadesSelecionadas.push(especialidade);
        renderizarEspecialidades();
    }
    // Reseta o select para a opção padrão
    select.value = "";
}

function adicionarEspecialidadePersonalizada() {
    const inputCampo = document.getElementById('campo-especialidade-personalizada');
    const especialidade = inputCampo.value.trim();
    const messageDisplay = document.getElementById('cadastro-medico-message');
    
    // Limpa a mensagem anterior
    messageDisplay.textContent = '';
    messageDisplay.style.color = 'red';
    
    // Validação básica
    if (especialidade.length < 3) {
        messageDisplay.textContent = 'A especialidade deve ter pelo menos 3 caracteres.';
        return;
    }
    
    if (especialidadesSelecionadas.includes(especialidade)) {
        messageDisplay.textContent = `A especialidade "${especialidade}" já foi adicionada.`;
        return;
    }

    // Adiciona a especialidade personalizada
    especialidadesSelecionadas.push(especialidade);
    renderizarEspecialidades();
    
    // Reseta o campo de texto e esconde a div
    inputCampo.value = '';
    document.getElementById('input-especialidade-personalizada').classList.add('hidden');
    messageDisplay.textContent = ''; // Limpa a mensagem de sucesso
}

function removerEspecialidade(especialidade) {
    especialidadesSelecionadas = especialidadesSelecionadas.filter(e => e !== especialidade);
    renderizarEspecialidades();
}

function resetEspecialidades() {
    especialidadesSelecionadas = [];
    if (document.getElementById('lista-especialidades-selecionadas')) {
        renderizarEspecialidades();
    }
    // Garante que o campo personalizado está escondido ao resetar
    document.getElementById('input-especialidade-personalizada')?.classList.add('hidden');
    const campoPersonalizado = document.getElementById('campo-especialidade-personalizada');
    if(campoPersonalizado) campoPersonalizado.value = '';
}


// ==============================================
// 4. LÓGICA DE LOGIN/CADASTRO DE PACIENTE 
// ==============================================

async function realizarLoginPaciente(event) {
    event.preventDefault(); 
    const cpf = document.getElementById('login-cpf').value.replace(/\D/g, '');
    const senha = document.getElementById('login-senha').value;
    const messageDisplay = document.getElementById('login-message');
    messageDisplay.textContent = 'Aguarde...';
    messageDisplay.style.color = 'black'; // Cor temporária
    
    try {
        const response = await fetch(`${API_URL_BASE}/pacientes/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf, senha })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('userToken', data.token); 
            localStorage.setItem('userName', data.nome);
            localStorage.setItem('userType', 'paciente');
            messageDisplay.textContent = 'Login bem-sucedido! Redirecionando...';
            messageDisplay.style.color = 'green';
            window.location.href = '/index.html'; // Redireciona para a página principal
        } else {
            messageDisplay.textContent = data.message || 'Erro ao realizar login.';
            messageDisplay.style.color = 'red';
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        messageDisplay.textContent = 'Erro de conexão com o servidor.';
        messageDisplay.style.color = 'red';
    }
}

async function realizarCadastroPaciente(event) {
    event.preventDefault();
    const nome = document.getElementById('cadastro-nome').value;
    const cpf = document.getElementById('cadastro-cpf').value.replace(/\D/g, '');
    const senha = document.getElementById('cadastro-senha').value;
    const messageDisplay = document.getElementById('cadastro-message');
    messageDisplay.textContent = 'Aguarde...';
    messageDisplay.style.color = 'black';

    try {
        const response = await fetch(`${API_URL_BASE}/pacientes/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, cpf, senha })
        });
        const data = await response.json();

        if (data.success) {
            messageDisplay.textContent = 'Cadastro realizado com sucesso! Faça login abaixo.';
            messageDisplay.style.color = 'green';
            // Redireciona para o login após o sucesso
            setTimeout(() => {
                mostrarLoginPaciente();
                document.getElementById('login-cpf').value = cpf; // Pré-preenche o CPF
                document.getElementById('cadastro-nome').value = '';
                document.getElementById('cadastro-cpf').value = '';
                document.getElementById('cadastro-senha').value = '';
            }, 2000);
        } else {
            messageDisplay.textContent = data.message || 'Erro ao realizar cadastro.';
            messageDisplay.style.color = 'red';
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        messageDisplay.textContent = 'Erro de conexão com o servidor.';
        messageDisplay.style.color = 'red';
    }
}


// ==============================================
// 5. LÓGICA DE LOGIN/CADASTRO DE MÉDICO
// ==============================================
async function realizarLoginMedico(event) {
    event.preventDefault(); 
    // Assumindo que o campo é o CRM
    const crm = document.getElementById('login-medico-crm').value; 
    const senha = document.getElementById('login-medico-senha').value;
    const messageDisplay = document.getElementById('login-medico-message');
    messageDisplay.textContent = 'Aguarde...';
    messageDisplay.style.color = 'black';

    try {
        const response = await fetch(`${API_URL_BASE}/medicos/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crm, senha }) 
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('userToken', data.token); 
            localStorage.setItem('userName', data.nome);
            localStorage.setItem('userType', 'medico');
            messageDisplay.textContent = 'Login bem-sucedido! Redirecionando...';
            messageDisplay.style.color = 'green';
            window.location.href = '/index.html'; // Redireciona para a página principal
        } else {
            messageDisplay.textContent = data.message || 'Erro ao realizar login.';
            messageDisplay.style.color = 'red';
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        messageDisplay.textContent = 'Erro de conexão com o servidor.';
        messageDisplay.style.color = 'red';
    }
}

async function realizarCadastroMedico(event) {
    event.preventDefault();

    const nome = document.getElementById('cadastro-medico-nome').value;
    const crm = document.getElementById('cadastro-medico-crm').value;
    // Pega o valor do input hidden que foi preenchido pelo JS (string separada por vírgula)
    const especialidade = document.getElementById('cadastro-medico-especialidade-final').value; 
    const senha = document.getElementById('cadastro-medico-senha').value;
    const messageDisplay = document.getElementById('cadastro-medico-message');
    messageDisplay.textContent = 'Aguarde...';
    messageDisplay.style.color = 'black';

    // Validação de múltiplas especialidades
    if (!especialidade) {
        messageDisplay.textContent = 'Por favor, adicione pelo menos uma especialidade.';
        messageDisplay.style.color = 'red';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL_BASE}/medicos/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, crm, especialidade, senha }) 
        });

        const data = await response.json();

        if (data.success) {
            messageDisplay.textContent = 'Cadastro de Médico realizado com sucesso! Faça login abaixo.';
            messageDisplay.style.color = 'green';
            // Redireciona para o login após o sucesso
            setTimeout(() => {
                mostrarLoginMedico();
                document.getElementById('login-medico-crm').value = crm; // Pré-preenche o CRM
                document.getElementById('cadastro-medico-nome').value = '';
                document.getElementById('cadastro-medico-crm').value = '';
                document.getElementById('cadastro-medico-senha').value = '';
                resetEspecialidades();
            }, 2000);
        } else {
            messageDisplay.textContent = data.message || 'Erro ao realizar cadastro de médico.';
            messageDisplay.style.color = 'red';
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        messageDisplay.textContent = 'Erro de conexão com o servidor.';
        messageDisplay.style.color = 'red';
    }
}

// Necessário para que as funções de navegação sejam acessíveis aos 'onclick' no HTML.
window.selecionarPerfil = selecionarPerfil;
window.voltarSelecao = voltarSelecao;
window.mostrarCadastroPaciente = mostrarCadastroPaciente;
window.mostrarLoginPaciente = mostrarLoginPaciente;
window.mostrarCadastroMedico = mostrarCadastroMedico;
window.mostrarLoginMedico = mostrarLoginMedico;