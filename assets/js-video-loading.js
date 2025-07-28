/**
 * VideoLoading Component
 *
 * Handles loading of background videos with poster images and lazy loading.
 * Optimizes initial load and uses IntersectionObserver for performance.
 *
 * @requires js-utils-core.js
 * @requires js-utils.js
 */

// Utility functions
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
    slowConnectionDelay: 1500
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

const VideoCache = {
  get (key) {
    const cached = VideoConfig.cache.data.get(key)
    if (cached && Date.now() - cached.timestamp < VideoConfig.cache.ttl) {
      return cached.data
    }
    VideoConfig.cache.data.delete(key)
    return null
  },

  set (key, data) {
    VideoConfig.cache.data.set(key, {
      data,
      timestamp: Date.now()
    })
  },

  clear () {
    VideoConfig.cache.data.clear()
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
      iframe.allow = 'autoplay; muted; encrypted-media; fullscreen'
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
    const posterUrl = VideoHelpers.safely(
      () => VideoUtils.getPosterUrl(videoId, platform),
      'Failed to generate poster URL',
      { videoId, platform },
      null
    )

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
      slowConnection = VideoHelpers.slowly(isSlowConnection)

    if (slowConnection) {
      iframeOptions.quality = 'small'
      if (platform === 'youtube') iframeOptions.vq = 'small'
    }

    const iframe = VideoHelpers.safely(
      () => VideoUtils.createIframe(videoId, platform, iframeOptions),
      'Failed to create video iframe',
      { videoId, platform }
    )

    if (!iframe) return

    const handleIframeLoad = () => {
      const posterImg = container.querySelector(`[${VideoConfig.attr.videoPoster}]`)
      this.fadeOutPoster(posterImg)

      container.classList.add(VideoConfig.classes.loaded)
    }

    $.eventListener('add', iframe, 'load', handleIframeLoad, { once: true, passive: true })

    container.appendChild(iframe)
  },

  loadVideo (container, isSlowConnection = null) {
    if (container.classList.contains(VideoConfig.classes.loaded)) return

    const videoUrl = container.dataset.videoUrl
    if (!videoUrl) return

    const result = VideoHelpers.safely(
      () => VideoUtils.parseVideoUrl(videoUrl),
      'Failed to parse video URL',
      videoUrl
    )

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

      const result = VideoHelpers.safely(
        () => VideoUtils.parseVideoUrl(videoUrl),
        'Failed to parse video URL',
        videoUrl
      )

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

    VideoVisibility.setIntersectionObserver()
    this.processVideos(containers)
    this.setResizeHandler()

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

    return null
  }
}

const initVideoLoading = () => {
  if (typeof $ === 'undefined' || !$.cleanup) {
    console.warn('VideoLoading: Utils not loaded, retrying...')
    setTimeout(() => initVideoLoading(), 250)
    return
  }
  $.cleanup('cleanupVideoLoading', () => VideoHandler.init())
}

initVideoLoading()
