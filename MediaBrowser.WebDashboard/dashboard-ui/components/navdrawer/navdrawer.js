define(["browser", "dom", "css!./navdrawer", "scrollStyles"], function (browser, dom) {
    "use strict";
    return function (options) {
        function getTouches(e) {
            return e.changedTouches || e.targetTouches || e.touches
        }

        function onMenuTouchStart(e) {
            options.target.classList.remove("transition"), options.target.classList.add("open");
            var touches = getTouches(e),
                touch = touches[0] || {};
            menuTouchStartX = touch.clientX, menuTouchStartY = touch.clientY, menuTouchStartTime = (new Date).getTime()
        }

        function setVelocity(deltaX) {
            var time = (new Date).getTime() - (menuTouchStartTime || 0);
            velocity = Math.abs(deltaX) / time
        }

        function onMenuTouchMove(e) {
            var isOpen = self.visible,
                touches = getTouches(e),
                touch = touches[0] || {},
                endX = touch.clientX || 0,
                endY = touch.clientY || 0,
                deltaX = endX - (menuTouchStartX || 0),
                deltaY = endY - (menuTouchStartY || 0);
            setVelocity(deltaX), isOpen && 1 !== dragMode && deltaX > 0 && (dragMode = 2), 0 === dragMode && (!isOpen || Math.abs(deltaX) >= 10) && Math.abs(deltaY) < 5 ? (dragMode = 1, scrollContainer.addEventListener("scroll", disableEvent), self.showMask()) : 0 === dragMode && Math.abs(deltaY) >= 5 && (dragMode = 2), 1 === dragMode && (newPos = currentPos + deltaX, self.changeMenuPos())
        }

        function onMenuTouchEnd(e) {
            options.target.classList.add("transition"), scrollContainer.removeEventListener("scroll", disableEvent), dragMode = 0;
            var touches = getTouches(e),
                touch = touches[0] || {},
                endX = touch.clientX || 0,
                endY = touch.clientY || 0,
                deltaX = endX - (menuTouchStartX || 0),
                deltaY = endY - (menuTouchStartY || 0);
            currentPos = deltaX, self.checkMenuState(deltaX, deltaY)
        }

        function onEdgeTouchStart(e) {
            if (isPeeking) onMenuTouchMove(e);
            else {
                var touches = getTouches(e),
                    touch = touches[0] || {},
                    endX = touch.clientX || 0;
                endX <= options.handleSize && (isPeeking = !0, "touchstart" === e.type && (dom.removeEventListener(edgeContainer, "touchmove", onEdgeTouchMove, {}), dom.addEventListener(edgeContainer, "touchmove", onEdgeTouchMove, {})), onMenuTouchStart(e))
            }
        }

        function onEdgeTouchMove(e) {
            onEdgeTouchStart(e), e.preventDefault(), e.stopPropagation()
        }

        function onEdgeTouchEnd(e) {
            isPeeking && (isPeeking = !1, dom.removeEventListener(edgeContainer, "touchmove", onEdgeTouchMove, {}), onMenuTouchEnd(e))
        }

        function initEdgeSwipe() {
            options.disableEdgeSwipe || (dom.addEventListener(edgeContainer, "touchstart", onEdgeTouchStart, {
                passive: !0
            }), dom.addEventListener(edgeContainer, "touchend", onEdgeTouchEnd, {
                passive: !0
            }), dom.addEventListener(edgeContainer, "touchcancel", onEdgeTouchEnd, {
                passive: !0
            }))
        }

        function disableEvent(e) {
            e.preventDefault(), e.stopPropagation()
        }

        function onBackgroundTouchStart(e) {
            var touches = getTouches(e),
                touch = touches[0] || {};
            backgroundTouchStartX = touch.clientX, backgroundTouchStartTime = (new Date).getTime()
        }

        function onBackgroundTouchMove(e) {
            var touches = getTouches(e),
                touch = touches[0] || {},
                endX = touch.clientX || 0;
            if (endX <= options.width && self.isVisible) {
                countStart++;
                var deltaX = endX - (backgroundTouchStartX || 0);
                if (1 == countStart && (startPoint = deltaX), deltaX < 0 && 2 !== dragMode) {
                    dragMode = 1, newPos = deltaX - startPoint + options.width, self.changeMenuPos();
                    var time = (new Date).getTime() - (backgroundTouchStartTime || 0);
                    velocity = Math.abs(deltaX) / time
                }
            }
            e.preventDefault(), e.stopPropagation()
        }

        function onBackgroundTouchEnd(e) {
            var touches = getTouches(e),
                touch = touches[0] || {},
                endX = touch.clientX || 0,
                deltaX = endX - (backgroundTouchStartX || 0);
            self.checkMenuState(deltaX), countStart = 0
        }
        var self, defaults, mask, newPos = 0,
            currentPos = 0,
            startPoint = 0,
            countStart = 0,
            velocity = 0;
        options.target.classList.add("transition");
        var dragMode = 0,
            scrollContainer = options.target.querySelector(".mainDrawer-scrollContainer");
        scrollContainer.classList.add("smoothScrollY");
        var TouchMenuLA = function () {
            self = this, defaults = {
                width: 260,
                handleSize: 30,
                disableMask: !1,
                maxMaskOpacity: .5
            }, this.isVisible = !1, this.initialize()
        };
        TouchMenuLA.prototype.initElements = function () {
            options.target.classList.add("touch-menu-la"), options.target.style.width = options.width + "px", options.target.style.left = -options.width + "px", options.disableMask || (mask = document.createElement("div"), mask.className = "tmla-mask", document.body.appendChild(mask))
        };
        var menuTouchStartX, menuTouchStartY, menuTouchStartTime, edgeContainer = document.querySelector(".skinBody"),
            isPeeking = !1;
        TouchMenuLA.prototype.animateToPosition = function (pos) {
            requestAnimationFrame(function () {
                pos ? options.target.style.transform = "translate3d(" + pos + "px, 0, 0)" : options.target.style.transform = "none"
            })
        }, TouchMenuLA.prototype.changeMenuPos = function () {
            newPos <= options.width && this.animateToPosition(newPos)
        }, TouchMenuLA.prototype.clickMaskClose = function () {
            mask.addEventListener("click", function () {
                self.close()
            })
        }, TouchMenuLA.prototype.checkMenuState = function (deltaX, deltaY) {
            velocity >= .4 ? deltaX >= 0 || Math.abs(deltaY || 0) >= 70 ? self.open() : self.close() : newPos >= 100 ? self.open() : newPos && self.close()
        }, TouchMenuLA.prototype.open = function () {
            this.animateToPosition(options.width), currentPos = options.width, this.isVisible = !0, options.target.classList.add("open"), self.showMask(), self.invoke(options.onChange)
        }, TouchMenuLA.prototype.close = function () {
            this.animateToPosition(0), currentPos = 0, self.isVisible = !1, options.target.classList.remove("open"), self.hideMask(), self.invoke(options.onChange)
        }, TouchMenuLA.prototype.toggle = function () {
            self.isVisible ? self.close() : self.open()
        };
        var backgroundTouchStartX, backgroundTouchStartTime;
        return TouchMenuLA.prototype.showMask = function () {
            mask.classList.add("backdrop")
        }, TouchMenuLA.prototype.hideMask = function () {
            mask.classList.remove("backdrop")
        }, TouchMenuLA.prototype.invoke = function (fn) {
            fn && fn.apply(self)
        }, TouchMenuLA.prototype.initialize = function () {
            options = Object.assign(defaults, options || {}), browser.edge && (options.disableEdgeSwipe = !0), self.initElements(), browser.touch && (dom.addEventListener(options.target, "touchstart", onMenuTouchStart, {
                passive: !0
            }), dom.addEventListener(options.target, "touchmove", onMenuTouchMove, {
                passive: !0
            }), dom.addEventListener(options.target, "touchend", onMenuTouchEnd, {
                passive: !0
            }), dom.addEventListener(options.target, "touchcancel", onMenuTouchEnd, {
                passive: !0
            }), dom.addEventListener(mask, "touchstart", onBackgroundTouchStart, {
                passive: !0
            }), dom.addEventListener(mask, "touchmove", onBackgroundTouchMove, {}), dom.addEventListener(mask, "touchend", onBackgroundTouchEnd, {
                passive: !0
            }), dom.addEventListener(mask, "touchcancel", onBackgroundTouchEnd, {
                passive: !0
            }), initEdgeSwipe()), self.clickMaskClose()
        }, new TouchMenuLA
    }
});