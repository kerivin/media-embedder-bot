# Embed Media Telegram Bot

Media Embedder Bot for Telegram

It replaces regular post links (https://twitter.com/..., https://vt.tiktok.com/..., etc) with links that display embed media, so you can watch all the TikTok/Reddit/Twitter/Bluesky posts your friends send you at 5AM in Telegram, without ever launching apps or a browser.

I'm not the author of embed links themselves, the bot just uses the ones I've found. Embedding is limited to original projects'.

Usage: write `@bot_username <post link>` in any chat, **you don't need to add the bot to a group chat**

## Credits

[Telegram Bot on Cloudflare Workers](https://github.com/cvzi/telegram-bot-cloudflare)

[TikTok Embed](https://tfxktok.com/)

[Reddit Embed](https://github.com/dylanpdx/vxReddit)

[Twitter, Bluesky Embed](https://github.com/FixTweet/FxTwitter)


## Installation

You don't need to install anything on your PC, and you can run this bot entirely for free.

### Fast way

1. Register a new bot with [BotFather](https://t.me/BotFather), set inline mode with `/setinline`
1. Create a worker in [Cloudflare](https://dash.cloudflare.com/sign-up/workers-and-pages) [(free plan doesn't require a card)](https://dash.cloudflare.com/sign-up/workers-and-pages)
1. Set secrets and variables in worker settings:
   - `ENV_BOT_SECRET` - secret for [setWebhook](https://core.telegram.org/bots/api#setwebhook), allowed symbols: A-Z, a-z, 0-9, _ and -
   - `ENV_BOT_TOKEN` - secret, you've got this after creating a bot with [BotFather](https://t.me/BotFather)
   - `ENV_LIST_URL` - text, use this value: `https://raw.githubusercontent.com/kerivin/media-embedder-bot/refs/heads/main/list.json`
1. Press `Edit Code` on your worker page, copy the content of `worker.js`, paste it into the editor and press `Deploy`
1. Enter this in address bar in your browser: `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=media-embedder-bot.<USERNAME>.workers.dev`, where `<BOT_TOKEN>` is the one you got from BotFather, and  `<USERNAME>` is your Cloudflare username. The default subdomain is `<USERNAME>.workers.dev`, but you can see the actual one on [Cloudflare](https://dash.cloudflare.com/) -> Workers & Pages -> Overview
1. If it says Ok, your bot is ready!

### Github deployment way

1. Register a new bot with [BotFather](https://t.me/BotFather), set inline mode with `/setinline`
1. Fork this repo
1. Create Cloudflare Worker "media-embedder-bot" [(free plan doesn't require a card)](https://dash.cloudflare.com/sign-up/workers-and-pages)
1. Set up secrets and variables in Github project settings:
   - `CLOUDFLARE_ACCOUNT_ID` - secret, found on [Cloudflare](https://dash.cloudflare.com/) -> Workers & Pages -> Overview
   - `CLOUDFLARE_API_TOKEN` - secret, create `Edit Workers` [here](https://dash.cloudflare.com/profile/api-tokens)
   - `ENV_BOT_SECRET` - secret for [setWebhook](https://core.telegram.org/bots/api#setwebhook), allowed symbols: A-Z, a-z, 0-9, _ and -
   - `ENV_BOT_TOKEN` - secret, you've got this after creating a bot with [BotFather](https://t.me/BotFather)
1. Adjust `wrangler.toml` according to your needs (for example, link to your own JSON replacement map in `ENV_LIST_URL`). See [here](https://developers.cloudflare.com/workers/wrangler/configuration/)
1. Deploy (happens automatically upon push in `main` branch)
1. Enter this line in your browser address bar and press enter: `https://media-embedder-bot.<USERNAME>.workers.dev/registerWebhook`, where `<USERNAME>` is your Cloudflare username. The default subdomain is `<USERNAME>.workers.dev`, but you can see the actual one on [Cloudflare](https://dash.cloudflare.com/) -> Workers & Pages -> Overview
1. If it says Ok, your bot is ready!
   
