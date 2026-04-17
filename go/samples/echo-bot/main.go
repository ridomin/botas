package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/microsoft/botas/go/pkg/botas"
)

func main() {
	app := botas.NewBotApplication(botas.BotApplicationOptions{})

	app.On("message", func(ctx *botas.TurnContext, c context.Context) error {
		fmt.Printf("Received: %s\n", ctx.Activity.Text)
		_, err := ctx.SendAsync(c, "You said: "+ctx.Activity.Text)
		return err
	})

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})
	
	// Bind BotApplication to /api/messages with optional Auth
	mux.Handle("/api/messages", botas.BotAuth("")(app))

	port := os.Getenv("PORT")
	if port == "" {
		port = "3978"
	}

	fmt.Printf("Bot is listening on port %s\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
