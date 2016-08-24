
/**
 * An API for observing changes to Element’s size.
 *
 * @See https://wicg.github.io/ResizeObserver/
 * @ee https://github.com/pelotoncycle/resize-observer
 *
 */

import MdlExtAnimationLoop from './animationloop';

((window, document) => {
  'use strict';

  if (typeof window.ResizeObserver !== 'undefined') {
    return;
  }

  document.resizeObservers = [];

  const clientDimension = target => target.getBoundingClientRect();

  const dimensionHasChanged = (target, lastWidth, lastHeight) => {
    const {width, height} = clientDimension(target);
    return width !== lastWidth || height !== lastHeight;
  };


  /**
   * ResizeObservation holds observation information for a single Element.
   * @param target
   * @return {{target: *, broadcastWidth, broadcastHeight, isActive: (function())}}
   * @constructor
   */
  const ResizeObservation = target => {
    const {width, height} = clientDimension(target);
    return {
      target: target,
      broadcastWidth: width,
      broadcastHeight: height,

      isActive() {
        return dimensionHasChanged(this.target, this.broadcastWidth, this.broadcastHeight);
      }
    };
  };

  /**
   * A snapshot of the observed element
   * @param target
   * @param rect
   * @return {{target: *, contentRect: *}}
   * @constructor
   */
  const ResizeObserverEntry = (target, rect) => {
    return {
      target: target,
      contentRect: rect
    };
  };


  /**
   * The ResizeObserver is used to observe changes to Element's content rect.
   */
  class ResizeObserver {

    /**
     * Constructor for instantiating new Resize observers.
     * @param callback void (sequence<ResizeObserverEntry> entries). The function which will be called on each resize.
     * @throws {TypeError}
     */
    constructor( callback ) {

      if(typeof callback !== 'function') {
        throw new TypeError('callback parameter must be a function');
      }

      this.callback_ = callback;
      this.observationTargets_ = [];
      this.activeTargets_ = [];

      document.resizeObservers.push(this);
    }

    /**
     * A list of ResizeObservations. It represents all Elements being observed.
     *
     * @return {Array}
     */
    get observationTargets() {
      return this.observationTargets_;
    }

    /**
     *  A list of ResizeObservations. It represents all Elements whose size has
     *  changed since last observation broadcast that are eligible for broadcast.
     *
     * @return {Array}
     */
    get activeTargets() {
      return this.activeTargets_;
    }

    /**
     * Adds target to the list of observed elements.
     * @param target The target to observe
     */
    observe(target) {
      if(target) {
        if (!(target instanceof HTMLElement)) {
          throw new TypeError('target parameter must be an HTMLElement');
        }
        if (!this.observationTargets_.find(t => t.target === target)) {
          this.observationTargets_.push(ResizeObservation(target));
          resizeController.start();
        }
      }
    }

    /**
     * Removes target from the list of observed elements.
     * @param target The target to remove
     */
    unobserve(target) {
      const i = this.observationTargets_.findIndex(t => t.target === target);
      if(i > -1) {
        this.observationTargets_.splice(i, 1);
        resizeController.stop();
      }
    }

    /**
     * Stops the ResizeObserver instance from receiving notifications of resize changes.
     * Until the observe() method is used again, observer's callback will not be invoked.
     */
    disconnect() {
      this.observationTargets_ = [];
      this.activeTargets_ = [];
    }

    populateActiveTargets_() {
      this.activeTargets_ = this.observationTargets_.filter(
        resizeObervation => resizeObervation.target && resizeObervation.target.parentNode && resizeObervation.isActive()
      );
    }

    broadcast_() {
      this.populateActiveTargets_();

      if (this.activeTargets_.length > 0) {
        const entries = [];
        for (const resizeObservation of this.activeTargets_) {
          const rect = clientDimension(resizeObservation.target);
          resizeObservation.broadcastWidth = rect.width;
          resizeObservation.broadcastHeight = rect.height;
          entries.push(ResizeObserverEntry(resizeObservation.target, rect));
        }
        this.callback_(entries);
        this.activeTargets_ = [];
      }
    }
  }


  //let MdlExtAnimationLoop = require('./animationloop');

  /**
   * Broadcasts Element.resize events
   * @return {{start: (function()), stop: (function())}}
   * @constructor
   */
  const ResizeController = () => {

    const rafLoop = new MdlExtAnimationLoop();

    const execute = () => {
      for(const resizeObserver of document.resizeObservers) {
        resizeObserver.broadcast_();
      }
      return document.resizeObservers.length > 0;
    };

    const shouldStop = () => {
      return document.resizeObservers.findIndex( resizeObserver => resizeObserver.observationTargets.length > 0 ) > -1;
    };

    return {
      start() {
        if(!rafLoop.running) {
          //console.log('***** Start poll');

          rafLoop.start( () => execute() );
        }
      },
      stop() {
        if(shouldStop()) {
          //console.log('***** Stop poll');

          rafLoop.stop();
        }
      }
    };
  };

  window.ResizeObserver = ResizeObserver;

  const resizeController = ResizeController();
  //console.log('***** ResizeObserver ready');

})(window, document);