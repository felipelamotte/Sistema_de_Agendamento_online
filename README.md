                                              Sistema de Agendamento Online


 # 🏥 API de Agendamento Médico

Projeto de Back-end desenvolvido em Node.js com Express para gerenciar o cadastro de médicos e pacientes, autenticação segura (JWT) e o agendamento de consultas médicas em um sistema de saúde.

## 🚀 Tecnologias Utilizadas

Este projeto foi construído utilizando as seguintes tecnologias:

| Categoria | Tecnologia | Versão (Recomendada) | Função |
| :--- | :--- | :--- | :--- |
| **Ambiente** | Node.js | v18+ | Runtime do JavaScript. |
| **Framework Web** | Express | ^4.x | Criação das rotas e servidor. |
| **Banco de Dados** | MySQL Server | v8.0+ | Armazenamento de dados. |
| **Driver DB** | `mysql2/promise` | ^3.x | Conexão eficiente com MySQL usando `async/await`. |
| **Segurança** | `jsonwebtoken` (JWT) | ^9.x | Autenticação e proteção de rotas. |
| **Segurança** | `bcryptjs` | ^2.x | Criptografia de senhas (hashing). |
| **Outros** | `cors` | ^2.x | Permite requisições de origens diferentes (Frontend). |

---

## ⚙️ Pré-requisitos e Setup

Para rodar o projeto localmente, você precisará ter:

1.  **Node.js e npm** instalados.
2.  **MySQL Server** rodando.
3.  **Git** para clonar o repositório.

### 1. Clonar e Instalar

Abra seu terminal na pasta desejada e execute:

```bash
# 1. Clone o repositório
git clone [URL_DO_SEU_REPOSITORIO]
cd nome-da-pasta-do-projeto

# 2. Instale as dependências
npm install

Configurações do BackEnd no server.js

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 
    database: 'sistema_agendamento',
    // ...
};

const JWT_SECRET = 'sua_chave_secreta_aqui_e_muito_forte_e_segura'; // <--- Ajuste sua chave secreta aqui!


Estrutura das Tabelas(DDL)

-- Criação do Banco de Dados
CREATE DATABASE IF NOT EXISTS sistema_agendamento CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema_agendamento;

-- Tabela Pacientes
CREATE TABLE IF NOT EXISTS Pacientes (
    ID_Paciente INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    CPF VARCHAR(14) UNIQUE NOT NULL,
    Senha VARCHAR(255) NOT NULL, -- Hash bcrypt
    DataCadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela Medicos
CREATE TABLE IF NOT EXISTS Medicos (
    ID_Medico INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    CRM VARCHAR(20) UNIQUE NOT NULL,
    Especialidade VARCHAR(150),
    Email VARCHAR(100) UNIQUE,
    Senha VARCHAR(255) NOT NULL, -- Hash bcrypt
    DataCadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Convênios (Exemplo Básico)
CREATE TABLE IF NOT EXISTS Convenios (
    ID_Convenio INT AUTO_INCREMENT PRIMARY KEY,
    NomeConvenio VARCHAR(100) NOT NULL
);

-- Inserindo um convênio padrão (ID_Convenio = 1 é usado na rota POST /api/agendamentos)
INSERT INTO Convenios (NomeConvenio) VALUES ('Particular/Padrão') ON DUPLICATE KEY UPDATE NomeConvenio = NomeConvenio;

-- Tabela Agendamento
CREATE TABLE IF NOT EXISTS Agendamento (
    ID_Agendamento INT AUTO_INCREMENT PRIMARY KEY,
    ID_Medico INT NOT NULL,
    ID_Paciente INT NOT NULL,
    ID_Convenio INT NOT NULL DEFAULT 1,
    DataHora DATETIME NOT NULL,
    status_consulta VARCHAR(50) DEFAULT 'Pendente', -- Valores: Pendente, Confirmado, Cancelado, Realizado
    Duracao INT DEFAULT 30, -- Duração em minutos
    EspecialidadeDesejada VARCHAR(150),
    FOREIGN KEY (ID_Medico) REFERENCES Medicos(ID_Medico),
    FOREIGN KEY (ID_Paciente) REFERENCES Pacientes(ID_Paciente),
    FOREIGN KEY (ID_Convenio) REFERENCES Convenios(ID_Convenio)
);

Executar no Servidor

node server.js

🔒 Documentação dos Endpoints (API)
Todas as rotas da API retornam objetos JSON com a estrutura padrão {"success": true/false, "message": "...", ...}.

🔑 Autenticação (Login e Token JWT)
Rota,Método,Descrição,Requer Token?,Corpo da Requisição (JSON),Resposta de Sucesso (Exemplo)
/api/pacientes/cadastro,POST,Cria conta de Paciente.,Não,"{""nome"": ""João Silva"", ""cpf"": ""12345678900"", ""senha"": ""senha123""}","{ ""success"": true, ""pacienteId"": 1 }"
/api/pacientes/login,POST,Login de Paciente.,Não,"{""cpf"": ""12345678900"", ""senha"": ""senha123""}","{ ""token"": ""..."", ""tipo"": ""paciente"" }"
/api/medicos/cadastro,POST,Cria conta de Médico (Auto-cadastro).,Não,"{""nome"": ""Dr. Carlos"", ""crm"": ""12345"", ""especialidade"": ""Geral"", ""senha"": ""senhaMed""}","{ ""success"": true, ""medicoId"": 1 }"
/api/medicos/login,POST,Login de Médico.,Não,"{""crm"": ""12345"", ""senha"": ""senhaMed""}","{ ""token"": ""..."", ""tipo"": ""medico"" }"

🩺 Rotas Protegidas de Dados e Agendamento

Rota,Método,Descrição,Requer Token?,Corpo da Requisição (JSON) / Query Params,Permissões
/api/medicos,GET,Lista todos os médicos e especialidades.,Sim,Nenhum,Paciente/Médico
/api/agendamentos,POST,Agenda uma nova consulta.,Sim,"{""ID_Medico"": 5, ""DataHora"": ""2025-11-15T10:00:00"", ""EspecialidadeDesejada"": ""Cardiologia""}",Paciente (só para si mesmo) / Médico
/api/agendamentos,GET,Lista agendamentos. Filtrado pelo ID do usuário logado por padrão.,Sim,Opcional: ?status=Pendente&dataConsulta=YYYY-MM-DD,Paciente/Médico
/api/agendamentos/:id/status,PATCH,"Atualiza o status do agendamento (Ex: Confirmar, Realizar, Cancelar).",Sim,"{""novoStatus"": ""Confirmado""}",Apenas Médico (dono do agendamento)
/api/agendamentos/:id,DELETE,Cancela ou remove um agendamento.,Sim,Nenhum,Paciente/Médico (dono do agendamento)

🔍 Rotas Públicas/Busca

Rota,Método,Descrição,Requer Token?,Exemplo de Uso,Permissões
/api/pacientes/cpf/:cpf,GET,Busca dados públicos de um paciente pelo CPF (útil para pré-preenchimento).,Não (Pública),/api/pacientes/cpf/12345678900,Qualquer um
