# LLMUI Core v1.0.0

> **Idioma / Language:** [🇫🇷 Français](README.md) | [🇬🇧 English](README.en.md) | [🇪🇸 Español](README.es.md) | [🇩🇪 Deutsch](README.de.md) | 🇵🇹 Português | [🇸🇦 العربية](README.ar.md)

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Ollama](https://img.shields.io/badge/Ollama-local-black.svg)](https://ollama.com)
[![PostgreSQL 16+](https://img.shields.io/badge/PostgreSQL-16%2B-336791.svg)](https://postgresql.org)
[![Platform](https://img.shields.io/badge/Platform-Debian%2013%20%7C%20Ubuntu%2024.04-lightgrey.svg)](https://debian.org)

> **Interface web de consenso multi-modelo IA — soberania digital on-premise**

Desenvolvido por **François Chalut** — Technologies Nexios TF Inc.  
Zero dependências de nuvem. Funciona inteiramente on-premise via Ollama local.

---

## Visão geral

O LLMUI Core oferece dois modos de interação com LLMs locais:

- **Modo Simples**: requisição direta a um único modelo Ollama
- **Modo Consenso**: vários modelos workers analisam em paralelo, um merger sintetiza

### Arquitetura

```
┌─────────────┐
│   Nginx     │  ← Proxy reverso HTTPS (porta 80/443)
└──────┬──────┘
       │
┌──────▼──────────┐
│  llmui-core     │  ← API FastAPI (porta 8004)
│   (FastAPI)     │
└──────┬──────────┘
       │
┌──────▼──────┐
│   Ollama    │  ← Modelos LLM locais (porta 11434)
└─────────────┘
```

---

## Pré-requisitos

| Componente | Versão |
|------------|--------|
| Python | 3.11+ |
| PostgreSQL | 16+ |
| Ollama | 0.1+ |
| Nginx | 1.18+ |
| SO | Debian 13 / Ubuntu 24.04 / Zorin OS 18 |

**Hardware recomendado:** 4 núcleos de CPU, 16 GB de RAM, 50 GB de disco

---

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/GenAICos/llmui-core.git
cd llmui-core
```

### 2. Instalar as dependências Python

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configurar o ambiente

```bash
cp .env.example .env
# Editar .env com seus valores:
#   DATABASE_URL=postgresql+asyncpg://llmui_user:SENHA@localhost:5432/llmui_core
#   APP_PORT=8004
#   APP_ENV=production
```

### 4. Criar o banco de dados PostgreSQL

```bash
# Gerar uma senha segura
openssl rand -hex 32

# Editar postInstallScripts/create_database.sql para substituir DB_PASSWORD
psql -U postgres -f postInstallScripts/create_database.sql
```

Ver [`postInstallScripts/README.md`](postInstallScripts/README.md) para mais detalhes.

### 5. Criar a conta de administrador

```bash
python3 scripts/create_admin.py
```

O script solicita um e-mail e uma senha (mínimo 12 caracteres, com hash Argon2) e registra a conta de administrador no PostgreSQL. A configuração TOTP (obrigatória para administradores) é solicitada no primeiro login.

### 6. Configurar o Nginx

```bash
# Copiar e adaptar o vhost (substituir DOMAIN e APP_PORT)
cp postInstallScripts/nginx_vhost.conf /etc/nginx/sites-available/llmui-core
ln -s /etc/nginx/sites-available/llmui-core /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. Iniciar o backend

```bash
python3 src/llmui_backend.py
```

Ou via systemd. Para uma instalação automatizada completa (pré-requisitos, PostgreSQL, **criação da conta de administrador**, serviços systemd, firewall), utilize o instalador interativo — ele solicita o e-mail e a senha do administrador e os registra no PostgreSQL:

```bash
sudo ./scripts/install_interactive.sh
```

---

## Widget Andy — Suporte IA

**Andy** é o assistente de suporte integrado, acessível em todas as páginas através de um botão flutuante (canto inferior direito).

- **Avatar**: `images/andyLogo.png`
- **Modelo**: Ollama `qwen3.5:0.8b` (configurável via `/zadmin`)
- **Endpoint**: `POST /api/support/chat`
- **Opção** "Falar com um humano" sempre visível

Andy responde no idioma do utilizador e nunca transmite dados sensíveis.

---

## Estrutura do projeto

```
llmui-core/
├── web/                        ← Frontend Vanilla JS + CSS personalizado
│   ├── index.html              ← Página principal
│   ├── login.html              ← Página de login
│   ├── app.js                  ← Lógica principal (LLMUIApp)
│   ├── andy.js                 ← Widget de suporte Andy
│   ├── andy.css                ← Estilos do widget Andy
│   ├── i18n.js                 ← Internacionalização (6 idiomas)
│   └── ...
├── src/                        ← Backend FastAPI
│   ├── llmui_backend.py        ← API principal
│   └── llmui_proxy.py          ← Proxy + sessões
├── images/
│   ├── Icon-Only-White.png     ← Logo do cabeçalho
│   └── andyLogo.png            ← Avatar do Andy
├── postInstallScripts/         ← Scripts pós-instalação
│   ├── nginx_vhost.conf        ← Vhost Nginx HTTPS
│   ├── create_database.sql     ← Criação DB PostgreSQL (idempotente)
│   └── README.md               ← Instruções
├── scripts/                    ← Scripts de instalação do sistema
├── tests/                      ← Testes pytest
├── docs/                       ← Documentação técnica
├── CLAUDE.md                   ← Contexto do projeto para Claude Code
├── STANDARDS.md                ← Padrões Nexios TF (autoridade absoluta)
├── CHANGELOG.md                ← Histórico de versões
├── .env.example                ← Modelo de variáveis de ambiente
└── requirements.txt            ← Dependências Python
```

---

## Endpoints da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/login` | Não | Login |
| GET | `/api/auth/verify` | Sim | Verificar token |
| POST | `/api/auth/logout` | Sim | Logout |
| GET | `/api/models` | Sim | Listar modelos Ollama |
| POST | `/api/simple-generate` | Sim | Geração modo simples |
| POST | `/api/consensus-generate` | Sim | Geração modo consenso |
| GET | `/api/stats` | Não | Estatísticas do sistema |
| POST | `/api/support/chat` | Sim | Chat de suporte Andy |
| GET | `/health` | Não | Health check |

Documentação completa: [`docs/API.md`](docs/API.md)

---

## Funcionalidades

### Consenso multi-modelo
1. **Workers** analisam o prompt em paralelo (2 a 5 modelos)
2. **Merger** sintetiza as respostas numa resposta consolidada
3. Timeouts configuráveis: 15 min → 12 h (4 níveis)

### Ficheiros suportados
`.txt` `.md` `.py` `.js` `.json` `.csv` `.sh` `.css` `.html` `.xml` `.yaml` `.docx` `.xlsx` `.pdf`

### Internacionalização
6 idiomas: `fr` `en` `es` `de` `pt` `ar` (RTL)

### Segurança
- Argon2 para senhas (nunca bcrypt/SHA-256)
- JWT + sessões seguras
- TOTP obrigatório para administradores
- Cabeçalhos de segurança Nginx (HSTS, CSP, X-Frame-Options…)
- Tema claro/escuro

---

## Gestão de serviços

```bash
# Estado
sudo systemctl status llmui-core nginx

# Logs em tempo real
sudo journalctl -u llmui-core -f

# Reiniciar
sudo systemctl restart llmui-core
```

## Desenvolvimento

```bash
# Iniciar o backend
python3 src/llmui_backend.py

# Testes
python3 -m pytest tests/ -v --tb=short

# Linting
ruff check src/

# Verificar Ollama
curl http://localhost:11434/api/tags
```

---

## Documentação

| Ficheiro | Conteúdo |
|----------|----------|
| [`STANDARDS.md`](STANDARDS.md) | Padrões Nexios TF (autoridade absoluta) |
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico de versões |
| [`postInstallScripts/README.md`](postInstallScripts/README.md) | Scripts pós-instalação |
| [`docs/API.md`](docs/API.md) | Documentação API REST |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura técnica |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Resolução de problemas |

---

## Licença

© Technologies Nexios TF Inc. — nexiostf.com  
AGPLv3 + Commons Clause — ver [`LICENSE`](LICENSE)

---

## Suporte

- **Issues**: [github.com/GenAICos/llmui-core/issues](https://github.com/GenAICos/llmui-core/issues)
- **E-mail**: support@nexiostf.com

---

**Desenvolvido no Quebec por François Chalut — pela soberania digital 🇨🇦**
