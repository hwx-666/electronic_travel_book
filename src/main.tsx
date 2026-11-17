/**
 * 应用入口：挂载根组件。
 * 样式先于 App 引入（theme.css 主题变量 → global.css 全局重置/基础），
 * 保证首帧渲染时 CSS 变量已就绪；新增全局样式文件时保持该顺序。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/theme.css'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
