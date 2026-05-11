import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MarketingNav    from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'

// ── Pricing data ───────────────────────────────────────────────────────────────

type BillingCycle = 'monthly' | 'annual'

interface Plan {
  id:        string
  name:      string
  price:     { monthly: number; annual: number }
  tagline:   string
  cta:       string
  highlight: boolean
  features:  string[]
}

const PLANS: Plan[] = [
  {
    id:      'free',
    name:    'Free',
    price:   { monthly: 0, annual: 0 },
    tagline: 'Try the editor with no commitment.',
    cta:     'Start free',
    highlight: false,
    features: [
      '3 saved projects',
      'Satin, fill & run stitch tools',
      'DST & PES export',
      'Basic embroidery lettering',
      '130×180 mm hoop',
      'Community support',
    ],
  },
  {
    id:      'creator',
    name:    'Creator',
    price:   { monthly: 19, annual: 15 },
    tagline: 'Everything you need for serious work.',
    cta:     'Start Creator trial',
    highlight: true,
    features: [
      'Unlimited projects',
      'All stitch tools',
      'All hoop sizes',
      'Full embroidery lettering engine',
      'Custom font upload',
      'Cloud project sync',
      'Autosave & version history',
      'Priority export',
      'Email support',
    ],
  },
  {
    id:      'professional',
    name:    'Professional',
    price:   { monthly: 49, annual: 39 },
    tagline: 'For studios and commercial production.',
    cta:     'Start Professional trial',
    highlight: false,
    features: [
      'Everything in Creator',
      'Commercial usage rights',
      'Advanced underlay options',
      'Pull compensation profiles',
      'Batch export',
      'API access',
      'Priority rendering queue',
      'Team seat sharing',
      'Dedicated support',
    ],
  },
]

// ── Feature matrix ─────────────────────────────────────────────────────────────

const MATRIX_ROWS: { label: string; free: string | boolean; creator: string | boolean; pro: string | boolean }[] = [
  { label: 'Saved projects',         free: '3',          creator: 'Unlimited',   pro: 'Unlimited'    },
  { label: 'Satin fill',             free: true,         creator: true,          pro: true           },
  { label: 'Tatami fill',            free: true,         creator: true,          pro: true           },
  { label: 'Run stitch',             free: true,         creator: true,          pro: true           },
  { label: 'Satin column',           free: true,         creator: true,          pro: true           },
  { label: 'Bézier node editing',    free: true,         creator: true,          pro: true           },
  { label: 'Embroidery lettering',   free: 'Basic',      creator: 'Full',        pro: 'Full'         },
  { label: 'Custom fonts',           free: false,        creator: true,          pro: true           },
  { label: 'DST / PES export',       free: true,         creator: true,          pro: true           },
  { label: 'Hoop sizes',             free: '130×180',    creator: 'All sizes',   pro: 'All sizes'    },
  { label: 'Cloud save & sync',      free: false,        creator: true,          pro: true           },
  { label: 'Autosave',               free: false,        creator: true,          pro: true           },
  { label: 'Version history',        free: false,        creator: '30 days',     pro: 'Unlimited'    },
  { label: 'Commercial usage',       free: false,        creator: false,         pro: true           },
  { label: 'API access',             free: false,        creator: false,         pro: true           },
  { label: 'Team seats',             free: false,        creator: false,         pro: '5 seats'      },
  { label: 'Priority support',       free: false,        creator: 'Email',       pro: 'Dedicated'    },
]

// ── FAQ data ───────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'What embroidery file formats does StitchLab export?',
    a: 'Currently DST (Tajima) and PES (Brother) are supported. JEF (Janome), VP3 (Husqvarna), and HUS (Viking) are on the roadmap for 2025.',
  },
  {
    q: 'Does it work with my embroidery machine?',
    a: 'If your machine accepts DST or PES files — which covers the vast majority of commercial and home machines — yes. Check your machine\'s manual for supported formats.',
  },
  {
    q: 'Is there an offline mode?',
    a: 'The editor works without internet. Projects fall back to localStorage when the cloud is unreachable. You\'ll need a connection to sync changes across devices.',
  },
  {
    q: 'Can I use designs commercially on the Free plan?',
    a: 'Free and Creator plan designs are for personal use. Commercial usage rights — selling embroidered goods made from your StitchLab designs — requires the Professional plan.',
  },
  {
    q: 'How does cloud storage work?',
    a: 'Creator and Professional accounts sync project files to Supabase storage. Storage is currently 1 GB on Creator and 10 GB on Professional. Project thumbnails, stitch data, and vector geometry are all saved.',
  },
  {
    q: 'Will there be AI-assisted digitizing features?',
    a: 'Yes — automatic artwork-to-embroidery conversion is in active development. It will be available as part of the Creator and Professional plans when it launches.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel anytime from account settings. Your plan stays active until the end of the billing period, then reverts to Free. Your projects are retained.',
  },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function Check({ color = '#2d6a4f' }: { color?: string }) {
  return <span style={{ color, fontSize: 14, flexShrink: 0 }}>✓</span>
}

function Cross() {
  return <span style={{ color: '#d4d0cb', fontSize: 14, flexShrink: 0 }}>—</span>
}

function MatrixCell({ value }: { value: string | boolean }) {
  if (value === true)  return <Check />
  if (value === false) return <Cross />
  return <span style={{ fontSize: 12, color: '#4a4540', fontWeight: 500 }}>{value}</span>
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(26,23,20,0.08)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '20px 0',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: '#1a1714', letterSpacing: '-0.02em', lineHeight: 1.4 }}>{q}</span>
        <span style={{ fontSize: 18, color: '#6b6560', flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 14, color: '#6b6560', lineHeight: 1.7, paddingBottom: 20, letterSpacing: '-0.01em', marginTop: -4 }}>
          {a}
        </p>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const navigate = useNavigate()
  const [billing, setBilling] = useState<BillingCycle>('monthly')

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ed', fontFamily: '"Inter", system-ui, sans-serif', overflowX: 'hidden' }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '88px 40px 64px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', padding: '3px 12px', borderRadius: 100,
          background: '#2d6a4f14', border: '1px solid #2d6a4f33',
          fontSize: 11, fontWeight: 600, color: '#2d6a4f', letterSpacing: '0.06em',
          textTransform: 'uppercase', marginBottom: 18,
        }}>Pricing</div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 16, lineHeight: 1.06 }}>
          Simple, honest pricing
        </h1>
        <p style={{ fontSize: 18, color: '#6b6560', maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
          Start free. Upgrade when you're ready. No lock-in, no surprise fees.
        </p>

        {/* Billing toggle */}
        <div style={{
          display: 'inline-flex', background: '#fff',
          border: '1px solid rgba(26,23,20,0.12)', borderRadius: 10, padding: 4,
        }}>
          {(['monthly', 'annual'] as BillingCycle[]).map(cycle => (
            <button
              key={cycle}
              onClick={() => setBilling(cycle)}
              style={{
                padding: '7px 20px', borderRadius: 7, border: 'none',
                background: billing === cycle ? '#1a1714' : 'transparent',
                color: billing === cycle ? '#f5f2ed' : '#6b6560',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                letterSpacing: '-0.01em', transition: 'background 0.15s, color 0.15s',
              }}
            >
              {cycle === 'monthly' ? 'Monthly' : 'Annual'}
              {cycle === 'annual' && (
                <span style={{
                  marginLeft: 7, padding: '1px 7px', borderRadius: 100,
                  background: billing === 'annual' ? '#2d6a4f' : '#2d6a4f22',
                  color: billing === 'annual' ? '#fff' : '#2d6a4f',
                  fontSize: 10, fontWeight: 700,
                }}>–20%</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Plan cards */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '0 40px 96px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {PLANS.map(plan => {
            const price = plan.price[billing]
            return (
              <div
                key={plan.id}
                style={{
                  borderRadius: 16,
                  border: `1px solid ${plan.highlight ? '#2d6a4f' : 'rgba(26,23,20,0.1)'}`,
                  background: plan.highlight ? '#fff' : '#fafaf9',
                  padding: '32px 28px',
                  position: 'relative',
                  boxShadow: plan.highlight ? '0 8px 40px rgba(45,106,79,0.15), 0 2px 8px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: '#2d6a4f', color: '#fff',
                    padding: '3px 14px', borderRadius: 100,
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap',
                  }}>Most popular</div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1714', letterSpacing: '-0.02em', marginBottom: 6 }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: '#6b6560', letterSpacing: '-0.01em', marginBottom: 20 }}>{plan.tagline}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 40, fontWeight: 700, color: '#1a1714', letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span style={{ fontSize: 13, color: '#9c9590' }}>/mo</span>
                    )}
                  </div>
                  {price > 0 && billing === 'annual' && (
                    <div style={{ fontSize: 12, color: '#6b6560', marginTop: 4 }}>
                      Billed ${price * 12}/year
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate('/register')}
                  style={{
                    width: '100%', padding: '11px',
                    borderRadius: 9,
                    background: plan.highlight ? '#2d6a4f' : 'transparent',
                    border: `1px solid ${plan.highlight ? '#2d6a4f' : 'rgba(26,23,20,0.18)'}`,
                    fontSize: 13, fontWeight: 600,
                    color: plan.highlight ? '#fff' : '#1a1714',
                    cursor: 'pointer', letterSpacing: '-0.01em',
                    transition: 'background 0.12s',
                    marginBottom: 28,
                  }}
                  onMouseEnter={e => {
                    if (plan.highlight) e.currentTarget.style.background = '#245c43'
                    else e.currentTarget.style.background = 'rgba(26,23,20,0.05)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = plan.highlight ? '#2d6a4f' : 'transparent'
                  }}
                >
                  {plan.cta}
                </button>

                <div style={{ borderTop: '1px solid rgba(26,23,20,0.07)', paddingTop: 24, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9c9590', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
                    Includes
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <Check color={plan.highlight ? '#2d6a4f' : '#6b6560'} />
                        <span style={{ fontSize: 13, color: '#4a4540', lineHeight: 1.5, letterSpacing: '-0.01em' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Enterprise note */}
        <div style={{
          marginTop: 20, padding: '24px 28px',
          borderRadius: 14, background: '#1a1714',
          border: '1px solid #2e2a26',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f5f2ed', marginBottom: 4 }}>Enterprise</div>
            <div style={{ fontSize: 13, color: '#8c857c', letterSpacing: '-0.01em' }}>
              Team management, shared design libraries, API access, and custom billing. Available 2025.
            </div>
          </div>
          <button style={{
            padding: '9px 20px', borderRadius: 8,
            background: 'transparent', border: '1px solid #3a3630',
            fontSize: 13, color: '#8c857c', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>Contact sales →</button>
        </div>
      </section>

      {/* Feature matrix */}
      <section style={{ background: '#fff', borderTop: '1px solid rgba(26,23,20,0.07)', padding: '88px 40px' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 8 }}>
            Compare plans
          </h2>
          <p style={{ fontSize: 15, color: '#6b6560', marginBottom: 40 }}>
            A full feature breakdown across all tiers.
          </p>

          <div style={{ borderRadius: 12, border: '1px solid rgba(26,23,20,0.09)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              background: '#f8f6f3', borderBottom: '1px solid rgba(26,23,20,0.08)',
              padding: '14px 20px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9c9590', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Feature</div>
              {PLANS.map(p => (
                <div key={p.id} style={{ fontSize: 13, fontWeight: 700, color: p.highlight ? '#2d6a4f' : '#1a1714', textAlign: 'center', letterSpacing: '-0.02em' }}>
                  {p.name}
                </div>
              ))}
            </div>
            {/* Rows */}
            {MATRIX_ROWS.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  padding: '12px 20px',
                  background: i % 2 === 0 ? '#fff' : '#fdfcfb',
                  borderBottom: i < MATRIX_ROWS.length - 1 ? '1px solid rgba(26,23,20,0.05)' : 'none',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 13, color: '#4a4540', letterSpacing: '-0.01em' }}>{row.label}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}><MatrixCell value={row.free} /></div>
                <div style={{ display: 'flex', justifyContent: 'center' }}><MatrixCell value={row.creator} /></div>
                <div style={{ display: 'flex', justifyContent: 'center' }}><MatrixCell value={row.pro} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: '#f5f2ed', borderTop: '1px solid rgba(26,23,20,0.07)', padding: '88px 40px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 8 }}>
            Frequently asked
          </h2>
          <p style={{ fontSize: 15, color: '#6b6560', marginBottom: 40 }}>
            Everything you need to know before signing up.
          </p>
          <div>
            {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#1a1714', padding: '88px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f2ed', marginBottom: 14, lineHeight: 1.1 }}>
            Start with Free today
          </h2>
          <p style={{ fontSize: 16, color: '#8c857c', lineHeight: 1.65, marginBottom: 32 }}>
            No credit card. No install. Open the editor in your browser and start digitizing in minutes.
          </p>
          <button
            onClick={() => navigate('/register')}
            style={{
              padding: '13px 28px', borderRadius: 10, background: '#2d6a4f',
              border: 'none', fontSize: 15, fontWeight: 600, color: '#fff',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(45,106,79,0.45)',
              transition: 'transform 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            Create free account →
          </button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
