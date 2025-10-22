-- Cria o banco de dados se ele não existir
CREATE DATABASE IF NOT EXISTS sistema_agendamento;

-- Seleciona o banco de dados para que todos os comandos CREATE TABLE sejam executados dentro dele
USE sistema_agendamento;

-- Tabela 01: Medicos
CREATE TABLE Medicos (
    ID_Medico INT PRIMARY KEY AUTO_INCREMENT, -- Chave Primária (PK) e auto-incrementável
    CRM VARCHAR(20) NOT NULL UNIQUE,         -- Chave Única para identificação do médico
    Nome VARCHAR(100) NOT NULL,
    Especialidade VARCHAR(50) NOT NULL,
    Telefone VARCHAR(15),
    Endereco VARCHAR(255),
    Email VARCHAR(100),
    senha VARCHAR(255) NOT NULL              -- Senha hash para segurança
);

USE sistema_agendamento;

-- Tabela 02: Pacientes
CREATE TABLE Pacientes(
    ID_Paciente INT PRIMARY KEY AUTO_INCREMENT, -- Chave Primária (PK)
    CPF VARCHAR(11) NOT NULL UNIQUE,          -- Chave Única para identificação do paciente
    Nome VARCHAR(100) NOT NULL,
    Telefone VARCHAR(15),
    Endereco VARCHAR(255),
    Email VARCHAR(100),
    Senha VARCHAR(255) NOT NULL               -- Senha hash para segurança
);

USE sistema_agendamento;

-- Tabela 03: Convênio
CREATE TABLE Convenio(
    ID_Convenio INT PRIMARY KEY AUTO_INCREMENT, -- Chave Primária (PK)
    Nome VARCHAR(100) NOT NULL UNIQUE,         -- Nome único do convênio
    CodigoANS VARCHAR(20)
);

USE sistema_agendamento;

-- Tabela 04: MedicoConvenio (Relacionamento Muitos para Muitos - N:M)
CREATE TABLE MedicoConvenio (
    ID_Medico INT NOT NULL,  -- Chave Estrangeira (FK) que referencia Medicos
    ID_Convenio INT NOT NULL, -- Chave Estrangeira (FK) que referencia Convenio
    PRIMARY KEY (ID_Medico, ID_Convenio), -- Chave Primária Composta para garantir unicidade
    FOREIGN KEY (ID_Medico) REFERENCES Medicos(ID_Medico),
    FOREIGN KEY (ID_Convenio) REFERENCES Convenio(ID_Convenio)
);

USE sistema_agendamento;

-- Tabela 05: Agenda (Regras de disponibilidade recorrente do médico)
CREATE TABLE Agenda(
    ID_Agenda INT PRIMARY KEY AUTO_INCREMENT,
    ID_Medico INT NOT NULL,                  -- FK que referencia o médico
    DiaSemana VARCHAR(10) NOT NULL,          -- Ex: 'Segunda', 'Terca'
    HoraInicio TIME NOT NULL,
    HoraFim TIME NOT NULL,
    DuracaoConsulta INT NOT NULL,            -- Duração padrão das consultas em minutos
    FOREIGN KEY (ID_Medico) REFERENCES Medicos(ID_Medico)
);

USE sistema_agendamento;

-- Tabela 06: BloqueioAgenda (Exceções de horário do médico: férias, folgas, etc.)
CREATE TABLE BloqueioAgenda(
    ID_Bloqueio INT PRIMARY KEY AUTO_INCREMENT,
    ID_Medico INT NOT NULL,                  -- FK que referencia o médico
    DataBloqueio DATE NOT NULL,
    HoraInicio TIME,                         -- Pode ser nulo se o dia todo estiver bloqueado
    HoraFim TIME,                            -- Pode ser nulo se o dia todo estiver bloqueado
    Motivo VARCHAR(100),
    FOREIGN KEY (ID_Medico) REFERENCES Medicos(ID_Medico)
);

USE sistema_agendamento;

-- Tabela 07: Agendamento (Transação final que registra a consulta)
CREATE TABLE Agendamento (
    ID_Agendamento INT PRIMARY KEY AUTO_INCREMENT,
    ID_Medico INT NOT NULL,     -- FK obrigatória
    ID_Paciente INT NOT NULL,   -- FK obrigatória
    ID_Convenio INT,            -- FK opcional (permite consultas particulares)
    DataHora DATETIME NOT NULL,
    status_consulta VARCHAR(20) NOT NULL, -- Status da consulta (Ex: Confirmado, Cancelado)
    Duracao INT, 
    FOREIGN KEY (ID_Medico) REFERENCES Medicos(ID_Medico),
    FOREIGN KEY (ID_Paciente) REFERENCES Pacientes(ID_Paciente),
    FOREIGN KEY (ID_Convenio) REFERENCES Convenio(ID_Convenio)
);

/* ---------------------------------
  FIM DA CRIAÇÃO DAS TABELAS (SCHEMA)
  ---------------------------------
*/

-- Garante que estamos no banco de dados correto
USE sistema_agendamento;

-- ======================================================
-- AÇÃO 1: INSERÇÃO DE ENTIDADES BÁSICAS (Médico, Paciente, Convênio)
-- ======================================================

-- 1. Inserir um Médico (ID_Medico = 1)
INSERT INTO Medicos (CRM, Nome, Especialidade, Telefone, Email, senha)
VALUES ('123456CRM', 'Dr. João Silva', 'Cardiologista', '11987654321', 'joao.silva@exemplo.com', 'senha_hash_joao');

-- 2. Inserir um Paciente (ID_Paciente = 1)
INSERT INTO Pacientes (CPF, Nome, Telefone, Email, Senha)
VALUES ('98765432100', 'Maria Souza', '11998765432', 'maria.souza@exemplo.com', 'senha_hash_maria');

-- 3. Inserir um Convênio (ID_Convenio = 1)
INSERT INTO Convenio (Nome, CodigoANS)
VALUES ('Unimed', '123456');

-- ======================================================
-- AÇÃO 2: RELACIONAMENTOS (Onde o ID do Médico/Paciente/Convênio é usado)
-- ======================================================

-- 4. MedicoConvenio: Ligar o Médico 1 ao Convênio 1
INSERT INTO MedicoConvenio (ID_Medico, ID_Convenio)
VALUES (1, 1);

-- 5. Agenda: Definir a disponibilidade do Médico 1 (Terça das 9h às 12h)
INSERT INTO Agenda (ID_Medico, DiaSemana, HoraInicio, HoraFim, DuracaoConsulta)
VALUES (1, 'Terca', '09:00:00', '12:00:00', 30);

-- 6. Agendamento: Criar a transação final de consulta
-- (A COLUNA E OS VALORES FORAM ALINHADOS CORRETAMENTE AQUI)
INSERT INTO Agendamento (ID_Medico, ID_Paciente, ID_Convenio, DataHora, status_consulta, Duracao)
VALUES (
    1,                                 -- ID_Medico
    1,                                 -- ID_Paciente
    1,                                 -- ID_Convenio (Pode ser NULL se fosse particular)
    '2025-10-14 10:00:00',             -- DataHora
    'Confirmado',                      -- status_consulta
    30                                 -- Duracao
);

-- ======================================================
-- AÇÃO 3: VERIFICAÇÃO E COMMIT
-- ======================================================

-- Confirma que os dados foram gravados permanentemente, caso o Auto-Commit estivesse desligado
COMMIT;

-- VERIFICAÇÃO FINAL: Deve listar o Dr. João Silva no resultado
SELECT * FROM Medicos;

