# 🐙 OCTO-NET — WhatsApp Bot com IA e Monitoramento de Vagas

> **Bot para WhatsApp construído com Baileys, geração de conteúdo via automação de navegador (Playwright) e monitoramento automático de vagas de emprego via Supabase.**

---

## 📖 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades](#funcionalidades)
3. [Arquitetura](#arquitetura)
4. [Como Funciona a "API Falsa" (Bot sem API Oficial)](#como-funciona-a-api-falsa-bot-sem-api-oficial)
5. [Como Funciona o Playwright no Bot](#como-funciona-o-playwright-no-bot)
6. [Sistema de Comandos](#sistema-de-comandos)
7. [Fluxo de Mensagens](#fluxo-de-mensagens)
8. [Monitoramento de Vagas com Supabase](#monitoramento-de-vagas-com-supabase)
9. [Tecnologias Utilizadas](#tecnologias-utilizadas)
10. [Estrutura de Diretórios](#estrutura-de-diretórios)
11. [Configuração e Variáveis de Ambiente](#configuração-e-variáveis-de-ambiente)
12. [Como Executar](#como-executar)
13. [Extensibilidade](#extensibilidade)
14. [Licença](#licença)

---

## Visão Geral

O **OCTO-NET** é um bot para WhatsApp que atua como **mentor de inglês** e **assistente técnico** em comunidades de TI. Ele combina:

- **Respostas geradas por IA** via automação de navegador (Playwright) — sem depender de APIs pagas.
- **Sistema modular de comandos** com prefixo `!`.
- **Monitoramento automático de vagas** de emprego via Supabase.
- **Tarefas agendadas** (pergunta diária, dica, resumo de notícias tech).

---

## Funcionalidades

- 🤖 **Respostas com IA**: Geração de conteúdo via `browserAgent` (Playwright). O bot responde quando é explicitamente mencionado ou quando a mensagem contém palavras-chave.
- 🛠️ **Comandos extensíveis**: Sistema modular com hot-reload (`!reload`).
- 💼 **Monitoramento de Vagas**: Integração com Supabase para buscar e enviar vagas automaticamente em grupos autorizados.
- 📅 **Tarefas Agendadas**: Pergunta matinal, dica da tarde e resumo tech noturno em grupo configurado.
- 🌐 **Tradutores e utilitários**: `!translate`, `!define`, `!check`, `!tip`, `!word`.
- 📰 **Notícias e tendências**: `!news` (Hacker News) e `!trending` (GitHub).
- 🎲 **Interação social**: `!poll`, `!pair`, `!hotseat`, `!challenge`.

---

## Arquitetura

O bot é **modular e orientado a eventos**, com poucos componentes. A ideia é ser simples e fácil de manter:

```
┌────────────────────────────────────────────────────────────┐
│                    WHATSAPP (Baileys)                      │
│  Event: messages.upsert                                    │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│                      index.js (Entrypoint)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │handleCommand │  │ Scheduler    │  │ Monitor de Vagas │  │
│  │ (Comandos)   │  │ (Tarefas)    │  │ (Supabase)       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌────────────────────────────────────────────────────────────┐
│                      MÓDULOS                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │command_handler│ │browser_agent │  │  commands/*.js   │  │
│  │ (Dispatcher) │  │ (Playwright) │  │  (17 comandos)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Entrada**: O bot recebe mensagens via Baileys (`messages.upsert`).
2. **Pré-processamento**: Ignora reações, protocolos, mensagens do próprio bot e mensagens sem texto/mídia.
3. **Comandos**: Se a mensagem começa com `!`, roteia para o `command_handler`.
4. **IA**: Se a mensagem contém palavra-chave ou é menção/reply ao bot, envia para o `browserAgent` gerar resposta.
5. **Resposta**: Envia a resposta de volta ao WhatsApp.
6. **Tarefas**: Agendadores rodam em paralelo (vagas a cada 20s; digest diário a cada 1 min).

---

## Como Funciona a "API Falsa" (Bot sem API Oficial)

O WhatsApp **não fornece API pública oficial** para bots (apenas WhatsApp Business API, que é paga e burocrática). O OCTO-NET contorna isso com **Baileys**, uma biblioteca que implementa o protocolo WebSocket do WhatsApp Web.

### O que é Baileys?

Biblioteca Node.js que se conecta ao WhatsApp Web via WebSocket, simulando um cliente real:

- **Autentica** via QR Code.
- **Mantém sessão** com credenciais em disco (`baileys_auth/`).
- **Recebe eventos** de mensagens, conexão, presença.
- **Envia mensagens** de texto, mídia, stickers, enquetes.

### Por que é uma "API Falsa"?

1. **Não é oficial**: depende de engenharia reversa do protocolo.
2. **Quebra com atualizações**: o WhatsApp pode mudar o protocolo a qualquer momento.
3. **Risco de bloqueio**: uso intensivo pode levar a bloqueios temporários.
4. **Funciona como cliente real**: o bot aparece como um dispositivo conectado.

### Como o OCTO-NET usa Baileys

```javascript
const {
    default: makeWASocket,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore
} = require('baileys');

const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');

const sock = makeWASocket({
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    logger: pino({ level: 'error' }),
    printQRInTerminal: true
});

sock.ev.on('connection.update', (u) => {
    if (u.qr) qrcode.generate(u.qr, { small: true });
    if (u.connection === 'open') console.log('[V] Bot Online.');
});

sock.ev.on('messages.upsert', async ({ messages }) => {
    // Processa mensagens
});
```

### Vantagens e Desvantagens

| Vantagens | Desvantagens |
|-----------|--------------|
| ✅ Gratuito | ❌ Não oficial (pode quebrar) |
| ✅ Fácil de configurar | ❌ Risco de bloqueio |
| ✅ Suporte a todas as funcionalidades do WhatsApp | ❌ Requer manutenção constante |
| ✅ Persistência de sessão | ❌ Não escala para milhares de usuários |

---

## Como Funciona o Playwright no Bot

O Playwright é usado como **interface entre o bot e a IA generativa** (ChatGPT, Gemini, etc.). Em vez de pagar por APIs oficiais, o bot **navega até a interface web da IA**, envia o prompt e captura a resposta.

### O que é Playwright?

Ferramenta de automação de navegadores (Chrome, Firefox, Safari). Permite:

- Controlar navegador headless.
- Navegar, preencher formulários, clicar.
- Extrair texto.
- Reutilizar sessão persistente (login salvo em disco).

### Como o OCTO-NET usa Playwright

1. **Inicialização**: `browserAgent.init()` abre um Chromium persistente (`gemini_session/`).
2. **Reutilização**: se a sessão já estiver logada, reaproveita os cookies.
3. **Injeção**: o prompt é inserido no campo de texto da interface.
4. **Submissão**: clica em enviar (ou pressiona Enter).
5. **Captura**: aguarda a resposta, detecta a tag `|FIM|` ou estabilidade do texto.
6. **Limpeza**: remove tags de controle e retorna o texto.

### Por que usar Playwright em vez de API?

| Motivo | Explicação |
|--------|------------|
| **Custo zero** | Não paga por token, usa a versão web gratuita. |
| **Flexibilidade** | Funciona com qualquer IA que tenha interface web. |
| **Evasão de limites** | Contorna cotas de API. |
| **Controle total** | Permite manipular cookies, sessões, etc. |

### Riscos

- **Mudanças na interface**: se a IA mudar o layout, o bot quebra.
- **Rate limiting**: pode ser bloqueado por excesso de requisições.
- **CAPTCHA**: algumas interfaces exigem verificação humana.
- **Performance**: navegador headless consome mais recursos que uma API.

---

## Sistema de Comandos

O sistema é **modular, dinâmico e extensível**. Todos os comandos ficam em `commands/` e são carregados automaticamente.

### Estrutura de um Comando

```javascript
module.exports = {
    name: 'comando',
    aliases: ['alias1', 'alias2'],
    description: 'Descrição do comando',
    async execute(sock, msg, remoteJid, args, context) {
        await sock.sendMessage(remoteJid, { text: 'Resposta' }, { quoted: msg });
    }
};
```

### Carregamento (`loadCommands`)

```javascript
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    commands.clear();
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        commands.set(command.name, command);
        if (command.aliases) {
            for (const alias of command.aliases) commands.set(alias, command);
        }
    }
    console.log(`[V] ${commandFiles.length} comandos carregados.`);
}
```

### Execução (`handleCommand`)

```javascript
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
```

### Contexto Passado aos Comandos

```javascript
const context = {
    browserAgent,    // Interface com IA via Playwright
    globalState,     // Estado global (monitores de vagas, sessões)
    commandHandler   // Referência ao dispatcher (para !reload)
};
```

### Comandos Disponíveis

| Comando | Aliases | Descrição |
|---------|---------|-----------|
| `help` | `menu` | Exibe lista de comandos |
| `reload` | — | Recarrega comandos sem reiniciar |
| `ping` | — | Verifica se o bot está online |
| `word` | — | Palavra do dia |
| `check` | — | Correção gramatical |
| `translate` | — | Tradução + contexto |
| `define` | — | Definição técnica |
| `tip` | — | Dica rápida |
| `vagas` | — | Monitoramento de vagas (Supabase) |
| `news` | — | Manchetes Hacker News |
| `trending` | — | Repositórios em alta no GitHub |
| `challenge` | — | Desafio semanal |
| `poll` | — | Enquete |
| `pair` | — | Sorteio de duplas |
| `hotseat` | — | Berlinda |
| `grupos` | — | Lista grupos ativos |
| `test` | — | Comando de debug |

---

## Fluxo de Mensagens

```
1. Mensagem recebida (messages.upsert)
   │
   ├─► Ignora: reações, protocolos, fromMe, sem texto
   │
   ├─► É comando (!)? ─► handleCommand ─► FIM
   │
   ├─► É trigger? (palavra-chave / menção / reply ao bot)
   │   │
   │   ├─► NÃO: ignora
   │   │
   │   └─► SIM: enfileira em aiQueue
   │       │
   │       ├─► sendPresenceUpdate('composing')
   │       ├─► browserAgent.send(prompt)
   │       ├─► Limpa resposta
   │       └─► sendMessage() ─► FIM
   │
   └─► FIM
```

### Detecção de Trigger

O bot responde a IA quando:

1. **Palavra-chave** está no texto (`octo-net`, `bot`, `robo`).
2. **Reply** a uma mensagem do próprio bot.
3. **Menção direta** (`@bot`) na mensagem.

Fora isso, ele ignora mensagens comuns (a menos que sejam comandos).

---

## Monitoramento de Vagas com Supabase

O comando `!vagas` implementa monitoramento automático de vagas usando Supabase (PostgreSQL).

### Arquitetura

```
┌─────────────────────────────────────────────┐
│           Supabase (PostgreSQL)             │
│  Table: jobs                                │
│  (id, title, company, seniority, modality,  │
│   location, apply_url, status, send_to_bot) │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│   Intervalo (20s) — index.js                │
│   1. Verifica monitores ativos              │
│   2. Busca vagas não enviadas               │
│   3. Envia para grupos autorizados          │
│   4. Marca send_to_bot = true               │
└─────────────────────────────────────────────┘
```

### Comandos do Módulo `!vagas`

| Comando | Descrição |
|---------|-----------|
| `!vagas on` | Ativa monitoramento no grupo |
| `!vagas off` | Desativa monitoramento no grupo |
| `!vagas todas` | Envia todas as vagas pendentes |
| `!vagas false` | Marca todas as vagas como não enviadas |
| `!vagas debug` | Exibe tabela no console |
| `!vagas help` | Exibe ajuda |

### Como Funciona

1. **Ativação**: `!vagas on` no grupo.
2. **Carga inicial**: busca todas as vagas pendentes (`send_to_bot IS NULL OR false`).
3. **Envio**: envia cada vaga formatada.
4. **Marcação**: atualiza `send_to_bot = true`.
5. **Monitoramento**: a cada 20s, verifica novas vagas.
6. **Desativação**: `!vagas off`.

### Exemplo de Mensagem

```
💼 *NOVA VAGA DETECTADA*

📌 *Cargo:* Desenvolvedor Full Stack
🏢 *Empresa:* TechCorp
📈 *Nível:* pleno
💻 *Modalidade:* remoto
🔗 *Link:* https://techcorp.com/vaga/123
```

---

## Tecnologias Utilizadas

| Biblioteca | Uso |
|------------|-----|
| `baileys` | Conexão WhatsApp (WebSocket) |
| `playwright-extra` | Automação de navegador |
| `puppeteer-extra-plugin-stealth` | Anti-detecção |
| `@supabase/supabase-js` | Cliente Supabase |
| `qrcode-terminal` | QR Code no terminal |
| `pino` | Logging |
| `dotenv` | Variáveis de ambiente |

---

## Estrutura de Diretórios

```
BOT_GALTI/
├── assets/                  # Recursos estáticos
├── baileys_auth/            # Credenciais do WhatsApp (não versionar)
├── gemini_session/          # Sessão do navegador (não versionar)
├── commands/                # Módulos de comandos
│   ├── challenge.js
│   ├── check.js
│   ├── define.js
│   ├── grupos.js
│   ├── help.js
│   ├── hotseat.js
│   ├── news.js
│   ├── pair.js
│   ├── ping.js
│   ├── poll.js
│   ├── reload.js
│   ├── test.js
│   ├── tip.js
│   ├── translate.js
│   ├── trending.js
│   ├── vagas.js
│   └── word.js
├── .env                     # Variáveis de ambiente (não versionar)
├── .gitignore
├── app_state.js             # Estado global
├── bot_config.js            # Configurações
├── browser_agent.js         # Interface Playwright
├── command_handler.js       # Dispatcher de comandos
├── config_node.json         # Seletores do navegador
├── index.js                 # Ponto de entrada
├── news_service.js          # Serviço de notícias
├── package.json
└── README.md
```

---

## Configuração e Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
# Supabase (para monitoramento de vagas)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave
```

### Configurações no `bot_config.js`

```javascript
const OWNER_ID = '...';                    // ID do dono do bot
const PALAVRAS_CHAVE = ["octo-net", "bot", "robo"]; // Triggers da IA
const BOT_ATIVO = true;                    // Liga/desliga global
const DEBUG_MODE = false;                  // Logs detalhados
```

---

## Como Executar

### Pré-requisitos

- Node.js v16+
- npm v7+
- Conta WhatsApp ativa

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/octo-net.git
cd octo-net

# 2. Instale as dependências
npm install

# 3. Configure o .env
cp .env.example .env
# Edite .env com suas credenciais

# 4. Execute o bot
node index.js
```

### Primeira Execução

1. O bot exibirá um QR Code no terminal.
2. Escaneie com o WhatsApp no celular.
3. Aguarde `[V] Bot Online.`
4. Pronto.

### Comandos de Operação

| Comando | Descrição |
|---------|-----------|
| `node index.js` | Inicia o bot |
| `!reload` | Recarrega comandos no WhatsApp |
| `!vagas on` | Ativa monitoramento no grupo |

### Dicas

1. **Não delete `baileys_auth/`** — contém a sessão do WhatsApp.
2. **Não delete `gemini_session/`** — contém o login do navegador.
3. **Faça backup** dessas duas pastas periodicamente.

---

## Extensibilidade

### Adicionar um Novo Comando

1. Crie um arquivo em `commands/`.
2. Exporte `{ name, execute, aliases?, description? }`.
3. O bot carrega automaticamente (ou use `!reload`).

```javascript
// commands/meucomando.js
module.exports = {
    name: 'meucomando',
    aliases: ['mc'],
    description: 'Meu comando personalizado',
    async execute(sock, msg, remoteJid, args, context) {
        await sock.sendMessage(remoteJid, {
            text: 'Olá! Este é meu comando personalizado!'
        }, { quoted: msg });
    }
};
```

### Adicionar um Novo Serviço

1. Crie um módulo em `meu_servico.js`.
2. Exporte uma classe ou função.
3. Importe no `index.js` ou em comandos.

---

## Licença

Este projeto está licenciado sob a **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Isso significa que:

- ✅ Você pode usar, estudar, modificar e distribuir este código.
- ✅ Você pode usar comercialmente.
- ⚠️ **Se você modificar e distribuir**, precisa liberar o código sob a mesma licença.
- ⚠️ **Se você hospedar como serviço (SaaS)**, também precisa liberar o código-fonte.
- ⚠️ **Você deve manter os créditos** do autor original.

Veja o arquivo [LICENSE](LICENSE) para o texto completo.

---

**Desenvolvido com ❤️ por MirandaJonhy**

Para dúvidas ou sugestões, abra uma issue no repositório.