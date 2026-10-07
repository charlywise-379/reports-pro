'use client'
import { useEffect, useState } from 'react'
import { KeyRound, RotateCcw, PlugZap, Pencil, X } from 'lucide-react'
import { useAdmin } from '@/lib/operations/AdminContext'
import { adminFetch } from '@/lib/operations/api'
import { palette } from '@/lib/operations/theme'
import { useTheme } from '@/lib/operations/ThemeContext'

type SecretItem = {
  key: string; label: string; sensitive: boolean; configured: boolean
  source: 'override' | 'env' | 'none'; masked: string | null; mode?: 'test' | 'live'
  corrupt: boolean; testable: boolean; updatedAt: string | null; updatedBy: string | null
}
type Group = { group: string; label: string; items: SecretItem[] }
type AuditEntry = { id: string; key: string; action: 'SET' | 'REVERT' | 'TEST'; success: boolean; createdAt: string; adminName: string }

const ACTION_LABEL: Record<AuditEntry['action'], string> = { SET: 'Editó', REVERT: 'Volvió a Railway', TEST: 'Probó' }

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'hace un momento'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return `hace ${Math.floor(s / 86400)} d`
}

export default function OperationsSecretsPage() {
  const { admin } = useAdmin()
  const { theme } = useTheme()
  const T = palette[theme]
  const [groups, setGroups] = useState<Group[]>([])
  const [writable, setWritable] = useState(true)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState<{ mode: 'edit' | 'revert'; item: SecretItem } | null>(null)
  const [value, setValue] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; error?: string }>>({})

  const load = async () => {
    setLoadError('')
    const res = await adminFetch('/api/operations/secrets')
    if (!res.ok) { setLoadError('No se pudo cargar el estado de las llaves'); return }
    const data = await res.json()
    setGroups(data.groups || [])
    setWritable(!!data.writable)
    const a = await adminFetch('/api/operations/secrets/audit')
    if (a.ok) setAudit((await a.json()).entries || [])
  }

  useEffect(() => { if (admin?.role === 'SUPER_ADMIN') load() }, [admin])

  if (admin && admin.role !== 'SUPER_ADMIN') {
    return <div style={{ color: T.danger }}>No tienes permiso para ver esta sección.</div>
  }

  const openModal = (mode: 'edit' | 'revert', item: SecretItem) => {
    setModal({ mode, item }); setValue(''); setPassword(''); setFormError('')
  }

  const submit = async () => {
    if (!modal) return
    setSaving(true); setFormError('')
    const path = `/api/operations/secrets/${modal.item.key}`
    const res = modal.mode === 'edit'
      ? await adminFetch(path, { method: 'PUT', body: JSON.stringify({ value, password }) })
      : await adminFetch(path, { method: 'DELETE', body: JSON.stringify({ password }) })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setFormError(data.error || 'No se pudo guardar'); return }
    setModal(null)
    const warnings: string[] = data.warnings || []
    setNotice(warnings.length
      ? { kind: 'warn', text: warnings.join(' ') }
      : { kind: 'ok', text: modal.mode === 'edit' ? `${modal.item.label} actualizada. Ya está en uso.` : `${modal.item.label} volvió al valor de Railway.` })
    load()
  }

  const runTest = async (item: SecretItem) => {
    setTesting(item.key)
    const res = await adminFetch(`/api/operations/secrets/${item.key}/test`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setTesting(null)
    setTestResult(r => ({ ...r, [item.key]: res.ok ? data : { ok: false, error: data.error || 'La prueba falló' } }))
    load()
  }

  const btn = (danger?: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, background: 'none',
    border: `1px solid ${danger ? T.danger : T.border}`, borderRadius: 6, padding: '5px 9px',
    color: danger ? T.danger : T.text, cursor: 'pointer',
  })
  const badge = (color: string): React.CSSProperties => ({
    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
    color, border: `1px solid ${color}`, borderRadius: 999, padding: '2px 7px',
  })
  const sourceBadge = (s: SecretItem['source']) =>
    s === 'override' ? <span style={badge(T.accent)}>Backoffice</span>
      : s === 'env' ? <span style={badge(T.textMuted)}>Railway</span>
        : <span style={badge(T.danger)}>Sin configurar</span>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 980 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyRound size={20} /> Llaves de integraciones
        </h1>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
          Un valor editado aquí tiene prioridad sobre el de Railway y aplica en segundos, sin redeploy. Los valores completos nunca se muestran.
        </p>
      </div>

      {!writable && (
        <div style={{ border: `1px solid ${T.warning}`, color: T.warning, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
          Falta <code>SECRETS_MASTER_KEY</code> en Railway — la sección está en modo solo lectura.
        </div>
      )}
      {loadError && <div style={{ color: T.danger, fontSize: 13 }}>{loadError}</div>}
      {notice && (
        <div style={{ border: `1px solid ${notice.kind === 'ok' ? T.success : notice.kind === 'warn' ? T.warning : T.danger}`, color: notice.kind === 'ok' ? T.success : notice.kind === 'warn' ? T.warning : T.danger, borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} aria-label="Cerrar aviso"><X size={14} /></button>
        </div>
      )}

      {groups.map(g => (
        <section key={g.group} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: T.text, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>{g.label}</h2>
          {g.items.map(item => (
            <div key={item.key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.label}</span>
                  {sourceBadge(item.source)}
                  {item.mode && <span style={badge(item.mode === 'live' ? T.success : T.warning)}>{item.mode}</span>}
                  {item.corrupt && <span style={badge(T.danger)}>Override corrupto</span>}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {item.key} · {item.masked ?? '—'}
                </div>
                {item.updatedAt && (
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Cambiada por {item.updatedBy} {timeAgo(item.updatedAt)}</div>
                )}
                {testResult[item.key] && (
                  <div style={{ fontSize: 12, marginTop: 4, color: testResult[item.key].ok ? T.success : T.danger }}>
                    {testResult[item.key].ok ? '✓ Conexión correcta' : `✗ ${testResult[item.key].error}`}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {item.testable && (
                  <button style={btn()} onClick={() => runTest(item)} disabled={testing === item.key}>
                    <PlugZap size={12} /> {testing === item.key ? 'Probando…' : 'Probar'}
                  </button>
                )}
                {writable && <button style={btn()} onClick={() => openModal('edit', item)}><Pencil size={12} /> Editar</button>}
                {writable && item.source === 'override' && (
                  <button style={btn(true)} onClick={() => openModal('revert', item)}><RotateCcw size={12} /> Volver a Railway</button>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      <section style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: T.text, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>Bitácora</h2>
        {audit.length === 0
          ? <div style={{ padding: 16, fontSize: 13, color: T.textMuted }}>Sin movimientos todavía.</div>
          : audit.map(e => (
            <div key={e.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 16px', fontSize: 12, color: T.text, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ color: T.textMuted, minWidth: 110 }}>{new Date(e.createdAt).toLocaleString('es-MX')}</span>
              <span style={{ fontWeight: 600 }}>{e.adminName}</span>
              <span>{ACTION_LABEL[e.action]}{e.action === 'TEST' ? (e.success ? ' ✓' : ' ✗') : ''}</span>
              <span style={{ fontFamily: 'monospace', color: T.textMuted }}>{e.key}</span>
            </div>
          ))}
      </section>

      {modal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
              {modal.mode === 'edit' ? `Editar: ${modal.item.label}` : `Volver a Railway: ${modal.item.label}`}
            </h3>
            {modal.mode === 'revert' && (
              <p style={{ fontSize: 13, color: T.textMuted }}>Se borra el valor editado aquí y el backend vuelve a usar el de Railway.</p>
            )}
            {modal.mode === 'edit' && (
              <label style={{ fontSize: 12, color: T.textMuted, display: 'flex', flexDirection: 'column', gap: 4 }}>
                Nuevo valor
                <input id="secret-value" type={modal.item.sensitive ? 'password' : 'text'} autoComplete="off" value={value}
                  onChange={e => setValue(e.target.value)}
                  style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace', fontSize: 13 }} />
              </label>
            )}
            <label style={{ fontSize: 12, color: T.textMuted, display: 'flex', flexDirection: 'column', gap: 4 }}>
              Tu contraseña de administrador
              <input id="admin-password" type="password" autoComplete="current-password" value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
            </label>
            {formError && <div style={{ color: T.danger, fontSize: 12 }}>{formError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={btn()} onClick={() => setModal(null)} disabled={saving}>Cancelar</button>
              <button
                style={{ ...btn(modal.mode === 'revert'), background: modal.mode === 'revert' ? 'none' : T.accent, color: modal.mode === 'revert' ? T.danger : '#fff', borderColor: modal.mode === 'revert' ? T.danger : T.accent }}
                onClick={submit}
                disabled={saving || !password || (modal.mode === 'edit' && !value.trim())}
              >
                {saving ? 'Guardando…' : modal.mode === 'edit' ? 'Guardar' : 'Volver a Railway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
