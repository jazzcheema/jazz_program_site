'use client'

import { useEffect, useRef, useState } from 'react'

const ABOUT =
  'I build full-stack systems with a strong focus on 3D interactive software and cinematic digital experiences. Drawing on a background in film directing and editing, I approach software as a medium for storytelling-- building interfaces that pull users into an experience rather than presenting them with one. I\'m particularly interested in mobile; I\'ve led the end-to-end migration and modernisation of a 15k+ user application as the sole mobile engineer.'

const EXPERIENCE = [
  {
    role: 'Software Engineer',
    company: 'Krate',
    type: 'Freelance',
    period: 'Aug 2024 – Present',
    detail: 'Migrating a 15k+ user social music platform from React Native to Expo Router with Firebase and New Architecture. Implemented new features and modernised the app with haptics. Full ownership of mobile architecture, auth flows, and real-time data layer.',
  },
  {
    role: 'Full Stack Engineer',
    company: 'The Offer Haus',
    type: 'Internship · Stealth',
    period: 'Apr – May 2024',
    detail: 'Built the full product UI from scratch. Next.js, TypeScript, Tailwind CSS, Sentry, PostHog.',
  },
  {
    role: 'Senior Video Editor',
    company: 'Partners & Spade',
    type: 'Contract',
    period: 'Nov 2021 – Mar 2022',
    detail: '"Be You, No One Else Can" for Schick — directed by Mike Mills. 4M+ views. End-to-end post-production on a national broadcast spot.',
  },
  {
    role: 'Video Editor',
    company: 'RCA Commercial Electronics',
    type: 'Contract',
    period: 'Dec 2022 – Jan 2023',
    detail: 'Commercial post-production for consumer electronics campaigns.',
  },
]

const EDUCATION = [
  { institution: 'Rithm School', degree: 'Full Stack Software Development', period: 'Jan – Jun 2024' },
  { institution: 'London Film School', degree: 'MA · Film / Cinema / Video Studies', period: '2017 – 2021' },
  { institution: 'Cal State Long Beach', degree: 'BA · English Literature & Creative Writing', period: '' },
]

const AWARDS = [
  { title: 'Best Short Film', event: 'London Short Film Festival', year: '2024' },
]

const CREDITS = [
  { name: 'Jazz Cheema', role: 'Program & Software', detail: 'Three.js · Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · WebGL' },
  { name: 'Kevin Netteberg', role: '3D Models', detail: 'Genie · Lamp · Carpet · Krate' },
]

// ---------- Dot-grid canvas ----------

const COLS = 54
const ROWS = 20
const SPACING = 21
const REPULSE_R = 100
const REPULSE_F = 9
const SPRING    = 0.036
const DAMPING   = 0.84

function DotCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Normalized 0-1 for waveform phase/amplitude
  const waveMouseRef = useRef({ x: 0.5, y: 0.5 })
  // Canvas-pixel coords for particle repulsion
  const canvasMouseRef = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      waveMouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }
      const canvas = canvasRef.current
      if (canvas) {
        const r = canvas.getBoundingClientRect()
        canvasMouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const N = COLS * ROWS
    const px = new Float32Array(N)
    const py = new Float32Array(N)
    const vx = new Float32Array(N)
    const vy = new Float32Array(N)
    let ready = false

    let animId: number
    let tick = 0
    let smX = 0.5, smY = 0.5

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
      ready = false
    }
    resize()
    window.addEventListener('resize', resize)

    const animate = () => {
      animId = requestAnimationFrame(animate)
      tick++
      const t = tick * 0.011

      smX += (waveMouseRef.current.x - smX) * 0.055
      smY += (waveMouseRef.current.y - smY) * 0.055

      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      const totalW = (COLS - 1) * SPACING
      const totalH = (ROWS - 1) * SPACING
      const startX = (W - totalW) / 2
      const startY = (H - totalH) / 2

      const amplitude = (smY * 0.7 + 0.15) * totalH * 0.42
      const phase     = smX * Math.PI * 2.8

      const mx = canvasMouseRef.current.x
      const my = canvasMouseRef.current.y

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const idx = row * COLS + col

          // Home = static grid position
          const homeX = startX + col * SPACING
          const homeY = startY + row * SPACING

          if (!ready) {
            px[idx] = homeX
            py[idx] = homeY
            vx[idx] = 0
            vy[idx] = 0
          }

          // Spring back to grid home
          vx[idx] += (homeX - px[idx]) * SPRING
          vy[idx] += (homeY - py[idx]) * SPRING

          // Mouse repulsion in canvas coords
          const ddx = px[idx] - mx
          const ddy = py[idx] - my
          const dd  = Math.hypot(ddx, ddy)
          if (dd < REPULSE_R && dd > 0.5) {
            const f = ((1 - dd / REPULSE_R) ** 1.6) * REPULSE_F
            vx[idx] += (ddx / dd) * f
            vy[idx] += (ddy / dd) * f
          }

          vx[idx] *= DAMPING
          vy[idx] *= DAMPING
          px[idx] += vx[idx]
          py[idx] += vy[idx]

          // Visual: wave proximity (based on grid home Y) + particle speed
          const xNorm  = col / (COLS - 1)
          const wave1  = Math.sin(xNorm * Math.PI * 2.2 + phase + t * 0.7) * amplitude
          const wave2  = Math.sin(xNorm * Math.PI * 4.8 + phase * 1.4 + t * 1.2) * amplitude * 0.18
          const wave3  = Math.sin(xNorm * Math.PI * 0.9 + t * 0.35) * amplitude * 0.12
          const waveY  = startY + (ROWS / 2) * SPACING + wave1 + wave2 + wave3
          const wProx  = Math.max(0, 1 - Math.abs(homeY - waveY) / (SPACING * 2.6)) ** 2

          const speed  = Math.hypot(vx[idx], vy[idx])
          const sFact  = Math.min(1, speed / 2.8)
          const excite = Math.max(wProx, sFact * 0.95)

          const r = 1.8 + excite * 5.2

          if (excite > 0.55) {
            const a = Math.min(1, (excite - 0.55) / 0.45)
            ctx.fillStyle = `rgba(${Math.round(180 + a * 20)},${Math.round(100 - a * 50)},${Math.round(20 + a * 8)},${0.55 + a * 0.45})`
          } else if (excite > 0.1) {
            const a = (excite - 0.1) / 0.45
            ctx.fillStyle = `rgba(80,60,20,${0.18 + a * 0.38})`
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.13)'
          }

          ctx.beginPath()
          ctx.arc(px[idx], py[idx], r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ready = true
    }

    animate()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

// ---------- Page ----------

export default function CVPage() {
  const [visible, setVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const prevBody = document.body.style.background
    const prevHtml = document.documentElement.style.background
    document.body.style.background = '#e2deda'
    document.documentElement.style.background = '#e2deda'
    return () => {
      document.body.style.background = prevBody
      document.documentElement.style.background = prevHtml
    }
  }, [])

  const handleScroll = () => {
    setScrolled((scrollRef.current?.scrollTop ?? 0) > 52)
  }

  const scrollToSection = (id: string) => {
    const container = scrollRef.current
    const target = document.getElementById(id)
    if (!container || !target) return
    const start = container.scrollTop
    const end = target.getBoundingClientRect().top - container.getBoundingClientRect().top + start - 72
    const duration = 1100
    const t0 = performance.now()
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      container.scrollTop = start + (end - start) * ease(p)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#e2deda',
        overflowY: 'auto',
        fontFamily: 'var(--font-geist-mono)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms ease',
      }}
    >
      <style>{`
        @keyframes cv-rise {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cv-rise { opacity: 0; animation: cv-rise 560ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        .cv-exp-row {
          padding: 1.4rem 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem 2rem;
        }
        @media (max-width: 640px) {
          .cv-exp-row { grid-template-columns: 1fr; }
        }

        .cv-nav-contact {
          position: relative;
          overflow: hidden;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          color: #f5f2ee;
          text-decoration: none;
          background: #1a1a1a;
          border-radius: 999px;
          padding: 0.38rem 1.1rem;
          transition: background 140ms ease, color 140ms ease;
        }
        .cv-nav-contact:hover, .cv-nav-contact:focus-visible {
          background: #e2deda;
          color: #1a1a1a;
          outline: none;
        }
        .cv-nav-contact-default,
        .cv-nav-contact-reveal {
          display: block;
          transition: opacity 130ms ease, transform 130ms ease;
        }
        .cv-nav-contact-reveal {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(0.3rem);
        }
        .cv-nav-contact:hover .cv-nav-contact-default,
        .cv-nav-contact:focus-visible .cv-nav-contact-default {
          opacity: 0;
          transform: translateY(-0.3rem);
        }
        .cv-nav-contact:hover .cv-nav-contact-reveal,
        .cv-nav-contact:focus-visible .cv-nav-contact-reveal {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Nav — flat bar at top, condenses to floating pill on scroll */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          padding: scrolled ? '10px 12px' : '0',
          transition: 'padding 380ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: scrolled ? 'min(34rem, calc(100vw - 32px))' : '100%',
            background: scrolled
              ? 'rgba(200, 194, 186, 0.46)'
              : '#e2deda',
            backdropFilter: scrolled ? 'blur(22px) saturate(160%)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(22px) saturate(160%)' : 'none',
            border: scrolled ? '1px solid rgba(0,0,0,0.09)' : 'none',
            borderBottom: scrolled ? 'none' : '1px solid rgba(0,0,0,0.09)',
            borderRadius: scrolled ? 20 : 0,
            padding: scrolled ? '0.9rem 1.8rem' : '0.78rem 2rem',
            boxShadow: scrolled ? '0 2px 18px rgba(0,0,0,0.08)' : 'none',
            transition: [
              'border-radius 380ms cubic-bezier(0.16, 1, 0.3, 1)',
              'background 260ms ease',
              'box-shadow 260ms ease',
              'padding 380ms cubic-bezier(0.16, 1, 0.3, 1)',
              'max-width 380ms cubic-bezier(0.16, 1, 0.3, 1)',
            ].join(', '),
          }}
        >
          <button
            onClick={() => window.location.reload()}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.88rem', letterSpacing: '0.18em', color: '#1a1a1a', fontWeight: 700, fontFamily: 'var(--font-geist-mono)' }}
          >
            J · C
          </button>
          <div style={{ display: 'flex', gap: '1.6rem', alignItems: 'center' }}>
            <button onClick={() => scrollToSection('experience')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.88rem', letterSpacing: '0.06em', color: '#5a5550', fontFamily: 'var(--font-geist-mono)' }}>Experience</button>
            <button onClick={() => scrollToSection('credits')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.88rem', letterSpacing: '0.06em', color: '#5a5550', fontFamily: 'var(--font-geist-mono)' }}>Credits</button>
            <a href="mailto:thecyberfoolz@gmail.com" className="cv-nav-contact">
              <span className="cv-nav-contact-default">Contact</span>
              <span className="cv-nav-contact-reveal">Email</span>
            </a>
          </div>
        </nav>
      </div>

      {/* Hero header */}
      <div
        className="cv-rise"
        style={{
          animationDelay: '80ms',
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '2.8rem 2rem 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.22em', color: '#9a9590', marginBottom: '0.9rem', textTransform: 'uppercase' }}>
            Portfolio
          </div>
          <h1 style={{ fontSize: 'clamp(3.8rem, 9.5vw, 8rem)', fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 0.88, color: '#18181a', margin: 0 }}>
            Jazz<br />Cheema
          </h1>
        </div>
        <p style={{ fontSize: 'clamp(0.72rem, 1.1vw, 0.82rem)', letterSpacing: '0.14em', color: '#8a8580', paddingBottom: '0.5rem', margin: 0 }}>
          Software Engineer · Full Stack
        </p>
      </div>

      {/* DOT GRID — centerpiece */}
      <div
        className="cv-rise"
        style={{
          animationDelay: '180ms',
          width: '100%',
          height: 'clamp(260px, 38vh, 420px)',
          margin: '2.4rem 0 0',
          cursor: 'crosshair',
        }}
      >
        <DotCanvas />
      </div>

      {/* About / Interests */}
      <div
        className="cv-rise"
        style={{
          animationDelay: '300ms',
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '2.6rem 2rem 0',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'min(10rem, 28%) 1fr', gap: '0 2.5rem', alignItems: 'start' }}>
          <div style={{ fontSize: '0.56rem', letterSpacing: '0.22em', color: '#aaa59f', textTransform: 'uppercase', paddingTop: '0.18rem' }}>
            About
          </div>
          <p style={{ fontSize: 'clamp(0.8rem, 1.15vw, 0.96rem)', lineHeight: 1.68, color: '#3a3530', margin: 0, letterSpacing: '0.01em' }}>
            {ABOUT}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '3.5rem 2rem 7rem' }}>

        {/* Experience */}
        <Section label="Experience" id="experience" delay={380}>
          {EXPERIENCE.map((job, i) => (
            <div
              key={i}
              className="cv-rise cv-exp-row"
              style={{ animationDelay: `${460 + i * 70}ms` }}
            >
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#18181a', marginBottom: '0.3rem', letterSpacing: '0.01em' }}>
                  {job.role}
                </div>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', color: '#9a9590' }}>
                  {job.company} · {job.type}
                </div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '0.08em', color: '#b5b0aa', marginTop: '0.15rem' }}>
                  {job.period}
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', lineHeight: 1.68, color: '#5a5550', letterSpacing: '0.01em' }}>
                {job.detail}
              </div>
            </div>
          ))}
        </Section>

        {/* Awards */}
        <Section label="Awards" delay={740}>
          {AWARDS.map((award, i) => (
            <div
              key={i}
              className="cv-rise"
              style={{
                animationDelay: `${800 + i * 60}ms`,
                padding: '1.2rem 0',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.52rem', letterSpacing: '0.1em', background: '#c87820', color: '#fff', borderRadius: 4, padding: '0.18rem 0.52rem', flexShrink: 0 }}>
                  AWARD
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#18181a', letterSpacing: '0.01em' }}>{award.title}</span>
                <span style={{ fontSize: '0.64rem', letterSpacing: '0.08em', color: '#9a9590' }}>{award.event}</span>
              </div>
              <span style={{ fontSize: '0.62rem', letterSpacing: '0.1em', color: '#b5b0aa' }}>{award.year}</span>
            </div>
          ))}
        </Section>

        {/* Education */}
        <Section label="Education" delay={860}>
          {EDUCATION.map((edu, i) => (
            <div
              key={i}
              className="cv-rise"
              style={{
                animationDelay: `${920 + i * 55}ms`,
                padding: '1.1rem 0',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 500, color: '#18181a', letterSpacing: '0.01em' }}>{edu.institution}</div>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em', color: '#9a9590', marginTop: '0.18rem' }}>{edu.degree}</div>
              </div>
              {edu.period && (
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', color: '#b5b0aa', flexShrink: 0 }}>{edu.period}</div>
              )}
            </div>
          ))}
        </Section>

        {/* Credits */}
        <Section label="Credits" id="credits" delay={1060}>
          <div
            className="cv-rise"
            style={{
              animationDelay: '1100ms',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.07)',
            }}
          >
            {CREDITS.map((credit, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem 2.5rem',
                  padding: '1.3rem 1.6rem',
                  borderBottom: i < CREDITS.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ minWidth: '9rem' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#18181a', letterSpacing: '0.01em' }}>{credit.name}</div>
                  <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', color: '#9a9590', marginTop: '0.18rem' }}>{credit.role}</div>
                </div>
                <div style={{ fontSize: '0.68rem', lineHeight: 1.65, color: '#5a5550', letterSpacing: '0.01em', flex: 1, minWidth: '12rem' }}>
                  {credit.detail}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div
          className="cv-rise"
          style={{
            animationDelay: '1180ms',
            marginTop: '3.5rem',
            paddingTop: '1.4rem',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.56rem', letterSpacing: '0.12em', color: '#aaa59f' }}>© 2026 Jazz Cheema · Ver.01.09.26</span>
          <span style={{ fontSize: '0.56rem', letterSpacing: '0.12em', color: '#bbb6b0' }}>Built with Three.js · Next.js · React</span>
        </div>

      </div>
    </div>
  )
}

function Section({ label, id, delay = 0, children }: { label: string; id?: string; delay?: number; children: React.ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: '3rem' }}>
      <div
        className="cv-rise"
        style={{
          animationDelay: `${delay}ms`,
          fontSize: '0.54rem',
          letterSpacing: '0.26em',
          color: '#aaa59f',
          textTransform: 'uppercase',
          marginBottom: '0',
          paddingBottom: '0.7rem',
          borderBottom: '1px solid rgba(0,0,0,0.14)',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
