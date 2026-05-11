import React, { useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import SettingsLayout, {
  SettingsSection, SettingsRow, SettingsSelect, SaveButton, Toggle,
} from './SettingsLayout'

export default function PreferencesPage() {
  const settings = useSettingsStore()
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <SettingsLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1a1714', marginBottom: 24 }}>Preferences</h1>

      {/* Editor */}
      <SettingsSection title="Editor" description="Controls how the editor behaves while you work.">
        <SettingsRow label="Autosave interval" description="How often your project is saved automatically.">
          <SettingsSelect
            value={String(settings.autosaveInterval)}
            onChange={v => settings.update({ autosaveInterval: Number(v) as never })}
            options={[
              { value: '0',   label: 'Off' },
              { value: '30',  label: 'Every 30 seconds' },
              { value: '60',  label: 'Every minute' },
              { value: '120', label: 'Every 2 minutes' },
              { value: '300', label: 'Every 5 minutes' },
            ]}
          />
        </SettingsRow>
        <SettingsRow label="Default hoop size" description="Pre-selected hoop when creating a new project.">
          <SettingsSelect
            value={settings.defaultHoopSize}
            onChange={v => settings.update({ defaultHoopSize: v })}
            options={[
              { value: '100x100', label: '100 × 100 mm' },
              { value: '130x180', label: '130 × 180 mm' },
              { value: '200x200', label: '200 × 200 mm' },
              { value: '260x260', label: '260 × 260 mm' },
              { value: '360x360', label: '360 × 360 mm' },
            ]}
          />
        </SettingsRow>
        <SettingsRow label="Measurement units" description="Units shown in the inspector and ruler.">
          <SettingsSelect
            value={settings.measurementUnit}
            onChange={v => settings.update({ measurementUnit: v as never })}
            options={[
              { value: 'mm',     label: 'Millimetres (mm)' },
              { value: 'inches', label: 'Inches (in)' },
            ]}
          />
        </SettingsRow>
      </SettingsSection>

      {/* Viewport */}
      <SettingsSection title="Viewport" description="Controls for canvas navigation and rendering.">
        <SettingsRow label="Render quality" description="Higher quality uses more GPU resources.">
          <SettingsSelect
            value={settings.renderQuality}
            onChange={v => settings.update({ renderQuality: v as never })}
            options={[
              { value: 'performance', label: 'Performance' },
              { value: 'balanced',    label: 'Balanced (recommended)' },
              { value: 'quality',     label: 'High quality' },
            ]}
          />
        </SettingsRow>
        <SettingsRow label="Zoom sensitivity" description="How fast the canvas zooms with the scroll wheel.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range" min="0.5" max="2" step="0.1"
              value={settings.zoomSensitivity}
              onChange={e => settings.update({ zoomSensitivity: parseFloat(e.target.value) })}
              style={{ width: 120, accentColor: '#2d6a4f' }}
            />
            <span style={{ fontSize: 12, color: '#4a4540', fontFamily: 'monospace', minWidth: 30 }}>
              {settings.zoomSensitivity.toFixed(1)}×
            </span>
          </div>
        </SettingsRow>
        <SettingsRow label="Invert scroll direction" description="Reverse the zoom direction on the scroll wheel.">
          <Toggle value={settings.invertScroll} onChange={v => settings.update({ invertScroll: v })} />
        </SettingsRow>
        <SettingsRow label="Show grid by default" description="Grid is visible when opening the editor.">
          <Toggle value={settings.showGrid} onChange={v => settings.update({ showGrid: v })} />
        </SettingsRow>
        <SettingsRow label="Show rulers by default">
          <Toggle value={settings.showRulers} onChange={v => settings.update({ showRulers: v })} />
        </SettingsRow>
      </SettingsSection>

      {/* Reset */}
      <SettingsSection title="Reset preferences">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: '#6b6560' }}>
            Restore all preferences to their default values.
          </div>
          <button
            onClick={() => { settings.reset(); setSaved(true); setTimeout(() => setSaved(false), 2000) }}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'transparent', border: '1px solid rgba(26,23,20,0.16)',
              fontSize: 13, color: '#4a4540', cursor: 'pointer',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,23,20,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Reset to defaults
          </button>
        </div>
      </SettingsSection>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SaveButton loading={false} saved={saved} onClick={save} />
      </div>
    </SettingsLayout>
  )
}
