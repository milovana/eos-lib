/**
 * # Eos Library #
 *
 * This is the Eos Library where most of Eos' actual features are
 * implemented. The cool part is that anything you see here runs in
 * the sandbox. That means not only can you use it, you can change
 * it, too!
 *
 * As far as this documentation goes: Everything you see on the right
 * is the actual code for Eos Library. The library is open-source and
 * available on [Github](https://github.com/milovana/eos-lib).
 */
/**
 * **`Eos`**
 *
 * All functionality in the Eos client library is contained in the
 * `Eos` namespace.
 */
var Eos = window.Eos = {};

/**
 * **`Eos.Backend`**
 *
 * `Eos.Backend` is a static class that manages the communication with
 * the outside of the sandbox.
 */
Eos.Backend = {
	callbacks: {},
	unique: 0,

	getUnique: function ()
	{
		return Eos.Backend.unique++;
	},
	
	handleMessage: function EosBackend_handleMessage(message)
	{
		switch (message.data[0]) {
		case 'start':
			Eos.Backend.callApi('Basic', 'started');
			break;
		case 'return':
		case 'callback':
			var callback = Eos.Backend.callbacks[message.data[1]];
			callback.apply(this, message.data[2]);
			break;
		}
	},

	makeCallback: function (callback)
	{
		if ("function" !== typeof callback) {
			throw new Error('Eos.Backend(): Could not create callback, input is not a function.');
		}
		var callbackId = 'cb'+Eos.Backend.getUnique();
		Eos.Backend.callbacks[callbackId] = callback;
		return callbackId;
	},
	
	callApi: function (module, func, params, callback)
	{
		if ("function" == typeof callback) {
			postMessage([module, func, params, this.makeCallback(callback)]);
		} else {
			postMessage([module, func, params]);
		}
	}
};

onmessage = Eos.Backend.handleMessage;

/**
 * **`Eos.Console`**
 *
 * With `Eos.Console` you can send messages to the host's console. This
 * works with the debug consoles of most major browsers.
 */
Eos.Console = {
	log: function () {
		Eos.Backend.callApi('Console', 'log', Array.prototype.slice.call(arguments));
	},
	error: function () {
		Eos.Backend.callApi('Console', 'error', Array.prototype.slice.call(arguments));
	}
};

var console = Eos.Console;


/**
 * **`Class`**
 *
 * In this bit of code we create the root class for Eos' inheritance
 * system. The system is based on code by John Resig and others but is
 * heavily modified.
 */
(function(){
	// Create the root class
	var Class = this["Class"] = function () {};
	
	// John Resig's init trick - allows us to turn off all constructors temporarily
	var execCtor = true;
	
	Class.prototype.__ctor = Class;

	Class.extend = function (ctor) {
		// Do we have a constructor?
		var Class = function () {
			if (execCtor) {
				this.__super = Class.prototype.__super;
				arguments.callee.__ctor.apply(this, arguments);
				delete this.__super;
			}
		};

		// Copy all static methods and properties
		var i;
		for (i in this) {
			Class[i] = this[i];
		}

		// Inherit the parent class
		execCtor = false;
		Class.prototype = new this();
		execCtor = true;
		
		// Set some shortcuts
		Class.prototype.__super = this;
		Class.prototype.__parent = this.prototype;
		Class.prototype.__self = Class;
		
		// Store the constructor in the new class
		Class.__ctor = (ctor) ? ctor : this;
		
		// Enforce the constructor to be what we expect
		Class.constructor = Class;
		
		return Class;
	};
})();

/**
 * **`Eos.Observable`**
 *
 * Adds event handling to an object or class.
 *
 * This is an "aspect", which means you can apply it to any JavaScript
 * object or class and it will add the methods you can see below. You
 * may recognize those method names, they are the same as in jQuery.
 */
Eos.Observable = function (target) {
	if ("function" == typeof target) {
		target = target.prototype;
	}

	target.bind = Eos.Observable.bind;
	target.unbind = Eos.Observable.unbind;
	target.one = Eos.Observable.one;
	target.trigger = Eos.Observable.trigger;
};

Eos.Observable.bind = function (message, callback)
{
	if ("object" != typeof this.__listeners) this.__listeners = {};
	if (!this.__listeners[message]) this.__listeners[message] = [];

	this.__listeners[message].push(callback);
};

Eos.Observable.unbind = function (message, callback)
{
	if ("object" != typeof this.__listeners) return;
	if (!this.__listeners[message]) return;

	var pos = this.__listeners[message].indexOf(callback);

	if (pos != -1) this.__listeners[message].splice(pos, 1);
};

Eos.Observable.one = function (message, callback)
{
	var target = this;
	var wrappedCallback = function ()
	{
		target.unbind(message, callback);
		callback.apply(this, Array.prototype.slice.call(arguments));
	};
	target.bind(message, wrappedCallback);
}

Eos.Observable.trigger = function (message, args)
{
	if ("object" != typeof this.__listeners) return;
	if (!this.__listeners[message]) return;

	if (!args) args = [];

	// TODO: This will one day be an Event object like jQuery.Event.
	args.unshift({});

	for (var i = 0; i < this.__listeners[message].length; i++) {
		this.__listeners[message][i].apply(this, args);
	}
};

/**
 * **`Eos.Element`**
 *
 * One of the most important classes in the entire Eos framework.
 * `Eos.Element` gives you access to the DOM. Many functions are
 * limited for security reasons, but a lot of powerful CSS and
 * jQuery functionality is fully available.
 *
 * Most of the API for this class is again borrowed from jQuery and
 * jQuery is also what is executing these commands on the outside,
 * so you can expect very similar syntax and behavior.
 */
Eos.Element = Class.extend(function (selname) {
	if ("undefined" == typeof selname) {
		var selname = 'sel'+Eos.Backend.getUnique();
		Eos.Backend.callApi('Element', 'createElement', [selname]);
		this.selname = selname;
	} else {
		this.selname = selname;
	}

	this.children = [];
});

Eos.Observable(Eos.Element);

Eos.Element.select = function (selector, context) {
	var selname = 'sel'+Eos.Backend.getUnique();
	Eos.Backend.callApi('Element', 'createSelection', [selname, selector, context]);
	return new Eos.Element(selname);
};

Eos.Element.prototype.append = function (el) {
	Eos.Backend.callApi('Element', 'appendTo', [el.selname, this.selname]);
	return this;
};

Eos.Element.prototype.css = function (prop, value) {
	if ("function" == value) {
		Eos.Backend.callApi('Element', 'getStyle', [this.selname, prop], value);
	} else {
		Eos.Backend.callApi('Element', 'applyStyle', [this.selname, prop, value]);
		return this;
	}
};

Eos.Element.prototype.appendTo = function (parent) {
	if (parent instanceof Eos.Element) {
		parent.append(this);
	} else if ("string" == typeof parent) {
		Eos.Backend.callApi('Element', 'appendTo', [this.selname, parent]);
	} else {
		throw 'Eos.Element::appendTo(): Cannot add to target - not a valid element';
	}
	return this;
};

Eos.Element.prototype.text = function (text) {
	Eos.Backend.callApi('Element', 'setInnerText', [this.selname, text]);
	return this;
};

Eos.Element.prototype.attr = function (attr, value) {
	if ("function" == typeof value) {
		Eos.Backend.callApi('Element', 'getAttr', [this.selname, attr], value);
	} else {
		Eos.Backend.callApi('Element', 'setAttr', [this.selname, attr, value]);
	}
};

Eos.Element.prototype.addClass = function (cls) {
	Eos.Backend.callApi('Element', 'addClass', [this.selname, cls]);
	return this;
};

Eos.Element.prototype.animate = function (prop, speed, easing, fn) {
	var opt = speed && typeof speed === "object" ? Eos.Query.extend({}, speed) : {
		complete: fn || !fn && easing ||
			Eos.Query.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
	};

	if (opt.complete) {
		opt.complete = Eos.Backend.makeCallback(opt.complete);
	}

	Eos.Backend.callApi('Element', 'animate', [this.selname, prop, opt]);
};

Eos.Element.prototype.remove = function () {
	Eos.Backend.callApi('Element', 'remove', [this.selname]);
};

Eos.Element.prototype.height = function (height) {
	if ("function" == typeof height) {
		Eos.Backend.callApi('Element', 'getHeight', [this.selname], height);
	} else {
		Eos.Backend.callApi('Element', 'setHeight', [this.selname, height]);
	}
};

Eos.Element.prototype.width = function (width) {
	if ("function" == typeof width) {
		Eos.Backend.callApi('Element', 'getWidth', [this.selname], width);
	} else {
		Eos.Backend.callApi('Element', 'setWidth', [this.selname, width]);
	}
};

Eos.Element.prototype.outerHeight = function (includeMargin, callback) {
	if ("function" == typeof includeMargin) {
		callback = includeMargin;
		includeMargin = false;
	}
	Eos.Backend.callApi('Element', 'getOuterHeight', [this.selname, includeMargin], callback);
};

Eos.Element.prototype.outerWidth = function (includeMargin, callback) {
	if ("function" == typeof includeMargin) {
		callback = includeMargin;
		includeMargin = false;
	}
	Eos.Backend.callApi('Element', 'getOuterWidth', [this.selname, includeMargin], callback);
};

Eos.Element.prototype.click = function (callback)
{
	Eos.Backend.callApi('Element', 'bind', [this.selname, 'click', Eos.Backend.makeCallback(callback)]);
	return this;
};

Eos.Element.prototype.hide = function (duration)
{
	Eos.Backend.callApi('Element', 'hide', [this.selname, duration]);
	return this;
};

Eos.Element.prototype.show = function (duration)
{
	Eos.Backend.callApi('Element', 'show', [this.selname, duration]);
	return this;
};

Eos.Element.prototype.fadeIn = function (duration)
{
	Eos.Backend.callApi('Element', 'fadeIn', [this.selname, duration]);
	return this;
};

Eos.Element.prototype.fadeOut = function (duration)
{
	Eos.Backend.callApi('Element', 'fadeOut', [this.selname, duration]);
	return this;
};

Eos.Element.prototype.fadeTo = function (duration, opacity)
{
	Eos.Backend.callApi('Element', 'fadeTo', [this.selname, duration, opacity]);
	return this;
};

Eos.Element.prototype.fadeToggle = function (duration)
{
	Eos.Backend.callApi('Element', 'fadeToggle', [this.selname, duration]);
	return this;
};

Eos.Element.prototype.find = function (selector)
{
	var newSelection = Element.select(selector, this.selname);
	newSelection.prevObject = this;
	return newSelection;
};

Eos.Element.prototype.end = function ()
{
	if (!this.prevObject) {
		throw 'Eos.Element.end(): No previous selection available';
	}
	return this.prevObject;
};

/**
 * **`Eos.Element.bounds()`**
 *
 * Updates the local bounds cache or returns the current value.
 *
 * In order to remove the need for constant asynchronous calls out of
 * the sandbox, `Eos.Element` caches it's own size locally.
 */
Eos.Element.prototype.bounds = function (bounds) {
	if (bounds) {
		this.currentBounds = bounds;
	} else {
		return this.currentBounds;
	}
};

Eos.Element.prototype.doLayout = function () {
	if (!this.currentBounds) return;
	
	this.css('position', 'absolute');
	this.css('left', this.currentBounds.x+'px');
	this.css('top', this.currentBounds.y+'px');
	this.css('width', this.currentBounds.width);
	this.css('height', this.currentBounds.height);
};

/**
 * **`Eos.Media`**
 *
 * This element is used for placing images and videos.
 *
 * **Note:** Videos are not yet supported.
 */
Eos.Media = Eos.Element.extend(function (loc)
{
	if (!loc) throw 'Eos.Media(): No location provided';

	this.complete = false;
	
	var self = this;
	function updateSize(e) {
		self.complete = true;
		self.naturalWidth = e.width;
		self.naturalHeight = e.height;
		self.doLayout();
	};
	
	var selname = 'media'+Eos.Backend.getUnique();
	Eos.Backend.callApi('Media', 'create', [selname, loc]);
	
	this.__super(selname);

	// Hide image until first layout
	this.css('opacity', 0);
	this.layouted = false;

	Eos.Backend.callApi('Media', 'getNaturalSize', [this.selname, Eos.Backend.makeCallback(updateSize)]);
});

Eos.Media.prototype.doLayout = function ()
{
	if (!(this.naturalWidth && this.currentBounds)) return;
	
	var imgAR = this.naturalHeight/this.naturalWidth;
	var bndAR = this.currentBounds.height/this.currentBounds.width;

	var imgWidth, imgHeight;
	if (imgAR < bndAR) {
		imgWidth = this.currentBounds.width;
		imgHeight = imgWidth * imgAR;

		this.css('left', 0);
		this.css('top', (this.currentBounds.height/2 - imgHeight/2) + 'px');
	} else {
		imgHeight = this.currentBounds.height;
		imgWidth = imgHeight / imgAR;

		this.css('top', 0);
		this.css('left', (this.currentBounds.width/2 - imgWidth/2) + 'px');
	}
	this.css('position', 'absolute');
	this.css('width', imgWidth);
	this.css('height', imgHeight);
	
	if (!this.layouted) {
		this.css('opacity', 1);
		this.layouted = true;
	}
};

/**
 * **`Eos.Layout`**
 *
 * This is simply the base class for Eos' layout algorithms.
 */
Eos.Layout = Class.extend(function () {});

/**
 * **`Eos.StandardContainer`**
 *
 * This class is used as the base for any element that contains and
 * layouts child elements.
 */
Eos.StandardContainer = Eos.Element.extend(function ()
{
	this.__super.apply(this, Array.prototype.slice.call(arguments));

	this.items = [];
});

Eos.StandardContainer.prototype.addChild = function (child)
{
	if ("function" != typeof child.bounds || "function" != typeof child.doLayout) throw 'Eos.StandardContainer::addChild(): Cannot add child, not a layoutable component (e.g. an Eos.Element)';
	
	this.items.push(child);
	this.append(child);
	this.doLayout();
};

Eos.StandardContainer.prototype.removeChild = function (child)
{
	var pos = this.items.indexOf(child);
	if (pos != -1) this.items.splice(pos, 1);

	child.remove();
};

/**
 * **`Eos.Viewport`**
 *
 * The entire browser windows makes up `Eos.Viewport`. All other visual
 * components should be somewhere in the tree of nodes under this
 * singleton.
 */
Eos.Viewport = Eos.StandardContainer.extend(function ()
{
	this.__super('body');
	
	this.items = [];

	var self = this;
	function updateSize(bounds) {
		self.bounds(bounds);
		self.doLayout();
	};
	
	Eos.Backend.callApi('Window', 'addResizeHandler', [Eos.Backend.makeCallback(updateSize)]);
	Eos.Backend.callApi('Window', 'getSize', [], updateSize);
});

Eos.Viewport.prototype.doLayout = function ()
{
	for (var i = 0; i < this.items.length; i++) {
		this.items[i].bounds(this.currentBounds);
		this.items[i].doLayout();
	}
};

/**
 * Note that we turn this class into a single object instance now.
 *
 * This is one way of creating a singleton in JavaScript.
 */
Eos.Viewport = new Eos.Viewport();

Eos.Layout.Full = Eos.Layout.extend(function ()
{
	
});


/**
 * **`Eos.Query`**
 *
 * This class emulates more jQuery functionality. It is by no means
 * complete, but it includes most of the essentials.
 */
Eos.Query = function (p) {
	if (p instanceof Eos.Element) {
		return p;
	} else if ("string" == typeof p) {
		return Eos.Element.select(p);
	} else if ("function" == typeof p) {
		// TODO: Start system based on a handler in the parent document
		p();
	} else {
		throw 'Eos.Query(): Invalid parameter for $()';
	}
};

Eos.Query.isArray = Array.isArray ? Array.isArray : function (s) {
	return toString.call(s) === '[object Array]';
};

Eos.Query.isWindow = function (s) {
	return s && typeof s === "object" && "setInterval" in s;
};

Eos.Query.isFunction = function (s) {
	return toString.call(s) === '[object Function]';
};

Eos.Query.isPlainObject = function (s) {
	if (!s || toString.call(s) === '[object Object]' || s.nodeType || Eos.Query.isWindow(s)) {
		return false;
	}

	if (s.constructor &&
		!hasOwn.call(s, "constructor") &&
		!hasOwn.call(s.constructor.prototype, "isPrototypeOf")) {
		return false;
	}

	var key;
for (key in s) {}

	return key === undefined || hasOwn.call(s, key);
};

Eos.Query.extend = function() {
	 var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !Eos.Query.isFunction(target) ) {
		target = {};
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( Eos.Query.isPlainObject(copy) || (copyIsArray = Eos.Query.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && Eos.Query.isArray(src) ? src : [];

					} else {
						clone = src && Eos.Query.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = Eos.Query.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

Eos.Query.proxy = function( fn, proxy, thisObject )
{
	if ( arguments.length === 2 ) {
		if ( typeof proxy === "string" ) {
			thisObject = fn;
			fn = thisObject[ proxy ];
			proxy = undefined;

		} else if ( proxy && !Eos.Query.isFunction( proxy ) ) {
			thisObject = proxy;
			proxy = undefined;
		}
	}

	if ( !proxy && fn ) {
		proxy = function() {
			return fn.apply( thisObject || this, arguments );
		};
	}

	// Set the guid of unique handler to the same of original handler, so it can be removed
	if ( fn ) {
		proxy.guid = fn.guid = fn.guid || proxy.guid || Eos.Backend.getUnique();
	}

	// So proxy can be declared as an argument
	return proxy;
};

var $ = Eos.Query;

Eos.BubbleQueue = Eos.Element.extend(function (container)
{
	this.__super();
	
	this.addClass('eosBubbleQueue');
	
	if (!container) {
		container = Eos.Viewport;
	}

	container.addChild(this);

	this.bubbles = [];
});

Eos.BubbleQueue.prototype.doLayout = function ()
{
	if (!this.currentBounds) return;
	
	this.css('width', this.currentBounds.width);
};

Eos.BubbleQueue.prototype.addBubble = function (bubble)
{
	if (!bubble instanceof Eos.Bubble) throw 'Eos.BubbleQueue.addBubble(): Tried to add something that is not a bubble';

	this.bubbles.push(bubble);
	bubble.appendTo(this);
	
	this.trigger('bubbleAdded', [bubble]);

	bubble.registerParent(this);
};

Eos.Bubble = Eos.Element.extend(function (config) {
	this.__super();

	this.config = $.extend(Eos.Bubble.defaultConfig, config);
	
	if (this.config.anim) {
		this.css('margin-top', '30px');
		this.css('opacity', '0');
		this.animate({
			'margin-top' : 0,
			'opacity' : 1
		}, {
			duration: 300,
			easing: "easeOutQuad"
		});
	}
});

Eos.Bubble.defaultConfig = {
	autoClose: 'page',
	anim: true,
	timeout: null
};

/**
 * Setup listeners on a new parent queue.
 *
 * <p>This function is automatically called by Eos.BubbleQueue.addBubble.</p>
 */
Eos.Bubble.prototype.registerParent = function (queue)
{
	var self = this;
	if (this.config.autoClose) {
    queue.bind('pageChange', function (e, bubble) {
			if (self.config.autoClose === 'page') {
				self.close();
			}
		});
		queue.bind('bubbleAdded', function (e, bubble) {
			if (self.config.autoClose === 'all') {
				self.close();
			} else if (self.config.autoClose === 'text' &&
					   bubble instanceof Eos.TextBubble) {
				self.close();
			}
		});
	}
};

Eos.Bubble.prototype.close = function ()
{
	if (this.config.anim) {
		this.outerHeight(true, $.proxy(function (height) {
			this.animate({
				'margin-top' : -height+'px',
				'opacity' : 0
			}, {
				duration: 300,
				complete: $.proxy(function () {
					this.remove();
				}, this)
			});
		}, this));
	} else {
		this.remove();
	}
};

Eos.TextBubble = Eos.Bubble.extend(function (config)
{
	this.__super(config);

	this.addClass('eosTextBubble');

	if (config.text) {
		this.text(config.text);
	}
});

Eos.PromptBubble = Eos.Bubble.extend(function (config)
{
	this.__super(config);

	this.addClass('eosPromptBubble');

  this.sm = config.sm;

	var listEl = $('<ul></ul>');
  var buttons = config.buttons;

  // Convert short format to normalized array format, e.g.
  // buttons: {
  //   "MyLabel": {
  //     click: 'timer'
  //   }
  // }
  if (!Eos.Query.isArray(config.buttons)) {
    var arrButtons = [];
	  for (var key in buttons) {
		  if (!buttons.hasOwnProperty(key)) continue;

      var buttonObj = ("object" === typeof buttons[key]) ?
        buttons[key] :
        { click: buttons[key] };

      buttonObj.label = key;

      arrButtons.push(buttonObj);
    }
    buttons = arrButtons;
  }

  for (var i = 0, l = buttons.length; i < l; i++) {
		var opt = $.extend({}, Eos.PromptBubble.defaultButtonConfig,
						           buttons[i]);

    if ("string" === typeof opt.click ||
				opt.click instanceof Eos.Slide) {
      if (!this.sm) {
        // TODO: Error: Button shorthand handler only available in a SlideManager context
        return;
      }
      opt.click = (function (sm, slide) {
        return function () {
          this.sm.go(this.sm.getSlide(slide));
        };
      })(this.sm, opt.click);
    }

		var btnEl = $('<a>'+opt.label+'</a>')
			.addClass('eosButton')
			.addClass(opt.color)
			.addClass(opt.size)
			.appendTo($('<li></li>').appendTo(listEl));

		if (opt.click) btnEl.click(opt.click);
	}

	listEl.appendTo(this);
});

Eos.PromptBubble.defaultButtonConfig = {
	color: 'orange',
	size: 'medium'
};


Eos.SlideManager = Eos.Element.extend(function (container)
{
	this.container = (container) ? container : Eos.Viewport;

	// Map of named slides
	this.slides = {};

	this.__super();

	this.currentSlide = null;
	
	this.container.addChild(this);
});

Eos.SlideManager.prototype.go = function (slide)
{
	slide = this.getSlide(slide);
	
	if (this.currentSlide) {
		slide.transition(this, this.currentSlide);
	} else {
		slide.setup(this);
	}

	this.currentSlide = slide;
};

Eos.SlideManager.prototype.addChild = function (child)
{
	this.container.addChild(child);
};

Eos.SlideManager.prototype.removeChild = function (child)
{
	this.container.removeChild(child);
};

Eos.SlideManager.prototype.getSlide = function (slideName)
{
	if ("string" == typeof slideName) {
		var slide = this.slides[slideName];
		
		if (!slide) throw 'Eos.SlideManager.getSlide(): Unknown slide id "'+slideName+'"';
		
		return slide;
	} else if (slideName instanceof Eos.Slide) {
		return slideName;
	} else {
		throw 'Eos.SlideManager.getSlide(): Invalid value - not a slide';
	}
};

Eos.SlideManager.prototype.add = function (slides)
{
	var i;
	for (i in slides) {
		if (slides[i] instanceof Eos.Slide) {
			this.slides[i] = slides[i];
		} else {
			this.slides[i] = new Eos.InteractiveSlide(slides[i]);
		}
	}
};

Eos.Slide = Class.extend(function ()
{
	
});

Eos.Slide.prototype.setup = Eos.Slide.prototype.teardown = function ()
{
	throw 'Eos.Slide(): Error, you cannot use Eos.Slide directly, use one of it\'s subclasses';
};

Eos.Slide.prototype.transition = function (sm, currentSlide)
{
	currentSlide.teardown();
	this.setup(sm);
};

Eos.InteractiveSlide = Eos.Slide.extend(function (config)
{
	this.sm = null;
	this.config = config;

  if ("object" !== typeof this.config || this.config === null) {
    this.config = {};
  }
});

Eos.InteractiveSlide.prototype.setup = function (sm)
{
	this.sm = sm;

	if (this.config.media) {
		this.media = new Eos.Media(this.config.media);
		sm.addChild(this.media);
	}
	
	this.bubblequeue = new Eos.BubbleQueue(sm);
  this.initBubbles();

	if (this.config.metronome) {
		this.metronome = new Eos.Metronome();
		
		if (this.config.metronome != 'keep') {
			this.metronome.setFrequency(this.config.metronome);
		}
		
		this.metronome.start();
	}

	this.start();
};

Eos.InteractiveSlide.prototype.transition = function (sm, oldSlide)
{
	this.sm = sm;

	if (this.config.media === 'keep') {
		if (oldSlide.media) this.media = oldSlide.media;
	} else {
		if (oldSlide.media) this.sm.removeChild(oldSlide.media);
		
		if (this.config.media) {
			this.media = new Eos.Media(this.config.media);
			sm.addChild(this.media);
		}
	}

	this.bubblequeue = oldSlide.bubblequeue;
  this.bubblequeue.trigger('pageChange');
	this.initBubbles();

	if (this.config.metronome) {
		if (oldSlide.metronome) {
			this.metronome = oldSlide.metronome;
		} else {
			this.metronome = new Eos.Metronome();
		}
		if (this.config.metronome != 'keep') {
			this.metronome.setFrequency(this.config.metronome);
		}
		this.metronome.start();
	} else {
		if (oldSlide.metronome) {
			oldSlide.metronome.stop();
		}
	}

	this.start();
};

Eos.InteractiveSlide.prototype.initBubbles = function ()
{
  if (this.config.text) {
		this.bubblequeue.addBubble(new Eos.TextBubble({
      text: this.config.text,
      sm: this.sm
    }));
	}
	
	if (this.config.buttons) {
		this.bubblequeue.addBubble(new Eos.PromptBubble({
      buttons: this.config.buttons,
      sm: this.sm
    }));
	}

  if (this.config.bubbles) {
    for (var i = 0, l = this.config.bubbles.length; i < l; i++) {
      var bubble = this.config.bubbles[i];
      var bubbleClass;
      switch (bubble.type.toLowerCase()) {
      case 'text':
        bubbleClass = Eos.TextBubble;
        break;
      case 'buttons':
        bubbleClass = Eos.PromptBubble;
        break;
      default:
        // TODO: Error
        continue;
      }

      delete bubble.type;

      bubble.sm = this.sm;

      this.bubblequeue.addBubble(new bubbleClass(bubble));
    }
  }
};

Eos.InteractiveSlide.prototype.teardown = function ()
{
	if (this.media) this.sm.removeChild(this.media);
	if (this.bubblequeue) this.sm.removeChild(this.bubblequeue);
	if (this.metronome) this.metronome.stop();
};

Eos.InteractiveSlide.prototype.start = function ()
{
	if (this.config.sound) {
		this.sound = Eos.Sound.create(this.config.sound, {autoPlay: true});
	}

	if (this.config.music == "stop") {
		Eos.Music.stop();
	} else if (this.config.music) {
		Eos.Music.set(this.config.music);
	}

	this.activitysidebar = new Eos.ActivitySidebar(sm);

	if (this.config.delay) {
		if ("string" == typeof this.config.delay.complete) {
			var targetSlide = this.config.delay.complete;
			this.config.delay.complete = $.proxy(function () {
				this.sm.go(targetSlide);
			}, this);
		}
		this.delay = new Eos.Timer(this.config.delay);

		if (this.config.delay.style == 'hidden') {
			// No visible timer display
		} else if (this.config.delay.style == 'unknown') {
			this.timerdisplay = new Eos.UnknownTimerDisplay();
			this.activitysidebar.addChild(this.timerdisplay);
			this.timerdisplay.attachTo(this.delay);
		} else {
			this.timerdisplay = new Eos.TimerDisplay();
			this.activitysidebar.addChild(this.timerdisplay);
			this.timerdisplay.attachTo(this.delay);
		}
	}

	if ("function" == typeof this.config.onstart) {
		this.config.onstart(this);
	}
};

Eos.Timer = Class.extend(function (config)
{
	this.config = $.extend({}, Eos.Timer.defaultConfig, config);

	if ("string" == typeof this.config.duration) {
		// TODO: Parse strings like "30sec", "5h", "one minute", etc.
	} else if ("number" == typeof this.config.duration) {
		// Nothing to do
	} else if ("undefined" == typeof this.config.duration) {
		throw "Eos.Timer(): No duration specified.";
	} else {
		throw "Eos.Timer(): Invalid duration specified.";
	}

	if (this.config.autostart) this.start();
});

Eos.Observable(Eos.Timer);

Eos.Timer.defaultConfig = {
	autostart: true
};

Eos.Timer.tickInterval = 40;

Eos.Timer.prototype.start = function () {
	this.timeout = setTimeout($.proxy(function () {
		this.timeout = null;

		this.trigger("beforeComplete", [this]);
		this.config.complete();
		this.trigger("complete", [this]);
	}, this), this.config.duration);

	this.startTime = new Date().getTime();

	this.tick();
};

Eos.Timer.prototype.tick = function () {
	if (this.tickTimeout) {
		//clearTimeout(this.tickTimeout);
		this.tickTimeout = null;
	}

	if (!this.timeout) return;

	var currentTime = new Date().getTime();
	var runningTime = currentTime - this.startTime;

	this.trigger("tick", [runningTime, this.config.duration, this]);

	setTimeout($.proxy(arguments.callee, this), Eos.Timer.tickInterval);
};

Eos.Preloader = Class.extend(function ()
{
	this.overlay = $('<div/>')
		.addClass('eosPreloaderOverlay')
		.appendTo('body')
		.hide()
	;
	this.text = $('<p/>')
		.text('Loading media')
		.appendTo(this.overlay)
	;
	$('<div/>').appendTo(this.overlay);

	this.elements = [];
	this.unloadedElements = [];
});

Eos.Observable(Eos.Preloader);

Eos.Preloader.prototype.addItem = function (url)
{
	var loaderObject = {
		url: url
	};

	this.elements.push(loaderObject);
	this.unloadedElements.push(loaderObject);

	var onload = Eos.Backend.makeCallback($.proxy(function () {
		var pos = this.unloadedElements.indexOf(loaderObject);
		if (pos != -1) this.unloadedElements.splice(pos, 1);
		else {
			// Wierd. The item was already loaded
			throw 'Eos.Preloader::addItem(): Unexpected event - media loaded twice';
		}

		this.trigger('load');

		if (!this.unloadedElements.length) this.trigger('done');
	}, this));

	var onerror = Eos.Backend.makeCallback($.proxy(function () {
		this.trigger('error');
	}, this));

	Eos.Backend.callApi('Preload', 'load', [url, onload, onerror]);
};

Eos.Preloader.prototype.preload = function (callback)
{
	if (!this.unloadedElements.length) {
		callback();
	} else {
		this.overlay.show();
		this.bind('done', function () {
			this.overlay.hide();
			callback();
		});
	}
};

Eos.Sound = Class.extend(function (sndname)
{
	this.sndname = sndname;
});

Eos.Observable(Eos.Sound);

Eos.Sound.create = function (url, props)
{
	this.isLoaded = false;

	var sndname = 'snd'+Eos.Backend.getUnique();

	var soundObj = new Eos.Sound(sndname);

	var onload = Eos.Backend.makeCallback($.proxy(function () {
		this.isLoaded = true;
		this.trigger('load');
	}, soundObj));

	Eos.Backend.callApi('Sound', 'create', [sndname, url, props, onload]);

	return soundObj;
};

Eos.Sound.prototype.play = function ()
{
	Eos.Backend.callApi('Sound', 'play', [this.sndname]);
};

Eos.Sound.prototype.stop = function ()
{
	Eos.Backend.callApi('Sound', 'stop', [this.sndname]);
};

Eos.Metronome = Class.extend(function ()
{
	this.delay = 100;
	this.timeout = null;
	this.sound = Eos.Sound.create('builtin:click.mp3');
	this.loaded = false;
	this.sound.bind('load', $.proxy(function () {
		this.loaded = true;
		if (this.active && !this.timeout) this.start();
	}, this));
});

Eos.Metronome.prototype.setFrequency = function (freq)
{
	this.delay = 60000 / freq;
};

Eos.Metronome.prototype.start = function ()
{
	this.active = true;

	if (this.timeout || !this.loaded) return;

	var tick = function tick()
	{
		this.timeout = null;

		if (this.active) {
			if (this.sound.isLoaded) this.sound.play();

			setTimeout($.proxy(tick, this), this.delay);
		}
	};
	tick = $.proxy(tick, this);

	tick();
};


Eos.Metronome.prototype.stop = function ()
{
	this.active = false;
};

Eos.Music = {};

Eos.Music.layers = {};

Eos.Music.set = function (id, url)
{
	if (!url) {
		url = id;
		id = 'primary';
	}

	var snd = Eos.Music.layers[id];

	if (snd) {
		// TODO: Fade
		snd.stop();
		Eos.Music.layers[id] = Eos.Sound.create(url, {autoPlay: true, loops: 0});
	} else {
		Eos.Music.layers[id] = Eos.Sound.create(url, {autoPlay: true, loops: 0});
	}
};

Eos.Music.stop = function (id)
{
	if (!id) id = 'primary';

	var snd = Eos.Music.layers[id];

	if (snd) {
		snd.stop();
		delete Eos.Music.layers[id];
	}
};

Eos.Music.stopAll = function ()
{
	var i;
	for (i in Eos.Music.layers) {
		this.stop(i);
	}
};

Eos.Raphael = Class.extend(function (rphname)
{
	this.rphname = rphname;
});

Eos.Raphael.create = function (container, width, height)
{
	var rphname = 'rph'+Eos.Backend.getUnique();

	var raphaelObj = new Eos.Raphael(rphname);

	Eos.Backend.callApi('Raphael', 'create', [rphname, container, width, height]);

	return raphaelObj;
};

Eos.Raphael.prototype.path = function (pathString)
{
	var figname = 'fig'+Eos.Backend.getUnique();

	var figureObj = new Eos.Raphael.Figure(figname);

	Eos.Backend.callApi('Raphael', 'path', [this.rphname, figname, pathString]);

	return figureObj;
};

Eos.Raphael.prototype.circle = function (cx, cy, r)
{
	var figname = 'fig'+Eos.Backend.getUnique();

	var figureObj = new Eos.Raphael.Figure(figname);

	Eos.Backend.callApi('Raphael', 'circle', [this.rphname, figname, cx, cy, r]);

	return figureObj;
};

Eos.Raphael.prototype.clear = function ()
{
	Eos.Backend.callApi('Raphael', 'clear', [this.rphname]);
};

Eos.Raphael.prototype.setSize = function (width, height)
{
	Eos.Backend.callApi('Raphael', 'setSize', [this.rphname, width, height]);
};

Eos.Raphael.Figure = Class.extend(function (figname)
{
	this.figname = figname;
});

Eos.Raphael.Figure.prototype.attr = function (params)
{
	Eos.Backend.callApi('Raphael', 'attr', [this.figname, params]);

	return this;
};

Eos.TimerDisplay = Eos.Element.extend(function ()
{
	this.__super();

	this.elId = 'timerdisplay'+Eos.Backend.getUnique();

	this.textEl = $('<div></div>').addClass('text').appendTo(this);

	this.attr('id', this.elId);

	this.addClass('eosTimerDisplay');
});

Eos.TimerDisplay.prototype.doLayout = function ()
{
	var size = Math.min(this.currentBounds.width, this.currentBounds.height);

	if (!this.raphael) {
		this.raphael = Eos.Raphael.create(this.elId, size, size);
	} else {
		this.raphael.setSize(size, size);
	}

	this.css("width", size+'px');
	this.css("height", size+'px');

	this.textEl.css("line-height", size+'px');
	if (size > 100) this.textEl.css("font-size", '140%');

	this.size = size;
};

Eos.TimerDisplay.prototype.attachTo = function (timer)
{
	timer.bind("tick", $.proxy(function (event, current, total) {
		this.update.call(this, current, total);
	}, this));
	timer.bind("complete", $.proxy(this.complete, this));
};

Eos.TimerDisplay.prototype.update = function (current, total)
{
	if (!this.size) return;

	var strokeWidth = Math.round(this.size/10);

	this.raphael.clear();
	this.raphael.circle(this.size/2, this.size/2, this.size/2).attr({
		fill: "#333"
	});
	this.raphael.circle(this.size/2, this.size/2, this.size/2 - strokeWidth).attr({
		fill: "#555"
	});
	this.raphael.path().attr({
		stroke: "#fff",
		"stroke-width": strokeWidth,
		arc: [current, total, this.size/2 - strokeWidth/2, this.size/2, this.size/2]
	});

	var remaining = total - current;
	this.textEl.text(Math.ceil(remaining/1000));
};

Eos.TimerDisplay.prototype.complete = function ()
{
	this.raphael.clear();
	this.textEl.text('');
};

Eos.UnknownTimerDisplay = Eos.TimerDisplay.extend(function ()
{
	this.__super();
});

Eos.UnknownTimerDisplay.prototype.update = function (current, total)
{
	if (!this.size) return;

	var strokeWidth = Math.round(this.size/10);

	this.raphael.clear();
	this.raphael.circle(this.size/2, this.size/2, this.size/2 - strokeWidth).attr({
		fill: "#555"
	});
	this.raphael.circle(this.size/2, this.size/2, this.size/2 - strokeWidth/2).attr({
		stroke: "#fff",
		"stroke-width": strokeWidth
	});

	this.textEl.text("?");
};

Eos.ActivitySidebar = Eos.StandardContainer.extend(function (container)
{
	this.__super();

	this.addClass('eosActivitySidebar');

	if (!container) {
		container = Eos.Viewport;
	}

	container.addChild(this);

	this.items = [];
});

Eos.ActivitySidebar.prototype.doLayout = function ()
{
	var width = Math.floor(this.currentBounds.width * 0.2);
	width = Math.min(200, width);

	var i;
	for (i = 0; i < this.items.length; i++) {
		this.items[i].bounds({
			x: this.currentBounds.x,
			y: this.currentBounds.y,
			width: width,
			height: this.currentBounds.height
		});
		this.items[i].doLayout();
	}
};
