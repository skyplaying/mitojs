/**
 * Performance monitoring entry
 *
 * @class
 * @author allen(https://github.com/Chryseis)
 * */
import 'core-js/es/array/includes'
import 'core-js/es/object/values'
import { IConfig, IWebVitals, IMetricsObj } from './types'
import generateUniqueID from './utils/generateUniqueID'
import { afterLoad, beforeUnload, unload } from './utils'
import { onHidden } from './lib/onHidden'
import createReporter from './lib/createReporter'
import MetricsStore from './lib/store'
import { measure } from './lib/measureCustomMetrics'
import { setMark, clearMark, getMark, hasMark } from './lib/markHandler'
import { initNavigationTiming } from './metrics/getNavigationTiming'
import { initDeviceInfo } from './metrics/getDeviceInfo'
import { initNetworkInfo } from './metrics/getNetworkInfo'
import { initPageInfo } from './metrics/getPageInfo'
import { initFP } from './metrics/getFP'
import { initFCP } from './metrics/getFCP'
import { initFID } from './metrics/getFID'
import { initLCP } from './metrics/getLCP'
import { initFPS } from './metrics/getFPS'
import { initCLS } from './metrics/getCLS'
import { initCCP } from './metrics/getCCP'

let metricsStore: MetricsStore
let reporter: ReturnType<typeof createReporter>

class WebVitals implements IWebVitals {
  constructor(config: IConfig) {
    const {
      appId,
      version,
      reportCallback,
      reportUri = null,
      immediately = false,
      needCCP = false,
      logFpsCount = 5,
      apiConfig = {},
      hashHistory = true,
      excludeRemotePath = []
    } = config

    const sectionId = generateUniqueID()
    reporter = createReporter(sectionId, appId, version, reportCallback)
    metricsStore = new MetricsStore(reporter)

    initPageInfo(metricsStore, reporter, immediately)
    initNetworkInfo(metricsStore, reporter, immediately)
    initDeviceInfo(metricsStore, reporter, immediately)
    initCLS(metricsStore, reporter, immediately)
    initCCP(metricsStore, reporter, needCCP, apiConfig, hashHistory, excludeRemotePath, immediately)

    afterLoad(() => {
      initNavigationTiming(metricsStore, reporter, immediately)
      initFP(metricsStore, reporter, immediately)
      initFCP(metricsStore, reporter, immediately)
      initFID(metricsStore, reporter, immediately)
      initLCP(metricsStore, reporter, immediately)
      initFPS(metricsStore, reporter, logFpsCount, immediately)
    })

    // if immediately is false,report metrics when visibility and unload
    ;[beforeUnload, unload, onHidden].forEach((fn) => {
      fn(() => {
        const metrics = this.getCurrentMetrics()
        if ('sendBeacon' in navigator && reportUri && Object.keys(metrics).length > 0 && !immediately) {
          navigator.sendBeacon(reportUri, JSON.stringify(metrics))
          metricsStore.clear()
        }
      })
    })
  }

  getCurrentMetrics(): IMetricsObj {
    return metricsStore.getValues()
  }

  private static dispatchCustomEvent(): void {
    const event = document.createEvent('Events')
    event.initEvent('custom-contentful-paint', false, true)
    document.dispatchEvent(event)
  }

  setStartMark(markName: string) {
    setMark(`${markName}_start`)
  }

  setEndMark(markName: string) {
    setMark(`${markName}_end`)

    if (hasMark(`${markName}_start`)) {
      const value = measure(`${markName}Metrics`, markName)
      this.clearMark(markName)

      const metrics = { name: `${markName}Metrics`, value }

      reporter(metrics)

      metricsStore.set(`${markName}Metrics`, metrics)
    } else {
      const value = getMark(`${markName}_end`)?.startTime
      this.clearMark(markName)

      const metrics = { name: `${markName}Metrics`, value }
      reporter(metrics)

      metricsStore.set(`${markName}Metrics`, metrics)
    }
  }

  clearMark(markName: string) {
    clearMark(`${markName}_start`)
    clearMark(`${markName}_end`)
  }

  customContentfulPaint() {
    setTimeout(() => WebVitals.dispatchCustomEvent())
  }
}

export { WebVitals }
