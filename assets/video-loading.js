class VideoLoading {
  constructor () {
    this.config = {
      selectors: {
        container: '[data-video-container]',
        iframe: '[data-video-iframe]'
      },
      classes: {
        iframe: 'video-iframe',
        loaded: 'video-loaded',
        video: 'images__video'
      },
      size: {
        width: 1920,
        height: 1080
      },
      timing: {
        autoplayDelay: 500,
        slowConnectionDelay: 1500
      },
      cache: {
        ttl: 300000
      },
      cdn: {
        youtube: 'https://www.youtube.com',
        vimeo: 'https://player.vimeo.com'
      }
    }

    this.cache = new Map()
    this.cacheTime = 0
    this.currentSlideIndex = 1
    this.estimatedTimes = new Map()
    this.lastSlideChangeTime = 0
    this.loadedVideos = new Set()
    this.pendingTimeRequests = new Set()
    this.periodicTracker = null
    this.resizeHandler = null
    this.slideChangeThrottle = 50
    this.slowConnectionCache = null
    this.videoStartTimes = new Map()
    this.videoStates = new Map()
  }

  init () {
    this.elements()

    if (!this.containers || !this.containers.length) return null

    this.setupGlobalMessageListener()
    this.processVideos()
    this.events()

    return this.cleanup.bind(this)
  }

  elements () {
    this.containers = document.querySelectorAll(this.config.selectors.container)
  }

  events () {
    this.resizeHandler = this.debounce(() => {
      this.clearDeviceCache()
    }, 300)

    window.addEventListener('resize', this.resizeHandler, { passive: true })
  }

  processVideos () {
    this.containers.length > 3 ?
      this.loadInChunks(this.containers) :
      this.processContainers(this.containers)
  }

  setupGlobalMessageListener () {
    this.globalMessageHandler = (event) => {
      try {
        const data = JSON.parse(event.data),
          info = data.info,
          isDelivery = data.event === 'infoDelivery',
          isNumber = typeof data.info?.currentTime === 'number'

        if (!isDelivery || !info || !isNumber) return

        // Only save to the active slide that's currently playing
        const activeSlideIndex = this.currentSlideIndex
        if (activeSlideIndex > 0 && activeSlideIndex <= this.containers.length) {
          const container = this.containers[activeSlideIndex - 1],
            iframe = container?.querySelector(this.config.selectors.iframe),
            videoUrl = container?.dataset.videoUrl

          if (iframe && iframe.src && iframe.src.includes('youtube') && videoUrl) {
            // Only save if this is a better/newer timestamp
            const currentTime = data.info.currentTime,
              existingState = this.videoStates.get(videoUrl)

            if (this.shouldSaveState(existingState, currentTime, 'global_api')) {
              const options = {
                currentTime: currentTime,
                slideIndex: activeSlideIndex,
                timestamp: Date.now(),
                global: true,
                source: 'global_api'
              }
              this.videoStates.set(videoUrl, options)
            }
          }
        }
      } catch {
        // Ignore parsing errors from other postMessage sources
      }
    }

    window.addEventListener('message', this.globalMessageHandler)
  }

  updateActiveSlide (slideIndex) {
    if (this.currentSlideIndex === slideIndex) return

    const now = Date.now()
    if (now - this.lastSlideChangeTime < this.slideChangeThrottle) return

    this.lastSlideChangeTime = now

    const previousSlideIndex = this.currentSlideIndex
    this.currentSlideIndex = slideIndex

    // CRITICAL: Save current video state BEFORE any destruction
    this.saveCurrentVideoState(previousSlideIndex)

    this.startPeriodicTracking(slideIndex)

    // Wait longer for state to be saved, then proceed with memory management
    setTimeout(() => {
      const videosToKeep = new Set(),
        videosToDestroy = new Set()

      this.containers.forEach((_container, containerIndex) => {
        const videoSlideIndex = containerIndex + 1,
          shouldKeep = this.shouldVideoBeLoaded(containerIndex, slideIndex)

        if (shouldKeep) {
          videosToKeep.add(videoSlideIndex)
        } else if (this.loadedVideos.has(videoSlideIndex)) {
          videosToDestroy.add(videoSlideIndex)
        }
      })

      // Process video management: destroy, save state, and load new videos
      const newLoads = []

      videosToDestroy.forEach((videoSlideIndex) => {
        const containerIndex = videoSlideIndex - 1
        const container = this.containers[containerIndex]
        if (container) {
          this.saveVideoState(container, videoSlideIndex)
          this.destroyVideoIframe(container, videoSlideIndex)
        }
      })

      videosToKeep.forEach((videoSlideIndex) => {
        if (!this.loadedVideos.has(videoSlideIndex)) {
          const containerIndex = videoSlideIndex - 1
          const container = this.containers[containerIndex]
          if (container) {
            newLoads.push(videoSlideIndex)
            this.loadVideo(container)
          }
        }
      })
    }, 500)
  }

  startPeriodicTracking (activeSlideIndex) {
    if (this.periodicTracker) clearInterval(this.periodicTracker)

    this.periodicTracker = setInterval(() => {
      for (let offset = -1; offset <= 1; offset++) {
        const slideIndex = activeSlideIndex + offset
        if (slideIndex < 1 || slideIndex > this.containers.length) continue

        const containerIndex = slideIndex - 1,
          container = this.containers[containerIndex]
        if (!container) continue

        const iframe = container.querySelector(this.config.selectors.iframe)
        if (!this.isValidIframe(iframe)) return

        try {
          if (iframe.src.includes('youtube')) {
            this.sendYouTubeCommand(iframe, 'getCurrentTime')
          }
        } catch {
          // Ignore errors - this is periodic tracking
        }
      }
    }, 2000)
  }

  saveCurrentVideoState (slideIndex) {
    if (!slideIndex || slideIndex < 1) return

    const containerIndex = slideIndex - 1
    if (containerIndex >= this.containers.length) return

    const container = this.containers[containerIndex],
      iframe = container?.querySelector(this.config.selectors.iframe)

    if (!this.isValidIframe(iframe)) return
    this.requestVideoTime(iframe, container.dataset.videoUrl, slideIndex)
  }

  shouldVideoBeLoaded (containerIndex, activeIndex) {
    const slideIndex = containerIndex + 1,
      totalSlides = this.containers.length

    const distance = Math.min(
      Math.abs(slideIndex - activeIndex),
      Math.abs(slideIndex - activeIndex + totalSlides),
      Math.abs(slideIndex - activeIndex - totalSlides)
    )

    return distance <= 1 // Load: prev (distance=1), current (distance=0), next (distance=1)
  }

  saveVideoState (container, slideIndex) {
    const iframe = container.querySelector(this.config.selectors.iframe),
      videoUrl = container.dataset.videoUrl

    if (!this.isValidIframe(iframe)) return
    if (!videoUrl) return

    // Use estimated time as fallback for blocked YouTube API
    const estimatedTime = this.getEstimatedVideoTime(videoUrl)
    if (estimatedTime > 0 && estimatedTime < 7200 && estimatedTime !== Infinity) {
      const currentState = this.videoStates.get(videoUrl)

      if (this.shouldSaveState(currentState, estimatedTime, 'estimated')) {
        const options = {
          currentTime: estimatedTime,
          slideIndex: slideIndex,
          timestamp: Date.now(),
          estimated: true,
          source: 'estimated'
        }
        this.videoStates.set(videoUrl, options)
      }
    }

    this.requestVideoTime(iframe, videoUrl, slideIndex)
  }

  getEstimatedVideoTime (videoUrl) {
    const startTime = this.videoStartTimes.get(videoUrl),
      estimatedTime = this.estimatedTimes.get(videoUrl)

    if (!startTime) return estimatedTime || 0

    const playDuration = (Date.now() - startTime) / 1000,
      lastEstimatedTime = estimatedTime || 0

    return lastEstimatedTime + playDuration
  }

  startEstimatedTimeTracking (videoUrl, initialTime = 0) {
    this.videoStartTimes.set(videoUrl, Date.now())
    this.estimatedTimes.set(videoUrl, initialTime)
  }

  stopEstimatedTimeTracking (videoUrl) {
    const finalTime = this.getEstimatedVideoTime(videoUrl)
    // Ensure the time is reasonable before saving
    if (finalTime > 0 && finalTime < 7200) {
      this.estimatedTimes.set(videoUrl, finalTime)
    }
    this.videoStartTimes.delete(videoUrl)
    return finalTime
  }

  requestVideoTime (iframe, videoUrl, slideIndex) {
    if (!iframe || !videoUrl) return

    const requestKey = `${videoUrl}-${slideIndex}`
    this.pendingTimeRequests.add(requestKey)

    try {
      if (iframe.src.includes('youtube')) {
        this.setupYouTubePlayerReady(iframe, videoUrl, slideIndex, requestKey)
      } else if (iframe.src.includes('vimeo')) {
        this.setupVimeoTimeSyncListener(videoUrl, slideIndex, requestKey)
        iframe.contentWindow.postMessage('{"method":"getCurrentTime"}', '*')
      }
    } catch {
      this.pendingTimeRequests.delete(requestKey)
    }
  }

  setupYouTubePlayerReady (iframe, videoUrl, slideIndex, requestKey) {
    const maxAttempts = 20
    let playerReady = false,
      readyAttempts = 0

    this.setupYouTubeTimeSyncListener(videoUrl, slideIndex, requestKey)

    const readyListener = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.event === 'onReady' || data.event === 'video-progress') {
          playerReady = true

          setTimeout(() => this.sendYouTubeCommand(iframe, 'getCurrentTime'), 100)
        }
      } catch {
        // Ignore non-JSON messages
      }
    }

    window.addEventListener('message', readyListener)

    const pollForReady = () => {
      readyAttempts++

      if (playerReady || readyAttempts >= maxAttempts) {
        window.removeEventListener('message', readyListener)
        this.pendingTimeRequests.delete(requestKey)
        return
      }

      try {
        this.sendYouTubeCommand(iframe, 'listening', '', 'widget', 'widget')
        this.sendYouTubeCommand(iframe, 'getCurrentTime')

        setTimeout(pollForReady, 500)
      } catch {
        // Ignore polling errors
      }
    }

    setTimeout(pollForReady, 1000)
  }

  setupYouTubeTimeSyncListener (videoUrl, slideIndex, requestKey) {
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data),
          info = data.info,
          isDelivery = data.event === 'infoDelivery',
          isNumber = typeof info.currentTime === 'number'

        if (isDelivery && info && isNumber) {
          const currentTime = info.currentTime,
            existingState = this.videoStates.get(videoUrl)

          if (this.shouldSaveState(existingState, currentTime, 'sync_api')) {
            const options = {
              currentTime: currentTime,
              slideIndex: slideIndex,
              timestamp: Date.now(),
              priority: true,
              source: 'sync_api'
            }
            this.videoStates.set(videoUrl, options)
          }

          this.pendingTimeRequests.delete(requestKey)
          window.removeEventListener('message', handleMessage)
        }
      } catch {
        // Ignore parsing errors from other postMessage sources
      }
    }
    window.addEventListener('message', handleMessage)
    setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      this.pendingTimeRequests.delete(requestKey)
    }, 5000)
  }

  setupVimeoTimeSyncListener (videoUrl, slideIndex, requestKey) {
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data),
          isNumber = typeof data.data === 'number',
          isTimeUpdate = data.event === 'timeupdate'

        if (isTimeUpdate && isNumber) {
          const currentTime = data.data,
            existingState = this.videoStates.get(videoUrl)

          if (this.shouldSaveState(existingState, currentTime, 'vimeo_api')) {
            const options = {
              currentTime: currentTime,
              slideIndex: slideIndex,
              timestamp: Date.now(),
              priority: true,
              source: 'vimeo_api'
            }
            this.videoStates.set(videoUrl, options)
          }

          this.pendingTimeRequests.delete(requestKey)
          window.removeEventListener('message', handleMessage)
        }
      } catch {
        // Ignore parsing errors from other postMessage sources
      }
    }
    window.addEventListener('message', handleMessage)
    setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      this.pendingTimeRequests.delete(requestKey)
    }, 5000)
  }

  destroyVideoIframe (container, slideIndex) {
    const videoUrl = container.dataset.videoUrl

    if (videoUrl) {
      const finalTime = this.stopEstimatedTimeTracking(videoUrl)
      if (finalTime <= 0 || finalTime >= 7200) return

      const options = {
        currentTime: finalTime,
        slideIndex: slideIndex,
        timestamp: Date.now(),
        estimated: true
      }
      this.videoStates.set(videoUrl, options)
    }

    const iframe = container.querySelector(this.config.selectors.iframe)
    if (iframe) {
      iframe.src = 'about:blank'
      iframe.remove()
    }

    container.classList.remove(this.config.classes.loaded)

    this.loadedVideos.delete(slideIndex)
  }

  processContainers (containers) {
    const processQueue = []

    Array.from(containers).forEach((container, containerIndex) => {
      const videoUrl = container.dataset.videoUrl
      if (!videoUrl) return

      const result = this.parseVideoUrl(videoUrl)
      if (!result || !result.platform || !result.videoId) return

      const options = {
        container,
        containerIndex,
        videoId: result.videoId,
        platform: result.platform
      }
      processQueue.push(options)
    })

    this.batchProcess(() => {
      const slowConnection = this.isSlowConnection(),
        initialVideosToLoad = []

      processQueue.forEach(({ container, containerIndex }) => {
        // Only load videos within the 3-video window initially (with circular logic)
        if (this.shouldVideoBeLoaded(containerIndex, this.currentSlideIndex)) {
          this.loadVideo(container, slowConnection)
          initialVideosToLoad.push(containerIndex + 1)
        }
      })
    })
  }

  loadInChunks (containers) {
    const chunkSize = 5,
      totalContainers = containers.length

    const loadChunk = (startIndex) => {
      const endIndex = Math.min(startIndex + chunkSize, totalContainers),
        chunk = Array.from(containers).slice(startIndex, endIndex)

      this.batchProcess(() => this.processContainers(chunk))

      if (endIndex >= totalContainers) return

      this.requestIdle(() => loadChunk(endIndex), { timeout: 500 })
    }

    loadChunk(0)
  }

  parseVideoUrl (url) {
    const cached = this.getFromCache(`parsed-${url}`)
    if (cached) return cached

    let platform = null,
      videoId = null

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      platform = 'youtube'
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/
      ]
      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) {
          videoId = match[1]
          break
        }
      }
    } else if (url.includes('vimeo.com')) {
      platform = 'vimeo'
      const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
      videoId = match ? match[1] : null
    }

    const result = { platform, videoId }
    if (platform && videoId) {
      this.setCache(`parsed-${url}`, result)
    }

    return result
  }

  createVideoIframe (container, videoId, platform, isSlowConnection = null) {
    const slowConnection = isSlowConnection ?? this.isSlowConnection(),
      videoUrl = container.dataset.videoUrl,
      slideIndex = Array.from(this.containers).indexOf(container) + 1,
      savedState = this.videoStates.get(videoUrl)

    const isStateValid = savedState &&
      savedState.currentTime > 0 &&
      savedState.currentTime < 7200 && // Max 2 hours
      (Date.now() - savedState.timestamp) < 300000 // Max 5 minutes old

    const startTime = isStateValid ? savedState.currentTime : 0

    if (!isStateValid) {
      if (savedState) this.videoStates.delete(videoUrl)
    }

    const iframe = this.createIframe(videoId, platform, slowConnection, startTime)

    if (!iframe) return

    const handleIframeLoad = () => {
      container.classList.add(this.config.classes.loaded)

      this.loadedVideos.add(slideIndex)

      const initialTime = savedState ? savedState.currentTime : 0
      this.startEstimatedTimeTracking(videoUrl, initialTime)

      // If we have a valid saved time, handle it properly
      if (isStateValid && startTime > 0) {
        this.waitForPlayerReady(iframe, platform, () => {
          const latestState = this.videoStates.get(videoUrl)
          const finalTime = latestState && latestState.currentTime > startTime ? latestState.currentTime : startTime

          this.seekToTime(iframe, finalTime, platform)

          setTimeout(() => this.playVideo(iframe, platform), 500)
        })
      } else if (startTime === 0) {
        // Only auto-play if no start time (new videos)
        this.waitForPlayerReady(iframe, platform, () => {
          this.playVideo(iframe, platform)
        })
      }
    }

    iframe.addEventListener('load', handleIframeLoad, { once: true, passive: true })
    container.appendChild(iframe)
  }

  waitForPlayerReady (iframe, platform, callback) {
    let attempts = 0
    const maxAttempts = 20,
      checkInterval = 250

    const checkReady = () => {
      attempts++

      if (attempts >= maxAttempts) {
        console.warn(`Player ready timeout after ${maxAttempts} attempts`)
        callback() // Execute anyway
        return
      }

      try {
        if (platform === 'youtube') {
          this.sendYouTubeCommand(iframe, 'listening', '', 'widget', 'widget')

          const readyListener = (event) => {
            try {
              const data = JSON.parse(event.data)
              if (data.event === 'onReady' || data.event === 'video-progress') {
                window.removeEventListener('message', readyListener)
                callback()
                return
              }
            } catch {
              // Ignore parsing errors
            }
          }

          window.addEventListener('message', readyListener)

          setTimeout(() => {
            window.removeEventListener('message', readyListener)
          }, checkInterval)

          setTimeout(checkReady, checkInterval)
        } else if (platform === 'vimeo') {
          setTimeout(callback, 500)
        }
      } catch {
        setTimeout(checkReady, checkInterval)
      }
    }

    setTimeout(checkReady, 500)
  }

  seekToTime (iframe, time, platform) {
    try {
      if (platform === 'youtube') {
        this.sendYouTubeCommand(iframe, 'seekTo', [time, true])
      } else if (platform === 'vimeo') {
        iframe.contentWindow.postMessage(`{"method":"setCurrentTime","value":${time}}`, '*')
      }
    } catch (e) {
      console.warn('Failed to seek video:', e)
    }
  }

  playVideo (iframe, platform = null) {
    try {
      if (iframe && iframe.contentWindow && iframe.src) {
        const detectedPlatform = platform || (iframe.src.includes('youtube') ? 'youtube' : 'vimeo')

        if (detectedPlatform === 'youtube') {
          this.sendYouTubeCommand(iframe, 'playVideo')
        } else if (detectedPlatform === 'vimeo') {
          iframe.contentWindow.postMessage('{"method":"play"}', '*')
        }
      }
    } catch (e) {
      console.warn('Video play failed:', e)
    }
  }

  createIframe (videoId, platform, slowConnection = false, startTime = 0) {
    const iframe = document.createElement('iframe')
    iframe.allowFullscreen = true
    iframe.className = `${this.config.classes.video} ${this.config.classes.iframe}`
    iframe.dataset.videoIframe = 'true'
    iframe.setAttribute('frameborder', '0')
    iframe.setAttribute('loop', true)
    iframe.setAttribute('muted', true)
    iframe.setAttribute('playsinline', true)
    iframe.width = `${this.config.size.width}`
    iframe.height = `${this.config.size.height}`

    if (platform === 'youtube') {
      // Don't autoplay if we have a start time - we'll handle playback manually
      const shouldAutoplay = startTime > 0 ? '0' : '1'

      const params = new URLSearchParams({
        autoplay: shouldAutoplay,
        controls: '0',
        disablekb: '1',
        enablejsapi: '1',
        fs: '0',
        iv_load_policy: '3',
        modestbranding: '1',
        mute: '1',
        loop: '1',
        playlist: videoId,
        playsinline: '1',
        rel: '0',
        showinfo: '0'
      })

      if (slowConnection) params.set('vq', 'small')
      if (startTime > 0) params.set('start', Math.floor(startTime))

      iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`
      iframe.allow = 'autoplay; muted; encrypted-media; fullscreen'
      iframe.setAttribute('autoplay', shouldAutoplay === '1')
    } else if (platform === 'vimeo') {
      // Don't autoplay if we have a start time - we'll handle playback manually
      const shouldAutoplay = startTime > 0 ? '0' : '1'

      const params = new URLSearchParams({
        autopause: '0',
        autoplay: shouldAutoplay,
        background: '1',
        controls: '0',
        loop: '1',
        muted: '1'
      })

      if (slowConnection) params.set('quality', 'auto')

      iframe.src = `https://player.vimeo.com/video/${videoId}?${params.toString()}`
      iframe.allow = 'autoplay; fullscreen'
      iframe.setAttribute('autoplay', shouldAutoplay === '1')
    }

    return iframe
  }

  loadVideo (container, isSlowConnection = null) {
    if (container.classList.contains(this.config.classes.loaded)) return

    const videoUrl = container.dataset.videoUrl
    if (!videoUrl) return

    const slideIndex = Array.from(this.containers).indexOf(container) + 1

    if (this.loadedVideos.has(slideIndex)) return

    // Check if there's already an iframe to prevent multiple loads
    const existingIframe = container.querySelector(this.config.selectors.iframe)
    if (existingIframe) {
      this.loadedVideos.add(slideIndex)
      container.classList.add(this.config.classes.loaded)
      return
    }

    const result = this.parseVideoUrl(videoUrl)
    if (!result || !result.platform || !result.videoId) {
      console.warn('VideoLoading: Invalid video URL or unsupported platform', videoUrl)
      return
    }

    // Mark as loading immediately to prevent duplicates
    this.loadedVideos.add(slideIndex)

    const { platform, videoId } = result
    const slowConnection = isSlowConnection ?? this.isSlowConnection()
    const delay = slowConnection ?
      this.config.timing.slowConnectionDelay :
      this.config.timing.autoplayDelay

    this.requestIdle(() => {
      this.batchProcess(() => {
        this.createVideoIframe(container, videoId, platform, slowConnection)
      })
    }, { timeout: delay })
  }

  isSlowConnection () {
    const now = Date.now()
    if (this.slowConnectionCache !== null && (now - this.cacheTime) < 5000) {
      return this.slowConnectionCache
    }

    const connection = navigator.connection
    this.slowConnectionCache = connection ?
      (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') :
      false
    this.cacheTime = now

    return this.slowConnectionCache
  }

  clearDeviceCache () {
    this.slowConnectionCache = null
    this.cacheTime = 0
  }

  getFromCache (key) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.config.cache.ttl) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  setCache (key, data) {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  clearCache () {
    this.cache.clear()
  }

  batchProcess (callback) {
    if (window.requestAnimationFrame) {
      return window.requestAnimationFrame(callback)
    }
    return callback()
  }

  requestIdle (callback, options = {}) {
    if ('requestIdleCallback' in window) {
      return window.requestIdleCallback(callback, options)
    }
    const timeout = options.timeout || 50,
      startTime = Date.now()
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - startTime))
      })
    }, timeout)
  }

  debounce (func, wait) {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        clearTimeout(timeout)
        func(...args)
      }, wait)
    }
  }

  cleanup () {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = null
    }

    if (this.globalMessageHandler) {
      window.removeEventListener('message', this.globalMessageHandler)
      this.globalMessageHandler = null
    }

    this.batchProcess(() => {
      document.querySelectorAll(this.config.selectors.iframe).forEach((iframe) => {
        iframe.src = 'about:blank'
        iframe.remove()
      })
    })

    if (this.periodicTracker) {
      clearInterval(this.periodicTracker)
      this.periodicTracker = null
    }

    this.clearDeviceCache()
    this.clearCache()
    this.videoStates.clear()
    this.loadedVideos.clear()
    this.pendingTimeRequests.clear()
    this.estimatedTimes.clear()
    this.videoStartTimes.clear()

    return null
  }

  // Helper methods
  isValidIframe (iframe) {
    return iframe && iframe.src && !iframe.src.includes('about:blank')
  }

  sendYouTubeCommand (iframe, func, args = '', id = '', channel = '') {
    if (!iframe || !iframe.contentWindow) return

    let message
    if (func === 'listening') {
      message = `{"event":"${func}","id":"${id}","channel":"${channel}"}`
    } else {
      const argsStr = Array.isArray(args) ? JSON.stringify(args) : (args ? `"${args}"` : '""')
      message = `{"event":"command","func":"${func}","args":${argsStr}}`
    }

    iframe.contentWindow.postMessage(message, '*')
  }

  shouldSaveState (existingState, newTime, source) {
    if (!existingState) return true

    if (newTime > existingState.currentTime) return true // Always prefer later timestamps

    if (existingState.estimated && source !== 'estimated') return true // Prefer API data over estimated data

    if (source === 'estimated' && existingState.estimated && newTime > existingState.currentTime) return true // Only save if it's better than existing estimated data

    const maxAge = source === 'estimated' ? 5000 : 2000 // Save if existing state is old (more than 2-5 seconds depending on source)
    if ((Date.now() - existingState.timestamp) > maxAge) return true

    return false
  }


  // Public method for carousel to call when slide changes
  onSlideChange (slideIndex) {
    this.updateActiveSlide(slideIndex)
  }
}

const initVideoLoading = () => {
  const videoLoading = new VideoLoading(),
    cleanup = videoLoading.init()

  window.videoLoadingInstance = videoLoading

  if (cleanup && window.themeCleanup) {
    const videoCleanup = window.themeCleanup
    window.themeCleanup = () => {
      cleanup()
      videoCleanup()
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVideoLoading)
} else {
  initVideoLoading()
}
