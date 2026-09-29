// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore
} = require('baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const browserAgent = require('./browser_agent');
const { BOT_ATIVO, PALAVRAS_CHAVE } = require('./bot_config');
const { globalState, scheduleState } = require('./app_state');
const { getTopTechNews } = require('./news_service');
const { loadCommands, handleCommand } = require('./command_handler');

let globalSock = null;

// --- Controle de inicialização única ---
let initialized = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 5000;

// --- Controle da fila de IA (evita flood de prompts) ---
const aiQueue = [];
let aiProcessing = false;

// --- Grupos fixos ---
const ENGLISH_GROUP_ID = "120363409377041049@g.us";
const GRUPOS_PERMITIDOS_VAGAS = [
    "120363426162459764@g.us",
    "120363409724852248@g.us"
];

// ============================================================
// PROMPT BUILDER (substitui prompt_manager.js)
// ============================================================
function buildPrompt(nomeUsuario, mensagemAtual, isMentor = true) {
    const persona = isMentor
        ? `[SYSTEM: YOU ARE 'OCTO-NET', AN ENGLISH LEARNING MENTOR]
- Name: Octo-net.
- Role: Active English Mentor in the 'English in Practice' group.
- Personality: Encouraging, polite, professional, and friendly.
- Speak primarily in ENGLISH. Use Portuguese only for complex explanations.
- Politely suggest corrections for grammatical errors (Shadow Correction).
- Keep responses short and natural, like a person on WhatsApp.
- MANDATORY: Always end your response with the tag |FIM|.`
        : `[SYSTEM: YOU ARE 'OCTO-NET', A COMMUNITY MODERATOR]
- Name: Octo-net.
- Role: Active Moderator in the 'Galera do TI' community.
- Speak in PORTUGUESE (PT-BR).
- Keep responses short and direct for WhatsApp.
- MANDATORY: Always end your response with the tag |FIM|.`;

    return `${persona}\n\n[MENSAGEM ATUAL DE ${nomeUsuario}]\n${mensagemAtual}`;
}

function cleanResponse(text) {
    return String(text || '')
        .replace('|FIM|', '')
        .replace(/\s*\|(.*?)(?=\|)/g, '')
        .replace(/\|/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim();
}

// ============================================================
// FILA DE IA (uma por vez, evita travar o browser)
// ============================================================
async function processAIQueue(sock) {
    if (aiProcessing || aiQueue.length === 0) return;
    aiProcessing = true;

    const { msg, remoteJid, nomeUsuario, text } = aiQueue.shift();

    try {
        await sock.sendPresenceUpdate('composing', remoteJid);
        const prompt = buildPrompt(nomeUsuario, text, true);
        const response = await browserAgent.send(prompt);

        if (response) {
            const clean = cleanResponse(response);
            if (clean) {
                await sock.sendMessage(remoteJid, { text: clean }, { quoted: msg });
            }
        }
    } catch (err) {
        console.error('[AI] Erro ao gerar resposta:', err.message);
    }

    aiProcessing = false;
    setTimeout(() => processAIQueue(sock), 800);
}

// ============================================================
// MONITOR DE VAGAS (a cada 20s)
// ============================================================
setInterval(async () => {
    if (!globalSock) return;

    const hasActiveMonitor = Object.values(globalState.supabaseMonitors || {})
        .some(m => m.active);
    if (!hasActiveMonitor) return;

    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

        const { data, error } = await supabase
            .from('jobs')
            .select('')
            .or('send_to_bot.is.null,send_to_bot.eq.false')
            .eq('status', 'publicado')
            .order('id', { ascending: true });

        if (error || !data || data.length === 0) return;

        for (const vaga of data) {
            const stillActive = Object.values(globalState.supabaseMonitors || {})
                .some(m => m.active);
            if (!stillActive) break;

            const res = `💼 *NOVA VAGA DETECTADA*\n\n📌 *Cargo:* ${vaga.title}\n🏢 *Empresa:* ${vaga.company}\n📈 *Nível:* ${vaga.seniority}\n💻 *Modalidade:* ${vaga.modality}\n🔗 *Link:* ${vaga.apply_url}\n📊 *Status:* ${vaga.status || 'N/A'}`;

            for (const grupoId of GRUPOS_PERMITIDOS_VAGAS) {
                await globalSock.sendMessage(grupoId, { text: res });
            }

            await supabase.from('jobs').update({ send_to_bot: true }).eq('id', vaga.id);
            console.log(`[AUTO-MONITOR] Vaga enviada: ${vaga.id}`);
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (e) {
        console.error('[AUTO-MONITOR] Erro:', e.message);
    }
}, 20000);

// ============================================================
// AGENDADOR DIÁRIO (9h / 15h / 19h)
// ============================================================
setInterval(async () => {
    if (!globalSock) return;

    const now = new Date();
    const hour = now.getHours();
    const dateStr = now.toISOString().split('T')[0];

    if (hour === 9 && scheduleState.lastDailyQuestion !== dateStr) {
        scheduleState.lastDailyQuestion = dateStr;
        try {
            const res = await browserAgent.send("Generate a question in English. |FIM|");
            await globalSock.sendMessage(ENGLISH_GROUP_ID, {
                text: `🌅 *MORNING QUESTION*\n\n${cleanResponse(res)}`
            });
        } catch (e) { console.error('[DAILY] Erro morning question:', e.message); }
    }

    if (hour === 15 && scheduleState.lastDailyTip !== dateStr) {
        scheduleState.lastDailyTip = dateStr;
        try {
            const res = await browserAgent.send("Provide an English tip. |FIM|");
            await globalSock.sendMessage(ENGLISH_GROUP_ID, {
                text: `💡 *AFTERNOON TIP*\n\n${cleanResponse(res)}`
            });
        } catch (e) { console.error('[DAILY] Erro afternoon tip:', e.message); }
    }

    if (hour === 19 && scheduleState.lastDailyNews !== dateStr) {
        scheduleState.lastDailyNews = dateStr;
        try {
            const news = await getTopTechNews();
            await globalSock.sendMessage(ENGLISH_GROUP_ID, {
                text: `🗞️ *EVENING TECH DIGEST*\n\n${news}`
            });
        } catch (e) { console.error('[DAILY] Erro evening news:', e.message); }
    }
}, 60 * 1000); // checa a cada 1 minuto

// ============================================================
// START
// ============================================================
async function startBot() {
    if (!initialized) {
        loadCommands();
        browserAgent.init().catch(e => console.error('[BROWSER] Erro init:', e.message));
        initialized = true;
    }

    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        logger: pino({ level: 'error' }),
        printQRInTerminal: true
    });
    globalSock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
        if (u.qr) qrcode.generate(u.qr, { small: true });

        if (u.connection === 'open') {
            console.log('[V] Bot Online.');
            reconnectAttempts = 0;
        }

        if (u.connection === 'close') {
            const code = u.lastDisconnect?.error?.output?.statusCode;
            const reason = u.lastDisconnect?.error?.message || 'desconhecido';
            console.log(`[!] Conexão fechada. Código: ${code} | Motivo: ${reason}`);

            if (code === 401) {
                console.error('[X] Sessão inválida. Delete a pasta baileys_auth e escaneie o QR novamente.');
                process.exit(1);
            }
            if (code === 440) {
                console.error('[X] Conflito: outra instância do bot está rodando.');
                process.exit(1);
            }

            reconnectAttempts++;
            if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
                console.error('[X] Máximo de reconexões atingido. Encerrando.');
                process.exit(1);
            }
            console.log(`[!] Tentando reconectar (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) em ${RECONNECT_DELAY_MS / 1000}s...`);
            setTimeout(() => startBot(), RECONNECT_DELAY_MS);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify' || !BOT_ATIVO) return;

        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        if (msg.message.reactionMessage || msg.message.protocolMessage) return;

        const remoteJid = msg.key.remoteJid;
        const text = msg.message.conversation
            || msg.message.extendedTextMessage?.text
            || msg.message.imageMessage?.caption
            || msg.message.videoMessage?.caption
            || "";

        const hasMedia = !!(msg.message.imageMessage || msg.message.videoMessage);
        if (!text.trim() && !hasMedia) return;

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const nomeUsuario = msg.pushName || 'Membro';

        // ---------- Contexto mínimo para comandos ----------
        const context = {
            browserAgent,
            globalState,
            commandHandler: require('./command_handler')
        };

        // ---------- 1. Tenta comando ----------
        if (await handleCommand(sock, msg, remoteJid, text, context)) return;

        // ---------- 3. IA (apenas se for trigger) ----------
        const isTriggered = isBotTriggered(msg, text);
        if (!isTriggered) return;

        aiQueue.push({ msg, remoteJid, nomeUsuario, text });
        processAIQueue(sock);
    });
}

// ============================================================
// DETECÇÃO DE TRIGGER (menção, reply ou palavra-chave)
// ============================================================
function isBotTriggered(msg, text) {
    const lower = text.toLowerCase();

    // 1. Palavra-chave no texto
    for (const kw of PALAVRAS_CHAVE) {
        if (lower.includes(kw.toLowerCase())) return true;
    }

    // 2. Reply a uma mensagem do bot
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (ctx?.participant && globalSock?.user?.id) {
        const botNumber = globalSock.user.id.split(':')[0];
        if (ctx.participant.startsWith(botNumber)) return true;
    }

    // 3. Menção direta (@bot)
    if (ctx?.mentionedJid && globalSock?.user?.id) {
        const botNumber = globalSock.user.id.split(':')[0];
        if (ctx.mentionedJid.some(j => j.startsWith(botNumber))) return true;
    }

    return false;
}

startBot();