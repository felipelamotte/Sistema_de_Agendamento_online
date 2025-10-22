-- Garante a execução sem o Safe Mode
SET SQL_SAFE_UPDATES = 0; 
USE sistema_agendamento;

-- LIMPEZA (Não dará erro 1175 agora)
DELETE FROM Agendamento;
DELETE FROM Agenda;
DELETE FROM MedicoConvenio;
DELETE FROM BloqueioAgenda;
DELETE FROM Medicos;
DELETE FROM Pacientes;
DELETE FROM Convenio;

-- INSERÇÃO (Novos dados)
-- 1. Inserir Médico (ID_Medico = 1)
INSERT INTO Medicos (CRM, Nome, Especialidade, Telefone, Email, senha)
VALUES ('123456', 'Dr. João Silva', 'Cardiologista', '11987654321', 'joao.silva@exemplo.com', 'senha_hash_joao');
-- ... [Cole aqui o restante dos INSERTs] ...

INSERT INTO Medicos (Nome, Especialidade, CRM) 
VALUES ('Dra. Ana Costa', 'Dermatologista', '789012');

-- VERIFICAÇÃO E COMMIT
COMMIT;
SELECT ID_Medico, Nome, CRM FROM Medicos;

-- REABILITAR o Safe Update Mode (Boa Prática de Segurança)
SET SQL_SAFE_UPDATES = 1;