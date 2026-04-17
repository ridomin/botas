from botas_fastapi import BotApp

app = BotApp()

@app.on("message")
async def on_message(ctx):
    print(f"Received: {ctx.activity.text}")
    await ctx.send(f"You said: {ctx.activity.text}")

if __name__ == "__main__":
    app.start()
