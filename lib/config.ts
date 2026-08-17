/**
 * Configuração do hyprcal.
 *
 * Por enquanto só defaults em código. A leitura de
 * ~/.config/hyprcal/config.toml entra na última fatia da v0.1, quando as
 * chaves já tiverem provado que são as certas.
 *
 * Este arquivo não pode importar GTK: ele roda também nos testes, sob Node,
 * onde `gi://` não existe. A tradução para GTK vive em widget/alignment.ts.
 */
export const POSITIONS = [
  "top",
  "top-center",
  "top-left",
  "top-right",
  "bottom",
  "bottom-center",
  "bottom-left",
  "bottom-right",
  "center",
] as const

export type Position = (typeof POSITIONS)[number]

export const FIRST_DAY_OF_WEEK = ["monday", "sunday"] as const

export type FirstDayOfWeek = (typeof FIRST_DAY_OF_WEEK)[number]

export interface Config {
  /** Onde o popup ancora na tela. */
  position: Position
  /** Distância da borda da tela, em px. Precisa passar da waybar. */
  margin: number
  /** Primeira coluna da grade. */
  firstDayOfWeek: FirstDayOfWeek
  /** Nomes de meses e dias. */
  locale: string
}

type ConfigError = {
  field: string
  value: unknown
  expected: string
}

type ParseResult = {
  config: Config
  errors: ConfigError[]
}

export const config: Config = {
  position: "top-center",
  margin: 12,
  firstDayOfWeek: "monday",
  locale: "pt-BR",
}

export function parseConfig(cfg: Record<string, unknown>): ParseResult {
  const errors: ConfigError[] = []
  const finalCfg = { ...config }

  if (cfg.margin !== undefined) {
    if (
      typeof cfg.margin !== "number" ||
      !Number.isFinite(cfg.margin) ||
      cfg.margin < 0
    ) {
      errors.push({
        field: "margin",
        value: cfg.margin,
        expected: "number greater than or equal to zero",
      })
    } else {
      finalCfg.margin = Math.round(cfg.margin)
    }
  }

  if (cfg.position !== undefined) {
    if (isPosition(cfg.position)) {
      finalCfg.position = cfg.position
    } else {
      errors.push({
        field: "position",
        value: cfg.position,
        expected: `some one: ${POSITIONS.join(", ")}`,
      })
    }
  }

  if (cfg.first_day_of_week !== undefined) {
    if (isFirstDayOfWeek(cfg.first_day_of_week)) {
      finalCfg.firstDayOfWeek = cfg.first_day_of_week
    } else {
      errors.push({
        field: "first_day_of_week",
        value: cfg.first_day_of_week,
        expected: `some one: ${FIRST_DAY_OF_WEEK.join(", ")}`,
      })
    }
  }

  if (cfg.locale !== undefined) {
    // String vazia passa no typeof mas não é um locale.
    if (typeof cfg.locale === "string" && cfg.locale.trim() !== "") {
      finalCfg.locale = cfg.locale
    } else {
      errors.push({
        field: "locale",
        value: cfg.locale,
        expected: "non-empty text, such as pt-BR",
      })
    }
  }

  return { config: finalCfg, errors }
}

function isPosition(value: unknown): value is Position {
  return typeof value === "string" && POSITIONS.includes(value as Position)
}

function isFirstDayOfWeek(value: unknown): value is FirstDayOfWeek {
  return (
    typeof value === "string" &&
    FIRST_DAY_OF_WEEK.includes(value as FirstDayOfWeek)
  )
}
