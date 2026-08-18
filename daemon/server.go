package main

import (
	"net"
	"sync"
)

type server struct {
	ln      net.Listener
	mu      *sync.Mutex
	conns   map[net.Conn]struct{}
	closing bool
}

func newServer(ln net.Listener) *server {
	return &server{
		ln:      ln,
		mu:      &sync.Mutex{},
		closing: false,
		conns:   make(map[net.Conn]struct{}),
	}
}

func (s *server) track(conn net.Conn) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closing {
		return false
	}

	s.conns[conn] = struct{}{}

	return true
}

func (s *server) untrack(conn net.Conn) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.conns, conn)
}

func (s *server) closeConns() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.closing = true
	for conn := range s.conns {
		conn.Close()
	}
}
