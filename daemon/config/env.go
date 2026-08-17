package config

import (
	"fmt"
	"os"
)

type envs struct {
	XDGRuntimeDir string
}

func LoadEnvs() (envs, error) {
	e := envs{}
	requiredEnvs := map[string]*string{
		"XDG_RUNTIME_DIR": &e.XDGRuntimeDir,
	}

	for key, target := range requiredEnvs {
		value := os.Getenv(key)
		if value == "" {
			return envs{}, fmt.Errorf("env: %s not found", key)
		}

		*target = value
	}

	return e, nil
}
