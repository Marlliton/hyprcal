package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
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

func newErr(id *int, code, msg string) Err {
	return Err{ID: id, Error: ErrBody{Code: code, Msg: msg}}
}

func main() {
	if err := run(); err != nil {
		slog.Error("run", "error", err)
		os.Exit(1)
	}
}

func run() error {
	envs, err := config.LoadEnvs()
	if err != nil {
		return fmt.Errorf("load envs: %w", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	fullPath := filepath.Join(envs.XDGRuntimeDir, "hyprcal", "daemon.sock")
	dir := filepath.Dir(fullPath)

	err = os.MkdirAll(dir, 0700)
	if err != nil {
		return fmt.Errorf("mkdir all: %w", err)
	}

	ln, err := listenSocket(fullPath)
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}

	srv := newServer(ln)
	defer srv.ln.Close()

	var wg sync.WaitGroup
	go func() {
		for {
			conn, err := srv.ln.Accept()
			if err != nil {
				if errors.Is(err, net.ErrClosed) {
					return
				}

				slog.Error("accept", "error", err)
				continue
			}

			wg.Go(func() {
				handleConn(conn, srv)
			})
		}
	}()

	slog.Info("listening", "socket", fullPath)
	<-ctx.Done()
	stop() // segundo Ctrl + C mata na marra

	slog.Info("shutting down")
	if err := srv.ln.Close(); err != nil && !errors.Is(err, net.ErrClosed) {
		slog.Error("close listener", "error", err)
	}
	srv.closeConns()

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		slog.Info("server exited gracefully")
	case <-time.After(5 * time.Second):
		slog.Warn("shutdown timeout, forcing exit")
	}

	return nil
}

func listenSocket(path string) (net.Listener, error) {
	ln, err := net.Listen("unix", path)
	if err == nil {
		return ln, nil
	}
	if !errors.Is(err, syscall.EADDRINUSE) {
		return nil, err
	}

	conn, dialErr := net.DialTimeout("unix", path, 200*time.Millisecond)
	if dialErr == nil {
		conn.Close()
		return nil, fmt.Errorf("another hyprcald is already running on %s", path)
	}
	// ECONNREFUSED: o arquivo existe, mas nenhum processo o tem aberto.
	if !errors.Is(dialErr, syscall.ECONNREFUSED) {
		return nil, fmt.Errorf("socket %s exists and does not answer: %w", path, dialErr)
	}

	err = os.Remove(path)
	if err != nil {
		return nil, fmt.Errorf("remove stale socket %s: %w", path, err)
	}

	slog.Warn("removed stale socket", "path", path)
	return net.Listen("unix", path)
}

func handleConn(conn net.Conn, srv *server) {
	defer conn.Close()

	if ok := srv.track(conn); !ok {
		return
	}
	defer srv.untrack(conn)

	dec := json.NewDecoder(conn)
	enc := json.NewEncoder(conn)

	for {
		var o Order
		err := dec.Decode(&o)
		if err != nil {
			// A conexão acabou o cliente saiu, ou shutdown.
			if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) ||
				errors.Is(err, net.ErrClosed) {
				return
			}
			if _, ok := errors.AsType[*net.OpError](err); ok {
				return
			}

			// JSON íntegro com campo de tipo errado: é a única falha em que o
			// decoder continua sincronizado e dá para ler a próxima mensagem.
			if _, ok := errors.AsType[*json.UnmarshalTypeError](err); ok {
				_ = enc.Encode(newErr(nil, "invalid_message", err.Error()))
				continue
			}

			// Todo o resto (sintaxe inclusive): o stream não serve mais. Sair é o
			// padrão de propósito
			_ = enc.Encode(newErr(nil, "invalid_message", err.Error()))
			return
		}

		switch o.Kind {
		case "status":
			t := time.Now()
			s := Status{ID: o.ID, Version: 1, Sources: []Source{{Name: "personal", Ok: true, LastSync: &t}}}
			_ = enc.Encode(s)
		default:
			_ = enc.Encode(newErr(&o.ID, "invalid_message", "unknown kind"))
		}
	}
}
