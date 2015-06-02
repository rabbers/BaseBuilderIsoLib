function ISOMapComponent(href, boundingbox, baseorigin, basesize) {
    return {
        href: href,
        boundingbox: boundingbox,
        baseorigin: baseorigin,
        basesize: basesize,
        
        get_XML: function() {
            return '<use xlink:href="'+href+'" transform="translate(-'+baseorigin.x+' -'+baseorigin.y+')" />';
        }
    }
}
function ISOMapObject(href, boundingbox, baseorigin, basesize) {
    var $self = {
        Components: [],

        get_XML: function () {
            var xml = '';
            for (var i = 0; i < this.Components.length; i++) {
                xml += this.Components[i].get_XML();
            }
            return xml;
        },
        addComponent: function (href, boundingbox, baseorigin, basesize) {
            this.Components[this.Components.length] = new ISOMapComponent(href, boundingbox, baseorigin, basesize);
            return this.Components.length - 1;
        }
    }
    $self.addComponent(href, boundingbox, baseorigin, basesize);
    return $self;
}
function ISOBase() {
    return {
        MapObjects: [],

        //href - value of xlink:href for <use>
        //boundingbox - Point[2] { x, y } bounds of rendered content at 1:1 scale
        //baseorigin - Point { x, y } leftmost point of left-most square of rectangular base
        //basesize - Size { width, height } number of squares that make up base
        MapObject_Add: function (href, boundingbox, baseorigin, basesize) {
            this.MapObjects[this.MapObjects.length] = new ISOMapObject(href, boundingbox, baseorigin, basesize);
            return this.MapObjects.length - 1;
        }
    }
}
