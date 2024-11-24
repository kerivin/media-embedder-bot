# Media Embedder Bot for Telegram

The bot replaces regular post links with ones that display embed media, so you can watch all the TikTok/Reddit/Twitter/Bluesky posts your friends send you at 5AM in Telegram without ever launching apps or a browser.

## Supported embeds

- [TikTok](https://github.com/dylanpdx/vxtiktok)
- [Reddit](https://github.com/dylanpdx/vxReddit)
- [X/Twitter](https://fxtwitter.com/)
- [Bluesky](https://fxtwitter.com/)
- [Instagram](https://www.ddinstagram.com/)
- [YouTube](https://github.com/iGerman00/koutube) (short videos)
- [YouTube Shorts](https://github.com/iGerman00/koutube)

I'm not the author of the embed services themselves, the bot just creates a link to them. If you run into a problem with embeds, you can report it to the original author.

## Usage

`@bot_username <post link>`

Write this in any chat, **you don't need to add the bot to any chat or start chat with it**

## Installation

You don't need to install anything on your PC, and you can run this bot entirely for free.

### Fast way

1. Register a new bot with [BotFather](https://t.me/BotFather), set inline mode by `/setinline`
1. Create [Cloudflare Worker](https://dash.cloudflare.com/sign-up/workers-and-pages) "media-embedder-bot" (free plan doesn't require a card)
1. Set secrets and variables in worker settings:
   - `ENV_BOT_SECRET` - secret for [setWebhook](https://core.telegram.org/bots/api#setwebhook), allowed symbols: A-Z, a-z, 0-9, _ and -
   - `ENV_BOT_TOKEN` - secret, you've got this after creating a bot with [BotFather](https://t.me/BotFather)
   - `ENV_LIST_URL` - text, use this value: `https://raw.githubusercontent.com/kerivin/media-embedder-bot/refs/heads/main/list.json`
1. Press `Edit Code` on your worker page, copy the content of `worker.js`, paste it into the editor and press `Deploy`
1. Enter this line in your browser address bar and press enter: `https://media-embedder-bot.<USERNAME>.workers.dev/registerWebhook`, where `<USERNAME>` is your Cloudflare username. The default subdomain is `<USERNAME>.workers.dev`, but you can see the actual one on [Cloudflare](https://dash.cloudflare.com/) -> Workers & Pages -> Overview
1. If it says Ok, your bot is ready!

### Github deployment way

1. Register a new bot with [BotFather](https://t.me/BotFather), set inline mode by `/setinline`
1. Create [Cloudflare Worker](https://dash.cloudflare.com/sign-up/workers-and-pages) "media-embedder-bot" (free plan doesn't require a card)
1. Fork this repo and set up secrets in Github project settings:
   - `CLOUDFLARE_ACCOUNT_ID` - secret, found on [Cloudflare](https://dash.cloudflare.com/) -> Workers & Pages -> Overview
   - `CLOUDFLARE_API_TOKEN` - secret, create `Edit Workers` [here](https://dash.cloudflare.com/profile/api-tokens)
   - `ENV_BOT_SECRET` - secret for [setWebhook](https://core.telegram.org/bots/api#setwebhook), allowed symbols: A-Z, a-z, 0-9, _ and -
   - `ENV_BOT_TOKEN` - secret, you've got this after creating a bot with [BotFather](https://t.me/BotFather)
1. Adjust `wrangler.toml` according to your needs (for example, link to your own JSON replacement map in `ENV_LIST_URL`). See [here](https://developers.cloudflare.com/workers/wrangler/configuration/)
1. Deploy (trigger Github Actions, for example by push in `main` branch)
1. Enter this line in your browser address bar and press enter: `https://media-embedder-bot.<USERNAME>.workers.dev/registerWebhook`, where `<USERNAME>` is your Cloudflare username. The default subdomain is `<USERNAME>.workers.dev`, but you can see the actual one on [Cloudflare](https://dash.cloudflare.com/) -> Workers & Pages -> Overview
1. If it says Ok, your bot is ready!

## Credits

[Telegram Bot on Cloudflare Workers](https://github.com/cvzi/telegram-bot-cloudflare)
