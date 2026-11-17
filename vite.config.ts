/**
 * Vite 构建配置。
 * 注册 React 插件；base 设为 GitHub Pages 项目子路径（/electronic_travel_book/），
 * 构建产物的资源引用会自动带上该前缀；hash 路由因此无需服务端重写。
 * 数据 fetch 路径（foreign.ts 的离线 TopoJSON）用 import.meta.env.BASE_URL
 * 拼接，同样随 base 自动适配。
 */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/electronic_travel_book/',
})
