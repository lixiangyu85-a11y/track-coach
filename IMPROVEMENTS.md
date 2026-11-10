# Track Coach 改进落地（对照 Ollama 检验）

## 已完成
1. **P0 持久化**：`track-coach:v2` 信封存储、v1 自动迁移、400ms 防抖自动保存、顶栏「保存 / 导出 / 导入」JSON 备份。
2. **P0 周历与冲突**：周计划页「本周日历」按周一至周日展示；高强课（I/R）间隔 <48h 标红提示；素质课与同日高强跑课软警告。
3. **P1 Hook**：`src/hooks/useCoachData.ts` 集中状态与读写，App 只负责导航与编辑态。
4. **P1 类型与负荷**：`PaceZone` 统一从 `types` 导出；`phaseCaps` / `scaleCapsForVdot` 按 VDOT 动态缩放周负荷上限。
5. **P2 无障碍与移动端**：主导航 `aria-current`、保存状态 `aria-live`、焦点环；小屏周历改 2/1 列。
6. **P2 单测**：Vitest 覆盖 VDOT、时间解析、负荷上限缩放、高强冲突（`npm test` 8 通过）。

## 验证
- `npm test` 通过
- `npm run build` 通过
- 开发地址：http://127.0.0.1:5173/
