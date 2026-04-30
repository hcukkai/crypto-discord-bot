# Crypto Discord Bot

A Discord bot for crypto traders with price alerts, portfolio tracking, and webhook signals.

## Features

- Real-time price queries (!price bitcoin)
- Price alerts (!alert eth above 4000)
- Portfolio tracking with P&L (!portfolio add/show)
- Rich embeds with color-coded gains/losses
- 60-second alert polling

## Setup

1. Clone repo
2. `npm install`
3. Copy `.env.example` to `.env` and add your Discord token
4. `npm start`

## Commands

| Command | Description |
|---------|-------------|
| `!price [symbol]` | Get current USD price |
| `!alert [symbol] [above/below] [price]` | Set price alert |
| `!portfolio add [symbol] [amount] [avgPrice]` | Add position |
| `!portfolio show` | View portfolio + P&L |
| `!help` | Show all commands |

## Deploy to Railway/Render

Use the included `render.yaml` or set `DISCORD_TOKEN` as env var.
