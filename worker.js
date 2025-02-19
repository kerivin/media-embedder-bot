/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */

const TOKEN = ENV_BOT_TOKEN // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const SECRET = ENV_BOT_SECRET // A-Z, a-z, 0-9, _ and -
const LIST_URL = ENV_LIST_URL
const WEBHOOK = '/endpoint'

/**
 * Wait for requests to the worker
 */
addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname === WEBHOOK) {
    event.respondWith(handleWebhook(event))
  } else if (url.pathname === '/registerWebhook') {
    event.respondWith(registerWebhook(event, url, WEBHOOK, SECRET))
  } else if (url.pathname === '/unRegisterWebhook') {
    event.respondWith(unRegisterWebhook(event))
  } else {
    event.respondWith(new Response('No handler for this request'))
  }
})

/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
async function handleWebhook (event) {
  // Check secret
  if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Read request body synchronously
  const update = await event.request.json()
  // Deal with response asynchronously
  event.waitUntil(onUpdate(update))

  return new Response('Ok')
}

/**
 * Handle incoming Update
 * https://core.telegram.org/bots/api#update
 */
async function onUpdate (update) {
  if ('message' in update) {
    await onMessage(update.message)
  } else if ('inline_query' in update) {
    await onInlineQuery(update.inline_query)
  }
}

/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
async function onMessage (message) {
    const {url, title} = await getFixedURL(message.text)
    return sendPlainText(message.chat.id, url)
}

/**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
async function sendPlainText (chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text
  }))).json()
}

/**
 * Handle incoming query
 * https://core.telegram.org/bots/api#InlineQuery
 */
async function onInlineQuery (inlineQuery) {
  const originalURL = inlineQuery.query;
  const {url, title} = await getFixedURL(originalURL)
  const results = [({
    type: 'article',
    id: crypto.randomUUID(),
    title: '☞ CLICK TO SEND',
    //url: url,
    hide_url: true,
    //thumbnail_url: originalURL,
    description: title,
    input_message_content: {
      message_text: `[${title}](${url})`,
      parse_mode: "markdown",
      link_preview_options: {
        is_disabled: false,
        url: url
      }
    }
  })]
  const res = JSON.stringify(results)
  return SendInlineQuery(inlineQuery.id, res)
}

async function getFixedURL (originalURL) {
  console.log("Original URL: ", originalURL)
  var url = new URL(originalURL)
  console.log("Hostname: ", url.hostname)
  console.log("List URL: ", LIST_URL)
  const response = await fetch(LIST_URL);
  if (!response.ok) {
    throw new Error(`Fetch: ${response.status}`);
  }
  const json = await response.json();
  console.log("JSON: ", JSON.stringify(json));
  var title = "Embed Link"
  json.every(function(entry) {
    const regex = new RegExp(entry.source, "gi")
    if (!regex.test(url.hostname)) {
      return true
    }
    console.log("Regex detected: ", entry.source)
    url.hostname = url.hostname.replace(regex, entry.target)
    //url.hostname = entry.target
    console.log("New hostname: ", url.hostname)
    title = entry.name
    return false
  })

  console.log("Fixed URL: ", url)
  return {
    url: url.toString(),
    title: title
  }
}

/**
 * Send result of the query
 * https://core.telegram.org/bots/api#answerinlinequery
 */

async function SendInlineQuery (inlineQueryId, results) {
  return (await fetch(apiUrl('answerInlineQuery', {
    inline_query_id: inlineQueryId,
    results
  }))).json()
}

/**
 * Set webhook to this worker's url
 * https://core.telegram.org/bots/api#setwebhook
 */
async function registerWebhook (event, requestUrl, suffix, secret) {
  // https://core.telegram.org/bots/api#setwebhook
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Remove webhook
 * https://core.telegram.org/bots/api#setwebhook
 */
async function unRegisterWebhook (event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Return url to telegram api, optionally with parameters added
 */
function apiUrl (methodName, params = null) {
  let query = ''
  if (params) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}
