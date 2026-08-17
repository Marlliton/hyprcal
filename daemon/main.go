package main

import (
	"log/slog"
	"os"
	"path/filepath"

	"github.com/Marlliton/hyprcal/daemon/config"
)

func main() {
	envs, err := config.LoadEnvs()
	if err != nil {
		slog.Error("load envs", "error", err)
		os.Exit(1)
	}

	fullPath := filepath.Join(envs.XDGRuntimeDir, "hyprcal", "daemon.sock")
	dir := filepath.Dir(fullPath)

	err = os.MkdirAll(dir, 0700)
	if err != nil {
		slog.Error("mkdir all", "error", err)
		os.Exit(1)
	}

	slog.Info("envs", "XDGRuntimeDir", envs.XDGRuntimeDir, "fullPath", fullPath, "dir", dir)
}
