package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEndpoints(t *testing.T) {
	r := router()
	items := make([]item, 1000)
	for i := range items {
		id := i + 1
		items[i] = item{ID: id, Name: fmt.Sprintf("item-%d", id), Value: id * 10}
	}
	large, err := json.Marshal(items)
	if err != nil {
		t.Fatal(err)
	}
	numbers := make([]int, 1000)
	for i := range numbers {
		numbers[i] = i + 1
	}
	body, err := json.Marshal(map[string][]int{"numbers": numbers})
	if err != nil {
		t.Fatal(err)
	}
	tests := []struct{ method, path, request, contentType, expected string }{
		{"GET", "/health", "", "text/plain; charset=utf-8", "OK"},
		{"GET", "/plaintext", "", "text/plain; charset=utf-8", "Hello, World!"},
		{"GET", "/json", "", "application/json; charset=utf-8", `{"message":"Hello, World!"}`},
		{"GET", "/json-large", "", "application/json; charset=utf-8", string(large)},
		{"POST", "/aggregate", string(body), "application/json; charset=utf-8", `{"count":1000,"sum":500500,"min":1,"max":1000}`},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.request))
			if tt.method == "POST" {
				req.Header.Set("Content-Type", "application/json")
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != http.StatusOK || w.Header().Get("Content-Type") != tt.contentType || w.Body.String() != tt.expected {
				t.Fatalf("unexpected response: status=%d content-type=%q body length=%d", w.Code, w.Header().Get("Content-Type"), w.Body.Len())
			}
		})
	}
}

func TestAggregateInvalidJSON(t *testing.T) {
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/aggregate", strings.NewReader("{bad"))
	req.Header.Set("Content-Type", "application/json")
	router().ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("got %d, want 400", w.Code)
	}
}
