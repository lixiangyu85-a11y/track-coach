import { METHODS, PHASE_OPTIONS, formatDistance } from '../domain/catalog'
import {
  COMBO_CATEGORY_LABEL,
  COMBO_PRESETS,
} from '../domain/comboCatalog'
import { WEAKNESS_MODULES } from '../domain/conditioningCatalog'
import { ZONE_PERCENT } from '../domain/vdot'

export function MethodsView() {
  return (
    <div className="stack-cards">
    <div className="card">
      <header className="card-head">
        <h2>跑课方法库</h2>
        <p>Daniels VDOT 配速区（E/M/T/I/R）</p>
      </header>

      <div className="zone-legend">
        {(['E', 'M', 'T', 'I', 'R'] as const).map((z) => (
          <div key={z} className="zone-pill">
            <span>{z}</span>
            <strong>
              {ZONE_PERCENT[z].min}–{ZONE_PERCENT[z].max}% VDOT
            </strong>
          </div>
        ))}
      </div>

      <div className="method-table-wrap">
        <table className="method-table">
          <thead>
            <tr>
              <th>方法</th>
              <th>区</th>
              <th>常用距离</th>
              <th>默认结构</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {METHODS.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.name}</strong>
                  {m.road ? <span className="tag">公路</span> : null}
                </td>
                <td>{m.zone}</td>
                <td>
                  {m.defaultDistances
                    .slice(0, 5)
                    .map((d) => formatDistance(d))
                    .join(' / ')}
                </td>
                <td>
                  {m.defaultSets > 1
                    ? `${m.defaultSets}×(${m.defaultReps}×…)`
                    : `${m.defaultReps}×…`}
                </td>
                <td>
                  <span className="cell-hint">{m.purpose}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="footnote">
        阶段含义：
        {PHASE_OPTIONS.map((p) => `${p.label}（${p.hint}）`).join('；')}
        。半马/全马可多用「长距离有氧」「马拉松配速跑」「乳酸阈」。
      </p>
    </div>

    <div className="card">
      <header className="card-head">
        <h2>组合课模板</h2>
        <p>阶梯 / 金字塔 / 混合 / 专项分解</p>
      </header>
      <div className="method-table-wrap">
        <table className="method-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>结构</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {COMBO_PRESETS.map((c) => (
              <tr key={c.id}>
                <td>{COMBO_CATEGORY_LABEL[c.category]}</td>
                <td>
                  <strong>{c.pattern}</strong>
                </td>
                <td>
                  <span className="cell-hint">{c.purpose}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="card">
      <header className="card-head">
        <h2>素质弱项模块</h2>
        <p>在「素质」页抽取模块组课</p>
      </header>
      <div className="method-table-wrap">
        <table className="method-table">
          <thead>
            <tr>
              <th>弱项</th>
              <th>常见表现</th>
              <th>建议频率</th>
              <th>动作数</th>
            </tr>
          </thead>
          <tbody>
            {WEAKNESS_MODULES.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.name}</strong>
                  <span className="cell-hint">{m.purpose}</span>
                </td>
                <td>{m.signs.join('；')}</td>
                <td>{m.frequencyHint}</td>
                <td>{m.exercises.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        出现锐痛、肿胀或疑似应力伤时停止并就医；本库为教练排课参考，非医疗诊断。
      </p>
    </div>
    </div>
  )
}
