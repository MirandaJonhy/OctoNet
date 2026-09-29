// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.
module.exports = {
    name: "grupos",
    category: "⚙️ Sistema",
    description: "Lista todos os grupos onde o bot está, com nome, ID e detalhes",
    usage: "/grupos",
    async execute(sock, msg, chatJid, argsText, context) {
        try {
            const groups = await sock.groupFetchAllParticipating();
            const entries = Object.entries(groups);

            if (entries.length === 0) {
                await sock.sendMessage(chatJid, { text: "📋 O bot não está em nenhum grupo." }, { quoted: msg });
                return;
            }

            let text = `📋 *Grupos do Bot* — Total: ${entries.length}\n\n`;

            for (let i = 0; i < entries.length; i++) {
                const [gid, g] = entries[i];
                const name = g.subject || "Sem nome";
                const cleanId = gid.includes("@") ? gid.split("@")[0] : gid;
                const parts = g.participants ? g.participants.length : "?";
                const created = g.creation || null;
                const createdStr = created
                    ? new Date(created * 1000).toLocaleDateString("pt-BR")
                    : "?";
                const desc = g.desc || null;

                text += `*${i + 1}.* ${name}\n`;
                text += `   🆔 ID: \`${cleanId}\`\n`;
                text += `   👥 Participantes: ${parts}\n`;
                if (g.creation) text += `   📅 Criado: ${createdStr}\n`;
                if (desc) {
                    const shortDesc = desc.length > 80 ? desc.slice(0, 77) + "..." : desc;
                    text += `   📝 Desc: ${shortDesc}\n`;
                }
                if (g.announce) text += `   🔇 Apenas admins podem falar\n`;
                if (g.restrict) text += `   🔒 Apenas admins podem editar\n`;
                text += `\n`;
            }

            text += `💡 Use o ID do grupo para comandos que exigem destino específico.`;

            await sock.sendMessage(chatJid, { text }, { quoted: msg });
        } catch (err) {
            console.error("[grupos] Erro ao buscar grupos:", err);
            await sock.sendMessage(chatJid, { text: `❌ Erro ao buscar grupos: ${err.message}` }, { quoted: msg });
        }
    },
};
