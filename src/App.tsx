import { useRef, useState } from 'react'
import { AthletesView } from './components/AthletesView'
import { HomeDashboard } from './components/HomeDashboard'
import { ConditioningView } from './components/ConditioningView'
import { MethodsView } from './components/MethodsView'
import { SessionBuilder } from './components/SessionBuilder'
import { WeekPlanner } from './components/WeekPlanner'
import { useCoachData } from './hooks/useCoachData'
import type {
  ConditioningSession,
  TrainingSession,
} from './domain/types'
import './App.css'

type Tab = 'home' | 'athletes' | 'builder' | 'conditioning' | 'week' | 'methods'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: '主页' },
  { id: 'athletes', label: '运动员' },
  { id: 'builder', label: '排课' },
  { id: 'conditioning', label: '素质' },
  { id: 'week', label: '周计划' },
  { id: 'methods', label: '方法库' },
]

export default function App() {
  const coach = useCoachData()
  const [tab, setTab] = useState<Tab>('home')
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(
    null,
  )
  const [editingCond, setEditingCond] = useState<ConditioningSession | null>(
    null,
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showNotice(message: string) {
    setNotice(message)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 3200)
  }

  function onImportFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        coach.importBackup(String(reader.result ?? ''))
        showNotice('备份已导入')
      } catch (e) {
        showNotice(`导入失败：${e instanceof Error ? e.message : String(e)}`)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            TC
          </span>
          <div>
            <p className="brand-name">Track Coach</p>
            <p className="brand-tag">田径 / 公路 / 素质模块</p>
          </div>
        </div>
        <nav className="tabs" aria-label="主导航">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'tab active' : 'tab'}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <div className="active-chip" aria-live="polite">
            {coach.activeAthlete ? (
              <>
                <span className="dot" aria-hidden="true" />
                {coach.activeAthlete.name}
              </>
            ) : (
              <span className="muted">未选运动员</span>
            )}
          </div>
          <div className="save-cluster" role="group" aria-label="数据备份">
            <span className="save-status" aria-live="polite">
              {coach.dirty ? '未保存…' : coach.lastSavedAt ? '已自动保存' : '就绪'}
            </span>
            <button
              type="button"
              className="ghost solid"
              onClick={() => coach.saveNow()}
              aria-label="立即保存到本机"
            >
              保存
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => coach.exportBackup()}
              aria-label="导出 JSON 备份"
            >
              导出
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => fileRef.current?.click()}
              aria-label="从 JSON 备份导入"
            >
              导入
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                onImportFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        </div>
      </header>

      <main className="main">
        {tab === 'home' && (
          <HomeDashboard
            athletes={coach.state.athletes}
            activeAthlete={coach.activeAthlete}
            sessions={coach.state.sessions}
            conditioning={coach.state.conditioning}
            weeks={coach.state.weeks}
            onNavigate={setTab}
            onSelectAthlete={coach.setActiveAthleteId}
          />
        )}
        {tab === 'athletes' && (
          <AthletesView
            athletes={coach.state.athletes}
            activeId={coach.state.activeAthleteId}
            onSelect={(id) => coach.setActiveAthleteId(id)}
            onSave={(a) => {
              coach.upsertAthlete(a)
            }}
            onUpdate={coach.updateAthlete}
            onDelete={coach.deleteAthlete}
            onNotice={showNotice}
          />
        )}
        {tab === 'builder' && (
          <SessionBuilder
            athlete={coach.activeAthlete}
            allAthletes={coach.state.athletes}
            editingSession={editingSession}
            onSave={(s) => {
              coach.saveSession(s)
              setEditingSession(null)
            }}
            onUpdate={(s) => {
              coach.updateSession(s)
              setEditingSession(null)
            }}
            onSaveMany={(list) => {
              coach.saveSessions(list)
            }}
            onCancelEdit={() => setEditingSession(null)}
            onNotice={showNotice}
          />
        )}
        {tab === 'conditioning' && (
          <ConditioningView
            athlete={coach.activeAthlete}
            sessions={coach.state.conditioning}
            editingSession={editingCond}
            onUpdateWeaknesses={coach.updateWeaknesses}
            onSave={(s) => {
              coach.saveConditioning(s)
              setEditingCond(null)
            }}
            onUpdate={(s) => {
              coach.updateConditioning(s)
              setEditingCond(null)
            }}
            onDelete={coach.deleteConditioning}
            onCancelEdit={() => setEditingCond(null)}
            onStartEdit={(s) => setEditingCond(s)}
            onNotice={showNotice}
          />
        )}
        {tab === 'week' && (
          <WeekPlanner
            athlete={coach.activeAthlete}
            sessions={coach.state.sessions}
            conditioning={coach.state.conditioning}
            weeks={coach.state.weeks}
            logs={coach.state.logs}
            onSaveWeek={coach.saveWeek}
            onApplyWeeks={coach.applyWeeks}
            onDeleteSession={coach.deleteSession}
            onDeleteConditioning={coach.deleteConditioning}
            onEditSession={(s) => {
              setEditingSession(s)
              coach.setActiveAthleteId(s.athleteId)
              setTab('builder')
            }}
            onEditConditioning={(s) => {
              setEditingCond(s)
              coach.setActiveAthleteId(s.athleteId)
              setTab('conditioning')
            }}
            onSaveLog={coach.saveLog}
            onNotice={showNotice}
          />
        )}
        {tab === 'methods' && <MethodsView />}
      </main>

      {notice ? (
        <div className="toast" role="status" aria-live="polite">
          {notice}
        </div>
      ) : null}
    </div>
  )
}
