// /public/js/script.js

// URL BASE do seu Backend
const API_URL_BASE = 'http://localhost:4000/api';

// ===============================================
// VARIÁVEIS GLOBAIS
// ===============================================
const userToken = localStorage.getItem('userToken');
const userName = localStorage.getItem('userName');
const userType = localStorage.getItem('userType'); 
const userCPF = localStorage.getItem('userCPF'); // Captura o CPF do paciente logado (string bruta)
let pacienteEncontradoNome = null; // Usado para armazenar o nome do paciente encontrado (ou novo)
let pacienteNovoNome = null; // Armazena o nome do novo paciente a ser cadastrado
let isNovoPaciente = false; // Flag para indicar se é um novo paciente


// ===============================================
// AUTENTICAÇÃO E VERIFICAÇÃO INICIAL
// ===============================================

// 1. FUNÇÃO DE LOGOUT (Tornada global para ser chamada no HTML)
function logout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userType'); 
    localStorage.removeItem('userCPF'); // Remove o CPF no logout
    window.location.href = '/login.html';
}

// 2. FUNÇÃO AUXILIAR PARA CABEÇALHOS AUTENTICADOS
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}` 
    };
}

// 3. TRATAMENTO DE ERRO DE AUTORIZAÇÃO (401/403)
async function handleAuthError(response) {
    if (response.status === 401 || response.status === 403) {
        alert("Sua sessão expirou ou o acesso foi negado. Faça login novamente.");
        logout(); 
        return true; 
    }
    return false; 
}


// ======================================================
// 4. FUNÇÃO PRINCIPAL: VERIFICAR SESSÃO E MONTAR VIEW
// ======================================================

function checkAuthAndSetupView() {
    
    if (!userToken) {
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html'; 
        }
        return;
    } 

    // Configura mensagem de boas-vindas
    const headerTitle = document.getElementById('header-title');
    if (headerTitle && userName) {
        headerTitle.textContent = `Sistema de Agendamento - Bem-vindo(a), ${userName}`;
    }
    
    // Se não for a index.html, sai da função (ex: se for cadastro_medico.html)
    if (!window.location.pathname.includes('index.html')) return; 

    // ----------------------------------------------------
    // LÓGICA DE ALTERNÂNCIA DE VIEW (Médico vs. Paciente)
    // ----------------------------------------------------
    const pacienteView = document.getElementById('paciente-view');
    const medicoView = document.getElementById('medico-view');
    const modalAgendamento = document.getElementById('modal-agendamento');

    if (userType === 'medico') {
        // VISÃO MÉDICO
        if (pacienteView) pacienteView.classList.add('hidden');
        if (modalAgendamento) modalAgendamento.classList.add('hidden'); 
        if (medicoView) medicoView.classList.remove('hidden');
        
        carregarAgendamentosMedico(); // Carrega a agenda do médico

    } else if (userType === 'paciente') {
        // VISÃO PACIENTE
        if (medicoView) medicoView.classList.add('hidden');
        if (pacienteView) pacienteView.classList.remove('hidden');
        if (modalAgendamento) modalAgendamento.classList.add('hidden'); // Garante que o modal esteja oculto no carregamento

        carregarMedicos(); // Carrega a lista de médicos para agendar
        carregarAgendamentos(); // Carrega os agendamentos do paciente logado
    } else {
        // Usuário logado mas sem userType, trata como paciente por padrão ou redireciona
        carregarMedicos();
        carregarAgendamentos();
    }
}


// ======================================================
// 5. FUNÇÃO: CARREGAR E EXIBIR MÉDICOS (GET) (VISÃO PACIENTE)
// ======================================================
async function carregarMedicos() {
    const container = document.getElementById('medicos-container');
    if (!container) return; 

    container.innerHTML = 'Carregando lista de médicos...';

    try {
        const response = await fetch(API_URL_BASE + '/medicos', {
            method: 'GET',
            headers: getAuthHeaders() 
        });

        if (await handleAuthError(response)) return; 

        const data = await response.json();

        if (data.success && data.medicos.length > 0) {
            let htmlContent = '';
            
            data.medicos.forEach(medico => {
                const crmExibido = medico.CRM || 'Não informado'; 
                
                // NOVO: Prepara a lista de convênios
                const convenios = medico.Convenios || [];
                let listaConveniosHtml = '';

                if (convenios.length > 0) {
                    listaConveniosHtml += `<p><strong>Convênios Atendidos:</strong></p><ul>`;
                    convenios.forEach(convenio => {
                        // Verifica se o convênio é uma string não vazia
                        if (convenio && typeof convenio === 'string' && convenio.trim() !== '') {
                            listaConveniosHtml += `<li>${convenio}</li>`;
                        }
                    });
                    listaConveniosHtml += `</ul>`;
                } else {
                    listaConveniosHtml = `<p><strong>Convênios:</strong> Não informado</p>`;
                }
                
                // Finaliza o HTML do card
                htmlContent += `
                    <div class="medico-card">
                        <h3>Dr. ${medico.Nome}</h3>
                        <p><strong>Especialidade:</strong> ${medico.Especialidade}</p>
                        <p><strong>CRM:</strong> ${crmExibido}</p>
                        
                        <div class="convenios-info">
                            ${listaConveniosHtml}
                        </div>
                        
                        <button onclick="abrirModalAgendamento(${medico.ID_Medico}, '${medico.Nome}', '${medico.Especialidade}')">
                            Agendar Consulta
                        </button>
                    </div>
                `;
            });

            container.innerHTML = htmlContent;

        } else {
            container.innerHTML = '<p>Nenhum médico encontrado no banco de dados.</p>';
        }

    } catch (error) {
        console.error('Erro ao buscar médicos:', error);
        container.innerHTML = '<p style="color: red;">Erro de conexão. Verifique se o Node.js está rodando (porta 4000).</p>';
    }
}


// ======================================================
// 6. FUNÇÃO: CARREGAR AGENDAMENTOS (VISÃO PACIENTE)
// ======================================================
async function carregarAgendamentos() {
    // Para paciente, carrega seus agendamentos
    const container = document.getElementById('paciente-agendamentos-container'); 
    if (!container) return; 

    container.innerHTML = 'Carregando seus agendamentos...'; 

    // Obtém filtros (se o paciente tiver filtros em sua view)
    const medicoId = document.getElementById('filtro-medico')?.value; 
    const status = document.getElementById('filtro-status')?.value;
    const dataConsulta = document.getElementById('filtro-data')?.value;

    const params = new URLSearchParams();
    if (medicoId) params.append('medicoId', medicoId);
    if (status) params.append('status', status);
    if (dataConsulta) params.append('dataConsulta', dataConsulta);

    const urlBusca = API_URL_BASE + '/agendamentos?' + params.toString();
    
    try {
        const response = await fetch(urlBusca, {
            method: 'GET',
            headers: getAuthHeaders() // A API filtra pelo ID do paciente
        });
        
        if (await handleAuthError(response)) return; 

        const data = await response.json();

        if (data.success) {
            renderizarTabelaAgendamentos(data.agendamentos, 'paciente', container.id);
        } else {
            container.innerHTML = `<p>Erro ao carregar agendamentos: ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Erro ao buscar agendamentos do paciente:', error);
        container.innerHTML = '<p style="color: red;">Erro ao carregar a lista de agendamentos.</p>';
    }
}


// ======================================================
// 7. FUNÇÃO: CARREGAR AGENDAMENTOS (VISÃO MÉDICO)
// ======================================================
async function carregarAgendamentosMedico() {
    // Para médico, carrega sua agenda
    const container = document.getElementById('agendamentos-container-medico'); 
    if (!container) return; 

    container.innerHTML = 'Carregando sua agenda...'; 

    // Obtém filtros (usando IDs específicos da visão Médico)
    const status = document.getElementById('filtro-status-medico')?.value;
    const dataConsulta = document.getElementById('filtro-data-medico')?.value;

    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (dataConsulta) params.append('dataConsulta', dataConsulta);

    const urlBusca = API_URL_BASE + '/agendamentos?' + params.toString();
    
    try {
        const response = await fetch(urlBusca, {
            method: 'GET',
            headers: getAuthHeaders() // A API filtra pelo ID do médico logado
        });
        
        if (await handleAuthError(response)) return; 

        const data = await response.json();

        if (data.success) {
             renderizarTabelaAgendamentos(data.agendamentos, 'medico', container.id);
        } else {
            container.innerHTML = `<p>Erro ao carregar agenda: ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Erro ao buscar agenda do médico:', error);
        container.innerHTML = '<p style="color: red;">Erro ao carregar a agenda.</p>';
    }
}

function resetFiltrosMedico() {
    document.getElementById('filtro-status-medico').value = '';
    document.getElementById('filtro-data-medico').value = '';
    carregarAgendamentosMedico();
}


// ======================================================
// 8. FUNÇÃO: RENDERIZAR TABELA DE AGENDAMENTOS (UNIFICADA)
// ======================================================
function renderizarTabelaAgendamentos(agendamentos, userType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!agendamentos || agendamentos.length === 0) {
        container.innerHTML = '<p>Nenhuma consulta agendada encontrada com os filtros atuais.</p>';
        return;
    }
    
    let htmlContent = `
        <table class="agendamentos-table">
            <thead>
                <tr>
                    <th>Data/Hora</th>
                    <th>${userType === 'medico' ? 'Paciente (CPF)' : 'Médico (CRM)'}</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    agendamentos.forEach(agendamento => {
        const dataHora = new Date(agendamento.DataHora);
        const dataFormatada = dataHora.toLocaleDateString('pt-BR');
        const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const statusClass = agendamento.status_consulta.toLowerCase();

        // Conteúdo da coluna Médico/Paciente
        let infoPrincipal;
        if (userType === 'medico') {
            infoPrincipal = `${agendamento.NomePaciente} <br><small>CPF: ${agendamento.CPFPaciente || 'Não informado'}</small>`;
        } else {
            infoPrincipal = `Dr. ${agendamento.NomeMedico} <br><small>CRM: ${agendamento.CRMMedico || 'Não informado'}</small>`;
        }
        
        // Ações: Status Select para Médico, Botão Cancelar para Paciente
        let acoesHtml;
        if (userType === 'medico') {
            acoesHtml = `
                <select onchange="atualizarStatusConsulta(${agendamento.ID_Agendamento}, this.value, 'medico')" data-current-status="${agendamento.status_consulta}">
                    <option value="" disabled selected>Mudar status</option>
                    <option value="Pendente" ${agendamento.status_consulta === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Confirmada" ${agendamento.status_consulta === 'Confirmada' ? 'selected' : ''}>Confirmada</option>
                    <option value="Realizada" ${agendamento.status_consulta === 'Realizada' ? 'selected' : ''}>Realizada</option>
                    <option value="Cancelado" ${agendamento.status_consulta === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            `;
            // Adiciona o botão de exclusão
            acoesHtml += `<button class="btn-delete" onclick="confirmarExclusao(${agendamento.ID_Agendamento}, 'medico')">Excluir</button>`;

        } else {
            // Paciente só pode cancelar se o status for Pendente ou Confirmado (lógica de negócio)
            if (agendamento.status_consulta === 'Pendente' || agendamento.status_consulta === 'Confirmada') {
                 acoesHtml = `<button class="btn-cancelar" onclick="confirmarExclusao(${agendamento.ID_Agendamento}, 'paciente')">Cancelar</button>`;
            } else {
                acoesHtml = '<span>Ações indisponíveis</span>';
            }
        }


        htmlContent += `
            <tr class="agendamento-row status-${statusClass}">
                <td>${dataFormatada} ${horaFormatada}</td>
                <td>${infoPrincipal}</td>
                <td><span class="status-tag status-${statusClass}">${agendamento.status_consulta}</span></td>
                <td>${acoesHtml}</td>
            </tr>
        `;
    });

    htmlContent += `</tbody></table>`;
    container.innerHTML = htmlContent;
}


// ======================================================
// 9. FUNÇÃO: ATUALIZAR STATUS DA CONSULTA
// ======================================================
async function atualizarStatusConsulta(id, novoStatus, userType) {
    if (!id || !novoStatus) return; 

    if(!confirm(`Tem certeza que deseja mudar o status do agendamento ID ${id} para "${novoStatus}"?`)){ 
        // Lógica para reverter o select 
        const selectElement = document.querySelector(`select[onchange*="${id}"]`); 
        if(selectElement){
            selectElement.value = selectElement.getAttribute('data-current-status'); 
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_URL_BASE}/agendamentos/${id}/status`,{ 
            method: 'PATCH',
            headers: getAuthHeaders(), 
            body: JSON.stringify({ novoStatus }) 
        });

        if (await handleAuthError(response)) return; 

        const result = await response.json(); 

        if (result.success) { 
            alert(result.message);
            // Recarrega a lista correta
            if (userType === 'medico') {
                carregarAgendamentosMedico();
            } else {
                carregarAgendamentos();
            }
            
        } else {
            alert('Erro ao atualizar status: ' + (result.message || 'Erro desconhecido.'));
            // Recarrega para refletir o status real em caso de erro
            if (userType === 'medico') {
                carregarAgendamentosMedico();
            } else {
                carregarAgendamentos();
            }
        }
        
    } catch(error){
        console.error('Erro na requisição de atualização de status:', error);
        alert('Erro de conexão com o servidor.')
    }
}

// ======================================================
// 10. FUNÇÕES: DELETAR/CANCELAR AGENDAMENTO
// ======================================================

function confirmarExclusao(agendamentoId, userType) {
    let mensagem;
    if (userType === 'medico') {
        mensagem = `Tem certeza que deseja EXCLUIR o agendamento #${agendamentoId}? Esta ação é irreversível.`;
    } else {
        mensagem = `Tem certeza que deseja CANCELAR o agendamento #${agendamentoId}?`;
    }
    
    if (confirm(mensagem)) {
        deletarAgendamento(agendamentoId, userType);
    }
}

async function deletarAgendamento(agendamentoId, userType) {
    try {
        const response = await fetch(`${API_URL_BASE}/agendamentos/${agendamentoId}`, {
            method: 'DELETE',
            headers: getAuthHeaders() 
        });
        
        if (await handleAuthError(response)) return; 

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            // Recarrega a lista correta
            if (userType === 'medico') {
                carregarAgendamentosMedico();
            } else {
                carregarAgendamentos();
            }
        } else {
            alert(`Erro: ${data.message}`); 
        }

    } catch (error) {
        console.error('Erro ao deletar agendamento:', error);
        alert('Erro de conexão ao tentar excluir o agendamento.');
    }
}


// ======================================================
// FUNÇÕES AUXILIARES (MODAL, AGENDAMENTO, PACIENTE/MÉDICO)
// ======================================================

/**
 * LÓGICA DE AGENDAMENTO E VALIDAÇÃO DE CPF
 */

// NOVO: Função para limpar o CPF
function limparCPF(cpf) {
    if (!cpf) return '';
    // Remove caracteres não numéricos (pontos, traços, etc.) e espaços
    return cpf.replace(/[^\d]/g, '').trim(); 
}

// Ouve o evento 'Enter' no campo CPF para acionar a busca
function handleCpfEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); 
        const cpfInput = document.getElementById('pacienteCpf');
        // Usa o CPF LIMPO na busca
        buscarPacientePorCpf(limparCPF(cpfInput.value)).catch(err => {
            console.error("Erro na busca de CPF:", err);
        });
    }
}

function abrirModalAgendamento(medicoId, medicoNome, medicoEspecialidade = '') {
    const modal = document.getElementById('modal-agendamento');
    if (!modal) return; 
    
    const nomeSpan = document.getElementById('medico-nome');
    const idInput = document.getElementById('medico-id-input'); 
    const especialidadeInput = document.getElementById('especialidadeDesejada'); 
    const cpfInput = document.getElementById('pacienteCpf'); 
    const nomeNovoInput = document.getElementById('nomePacienteNovo'); 
    const containerCadastro = document.getElementById('cadastro-paciente-container');
    const nomePacienteExibido = document.getElementById('nomePacienteExibido');
    const dataInput = document.getElementById('dataConsulta');
    const horaInput = document.getElementById('horaConsulta');

    nomeSpan.textContent = medicoNome;
    idInput.name = 'medicoId'; 
    idInput.value = medicoId;
    especialidadeInput.value = medicoEspecialidade; 
    
    // Reset de todos os campos
    cpfInput.value = ''; 
    nomePacienteExibido.textContent = 'Aguardando CPF...';
    nomePacienteExibido.style.color = 'gray';
    if(dataInput) dataInput.value = '';
    if(horaInput) horaInput.value = '';
    
    if (nomeNovoInput) {
        nomeNovoInput.value = ''; 
        nomeNovoInput.disabled = true; 
    }
    
    if (containerCadastro) {
        containerCadastro.classList.add('escondido'); 
    }
    
    pacienteEncontradoNome = null;
    isNovoPaciente = false; // Reset da flag de novo paciente
    
    // LÓGICA DE SEGURANÇA/RESTRICAO DE CPF PARA PACIENTE LOGADO
    if (userType === 'paciente' && userCPF) {
        // Paciente logado só pode agendar para si mesmo.
        // CORREÇÃO: Define o valor do input com o CPF limpo para garantir a consistência
        const cpfLimpoDoUsuario = limparCPF(userCPF);
        cpfInput.value = cpfLimpoDoUsuario; 
        cpfInput.readOnly = true; // Bloqueia a edição
        nomePacienteExibido.textContent = userName; // Usa o nome logado
        nomePacienteExibido.style.color = 'black';
        pacienteEncontradoNome = userName; // Define o nome para agendamento
        
        // Remove funcionalidades de busca/cadastro, pois são desnecessárias
        cpfInput.removeEventListener('keydown', handleCpfEnter); 
        
    } else {
        // Usuário (ex: médico/admin/atendente) agendando para terceiros.
        cpfInput.readOnly = false; // Permite digitação
        
        // Adiciona a busca por CPF apenas se o campo estiver editável
        cpfInput.removeEventListener('keydown', handleCpfEnter); // Previne duplicidade
        cpfInput.addEventListener('keydown', handleCpfEnter);
    }
    
    // Abre o modal
    modal.classList.remove('hidden'); 
    modal.classList.add('modal-visivel');
}

function fecharModal(){
    const modal = document.getElementById('modal-agendamento');
    if (!modal) return; 

    // Fecha o modal
    modal.classList.add('hidden');
    modal.classList.remove('modal-visivel');
    
    document.getElementById('form-agendamento').reset();
    
    const cpfInput = document.getElementById('pacienteCpf');
    if (cpfInput) {
        // Limpa o listener de Enter/busca para evitar problemas fora do modal
        cpfInput.removeEventListener('keydown', handleCpfEnter);
        // Garante que o campo volte a ser editável se não for paciente
        if (userType !== 'paciente') {
             cpfInput.readOnly = false; 
        }
    }
    
    document.getElementById('nomePacienteExibido').textContent = 'Aguardando CPF...';
    document.getElementById('nomePacienteExibido').style.color = 'gray';
    
    const containerCadastro = document.getElementById('cadastro-paciente-container');
    const nomeNovoInput = document.getElementById('nomePacienteNovo'); 

    if (containerCadastro) {
        containerCadastro.classList.add('escondido');
    }
    
    if (nomeNovoInput) {
        nomeNovoInput.disabled = true; 
    }
    
    pacienteEncontradoNome = null;
    isNovoPaciente = false;
}

// AJUSTADO: Função agendarConsulta
async function agendarConsulta(event) {
    event.preventDefault(); // Impede o envio tradicional do formulário e o recarregamento da página

    // **PASSO 1: LEITURA E LIMPEZA DOS DADOS**
    const medicoId = document.getElementById('medico-id-input')?.value.trim();
    const pacienteCpfInput = document.getElementById('pacienteCpf')?.value.trim();
    const especialidadeDesejada = document.getElementById('especialidadeDesejada')?.value.trim();
    const dataConsulta = document.getElementById('dataConsulta')?.value.trim();
    const horaConsulta = document.getElementById('horaConsulta')?.value.trim();
    const nomeNovo = document.getElementById('nomePacienteNovo')?.value.trim();
    
    // Combina data e hora
    const DataHora = dataConsulta && horaConsulta ? `${dataConsulta}T${horaConsulta}:00` : '';

    // Limpa os CPFs para validação e payload
    const cpfLimpo = limparCPF(pacienteCpfInput);
    const userCPFLimpo = limparCPF(userCPF);
    
    // **PASSO 2: VALIDAÇÃO BÁSICA**
    if (!cpfLimpo || cpfLimpo.length < 11) {
        alert('Por favor, informe um CPF válido (11 dígitos).');
        return;
    }
    if (!DataHora || !especialidadeDesejada) { 
        alert('Por favor, preencha todos os campos obrigatórios (Data/Hora e Especialidade).');
        return;
    }
    
    // **PASSO 3: CORREÇÃO DA LÓGICA DE SEGURANÇA (Paciente logado)**
    // COMPARA O CPF LOGADO LIMPO COM O CPF DO FORMULÁRIO LIMPO
    if (userType === 'paciente' && userCPFLimpo && userCPFLimpo !== cpfLimpo) {
        alert('Erro de segurança: Um paciente logado só pode agendar para o seu próprio CPF.');
        return;
    }

    // **PASSO 4: Lógica de Cadastro de Novo Paciente (se aplicável)**
    if (isNovoPaciente) {
        if (!nomeNovo) {
            alert('O paciente não foi encontrado. Por favor, preencha o campo de Nome para o novo cadastro.');
            return;
        }
        const cadastroSucesso = await cadastrarNovoPaciente(cpfLimpo, nomeNovo); // Envia o CPF LIMPO
        if (!cadastroSucesso) {
            alert('Falha ao cadastrar novo paciente. Não foi possível realizar o agendamento.');
            return;
        }
        // Após o cadastro bem-sucedido, o agendamento prossegue
    } else if (!pacienteEncontradoNome && userType !== 'paciente') {
        // Se não é um novo paciente e não está logado como paciente, é preciso buscar o nome/confirmar
        alert('Por favor, confirme o CPF do paciente antes de agendar.');
        return;
    }


    // **PASSO 5: ENVIANDO O AGENDAMENTO**
    const payload = {
        ID_Medico: parseInt(medicoId),
        CPFPaciente: cpfLimpo, // Envia o CPF LIMPO para o backend
        DataHora: DataHora,
        EspecialidadeDesejada: especialidadeDesejada,
    };
    
    try {
        const response = await fetch(API_URL_BASE + '/agendamentos', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (await handleAuthError(response)) return;

        const result = await response.json();

        if (result.success) {
            alert('Consulta agendada com sucesso!');
            fecharModal(); // Fecha o modal após o sucesso
            carregarAgendamentos(); // Recarrega a lista de agendamentos do paciente
        } else {
            alert('Erro ao agendar consulta: ' + (result.message || 'Erro desconhecido.'));
        }

    } catch (error) {
        console.error('Erro na requisição de agendamento:', error);
        alert('Erro de conexão com o servidor ao agendar consulta.');
    }
}


// AJUSTADO: Função buscarPacientePorCpf (Usa CPF limpo na busca e na validação)
async function buscarPacientePorCpf(cpfLimpo) {
    const nomePacienteExibido = document.getElementById('nomePacienteExibido');
    const nomeNovoInput = document.getElementById('nomePacienteNovo'); 
    const containerCadastro = document.getElementById('cadastro-paciente-container');

    // 1. Limpa o estado
    nomePacienteExibido.textContent = 'Buscando...';
    nomePacienteExibido.style.color = 'gray';
    pacienteEncontradoNome = null;
    isNovoPaciente = false;
    if (containerCadastro) containerCadastro.classList.add('escondido');
    if (nomeNovoInput) nomeNovoInput.disabled = true;

    // Validação básica do CPF
    if (!cpfLimpo || cpfLimpo.length < 11) {
        nomePacienteExibido.textContent = 'CPF Inválido';
        return;
    }
    
    // Impedir a busca se o paciente logado não for o dono do CPF digitado.
    const userCPFLimpo = limparCPF(userCPF);
    if (userType === 'paciente' && userCPFLimpo && userCPFLimpo !== cpfLimpo) {
        alert("Erro: Como paciente, você só pode agendar para o seu próprio CPF.");
        nomePacienteExibido.textContent = 'Acesso Negado';
        return; 
    }
    

    try {
        const response = await fetch(`${API_URL_BASE}/pacientes/cpf/${cpfLimpo}`, { // Usa o CPF LIMPO na URL
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (await handleAuthError(response)) return;

        const data = await response.json();

        if (data.success && data.paciente) {
            // Paciente encontrado
            pacienteEncontradoNome = data.paciente.Nome;
            nomePacienteExibido.textContent = data.paciente.Nome;
            nomePacienteExibido.style.color = 'black';
            if (containerCadastro) containerCadastro.classList.add('escondido'); // Esconde o cadastro
            if (nomeNovoInput) nomeNovoInput.disabled = true;
            isNovoPaciente = false; // Não é um novo paciente

        } else if (response.status === 404) {
            // Paciente não encontrado (NOVO CADASTRO)
            nomePacienteExibido.textContent = 'CPF não cadastrado. Preencha o nome:';
            nomePacienteExibido.style.color = 'red';

            if (containerCadastro) containerCadastro.classList.remove('escondido'); // Mostra o campo Nome para cadastro
            if (nomeNovoInput) nomeNovoInput.disabled = false;
            if (nomeNovoInput) nomeNovoInput.focus();
            isNovoPaciente = true; // É um novo paciente
            
        } else {
             // Outro erro na API
            nomePacienteExibido.textContent = 'Erro na busca';
            nomePacienteExibido.style.color = 'red';
            alert('Erro ao buscar paciente: ' + (data.message || 'Desconhecido'));
        }

    } catch (error) {
        console.error('Erro na requisição de busca de paciente:', error);
        nomePacienteExibido.textContent = 'Erro de Conexão';
        nomePacienteExibido.style.color = 'red';
    }
}


// AJUSTADO: Função cadastrarNovoPaciente (Usa CPF limpo no payload)
async function cadastrarNovoPaciente(cpfLimpo, nome) {
    if (!cpfLimpo || !nome) return false;
    
    const payload = { 
        CPF: cpfLimpo, // Envia o CPF LIMPO
        Nome: nome, 
        TipoUsuario: 'paciente' // Assume que o cadastro é sempre de paciente
        // Senha e outros campos podem ser necessários dependendo da sua API
    };

    try {
        const response = await fetch(API_URL_BASE + '/pacientes/cadastro-rapido', { // Endpoint de cadastro rápido sugerido
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (response.status === 409) {
            alert("Este paciente já está cadastrado, mas o sistema de busca não o encontrou. Tente novamente.");
            return false;
        }

        if (await handleAuthError(response)) return false;

        const result = await response.json();

        if (result.success) {
            alert(`Novo paciente ${nome} cadastrado com sucesso!`);
            pacienteEncontradoNome = nome; // Define o nome para que o agendamento prossiga
            isNovoPaciente = false;
            return true;
        } else {
            alert('Erro ao cadastrar novo paciente: ' + (result.message || 'Erro desconhecido.'));
            return false;
        }

    } catch (error) {
        console.error('Erro na requisição de cadastro de paciente:', error);
        alert('Erro de conexão com o servidor ao cadastrar paciente.');
        return false;
    }
}

// Placeholder: Função cadastrarMedico - Mantenha a estrutura
async function cadastrarMedico(event) {
    // Esta função é para cadastro_medico.html
    if (event) event.preventDefault();
    console.log('Função cadastrarMedico (Placeholder)');
}

// ======================================================
// LIGAÇÃO FINAL E INICIALIZAÇÃO
// ======================================================

// Ouve o evento de mudança (change) nos filtros da VISÃO PACIENTE
document.getElementById('form-filtros')?.addEventListener('change', carregarAgendamentos);

// Ouve o evento de mudança (change) nos filtros da VISÃO MÉDICO
document.getElementById('form-filtros-medico')?.addEventListener('change', carregarAgendamentosMedico);


// Inicia a verificação e o setup da view
document.addEventListener('DOMContentLoaded', checkAuthAndSetupView);

// Expondo funções globais necessárias para os 'onclick' do HTML
window.logout = logout;
window.abrirModalAgendamento = abrirModalAgendamento;
window.fecharModal = fecharModal;
window.agendarConsulta = agendarConsulta;
window.buscarPacientePorCpf = buscarPacientePorCpf;
window.cadastrarNovoPaciente = cadastrarNovoPaciente;
window.atualizarStatusConsulta = atualizarStatusConsulta;
window.confirmarExclusao = confirmarExclusao;
window.deletarAgendamento = deletarAgendamento; 
window.carregarAgendamentos = carregarAgendamentos; 
window.carregarAgendamentosMedico = carregarAgendamentosMedico; 
window.resetFiltrosMedico = resetFiltrosMedico;
window.cadastrarMedico = cadastrarMedico;