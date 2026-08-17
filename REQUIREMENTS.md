# hyprcal — Requisitos

Popup de calendário para Hyprland que substitui o calendário-tooltip limitado da waybar.
Abre como camada do compositor (layer-shell) ao clicar no relógio da waybar, com
navegação real entre meses/anos, seleção de dias e, nas fases seguintes, eventos.

## Visão geral

- **Problema:** o calendário do módulo `clock` da waybar é Pango markup em um tooltip —
  não permite clique, navegação decente nem exibir dados nos dias.
- **Solução:** um widget nativo GTK4 via AGS/Astal, integrado ao Hyprland por
  wlr-layer-shell, com aparência consistente com o restante do setup (Catppuccin Mocha).

## Arquitetura

Duas peças, com responsabilidades separadas:

| Peça | Linguagem | Papel |
|---|---|---|
| **UI** (`hyprcal`) | TypeScript (AGS/Astal, GTK4, GJS) | Janela layer-shell, calendário, interação, tema |
| **Daemon** (`hyprcald`) | Go | Agregar fontes de eventos, cachear, sincronizar e servir JSON para a UI |

- O daemon **só entra na fase de eventos (v0.2)** — o MVP é 100% TypeScript.
- Comunicação UI ⇄ daemon: socket Unix com mensagens JSON (requisições tipo
  `eventos do intervalo X–Y`; daemon notifica a UI quando há mudanças).
- A UI nunca fala com fontes externas diretamente; toda I/O de dados é do daemon.

## Configuração

- Arquivo: `~/.config/hyprcal/config.toml` (respeitando `$XDG_CONFIG_HOME`).
- Lida na inicialização; recarregável sem reiniciar (watch do arquivo) é desejável, não obrigatório.
- Chaves previstas:
  - `position` — ancoragem do popup (ex.: `top`, `top-right`)
  - `margin` — distância da borda/barra
  - `first_day_of_week` — `monday` | `sunday`
  - `locale` — nomes de meses/dias (padrão: locale do sistema, pt-BR)
  - `theme` — nome do tema (v0.5; até lá só `mocha`)
  - `[sources]` — fontes de eventos do daemon (v0.2): arquivos ICS, CalDAV/Google
  - `[notifications]` — antecedência dos lembretes (v0.3)

## Fases

### v0.1 — MVP (calendário puro, sem eventos)
- [x] Janela layer-shell ancorada conforme config, escondida por padrão.
- [x] Toggle por comando (`ags toggle` / request nomeado) ligado ao `on-click` do
      módulo `clock` da waybar; fecha com `Esc` e ao clicar fora.
- [x] Grade mensal com navegação de mês (◀ ▶) e de ano; botão "hoje".
- [x] Dia atual destacado; seleção de dia por clique (base para eventos na v0.2).
- [x] Tema Catppuccin Mocha, coerente com o `mocha.css` da waybar.
- [ ] Config TOML mínima: `position`, `margin`, `first_day_of_week`, `locale`.
  - [x] Parser do subconjunto de TOML que a UI precisa (`lib/toml.ts`).
  - [x] Validação com defaults e relato de erros (`parseConfig`).
  - [ ] Leitura de `~/.config/hyprcal/config.toml` e uso no lugar dos defaults.

Pendências identificadas durante a implementação:
- [ ] Voltar para o mês atual ao reabrir o popup, em vez de manter onde parou.
- [ ] Recalcular o dia de hoje quando a janela abre — se o app atravessa a
      meia-noite aberto, o destaque fica no dia errado.

### v0.2 — Eventos (leitura)
- [ ] Daemon `hyprcald` em Go com fontes de eventos plugáveis (interface `Source`):
  - [ ] `ics_file` — arquivos/diretórios ICS locais.
  - [ ] `ics_url` — assinatura ICS por URL com polling configurável. Cobre o Google
        Calendar via "endereço secreto em formato iCal" (sem OAuth, somente leitura)
        e qualquer outro provedor que exponha ICS (Outlook, Proton, feeds públicos).
- [ ] Cache local de eventos (SQLite ou JSON): a UI lê só do cache — funciona offline
      e abre instantâneo; o daemon atualiza por trás.
- [ ] Indicador visual nos dias que têm eventos.
- [ ] Painel com a lista de eventos do dia selecionado (hora, título, origem).
- [ ] UI degrada graciosamente se o daemon não estiver rodando (volta ao modo v0.1).

Modelo de evento: `{id, título, início, fim, dia_inteiro, origem, local, descrição}`.

Exemplo de configuração de fontes:

```toml
[[sources]]
type = "ics_url"
name = "pessoal"
url = "https://calendar.google.com/calendar/ical/.../basic.ics"
poll = "15m"

[[sources]]
type = "ics_file"
path = "~/calendars/trabalho.ics"
```

### v0.3 — Notificações
- [ ] Lembretes de eventos via `notify-send`/D-Bus (exibidos pelo swaync), com
      antecedência configurável no TOML.
- [ ] Disparo é responsabilidade do daemon (funciona mesmo com a UI fechada).

### v0.4 — Criar/editar eventos
- [ ] Criar evento a partir de um dia selecionado na UI.
- [ ] Editar/remover eventos de fontes graváveis (ICS local primeiro; CalDAV depois).
- [ ] Escrita passa pelo daemon.
- [ ] Novas fontes graváveis com autenticação: Google Calendar API e/ou CalDAV com
      OAuth (fluxo de autorização, refresh de token). O custo do OAuth só é pago
      aqui — na v0.2 a leitura do Google vem de graça pela URL ICS secreta.

### v0.5 — Temas
- [ ] Sistema de temas configurável (`theme` no TOML), Mocha como padrão.

## Requisitos não-funcionais

- Abertura do popup instantânea (< 100 ms percebidos); a UI nunca bloqueia esperando rede.
- Daemon leve, silencioso e tolerante a falhas de rede (cache serve dados offline).
- Sem dependências além de: AGS/Astal + GTK4 (UI) e binário Go estático (daemon).
- Configs e código versionados; o projeto deve ser instalável por outra pessoa a partir do repositório.

## Fora de escopo (por ora)

- Feriados (brasileiros ou outros) marcados no calendário.
- Visões de semana/agenda; o foco é a visão mensal.
- Suporte a outros compositors além de Hyprland (deve funcionar em qualquer wlroots, mas não é testado/prometido).

## Decisões registradas

- **2026-08-16** — MVP sem eventos; eventos entram na v0.2 já planejados desde o início.
- **2026-08-16** — Backend em Go (`hyprcald`) confirmado para a fase de eventos; UI sempre em TypeScript/AGS.
- **2026-08-16** — Configuração por arquivo TOML em `~/.config/hyprcal/`.
- **2026-08-16** — Extras aceitos no roadmap: notificações, criar/editar eventos, temas. Feriados ficaram fora do escopo.
- **2026-08-16** — Fontes de eventos da v0.2: ICS local e ICS por URL (Google via
  endereço iCal secreto, somente leitura). API do Google/CalDAV com OAuth fica
  amarrada à v0.4, quando a escrita de eventos justificar a complexidade.
- **2026-08-17** — O popup é uma janela layer-shell do tamanho da tela, transparente,
  com o calendário ancorado dentro. É o que permite fechar ao clicar fora: um layer
  só recebe eventos dentro dos próprios limites.
- **2026-08-17** — A grade do mês é sempre 6×7, mesmo quando o mês cabe em 5 semanas,
  para o popup não mudar de altura ao navegar entre meses.
- **2026-08-17** — O parser TOML da UI cobre só pares `chave = valor` no nível raiz.
  Tabelas e arrays de tabelas ficam de fora porque as fontes de eventos (`[[sources]]`)
  são lidas pelo daemon Go, que tem biblioteca madura para isso — a UI nunca vai
  precisar entendê-las.
- **2026-08-17** — Divisão de responsabilidade na config: o parser é tolerante e só
  transforma texto em dados; quem rejeita valor fora do domínio é a validação, que
  precisa disso de qualquer forma. Evita o parser crescer sem fim.
- **2026-08-17** — `parseConfig` devolve `{ config, errors }` em vez de logar direto:
  detectar o erro e reportá-lo são responsabilidades separadas, e quem chama decide
  se mostra no boot, na UI, ou ignora.
- **2026-08-17** — Nada em `lib/` pode importar GTK. Os testes rodam no Node, onde
  `gi://` não existe, então essa é a regra que mantém a pasta testável — a tradução
  para GTK vive em `widget/` (ex.: `widget/alignment.ts`).
- **2026-08-17** — Testes com vitest, cobrindo apenas a lógica pura de `lib/`. O
  runtime real é o GJS, então o que passa aqui ainda merece uma conferida no app.
