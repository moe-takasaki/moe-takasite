import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.SHOUTBOX_DATA_DIR || join(__dirname, 'data')
const shoutsPath = join(dataDir, 'shouts.json')
const visitorsPath = join(dataDir, 'visitors.json')
const port = Number(process.env.SHOUTBOX_PORT || 8787)
const adminCode = process.env.SHOUTBOX_ADMIN_CODE || ''
const statsFmUserId = process.env.STATSFM_USER_ID || 'vulnerabikitty'
const statsFmToken = process.env.STATSFM_ACCESS_TOKEN || process.env.STATSFM_API_TOKEN || ''
const statsFmCacheMs = 20_000
const maxShouts = 50
const allowedReactions = ['❤️', '👍', '👎', '😭', '😳', '🥀', '🎉']
const defaultNameColor = '#7dd3fc'
let statsFmCache = { expiresAt: 0, payload: null }

const defaultShouts = [
  {
    id: 'welcome',
    name: 'system',
    text: 'leave a shout',
    time: 'now',
    ownerId: 'system',
    nameColor: defaultNameColor,
    website: '',
    reactions: {},
    replies: [],
    timestamp: 0,
    createdAt: new Date(0).toISOString(),
  },
]

async function readShouts() {
  try {
    const file = await readFile(shoutsPath, 'utf8')
    const shouts = JSON.parse(file)

    return Array.isArray(shouts) ? shouts.map(normalizeShout) : defaultShouts
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeShouts(defaultShouts)
      return defaultShouts
    }

    throw error
  }
}

function normalizeShout(shout) {
  const reactions = {}

  for (const [reaction, clientIds] of Object.entries(shout.reactions || {})) {
    const normalizedReaction = reaction === '♥' ? '❤️' : reaction

    if (!allowedReactions.includes(normalizedReaction) || !Array.isArray(clientIds)) {
      continue
    }

    reactions[normalizedReaction] = [
      ...new Set([...(reactions[normalizedReaction] || []), ...clientIds.map(String)]),
    ]
  }

  return {
    ...shout,
    name: String(shout.name || 'anon').slice(0, 40),
    text: String(shout.text || '').slice(0, 400),
    nameColor: sanitizeNameColor(shout.nameColor),
    website: sanitizeWebsite(shout.website),
    timestamp: normalizeTimestamp(shout.timestamp, shout.createdAt),
    reactions,
    replies: Array.isArray(shout.replies)
      ? shout.replies.map(normalizeReply).filter((reply) => reply.text)
      : [],
  }
}

async function writeShouts(shouts) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(shoutsPath, `${JSON.stringify(shouts.slice(-maxShouts), null, 2)}\n`)
}

async function readVisitCount() {
  try {
    const file = await readFile(visitorsPath, 'utf8')
    const visitorData = JSON.parse(file)

    if (Array.isArray(visitorData)) {
      return visitorData.length
    }

    return Number.isFinite(visitorData.count) ? visitorData.count : 0
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeVisitCount(0)
      return 0
    }

    throw error
  }
}

async function writeVisitCount(count) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(visitorsPath, `${JSON.stringify({ count }, null, 2)}\n`)
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

function sendEmpty(response, status) {
  response.writeHead(status, { 'Cache-Control': 'no-store' })
  response.end()
}

function sanitizeNameColor(value) {
  const color = String(value || '').trim()

  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : defaultNameColor
}

function sanitizeWebsite(value) {
  const rawUrl = String(value || '').trim().slice(0, 120)

  if (!rawUrl) {
    return ''
  }

  try {
    const parsedUrl = new URL(rawUrl)

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return ''
    }

    return parsedUrl.href.slice(0, 120)
  } catch {
    return ''
  }
}

function normalizeReply(reply) {
  const timestamp = normalizeTimestamp(reply.timestamp, reply.createdAt)

  return {
    id: String(reply.id || randomUUID()),
    text: String(reply.text || '').trim().slice(0, 240),
    timestamp,
    createdAt: String(reply.createdAt || new Date().toISOString()),
  }
}

function normalizeTimestamp(value, fallbackValue) {
  const timestamp = Number(value)

  if (Number.isFinite(timestamp) && timestamp >= 0) {
    return timestamp
  }

  const fallbackTimestamp = Date.parse(fallbackValue || '')

  return Number.isFinite(fallbackTimestamp) ? fallbackTimestamp : Date.now()
}

async function readJsonBody(request) {
  let body = ''

  for await (const chunk of request) {
    body += chunk

    if (body.length > 4096) {
      throw new Error('Request body too large')
    }
  }

  return body ? JSON.parse(body) : {}
}

function sanitizeShout(shout, clientId, number) {
  const normalizedShout = normalizeShout(shout)
  const reactionEntries = Object.entries(normalizedShout.reactions || {})
  const reactions = Object.fromEntries(
    reactionEntries.map(([reaction, clientIds]) => [
      reaction,
      Array.isArray(clientIds) ? clientIds.length : 0,
    ]),
  )
  const reacted = reactionEntries
    .filter(([, clientIds]) => Array.isArray(clientIds) && clientIds.includes(clientId))
    .map(([reaction]) => reaction)

  return {
    id: normalizedShout.id,
    number,
    name: normalizedShout.name,
    text: normalizedShout.text,
    timestamp: normalizedShout.timestamp,
    nameColor: normalizedShout.nameColor,
    website: normalizedShout.website,
    replies: normalizedShout.replies,
    owned: Boolean(clientId && normalizedShout.ownerId === clientId),
    reactions,
    reacted,
  }
}

function isAdmin(request) {
  return Boolean(adminCode) && request.headers['x-admin-code'] === adminCode
}

function getClientId(request) {
  return String(request.headers['x-client-id'] || '').slice(0, 80)
}

function getFirstExternalId(externalIds, key) {
  const ids = externalIds?.[key]

  return Array.isArray(ids) && ids[0] ? String(ids[0]) : ''
}

function normalizeStatsFmTrack(currentTrack) {
  if (!currentTrack?.isPlaying || !currentTrack.track) {
    return {
      configured: true,
      isPlaying: false,
      track: null,
    }
  }

  const track = currentTrack.track
  const artists = Array.isArray(track.artists)
    ? track.artists.map((artist) => String(artist.name || '')).filter(Boolean)
    : []
  const album = Array.isArray(track.albums) ? track.albums[0] : null
  const spotifyTrackId = getFirstExternalId(track.externalIds, 'spotify')
  const appleMusicTrackId = getFirstExternalId(track.externalIds, 'appleMusic')

  return {
    configured: true,
    isPlaying: true,
    platform: currentTrack.platform || '',
    progressMs: Number(currentTrack.progressMs) || 0,
    checkedAt: Date.now(),
    track: {
      name: String(track.name || 'unknown track'),
      artists,
      album: album?.name ? String(album.name) : '',
      artwork: album?.image ? String(album.image) : '',
      url: spotifyTrackId
        ? `https://open.spotify.com/track/${spotifyTrackId}`
        : appleMusicTrackId
          ? `https://music.apple.com/song/${appleMusicTrackId}`
          : '',
    },
  }
}

async function getStatsFmCurrentTrack() {
  if (!statsFmUserId) {
    return {
      configured: false,
      isPlaying: false,
      track: null,
    }
  }

  if (statsFmCache.payload && statsFmCache.expiresAt > Date.now()) {
    return statsFmCache.payload
  }

  const headers = {
    Accept: 'application/json',
    'User-Agent': 'mycard/0.0.0',
  }

  if (statsFmToken) {
    headers.Authorization = `Bearer ${statsFmToken}`
  }

  const statsFmUrl = `https://api.stats.fm/api/v1/users/${encodeURIComponent(
    statsFmUserId,
  )}/streams/current`
  const statsFmResponse = await fetch(statsFmUrl, { headers })

  if (statsFmResponse.status === 404) {
    return {
      configured: true,
      isPlaying: false,
      track: null,
      error: 'statsfm_user_not_found',
    }
  }

  if (!statsFmResponse.ok) {
    throw new Error(`stats.fm responded with ${statsFmResponse.status}`)
  }

  const payload = normalizeStatsFmTrack((await statsFmResponse.json()).item)
  statsFmCache = {
    expiresAt: Date.now() + statsFmCacheMs,
    payload,
  }

  return payload
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`)

    if (url.pathname === '/api/health') {
      sendJson(response, 200, { ok: true })
      return
    }

    if (url.pathname === '/api/listening' && request.method === 'GET') {
      sendJson(response, 200, await getStatsFmCurrentTrack())
      return
    }

    if (url.pathname === '/api/visitor' && request.method === 'POST') {
      const clientId = getClientId(request)

      if (!clientId) {
        sendJson(response, 400, { error: 'missing_client_id' })
        return
      }

      const visitCount = (await readVisitCount()) + 1
      await writeVisitCount(visitCount)
      sendJson(response, 201, { visitorNumber: visitCount })
      return
    }

    if (url.pathname === '/api/shouts' && request.method === 'GET') {
      const clientId = getClientId(request)
      const shouts = await readShouts()
      const sanitizedShouts = shouts.map((shout, index) => sanitizeShout(shout, clientId, index + 1))
      sendJson(response, 200, { shouts: sanitizedShouts.reverse() })
      return
    }

    if (url.pathname === '/api/shouts' && request.method === 'POST') {
      const clientId = getClientId(request)
      const body = await readJsonBody(request)
      const text = String(body.text || '').trim().slice(0, 400)
      const name = String(body.name || '').trim().slice(0, 40) || 'anon'
      const nameColor = sanitizeNameColor(body.nameColor)
      const website = sanitizeWebsite(body.website)

      if (!clientId) {
        sendJson(response, 400, { error: 'missing_client_id' })
        return
      }

      if (!text) {
        sendJson(response, 400, { error: 'empty_text' })
        return
      }

      const shout = {
        id: randomUUID(),
        name,
        text,
        timestamp: Date.now(),
        ownerId: clientId,
        nameColor,
        website,
        reactions: {},
        replies: [],
        createdAt: new Date().toISOString(),
      }

      const shouts = [...(await readShouts()), shout].slice(-maxShouts)
      await writeShouts(shouts)
      sendJson(response, 201, { shout: sanitizeShout(shout, clientId, shouts.length) })
      return
    }

    const deleteMatch = url.pathname.match(/^\/api\/shouts\/([^/]+)$/)

    if (deleteMatch && request.method === 'DELETE') {
      const shoutId = decodeURIComponent(deleteMatch[1])
      const clientId = getClientId(request)
      const admin = isAdmin(request)
      const shouts = await readShouts()
      const target = shouts.find((shout) => shout.id === shoutId)

      if (!target) {
        sendEmpty(response, 204)
        return
      }

      if (!admin && target.ownerId !== clientId) {
        sendJson(response, 403, { error: 'forbidden' })
        return
      }

      await writeShouts(shouts.filter((shout) => shout.id !== shoutId))
      sendEmpty(response, 204)
      return
    }

    const reactionMatch = url.pathname.match(/^\/api\/shouts\/([^/]+)\/reactions$/)

    if (reactionMatch && request.method === 'POST') {
      const shoutId = decodeURIComponent(reactionMatch[1])
      const clientId = getClientId(request)
      const body = await readJsonBody(request)
      const reaction = String(body.reaction || '')

      if (!clientId) {
        sendJson(response, 400, { error: 'missing_client_id' })
        return
      }

      if (!allowedReactions.includes(reaction)) {
        sendJson(response, 400, { error: 'bad_reaction' })
        return
      }

      const shouts = await readShouts()
      const target = shouts.find((shout) => shout.id === shoutId)

      if (!target) {
        sendJson(response, 404, { error: 'not_found' })
        return
      }

      target.reactions ||= {}
      target.reactions[reaction] = Array.isArray(target.reactions[reaction])
        ? target.reactions[reaction]
        : []

      if (target.reactions[reaction].includes(clientId)) {
        target.reactions[reaction] = target.reactions[reaction].filter((id) => id !== clientId)
      } else {
        target.reactions[reaction] = [...target.reactions[reaction], clientId]
      }

      if (target.reactions[reaction].length === 0) {
        delete target.reactions[reaction]
      }

      await writeShouts(shouts)
      sendJson(response, 200, { shout: sanitizeShout(target, clientId, shouts.indexOf(target) + 1) })
      return
    }

    const replyMatch = url.pathname.match(/^\/api\/shouts\/([^/]+)\/replies$/)

    if (replyMatch && request.method === 'POST') {
      if (!isAdmin(request)) {
        sendJson(response, 403, { error: 'forbidden' })
        return
      }

      const shoutId = decodeURIComponent(replyMatch[1])
      const body = await readJsonBody(request)
      const text = String(body.text || '').trim().slice(0, 240)

      if (!text) {
        sendJson(response, 400, { error: 'empty_text' })
        return
      }

      const shouts = await readShouts()
      const target = shouts.find((shout) => shout.id === shoutId)

      if (!target) {
        sendJson(response, 404, { error: 'not_found' })
        return
      }

      target.replies = [
        ...(Array.isArray(target.replies) ? target.replies : []),
        {
          id: randomUUID(),
          text,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
        },
      ]

      await writeShouts(shouts)
      sendJson(response, 201, { shout: sanitizeShout(target, getClientId(request), shouts.indexOf(target) + 1) })
      return
    }

    if (url.pathname === '/api/admin/check' && request.method === 'POST') {
      sendJson(response, isAdmin(request) ? 200 : 403, { ok: isAdmin(request) })
      return
    }

    sendJson(response, 404, { error: 'not_found' })
  } catch (error) {
    console.error(error)
    sendJson(response, 500, { error: 'server_error' })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Shoutbox API listening on http://127.0.0.1:${port}`)
})
