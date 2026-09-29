// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

const fs = require('fs');
const path = require('path');

const commands = new Map();

function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    commands.clear();
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        // Limpa o cache para permitir hot-reload
        delete require.cache[require.resolve(filePath)];
        
        const command = require(filePath);
        commands.set(command.name, command);
        if (command.aliases) {
            for (const alias of command.aliases) {
                commands.set(alias, command);
            }
        }
    }
    console.log(`[V] ${commandFiles.length} comandos carregados.`);
}

async function handleCommand(sock, msg, remoteJid, text, context) {
    if (!text.startsWith('!')) return false;

    const args = text.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = commands.get(commandName);
    if (!command) return false;

    try {
        await command.execute(sock, msg, remoteJid, args.join(' '), context);
        return true;
    } catch (error) {
        console.error(`[X] Erro ao executar !${commandName}:`, error);
        await sock.sendMessage(remoteJid, { text: `❌ *Error executing !${commandName}*` }, { quoted: msg });
        return true;
    }
}

module.exports = { loadCommands, handleCommand };