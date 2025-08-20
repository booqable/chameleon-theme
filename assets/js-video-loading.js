/**
 * VideoLoading Component
 *
 * Handles loading of background videos with poster images and lazy loading.
 * Optimizes initial load and uses IntersectionObserver for performance.
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
 */

const VideoHelpers = {
  execute (fn) {
    return $.batchDOM?.(fn) || fn()
  },

  slowly (isSlowConnection) {
    return isSlowConnection ?? VideoDevice.isSlowConnection()
  },

  cleanupElements (selector, cleanupFn = null) {
    document.querySelectorAll(selector).forEach((element) => {
      if (cleanupFn) cleanupFn(element)
      element.remove()
    })
  },

  safely (fn, operation, context = null, fallback = null) {
    try {
      return fn()
    } catch (error) {
      console.warn(`VideoLoader: ${operation}`, context, error)
      return fallback
    }
  },

  handleError (moduleName, operation, error, fallback = null) {
    console.warn(`${moduleName}: Failed to ${operation}`, error)
    return fallback
  },

  getContainerElements (slideIndex = null) {
    try {
      const containers = VideoDOMCache.getContainers()

      if (slideIndex !== null) {
        const container = containers[slideIndex - 1]
        if (!container) return null

        return {
          container,
          iframe: container.querySelector(VideoConfig.selectors.iframe),
          videoUrl: container.dataset.videoUrl
        }
      }

      return { containers }
    } catch (error) {
      console.warn('VideoHelpers: Failed to get container elements', error)
      return null
    }
  },

  detectPlatform (iframe) {
    if (!iframe || !iframe.src) return null
    if (iframe.src.includes('youtube')) return 'youtube'
    if (iframe.src.includes('vimeo')) return 'vimeo'
    return null
  },

  isValidVideoState (state) {
    if (!state) return false

    return state.currentTime > 0 &&
      state.currentTime < VideoConfig.timing.maxVideoLength &&
      (Date.now() - state.timestamp) < VideoConfig.timing.stateValidityTimeout
  },

  isValidVideoTime (time) {
    return time > 0 && time < VideoConfig.timing.maxVideoLength && time !== Infinity
  },

  isValidIframe (iframe) {
    return iframe && iframe.src && !iframe.src.includes('about:blank')
  },

  createThrottler (throttleTime) {
    let lastTime = 0
    return () => {
      const now = Date.now()
      if (now - lastTime < throttleTime) return true
      lastTime = now
      return false
    }
  },

  createTTLCache (ttl) {
    const cache = new Map()
    return {
      get (key) {
        const cached = cache.get(key)
        if (cached && Date.now() - cached.timestamp < ttl) {
          return cached.data
        }
        cache.delete(key)
        return null
      },

      set (key, data) {
        cache.set(key, { data, timestamp: Date.now() })
      },

      cleanup () {
        const now = Date.now()
        for (const [key, entry] of cache.entries()) {
          if (now - entry.timestamp > ttl) {
            cache.delete(key)
          }
        }
      },

      clear () {
        cache.clear()
      },

      get size () {
        return cache.size
      }
    }
  },

  clampIndex (index, max) {
    return Math.max(0, Math.min(index, max))
  },

  getNextIndex (currentIndex, maxIndex, isInfinite = true) {
    if (currentIndex < maxIndex) return currentIndex + 1
    return isInfinite ? 0 : maxIndex
  },

  getPrevIndex (currentIndex, maxIndex, isInfinite = true) {
    if (currentIndex > 0) return currentIndex - 1
    return isInfinite ? maxIndex : 0
  },

  slideIndexToContainerIndex (slideIndex) {
    return slideIndex - 1
  },

  containerIndexToSlideIndex (containerIndex) {
    return containerIndex + 1
  }
}

const VideoConfig = {
  selectors: {
    container: '[data-video-container]',
    iframe: '[data-video-iframe]',
    poster: '[data-video-poster]'
  },
  attr: {
    videoContainer: 'data-video-container',
    videoIframe: 'data-video-iframe',
    videoPoster: 'data-video-poster',
    videoUrl: 'data-video-url'
  },
  classes: {
    container: 'video-container',
    iframe: 'video-iframe',
    loaded: 'video-loaded',
    poster: 'video-poster',
    posterLoaded: 'video-poster-loaded',
    video: 'images__video'
  },
  size: {
    width: 1920,
    height: 1080
  },
  timing: {
    autoplayDelay: 500,
    fadeOutDelay: 300,
    maxVideoLength: 7200,
    stateValidityTimeout: 300000,
    slowConnectionDelay: 1500,
    trackingInterval: 2000,
    throttleTime: 2500
  },
  cache: {
    data: new Map(),
    ttl: 300000
  },
  cdn: {
    youtube: 'https://www.youtube.com',
    youtubeThumbnail: 'https://img.youtube.com',
    vimeo: 'https://player.vimeo.com',
    vimeoThumbnail: 'https://vumbnail.com'
  }
}

const VideoCache = VideoHelpers.createTTLCache(VideoConfig.cache.ttl)

const VideoStateManager = {
  currentSlideIndex: 1,
  estimatedTimes: new Map(),
  loadedVideos: new Set(),
  pendingRequests: new Set(),
  videoStartTimes: new Map(),
  videoStates: new Map(),
  throttler: null,

  init () {
    this.throttler = VideoHelpers.createThrottler(VideoConfig.timing.throttleTime)
  },

  saveVideoState (videoUrl, currentTime, slideIndex, source = 'api') {
    try {
      const existingState = this.videoStates.get(videoUrl)
      if (!this.shouldSaveState(existingState, currentTime, source)) return

      const stateData = {
        currentTime,
        source,
        priority: source !== 'estimated',
        slideIndex,
        timestamp: Date.now()
      }

      this.videoStates.set(videoUrl, stateData)
    } catch (error) {
      return VideoHelpers.handleError('VideoStateManager', 'save video state', error)
    }
  },

  getVideoState (videoUrl) {
    try {
      const state = this.videoStates.get(videoUrl)
      if (!state) return null

      if (!VideoHelpers.isValidVideoState(state)) {
        this.videoStates.delete(videoUrl)
        return null
      }

      return state
    } catch (error) {
      return VideoHelpers.handleError('VideoStateManager', 'get video state', error, null)
    }
  },

  shouldSaveState (existingState, newTime, source) {
    if (!existingState) return true
    if (newTime > existingState.currentTime) return true
    if (existingState.source === 'estimated' && source !== 'estimated') return true
    if (source === 'estimated' && existingState.source === 'estimated' && newTime > existingState.currentTime) return true

    const maxAge = source === 'estimated' ? 5000 : 2000
    if ((Date.now() - existingState.timestamp) > maxAge) return true

    return false
  },

  startEstimatedTracking (videoUrl, initialTime = 0) {
    try {
      this.videoStartTimes.set(videoUrl, Date.now())
      this.estimatedTimes.set(videoUrl, initialTime)
    } catch (error) {
      return VideoHelpers.handleError('VideoStateManager', 'start estimated tracking', error)
    }
  },

  getEstimatedTime (videoUrl) {
    try {
      const startTime = this.videoStartTimes.get(videoUrl),
        estimatedTime = this.estimatedTimes.get(videoUrl)

      if (!startTime) return estimatedTime || 0

      const playDuration = (Date.now() - startTime) / 1000,
        lastEstimatedTime = estimatedTime || 0

      return lastEstimatedTime + playDuration
    } catch (error) {
      return VideoHelpers.handleError('VideoStateManager', 'get estimated time', error, 0)
    }
  },

  stopEstimatedTracking (videoUrl) {
    try {
      const finalTime = this.getEstimatedTime(videoUrl)
      if (VideoHelpers.isValidVideoTime(finalTime)) {
        this.estimatedTimes.set(videoUrl, finalTime)
      }
      this.videoStartTimes.delete(videoUrl)
      return finalTime
    } catch (error) {
      return VideoHelpers.handleError('VideoStateManager', 'stop estimated tracking', error, 0)
    }
  },

  updateCurrentSlide (slideIndex) {
    this.currentSlideIndex = slideIndex
  },

  throttlingNavigation () {
    if (!this.throttler) this.init()
    return this.throttler()
  },

  isVideoLoaded (slideIndex) {
    return this.loadedVideos.has(slideIndex)
  },

  markVideoLoaded (slideIndex) {
    this.loadedVideos.add(slideIndex)
  },

  markVideoUnloaded (slideIndex) {
    this.loadedVideos.delete(slideIndex)
  },

  cleanup () {
    this.videoStates.clear()
    this.loadedVideos.clear()
    this.estimatedTimes.clear()
    this.videoStartTimes.clear()
    this.pendingRequests.clear()
    this.currentSlideIndex = 1
    this.throttler = null
  }
}

const VideoVisibility = {
  observer: null,
  observerSetup: false,

  setIntersectionObserver () {
    if (this.observerSetup) return this.observer

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        VideoLoader.loadVideo(entry.target)
        this.unobserve(entry.target)
      })
    }

    this.observer = $.intersectionObserver(observerCallback, {
      threshold: 0.1
    })
    this.observerSetup = true

    return this.observer
  },

  cleanup () {
    this.observer.disconnect()
    this.observer = null
    this.observerSetup = false
  },

  observe (el) {
    this.observer.observe(el)
  },

  unobserve (el) {
    this.observer.unobserve(el)
  }
}

const VideoDevice = {
  cachedIsSlowConnection: null,
  cacheTime: 0,
  cacheTimeout: 5000,

  isSlowConnection () {
    const now = Date.now()
    if (this.cachedIsSlowConnection !== null && (now - this.cacheTime) < this.cacheTimeout) {
      return this.cachedIsSlowConnection
    }

    this.cachedIsSlowConnection = $.slowConnection() || false
    this.cacheTime = now
    return this.cachedIsSlowConnection
  },

  clearCache () {
    this.cachedIsSlowConnection = null
    this.cacheTime = 0
  }
}

const VideoPreconnect = {
  connected: new Set(),

  addPreconnect (hostname) {
    if (this.connected.has(hostname)) return

    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = hostname
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)

    this.connected.add(hostname)
  },

  setupForPlatform (platform) {
    if (platform === 'youtube') {
      this.addPreconnect(VideoConfig.cdn.youtube)
      this.addPreconnect(VideoConfig.cdn.youtubeThumbnail)
    } else if (platform === 'vimeo') {
      this.addPreconnect(VideoConfig.cdn.vimeo)
      this.addPreconnect(VideoConfig.cdn.vimeoThumbnail)
    }
  },

  cleanup () {
    this.connected.clear()
  }
}

const VideoPlayback = {
  commands: {
    youtube: {
      play: 'playVideo',
      pause: 'pauseVideo',
      seek: 'seekTo',
      getCurrentTime: 'getCurrentTime'
    },
    vimeo: {
      play: 'play',
      pause: 'pause',
      seek: 'setCurrentTime',
      getCurrentTime: 'getCurrentTime'
    }
  },

  executeCommand (iframe, command, args = null, platform = null) {
    try {
      const detectedPlatform = platform || VideoHelpers.detectPlatform(iframe)
      if (!detectedPlatform || !this.commands[detectedPlatform]) {
        return VideoHelpers.handleError('VideoPlayback', `execute command on unsupported platform: ${detectedPlatform}`, new Error('Unsupported platform'))
      }

      const platformCommand = this.commands[detectedPlatform][command]
      if (!platformCommand) {
        return VideoHelpers.handleError('VideoPlayback', `execute unknown command '${command}' for platform '${detectedPlatform}'`, new Error('Unknown command'))
      }

      if (detectedPlatform === 'youtube') {
        this.sendYouTubeCommand(iframe, platformCommand, args)
      } else if (detectedPlatform === 'vimeo') {
        const message = args !== null ?
          `{"method":"${platformCommand}","value":${args}}` :
          `{"method":"${platformCommand}"}`
        iframe.contentWindow.postMessage(message, '*')
      }
    } catch (error) {
      return VideoHelpers.handleError('VideoPlayback', `execute ${command}`, error)
    }
  },

  playVideo (iframe, platform = null) {
    this.executeCommand(iframe, 'play', null, platform)
  },

  pauseVideo (iframe, platform = null) {
    this.executeCommand(iframe, 'pause', null, platform)
  },

  seekToTime (iframe, time, platform = null) {
    const args = platform === 'youtube' ? [time, true] : time
    this.executeCommand(iframe, 'seek', args, platform)
  },

  getCurrentTime (iframe, platform = null) {
    this.executeCommand(iframe, 'getCurrentTime', null, platform)
  },

  sendYouTubeCommand (iframe, func, args = '', id = '', channel = '') {
    try {
      if (!iframe || !iframe.contentWindow) return

      let message
      if (func === 'listening') {
        message = `{"event":"${func}","id":"${id}","channel":"${channel}"}`
      } else {
        const argsStr = Array.isArray(args) ? JSON.stringify(args) : (args ? `"${args}"` : '""')
        message = `{"event":"command","func":"${func}","args":${argsStr}}`
      }

      iframe.contentWindow.postMessage(message, '*')
    } catch (error) {
      return VideoHelpers.handleError('VideoPlayback', 'send YouTube command', error)
    }
  }
}

const VideoAPITracker = {
  periodicTracker: null,
  messageHandler: null,

  startPeriodicTracking () {
    try {
      if (this.periodicTracker) {
        clearInterval(this.periodicTracker)
      }

      this.setupGlobalMessageListener()

      this.periodicTracker = setInterval(() => {
        const { containers } = VideoHelpers.getContainerElements() || {}
        if (!containers) return

        const currentSlide = VideoStateManager.currentSlideIndex,
          totalSlides = containers.length,
          nextSlide = currentSlide === totalSlides ? 1 : currentSlide + 1,
          slidesToTrack = [currentSlide, nextSlide]

        slidesToTrack.forEach((slideIndex) => {
          const elements = VideoHelpers.getContainerElements(slideIndex)
          if (!elements || !VideoHelpers.isValidIframe(elements.iframe)) return

          const platform = VideoHelpers.detectPlatform(elements.iframe)
          VideoPlayback.getCurrentTime(elements.iframe, platform)
        })
      }, VideoConfig.timing.trackingInterval)
    } catch (error) {
      console.warn('VideoAPITracker: Failed to start periodic tracking', error)
    }
  },

  setupGlobalMessageListener () {
    try {
      if (this.messageHandler) {
        $.eventListener('remove', window, 'message', this.messageHandler)
      }

      this.messageHandler = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle YouTube API responses
          if (data.event === 'infoDelivery' && data.info && typeof data.info.currentTime === 'number') {
            const currentSlide = VideoStateManager.currentSlideIndex,
              elements = VideoHelpers.getContainerElements(currentSlide)

            if (elements && VideoHelpers.isValidIframe(elements.iframe) &&
              VideoHelpers.detectPlatform(elements.iframe) === 'youtube' && elements.videoUrl) {
              VideoStateManager.saveVideoState(elements.videoUrl, data.info.currentTime, currentSlide, 'global_api')
            }
          }

          // Handle Vimeo API responses
          if (data.event === 'timeupdate' && typeof data.data === 'number') {
            const { containers } = VideoHelpers.getContainerElements() || {}
            if (!containers) return

            containers.forEach((_container, index) => {
              const slideIndex = index + 1,
                elements = VideoHelpers.getContainerElements(slideIndex)

              if (elements && VideoHelpers.isValidIframe(elements.iframe) &&
                VideoHelpers.detectPlatform(elements.iframe) === 'vimeo' && elements.videoUrl) {
                VideoStateManager.saveVideoState(elements.videoUrl, data.data, slideIndex, 'vimeo_api')
              }
            })
          }
        } catch {
          // Ignore parsing errors from other postMessage sources
        }
      }

      $.eventListener('add', window, 'message', this.messageHandler)
    } catch (error) {
      console.warn('VideoAPITracker: Failed to setup message listener', error)
    }
  },

  cleanup () {
    try {
      if (this.periodicTracker) {
        clearInterval(this.periodicTracker)
        this.periodicTracker = null
      }

      if (this.messageHandler) {
        $.eventListener('remove', window, 'message', this.messageHandler)
        this.messageHandler = null
      }
    } catch (error) {
      return VideoHelpers.handleError('VideoAPITracker', 'cleanup', error)
    }
  }
}

const VideoMemoryManager = {
  shouldVideoBeLoaded (containerIndex, activeIndex, totalSlides) {
    try {
      const slideIndex = VideoHelpers.containerIndexToSlideIndex(containerIndex)
      const maxSlideIndex = totalSlides

      // Always load current slide
      if (slideIndex === activeIndex) return true

      // Load next slide for preloading
      const nextSlide = VideoHelpers.getNextIndex(activeIndex - 1, maxSlideIndex - 1, true) + 1
      if (slideIndex === nextSlide) return true

      return false
    } catch (error) {
      return VideoHelpers.handleError('VideoMemoryManager', 'check if video should be loaded', error, false)
    }
  },

  destroyVideoIframe (container, slideIndex) {
    try {
      const videoUrl = container.dataset.videoUrl

      if (videoUrl) {
        // Save final state before destruction
        const finalTime = VideoStateManager.stopEstimatedTracking(videoUrl)
        if (VideoHelpers.isValidVideoTime(finalTime)) {
          VideoStateManager.saveVideoState(videoUrl, finalTime, slideIndex, 'estimated')
        }
      }

      const performDestroy = () => {
        const iframe = container.querySelector(VideoConfig.selectors.iframe)
        if (iframe) {
          iframe.src = 'about:blank'
          iframe.remove()
        }

        container.classList.remove(VideoConfig.classes.loaded)
        VideoStateManager.markVideoUnloaded(slideIndex)
      }

      VideoHelpers.execute(performDestroy)
    } catch (error) {
      return VideoHelpers.handleError('VideoMemoryManager', 'destroy video iframe', error)
    }
  },

  manageVideoMemory (activeSlideIndex) {
    try {
      const { containers } = VideoHelpers.getContainerElements() || {}
      if (!containers) return

      const totalSlides = containers.length,
        videosToKeep = new Set(),
        videosToDestroy = new Set()

      containers.forEach((container, containerIndex) => {
        const slideIndex = containerIndex + 1,
          shouldKeep = this.shouldVideoBeLoaded(containerIndex, activeSlideIndex, totalSlides)

        if (shouldKeep) {
          videosToKeep.add(slideIndex)

          // Load video if not already loaded
          if (!VideoStateManager.isVideoLoaded(slideIndex)) {
            VideoLoader.loadVideo(container)
          }
        } else if (VideoStateManager.isVideoLoaded(slideIndex)) {
          videosToDestroy.add(slideIndex)
        }
      })

      // Process video destruction
      if (videosToDestroy.size > 0) {
        const processDestruction = () => {
          videosToDestroy.forEach((slideIndex) => {
            const elements = VideoHelpers.getContainerElements(slideIndex)
            if (elements) {
              this.destroyVideoIframe(elements.container, slideIndex)
            }
          })
        }

        $.requestIdle(processDestruction, { timeout: 100 })
      }
    } catch (error) {
      return VideoHelpers.handleError('VideoMemoryManager', 'manage video memory', error)
    }
  }
}

const VideoUtils = {
  parseVideoUrl (url) {
    const cached = VideoCache.get(`parsed-${url}`)
    if (cached) return cached

    let platform = null,
      videoId = null

    const youtubeVideo = () => {
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
    }

    const vimeoVideo = () => {
      platform = 'vimeo'
      const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
      videoId = match ? match[1] : null
    }

    if (url.includes('youtube.com') || url.includes('youtu.be')) { // YouTube detection and extraction
      youtubeVideo()
    } else if (url.includes('vimeo.com')) { // Vimeo detection and extraction
      vimeoVideo()
    }

    const result = { platform, videoId }
    if (platform && videoId) {
      VideoCache.set(`parsed-${url}`, result)
      VideoPreconnect.setupForPlatform(platform)
    }

    return result
  },

  getPosterUrl (videoId, platform) {
    if (platform === 'youtube') {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    } else if (platform === 'vimeo') {
      return `https://vumbnail.com/${videoId}_large.jpg`
    }
    return null
  },

  createIframe (videoId, platform, options = {}) {
    const iframe = document.createElement('iframe')
    iframe.allowFullscreen = true
    iframe.className = `${VideoConfig.classes.video} ${VideoConfig.classes.iframe}`
    iframe.dataset.videoIframe = 'true'
    iframe.setAttribute('autoplay', true)
    iframe.setAttribute('frameborder', '0')
    iframe.setAttribute('loop', true)
    iframe.setAttribute('muted', true)
    iframe.setAttribute('playsinline', true)
    iframe.width = `${VideoConfig.size.width}`
    iframe.height = `${VideoConfig.size.height}`

    const youtubeIframe = () => {
      const params = new URLSearchParams({
        autoplay: '1',
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
        showinfo: '0',
        ...options
      })
      iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`
      iframe.allow = 'autoplay; encrypted-media; fullscreen'
    }

    const vimeoIframe = () => {
      const params = new URLSearchParams({
        autopause: '0',
        autoplay: '1',
        background: '1',
        controls: '0',
        loop: '1',
        muted: '1',
        ...options
      })
      iframe.src = `https://player.vimeo.com/video/${videoId}?${params.toString()}`
      iframe.allow = 'autoplay; fullscreen'
    }

    if (platform === 'youtube') {
      youtubeIframe()
    } else if (platform === 'vimeo') {
      vimeoIframe()
    }

    return iframe
  }
}

const VideoLoader = {
  createPosterImage (container, videoId, platform) {
    if (!container.hasAttribute(VideoConfig.attr.videoPoster)) {
      return null
    }

    const getPosterUrl = () => VideoUtils.getPosterUrl(videoId, platform)
    const msg = 'Failed to generate poster URL'
    const posterUrl = VideoHelpers.safely(getPosterUrl, msg, { videoId, platform }, null)

    if (!posterUrl) return null

    const posterImg = document.createElement('img')
    posterImg.className = VideoConfig.classes.poster
    posterImg.dataset.videoPoster = 'true'
    posterImg.alt = 'Video thumbnail'

    const slowConnection = VideoHelpers.slowly()
    if ($.isFetchPriority()) posterImg.fetchPriority = 'low'
    if (slowConnection) posterImg.loading = 'lazy'

    const handlePosterLoad = () => {
      const updatePoster = () => {
        container.classList.add(VideoConfig.classes.posterLoaded)
      }
      VideoHelpers.execute(updatePoster)
    }

    const handlePosterError = () => {
      if (platform === 'youtube' && posterImg.src.includes('maxresdefault')) {
        posterImg.src = `${VideoConfig.cdn.youtubeThumbnail}/vi/${videoId}/hqdefault.jpg`
      }
    }

    $.eventListener('add', posterImg, 'load', handlePosterLoad, { once: true, passive: true })
    $.eventListener('add', posterImg, 'error', handlePosterError, { once: true, passive: true })

    const loadPosterSrc = () => posterImg.src = posterUrl

    $.requestIdle(loadPosterSrc, { timeout: 100 })

    container.appendChild(posterImg)
    return posterImg
  },

  fadeOutPoster (posterImg) {
    if (!posterImg) return

    const container = posterImg.closest(`[${VideoConfig.attr.videoContainer}]`)
    if (container) {
      container.classList.remove(VideoConfig.classes.posterLoaded)
    }

    const removePoster = () => {
      if (posterImg?.parentNode) posterImg.parentNode.removeChild(posterImg)
    }

    $.eventListener('add', posterImg, 'transitionend', removePoster, { once: true, passive: true })
    setTimeout(removePoster, VideoConfig.timing.fadeOutDelay)
  },

  createVideoIframe (container, videoId, platform, isSlowConnection = null) {
    const iframeOptions = {},
      slowConnection = VideoHelpers.slowly(isSlowConnection),
      videoUrl = container.dataset.videoUrl,
      containers = VideoDOMCache.getContainers(),
      slideIndex = Array.from(containers).indexOf(container) + 1,
      savedState = VideoStateManager.getVideoState(videoUrl),
      startTime = savedState ? savedState.currentTime : 0

    if (slowConnection) {
      iframeOptions.quality = 'small'
      if (platform === 'youtube') iframeOptions.vq = 'small'
    }

    // Configure iframe for saved state
    if (startTime > 0) {
      if (platform === 'youtube') {
        iframeOptions.autoplay = '0' // Don't auto-play, we'll control manually
        iframeOptions.start = Math.floor(startTime)
      } else if (platform === 'vimeo') {
        iframeOptions.autoplay = '0'
      }
    }

    const createIframe = () => VideoUtils.createIframe(videoId, platform, iframeOptions)
    const msg = 'Failed to create video iframe'
    const iframe = VideoHelpers.safely(createIframe, msg, { videoId, platform })

    if (!iframe) return

    const handleIframeLoad = () => {
      const posterImg = container.querySelector(`[${VideoConfig.attr.videoPoster}]`)
      this.fadeOutPoster(posterImg)

      container.classList.add(VideoConfig.classes.loaded)
      VideoStateManager.markVideoLoaded(slideIndex)

      // Start estimated time tracking
      const initialTime = savedState ? savedState.currentTime : 0
      VideoStateManager.startEstimatedTracking(videoUrl, initialTime)

      // Handle playback position restoration
      if (savedState && startTime > 0) {
        this.waitForPlayerReady(iframe, platform, () => {
          VideoPlayback.seekToTime(iframe, startTime, platform)

          // Play if this is the current slide
          if (slideIndex === VideoStateManager.currentSlideIndex) {
            setTimeout(() => VideoPlayback.playVideo(iframe, platform), 500)
          }
        })
      } else if (slideIndex === VideoStateManager.currentSlideIndex) {
        // Auto-play only current slide for new videos
        this.waitForPlayerReady(iframe, platform, () => {
          VideoPlayback.playVideo(iframe, platform)
        })
      }
    }

    $.eventListener('add', iframe, 'load', handleIframeLoad, { once: true, passive: true })

    container.appendChild(iframe)
  },

  waitForPlayerReady (iframe, platform, callback) {
    try {
      let attempts = 0
      const maxAttempts = 20,
        checkInterval = 250

      const checkReady = () => {
        attempts++

        if (attempts >= maxAttempts) {
          console.warn('VideoLoader: Player ready timeout, executing callback anyway')
          callback()
          return
        }

        if (platform === 'youtube') {
          VideoPlayback.sendYouTubeCommand(iframe, 'listening', '', 'widget', 'widget')

          const readyListener = (event) => {
            try {
              const data = JSON.parse(event.data)
              if (data.event === 'onReady' || data.event === 'video-progress') {
                $.eventListener('remove', window, 'message', readyListener)
                callback()
                return
              }
            } catch {
              // Ignore parsing errors
            }
          }

          $.eventListener('add', window, 'message', readyListener)
          setTimeout(() => {
            $.eventListener('remove', window, 'message', readyListener)
          }, checkInterval)

          setTimeout(checkReady, checkInterval)
        } else if (platform === 'vimeo') {
          // Vimeo typically ready after a short delay
          setTimeout(callback, 500)
        }
      }

      setTimeout(checkReady, 500)
    } catch (error) {
      console.warn('VideoLoader: Failed to wait for player ready', error)
      callback() // Execute callback anyway
    }
  },

  loadVideo (container, isSlowConnection = null) {
    if (container.classList.contains(VideoConfig.classes.loaded)) return

    const videoUrl = container.dataset.videoUrl
    if (!videoUrl) return

    const parseVideo = () => VideoUtils.parseVideoUrl(videoUrl)
    const msg = 'Failed to parse video URL'
    const result = VideoHelpers.safely(parseVideo, msg, videoUrl)

    if (!result || !result.platform || !result.videoId) {
      console.warn('VideoLoader: Invalid video URL or unsupported platform', videoUrl)
      return
    }

    const { platform, videoId } = result

    const slowConnection = VideoHelpers.slowly(isSlowConnection)
    const delay = slowConnection ?
      VideoConfig.timing.slowConnectionDelay :
      VideoConfig.timing.autoplayDelay

    const loadVideoFrame = () => {
      const createIframe = () => this.createVideoIframe(container, videoId, platform, slowConnection)
      VideoHelpers.execute(createIframe)
    }

    $.requestIdle(loadVideoFrame, { timeout: delay })
  }
}

const VideoDOMCache = {
  getContainers () {
    return document.querySelectorAll(VideoConfig.selectors.container)
  }
}

const VideoLoadingStrategy = {
  getVideoContainers () {
    return VideoDOMCache.getContainers()
  },

  processContainers (containers) {
    const processQueue = []

    Array.from(containers).forEach((container) => {
      const videoUrl = container.dataset.videoUrl
      if (!videoUrl) return

      const parseVideo = () => VideoUtils.parseVideoUrl(videoUrl)
      const msg = 'Failed to parse video URL'
      const result = VideoHelpers.safely(parseVideo, msg, videoUrl)

      if (!result || !result.platform || !result.videoId) return

      processQueue.push({ container, videoId: result.videoId, platform: result.platform })
    })

    const batchProcess = () => {
      const slowConnection = VideoHelpers.slowly()
      processQueue.forEach(({ container, videoId, platform }) => {
        VideoLoader.createPosterImage(container, videoId, platform)

        $.inViewport?.(container) ?
          VideoLoader.loadVideo(container, slowConnection) :
          VideoVisibility.observe(container)
      })
    }

    VideoHelpers.execute(batchProcess)
  },

  loadInChunks (containers) {
    const chunkSize = 5,
      totalContainers = containers.length

    const loadChunk = (startIndex) => {
      const endIndex = Math.min(startIndex + chunkSize, totalContainers),
        chunk = Array.from(containers).slice(startIndex, endIndex)

      const processChunk = () => this.processContainers(chunk)

      VideoHelpers.execute(processChunk)

      if (endIndex >= totalContainers) return

      const nextChunk = () => loadChunk(endIndex)
      $.requestIdle(nextChunk, { timeout: 500 })
    }

    loadChunk(0)
  }
}

const VideoHandler = {
  resizeHandler: null,
  eventListeners: new Map(),

  init () {
    const containers = VideoLoadingStrategy.getVideoContainers()
    if (!containers.length) return false

    // Initialize shared state management
    VideoStateManager.init()

    VideoVisibility.setIntersectionObserver()
    VideoAPITracker.startPeriodicTracking()
    this.processVideos(containers)
    this.setResizeHandler()

    // Expose public API for carousel integration
    window.videoLoadingInstance = {
      onSlideChange: this.onSlideChange.bind(this),
      playVideo: this.playVideo.bind(this),
      pauseVideo: this.pauseVideo.bind(this),
      throttlingNavigation: () => VideoStateManager.throttlingNavigation()
    }

    return this.cleanup.bind(this)
  },

  processVideos (containers) {
    containers.length > 3 ?
      VideoLoadingStrategy.loadInChunks(containers) :
      VideoLoadingStrategy.processContainers(containers)
  },

  setResizeHandler () {
    this.resizeHandler = $.debounce(() => {
      VideoDevice.clearCache()
    }, 300)

    const options = { passive: true }
    $.eventListener('add', window, 'resize', this.resizeHandler, options)
    this.eventListeners.set('resize', { handler: this.resizeHandler, options })
  },

  onSlideChange (slideIndex, isAutoRotate = false) {
    try {
      VideoStateManager.updateCurrentSlide(slideIndex)

      // Small delay for auto-rotate to allow previous slide state saving
      const managementDelay = isAutoRotate ? 1200 : 500

      setTimeout(() => {
        VideoMemoryManager.manageVideoMemory(slideIndex)
        this.manageVideoPlayback(slideIndex)
      }, managementDelay)
    } catch (error) {
      console.warn('VideoHandler: Failed to handle slide change', error)
    }
  },

  manageVideoPlayback (activeSlideIndex) {
    try {
      const { containers } = VideoHelpers.getContainerElements() || {}
      if (!containers) return

      containers.forEach((_container, containerIndex) => {
        const slideIndex = containerIndex + 1,
          elements = VideoHelpers.getContainerElements(slideIndex)

        if (!elements || !VideoHelpers.isValidIframe(elements.iframe)) return

        const platform = VideoHelpers.detectPlatform(elements.iframe)

        slideIndex === activeSlideIndex ?
          VideoPlayback.playVideo(elements.iframe, platform) :
          VideoPlayback.pauseVideo(elements.iframe, platform)
      })
    } catch (error) {
      return VideoHelpers.handleError('VideoHandler', 'manage video playback', error)
    }
  },

  playVideo (iframe, platform = null) {
    VideoPlayback.playVideo(iframe, platform)
  },

  pauseVideo (iframe, platform = null) {
    VideoPlayback.pauseVideo(iframe, platform)
  },

  cleanup () {
    this.eventListeners.forEach(({ handler, options }, eventType) => {
      $.eventListener('remove', window, eventType, handler, options)
    })
    this.eventListeners.clear()
    this.resizeHandler = null

    const performCleanup = () => {
      VideoHelpers.cleanupElements(VideoConfig.selectors.iframe, (iframe) => {
        iframe.src = 'about:blank'
      })
      VideoHelpers.cleanupElements(VideoConfig.selectors.poster)
    }
    VideoHelpers.execute(performCleanup)

    VideoDevice.clearCache()
    VideoVisibility.cleanup()
    VideoCache.clear()
    VideoPreconnect.cleanup()
    VideoAPITracker.cleanup()
    VideoStateManager.cleanup()

    // Clean up global API
    if (window.videoLoadingInstance) {
      window.videoLoadingInstance = null
    }

    return null
  }
}

const initVideoLoading = (retryCount = 0) => {
  if (typeof $ === 'undefined' || !$.cleanup) {
    const maxRetries = (typeof $ !== 'undefined' && $.slowConnection) ? 40 : 20,
      timeoutDuration = maxRetries === 40 ? 10 : 5

    if (retryCount >= maxRetries) {
      console.error(`VideoLoading: Utils failed to load after ${timeoutDuration} seconds, aborting`)
      return
    }
    if (retryCount === 0 || retryCount % 10 === 0) { // Only show every 10th retry to reduce console spam
      console.warn(`VideoLoading: Utils not loaded, retrying... (${retryCount + 1}/${maxRetries})`)
    }
    setTimeout(() => initVideoLoading(retryCount + 1), 250)
    return
  }
  $.cleanup('cleanupVideoLoading', () => VideoHandler.init())
}

initVideoLoading()
