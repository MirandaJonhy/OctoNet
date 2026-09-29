// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
module.exports = {
    name: 'pair',
    description: 'Sorteia uma dupla para praticar inglês.',
    async execute(sock, msg, remoteJid, args) {
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const botNumber = "5521969893706";
        const participants = groupMetadata.participants
            .map(p => p.id)
            .filter(id => !id.includes(botNumber));

        if (participants.length < 2) {
            await sock.sendMessage(remoteJid, { text: "⚠️ *Need at least 2 members (excluding me) to make a pair!*" }, { quoted: msg });
            return;
        }

        const p1Idx = Math.floor(Math.random() * participants.length);
        let p2Idx = Math.floor(Math.random() * participants.length);
        while (p1Idx === p2Idx) p2Idx = Math.floor(Math.random() * participants.length);

        const jid1 = participants[p1Idx];
        const jid2 = participants[p2Idx];

        const id1 = jid1.split('@')[0];
        const id2 = jid2.split('@')[0];

        await sock.sendMessage(remoteJid, {
            text: `🤝 *RANDOM PAIRING*\n\n@${id1} ↔️ @${id2}\n\n_Time to practice some English together!_`,
            mentions: [jid1, jid2]
        }, { quoted: msg });
    }
};