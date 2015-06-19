ISOMapFlags = {
    Blocked_Mask: 3,
    Blocked_Clear: 0,
    Blocked_Blocked: 1,
    Blocked_Callback: 2
};
function ISOMapCell() {
    return {
        isoplacedobject: null,
        flags: 0
    }
}
function ISOMapPlacedObject(isomapobject, gx, gy, attributes) {
    return {
        isomapobject: isomapobject,
        x: gx,
        y: gy,
        groupelement: null,
        attributes: jQuery.extend({}, attributes)
    }
}

function ISOMapComponent(href, boundingbox, baseorigin) {
    return {
        href: href,
        boundingbox: boundingbox,
        baseorigin: baseorigin,
        
        get_XML: function() {
            return '<use xlink:href="'+href+'" transform="translate(-'+baseorigin.x+' -'+baseorigin.y+')" />';
        }
    }
}
function ISOMapObject(href, boundingbox, baseorigin, basesize, defaultattributes) {
    var $self = {
        Components: [],
        basesize: basesize,
        DefaultAttributes: defaultattributes,

        get_XML: function () {
            var xml = '';
            for (var i = 0; i < this.Components.length; i++) {
                xml += this.Components[i].get_XML();
            }
            return xml;
        },
        addComponent: function (href, boundingbox, baseorigin) {
            this.Components[this.Components.length] = new ISOMapComponent(href, boundingbox, baseorigin);
            return this.Components.length - 1;
        },
        placeOnMap: function (isobase, gx, gy) {
            var p = new ISOMapPlacedObject(this, gx, gy, defaultattributes);
            isobase.placeObject(p);
            return p;
        }
    }
    $self.addComponent(href, boundingbox, baseorigin);
    return $self;
}
function ISOBase(screen) {
    var $self = {
        MapObjects: [],

        Screen: $(screen),

        //Setup parameters - View 
        GridVx: { x: 0, y: 0 },         //Vector down and to the right of one cell of the base grid in screen space (map X Axis)
        GridVy: { x: 0, y: 0 },         //Vector down and to the left of one cell of the base grid in screen space (map Y Axis)
        BackgroundOverscan: { top: 600, left: 400, right: 400, bottom: 200 },   //Number of screen pixels at 100% to allocate around the extent of the base cells (not including height of objects)

        //Setup parameters - Grid
        MapSize: { x: 64, y: 64 },      //Size of map grid data structure in cells

        //Setup parameters - Positioning
        Overscroll: { x: screen.width / 3, y: screen.height / 3 },
        BoundingBox: { width: 0, height: 0 },

        //Internal state
        _Origin: { x: 0, y: 0 },    //0,0 point of ISO space in View space at 100%
        _MapData: null,             //An array of arrays of object

        makeSVG: function (tag, attrs) {
            var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
            for (var k in attrs)
                el.setAttribute(k, attrs[k]);
            return el;
        },

        createStage: function () {
            this.Screen.css({ overflow: 'scroll' });
            var $svg = $(this.makeSVG('svg', { class: 'ISOMapStage', width: '100%', height: '100%' }));
            $svg.appendTo(this.Screen);

            var $g = $(this.makeSVG('g', { class: "ISOMapView", transform: "translate(0 0) scale(1.0)" }));
            $g.appendTo($svg);

            var $g = $(this.makeSVG('g', { class: "ISOMapGizmos", transform: "translate(0 0) scale(1.0)" }));
            $g.appendTo($svg);
        },

        //Initialize clears all visible objects from managed view and clears all map grid data
        //The SVG size and origin are calculated from GridVx, GridVy, MapSize and BackgroundOverscan
        initialize: function () {
            this.Screen.find('.ISOMapView').html('');
            this._MapData = [];
            for (var y = 0; y < this.MapSize.y; y++) {
                var maprow = [];
                this._MapData.push(maprow);
                for (var x = 0; x < this.MapSize.x; x++) {
                    var mapcell = new ISOMapCell();
                    maprow.push(mapcell);
                }
            }
            var basegridwidth = -(this.GridVy.x * this.MapSize.y) + (this.GridVx.x * this.MapSize.x);
            var basegridheight = (this.GridVy.y * this.MapSize.y) + (this.GridVx.y * this.MapSize.x);
            var screenwidth = this.BackgroundOverscan.left + this.BackgroundOverscan.right + basegridwidth;
            var screenheight = this.BackgroundOverscan.top + this.BackgroundOverscan.bottom + basegridheight;

            this.Screen.find('.ISOMapStage').css({ width: screenwidth, height: screenheight });

            this._Origin.x = this.BackgroundOverscan.left + basegridwidth / 2;
            this._Origin.y = this.BackgroundOverscan.top;

            this.centerOn(0, 0);
        },

        //href - value of xlink:href for <use>
        //boundingbox - Point[2] { x, y } bounds of rendered content at 1:1 scale
        //baseorigin - Point { x, y } leftmost point of left-most square of rectangular base
        //basesize - Size { width, height } number of squares that make up base
        mapObject_Add: function (href, boundingbox, baseorigin, basesize, defaultattributes) {
            this.MapObjects[this.MapObjects.length] = new ISOMapObject(href, boundingbox, baseorigin, basesize, defaultattributes);
            return this.MapObjects.length - 1;
        },

        //setPosition simply scrolls the container such that the given point is at point 0,0 in the client area
        setPosition: function (gx, gy) {
            var s = this.Screen[0];
            var targetpos = this.gridToScreen(gx, gy);

            s.scrollTop = targetpos.y;
            s.scrollLeft = targetpos.x;
        },

        //Use the dimensions of the container to center on the given tile
        //It is assumed that the caller expects to center on 'the center' of the given square
        centerOn: function (gx, gy) {
            var $s = this.Screen;
            var s = this.Screen[0];
            var tilepos = this.gridToScreen(gx + 0.5, gy + 0.5);

            var clientdims = { width: $s.width(), height: $s.height() };

            var targetpos = { x: tilepos.x - clientdims.width / 2, y: tilepos.y - clientdims.height / 2 };

            s.scrollTop = targetpos.y;
            s.scrollLeft = targetpos.x;
        },

        gridToScreen: function (gx, gy) {
            var sx = this._Origin.x + gx * this.GridVx.x + gy * this.GridVy.x;
            var sy = this._Origin.y + gx * this.GridVx.y + gy * this.GridVy.y;

            return { x: sx, y: sy };
        },
        screenToGrid: function (sx, sy) {
            var gx = -(this.GridVy.x * (this._Origin.y - sy) + this.GridVy.y * (sx - this._Origin.x)) / (this.GridVx.y * this.GridVy.x - this.GridVx.x * this.GridVy.y);
            var gy = (this.GridVx.x * (this._Origin.y - sy) + this.GridVx.y * (sx - this._Origin.x)) / (this.GridVx.y * this.GridVy.x - this.GridVx.x * this.GridVy.y);

            return { x: gx, y: gy }
        },

        placeObject: function (isomapplacedobject) {
            var po = isomapplacedobject;
            var o = po.isomapobject;

            //At least one square must be placed on the grid before the object will render
            if (
                o.basesize.width == 0 ||
                po.x + o.basesize.width - 1 < 0 ||
                po.x >= this.MapSize.x ||

                o.basesize.Height == 0 ||
                po.y + o.basesize.height - 1 < 0 ||
                po.y >= this.MapSize.y) {
                return;
            }
            var x1 = Math.max(po.x, 0);
            var y1 = Math.max(po.y, 0);
            var x2 = Math.min(po.x + o.basesize.width - 1, this.MapSize.x - 1);
            var y2 = Math.min(po.y + o.basesize.height - 1, this.MapSize.y - 1);

            for (var i = x1; i <= x2; i++) {
                for (var j = y1; j <= y2; j++) {
                    try {
                        var cell = this._MapData[j][i];
                        cell.isoplacedobject = po;
                        cell.flags |= ISOMapFlags.Blocked_Blocked;
                    } catch (e) {
                    }
                }
            }
            //Add SVG code to screen map
            var objpos = this.gridToScreen(isomapplacedobject.x, isomapplacedobject.y);
            var g = this.makeSVG('g', { transform: "translate(" + objpos.x + " " + objpos.y + ")" });
            po.groupelement = g;
            g.innerHTML = o.get_XML();
            $(g).appendTo(this.Screen.find('.ISOMapView'));
            $(g).data('isomapplacedobject', po);
        },
        clearCursor: function () {
            var cursor = this.Screen.find('.ISOMapGizmos .cursor');
            cursor.remove();
        },
        setCursor: function (gx, gy, w, h) {
            this.clearCursor();
            var p0 = this.gridToScreen(Math.floor(gx), Math.floor(gy));
            var x0 = p0.x;
            var y0 = p0.y;
            var p = {
                0: { x: x0, y: y0 },
                1: { x: x0 + this.GridVx.x * w, y: y0 + this.GridVx.y * w },
                2: { x: x0 + this.GridVx.x * w + this.GridVy.x * h, y: y0 + this.GridVx.y * w + this.GridVy.y * h },
                3: { x: x0 + this.GridVy.x * h, y: y0 + this.GridVy.y * h}
            };
            var path = this.makeSVG('path', {
                "d": 'M ' + p[0].x + ' ' + p[0].y + ' L ' + p[1].x + ' ' + p[1].y + ' L ' + p[2].x + ' ' + p[2].y + ' L ' + p[3].x + ' ' + p[3].y + ' z',
                "class": "cursor",
                "style": "fill:#00ff00;fill-rule:evenodd;stroke:#00ff00;stroke-width:2.8;stroke-linejoin:miter;stroke-opacity:1;opacity:0.25;"
            });
            $(path).appendTo(this.Screen.find('.ISOMapGizmos'));
        },
        setEncompassCursor: function(gx, gy) {
            this.clearCursor();
            gx = Math.floor(gx);
            gy = Math.floor(gy);

            if (gx < 0 || gy < 0 || gx >= this.MapSize.x || gy >= this.MapSize.y) return;

            var cell = this._MapData[gy][gx];

            var w = 1;
            var h = 1;
            if (cell.isoplacedobject) {
                var po = cell.isoplacedobject;
                gx = po.x;
                gy = po.y;
                w = po.isomapobject.basesize.width;
                h = po.isomapobject.basesize.height;                
            }

            this.setCursor(gx, gy, w, h);
            
        }
    };

    $self.createStage();

    return $self;
}
