import { Gtk } from "ags/gtk4"

/**
 * Configuração do hyprcal.
 *
 * Por enquanto só defaults em código. A leitura de
 * ~/.config/hyprcal/config.toml entra na última fatia da v0.1, quando as
 * chaves já tiverem provado que são as certas.
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

/** Traduz `position` para o alinhamento do card dentro do overlay. */
export function alignment(position: Position): {
  halign: Gtk.Align
  valign: Gtk.Align
} {
  const [vertical, horizontal = "center"] = position.split("-")

  const halign =
    horizontal === "left"
      ? Gtk.Align.START
      : horizontal === "right"
        ? Gtk.Align.END
        : Gtk.Align.CENTER

  const valign =
    vertical === "top"
      ? Gtk.Align.START
      : vertical === "bottom"
        ? Gtk.Align.END
        : Gtk.Align.CENTER

  return { halign, valign }
}
