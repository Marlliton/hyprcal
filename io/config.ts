import GLib from "gi://GLib?version=2.0"
import { readFile } from "ags/file"
import { parseToml } from "../lib/toml"
import { parseConfig, config as defaults } from "../lib/config"
import type { ParseResult } from "../lib/config"

/**
 * Leitura da config do disco.
 *
 * Mora em io/ e não em lib/ porque toca o sistema: GLib e ags/file puxam
 * `gi://`, que só existe dentro do GJS. lib/ precisa continuar rodando sob
 * Node para os testes. Na v0.2 o socket do daemon vem para cá pelo mesmo
 * motivo.
 */

/** Respeita $XDG_CONFIG_HOME; cai em ~/.config quando não está definido. */
export const CONFIG_PATH = GLib.build_filenamev([
  GLib.get_user_config_dir(),
  "hyprcal",
  "config.toml",
])

/**
 * Lê e valida a config. Nunca lança: sem arquivo, ou com arquivo ilegível, o
 * hyprcal abre nos defaults — é requisito que ele funcione sem configuração
 * nenhuma.
 */
export function loadConfig(path: string = CONFIG_PATH): ParseResult {
  if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
    return { config: { ...defaults }, errors: [] }
  }

  let text: string
  try {
    text = readFile(path)
  } catch (error) {
    return {
      config: { ...defaults },
      errors: [
        {
          field: path,
          value: String(error),
          expected: `error when read config file ${error?.message ?? ""}`,
        },
      ],
    }
  }

  return parseConfig(parseToml(text))
}
