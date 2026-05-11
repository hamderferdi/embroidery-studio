import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useProjectStore, type ProjectMeta } from '../store/projectStore'
import ProfileDropdown from '../components/ProfileDropdown'

// ── Tiny shared components ─────────────────────────────────────────────────────

function DashNav() {
  const navigate = useNavigate()

  return (
    <nav style={{
      height: 52,
      background: '#fff',
      borderBottom: '1px solid rgba(26,23,20,0.08)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky', top: 0, zIndex: 50,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 600, fontFamily: 'Georgia, serif', color: '#1a1714' }}>Stitch</span>
        <span style={{ fontSize: 17, fontFamily: 'Palatino, "Palatino Linotype", Georgia, serif', fontStyle: 'italic', fontWeight: 400, color: '#2d6a4f' }}>Lab</span>
      </button>
      <div style={{ flex: 1 }} />
      {/* Profile dropdown */}
      <ProfileDropdown />
    </nav>
  )
}

function Sidebar({ active, setActive }: { active: string; setActive: (s: string) => void }) {
  const items = [
    { id: 'recent',    icon: '◷', label: 'Recent' },
    { id: 'starred',   icon: '☆', label: 'Starred' },
    { id: 'templates', icon: '⊞', label: 'Templates' },
    { id: 'trash',     icon: '⌫', label: 'Trash' },
  ]
  return (
    <aside style={{
      width: 200,
      background: '#fafaf9',
      borderRight: '1px solid rgba(26,23,20,0.07)',
      padding: '20px 12px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setActive(item.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', borderRadius: 8, border: 'none',
            background: active === item.id ? '#2d6a4f14' : 'transparent',
            color: active === item.id ? '#2d6a4f' : '#4a4540',
            fontSize: 13, fontWeight: active === item.id ? 500 : 400,
            cursor: 'pointer', textAlign: 'left', width: '100%',
            letterSpacing: '-0.01em',
          }}
        >
          <span style={{ fontSize: 14 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </aside>
  )
}

// ── Project thumbnail ──────────────────────────────────────────────────────────

function ProjectThumbnail({ project }: { project: ProjectMeta }) {
  if (project.thumbnail) {
    return <img src={project.thumbnail} alt={project.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  }
  // Generated SVG placeholder
  const seed = project.id.charCodeAt(0) + project.id.charCodeAt(1)
  const angle = (seed % 90) + 10
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 130" style={{ background: '#232019' }}>
      <defs>
        <radialGradient id={`grad-${project.id}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor="#e8e0d0" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#e8e0d0" stopOpacity="0.02" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="65" rx="65" ry="50" fill={`url(#grad-${project.id})`} stroke="#3a3630" strokeWidth="1" />
      {[...Array(20)].map((_, i) => (
        <line
          key={i}
          x1={60 + i * 4 + Math.sin(i * 0.5 + seed) * 3}
          y1={35 + Math.sin((i + angle) * 0.4) * 12}
          x2={62 + i * 4 + Math.sin(i * 0.5 + seed) * 3}
          y2={75 + Math.sin((i + angle) * 0.4 + 1) * 12}
          stroke="#40916c" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"
        />
      ))}
    </svg>
  )
}

// ── Project card ───────────────────────────────────────────────────────────────

function ProjectCard({ project, onOpen, onDelete, onToggleStar }: {
  project: ProjectMeta
  onOpen:       () => void
  onDelete:     () => void
  onToggleStar: () => void
}) {
  const [hover, setHover] = useState(false)

  const ago = (() => {
    const diff = Date.now() - new Date(project.updatedAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)   return 'just now'
    if (mins < 60)  return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)   return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  })()

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 12,
        border: `1px solid ${hover ? 'rgba(26,23,20,0.18)' : 'rgba(26,23,20,0.09)'}`,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#fff',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? '0 8px 32px rgba(0,0,0,0.09)' : '0 1px 4px rgba(0,0,0,0.04)',
      }}
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div style={{ height: 140, overflow: 'hidden', position: 'relative', background: '#1a1714' }}>
        <ProjectThumbnail project={project} />
        {/* Star */}
        <button
          onClick={e => { e.stopPropagation(); onToggleStar() }}
          title={project.starred ? 'Unstar' : 'Star'}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.5)', border: 'none',
            borderRadius: 6, width: 28, height: 28,
            cursor: 'pointer', fontSize: 14,
            color: project.starred ? '#f5c842' : 'rgba(255,255,255,0.5)',
            display: hover || project.starred ? 'flex' : 'none',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {project.starred ? '★' : '☆'}
        </button>
      </div>
      {/* Meta */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1714', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            {project.name}
          </span>
          {hover && (
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              title="Delete project"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9c9590', fontSize: 16, lineHeight: 1, flexShrink: 0, padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9c9590')}
            >×</button>
          )}
        </div>
        <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#9c9590' }}>{ago}</span>
          <span style={{ fontSize: 11, color: '#9c9590' }}>·</span>
          <span style={{ fontSize: 11, color: '#9c9590' }}>{project.stitchCount.toLocaleString()} sts</span>
          <span style={{ fontSize: 11, color: '#9c9590' }}>·</span>
          <span style={{ fontSize: 11, color: '#9c9590' }}>{project.hoopSize}</span>
        </div>
      </div>
    </div>
  )
}

// ── New project modal ──────────────────────────────────────────────────────────

function NewProjectModal({ onClose, onCreate }: {
  onClose:  () => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, padding: '32px 32px 28px',
          width: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          border: '1px solid rgba(26,23,20,0.08)',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 6 }}>
          New project
        </h2>
        <p style={{ fontSize: 13, color: '#6b6560', marginBottom: 22 }}>Give your design a name to get started.</p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(name.trim()) }}
          placeholder="e.g. Floral monogram"
          style={{
            width: '100%', padding: '10px 13px', borderRadius: 8,
            border: '1px solid rgba(26,23,20,0.18)',
            fontSize: 14, color: '#1a1714', background: '#fafaf9',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 8,
              background: 'transparent', border: '1px solid rgba(26,23,20,0.16)',
              fontSize: 13, color: '#4a4540', cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={() => { if (name.trim()) onCreate(name.trim()) }}
            disabled={!name.trim()}
            style={{
              flex: 2, padding: '10px', borderRadius: 8,
              background: name.trim() ? '#2d6a4f' : '#9cc5b4',
              border: 'none', fontSize: 13, fontWeight: 600,
              color: '#fff', cursor: name.trim() ? 'pointer' : 'default',
            }}
          >Create project</button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user }  = useAuthStore()
  const { projects, loading, fetchProjects, createProject, deleteProject, toggleStar } = useProjectStore()

  const [activeSection, setActiveSection]   = useState('recent')
  const [showNewModal,  setShowNewModal]     = useState(false)
  const [search,        setSearch]           = useState('')

  useEffect(() => {
    if (user) fetchProjects(user.id)
  }, [user, fetchProjects])

  const handleCreate = async (name: string) => {
    if (!user) return
    setShowNewModal(false)
    const meta = await createProject(user.id, name)
    navigate(`/editor/${meta.id}`)
  }

  const filtered = projects
    .filter(p => activeSection === 'starred' ? p.starred : true)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f2ed',
      fontFamily: '"Inter", system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      <DashNav />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar active={activeSection} setActive={setActiveSection} />

        {/* Main content */}
        <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginRight: 4 }}>
              {activeSection === 'starred' ? 'Starred projects' : 'Recent projects'}
            </h1>
            <div style={{ flex: 1 }} />
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9c9590' }}>⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects…"
                style={{
                  padding: '8px 12px 8px 30px',
                  borderRadius: 8,
                  border: '1px solid rgba(26,23,20,0.14)',
                  fontSize: 13, color: '#1a1714',
                  background: '#fff', outline: 'none', width: 200,
                }}
              />
            </div>
            {/* New project */}
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 9,
                background: '#2d6a4f', border: 'none',
                fontSize: 13, fontWeight: 600,
                color: '#fff', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(45,106,79,0.3)',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New project
            </button>
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 13, color: '#9c9590' }}>Loading projects…</div>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onNew={() => setShowNewModal(true)} hasSearch={!!search} />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 18,
            }}>
              {filtered.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={() => navigate(`/editor/${p.id}`)}
                  onDelete={() => deleteProject(p.id)}
                  onToggleStar={() => toggleStar(p.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} onCreate={handleCreate} />}
    </div>
  )
}

function EmptyState({ onNew, hasSearch }: { onNew: () => void; hasSearch: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 12 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: '#2d6a4f0e', border: '1px solid #2d6a4f22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, color: '#2d6a4f',
      }}>⬡</div>
      <h3 style={{ fontSize: 17, fontWeight: 650, color: '#1a1714', letterSpacing: '-0.02em', marginTop: 4 }}>
        {hasSearch ? 'No matching projects' : 'No projects yet'}
      </h3>
      <p style={{ fontSize: 13, color: '#6b6560', maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
        {hasSearch
          ? 'Try a different search term.'
          : 'Create your first embroidery project and it will appear here.'}
      </p>
      {!hasSearch && (
        <button
          onClick={onNew}
          style={{
            marginTop: 8, padding: '10px 22px', borderRadius: 9,
            background: '#2d6a4f', border: 'none',
            fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer',
          }}
        >
          Create first project
        </button>
      )}
    </div>
  )
}
