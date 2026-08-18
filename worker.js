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
  var matched = null
  json.every(function(entry) {
    const regex = new RegExp(entry.source, "gi")
    if (!regex.test(url.hostname)) {
      return true
    }
    console.log("Regex detected: ", entry.source)
    matched = entry
    return false
  })

  if (matched) {
    const candidates = matched.targets || (matched.target ? [matched.target] : [])
    const target = await selectTarget(url, matched.source, candidates)
    if (target) {
      console.log("Selected target: ", target)
      url = rewriteUrl(url, matched.source, target)
      title = matched.name
    } else {
      console.log("No working embed service, returning original URL")
    }
  }

  console.log("Fixed URL: ", url)
  return {
    url: url.toString(),
    title: title
  }
}

/**
 * Replace the matched hostname with the target embed service host.
 */
function rewriteUrl (url, sourceRegex, targetHost) {
  const rewritten = new URL(url.toString())
  rewritten.hostname = rewritten.hostname.replace(new RegExp(sourceRegex, 'gi'), targetHost)
  return rewritten
}

async function selectTarget (url, sourceRegex, candidates) {
  var imageOnly = null
  for (const candidate of candidates) {
    const probeUrl = rewriteUrl(url, sourceRegex, candidate)
    console.log("Probing: ", probeUrl.toString())
    const tags = await probeEmbed(probeUrl.toString())
    if (tags.video) {
      console.log("Video embed found: ", candidate)
      return candidate
    }
    if (tags.image && !imageOnly) {
      console.log("Image-only embed found (fallback): ", candidate)
      imageOnly = candidate
    }
  }
  return imageOnly
}

const EMBED_TIMEOUT_MS = 3000
const MAX_BODY_CHARS = 65536
const CRAWLER_UA = 'TelegramBot-LinkPreview (like TwitterBot)'

async function fetchWithTimeout (url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS)
  try {
    return await fetch(url, { redirect: 'follow', signal: controller.signal, ...options })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Fetch the embed page and check whether it actually contains a media preview.
 * Returns { video, image } booleans. A candidate counts as a video if either:
 * - the embed URL itself resolves to a direct video file, or
 * - the page declares an og:video URL that resolves to a playable video file.
 */
async function probeEmbed (probeUrl) {
  try {
    const response = await fetchWithTimeout(probeUrl, {
      method: 'GET',
      headers: { 'User-Agent': CRAWLER_UA }
    })
    if (!response.ok) {
      console.log("Probe HTTP status: ", response.status)
      return { video: false, image: false }
    }
    const contentType = response.headers.get('content-type') || ''
    if (contentType.toLowerCase().startsWith('video/')) {
      if (response.body) {
        response.body.cancel()
      }
      console.log("Embed URL is a direct video file: ", probeUrl)
      return { video: true, image: false }
    }
    if (!response.body) {
      return { video: false, image: false }
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    var text = ''
    while (text.length < MAX_BODY_CHARS) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
    reader.cancel()
    const tags = extractMetaTags(text)
    const videoUrl = tags['og:video'] || tags['og:video:url'] || tags['og:video:secure_url']
    const videoType = tags['og:video:type']
    const image = !!(tags['og:image'] || tags['og:image:url'] || tags['og:image:secure_url'])
    if (!videoUrl) {
      return { video: false, image }
    }
    if (videoType && !videoType.toLowerCase().startsWith('video/')) {
      console.log("og:video:type is not a video: ", videoType)
      return { video: false, image }
    }
    const video = await isPlayableVideo(videoUrl)
    console.log("Playable video check: ", videoUrl, video)
    return { video, image }
  } catch (e) {
    console.log("Probe failed: ", e.message || e)
    return { video: false, image: false }
  }
}

/**
 * True if the given URL resolves (following redirects) to a direct video file.
 */
async function isPlayableVideo (videoUrl) {
  const contentType = await probeContentType(videoUrl)
  return !!contentType.toLowerCase().startsWith('video/')
}

/**
 * Return the Content-Type of a URL. Uses HEAD, falling back to GET for servers
 * that don't support HEAD. Never downloads the body.
 */
async function probeContentType (url) {
  const contentTypeOf = (response) => response.headers.get('content-type') || ''
  try {
    const response = await fetchWithTimeout(url, {
      method: 'HEAD',
      headers: { 'User-Agent': CRAWLER_UA }
    })
    if (response.status === 405 || response.status === 501) {
      throw new Error(`HEAD not supported: ${response.status}`)
    }
    return contentTypeOf(response)
  } catch (e) {
    console.log("HEAD probe failed, retrying with GET: ", e.message || e)
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'User-Agent': CRAWLER_UA }
      })
      if (response.body) {
        response.body.cancel()
      }
      return contentTypeOf(response)
    } catch (e2) {
      console.log("GET probe failed: ", e2.message || e2)
      return ''
    }
  }
}

/**
 * Extract Open Graph meta tags from an HTML string.
 * Returns an object keyed by the lowercased property/name with its content value.
 */
function extractMetaTags (html) {
  const tags = {}
  const metaRegex = /<meta\b[^>]*>/gi
  var m
  while ((m = metaRegex.exec(html)) !== null) {
    const tag = m[0]
    const getAttr = (name) => {
      const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))
      return match ? match[1] : null
    }
    const property = getAttr('property') || getAttr('name')
    const content = getAttr('content')
    if (property && content) {
      tags[property.toLowerCase()] = content
    }
  }
  return tags
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
