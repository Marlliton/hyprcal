import { describe, it, expect } from "vitest"
import { parseToml } from "./toml"

describe("parseToml", () => {
  it("lê um par chave = valor", () => {
    expect(parseToml(`position = "top-center"`)).toEqual({
      position: "top-center",
    })
  })

  it("ignora linhas vazias e comentários", () => {
    const toml = `
      # um comentário
      position = "top-right"

      # outro
      locale = "pt-BR"
    `
    expect(parseToml(toml)).toEqual({
      position: "top-right",
      locale: "pt-BR",
    })
  })

  it("tolera espaço em volta da chave e do valor", () => {
    expect(parseToml(`   locale   =   "pt-BR"   `)).toEqual({ locale: "pt-BR" })
    expect(parseToml(`margin=12`)).toEqual({ margin: 12 })
  })

  it("devolve número como number, não como string", () => {
    const result = parseToml(`margin = 12`)
    expect(result.margin).toBe(12)
    expect(typeof result.margin).toBe("number")
  })

  it("devolve objeto vazio para entrada vazia", () => {
    expect(parseToml("")).toEqual({})
  })

  // --- a fazer: cada um destes é uma decisão sua ---
  // Troque `it.todo("...")` por `it("...", () => { ... })` conforme atacar.

  it("aceita comentário no fim da linha: margin = 12 # em px", () => {
    expect(
      parseToml(`
      # um comentário
      position = "top-right"

      # outro
      locale = "pt-BR" # Comentário ignorado
    `),
    ).toEqual({
      position: "top-right",
      locale: "pt-BR",
    })
  })

  it(`não corta no # que está dentro de string: locale = "pt#BR"`, () => {
    expect(parseToml('locale = "pt#BR"')).toEqual({ locale: "pt#BR" })
  })

  it(`não quebra no = dentro do valor: format = "a=b"`, () => {
    expect(parseToml('format = "a=b"')).toEqual({ format: "a=b" })
  })

  it("devolve booleano como boolean: enabled = true", () => {
    expect(parseToml("enabled = true")).toEqual({ enabled: true })
  })

  it("ignora linha sem = em vez de explodir", () => {
    expect(parseToml("enabled true")).toEqual({})
  })

  it.todo("decida: o que fazer com valor inválido como margin = 12abc")
})
