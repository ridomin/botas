package botas

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type TurnContext struct {
	App      *BotApplication
	Activity CoreActivity
}

func (ctx *TurnContext) SendAsync(c context.Context, text string) (*ResourceResponse, error) {
	reply := CoreActivity{
		Type: "message",
		Text: text,
	}
	return ctx.SendActivityAsync(c, reply)
}

func (ctx *TurnContext) SendActivityAsync(c context.Context, reply CoreActivity) (*ResourceResponse, error) {
	if reply.ServiceURL == "" {
		reply.ServiceURL = ctx.Activity.ServiceURL
	}
	if reply.Conversation.ID == "" {
		reply.Conversation = Conversation{ID: ctx.Activity.Conversation.ID}
	}
	if reply.From.ID == "" {
		reply.From = ChannelAccount{ID: ctx.Activity.Recipient.ID, Name: ctx.Activity.Recipient.Name}
	}
	if reply.Recipient.ID == "" {
		reply.Recipient = ChannelAccount{ID: ctx.Activity.From.ID, Name: ctx.Activity.From.Name}
	}
	if reply.ChannelID == "" {
		reply.ChannelID = ctx.Activity.ChannelID
	}

	return ctx.App.ConversationClient.SendCoreActivityAsync(c, reply.ServiceURL, reply.Conversation.ID, reply)
}

func (ctx *TurnContext) SendTypingAsync(c context.Context) error {
	_, err := ctx.SendActivityAsync(c, CoreActivity{Type: "typing"})
	return err
}

type NextTurn func(ctx context.Context) error
type TurnMiddleware func(ctx *TurnContext, next NextTurn) error

type BotApplication struct {
	ConversationClient *ConversationClient
	middleware         []TurnMiddleware
	handlers           map[string]func(ctx *TurnContext, c context.Context) error
	invokeHandlers     map[string]func(ctx *TurnContext, c context.Context) (*InvokeResponse, error)
	OnActivity         func(ctx *TurnContext, c context.Context) error
}

func NewBotApplication(opts BotApplicationOptions) *BotApplication {
	return &BotApplication{
		ConversationClient: NewConversationClient(opts),
		handlers:           make(map[string]func(ctx *TurnContext, c context.Context) error),
		invokeHandlers:     make(map[string]func(ctx *TurnContext, c context.Context) (*InvokeResponse, error)),
	}
}

func (app *BotApplication) Use(m TurnMiddleware) *BotApplication {
	app.middleware = append(app.middleware, m)
	return app
}

func (app *BotApplication) On(activityType string, h func(ctx *TurnContext, c context.Context) error) *BotApplication {
	app.handlers[strings.ToLower(activityType)] = h
	return app
}

func (app *BotApplication) OnInvoke(name string, h func(ctx *TurnContext, c context.Context) (*InvokeResponse, error)) *BotApplication {
	app.invokeHandlers[name] = h
	return app
}

func (app *BotApplication) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var activity CoreActivity
	if err := json.NewDecoder(r.Body).Decode(&activity); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if activity.Type == "" || activity.ServiceURL == "" || activity.Conversation.ID == "" {
		http.Error(w, "missing required fields", http.StatusBadRequest)
		return
	}

	turnCtx := &TurnContext{
		App:      app,
		Activity: activity,
	}

	var invokeRes *InvokeResponse

	var runPipeline func(int, context.Context) error
	runPipeline = func(index int, c context.Context) error {
		if index < len(app.middleware) {
			return app.middleware[index](turnCtx, func(c2 context.Context) error {
				return runPipeline(index+1, c2)
			})
		}

		if app.OnActivity != nil {
			return app.OnActivity(turnCtx, c)
		}

		if strings.EqualFold(activity.Type, "invoke") {
			if h, ok := app.invokeHandlers[activity.Name]; ok {
				var err error
				invokeRes, err = h(turnCtx, c)
				return err
			}
		}

		if h, ok := app.handlers[strings.ToLower(activity.Type)]; ok {
			return h(turnCtx, c)
		}

		return nil
	}

	if err := runPipeline(0, r.Context()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if invokeRes != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(invokeRes.Status)
		json.NewEncoder(w).Encode(invokeRes.Body)
	} else {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("{}"))
	}
}
