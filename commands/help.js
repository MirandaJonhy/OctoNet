// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
module.exports = {
    name: 'help',
    aliases: ['menu'],
    description: 'Mostra o menu de comandos.',
    async execute(sock, msg, remoteJid, args) {
        const helpMsg = "🐙 *OCTO-NET - MENTOR DE INGLÊS* 🐙\n\n" +
                        "*Aprendizado:*\n" +
                        "• !word - Palavra do dia\n" +
                        "• !check [frase] - Correção gramatical\n" +
                        "• !translate [texto] - Tradução + contexto\n" +
                        "• !define [palavra] - Definição técnica\n" +
                        "• !tip - Dica rápida\n\n" +
                        "*Tech & Interação:*\n" +
                        "• !news - Manchetes Hacker News\n" +
                        "• !trending - Repos em alta no GitHub\n" +
                        "• !vagas - Monitor de Vagas Supabase 🖥️\n" +
                        "• !challenge - Desafio semanal\n" +
                        "• !poll [pergunta] | [opção] | [opção] - Enquete\n" +
                        "• !pair - Sorteio de duplas\n" +
                        "• !hotseat - Berlinda\n\n" +
                        "*Administração:*\n" +
                        "• !grupos - Lista os grupos do bot\n" +
                        "• !reload - Recarrega os comandos\n" +
                        "• !ping - Verifica se o bot está online\n" +
                        "• !help ou !menu - Esta lista\n\n" +
                        "_Pratique inglês e suba de nível!_";
        await sock.sendMessage(remoteJid, { text: helpMsg }, { quoted: msg });
    }
};