'use strict';

/** @preserve OverlappingMarkerSpiderfier
https://github.com/jawj/OverlappingMarkerSpiderfier-Leaflet
Copyright (c) 2011 - 2012 George MacKerron
Released under the MIT licence: http://opensource.org/licenses/mit-license
*/
var twoPi = Math.PI * 2;
var OverlappingMarkerSpiderfier = /** @class */ (function () {
    // Note: it's OK that this constructor comes after the properties, because of function hoisting
    function OverlappingMarkerSpiderfier(map, leaflet, opts) {
        var _this = this;
        this.VERSION = '0.2.6';
        this.keepSpiderfied = false; // yes -> don't unspiderfy when a marker is selected
        this.nearbyDistance = 20; // spiderfy markers within this range of the one clicked, in px
        this.circleSpiralSwitchover = 9; // show spiral instead of circle from this marker count upwards
        // 0 -> always spiral; Infinity -> always circle
        this.circleFootSeparation = 25; // related to circumference of circle
        this.circleStartAngle = twoPi / 12;
        this.spiralFootSeparation = 28; // related to size of spiral (experiment!)
        this.spiralLengthStart = 11; // ditto
        this.spiralLengthFactor = 5; // ditto
        this.legWeight = 1.5;
        this.legColors = {
            'usual': '#222',
            'highlighted': '#f00'
        };
        this.map = map;
        this.leaflet = leaflet;
        if (opts == null) {
            opts = {};
        }
        for (var _i = 0, _a = Object.keys(opts || {}); _i < _a.length; _i++) {
            var k = _a[_i];
            var v = opts[k];
            this[k] = v;
        }
        this.initMarkerArrays();
        this.listeners = {};
        for (var _b = 0, _c = ['click', 'zoomend']; _b < _c.length; _b++) {
            var e = _c[_b];
            this.map.addEventListener(e, function () { return _this['unspiderfy'](); });
        }
    }
    OverlappingMarkerSpiderfier.prototype.initMarkerArrays = function () {
        this.markers = [];
        return this.markerListeners = [];
    };
    OverlappingMarkerSpiderfier.prototype.addMarker = function (marker) {
        var _this = this;
        if (marker['_oms'] != null) {
            return this;
        }
        marker['_oms'] = true;
        var markerListener = function () { return _this.spiderListener(marker); };
        marker.addEventListener('click', markerListener);
        this.markerListeners.push(markerListener);
        this.markers.push(marker);
        return this; // return self, for chaining
    };
    OverlappingMarkerSpiderfier.prototype.getMarkers = function () { return this.markers.slice(0); };
    OverlappingMarkerSpiderfier.prototype.removeMarker = function (marker) {
        if (marker['_omsData'] != null) {
            this['unspiderfy']();
        } // otherwise it'll be stuck there forever!
        var i = this.arrIndexOf(this.markers, marker);
        if (i < 0) {
            return this;
        }
        var markerListener = this.markerListeners.splice(i, 1)[0];
        marker.removeEventListener('click', markerListener);
        delete marker['_oms'];
        this.markers.splice(i, 1);
        return this; // return self, for chaining
    };
    OverlappingMarkerSpiderfier.prototype.clearMarkers = function () {
        this['unspiderfy']();
        for (var i = 0; i < this.markers.length; i++) {
            var marker = this.markers[i];
            var markerListener = this.markerListeners[i];
            marker.removeEventListener('click', markerListener);
            delete marker['_oms'];
        }
        this.initMarkerArrays();
        return this; // return self, for chaining
    };
    // available listeners: click(marker), spiderfy(markers), unspiderfy(markers)
    OverlappingMarkerSpiderfier.prototype.addListener = function (event, func) {
        (this.listeners[event] != null ? this.listeners[event] : (this.listeners[event] = [])).push(func);
        return this; // return self, for chaining
    };
    OverlappingMarkerSpiderfier.prototype.removeListener = function (event, func) {
        var i = this.arrIndexOf(this.listeners[event], func);
        if (!(i < 0)) {
            this.listeners[event].splice(i, 1);
        }
        return this; // return self, for chaining
    };
    OverlappingMarkerSpiderfier.prototype.clearListeners = function (event) {
        this.listeners[event] = [];
        return this; // return self, for chaining
    };
    OverlappingMarkerSpiderfier.prototype.trigger = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return (Array.from(this.listeners[event] != null ? this.listeners[event] : [])).map(function (func) { return func.apply(void 0, Array.from(args || [])); });
    };
    OverlappingMarkerSpiderfier.prototype.generatePtsCircle = function (count, centerPt) {
        var _this = this;
        var circumference = this['circleFootSeparation'] * (2 + count);
        var legLength = circumference / twoPi; // = radius from circumference
        var angleStep = twoPi / count;
        return (function () {
            var result = [];
            for (var i = 0, end = count, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
                var angle = _this['circleStartAngle'] + (i * angleStep);
                result.push(new _this.leaflet.Point(centerPt.x + (legLength * Math.cos(angle)), centerPt.y + (legLength * Math.sin(angle))));
            }
            return result;
        })();
    };
    OverlappingMarkerSpiderfier.prototype.generatePtsSpiral = function (count, centerPt) {
        var _this = this;
        var legLength = this['spiralLengthStart'];
        var angle = 0;
        return (function () {
            var result = [];
            for (var i = 0, end = count, asc = 0 <= end; asc ? i < end : i > end; asc ? i++ : i--) {
                angle += (_this['spiralFootSeparation'] / legLength) + (i * 0.0005);
                var pt = new _this.leaflet.Point(centerPt.x + (legLength * Math.cos(angle)), centerPt.y + (legLength * Math.sin(angle)));
                legLength += (twoPi * _this['spiralLengthFactor']) / angle;
                result.push(pt);
            }
            return result;
        })();
    };
    OverlappingMarkerSpiderfier.prototype.spiderListener = function (marker) {
        var markerSpiderfied = (marker['_omsData'] != null);
        var markerPos = marker.getLatLng();
        if (!markerSpiderfied || !this['keepSpiderfied']) {
            this['unspiderfy']();
        }
        if (markerSpiderfied) {
            return this.trigger('click', marker, markerPos);
        }
        else {
            var nearbyMarkerData = [];
            var nonNearbyMarkers = [];
            var pxSq = this['nearbyDistance'] * this['nearbyDistance'];
            var markerPt = this.map.latLngToLayerPoint(marker.getLatLng());
            for (var _i = 0, _a = Array.from(this.markers); _i < _a.length; _i++) {
                var m = _a[_i];
                if (!this.map.hasLayer(m)) {
                    continue;
                }
                var mPt = this.map.latLngToLayerPoint(m.getLatLng());
                if (this.ptDistanceSq(mPt, markerPt) < pxSq) {
                    nearbyMarkerData.push({ marker: m, markerPt: mPt });
                }
                else {
                    nonNearbyMarkers.push(m);
                }
            }
            if (nearbyMarkerData.length === 1) { // 1 => the one clicked => none nearby
                return this.trigger('click', marker, markerPos);
            }
            else {
                return this.spiderfy(nearbyMarkerData, nonNearbyMarkers);
            }
        }
    };
    OverlappingMarkerSpiderfier.prototype.makeHighlightListeners = function (marker) {
        var _this = this;
        return {
            highlight: function () { return marker['_omsData'].leg.setStyle({ color: _this['legColors']['highlighted'] }); },
            unhighlight: function () { return marker['_omsData'].leg.setStyle({ color: _this['legColors']['usual'] }); }
        };
    };
    OverlappingMarkerSpiderfier.prototype.spiderfy = function (markerData, nonNearbyMarkers) {
        var _this = this;
        var md;
        this.spiderfying = true;
        var numFeet = markerData.length;
        var bodyPt = this.ptAverage((function () {
            var result = [];
            for (var _i = 0, _a = Array.from(markerData); _i < _a.length; _i++) {
                md = _a[_i];
                result.push(md.markerPt);
            }
            return result;
        })());
        var footPts = numFeet >= this['circleSpiralSwitchover'] ?
            this.generatePtsSpiral(numFeet, bodyPt).reverse() // match from outside in => less criss-crossing
            :
                this.generatePtsCircle(numFeet, bodyPt);
        var spiderfiedMarkers = (function () {
            var result1 = [];
            for (var _i = 0, _a = Array.from(footPts); _i < _a.length; _i++) {
                var footPt = _a[_i];
                var footLl = _this.map.layerPointToLatLng(footPt);
                var nearestMarkerDatum = _this.minExtract(markerData, function (md) { return _this.ptDistanceSq(md.markerPt, footPt); });
                var marker = nearestMarkerDatum.marker;
                var leg = new _this.leaflet.Polyline([marker.getLatLng(), footLl], {
                    color: _this['legColors']['usual'],
                    weight: _this['legWeight'],
                    clickable: false
                });
                _this.map.addLayer(leg);
                marker['_omsData'] = { usualPosition: marker.getLatLng(), leg: leg };
                if (_this['legColors']['highlighted'] !== _this['legColors']['usual']) {
                    var mhl = _this.makeHighlightListeners(marker);
                    marker['_omsData'].highlightListeners = mhl;
                    marker.addEventListener('mouseover', mhl.highlight);
                    marker.addEventListener('mouseout', mhl.unhighlight);
                }
                marker.setLatLng(footLl);
                marker.setZIndexOffset(marker.options.zIndexOffset + 1000000);
                result1.push(marker);
            }
            return result1;
        })();
        this.spiderfied = true;
        return this.trigger('spiderfy', spiderfiedMarkers, nonNearbyMarkers);
    };
    OverlappingMarkerSpiderfier.prototype.unspiderfy = function (markerNotToMove) {
        if (markerNotToMove === void 0) { markerNotToMove = null; }
        if (this.spiderfied == null) {
            return this;
        }
        this.unspiderfying = true;
        var unspiderfiedMarkers = [];
        var nonNearbyMarkers = [];
        for (var _i = 0, _a = Array.from(this.markers); _i < _a.length; _i++) {
            var marker = _a[_i];
            if (marker['_omsData'] != null) {
                this.map.removeLayer(marker['_omsData'].leg);
                if (marker !== markerNotToMove) {
                    marker.setLatLng(marker['_omsData'].usualPosition);
                }
                marker.setZIndexOffset(marker.options.zIndexOffset - 1000000);
                var mhl = marker['_omsData'].highlightListeners;
                if (mhl != null) {
                    marker.removeEventListener('mouseover', mhl.highlight);
                    marker.removeEventListener('mouseout', mhl.unhighlight);
                }
                delete marker['_omsData'];
                unspiderfiedMarkers.push(marker);
            }
            else {
                nonNearbyMarkers.push(marker);
            }
        }
        delete this.unspiderfying;
        delete this.spiderfied;
        this.trigger('unspiderfy', unspiderfiedMarkers, nonNearbyMarkers);
        return this; // return self, for chaining
    };
    OverlappingMarkerSpiderfier.prototype.ptDistanceSq = function (pt1, pt2) {
        var dx = pt1.x - pt2.x;
        var dy = pt1.y - pt2.y;
        return (dx * dx) + (dy * dy);
    };
    OverlappingMarkerSpiderfier.prototype.ptAverage = function (pts) {
        var sumY;
        var sumX = (sumY = 0);
        for (var _i = 0, _a = Array.from(pts); _i < _a.length; _i++) {
            var pt = _a[_i];
            sumX += pt.x;
            sumY += pt.y;
        }
        var numPts = pts.length;
        return new this.leaflet.Point(sumX / numPts, sumY / numPts);
    };
    OverlappingMarkerSpiderfier.prototype.minExtract = function (set, func) {
        var bestIndex;
        for (var index = 0; index < set.length; index++) {
            var item = set[index];
            var val = func(item);
            if ((bestIndex == null) || (val < bestVal)) {
                var bestVal = val;
                bestIndex = index;
            }
        }
        return set.splice(bestIndex, 1)[0];
    };
    OverlappingMarkerSpiderfier.prototype.arrIndexOf = function (arr, obj) {
        if (arr.indexOf != null) {
            return arr.indexOf(obj);
        }
        for (var i = 0; i < arr.length; i++) {
            var o = arr[i];
            if (o === obj) {
                return i;
            }
        }
        return -1;
    };
    return OverlappingMarkerSpiderfier;
}());

module.exports = OverlappingMarkerSpiderfier;
