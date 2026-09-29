// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
module.exports = {
    name: 'hotseat',
    description: 'Coloca um membro na berlinda para responder perguntas.',
    async execute(sock, msg, remoteJid, args, { browserAgent, globalState }) {
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const botId = sock.user?.id?.split(':')[0];

        const participants = groupMetadata.participants
            .filter(p => p.id.split('@')[0] !== botId);

        if (participants.length === 0) {
            await sock.sendMessage(remoteJid, { text: "⚠️ *No members to put in the hotseat!*" }, { quoted: msg });
            return;
        }

        const chosen = participants[Math.floor(Math.random() * participants.length)];
        const hotUserJid = chosen.id;
        const hotUserId = hotUserJid.split('@')[0];
        const displayName = chosen.notify || chosen.pushName || `@${hotUserId}`;

        await sock.sendMessage(remoteJid, {
            text: `🔥 *HOT SEAT*\n\n${displayName}, you are on the hot seat! Prepare to answer 3 questions in English! I'm thinking about the questions...`,
            mentions: [hotUserJid]
        });

        const promptQuestions = `Generate 3 interesting and challenging English questions for an English student. 
The questions should be suitable for a WhatsApp conversation. 
Format: Just the 3 questions, one per line.
Example:
1. What is your favorite technology?
2. Why do you want to learn English?
3. What did you do last weekend?
|FIM|`;

        const response = await browserAgent.send(promptQuestions);
        let questions = (response || '').split('\n')
            .map(q => q.replace(/^\d+[\.\)]\s*/, '').trim())
            .filter(q => q.length > 5)
            .slice(0, 3);

        if (questions.length < 3) {
            questions = [
                "What is your favorite hobby and why?",
                "How do you usually practice your English skills?",
                "What is your biggest goal for this year?"
            ];
        }

        globalState.activeHotSeats = globalState.activeHotSeats || {};
        globalState.activeHotSeats[remoteJid] = {
            userId: hotUserId,
            questions: questions,
            currentQuestionIndex: 0
        };

        await sock.sendMessage(remoteJid, {
            text: `🔥 *HOT SEAT - QUESTION 1/3*\n\n${displayName}, here is your first question:\n\n${questions[0]}`,
            mentions: [hotUserJid]
        });
    }
};