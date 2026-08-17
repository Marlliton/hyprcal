import { describe, it, expect } from "vitest"
import { parseConfig, config } from "./config"

/**
 * Contrato da parseConfig: recebe o objeto cru que a parseToml devolveu e
 * entrega uma Config íntegra, sempre — nunca lança, nunca devolve campo
 * faltando. Valor que não dá para aproveitar cai no default e é relatado em
 * `errors`, para quem chamou decidir se loga, mostra na UI ou ignora.
 */
describe("parseConfig", () => {
  it("sem nenhuma chave, devolve os defaults inteiros", () => {
    expect(parseConfig({}).config).toEqual(config)
  })

  it("sobrescreve só a chave presente e mantém o resto no default", () => {
    expect(parseConfig({ margin: 20 }).config).toEqual({
      ...config,
      margin: 20,
    })
  })

  it("não muta o objeto de defaults", () => {
    parseConfig({ margin: 99, locale: "en-US" })
    expect(config.margin).toBe(12)
    expect(config.locale).toBe("pt-BR")
  })

  // --- chaves válidas ---

  it("aceita position válida", () => {
    expect(parseConfig({ position: "bottom-right" }).config.position).toBe(
      "bottom-right",
    )
  })

  it("aceita margin inteiro", () => {
    expect(parseConfig({ margin: 20 }).config.margin).toBe(20)
  })

  it("aceita margin zero", () => {
    expect(parseConfig({ margin: 0 }).config.margin).toBe(0)
  })

  it("traduz first_day_of_week para firstDayOfWeek", () => {
    expect(
      parseConfig({ first_day_of_week: "sunday" }).config.firstDayOfWeek,
    ).toBe("sunday")
  })

  it("aceita locale", () => {
    expect(parseConfig({ locale: "en-US" }).config.locale).toBe("en-US")
  })

  it("aceita todas as chaves de uma vez", () => {
    expect(
      parseConfig({
        position: "top-left",
        margin: 4,
        first_day_of_week: "sunday",
        locale: "es-ES",
      }).config,
    ).toEqual({
      position: "top-left",
      margin: 4,
      firstDayOfWeek: "sunday",
      locale: "es-ES",
    })
  })

  // --- valores inválidos caem no default ---

  it("position desconhecida cai no default", () => {
    expect(parseConfig({ position: "banana" }).config.position).toBe(
      config.position,
    )
  })

  it("margin com tipo errado cai no default", () => {
    expect(parseConfig({ margin: "doze" }).config.margin).toBe(config.margin)
  })

  it("first_day_of_week inválido cai no default", () => {
    expect(
      parseConfig({ first_day_of_week: "funday" }).config.firstDayOfWeek,
    ).toBe(config.firstDayOfWeek)
  })

  it("locale que não é string cai no default", () => {
    expect(parseConfig({ locale: 42 }).config.locale).toBe(config.locale)
  })

  it("uma chave inválida não contamina as outras", () => {
    const result = parseConfig({ position: "banana", margin: 30 })
    expect(result.config.position).toBe(config.position)
    expect(result.config.margin).toBe(30)
  })

  // --- decisões: inverta o teste se preferir outro comportamento ---

  // Margem é distância da borda da tela. Valor negativo não tem significado,
  // então tratamos como erro de digitação em vez de tentar adivinhar.
  it("margin negativo cai no default", () => {
    expect(parseConfig({ margin: -5 }).config.margin).toBe(config.margin)
  })

  // Aqui a intenção do usuário é clara (ele quer ~2px), só precisa virar
  // inteiro — cair no default seria mais surpreendente que arredondar.
  it("margin fracionado é arredondado", () => {
    expect(parseConfig({ margin: 1.5 }).config.margin).toBe(2)
    expect(parseConfig({ margin: 10.4 }).config.margin).toBe(10)
  })

  // Só snake_case é aceito no arquivo; uma forma canônica evita ter que
  // documentar duas grafias e conviver com as duas para sempre.
  it("não aceita a forma camelCase no arquivo", () => {
    expect(
      parseConfig({ firstDayOfWeek: "sunday" }).config.firstDayOfWeek,
    ).toBe(config.firstDayOfWeek)
  })

  it("ignora chave desconhecida sem quebrar o resto", () => {
    expect(parseConfig({ cor_do_texto: "azul", margin: 8 }).config).toEqual({
      ...config,
      margin: 8,
    })
  })
})

/**
 * A outra metade do contrato: o que vai parar em `errors`.
 *
 * A regra que amarra tudo: se um valor foi descartado, tem que aparecer aqui.
 * Um campo que silenciosamente vira default é pior que um que explode — o
 * usuário edita o arquivo, nada muda, e não há pista de por quê.
 */
describe("parseConfig — erros", () => {
  it("não reporta erro quando não há nada para reportar", () => {
    expect(parseConfig({}).errors).toEqual([])
    expect(parseConfig({ margin: 8, position: "center" }).errors).toEqual([])
  })

  it("descreve o erro com campo, valor recebido e o que era esperado", () => {
    const { errors } = parseConfig({ position: "banana" })

    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe("position")
    expect(errors[0].value).toBe("banana")
    expect(errors[0].expected).toBeTruthy()
  })

  it("usa no campo o nome que aparece no arquivo, não o do TypeScript", () => {
    // Quem lê a mensagem está olhando o config.toml, onde a chave é
    // first_day_of_week — apontar para firstDayOfWeek não ajudaria ninguém.
    expect(parseConfig({ first_day_of_week: "funday" }).errors[0].field).toBe(
      "first_day_of_week",
    )
  })

  it("acumula um erro por campo inválido em vez de parar no primeiro", () => {
    const { errors, config: result } = parseConfig({
      position: "banana",
      first_day_of_week: "funday",
      locale: 42,
    })

    expect(errors).toHaveLength(3)
    expect(errors.map((e) => e.field).sort()).toEqual([
      "first_day_of_week",
      "locale",
      "position",
    ])
    // e mesmo com três erros, a config sai íntegra
    expect(result).toEqual(config)
  })

  it("preserva o valor original recebido, sem convertê-lo", () => {
    expect(parseConfig({ locale: 42 }).errors[0].value).toBe(42)
  })

  // --- todo valor descartado precisa virar erro ---

  it("reporta margin negativo", () => {
    const { config: result, errors } = parseConfig({ margin: -5 })
    expect(result.margin).toBe(config.margin)
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe("margin")
  })

  it("reporta margin com tipo errado", () => {
    expect(parseConfig({ margin: "doze" }).errors).toHaveLength(1)
  })

  // --- o que o parser tolerante deixa passar precisa morrer aqui ---

  it("rejeita margin infinito", () => {
    const { config: result, errors } = parseConfig({ margin: Infinity })
    expect(result.margin).toBe(config.margin)
    expect(errors).toHaveLength(1)
  })

  it("rejeita margin nulo", () => {
    const { config: result, errors } = parseConfig({ margin: null })
    expect(result.margin).toBe(config.margin)
    expect(errors).toHaveLength(1)
  })

  it("rejeita margin booleano", () => {
    const { config: result, errors } = parseConfig({ margin: true })
    expect(result.margin).toBe(config.margin)
    expect(errors).toHaveLength(1)
  })

  it("rejeita margin que é lista", () => {
    const { config: result, errors } = parseConfig({ margin: [] })
    expect(result.margin).toBe(config.margin)
    expect(errors).toHaveLength(1)
  })

  it("rejeita aspa órfã que o parser deixou passar", () => {
    const { config: result, errors } = parseConfig({ position: '"top' })
    expect(result.position).toBe(config.position)
    expect(errors).toHaveLength(1)
  })

  it("rejeita string vazia como locale", () => {
    const { config: result, errors } = parseConfig({ locale: "" })
    expect(result.locale).toBe(config.locale)
    expect(errors).toHaveLength(1)
  })

  it("trata null como valor inválido, não como ausência", () => {
    // undefined significa "não veio no arquivo"; null só chega se o parser
    // produziu algo estranho, e aí é erro.
    expect(parseConfig({ position: null }).errors).toHaveLength(1)
    expect(parseConfig({ position: undefined }).errors).toEqual([])
  })

  it.todo("decida: chave desconhecida vira erro para pegar typo como postion?")
})
