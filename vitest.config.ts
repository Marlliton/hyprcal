import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Só o que é lógica pura. Nada em widget/ é testável aqui: aquele código
    // importa GTK via GJS, que não existe dentro do Node.
    include: ["lib/**/*.test.ts"],
  },
})
