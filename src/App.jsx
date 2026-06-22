import { useEffect, useState } from 'react'
import Turnstile from 'react-turnstile'
import { motion } from 'framer-motion'
import { FaGamepad, FaGithub, FaKey, FaMusic, FaPaperPlane, FaReact, FaTelegramPlane, FaTimes } from 'react-icons/fa'
import './App.css'
import dogeEmpty from './assets/doge-empty.png'
import dislikeEmoji from './assets/emoji/dislike.svg'
import flushedEmoji from './assets/emoji/flushed.svg'
import heartEmoji from './assets/emoji/heart.svg'
import likeEmoji from './assets/emoji/like.svg'
import partyEmoji from './assets/emoji/party.svg'
import sobEmoji from './assets/emoji/sob.svg'
import statsLogo from './assets/stats.svg'
import wiltedRoseEmoji from './assets/emoji/wilted-rose.svg'

const siteKey = import.meta.env.VITE_TURNSTILE_SITEKEY
const AnimatedCard = motion.div
const shoutboxClientKey = 'mycard:shoutbox-client'
const shoutboxAdminSessionKey = 'mycard:shoutbox-admin-code'
const listeningRefreshMs = 30_000
const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP || 'dev'
const buildCommit = import.meta.env.VITE_BUILD_COMMIT || ''
const buildCommitShort = import.meta.env.VITE_BUILD_COMMIT_SHORT || 'unknown'
const buildCommitUrl = buildCommit
  ? `https://github.com/moe-takasaki/moe-takasite/commit/${buildCommit}`
  : 'https://github.com/moe-takasaki/moe-takasite'
let visitorNumberRequest = null
const reactionOptions = [
  { value: '❤️', label: 'Heart', icon: heartEmoji },
  { value: '👍', label: 'Like', icon: likeEmoji },
  { value: '👎', label: 'Dislike', icon: dislikeEmoji },
  { value: '😭', label: 'Sob', icon: sobEmoji },
  { value: '😳', label: 'Flushed', icon: flushedEmoji },
  { value: '🥀', label: 'Wilted rose', icon: wiltedRoseEmoji },
  { value: '🎉', label: 'Party', icon: partyEmoji },
]
const nicknameColors = ['#7dd3fc', '#c084fc', '#fda4af', '#67e8f9', '#a7f3d0', '#f0abfc', '#93c5fd']

const profileLinks = [
  { href: 'https://github.com/moe-takasaki', label: 'GitHub', icon: <FaGithub aria-hidden="true" />, accent: 'hover:text-white' },
  { href: 'https://t.me/kiyoruu_contactbot', label: 'Telegram', icon: <FaTelegramPlane aria-hidden="true" />, accent: 'hover:text-[#2aabee]' },
  { href: 'https://github.com/kagebyte-inc', label: 'Kagebyte', icon: <FaGamepad aria-hidden="true" />, accent: 'hover:text-[#fda4af]' },
]
const webBadges = [
  { href: 'https://takasaki.moe', label: 'takasaki.moe', image: '/88x31.gif' },
  { href: 'https://otomir23.me', label: 'otomir23.me', image: 'https://otomir23.me/88x31.png' },
  {
    label: 'Hacker Webring',
    parts: [
      {
        href: 'https://ring.acab.dev/prev/f50f0a4be1',
        image: 'https://ring.acab.dev/img/webring_88_31_01.png',
        alt: 'Hacker Webring previous',
      },
      {
        href: 'https://ring.acab.dev',
        image: 'https://ring.acab.dev/img/webring_88_31_02.png',
        alt: 'Hacker Webring',
      },
      {
        href: 'https://ring.acab.dev/next/f50f0a4be1',
        image: 'https://ring.acab.dev/img/webring_88_31_03.png',
        alt: 'Hacker Webring next',
      },
    ],
  },
  { href: 'https://ndiuky.top', label: 'ndiuky.top', image: 'https://ndiuky.top/88x31.png' },
]

const roles = [
  'an embedded developer',
  'a hardware hacker',
  'a C & C++ programmer',
  'a reverse engineer',
]

const birthday = new Date(2002, 0, 12, 18, 47, 0)
const yearMs = 365.2425 * 24 * 60 * 60 * 1000

function getPreciseAge() {
  return ((Date.now() - birthday.getTime()) / yearMs).toFixed(10)
}

function usePreciseAge() {
  const [age, setAge] = useState(getPreciseAge)

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setAge(getPreciseAge())
    }, 250)

    return () => window.clearInterval(timerId)
  }, [])

  return age
}

function useTypewriter(items) {
  const [itemIndex, setItemIndex] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fullText = items[itemIndex]
    const isComplete = !deleting && text === fullText
    const isEmpty = deleting && text === ''
    const delay = isComplete ? 1200 : isEmpty ? 360 : deleting ? 36 : 68

    const timerId = window.setTimeout(() => {
      if (isComplete) {
        setDeleting(true)
        return
      }

      if (isEmpty) {
        setDeleting(false)
        setItemIndex((currentIndex) => (currentIndex + 1) % items.length)
        return
      }

      setText((currentText) =>
        deleting
          ? fullText.slice(0, Math.max(currentText.length - 1, 0))
          : fullText.slice(0, currentText.length + 1),
      )
    }, delay)

    return () => window.clearTimeout(timerId)
  }, [deleting, itemIndex, items, text])

  return text
}

function getShoutboxClientId() {
  try {
    const savedClientId = window.localStorage.getItem(shoutboxClientKey)

    if (savedClientId) {
      return savedClientId
    }

    const clientId = window.crypto.randomUUID()
    window.localStorage.setItem(shoutboxClientKey, clientId)
    return clientId
  } catch {
    return 'session'
  }
}

function getSavedAdminCode() {
  try {
    return window.sessionStorage.getItem(shoutboxAdminSessionKey) || ''
  } catch {
    return ''
  }
}

function getRandomNicknameColor() {
  return nicknameColors[Math.floor(Math.random() * nicknameColors.length)]
}

function formatShoutDate(timestamp) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  const sameDay =
    sameYear &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')

  if (sameDay) {
    return 'today'
  }

  if (sameYear) {
    return `${day}-${month}`
  }

  return `${day}-${month}-${date.getFullYear()}`
}

function SiteFooter({ clientId }) {
  const [visitorNumber, setVisitorNumber] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadVisitorNumber() {
      try {
        visitorNumberRequest ||= fetch('/api/visitor', {
          method: 'POST',
          headers: {
            'X-Client-Id': clientId,
          },
        }).then((response) => (response.ok ? response.json() : null))

        const data = await visitorNumberRequest

        if (!cancelled && data) {
          setVisitorNumber(data.visitorNumber)
        }
      } catch {
        // Footer attribution should not disturb the page if the API is offline.
      }
    }

    loadVisitorNumber()

    return () => {
      cancelled = true
    }
  }, [clientId])

  return (
    <footer className="max-w-[780px] px-3 text-center text-[11px] leading-5 text-slate-500">
      <p>
        Powered by{' '}
        <a
          href="https://react.dev"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sky-200/80 transition hover:text-sky-100"
        >
          <FaReact aria-hidden="true" />
          React
        </a>{' '}
        | Shoutbox inspired by{' '}
        <a
          href="https://senko.dev"
          target="_blank"
          rel="noreferrer"
          className="text-sky-200/80 transition hover:text-sky-100"
        >
          senkodev
        </a>{' '}
        | This site noticed you as {visitorNumber ?? '...'} visitor.
      </p>
      <p>
        Doge by{' '}
        <a
          href="https://www.reddit.com/user/oebro/"
          target="_blank"
          rel="noreferrer"
          className="text-sky-200/80 transition hover:text-sky-100"
        >
          u/oebro
        </a>{' '}
        | background by{' '}
        <a
          href="https://steamcommunity.com/sharedfiles/filedetails/?id=3691946745"
          target="_blank"
          rel="noreferrer"
          className="text-sky-200/80 transition hover:text-sky-100"
        >
          两天醒一次
        </a>
      </p>
      <p>
        Built: <span className="font-mono text-slate-400">{buildTimestamp}</span> | Commit{' '}
        <a
          href={buildCommitUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-sky-200/80 transition hover:text-sky-100"
        >
          <FaGithub aria-hidden="true" />
          {buildCommitShort}
        </a>
      </p>
    </footer>
  )
}

function NowListening() {
  const [listening, setListening] = useState({ loading: true, isPlaying: false, track: null })

  useEffect(() => {
    let cancelled = false

    async function loadListening() {
      try {
        const response = await fetch('/api/listening')

        if (!response.ok) {
          throw new Error('bad_response')
        }

        const data = await response.json()

        if (!cancelled) {
          setListening({ loading: false, ...data })
        }
      } catch {
        if (!cancelled) {
          setListening({ loading: false, isPlaying: false, track: null, error: true })
        }
      }
    }

    loadListening()
    const timerId = window.setInterval(loadListening, listeningRefreshMs)

    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [])

  const track = listening.track
  const artistLine = track?.artists?.length ? track.artists.join(', ') : 'unknown artist'
  const statusText = listening.loading
    ? 'checking stats.fm...'
    : listening.error
      ? 'stats.fm is sleepy rn'
      : 'nothing rn'

  return (
    <AnimatedCard
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: 0.04, ease: 'easeOut' }}
      className="w-full max-w-[780px]"
    >
      <section className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#11131d]/90 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-xl">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-sky-100">
          {track?.artwork ? (
            <img src={track.artwork} alt="" aria-hidden="true" className="h-full w-full rounded-xl object-cover" />
          ) : (
            <FaMusic aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Now listening to:
          </p>
          {track ? (
            <p className="truncate text-sm text-slate-200">
              {track.url ? (
                <a
                  href={track.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-sky-100 underline-offset-2 hover:underline"
                >
                  {track.name}
                </a>
              ) : (
                <span className="font-semibold text-sky-100">{track.name}</span>
              )}{' '}
              <span className="text-slate-500">by</span>{' '}
              <span className="text-slate-300">{artistLine}</span>
            </p>
          ) : (
            <p className="truncate text-sm text-slate-500">{statusText}</p>
          )}
        </div>
        <a
          href="https://stats.fm/user/vulnerabikitty"
          target="_blank"
          rel="noreferrer"
          aria-label="stats.fm profile"
          className="shrink-0 opacity-65 transition hover:opacity-90 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
        >
          <img src={statsLogo} alt="" aria-hidden="true" className="h-4 w-auto max-w-24 sm:h-5 sm:max-w-28" />
        </a>
      </section>
    </AnimatedCard>
  )
}

function BadgeWall() {
  return (
    <AnimatedCard
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, delay: 0.1, ease: 'easeOut' }}
      className="w-full max-w-[780px]"
    >
      <section className="rounded-2xl border border-white/10 bg-[#11131d]/80 px-3 py-1 shadow-lg shadow-black/25 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {webBadges.map((badge) =>
            badge.parts ? (
              <div
                key={badge.label}
                aria-label={badge.label}
                className="flex h-[31px] w-[88px] shrink-0 overflow-hidden rounded-[2px] bg-[#0d1019] ring-1 ring-white/15"
              >
                {badge.parts.map((part) => (
                  <a
                    key={part.href}
                    href={part.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={part.alt}
                    className="block h-[31px] shrink-0 outline-none transition hover:brightness-125 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300/80"
                  >
                    <img src={part.image} alt="" aria-hidden="true" className="h-[31px] w-auto max-w-none [image-rendering:pixelated]" />
                  </a>
                ))}
              </div>
            ) : (
              <a
                key={badge.href}
                href={badge.href}
                target="_blank"
                rel="noreferrer"
                aria-label={badge.label}
                className="grid h-[31px] w-[88px] shrink-0 place-items-center overflow-hidden rounded-[2px] bg-[#0d1019] text-center ring-1 ring-white/15 outline-none transition hover:-translate-y-0.5 hover:bg-sky-300/10 hover:ring-sky-200/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300/80"
              >
                {badge.image ? (
                  <img src={badge.image} alt="" aria-hidden="true" className="h-[31px] w-[88px] object-cover" />
                ) : (
                  <>
                    <span className="block text-[10px] font-semibold leading-none text-sky-100">{badge.label}</span>
                    <span className="block font-mono text-[8px] uppercase leading-none tracking-[0.14em] text-slate-500">
                      {badge.note}
                    </span>
                  </>
                )}
              </a>
            ),
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[9px] leading-none">
          <a
            href="https://webring.dinhe.net/prev/https://takasaki.moe"
            target="_blank"
            rel="noreferrer"
            className="text-sky-200/75 transition hover:text-sky-100"
          >
            &lt;- Previous
          </a>
          <a
            href="https://webring.dinhe.net/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold tracking-[0.08em] text-slate-300 transition hover:text-white"
          >
            RETRONAUT WEBRING
          </a>
          <a
            href="https://webring.dinhe.net/next/https://takasaki.moe"
            target="_blank"
            rel="noreferrer"
            className="text-sky-200/75 transition hover:text-sky-100"
          >
            Next -&gt;
          </a>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[9px] leading-none">
          <a
            href="https://foxr.ing/prev?from=https%3A%2F%2Ftakasaki.moe"
            target="_blank"
            rel="noreferrer"
            className="text-orange-100/75 transition hover:text-orange-100"
          >
            ← Prev
          </a>
          <a
            href="https://foxr.ing"
            target="_blank"
            rel="noreferrer"
            className="font-semibold tracking-[0.08em] text-slate-300 transition hover:text-white"
          >
            🦊 Foxring
          </a>
          <a
            href="https://foxr.ing/next?from=https%3A%2F%2Ftakasaki.moe"
            target="_blank"
            rel="noreferrer"
            className="text-orange-100/75 transition hover:text-orange-100"
          >
            Next →
          </a>
        </div>
      </section>
    </AnimatedCard>
  )
}

function ShoutboxOfflineState() {
  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-white/5 bg-[#0d1019] px-6 py-6 text-center">
      <div className="flex flex-col items-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-100/75">
          NO SIGNAL
        </p>
        <svg
          viewBox="0 0 160 120"
          role="img"
          aria-label="Offline terminal"
          className="my-3 h-28 w-auto max-w-full drop-shadow-2xl"
        >
          <rect x="22" y="18" width="116" height="78" rx="12" fill="#101826" stroke="#314052" strokeWidth="4" />
          <rect x="34" y="30" width="92" height="42" rx="4" fill="#06101d" />
          <path d="M45 50h22M75 50h10M94 50h20" stroke="#7dd3fc" strokeWidth="5" strokeLinecap="round" />
          <path d="M53 83h54" stroke="#263445" strokeWidth="7" strokeLinecap="round" />
          <path d="M62 104h36" stroke="#314052" strokeWidth="7" strokeLinecap="round" />
          <path d="M101 41l16 18M117 41l-16 18" stroke="#fda4af" strokeWidth="6" strokeLinecap="round" />
          <path d="M19 28l8 8M139 84l8 8M132 24l10-6" stroke="#c084fc" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
          SHOUTBOX OFFLINE. BRB..
        </p>
      </div>
    </div>
  )
}

function Shoutbox({ clientId }) {
  const [adminCode, setAdminCode] = useState(getSavedAdminCode)
  const [showAdminControl, setShowAdminControl] = useState(false)
  const [shouts, setShouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [nameColor, setNameColor] = useState(getRandomNicknameColor)
  const [message, setMessage] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})
  const isAdmin = Boolean(adminCode)
  const isOffline = error === 'shoutbox offline'

  useEffect(() => {
    function updateAdminControl(event) {
      setShowAdminControl(event.ctrlKey && event.altKey && event.shiftKey)
    }

    function hideAdminControl() {
      setShowAdminControl(false)
    }

    window.addEventListener('keydown', updateAdminControl)
    window.addEventListener('keyup', updateAdminControl)
    window.addEventListener('blur', hideAdminControl)

    return () => {
      window.removeEventListener('keydown', updateAdminControl)
      window.removeEventListener('keyup', updateAdminControl)
      window.removeEventListener('blur', hideAdminControl)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadShouts() {
      try {
        const response = await fetch('/api/shouts', {
          headers: {
            'X-Client-Id': clientId,
          },
        })

        if (!response.ok) {
          throw new Error('failed to load shouts')
        }

        const data = await response.json()

        if (!cancelled) {
          setShouts(Array.isArray(data.shouts) ? data.shouts : [])
          setError('')
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError('shoutbox offline')
          setLoading(false)
        }
      }
    }

    loadShouts()
    const timerId = window.setInterval(loadShouts, 5000)

    return () => {
      cancelled = true
      window.clearInterval(timerId)
    }
  }, [clientId])

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedMessage = message.trim()
    const trimmedName = name.trim()

    if (!trimmedMessage) {
      return
    }

    try {
      const response = await fetch('/api/shouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId,
        },
        body: JSON.stringify({
          name: trimmedName,
          website,
          nameColor,
          text: trimmedMessage,
        }),
      })

      if (!response.ok) {
        throw new Error('failed to send shout')
      }

      const data = await response.json()
      setShouts((currentShouts) => [data.shout, ...currentShouts].slice(0, 50))
      setMessage('')
      setNameColor(getRandomNicknameColor())
      setError('')
    } catch {
      setError('send failed')
    }
  }

  async function handleAdminToggle() {
    if (isAdmin) {
      window.sessionStorage.removeItem(shoutboxAdminSessionKey)
      setAdminCode('')
      return
    }

    const enteredAdminCode = window.prompt('admin code')

    if (!enteredAdminCode) {
      return
    }

    try {
      const response = await fetch('/api/admin/check', {
        method: 'POST',
        headers: {
          'X-Admin-Code': enteredAdminCode,
        },
      })

      if (!response.ok) {
        setError('bad admin code')
        return
      }

      window.sessionStorage.setItem(shoutboxAdminSessionKey, enteredAdminCode)
      setAdminCode(enteredAdminCode)
      setError('')
    } catch {
      setError('admin check failed')
    }
  }

  async function handleDelete(shoutId) {
    try {
      const response = await fetch(`/api/shouts/${encodeURIComponent(shoutId)}`, {
        method: 'DELETE',
        headers: {
          'X-Client-Id': clientId,
          ...(adminCode ? { 'X-Admin-Code': adminCode } : {}),
        },
      })

      if (response.status === 403) {
        window.sessionStorage.removeItem(shoutboxAdminSessionKey)
        setAdminCode('')
        setError('delete forbidden')
        return
      }

      if (!response.ok && response.status !== 204) {
        throw new Error('delete failed')
      }

      setShouts((currentShouts) => currentShouts.filter((shout) => shout.id !== shoutId))
      setError('')
    } catch {
      setError('delete failed')
    }
  }

  async function handleReplySubmit(event, shoutId) {
    event.preventDefault()

    const text = (replyDrafts[shoutId] || '').trim()

    if (!text || !adminCode) {
      return
    }

    try {
      const response = await fetch(`/api/shouts/${encodeURIComponent(shoutId)}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId,
          'X-Admin-Code': adminCode,
        },
        body: JSON.stringify({ text }),
      })

      if (response.status === 403) {
        window.sessionStorage.removeItem(shoutboxAdminSessionKey)
        setAdminCode('')
        setError('reply forbidden')
        return
      }

      if (!response.ok) {
        throw new Error('reply failed')
      }

      const data = await response.json()
      setShouts((currentShouts) =>
        currentShouts.map((shout) => (shout.id === shoutId ? data.shout : shout)),
      )
      setReplyDrafts((currentDrafts) => ({ ...currentDrafts, [shoutId]: '' }))
      setError('')
    } catch {
      setError('reply failed')
    }
  }

  async function handleReaction(shoutId, reaction) {
    try {
      const response = await fetch(`/api/shouts/${encodeURIComponent(shoutId)}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId,
        },
        body: JSON.stringify({ reaction }),
      })

      if (!response.ok) {
        throw new Error('reaction failed')
      }

      const data = await response.json()
      setShouts((currentShouts) =>
        currentShouts.map((shout) => (shout.id === shoutId ? data.shout : shout)),
      )
      setError('')
    } catch {
      setError('reaction failed')
    }
  }

  return (
    <aside className="rounded-[22px] border border-white/10 bg-[#11131d] p-4 shadow-2xl shadow-black/40">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100/80">
          shoutbox
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-500">{shouts.length}/50</span>
          {showAdminControl ? (
            <button
              type="button"
              aria-label={isAdmin ? 'Lock admin mode' : 'Unlock admin mode'}
              title={isAdmin ? 'admin on' : 'admin'}
              onClick={handleAdminToggle}
              className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300/80 ${
                isAdmin
                  ? 'border-sky-200/50 bg-sky-300/15 text-sky-100'
                  : 'border-white/10 text-slate-500 hover:bg-white/10 hover:text-sky-100'
              }`}
            >
              <FaKey aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)] md:items-start">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">nickname</span>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  aria-label="Name"
                  value={name}
                  maxLength={40}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="your name"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#0d1019] px-3 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/70"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-slate-600">
                  {name.length}/40
                </span>
              </div>
              <label className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#0d1019] p-1 outline-none transition focus-within:border-sky-300/70">
                <span className="sr-only">Nickname color</span>
                <input
                  aria-label="Nickname color"
                  type="color"
                  value={nameColor}
                  onChange={(event) => setNameColor(event.target.value)}
                  className="h-full w-full cursor-pointer rounded-lg border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">
              personal website <span className="font-normal text-slate-600">optional</span>
            </span>
            <div className="relative">
              <input
                aria-label="Personal website"
                value={website}
                maxLength={80}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://"
                className="h-10 w-full rounded-xl border border-white/10 bg-[#0d1019] px-3 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/70"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-slate-600">
                {website.length}/80
              </span>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">message</span>
            <div className="relative">
              <textarea
                aria-label="Message"
                value={message}
                maxLength={400}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Say somthing if u want to say something :3"
                className="h-28 w-full resize-none rounded-xl border border-white/10 bg-[#0d1019] px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/70"
              />
              <span className="pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] text-slate-600">
                {message.length}/400
              </span>
            </div>
          </label>

          <button
            type="submit"
            aria-label="Send shout"
            disabled={!message.trim()}
            className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-sky-300/10 text-sky-100 outline-none transition hover:border-sky-200/50 hover:bg-sky-300/20 focus-visible:ring-2 focus-visible:ring-sky-300/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FaPaperPlane aria-hidden="true" />
          </button>

          {error && !isOffline ? <p className="text-xs text-rose-200">{error}</p> : null}
        </form>

        <div className="shoutbox-scroll max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {loading ? <p className="px-1 text-xs text-slate-500">loading...</p> : null}
          {!loading && isOffline ? <ShoutboxOfflineState /> : null}
          {!loading && !error && shouts.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-xl border border-white/5 bg-[#0d1019] px-6 py-6 text-center">
              <div className="flex flex-col items-center">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100/75">
                  SO KUL
                </p>
                <img
                  src={dogeEmpty}
                  alt="Doge"
                  className="my-2 max-h-32 w-auto max-w-full object-contain drop-shadow-2xl"
                />
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  SO EMPTY. WOW..
                </p>
              </div>
            </div>
          ) : null}
          {shouts.map((shout) => {
            const canDelete = isAdmin || shout.owned
            const nameNode = shout.website ? (
              <a
                href={shout.website}
                target="_blank"
                rel="noreferrer"
                className="truncate font-semibold underline-offset-2 hover:underline"
                style={{ color: shout.nameColor }}
              >
                {shout.name}
              </a>
            ) : (
              <span className="truncate font-semibold" style={{ color: shout.nameColor }}>
                {shout.name}
              </span>
            )

            return (
              <article key={shout.id} className="rounded-xl border border-white/5 bg-[#0d1019] px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="shrink-0 font-mono text-xs text-slate-500">#{shout.number}</span>
                    {nameNode}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <time className="font-mono text-[10px] text-slate-500">
                      {formatShoutDate(shout.timestamp)}
                    </time>
                    {canDelete ? (
                      <button
                        type="button"
                        aria-label={`Delete shout from ${shout.name}`}
                        onClick={() => handleDelete(shout.id)}
                        className="grid h-5 w-5 place-items-center rounded-full text-[10px] text-slate-500 outline-none transition hover:bg-white/10 hover:text-rose-200 focus-visible:ring-2 focus-visible:ring-sky-300/80"
                      >
                        <FaTimes aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="break-words text-sm leading-6 text-slate-200">{shout.text}</p>

                {shout.replies?.length ? (
                  <div className="mt-3 space-y-2 border-l border-sky-200/20 pl-3">
                    {shout.replies.map((reply) => (
                      <div key={reply.id} className="rounded-lg bg-sky-300/[0.055] px-3 py-2">
                        <div className="mb-1">
                          <span className="text-xs font-semibold text-sky-100">reply</span>
                        </div>
                        <p className="break-words text-xs leading-5 text-slate-300">{reply.text}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {reactionOptions.map(({ value, label, icon }) => {
                    const count = shout.reactions?.[value] || 0
                    const active = shout.reacted?.includes(value)

                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`React ${label} to shout from ${shout.name}`}
                        title={label}
                        onClick={() => handleReaction(shout.id, value)}
                        className={`inline-flex h-8 min-w-10 items-center justify-center gap-1.5 rounded-full border px-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-sky-300/80 ${
                          active
                            ? 'border-sky-200/50 bg-sky-300/15 text-sky-50'
                            : 'border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <img src={icon} alt="" aria-hidden="true" className="h-4 w-4" />
                        {count > 0 ? <span className="font-mono text-[10px]">{count}</span> : null}
                      </button>
                    )
                  })}
                </div>

                {isAdmin ? (
                  <form className="mt-3 flex gap-2" onSubmit={(event) => handleReplySubmit(event, shout.id)}>
                    <input
                      aria-label={`Admin reply to ${shout.name}`}
                      value={replyDrafts[shout.id] || ''}
                      maxLength={240}
                      onChange={(event) =>
                        setReplyDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [shout.id]: event.target.value,
                        }))
                      }
                      placeholder="admin reply"
                      className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#090b12] px-2 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/70"
                    />
                    <button
                      type="submit"
                      aria-label={`Send admin reply to ${shout.name}`}
                      disabled={!(replyDrafts[shout.id] || '').trim()}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-sky-300/10 text-sky-100 outline-none transition hover:border-sky-200/50 hover:bg-sky-300/20 focus-visible:ring-2 focus-visible:ring-sky-300/80 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FaPaperPlane aria-hidden="true" />
                    </button>
                  </form>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

export default function CardLanding() {
  const [clientId] = useState(getShoutboxClientId)
  const [verified, setVerified] = useState(!siteKey)
  const age = usePreciseAge()
  const animatedRole = useTypewriter(roles)

  return (
    <main className="relative min-h-dvh w-full overflow-x-hidden bg-[#090a10] text-white">
      <video
        className="site-background-video"
        src="/hoshino-falling-blue-archive-moewalls-com.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="site-background-overlay" aria-hidden="true" />
      <div className="card-shell relative z-10 flex min-h-dvh items-center justify-center px-5 py-5">
        {!verified ? (
          <div className="mx-auto flex max-w-[560px] flex-col items-center gap-5 rounded-[26px] border border-white/10 bg-[#11131d]/95 px-8 py-7 text-center shadow-2xl shadow-black/50 backdrop-blur-xl">
            <p className="max-w-[440px] text-sm leading-7 text-slate-300 sm:text-[15px]">
              Internet nowadays is an evil place, full of robots.. Stay here, let clawdfrawe
              tuwnstiwe check you aren't one :3
            </p>
            <Turnstile
              sitekey={siteKey}
              onVerify={() => setVerified(true)}
              theme="dark"
              options={{
                size: 'invisible',
                action: 'view_card',
              }}
            />
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-2">
            <AnimatedCard
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="animated-gradient-border w-full max-w-[780px] rounded-[28px]"
            >
              <section
                id="profile"
                className="relative z-10 grid gap-7 rounded-[26px] border border-white/10 bg-[#11131d] p-7 shadow-2xl shadow-black/50 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-8"
              >
                <div className="text-center sm:border-r sm:border-white/10 sm:pr-8">
                  <div className="mx-auto mb-5 h-28 w-28 overflow-hidden rounded-full border border-white/15 bg-white/5 p-1 shadow-lg shadow-black/40">
                    <img
                      src="https://i.pinimg.com/736x/72/24/17/722417622b70cf4501445db69a0811fe.jpg"
                      alt="Avatar"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>

                  <h1 className="text-3xl font-semibold leading-none text-white">高崎</h1>

                  <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Profile links">
                    {profileLinks.map(({ href, label, icon, accent }) => (
                      <a
                        key={label}
                        href={href}
                        aria-label={label}
                        target={href.startsWith('http') ? '_blank' : undefined}
                        rel={href.startsWith('http') ? 'noreferrer' : undefined}
                        className={`grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-lg text-slate-300 outline-none transition duration-200 ${accent} hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-sky-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#11131d]`}
                      >
                        {icon}
                      </a>
                    ))}
                  </nav>
                </div>

                <div className="min-w-0 space-y-3 text-left text-sm leading-6 text-slate-300 sm:text-[15px]">
                  <p>
                    Hi, i am <span className="font-medium text-white">高崎</span>.
                  </p>
                  <p>
                    You may know me as <span className="text-sky-100">kuro</span>,{' '}
                    <span className="text-sky-100">kurosa</span>,{' '}
                    <span className="text-sky-100">hayatotk</span>,{' '}
                    <span className="text-sky-100">kuroneko</span>.
                  </p>
                  <p className="min-h-12 sm:min-h-6">
                    I am <span className="typewriter text-white">{animatedRole}</span>
                  </p>
                  <p>
                    I am <span className="font-mono text-sky-100">{age}</span> y.o.
                  </p>
                  <p>
                    Current location: somewhere in{' '}
                    <a
                      href="https://bgp.tools/as/24940"
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-mono text-sky-100 underline-offset-2 hover:underline"
                    >
                      AS24940
                    </a>{' '}
                  </p>
                </div>
              </section>
            </AnimatedCard>

            <NowListening />

            <AnimatedCard
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
              className="animated-gradient-border w-full max-w-[780px] rounded-[24px]"
            >
              <div className="rounded-[22px]">
                <Shoutbox clientId={clientId} />
              </div>
            </AnimatedCard>

            <BadgeWall />

            <SiteFooter clientId={clientId} />
          </div>
        )}
      </div>
    </main>
  )
}
