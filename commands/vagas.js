// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Grupos autorizados para receber as vagas
const GRUPOS_PERMITIDOS = [
 '120363426162459764@g.us',
 '120363409724852248@g.us'
];


function sanitizeJobData(data) {
    // 1. Title (string, NOT NULL)
    let title = (data.title || '').trim();
    if (!title) {
        title = "Vaga Sem Título";
    }

    // 2. Company (string, NOT NULL)
    let company = (data.company || '').trim();
    if (!company) {
        company = "Não Informada";
    }

    // 3. Description (string, NOT NULL)
    let description = (data.description || '').trim();
    if (!description) {
        description = "Descrição não fornecida";
    }

    // 4. Seniority (enum: junior, pleno, senior, estagio, especialista, NOT NULL)
    let seniority = (data.seniority || '').trim().toLowerCase();
    // Remove accents
    seniority = seniority.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (seniority.includes("junior") || seniority.includes("jr")) {
        seniority = "junior";
    } else if (seniority.includes("pleno") || seniority.includes("pl")) {
        seniority = "pleno";
    } else if (seniority.includes("senior") || seniority.includes("sr")) {
        seniority = "senior";
    } else if (seniority.includes("estag") || seniority.includes("intern") || seniority.includes("aprendiz") || seniority.includes("trainee")) {
        seniority = "estagio";
    } else if (seniority.includes("especial") || seniority.includes("expert") || seniority.includes("lead") || seniority.includes("diret") || seniority.includes("coord")) {
        seniority = "especialista";
    } else {
        seniority = "pleno"; // Default fallback
    }

    // 5. Modality (enum: remoto, presencial, hibrido, NOT NULL)
    let modality = (data.modality || '').trim().toLowerCase();
    modality = modality.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (modality.includes("remot") || modality.includes("home") || modality.includes("tele")) {
        modality = "remoto";
    } else if (modality.includes("presenc") || modality.includes("escrit") || modality.includes("local")) {
        modality = "presencial";
    } else if (modality.includes("hibrid") || modality.includes("hybrid") || modality.includes("misto")) {
        modality = "hibrido";
    } else {
        modality = "remoto"; // Default fallback
    }

    return {
        title,
        company,
        description,
        seniority,
        modality
    };
}

module.exports = {
    name: 'vagas',
    description: 'Monitoramento de vagas via Supabase.',
    async execute(sock, msg, remoteJid, args, { globalState }) {
        
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_KEY;

        if (!SUPABASE_URL || !SUPABASE_KEY) {
            await sock.sendMessage(remoteJid, { text: "⚠️ *Erro de Configuração!* Variáveis .env ausentes." }, { quoted: msg });
            return;
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // No command_handler.js, o args é passado como uma string (args.join(' '))
        // Pegamos a primeira palavra da string de argumentos
        const action = (args && typeof args === 'string') ? args.trim().split(/\s+/)[0].toLowerCase() : '';

        // --- LÓGICA DE DEBUG (CONSOLE TABLE) ---
        if (action === 'debug') {
            await sock.sendMessage(remoteJid, { text: "🛠️ *Imprimindo tabela de vagas no console...*" }, { quoted: msg });
            
            try {
                const { data, error, count } = await supabase
                    .from('jobs')
                    .select('id, title, company, send_to_bot', { count: 'exact' });

                if (error) throw error;

                if (!data || data.length === 0) {
                    await sock.sendMessage(remoteJid, { text: "📂 *A tabela `jobs` está vazia.*" }, { quoted: msg });
                    return;
                }

                const tableData = data.map(vaga => ({
                    id: vaga.id,
                    title: (vaga.title || '').substring(0, 40),
                    company: (vaga.company || '').substring(0, 30),
                    'send_to_bot (DB)': vaga.send_to_bot,
                    'Status (Bot)': vaga.send_to_bot ? '✅ ENVIADO' : '⏳ PENDENTE'
                }));

                console.log("\n--- DEBUG: TABELA DE VAGAS (SUPABASE) ---");
                console.log(`Total de registros encontrados (API): ${count}`);
                console.log(`Registros retornados nesta query: ${data.length}`);
                console.table(tableData);
                console.log("----------------------------\n");

                await sock.sendMessage(remoteJid, { text: `✅ *Tabela impressa!* Total no DB: ${count}. Retornados: ${data.length}.` }, { quoted: msg });

            } catch (err) {
                console.error("[VAGAS DEBUG] Erro:", err);
                await sock.sendMessage(remoteJid, { text: `❌ *Erro no debug:* ${err.message}` }, { quoted: msg });
            }
            return;
        }

        // --- ENVIAR TODAS AS VAGAS ---
        if (action === 'todas') {
            await sock.sendMessage(remoteJid, { text: "📦 *Buscando TODAS as vagas do banco de dados...*" }, { quoted: msg });

            try {
            const { data, error } = await supabase
            .from('jobs')
            .select('')
            .or('send_to_bot.is.null,send_to_bot.eq.false')
            .eq('status', 'publicado')
            .order('id', { ascending: true });

                if (error) throw error;

                if (!data || data.length === 0) {
                    await sock.sendMessage(remoteJid, { text: "📂 *Não há nenhuma vaga cadastrada no banco de dados.*" }, { quoted: msg });
                    return;
                }

                await sock.sendMessage(remoteJid, { text: `🚀 *Iniciando envio de ${data.length} vaga(s)...*` });

                for (const vaga of data) {
                    let response = "💼 *OPORTUNIDADE*\n\n";
                    response += `📌 *Cargo:* ${vaga.title || 'N/A'}\n`;
                    response += `🏢 *Empresa:* ${vaga.company || 'N/A'}\n`;
                    response += `📈 *Nível:* ${vaga.seniority || 'N/A'}\n`;
                    response += `💻 *Modalidade:* ${vaga.modality || 'N/A'}\n`;
                    if (vaga.apply_url) response += `🔗 *Link:* ${vaga.apply_url}\n`;

                    await sock.sendMessage(remoteJid, { text: response });

                    // Marcar como enviada, caso ainda não esteja
                    if (!vaga.send_to_bot) {
                        const vagaId = String(vaga.id).trim();
                        console.log(`[VAGAS TODAS] Tentando atualizar vaga ID: ${vagaId}`);
                        const { data: updateData, error: updateError } = await supabase
                            .from('jobs')
                            .update({ send_to_bot: true })
                            .eq('id', vagaId)
                            .select();

                        if (updateError) {
                            console.error(`[VAGAS TODAS] Erro ao atualizar ID ${vagaId}:`, updateError.message);
                        } else {
                            console.log(`[VAGAS TODAS] Retorno do update para ID ${vagaId}:`, updateData);
                            if (updateData && updateData.length === 0) {
                                console.warn(`[⚠️ AVISO] A vaga ${vagaId} NÃO foi atualizada. Verifique as políticas de RLS no Supabase.`);
                            }
                        }
                    }

                    await new Promise(r => setTimeout(r, 2000)); // Delay para evitar flood
                }

                await sock.sendMessage(remoteJid, { text: "✅ *Todas as vagas foram enviadas e marcadas no DB.*" });

            } catch (err) {
                console.error("[VAGAS TODAS] Erro:", err);
                await sock.sendMessage(remoteJid, { text: `❌ *Erro ao enviar todas:* ${err.message}` }, { quoted: msg });
            }
            return;
        }

        // --- MARCAR TODAS AS VAGAS COMO NÃO ENVIADAS (FALSE) ---
        if (action === 'false') {
            await sock.sendMessage(remoteJid, { text: "🔄 *Marcando todas as vagas como não enviadas...*" }, { quoted: msg });

            try {
                const { data, error, count } = await supabase
                    .from('jobs')
                    .select('id', { count: 'exact' })
                    .eq('status', 'publicado');

                if (error) throw error;

                if (!data || data.length === 0) {
                    await sock.sendMessage(remoteJid, { text: "📂 *Nenhuma vaga encontrada para marcar como não enviada.*" }, { quoted: msg });
                    return;
                }

                // Atualizar todas as vagas para send_to_bot = false
                const { error: updateError } = await supabase
                    .from('jobs')
                    .update({ send_to_bot: false })
                    .eq('status', 'publicado');

                if (updateError) throw updateError;

                await sock.sendMessage(remoteJid, { 
                    text: `✅ *${data.length} vaga(s) marcada(s) como NÃO ENVIADAS (send_to_bot = false).*` 
                }, { quoted: msg });

                console.log(`[VAGAS FALSE] ${data.length} vagas marcadas como não enviadas.`);

            } catch (err) {
                console.error("[VAGAS FALSE] Erro:", err);
                await sock.sendMessage(remoteJid, { text: `❌ *Erro ao marcar vagas como não enviadas:* ${err.message}` }, { quoted: msg });
            }
            return;
        }

        if (action === 'help') {
            const helpMessage = `📌 *Comando de Monitoramento de Vagas* 📌
            Uso: !vagas [ação]
            Ações: 
            - on: Ativa o monitoramento de vagas. O bot enviará novas vagas automaticamente.
            - off: Desativa o monitoramento de vagas.
            - todas: Envia todas as vagas pendentes manualmente.
            - false: Marca TODAS as vagas como NÃO ENVIADAS (send_to_bot = false).
            - stats: Exibe estatísticas de vagas.
            - debug: Exibe a tabela de vagas no console.
            - help: Exibe esta mensagem.`;
            
            await sock.sendMessage(remoteJid, { text: helpMessage }, { quoted: msg });
            return;
        }

        // --- LÓGICA ON/OFF ---
        if (action === 'on') {
            if (globalState.supabaseMonitors[remoteJid]?.active) {
                await sock.sendMessage(remoteJid, { text: "📢 *Monitoramento já está ativo neste grupo!*" }, { quoted: msg });
                return;
            }

            globalState.supabaseMonitors[remoteJid] = { active: true, lastCheck: Date.now() };
            await sock.sendMessage(remoteJid, { text: "✅ *Monitoramento de Vagas ATIVADO!*\nO bot irá postar as vagas pendentes agora (intervalo de 2s) e continuará monitorando novas vagas automaticamente." }, { quoted: msg });

            try {
                console.log(`[SUPABASE] Iniciando carga inicial para ${remoteJid}...`);
                
                const { data, error } = await supabase
                .from('jobs')
                .select('')
                .or('send_to_bot.is.null,send_to_bot.eq.false')
                .eq('status', 'publicado')
                .order('id', { ascending: true });

                if (error) {
                    await sock.sendMessage(remoteJid, { text: `❌ *Erro ao buscar vagas:* ${error.message}` });
                    return;
                }

                if (!data || data.length === 0) {
                    await sock.sendMessage(remoteJid, { text: "🔄 *Tudo em dia:* Não há vagas novas para enviar no momento." });
                    return;
                }

                await sock.sendMessage(remoteJid, { text: `📦 *Encontrei ${data.length} vaga(s) pendente(s).* Começando o envio...` });

                for (const vaga of data) {
                    if (!globalState.supabaseMonitors[remoteJid]?.active) break;

                    let response = "💼 *OPORTUNIDADE ENCONTRADA*\n\n";
                    response += `📌 *Cargo:* ${vaga.title || 'N/A'}\n`;
                    response += `🏢 *Empresa:* ${vaga.company || 'N/A'}\n`;
                    response += `📈 *Nível:* ${vaga.seniority || 'N/A'}\n`;
                    response += `💻 *Modalidade:* ${vaga.modality || 'N/A'}\n`;
                    response += `📍 *Local:* ${vaga.location || 'N/A'}\n`;
                    response += `📝 *Short Descrição:* ${vaga.short_description || 'N/A'}\n\n`;
                    if (vaga.apply_url) response += `🔗 *Link:* ${vaga.apply_url}\n`;
                    
                    // Envia para os grupos autorizados
                    for (const grupoId of GRUPOS_PERMITIDOS) {
                        await sock.sendMessage(grupoId, { text: response });
                    }
                    
                    await supabase
                        .from('jobs')
                        .update({ send_to_bot: true })
                        .eq('id', vaga.id);

                    console.log(`[VAGAS] Vaga Enviada e Marcada: ID: ${vaga.id}`);

                    await new Promise(r => setTimeout(r, 2000));
                }
                await sock.sendMessage(remoteJid, {
                    text: "✅ *Processamento concluído.*"
                });
            } catch (err) {
                console.error("[SUPABASE ON] Erro na carga inicial:", err);
            }
            return;
        }

        if (action === 'off') {
            if (!globalState.supabaseMonitors[remoteJid]?.active) {
                await sock.sendMessage(remoteJid, { text: "❌ *O monitoramento não está ativo neste grupo.*" }, { quoted: msg });
                return;
            }

            delete globalState.supabaseMonitors[remoteJid];
            await sock.sendMessage(remoteJid, { text: "🛑 *Monitoramento de Vagas DESATIVADO.*" }, { quoted: msg });
            return;
        }

        // --- BUSCA MANUAL ---
        await sock.sendMessage(remoteJid, { text: "⏳ *Consultando banco de dados real...*" }, { quoted: msg });

        try {
            const { data, error } = await supabase
                .from('jobs') 
                .select('*')
                .or('send_to_bot.is.null,send_to_bot.eq.false')
                .order('id', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (!data || data.length === 0) {
                await sock.sendMessage(remoteJid, { text: "🔄 *Sem novidades:* Não há vagas novas para enviar." }, { quoted: msg });
                return;
            }

            const vaga = data[0];
            let response = "💼 *NOVA VAGA ENCONTRADA*\n\n";
            response += `📌 *Cargo:* ${vaga.title || 'N/A'}\n`;
            response += `🏢 *Empresa:* ${vaga.company || 'N/A'}\n`;
            response += `📈 *Nível:* ${vaga.seniority || 'N/A'}\n`;
            response += `💻 *Modalidade:* ${vaga.modality || 'N/A'}\n`;
            response += `📍 *Local:* ${vaga.location || 'N/A'}\n\n`;
            response += `📝 *Descrição:* ${vaga.short_description || 'N/A'}\n\n`;
            if (vaga.apply_url) response += `🔗 *Link:* ${vaga.apply_url}\n`;

            await sock.sendMessage(remoteJid, { text: response }, { quoted: msg });
            
            // Marcar como enviada
            await supabase
                .from('jobs')
                .update({ send_to_bot: true })
                .eq('id', vaga.id);

        } catch (err) {
            console.error("[VAGAS BUSCA] Erro:", err);
            await sock.sendMessage(remoteJid, { text: `❌ *Erro ao buscar vagas:* ${err.message}` }, { quoted: msg });
        }
    }
};