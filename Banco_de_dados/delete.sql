-- 1. DESLIGA O MODO DE SEGURANÇA (Para permitir o DELETE FROM)
SET SQL_SAFE_UPDATES = 0; 
USE sistema_agendamento;

-- 2. LIMPEZA DOS DADOS ANTIGOS
DELETE FROM Agendamento;
DELETE FROM Agenda;
DELETE FROM MedicoConvenio;
DELETE FROM BloqueioAgenda;
DELETE FROM Medicos;
DELETE FROM Pacientes;
DELETE FROM Convenio;

-- 3. REINICIA OS CONTADORES (Para que o próximo médico seja ID=1)
ALTER TABLE Medicos AUTO_INCREMENT = 1;
ALTER TABLE Pacientes AUTO_INCREMENT = 1;
ALTER TABLE Convenio AUTO_INCREMENT = 1;

-- 4. INSERÇÃO DO MÉDICO DE TESTE
INSERT INTO Medicos (CRM, Nome, Especialidade, Telefone, Email, senha)
VALUES ('123456CRM', 'Dr. João Silva', 'Cardiologista', '11987654321', 'joao.silva@exemplo.com', 'senha_hash_joao');

-- (Insere os outros dados de Paciente, Convênio, etc. para que as chaves estrangeiras funcionem)
INSERT INTO Pacientes (CPF, Nome, Telefone, Email, Senha) VALUES ('98765432100', 'Maria Souza', '11998765432', 'maria.souza@exemplo.com', 'senha_hash_maria');
INSERT INTO Convenio (Nome, CodigoANS) VALUES ('Unimed', '123456');
INSERT INTO MedicoConvenio (ID_Medico, ID_Convenio) VALUES (1, 1);
INSERT INTO Agenda (ID_Medico, DiaSemana, HoraInicio, HoraFim, DuracaoConsulta) VALUES (1, 'Terca', '09:00:00', '12:00:00', 30);
INSERT INTO Agendamento (ID_Medico, ID_Paciente, ID_Convenio, DataHora, status_consulta, Duracao) VALUES (1, 1, 1, '2025-10-14 10:00:00', 'Confirmado', 30);

-- 5. CONFIRMAÇÃO
COMMIT;
SET SQL_SAFE_UPDATES = 1; -- Volta o modo de segurança

-- VERIFICAÇÃO FINAL
SELECT ID_Medico, Nome, CRM FROM Medicos;