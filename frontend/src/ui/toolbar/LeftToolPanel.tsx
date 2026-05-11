import React from 'react'
import { useToolStore, type ToolId } from '../../store/toolStore'

interface ToolDef {
  id: ToolId
  label: string
  title: string
  icon: React.ReactNode
  group?: string
}

const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const TOOLS: ToolDef[] = [
  {
    id: 'select', label: 'V', title: 'Select (V)',
    icon: <Icon d="M3 2l10 5-5.5 1.5L6 14 3 2z" />,
    group: 'transform',
  },
  {
    id: 'direct-select', label: 'A', title: 'Direct Select — edit nodes (A)',
    // White arrow (hollow) — classic Illustrator direct-select icon
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2l10 5-5.5 1.5L6 14 3 2z"
          stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
          fill="none"/>
      </svg>
    ),
    group: 'transform',
  },
  {
    id: 'pan', label: 'H', title: 'Pan (H / Hold Space)',
    icon: <Icon d="M8 2v2M8 12v2M2 8h2M12 8h2M5 5l1 1M10 10l1 1M5 11l1-1M10 6l1-1" />,
    group: 'transform',
  },
  {
    id: 'pen', label: 'P', title: 'Pen — draw Bézier paths (P)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13 C4 9 9 5 13 3"/>
        <circle cx="13" cy="3" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="3"  cy="13" r="1.5" fill="currentColor" stroke="none"/>
        <line x1="13" y1="3" x2="10" y2="6" strokeDasharray="2 2"/>
      </svg>
    ),
    group: 'transform',
  },
  {
    id: 'node-edit', label: 'N', title: 'Node Edit — selected object only (N)',
    icon: <Icon d="M3 13L8 3l5 10H3z" />,
    group: 'transform',
  },
  {
    id: 'satin-column', label: 'S', title: 'Satin Column (S)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 4 Q3 8 5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M13 4 Q13 8 11 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        {[3,4.5,6,7.5,9,10.5].map((y, i) => (
          <line key={i} x1={3 + i * 0.1} y1={4 + (y-3)} x2={13 - i * 0.1} y2={4 + (y-3)} stroke="currentColor" strokeWidth="0.8" opacity="0.7" strokeLinecap="round"/>
        ))}
      </svg>
    ),
    group: 'embroidery',
  },
  {
    id: 'satin-fill', label: 'F', title: 'Satin Fill (F)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        {[4.5, 6, 7.5, 9, 10.5].map((y, i) => (
          <line key={i} x1="4" y1={y} x2="12" y2={y} stroke="currentColor" strokeWidth="0.9" opacity="0.8" strokeLinecap="round"/>
        ))}
      </svg>
    ),
    group: 'embroidery',
  },
  {
    id: 'tatami-fill', label: 'T', title: 'Tatami Fill (T)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        {[4.2, 5.4, 6.6, 7.8, 9.0, 10.2, 11.4].map((y, i) => (
          <line key={i} x1={i % 2 === 0 ? 4 : 5.5} y1={y} x2={i % 2 === 0 ? 10.5 : 12} y2={y} stroke="currentColor" strokeWidth="0.9" opacity="0.75" strokeLinecap="round"/>
        ))}
      </svg>
    ),
    group: 'embroidery',
  },
  {
    id: 'run-stitch', label: 'R', title: 'Run Stitch (R)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 8 Q5 4 8 8 Q11 12 14 8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
        {[3, 6, 9, 12].map((x, i) => (
          <circle key={i} cx={x} cy={8} r="0.8" fill="currentColor" opacity="0.6"/>
        ))}
      </svg>
    ),
    group: 'embroidery',
  },
  {
    id: 'text', label: 'Tx', title: 'Lettering (Tx)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M3 4h10M8 4v8M5 12h6"/>
      </svg>
    ),
    group: 'embroidery',
  },
  {
    id: 'zoom-in', label: '+', title: 'Zoom In (Z)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="7" cy="7" r="4.5"/>
        <path d="M5.5 7h3M7 5.5v3M11 11l2.5 2.5"/>
      </svg>
    ),
    group: 'view',
  },
  {
    id: 'zoom-out', label: '-', title: 'Zoom Out (Alt+Z)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="7" cy="7" r="4.5"/>
        <path d="M5.5 7h3M11 11l2.5 2.5"/>
      </svg>
    ),
    group: 'view',
  },
]

function Divider() {
  return <div className="w-5 h-px bg-studio-border my-1 mx-auto" />
}

export default function LeftToolPanel() {
  const { activeTool, setTool } = useToolStore()

  let lastGroup = ''

  return (
    <div
      className="flex flex-col items-center py-2 gap-0.5 flex-shrink-0"
      style={{
        width: 48,
        background: '#1a1714',
        borderRight: '1px solid #2e2a26',
        zIndex: 5,
      }}
    >
      {TOOLS.map((tool) => {
        const showDiv = tool.group !== lastGroup && lastGroup !== ''
        if (tool.group) lastGroup = tool.group
        return (
          <React.Fragment key={tool.id}>
            {showDiv && <Divider />}
            <button
              title={tool.title}
              onClick={() => setTool(tool.id)}
              className={`icon-btn ${activeTool === tool.id ? 'active' : ''}`}
            >
              {tool.icon}
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}
