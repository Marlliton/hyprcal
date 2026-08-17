import { describe, it } from "vitest"

// import { parseConfig, config } from "./config"

describe("parseConfig", () => {
  // --- defaults ---

  it.todo("sem nenhuma chave, devolve os defaults inteiros")

  it.todo("sobrescreve só a chave presente e mantém o resto no default")

  // --- chaves válidas ---

  it.todo(`aceita position válida: { position: "bottom-right" }`)

  it.todo("aceita margin inteiro: { margin: 20 }")

  it.todo(
    `traduz first_day_of_week para firstDayOfWeek: { first_day_of_week: "sunday" }`,
  )

  it.todo(`aceita locale: { locale: "en-US" }`)

  // --- valores inválidos caem no default ---

  it.todo(`position desconhecida cai no default: { position: "banana" }`)

  it.todo(`margin com tipo errado cai no default: { margin: "doze" }`)

  it.todo(
    `first_day_of_week inválido cai no default: { first_day_of_week: "funday" }`,
  )

  it.todo("locale que não é string cai no default: { locale: 42 }")

  // --- decisões suas: escreva o teste que afirma o que você escolher ---

  it.todo("decida: margin negativo — aceita, zera, ou cai no default?")

  it.todo("decida: margin fracionado como 1.5 — arredonda ou rejeita?")

  it.todo("decida: chave desconhecida no arquivo — ignora calado ou avisa?")

  it.todo(
    "decida: aceita também a forma camelCase (firstDayOfWeek) no arquivo, ou só snake_case?",
  )

  // --- aviso ao usuário ---
  //
  // Se optar por logar quando um valor for rejeitado, o teste vira uma
  // asserção sobre o aviso, não só sobre o valor. A técnica no vitest:
  //
  //   import { vi, expect } from "vitest"
  //
  //   it("avisa quando ignora um valor inválido", () => {
  //     const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  //     parseConfig({ position: "banana" })
  //     expect(warn).toHaveBeenCalled()
  //     warn.mockRestore()
  //   })
  //
  // O mockImplementation vazio evita poluir a saída dos testes, e o
  // mockRestore devolve o console.warn original para os casos seguintes.

  it.todo("avisa quando ignora um valor inválido")

  // --- robustez: parseConfig recebe o que o parseToml cospe ---
  //
  // Lembre que o parser é tolerante de propósito: ele entrega coisas como
  // '"top (aspa órfã), Infinity e strings vazias. É aqui que isso morre.

  it.todo(`aguenta o que o parser deixa passar: { position: '"top' }`)

  it.todo("aguenta margin = Infinity vindo do parser")
})
