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
export type Position =
  | "top"
  | "top-center"
  | "top-left"
  | "top-right"
  | "bottom"
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"
  | "center"

export type FirstDayOfWeek = "monday" | "sunday"

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

export const config: Config = {
  position: "top-center",
  margin: 12,
  firstDayOfWeek: "monday",
  locale: "pt-BR",
}
