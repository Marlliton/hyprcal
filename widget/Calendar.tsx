import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { config, alignment } from "../lib/config"

export const WINDOW_NAME = "calendar"

/**
 * Janela do popup.
 *
 * O layer ocupa a tela inteira e é transparente; o calendário em si é o card
 * ancorado dentro dele. Esse é o único jeito de ter "fecha ao clicar fora" em
 * wlr-layer-shell — um layer só recebe eventos dentro dos próprios limites,
 * então precisamos que os limites sejam a tela toda.
 */
export default function Calendar() {
  const { TOP, BOTTOM, LEFT, RIGHT } = Astal.WindowAnchor
  const { halign, valign } = alignment(config.position)

  let card: Gtk.Widget

  return (
    <window
      name={WINDOW_NAME}
      namespace="hyprcal"
      class="Hyprcal"
      visible={false}
      application={app}
      layer={Astal.Layer.OVERLAY}
      // NORMAL: o popup não reserva espaço, só flutua por cima.
      exclusivity={Astal.Exclusivity.NORMAL}
      // EXCLUSIVE garante que o Esc funcione assim que a janela abre, sem
      // depender de o compositor ter dado foco antes. Enquanto o popup está
      // visível ele segura o teclado — é o comportamento de um popup modal.
      keymode={Astal.Keymode.EXCLUSIVE}
      anchor={TOP | BOTTOM | LEFT | RIGHT}
      $={(self) => {
        const keys = new Gtk.EventControllerKey()
        keys.connect("key-pressed", (_, keyval) => {
          if (keyval === Gdk.KEY_Escape) {
            self.visible = false
            return true
          }
          return false
        })
        self.add_controller(keys)

        // Clique no vazio fecha. Comparamos o ponto clicado com os limites do
        // card em vez de usar um botão de fundo, porque um botão engoliria
        // também os cliques que caem em cima do calendário.
        const click = new Gtk.GestureClick()
        click.connect("pressed", (_, _n, x, y) => {
          const [ok, bounds] = card.compute_bounds(self)
          if (!ok) return

          const inside =
            x >= bounds.origin.x &&
            x <= bounds.origin.x + bounds.size.width &&
            y >= bounds.origin.y &&
            y <= bounds.origin.y + bounds.size.height

          if (!inside) self.visible = false
        })
        self.add_controller(click)
      }}
    >
      <box
        class="card"
        halign={halign}
        valign={valign}
        marginTop={config.margin}
        marginBottom={config.margin}
        marginStart={config.margin}
        marginEnd={config.margin}
        orientation={Gtk.Orientation.VERTICAL}
        $={(self) => (card = self)}
      >
        <label class="placeholder" label="hyprcal" />
      </box>
    </window>
  )
}
