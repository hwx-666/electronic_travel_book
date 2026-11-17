/**
 * Vite 构建配置。
 * 当前仅注册 React 插件；未配置 base/代理，产物可直接用于静态托管
 * （hash 路由因此无需服务端重写）。后续部署到子路径时再补 base。
 */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
