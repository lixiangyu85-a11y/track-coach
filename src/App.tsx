import { useMemo, useRef, useState } from 'react'
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

type Tab =
  | 'home'
  | 'athletes'
  | 'builder'
  | 'conditioning'
  | 'week'
  | 'methods'
  | 'me'

const DESKTOP_TABS: {
  id: Exclude<Tab, 'me'>
  label: string
  icon: 'home' | 'users' | 'plan' | 'strength' | 'calendar' | 'book'
}[] = [
  { id: 'home', label: '主页', icon: 'home' },
  { id: 'athletes', label: '运动员', icon: 'users' },
  { id: 'builder', label: '排课', icon: 'plan' },
  { id: 'conditioning', label: '素质', icon: 'strength' },
  { id: 'week', label: '周计划', icon: 'calendar' },
  { id: 'methods', label: '方法库', icon: 'book' },
]

const MOBILE_TABS: {
  id: 'home' | 'week' | 'athletes' | 'builder' | 'me'
  label: string
  icon: 'home' | 'calendar' | 'users' | 'plan' | 'me'
}[] = [
  { id: 'home', label: '主页', icon: 'home' },
  { id: 'week', label: '周计划', icon: 'calendar' },
  { id: 'athletes', label: '运动员', icon: 'users' },
  { id: 'builder', label: '排课', icon: 'plan' },
  { id: 'me', label: '我的', icon: 'me' },
]

function NavIcon({
  name,
}: {
  name: 'home' | 'users' | 'plan' | 'strength' | 'calendar' | 'book' | 'me'
}) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.5 19c.6-3.2 2.8-5 6.5-5s5.9 1.8 6.5 5" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M15.2 14.2c2.4.4 4 1.8 4.8 4.8" />
        </svg>
      )
    case 'plan':
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h10" />
          <circle cx="18.5" cy="18" r="2.2" />
        </svg>
      )
    case 'strength':
      return (
        <svg {...common}>
          <path d="M7 9v6M17 9v6M4 11v2M20 11v2M7 12h10" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
        </svg>
      )
    case 'book':
      return (
        <svg {...common}>
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5Z" />
          <path d="M5 5.5V21.5" />
        </svg>
      )
    case 'me':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19c.8-3.4 3.2-5 7-5s6.2 1.6 7 5" />
        </svg>
      )
  }
}

function initials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

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
  const [athleteQuery, setAthleteQuery] = useState('')
  const [dataMenuOpen, setDataMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

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

  function goTab(next: Tab) {
    setTab(next)
    setDataMenuOpen(false)
    setMobileSearchOpen(false)
  }

  const filteredAthletes = useMemo(() => {
    const q = athleteQuery.trim().toLowerCase()
    if (!q) return coach.state.athletes
    return coach.state.athletes.filter((a) => a.name.toLowerCase().includes(q))
  }, [athleteQuery, coach.state.athletes])

  function cycleAthlete(dir: 1 | -1) {
    const list = coach.state.athletes
    if (list.length === 0) return
    const idx = list.findIndex((a) => a.id === coach.state.activeAthleteId)
    const next =
      idx < 0
        ? dir === 1
          ? 0
          : list.length - 1
        : (idx + dir + list.length) % list.length
    coach.setActiveAthleteId(list[next].id)
  }

  const pageMeta: Record<
    Exclude<Tab, 'me'>,
    { title: string; subtitle: string }
  > = {
    home: {
      title: '主页',
      subtitle: coach.activeAthlete
        ? `${coach.activeAthlete.name} · 本周概览`
        : '团队与本周概览',
    },
    athletes: { title: '运动员', subtitle: '档案与关键指标' },
    builder: {
      title: '排课',
      subtitle: coach.activeAthlete
        ? `${coach.activeAthlete.name} · 配速与课结构`
        : '请先选择运动员',
    },
    conditioning: {
      title: '素质',
      subtitle: coach.activeAthlete
        ? `${coach.activeAthlete.name} · 弱项与力量`
        : '请先选择运动员',
    },
    week: {
      title: '周计划',
      subtitle: coach.activeAthlete
        ? `${coach.activeAthlete.name} · 日历与负荷`
        : '请先选择运动员',
    },
    methods: { title: '方法库', subtitle: '课型、区间与组合课参考' },
  }

  const mobileTitle =
    tab === 'me'
      ? '我的'
      : tab === 'home'
        ? ''
        : pageMeta[tab].title

  const mobileNavActive: (typeof MOBILE_TABS)[number]['id'] =
    tab === 'conditioning' || tab === 'methods' || tab === 'me'
      ? 'me'
      : tab === 'home' ||
          tab === 'week' ||
          tab === 'athletes' ||
          tab === 'builder'
        ? tab
        : 'home'

  const showFab = tab === 'home' || tab === 'week' || tab === 'athletes'

  const sidebar = (
    <>
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 18 12 4l8 14H4Z" />
          </svg>
        </span>
        <span className="brand-name">Track Coach</span>
      </div>

      <div className="sidebar-search">
        <svg
          className="sidebar-search-icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16.5 16.5 4 4" />
        </svg>
        <input
          type="search"
          placeholder="筛选运动员"
          value={athleteQuery}
          onChange={(e) => setAthleteQuery(e.target.value)}
          aria-label="筛选运动员"
        />
      </div>

      {athleteQuery.trim() ? (
        <ul className="sidebar-search-results">
          {filteredAthletes.length === 0 ? (
            <li className="muted">无匹配</li>
          ) : (
            filteredAthletes.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={
                    a.id === coach.state.activeAthleteId
                      ? 'sidebar-search-item active'
                      : 'sidebar-search-item'
                  }
                  onClick={() => {
                    coach.setActiveAthleteId(a.id)
                    setAthleteQuery('')
                    goTab('athletes')
                  }}
                >
                  {a.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      <nav className="sidebar-nav" aria-label="主导航">
        {DESKTOP_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'sidebar-link active' : 'sidebar-link'}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => goTab(t.id)}
          >
            <NavIcon name={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-athlete">
          <div className="avatar" aria-hidden="true">
            {coach.activeAthlete ? initials(coach.activeAthlete.name) : '—'}
          </div>
          <div className="sidebar-athlete-meta">
            <strong>{coach.activeAthlete?.name ?? '未选运动员'}</strong>
            <span>
              {coach.dirty
                ? '未保存…'
                : coach.lastSavedAt
                  ? '已保存'
                  : '就绪'}
            </span>
          </div>
          <div className="sidebar-athlete-switch">
            <button
              type="button"
              className="icon-btn"
              aria-label="上一位运动员"
              onClick={() => cycleAthlete(-1)}
              disabled={coach.state.athletes.length < 2}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m7 14 5-5 5 5" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="下一位运动员"
              onClick={() => cycleAthlete(1)}
              disabled={coach.state.athletes.length < 2}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="sidebar-data">
          <button
            type="button"
            className="ghost solid sidebar-data-toggle"
            aria-expanded={dataMenuOpen}
            onClick={() => setDataMenuOpen((v) => !v)}
          >
            数据
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {dataMenuOpen ? (
            <div className="sidebar-data-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  coach.saveNow()
                  showNotice('已保存')
                  setDataMenuOpen(false)
                }}
              >
                保存
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  coach.exportBackup()
                  setDataMenuOpen(false)
                }}
              >
                导出
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  fileRef.current?.click()
                  setDataMenuOpen(false)
                }}
              >
                导入
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-only" aria-label="侧边栏">
        {sidebar}
      </aside>

      <div className="app-frame">
        {tab !== 'home' ? (
          <header className="mobile-topbar mobile-only">
            <h1 className="mobile-topbar-title">{mobileTitle}</h1>
            <button
              type="button"
              className="icon-btn mobile-topbar-action"
              aria-label={mobileSearchOpen ? '关闭搜索' : '搜索运动员'}
              aria-expanded={mobileSearchOpen}
              onClick={() => setMobileSearchOpen((v) => !v)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16.5 16.5 4 4" />
              </svg>
            </button>
          </header>
        ) : null}

        {mobileSearchOpen ? (
          <div className="mobile-search-panel mobile-only">
            <input
              type="search"
              placeholder="筛选运动员"
              value={athleteQuery}
              onChange={(e) => setAthleteQuery(e.target.value)}
              aria-label="筛选运动员"
              autoFocus
            />
            <ul>
              {filteredAthletes.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      coach.setActiveAthleteId(a.id)
                      setAthleteQuery('')
                      setMobileSearchOpen(false)
                      goTab('athletes')
                    }}
                  >
                    {a.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <main
          className={
            tab === 'home' || tab === 'week' || tab === 'me'
              ? 'content-panel content-panel-flush'
              : 'content-panel'
          }
        >
          {tab !== 'week' &&
          tab !== 'home' &&
          tab !== 'me' &&
          tab !== 'athletes' ? (
            <header className="page-head">
              <div>
                <h1>{pageMeta[tab].title}</h1>
                <p>{pageMeta[tab].subtitle}</p>
              </div>
            </header>
          ) : null}

          {tab === 'home' && (
            <HomeDashboard
              athletes={coach.state.athletes}
              activeAthlete={coach.activeAthlete}
              sessions={coach.state.sessions}
              conditioning={coach.state.conditioning}
              weeks={coach.state.weeks}
              onNavigate={(t) => goTab(t)}
              onSelectAthlete={coach.setActiveAthleteId}
              onOpenSession={(s) => {
                setEditingSession(s)
                coach.setActiveAthleteId(s.athleteId)
                goTab('builder')
              }}
              onOpenConditioning={(s) => {
                setEditingCond(s)
                coach.setActiveAthleteId(s.athleteId)
                goTab('conditioning')
              }}
            />
          )}
          {tab === 'athletes' && (
            <>
              <header className="page-head desktop-only-block">
                <div>
                  <h1>{pageMeta.athletes.title}</h1>
                  <p>{pageMeta.athletes.subtitle}</p>
                </div>
              </header>
              <AthletesView
                athletes={coach.state.athletes}
                activeId={coach.state.activeAthleteId}
                sessions={coach.state.sessions}
                conditioning={coach.state.conditioning}
                weeks={coach.state.weeks}
                onSelect={(id) => coach.setActiveAthleteId(id)}
                onSave={(a) => {
                  coach.upsertAthlete(a)
                }}
                onUpdate={coach.updateAthlete}
                onDelete={coach.deleteAthlete}
                onNotice={showNotice}
                onOpenWeek={(id) => {
                  coach.setActiveAthleteId(id)
                  goTab('week')
                }}
                onOpenBuilder={(id) => {
                  coach.setActiveAthleteId(id)
                  goTab('builder')
                }}
              />
            </>
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
          {tab === 'me' && (
            <section className="me-panel" aria-label="我的">
              <header className="me-panel-head">
                <p className="me-panel-kicker">当前运动员</p>
                <h1>{coach.activeAthlete?.name ?? '未选运动员'}</h1>
                <p className="muted">
                  {coach.dirty
                    ? '有未保存更改'
                    : coach.lastSavedAt
                      ? '数据已保存到本机'
                      : '本地数据就绪'}
                </p>
              </header>

              <div className="me-athlete-list">
                {coach.state.athletes.length === 0 ? (
                  <p className="empty">还没有运动员。</p>
                ) : (
                  coach.state.athletes.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={
                        a.id === coach.state.activeAthleteId
                          ? 'me-athlete-row active'
                          : 'me-athlete-row'
                      }
                      onClick={() => coach.setActiveAthleteId(a.id)}
                    >
                      <span className="avatar">{initials(a.name)}</span>
                      <span className="me-athlete-name">{a.name}</span>
                      {a.id === coach.state.activeAthleteId ? (
                        <span className="status-pill green">当前</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>

              <div className="me-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    coach.saveNow()
                    showNotice('已保存')
                  }}
                >
                  保存
                </button>
                <button
                  type="button"
                  className="ghost solid"
                  onClick={() => coach.exportBackup()}
                >
                  导出备份
                </button>
                <button
                  type="button"
                  className="ghost solid"
                  onClick={() => fileRef.current?.click()}
                >
                  导入备份
                </button>
              </div>

              <div className="me-links">
                <button
                  type="button"
                  className="me-link-row"
                  onClick={() => goTab('conditioning')}
                >
                  <NavIcon name="strength" />
                  <span>素质训练</span>
                  <span className="me-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
                <button
                  type="button"
                  className="me-link-row"
                  onClick={() => goTab('methods')}
                >
                  <NavIcon name="book" />
                  <span>方法库</span>
                  <span className="me-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
                <button
                  type="button"
                  className="me-link-row"
                  onClick={() => goTab('athletes')}
                >
                  <NavIcon name="users" />
                  <span>管理运动员档案</span>
                  <span className="me-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </div>
            </section>
          )}
        </main>

        {showFab ? (
          <button
            type="button"
            className="mobile-fab mobile-only"
            aria-label="新建跑步课"
            onClick={() => goTab('builder')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        ) : null}

        <nav className="mobile-bottom-nav mobile-only" aria-label="底部导航">
          {MOBILE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={
                mobileNavActive === t.id
                  ? 'mobile-nav-item active'
                  : 'mobile-nav-item'
              }
              onClick={() => goTab(t.id)}
            >
              <span className="mobile-nav-icon">
                <NavIcon name={t.icon} />
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

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

      {notice ? (
        <div className="toast" role="status" aria-live="polite">
          {notice}
        </div>
      ) : null}
    </div>
  )
}
