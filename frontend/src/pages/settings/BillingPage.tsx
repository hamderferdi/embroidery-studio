import React, { useState } from 'react'
import SettingsLayout, { SettingsSection, SettingsRow, SaveButton } from './SettingsLayout'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'For hobbyists and occasional use.',
    features: ['3 projects', '100 MB storage', 'Basic export formats', 'Community support'],
    color: '#9c9590',
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For professionals and growing studios.',
    features: ['Unlimited projects', '5 GB storage', 'All export formats', 'Priority support', 'Advanced stitch tools', 'Version history'],
    color: '#2d6a4f',
    badge: 'Most popular',
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$39',
    period: '/month',
    description: 'For teams and commercial studios.',
    features: ['Everything in Pro', '50 GB storage', 'Team collaboration', 'Custom thread palettes', 'Dedicated support', 'Early access features'],
    color: '#1a1714',
    badge: null,
  },
]

const INVOICES = [
  { id: 'INV-2026-04', date: 'Apr 1, 2026', amount: '$12.00', status: 'Paid' },
  { id: 'INV-2026-03', date: 'Mar 1, 2026', amount: '$12.00', status: 'Paid' },
  { id: 'INV-2026-02', date: 'Feb 1, 2026', amount: '$12.00', status: 'Paid' },
  { id: 'INV-2026-01', date: 'Jan 1, 2026', amount: '$12.00', status: 'Paid' },
]

export default function BillingPage() {
  const [currentPlan] = useState('pro')
  const [showCardForm, setShowCardForm] = useState(false)

  const usedStorage = 1.2   // GB
  const totalStorage = 5    // GB
  const usedProjects = 8
  const totalProjects = Infinity

  const storagePct = Math.round((usedStorage / totalStorage) * 100)

  return (
    <SettingsLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 24 }}>Billing</h1>

      {/* Current plan */}
      <SettingsSection title="Current plan" description="Your active subscription and billing cycle.">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid rgba(26,23,20,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 18 }}>◇</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 650, color: '#1a1714', letterSpacing: '-0.02em' }}>Pro plan</div>
              <div style={{ fontSize: 12, color: '#6b6560' }}>$12.00 / month · Renews May 1, 2026</div>
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 100,
            background: '#f0fdf4', color: '#16a34a',
            border: '1px solid #86efac',
          }}>Active</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            padding: '8px 16px', borderRadius: 8,
            background: '#2d6a4f', border: '1px solid #2d6a4f',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.12s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Upgrade to Studio
          </button>
          <button style={{
            padding: '8px 16px', borderRadius: 8,
            background: 'transparent', border: '1px solid rgba(26,23,20,0.16)',
            color: '#6b6560', fontSize: 13, cursor: 'pointer',
            transition: 'background 0.12s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,23,20,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Cancel subscription
          </button>
        </div>
      </SettingsSection>

      {/* Usage */}
      <SettingsSection title="Usage" description="Storage and project usage this billing period.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Storage */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1714' }}>Storage</span>
              <span style={{ fontSize: 12, color: '#6b6560', fontFamily: 'monospace' }}>
                {usedStorage} GB / {totalStorage} GB
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 100, background: 'rgba(26,23,20,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 100,
                width: `${storagePct}%`,
                background: storagePct > 80 ? '#dc2626' : '#2d6a4f',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: '#9c9590', marginTop: 4 }}>{storagePct}% used</div>
          </div>
          {/* Projects */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(26,23,20,0.05)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1714', marginBottom: 2 }}>Projects</div>
              <div style={{ fontSize: 12, color: '#6b6560' }}>Unlimited on Pro plan</div>
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1714', fontFamily: 'monospace' }}>{usedProjects}</span>
          </div>
        </div>
      </SettingsSection>

      {/* Plans */}
      <SettingsSection title="Available plans" description="Compare and switch between plans at any time.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              style={{
                padding: '16px 18px', borderRadius: 10,
                border: `1.5px solid ${plan.id === currentPlan ? '#2d6a4f' : 'rgba(26,23,20,0.1)'}`,
                background: plan.id === currentPlan ? '#f6fdf9' : '#fafaf9',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 650, color: plan.color, letterSpacing: '-0.02em' }}>{plan.name}</span>
                  {plan.badge && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100,
                      background: '#2d6a4f14', color: '#2d6a4f',
                      border: '1px solid #2d6a4f30',
                    }}>{plan.badge}</span>
                  )}
                  {plan.id === currentPlan && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100,
                      background: '#f0fdf4', color: '#16a34a',
                      border: '1px solid #86efac',
                    }}>Current</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#6b6560', marginBottom: 10 }}>{plan.description}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                  {plan.features.map(f => (
                    <span key={f} style={{ fontSize: 12, color: '#4a4540', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: '#2d6a4f', fontSize: 10 }}>✓</span> {f}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1714', letterSpacing: '-0.03em' }}>
                  {plan.price}<span style={{ fontSize: 12, fontWeight: 400, color: '#9c9590' }}>{plan.period}</span>
                </div>
                {plan.id !== currentPlan && (
                  <button style={{
                    marginTop: 8, padding: '6px 14px', borderRadius: 8,
                    background: plan.id === 'pro' ? '#2d6a4f' : 'transparent',
                    border: `1px solid ${plan.id === 'pro' ? '#2d6a4f' : 'rgba(26,23,20,0.16)'}`,
                    color: plan.id === 'pro' ? '#fff' : '#4a4540',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    transition: 'opacity 0.12s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Payment method */}
      <SettingsSection title="Payment method" description="Card used for upcoming invoices.">
        {!showCardForm ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 28, borderRadius: 5,
                background: '#1a1714', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>VISA</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1714' }}>Visa ending in 4242</div>
                <div style={{ fontSize: 12, color: '#9c9590' }}>Expires 08 / 2028</div>
              </div>
            </div>
            <button
              onClick={() => setShowCardForm(true)}
              style={{
                padding: '7px 14px', borderRadius: 8,
                background: 'transparent', border: '1px solid rgba(26,23,20,0.16)',
                fontSize: 12, color: '#4a4540', cursor: 'pointer',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,23,20,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Update card
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <input placeholder="Card number" style={cardInputStyle} />
              <div style={{ display: 'flex', gap: 10 }}>
                <input placeholder="MM / YY" style={{ ...cardInputStyle, flex: 1 }} />
                <input placeholder="CVC" style={{ ...cardInputStyle, flex: 1 }} />
              </div>
              <input placeholder="Name on card" style={cardInputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '8px 16px', borderRadius: 8,
                background: '#2d6a4f', border: '1px solid #2d6a4f',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Save card</button>
              <button
                onClick={() => setShowCardForm(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: 'transparent', border: '1px solid rgba(26,23,20,0.16)',
                  color: '#6b6560', fontSize: 13, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Invoices */}
      <SettingsSection title="Billing history" description="Download past invoices for your records.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {INVOICES.map((inv, i) => (
            <div key={inv.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 0',
              borderBottom: i < INVOICES.length - 1 ? '1px solid rgba(26,23,20,0.05)' : 'none',
            }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#9c9590', fontFamily: 'monospace' }}>{inv.id}</span>
                <span style={{ fontSize: 13, color: '#4a4540' }}>{inv.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1714', fontFamily: 'monospace' }}>{inv.amount}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
                  background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac',
                }}>{inv.status}</span>
                <button style={{
                  padding: '5px 12px', borderRadius: 6,
                  background: 'transparent', border: '1px solid rgba(26,23,20,0.12)',
                  fontSize: 12, color: '#4a4540', cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,23,20,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </SettingsLayout>
  )
}

const cardInputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(26,23,20,0.16)',
  fontSize: 13, color: '#1a1714', background: '#fafaf9',
  outline: 'none', boxSizing: 'border-box',
}
