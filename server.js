const express = require('express');
const mysql = require('mysql2/promise'); // Usando promessas para async/await
const path = require('path'); 
const cors = require('cors'); 
const app = express();
const port = 4000; 

// ===================================================
// DEPENDÊNCIAS DE AUTENTICAÇÃO
// ===================================================
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
// 🚨 ATENÇÃO: Use uma chave secreta forte e a armazene em variáveis de ambiente.
const JWT_SECRET = 'sua_chave_secreta_aqui_e_muito_forte_e_segura'; 

// ===================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (POOL)
// ===================================================

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Minion23##', 
    database: 'sistema_agendamento',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Cria o Pool de Conexões para melhor desempenho
const pool = mysql.createPool(dbConfig);

// Função para obter uma conexão do pool
async function getConnection() {
    return await pool.getConnection();
}

// ===================================================
// CONFIGURAÇÃO DE SEGURANÇA E SERVIÇO DE ARQUIVOS
// ===================================================

app.use(cors());
app.use(express.json()); // Permite ler JSON no corpo da requisição
app.use(express.urlencoded({ extended: true})); // Permite ler formulários
app.use(express.static(path.join(__dirname, 'public'))); // Serve arquivos estáticos (CSS, JS, imagens)


// ===================================================
// ROTAS DE SERVIÇO DE PÁGINAS HTML
// ===================================================

// Rota padrão ('/') servindo a página principal (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html')); 
});

// Serve as páginas estáticas que estão na raiz da pasta public (ex: login.html)
app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.params.page + '.html'));
});


// ===================================================
// MIDDLEWARE DE PROTEÇÃO DE ROTAS
// ===================================================

function protegerRota(req, res, next) {
    const authHeader = req.headers['authorization'];
    // Espera o formato: Bearer [token]
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ success: false, message: 'Acesso negado. Token não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // Erro de token (expirado, inválido, etc.)
            return res.status(401).json({ success: false, message: 'Token inválido ou expirado. Faça login novamente.' });
        }
        
        // Armazena dados do usuário decodificados na requisição
        req.userId = decoded.id;
        req.userTipo = decoded.tipo; // 'paciente' ou 'medico'
        req.userCpf = decoded.cpf; // Adiciona o CPF do paciente logado para segurança extra.
        next(); // Continua para a próxima função da rota
    });
}


// ===================================================
// ROTAS DE AUTENTICAÇÃO (LOGIN/CADASTRO)
// ===================================================

// ROTA: CADASTRO DE PACIENTE
app.post('/api/pacientes/cadastro', async (req, res) => {
    let connection;
    try {
        const { nome, cpf, senha } = req.body;
        if (!nome || !cpf || !senha) { return res.status(400).json({ success: false, message: 'Nome, CPF e Senha são obrigatórios.' }); }
        
        connection = await getConnection();
        
        // Verifica se o CPF já existe
        const [existing] = await connection.execute('SELECT ID_Paciente FROM Pacientes WHERE CPF = ?', [cpf]);
        if (existing.length > 0) { return res.status(409).json({ success: false, message: 'CPF já cadastrado.' }); }
        
        // Criptografia da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt); 
        
        const query = 'INSERT INTO Pacientes (Nome, CPF, Senha) VALUES (?, ?, ?)';
        const [result] = await connection.execute(query, [nome, cpf, senhaHash]); 
        
        res.status(201).json({ success: true, message: 'Cadastro realizado com sucesso!', pacienteId: result.insertId });
    } catch (error) {
        console.error('Erro ao cadastrar paciente:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao cadastrar paciente.' });
    } finally {
        if (connection) connection.release();
    }
});

// ROTA: LOGIN DE PACIENTE 
app.post('/api/pacientes/login', async (req, res) => {
    let connection;
    try {
        const { cpf, senha } = req.body;
        connection = await getConnection();
        
        // Busca o paciente e o hash da senha
        const [pacientes] = await connection.execute('SELECT ID_Paciente, Nome, Senha, CPF FROM Pacientes WHERE CPF = ?', [cpf]);
        if (pacientes.length === 0) { return res.status(401).json({ success: false, message: 'CPF ou senha inválidos.' }); }
        
        const paciente = pacientes[0];
        const isMatch = await bcrypt.compare(senha, paciente.Senha);
        if (!isMatch) { return res.status(401).json({ success: false, message: 'CPF ou senha inválidos.' }); }
        
        // Gera o Token JWT - Adiciona o CPF no token
        const token = jwt.sign({ id: paciente.ID_Paciente, tipo: 'paciente', cpf: paciente.CPF }, JWT_SECRET, { expiresIn: '1h' });
        
        // RETORNA O CPF e o ID para o Frontend armazenar
        res.json({ success: true, message: 'Login realizado com sucesso!', nome: paciente.Nome, token, tipo: 'paciente', cpf: paciente.CPF, id: paciente.ID_Paciente });
    } catch (error) {
        console.error('Erro no login do paciente:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    } finally {
        if (connection) connection.release();
    }
});

// ROTA: CADASTRO DE MÉDICO (Auto-cadastro pelo formulário do frontend)
app.post('/api/medicos/cadastro', async (req, res) => {
    let connection;
    try {
        const { nome, crm, especialidade, senha } = req.body;
        
        // Email placeholder, já que não é coletado no frontend atual de cadastro
        const email = req.body.email || `${crm}@crm.com.br`; 

        if (!nome || !crm || !especialidade || !senha) { 
            return res.status(400).json({ success: false, message: 'Nome, CRM, Especialidade e Senha são obrigatórios.' }); 
        }

        connection = await getConnection();

        // 1. Verificar se o CRM já existe
        const [existing] = await connection.execute('SELECT ID_Medico FROM Medicos WHERE CRM = ?', [crm]);
        if (existing.length > 0) { 
            return res.status(409).json({ success: false, message: 'CRM já cadastrado.' }); 
        }

        // 2. Criar Hash da Senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt); 
        
        // 3. Salvar no banco de dados (Especialidade é a string separada por vírgulas)
        const sql = `INSERT INTO Medicos (Nome, CRM, Especialidade, Email, Senha) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await connection.execute(sql, [nome, crm, especialidade, email, senhaHash]);

        res.status(201).json({ 
            success: true, 
            message: 'Cadastro realizado com sucesso!', 
            medicoId: result.insertId
        });

    } catch (error) {
        console.error('Erro ao cadastrar médico (auto-cadastro):', error);
        res.status(500).json({ success: false, message: 'Erro interno ao cadastrar médico.' });
    } finally {
        if (connection) connection.release();
    }
});

// ROTA: LOGIN DE MÉDICO
app.post('/api/medicos/login', async (req, res) => {
    let connection;
    try {
        const { crm, senha } = req.body; // Médicos usam CRM e Senha
        
        if (!crm || !senha) { return res.status(400).json({ success: false, message: 'CRM e senha são obrigatórios.' }); }

        connection = await getConnection();
        
        // Busca o médico e o hash da senha pelo CRM
        const [medicos] = await connection.execute('SELECT ID_Medico, Nome, Senha FROM Medicos WHERE CRM = ?', [crm]);
        
        if (medicos.length === 0) { return res.status(401).json({ success: false, message: 'CRM ou senha inválidos.' }); }
        
        const medico = medicos[0];
        
        // Comparação da senha
        const isMatch = await bcrypt.compare(senha, medico.Senha);
        
        if (!isMatch) { return res.status(401).json({ success: false, message: 'CRM ou senha inválidos.' }); }
        
        // Gera o Token JWT
        const token = jwt.sign({ id: medico.ID_Medico, tipo: 'medico' }, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({ success: true, message: 'Login realizado com sucesso!', nome: medico.Nome, token, tipo: 'medico' });

    } catch (error) {
        console.error('Erro no login do médico:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    } finally {
        if (connection) connection.release();
    }
});


// ===================================================
// ROTAS PROTEGIDAS POR AUTENTICAÇÃO
// ===================================================

// ROTA: LISTAR TODOS OS MÉDICOS (API) - Acesso após login
app.get('/api/medicos', protegerRota, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [rows] = await connection.execute('SELECT ID_Medico, Nome, Especialidade, CRM FROM Medicos ORDER BY Nome');
        res.json({ success: true, medicos: rows });
    } catch (error) {
        console.error("Erro no Banco de Dados (Médicos):", error.message);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    } finally {
        if (connection) connection.release();
    }
});

// ROTA: CADASTRAR NOVO MÉDICO (Rota para Admin/Autorizado)
app.post('/api/medicos', protegerRota, async (req, res) => {
    let connection;
    const { nome, crm, especialidade, email, senha } = req.body; 
    const senhaPadrao = senha || crm; // Usa a senha enviada ou CRM como fallback
    
    if (!nome || !crm || !especialidade || !email || !senhaPadrao) {
        return res.status(400).json({ success: false, message: 'Todos os campos (nome, CRM, especialidade, email, senha) são obrigatórios.' });
    }

    try {
        connection = await getConnection();

        // 1. Verificar se o CRM ou Email já existem
        const [existing] = await connection.execute(
            'SELECT ID_Medico FROM Medicos WHERE CRM = ? OR Email = ?', 
            [crm, email]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'CRM ou E-mail já cadastrado(s) para outro médico.' });
        }

        // 2. Criar Hash da Senha Padrão
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senhaPadrao, salt); 
        
        // 3. Salvar no banco de dados
        const sql = `INSERT INTO Medicos (Nome, CRM, Especialidade, Email, Senha) VALUES (?, ?, ?, ?, ?)`;
        
        const [result] = await connection.execute(sql, [nome, crm, especialidade, email, senhaHash]);

        res.status(201).json({ 
            success: true, 
            message: 'Médico cadastrado com sucesso!', 
            medicoId: result.insertId
        });

    } catch (error) {
        console.error('Erro ao cadastrar médico no DB (Admin):', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao cadastrar médico.' });
    } finally {
        if (connection) connection.release();
    }
});

// CORREÇÃO CRÍTICA/REVISÃO: ROTA AGENDAR CONSULTA (Método POST)
app.post('/api/agendamentos', protegerRota, async(req, res) =>{
    let connection;
    try{
        // CPFPaciente pode ser undefined se o frontend não enviar (ideal para pacientes logados)
        const { ID_Medico, CPFPaciente, DataHora, EspecialidadeDesejada } = req.body;
        let pacienteId;
        
        // Validação de campos essenciais (exceto CPFPaciente, que será validado abaixo)
        if (!ID_Medico || !DataHora || !EspecialidadeDesejada) {
            return res.status(400).json({ success: false, message: 'ID do Médico, Data/Hora e Especialidade são obrigatórios.' });
        }
        
        connection = await getConnection();

        // Lógica de Segurança: Define o pacienteId baseado no tipo de usuário
        if (req.userTipo === 'paciente') {
            // Paciente logado só pode agendar para si mesmo. Usa o ID do token.
            pacienteId = req.userId;
            // Ignora qualquer CPFPaciente enviado no body, forçando o agendamento para o user logado.
        } else {
            // Se não for paciente (ex: médico ou admin), o CPF do paciente é obrigatório no body.
            if (!CPFPaciente) {
                return res.status(400).json({ success: false, message: 'Para agendar para outro, o CPF do paciente é obrigatório.' });
            }
            
            // Busca o ID_Paciente usando o CPF fornecido (para outros tipos de user)
            const [pacientes] = await connection.execute('SELECT ID_Paciente FROM Pacientes WHERE CPF = ?', [CPFPaciente]);
            if(pacientes.length === 0){
                return res.status(404).json({success: false, message: 'Paciente não encontrado com o CPF fornecido.'});
            }
            pacienteId = pacientes[0].ID_Paciente; 
        }
        
        // Configurações de agendamento padrão
        const statusConsulta = 'Pendente';
        const duracaoConsulta = 30; // 30 minutos (Exemplo)
        const idConvenio = 1; // ID fixo para o exemplo
        
        // Inserção no DB
        const query = 
            'INSERT INTO Agendamento ' +
            '(ID_Medico, ID_Paciente, ID_Convenio, DataHora, status_consulta, Duracao, EspecialidadeDesejada) ' + // Adicionado EspecialidadeDesejada
            'VALUES (?, ?, ?, ?, ?, ?, ?)';
        
        const [result] = await connection.execute(query, [ID_Medico, pacienteId, idConvenio, DataHora, statusConsulta, duracaoConsulta, EspecialidadeDesejada]);
        
        res.json({success: true, message: 'Agendamento criado com sucesso.', agendamentoId: result.insertId });
    } catch (error) {
        console.error("Erro ao agendar consulta:", error);
        res.status(500).json({success: false, message: 'Erro interno ao salvar o agendamento'});
    } finally {
        if(connection) connection.release();
    }
});

// ROTA: LISTAR AGENDAMENTOS (Método GET)
app.get('/api/agendamentos', protegerRota, async (req, res) => {
    let connection;
    try {
        const { medicoId, status, dataConsulta } = req.query;
        let queryParams = [];
        let whereClauses = [];

        // Lógica de restrição/filtro obrigatório
        if (req.userTipo === 'medico') {
            // Se o usuário é um médico, força o filtro para o ID dele
            whereClauses.push('A.ID_Medico = ?');
            queryParams.push(req.userId);
        } else if (req.userTipo === 'paciente') {
            // Se o usuário é um paciente, força o filtro para o ID dele
            whereClauses.push('A.ID_Paciente = ?');
            queryParams.push(req.userId);
        }

        // Filtros opcionais (principalmente para um Admin ou visão mais ampla)
        // Nota: O filtro 'medicoId' só funcionará se o user não for 'medico' (já filtrado acima)
        if (req.userTipo !== 'medico' && medicoId) { whereClauses.push('A.ID_Medico = ?'); queryParams.push(medicoId); }
        if (status) { whereClauses.push('A.status_consulta = ?'); queryParams.push(status); }
        if (dataConsulta) { whereClauses.push('DATE(A.DataHora) = ?'); queryParams.push(dataConsulta); } 
        
        
        let query = 'SELECT A.ID_Agendamento, A.DataHora, A.status_consulta, M.Nome AS NomeMedico, P.Nome AS NomePaciente, P.CPF AS CPFPaciente, M.CRM AS CRMMedico FROM Agendamento A JOIN Medicos M ON A.ID_Medico = M.ID_Medico JOIN Pacientes P ON A.ID_Paciente = P.ID_Paciente';

        if (whereClauses.length > 0) { query += ' WHERE ' + whereClauses.join(' AND '); }
        query += ' ORDER BY A.DataHora DESC';
        
        connection = await getConnection();
        const [rows] = await connection.execute(query, queryParams);
        res.json({ success: true, agendamentos: rows });
    } catch (error) {
        console.error("Erro ao listar agendamentos:", error); 
        res.status(500).json({ success: false, message: 'Erro interno ao buscar agendamentos.' });
    } finally {
        if (connection) connection.release();
    }
});

// ROTA: ATUALIZAR STATUS DO AGENDAMENTO (PATCH)
app.patch('/api/agendamentos/:id/status', protegerRota, async (req, res) => {
    let connection;
    try{
        const agendamentoId = req.params.id;
        const { novoStatus } = req.body;
        if(!novoStatus){ return res.status(400).json({ success: false, message: 'O novo status é obrigatório.'}); }
        
        connection = await getConnection();
        
        let proprietarioFiltro = '';
        let params = [novoStatus, agendamentoId];

        // Restrição: Apenas o médico que possui o agendamento pode alterá-lo.
        if (req.userTipo === 'medico') {
            proprietarioFiltro = ' AND ID_Medico = ?';
            params.push(req.userId);
        } else if (req.userTipo === 'paciente') {
             // Pacientes não podem mudar status, apenas deletar (cancelar)
            return res.status(403).json({ success: false, message: 'Você não tem permissão para alterar o status do agendamento.'});
        }

        const query = `UPDATE Agendamento SET status_consulta = ? WHERE ID_Agendamento = ? ${proprietarioFiltro}`;
        const [result] = await connection.execute(query, params);
        
        if (result.affectedRows === 0){ 
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado ou você não tem permissão para alterá-lo.'}); 
        }
        
        res.json({ success: true, message: 'Status do agendamento atualizado com sucesso.'})
    } catch(error){
        console.error("Erro ao atualizar status do agendamento:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao atualizar o status do agendamento'});
    } finally{
        if(connection) connection.release();
    }
});

// ROTA: DELETAR AGENDAMENTO (DELETE)
app.delete('/api/agendamentos/:id', protegerRota, async(req, res) => { 
    let connection;
    try{
        const agendamentoId = req.params.id;
        connection = await getConnection();
        
        let proprietarioFiltro = '';
        let params = [agendamentoId];

        // Restrição: Apenas o paciente ou o médico responsável pode deletar (cancelar)
        if (req.userTipo === 'paciente') {
            proprietarioFiltro = ' AND ID_Paciente = ?';
            params.push(req.userId);
        } else if (req.userTipo === 'medico') {
            proprietarioFiltro = ' AND ID_Medico = ?';
            params.push(req.userId);
        }
        
        const query = `DELETE FROM Agendamento WHERE ID_Agendamento = ? ${proprietarioFiltro}`;
        const [result] = await connection.execute(query, params); 
        
        if(result.affectedRows === 0){ return res.status(404).json({success: false, message: 'Agendamento não encontrado ou você não tem permissão para excluí-lo.'}); }
        
        res.json({success: true, message: 'Agendamento excluído com sucesso.'}); 
    } catch(error){
        console.error("Erro ao deletar agendamento:", error);
        res.status(500).json({success: false, message: 'Erro interno ao deletar agendamento.'});
    } finally { 
        if (connection) connection.release();
    }
});

// ===================================================
// ROTAS DE DADOS (NÃO REQUEREM AUTENTICAÇÃO FORTE)
// ===================================================

// ROTA: BUSCAR PACIENTE POR CPF (GET) - Útil para preencher formulário de agendamento
app.get('/api/pacientes/cpf/:cpf', async(req, res) => {
    let connection;
    try{
        const pacienteCpf = req.params.cpf;
        connection = await getConnection();
        // Apenas dados públicos do paciente
        const [rows] = await connection.execute('SELECT ID_Paciente, Nome, CPF FROM Pacientes WHERE CPF = ?', [pacienteCpf]);
        if(rows.length === 0){ 
            return res.status(404).json({success: false, message: 'Paciente não encontrado com o CPF fornecido.'});
        }
        res.json({success: true, paciente: rows[0]}); 
    } catch(error){
        console.error("Erro ao buscar paciente por CPF:", error);
        res.status(500).json({success: false, message: 'Erro interno ao buscar paciente.'});
    } finally{
        if(connection) connection.release();
    }
});


// ===================================================
// INÍCIO DO SERVIDOR NODE.JS
// ===================================================
app.listen(port, () => {
    console.log(`Servidor Node.js LIGADO na porta ${port}`);
    console.log(`Página Inicial: http://localhost:${port}/`);
});