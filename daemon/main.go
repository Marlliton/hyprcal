package main

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"time"

	"github.com/Marlliton/hyprcal/daemon/config"
)

type Order struct {
	ID   int    `json:"id"`
	Kind string `json:"kind"`
}

type Status struct {
	ID      int      `json:"id"`
	Version int      `json:"version"`
	Sources []Source `json:"sources"`
}

type Source struct {
	Name     string     `json:"name"`
	LastSync *time.Time `json:"last_sync"`
	Ok       bool       `json:"ok"`
	Error    string     `json:"error,omitempty"`
}

type Err struct {
	ID    *int    `json:"id"`
	Error ErrBody `json:"error"`
}

type ErrBody struct {
	Code string `json:"code"`
	Msg  string `json:"msg"`
}

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

	ln, err := net.Listen("unix", fullPath)
	if err != nil {
		slog.Error("net listen", "error", err)
		os.Exit(1)
	}
	defer ln.Close()

	slog.Info("listening", "socket", fullPath)

	for {
		conn, err := ln.Accept()
		if err != nil {
			slog.Error("accept", "error", err)
			continue
		}
		go handleConn(conn)
	}
}

func handleConn(conn net.Conn) {
	defer conn.Close()

	dec := json.NewDecoder(conn)
	enc := json.NewEncoder(conn)

	for {
		var o Order
		err := dec.Decode(&o)
		if err != nil {
			if errors.Is(err, io.EOF) {
				return
			}
			e := Err{ID: &o.ID, Error: ErrBody{Code: "invalid_message", Msg: err.Error()}}
			_ = enc.Encode(e)

			if _, ok := errors.AsType[*json.SyntaxError](err); ok {
				return
			}
			continue
		}

		switch o.Kind {
		case "status":
			t := time.Now()
			s := Status{ID: o.ID, Version: 1, Sources: []Source{{Name: "personal", Ok: true, LastSync: &t}}}
			_ = enc.Encode(s)
		default:
			_ = enc.Encode(Err{
				ID:    &o.ID,
				Error: ErrBody{Code: "invalid_message", Msg: "unknown kind"},
			})
		}
	}
}
