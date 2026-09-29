// Copyright (C) 2026 MirandaJonhy
// Este arquivo é parte do OctoNet e está licenciado sob AGPL v3.
// Veja o arquivo LICENSE na raiz do repositório.

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const path = require('path');
const { GEMINI_SELECTORS, CHATGPT_SELECTORS, AI_PROVIDER, HEADLESS } = require('./config_node.json');

class WebAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.config = AI_PROVIDER === 'CHATGPT' ? CHATGPT_SELECTORS : GEMINI_SELECTORS;
        this.url = AI_PROVIDER === 'CHATGPT' ? 'https://chatgpt.com/' : 'https://gemini.google.com/app';
    }

    async init() {
        if (this.browser) return; // Já estamos conectados

        const userDataDir = path.join(__dirname, 'gemini_session');
        try {
            // Usa o contexto persistente. Se já existir, ele REUTILIZA a sessão.
            this.browser = await chromium.launchPersistentContext(userDataDir, {
                headless: HEADLESS,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                viewport: { width: 1280, height: 720 }
            });
            
            this.page = this.browser.pages()[0] || await this.browser.newPage();
            
            // Só acessa se estivermos em uma página vazia ou erro
            const currentUrl = this.page.url();
            if (currentUrl === 'about:blank' || currentUrl.includes('error')) {
                console.log(`[BOT] Acessando ${this.url}...`);
                await this.page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
            }
            
            console.log(`[V] Navegador pronto e sessão reutilizada.`);
        } catch (err) {
            console.error(`[X] Falha ao iniciar navegador: ${err.message}`);
        }
    }

    async checkHealth() {
        try {
            if (!this.browser || !this.page || this.page.isClosed()) return false;
            await this.page.evaluate(() => document.title);
            return true;
        } catch (e) {
            return false;
        }
    }

    async restart() {
        console.log("[!] Comando de reinicialização recebido...");
        await this.init();
    }

    async _limparPopups() {
        try {
            // Tenta fechar modais comuns do ChatGPT/Gemini (Stay Logged In, New Features, etc)
            const popups = [
                'button:has-text("Stay logged in")',
                'button:has-text("Dismiss")',
                'button:has-text("Maybe later")',
                'div[role="dialog"] button'
            ];
            for (const sel of popups) {
                if (await this.page.isVisible(sel)) {
                    await this.page.click(sel).catch(() => {});
                }
            }
        } catch (e) {}
    }

    async send(texto) {
        if (!(await this.checkHealth())) {
            console.warn("[WARN] Navegador instável. Reiniciando antes de enviar...");
            await this.restart();
        }
        
        if (!this.page) return "Erro: Navegador não inicializado.";

        try {
            await this._limparPopups();
            const inputSelector = this.config.chat_input;
            
            // Espera o seletor com mais paciência
            await this.page.waitForSelector(inputSelector, { state: 'visible', timeout: 10000 });
            // Captura resposta anterior
            const responseSelector = this.config.response;
            let respostaAnterior = "";
            const resAnteriores = await this.page.$$(responseSelector);
            if (resAnteriores.length > 0) {
                respostaAnterior = await resAnteriores[resAnteriores.length - 1].innerText();
            }

            await this.page.evaluate(({selector, text}) => {
                const input = document.querySelector(selector);
                input.innerText = text;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }, { selector: inputSelector, text: texto });

            await new Promise(r => setTimeout(r, 500));

            const sendBtnSelector = this.config.send_button;
            try {
                // Tenta clicar no botão de enviar (mais confiável que Enter em contenteditable)
                await this.page.waitForSelector(sendBtnSelector, { state: 'visible', timeout: 5000 });
                await this.page.click(sendBtnSelector);
                console.log("[DEBUG] Botão de enviar clicado.");
            } catch (clickErr) {
                console.warn("[WARN] Não consegui clicar no botão, tentando Enter...");
                await this.page.keyboard.press("Enter");
            }

            // Loop de resposta (Modo Estável)
            let ultimasTentativasComTexto = 0;
            let ultima_captura = ""; 
            // Aumentado intervalo para 300ms para garantir captura completa e evitar detecção precoce
            for (let i = 0; i < 200; i++) { 
                await new Promise(r => setTimeout(r, 300)); 
                
                const respostas = await this.page.$$(responseSelector);
                if (respostas.length === 0) continue;
                
                const textoAtual = await respostas[respostas.length - 1].innerText();
                
                if (textoAtual === respostaAnterior) continue;

                if (textoAtual.includes("|FIM|")) {
                    console.log("[DEBUG] Tag |FIM| detectada! Captura completa.");
                    return textoAtual.replace("|FIM|", "").trim();
                }
                
                if (textoAtual === ultima_captura && textoAtual.length > 20) {
                    ultimasTentativasComTexto++;
                    if (ultimasTentativasComTexto >= 15) { // Aumentado para 15 ciclos de estabilidade
                        console.log("[DEBUG] Estabilidade alcançada (fallback).");
                        return textoAtual.trim();
                    }
                } else {
                    ultimasTentativasComTexto = 0;
                }
                
                ultima_captura = textoAtual;
            }
            return ultima_captura || "Erro: Resposta não capturada.";
        } catch (e) {
            return `Erro na automação: ${e.message}`;
        }
    }
}

module.exports = new WebAutomation();
