// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

// --- ESTADO GLOBAL ---
const globalState = {
    groups: {},              // reservado (uso futuro)
    bot: {
        mood: "normal",
        energy: 0.8,
        socialBattery: 1.0,
        boredom: 0,
        lastResponseTime: 0
    },
    activeHotSeats: {},      // { jid: { userId, questions, currentQuestionIndex } }
    supabaseMonitors: {},    // { jid: { active, lastCheck } }
    activeVagasSessions: {}  // { jid: { userId, ... } }
};

const scheduleState = {
    lastDailyQuestion: null, // 'YYYY-MM-DD'
    lastDailyTip: null,
    lastDailyNews: null
};

module.exports = { globalState, scheduleState };