# Protocolo hyprcal ⇄ hyprcald

Contrato entre a UI (TypeScript/AGS) e o daemon de eventos (Go), introduzido na
v0.2. Este documento é a fonte da verdade: os dois lados devem ser
implementáveis lendo só ele, sem consultar o código do outro.

### Libs recomendadas

github.com/teambition/rrule-go │ v1.8.2 │ expande as regras de recorrência │
github.com/arran4/golang-ical │ v0.3.5 │ lê o arquivo .ics e extrai os eventos │

Versão do protocolo: **1**.

## Transporte

- **Socket Unix** em `$XDG_RUNTIME_DIR/hyprcal/daemon.sock`
  (na prática, `/run/user/<uid>/hyprcal/daemon.sock`).
  `$XDG_RUNTIME_DIR` é limpo no logout, então o socket nunca sobrevive à sessão
  que o criou — é o mesmo lugar onde o Hyprland e o próprio AGS guardam os deles.
- **Conexão persistente.** A UI conecta ao iniciar e mantém aberta. É o que
  permite o daemon avisar de mudanças sem ser perguntado.
- **Framing NDJSON:** uma mensagem JSON por linha, terminada em `\n`. Nenhuma
  mensagem contém `\n` cru — o escape de JSON já garante isso.

Só o dono do socket pode conectar (permissão `0700` no diretório). Não há
autenticação: quem tem acesso ao arquivo é o próprio usuário.

## Envelope

Toda mensagem é um objeto JSON. Os campos comuns:

| campo  | tipo   | quando                                                       |
| ------ | ------ | ------------------------------------------------------------ |
| `id`   | número | Pedidos da UI e suas respostas. Ausente em avisos do daemon. |
| `tipo` | string | Sempre nos pedidos e avisos. Ausente nas respostas.          |
| `erro` | objeto | Só em respostas que falharam.                                |

O `id` é gerado pela UI (um contador basta) e ecoado pelo daemon na resposta.
Ele existe porque, num canal persistente, chega tudo pelo mesmo cano: sem o
`id`, a UI não distingue a resposta de setembro da resposta de outubro quando
elas voltam fora de ordem — nem uma resposta de um aviso espontâneo.

**Regra prática:** mensagem com `id` é resposta a um pedido; mensagem sem `id` é
o daemon falando sozinho.

## Mensagens da UI para o daemon

### eventos

Pede todos os eventos que começam ou terminam dentro de um intervalo fechado. A
UI pede o mês visível mais os dois vizinhos, então navegar entre meses
normalmente não vai ao daemon.

Ocorrências de eventos recorrentes já vêm expandidas (ver [Recorrência](#recorrência)).

```
→ {"id":1,"tipo":"eventos","de":"2026-07-01","ate":"2026-09-30"}
← {"id":1,"eventos":[{ ... }, { ... }]}
```

- `de` e `ate`: datas no formato `AAAA-MM-DD`, inclusivas.
- A resposta traz `"eventos": []` quando não há nada — lista vazia não é erro.

### sync

Força a busca imediata das fontes, sem esperar o intervalo de poll.

```
→ {"id":2,"tipo":"sync"}
← {"id":2,"iniciado":true}
```

Responde assim que a sincronização **começa**, não quando termina — ela pode
levar segundos e a UI não deve ficar bloqueada. O fim é anunciado pelo aviso
`mudou`, se algo mudou de fato.

### status

Estado do daemon e das fontes configuradas. Serve também como teste de vida: se
respondeu, o daemon está no ar.

```
→ {"id":3,"tipo":"status"}
← {"id":3,
   "versao":1,
   "fontes":[
     {"nome":"pessoal","ultimo_sync":"2026-08-17T09:15:00-03:00","ok":true},
     {"nome":"trabalho","ultimo_sync":null,"ok":false,"erro":"host desconhecido"}
   ]}
```

- `versao`: versão do protocolo falada pelo daemon.
- `ultimo_sync`: `null` se a fonte nunca sincronizou com sucesso.
- `ok`: se a última tentativa funcionou. Quando `false`, `erro` explica.

## Mensagens do daemon para a UI

### mudou

O daemon terminou uma sincronização e os dados mudaram. Não carrega os eventos
nem o intervalo afetado: é só um toque de campainha.

```
← {"tipo":"mudou"}
```

A UI reage repedindo o intervalo que está mostrando. Isso é deliberado — mandar
o intervalo afetado economizaria uma ida e volta, mas obrigaria o daemon a
raciocinar sobre o que a UI tem em mãos. O pedido de eventos é barato.

O daemon **não** envia `mudou` quando a sincronização não alterou nada.

## Erros

Uma resposta com falha traz o mesmo `id` do pedido e um campo `erro` no lugar
dos dados. A UI trata num ponto só: chegou resposta, tem `erro`?

```
→ {"id":4,"tipo":"eventos","de":"banana","ate":"2026-09-30"}
← {"id":4,"erro":{"codigo":"intervalo_invalido","msg":"'de' não é uma data válida"}}
```

| código               | significa                                                          |
| -------------------- | ------------------------------------------------------------------ |
| `mensagem_invalida`  | JSON malformado, `tipo` desconhecido ou campo obrigatório faltando |
| `intervalo_invalido` | `de`/`ate` ausentes, malformados, ou `ate` anterior a `de`         |
| `interno`            | falha inesperada do daemon; `msg` traz o detalhe para o log        |

`msg` é texto para humano, destinado ao log — a UI decide o que mostrar a partir
do `codigo`, nunca do texto.

Quando o JSON é tão malformado que nem o `id` dá para extrair, o daemon responde
com `"id": null` e o código `mensagem_invalida`.

## Modelo de evento

```json
{
  "id": "reuniao-42",
  "ocorrencia": "2026-08-04T10:00:00-03:00",
  "titulo": "Reunião semanal",
  "inicio": "2026-08-04T10:00:00-03:00",
  "fim": "2026-08-04T11:00:00-03:00",
  "dia_inteiro": false,
  "origem": "trabalho",
  "local": "Sala 3",
  "descricao": "Pauta no drive"
}
```

| campo         | tipo           | obrigatório | observação                                                     |
| ------------- | -------------- | ----------- | -------------------------------------------------------------- |
| `id`          | string         | sim         | Identifica a **série**, não a ocorrência. Estável entre syncs. |
| `ocorrencia`  | string \| null | sim         | `null` para eventos comuns. Ver abaixo.                        |
| `titulo`      | string         | sim         | Pode ser string vazia se a fonte não trouxer.                  |
| `inicio`      | string         | sim         | ISO 8601 com offset, ou `AAAA-MM-DD` se `dia_inteiro`.         |
| `fim`         | string         | sim         | Mesmas regras de `inicio`.                                     |
| `dia_inteiro` | booleano       | sim         | Ver abaixo.                                                    |
| `origem`      | string         | sim         | Nome da fonte no config, para a UI agrupar e exibir.           |
| `local`       | string         | não         | Ausente ou `""` quando não há.                                 |
| `descricao`   | string         | não         | Idem.                                                          |

**A chave única de um evento na tela é `id` + `inicio`.** Nenhum dos dois
sozinho basta: uma série recorrente repete o `id` em todas as ocorrências.

### Datas

ISO 8601 **com offset explícito** — `2026-08-17T14:00:00-03:00`. O offset evita
a ambiguidade de "14h onde?" e preserva a hora local em que o evento foi
marcado, que se perderia convertendo tudo para UTC. O construtor `Date` do
JavaScript entende esse formato diretamente.

### Dia inteiro

Quando `dia_inteiro` é `true`, `inicio` e `fim` trazem **só a data**, sem hora e
sem offset:

```json
{ "inicio": "2026-08-20", "fim": "2026-08-20", "dia_inteiro": true }
```

Não é o mesmo que meia-noite: um aniversário no dia 20 é no dia 20 em qualquer
fuso, e não deve escorregar para o dia 19 quando o usuário viaja. `fim` é
inclusivo — um evento de um dia só tem `inicio` igual a `fim`.

### Recorrência

O daemon expande as regras (`RRULE`) e entrega ocorrências prontas. **A UI nunca
vê uma regra de recorrência** — recebe uma lista de eventos com data e hora, e
não sabe dizer quais vieram de uma série.

O campo `ocorrencia` carrega o identificador do slot original na série
(equivalente ao `RECURRENCE-ID` do iCalendar) e normalmente é igual a `inicio`.
Os dois diferem quando uma instância específica foi remarcada: a reunião de toda
terça às 10h que, só naquela semana, passou para quarta às 14h. Aí `ocorrencia`
guarda a terça original e `inicio`, a quarta real.

Na v0.2 isso é só informação. Na v0.4, quando editar um recorrente for possível,
é o que permite dizer "altere a série X na ocorrência Y" em vez de bagunçar a
série inteira.

## Falhas

### Daemon ausente

Conexão recusada ou socket inexistente significa que o daemon não está rodando.
A UI **degrada para o modo v0.1**: calendário funcional, sem indicadores de
evento, mais um indicador discreto de que os eventos estão indisponíveis.

Isso não é erro nem exige aviso ruidoso — quem nunca configurou uma fonte de
eventos é o caso mais comum, e para essa pessoa o hyprcal continua sendo
exatamente o que ela espera.

### Timeout

A UI espera **2 segundos** por uma resposta antes de desistir daquele pedido e
tratar os eventos como indisponíveis.

O valor é folgado de propósito e não conflita com o requisito de abrir em menos
de 100 ms: a UI **não espera resposta para abrir**. O popup aparece imediatamente
com a grade, e os indicadores de evento surgem quando (e se) a resposta chegar.

### Reconexão

Se a conexão cair — o daemon reiniciou, por exemplo — a UI tenta reconectar com
espera crescente: 1s, 2s, 4s, 8s, até um teto de 30s entre tentativas. O recuo
existe para o caso de o daemon estar em ciclo de crash: tentar a cada 100ms só
gastaria CPU sem resolver.

Reconectada, a UI repede o intervalo que está mostrando — pode ter perdido
avisos enquanto esteve fora.

## Versionamento

O campo `versao` da resposta de `status` diz qual versão o daemon fala. A UI
compara com a que conhece:

- **Igual:** segue normalmente.
- **Diferente:** degrada para o modo sem eventos e registra no log. Melhor não
  mostrar dado nenhum do que mostrar dado errado.

Mudanças que **não** quebram compatibilidade e não exigem versão nova: campos
novos e opcionais no evento, novos códigos de erro, novos tipos de mensagem.
Quem recebe deve **ignorar campos que não conhece** em vez de rejeitar a
mensagem — é o que permite o daemon evoluir sem esperar a UI.

Quebram, e exigem versão nova: remover ou renomear campo, mudar tipo, mudar o
significado de um valor existente.

## Uma sessão completa

```
                      UI conecta em $XDG_RUNTIME_DIR/hyprcal/daemon.sock

→ {"id":1,"tipo":"status"}
← {"id":1,"versao":1,"fontes":[{"nome":"pessoal","ultimo_sync":"2026-08-17T09:15:00-03:00","ok":true}]}

                      versão bate: a UI habilita os indicadores de evento
                      usuário clica no relógio, popup abre em agosto

→ {"id":2,"tipo":"eventos","de":"2026-07-01","ate":"2026-09-30"}
← {"id":2,"eventos":[
     {"id":"reuniao-42","ocorrencia":"2026-08-04T10:00:00-03:00","titulo":"Reunião semanal",
      "inicio":"2026-08-04T10:00:00-03:00","fim":"2026-08-04T11:00:00-03:00",
      "dia_inteiro":false,"origem":"trabalho"},
     {"id":"aniv-joao","ocorrencia":null,"titulo":"Aniversário do João",
      "inicio":"2026-08-20","fim":"2026-08-20","dia_inteiro":true,"origem":"pessoal"}
   ]}

                      usuário navega para setembro: já está em memória, nada trafega
                      usuário fecha o popup. a conexão continua aberta.

← {"tipo":"mudou"}     15 minutos depois, o daemon sincronizou e algo mudou

→ {"id":3,"tipo":"eventos","de":"2026-07-01","ate":"2026-09-30"}
← {"id":3,"eventos":[ ... ]}

                      usuário quer forçar atualização

→ {"id":4,"tipo":"sync"}
← {"id":4,"iniciado":true}
← {"tipo":"mudou"}     quando terminar, se tiver mudado
```

## Decisões a revisar

Pontos definidos por padrão razoável, não por necessidade — vale reconsiderar
quando a implementação der opinião:

- **Campos em português sem acento** (`titulo`, `dia_inteiro`), seguindo o
  `REQUIREMENTS.md`. Sem acento porque acento em chave JSON funciona mas irrita
  nos dois lados: obriga `evento["título"]` em vez de `evento.titulo`.
- **`mudou` sem intervalo afetado.** Simplicidade sobre economia de uma ida e
  volta. Se o volume de eventos crescer, dá para adicionar `de`/`ate` sem
  quebrar nada.
- **Timeout de 2s e teto de 30s** na reconexão: chutes plausíveis, a serem
  ajustados com uso real.
- **Sem handshake explícito.** O `status` faz o papel de aperto de mão inicial.
  Um `hello` dedicado só se paga se a negociação ficar mais complexa.
