import { Gtk } from "ags/gtk4"
import type { Position } from "../lib/config"

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
