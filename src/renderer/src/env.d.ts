/// <reference types="vite/client" />
import type { MyFlowApi } from '@shared/api'

declare global {
  interface Window {
    myflow: MyFlowApi
  }
}

export {}
