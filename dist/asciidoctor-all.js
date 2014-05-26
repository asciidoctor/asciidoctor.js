(function(undefined) {
  // The Opal object that is exposed globally
  var Opal = this.Opal = {};

  // The actual class for BasicObject
  var RubyBasicObject;

  // The actual Object class
  var RubyObject;

  // The actual Module class
  var RubyModule;

  // The actual Class class
  var RubyClass;

  // Constructor for instances of BasicObject
  function BasicObject(){}

  // Constructor for instances of Object
  function Object(){}

  // Constructor for instances of Class
  function Class(){}

  // Constructor for instances of Module
  function Module(){}

  // Constructor for instances of NilClass (nil)
  function NilClass(){}

  // All bridged classes - keep track to donate methods from Object
  var bridged_classes = [];

  // TopScope is used for inheriting constants from the top scope
  var TopScope = function(){};

  // Opal just acts as the top scope
  TopScope.prototype = Opal;

  // To inherit scopes
  Opal.constructor  = TopScope;

  Opal.constants = [];

  // This is a useful reference to global object inside ruby files
  Opal.global = this;

  // Minify common function calls
  var $hasOwn = Opal.hasOwnProperty;
  var $slice  = Opal.slice = Array.prototype.slice;

  // Generates unique id for every ruby object
  var unique_id = 0;

  // Return next unique id
  Opal.uid = function() {
    return unique_id++;
  };

  // Table holds all class variables
  Opal.cvars = {};

  // Globals table
  Opal.gvars = {};

  /*
   * Create a new constants scope for the given class with the given
   * base. Constants are looked up through their parents, so the base
   * scope will be the outer scope of the new klass.
   */
  function create_scope(base, klass, id) {
    var const_alloc   = function() {};
    var const_scope   = const_alloc.prototype = new base.constructor();
    klass._scope      = const_scope;
    const_scope.base  = klass;
    klass._base_module = base.base;
    const_scope.constructor = const_alloc;
    const_scope.constants = [];

    if (id) {
      klass._orig_scope = base;
      base[id] = base.constructor[id] = klass;
      base.constants.push(id);
    }
  }

  Opal.create_scope = create_scope;

  /*
   * A `class Foo; end` expression in ruby is compiled to call this runtime
   * method which either returns an existing class of the given name, or creates
   * a new class in the given `base` scope.
   *
   * If a constant with the given name exists, then we check to make sure that
   * it is a class and also that the superclasses match. If either of these
   * fail, then we raise a `TypeError`. Note, superklass may be null if one was
   * not specified in the ruby code.
   *
   * We pass a constructor to this method of the form `function ClassName() {}`
   * simply so that classes show up with nicely formatted names inside debuggers
   * in the web browser (or node/sprockets).
   *
   * The `base` is the current `self` value where the class is being created
   * from. We use this to get the scope for where the class should be created.
   * If `base` is an object (not a class/module), we simple get its class and
   * use that as the base instead.
   *
   * @param [Object] base where the class is being created
   * @param [Class] superklass superclass of the new class (may be null)
   * @param [String] id the name of the class to be created
   * @param [Function] constructor function to use as constructor
   * @return [Class] new or existing ruby class
   */
  Opal.klass = function(base, superklass, id, constructor) {

    // If base is an object, use its class
    if (!base._isClass) {
      base = base._klass;
    }

    // Not specifying a superclass means we can assume it to be Object
    if (superklass === null) {
      superklass = RubyObject;
    }

    var klass = base._scope[id];

    // If a constant exists in the scope, then we must use that
    if ($hasOwn.call(base._scope, id) && klass._orig_scope === base._scope) {

      // Make sure the existing constant is a class, or raise error
      if (!klass._isClass) {
        throw Opal.TypeError.$new(id + " is not a class");
      }

      // Make sure existing class has same superclass
      if (superklass !== klass._super && superklass !== RubyObject) {
        throw Opal.TypeError.$new("superclass mismatch for class " + id);
      }
    }
    else if (typeof(superklass) === 'function') {
      // passed native constructor as superklass, so bridge it as ruby class
      return bridge_class(id, superklass);
    }
    else {
      // if class doesnt exist, create a new one with given superclass
      klass = boot_class(superklass, constructor);

      // name class using base (e.g. Foo or Foo::Baz)
      klass._name = id;

      // every class gets its own constant scope, inherited from current scope
      create_scope(base._scope, klass, id);

      // Name new class directly onto current scope (Opal.Foo.Baz = klass)
      base[id] = base._scope[id] = klass;

      // Copy all parent constants to child, unless parent is Object
      if (superklass !== RubyObject && superklass !== RubyBasicObject) {
        Opal.donate_constants(superklass, klass);
      }

      // call .inherited() hook with new class on the superclass
      if (superklass.$inherited) {
        superklass.$inherited(klass);
      }
    }

    return klass;
  };

  // Create generic class with given superclass.
  var boot_class = Opal.boot = function(superklass, constructor) {
    // instances
    var ctor = function() {};
        ctor.prototype = superklass._proto;

    constructor.prototype = new ctor();

    constructor.prototype.constructor = constructor;

    return boot_class_meta(superklass, constructor);
  };

  // class itself
  function boot_class_meta(superklass, constructor) {
    var mtor = function() {};
    mtor.prototype = superklass.constructor.prototype;

    function OpalClass() {};
    OpalClass.prototype = new mtor();

    var klass = new OpalClass();

    klass._id         = unique_id++;
    klass._alloc      = constructor;
    klass._isClass    = true;
    klass.constructor = OpalClass;
    klass._super      = superklass;
    klass._methods    = [];
    klass.__inc__     = [];
    klass.__parent    = superklass;
    klass._proto      = constructor.prototype;

    constructor.prototype._klass = klass;

    return klass;
  }

  // Define new module (or return existing module)
  Opal.module = function(base, id) {
    var module;

    if (!base._isClass) {
      base = base._klass;
    }

    if ($hasOwn.call(base._scope, id)) {
      module = base._scope[id];

      if (!module.__mod__ && module !== RubyObject) {
        throw Opal.TypeError.$new(id + " is not a module")
      }
    }
    else {
      module = boot_module()
      module._name = id;

      create_scope(base._scope, module, id);

      // Name new module directly onto current scope (Opal.Foo.Baz = module)
      base[id] = base._scope[id] = module;
    }

    return module;
  };

  /*
   * Internal function to create a new module instance. This simply sets up
   * the prototype hierarchy and method tables.
   */
  function boot_module() {
    var mtor = function() {};
    mtor.prototype = RubyModule.constructor.prototype;

    function OpalModule() {};
    OpalModule.prototype = new mtor();

    var module = new OpalModule();

    module._id         = unique_id++;
    module._isClass    = true;
    module.constructor = OpalModule;
    module._super      = RubyModule;
    module._methods    = [];
    module.__inc__     = [];
    module.__parent    = RubyModule;
    module._proto      = {};
    module.__mod__     = true;
    module.__dep__     = [];

    return module;
  }

  // Boot a base class (makes instances).
  var boot_defclass = function(id, constructor, superklass) {
    if (superklass) {
      var ctor           = function() {};
          ctor.prototype = superklass.prototype;

      constructor.prototype = new ctor();
    }

    constructor.prototype.constructor = constructor;

    return constructor;
  };

  // Boot the actual (meta?) classes of core classes
  var boot_makemeta = function(id, constructor, superklass) {

    var mtor = function() {};
    mtor.prototype  = superklass.prototype;

    function OpalClass() {};
    OpalClass.prototype = new mtor();

    var klass = new OpalClass();

    klass._id         = unique_id++;
    klass._alloc      = constructor;
    klass._isClass    = true;
    klass._name       = id;
    klass._super      = superklass;
    klass.constructor = OpalClass;
    klass._methods    = [];
    klass.__inc__     = [];
    klass.__parent    = superklass;
    klass._proto      = constructor.prototype;

    constructor.prototype._klass = klass;

    Opal[id] = klass;
    Opal.constants.push(id);

    return klass;
  };

  /*
   * For performance, some core ruby classes are toll-free bridged to their
   * native javascript counterparts (e.g. a ruby Array is a javascript Array).
   *
   * This method is used to setup a native constructor (e.g. Array), to have
   * its prototype act like a normal ruby class. Firstly, a new ruby class is
   * created using the native constructor so that its prototype is set as the
   * target for th new class. Note: all bridged classes are set to inherit
   * from Object.
   *
   * Bridged classes are tracked in `bridged_classes` array so that methods
   * defined on Object can be "donated" to all bridged classes. This allows
   * us to fake the inheritance of a native prototype from our Object
   * prototype.
   *
   * Example:
   *
   *    bridge_class("Proc", Function);
   *
   * @param [String] name the name of the ruby class to create
   * @param [Function] constructor native javascript constructor to use
   * @return [Class] returns new ruby class
   */
  function bridge_class(name, constructor) {
    var klass = boot_class_meta(RubyObject, constructor);

    klass._name = name;

    create_scope(Opal, klass, name);
    bridged_classes.push(klass);

    var object_methods = RubyBasicObject._methods.concat(RubyObject._methods);

    for (var i = 0, len = object_methods.length; i < len; i++) {
      var meth = object_methods[i];
      constructor.prototype[meth] = RubyObject._proto[meth];
    }

    return klass;
  };

  /*
   * constant assign
   */
  Opal.casgn = function(base_module, name, value) {
    var scope = base_module._scope;

    if (value._isClass && value._name === nil) {
      value._name = name;
    }

    if (value._isClass) {
      value._base_module = base_module;
    }

    scope.constants.push(name);
    return scope[name] = value;
  };

  /*
   * constant decl
   */
  Opal.cdecl = function(base_scope, name, value) {
    base_scope.constants.push(name);
    return base_scope[name] = value;
  };

  /*
   * constant get
   */
  Opal.cget = function(base_scope, path) {
    if (path == null) {
      path       = base_scope;
      base_scope = Opal.Object;
    }

    var result = base_scope;

    path = path.split('::');
    while (path.length != 0) {
      result = result.$const_get(path.shift());
    }

    return result;
  }

  /*
   * When a source module is included into the target module, we must also copy
   * its constants to the target.
   */
  Opal.donate_constants = function(source_mod, target_mod) {
    var source_constants = source_mod._scope.constants,
        target_scope     = target_mod._scope,
        target_constants = target_scope.constants;

    for (var i = 0, length = source_constants.length; i < length; i++) {
      target_constants.push(source_constants[i]);
      target_scope[source_constants[i]] = source_mod._scope[source_constants[i]];
    }
  };

  /*
   * Methods stubs are used to facilitate method_missing in opal. A stub is a
   * placeholder function which just calls `method_missing` on the receiver.
   * If no method with the given name is actually defined on an object, then it
   * is obvious to say that the stub will be called instead, and then in turn
   * method_missing will be called.
   *
   * When a file in ruby gets compiled to javascript, it includes a call to
   * this function which adds stubs for every method name in the compiled file.
   * It should then be safe to assume that method_missing will work for any
   * method call detected.
   *
   * Method stubs are added to the BasicObject prototype, which every other
   * ruby object inherits, so all objects should handle method missing. A stub
   * is only added if the given property name (method name) is not already
   * defined.
   *
   * Note: all ruby methods have a `$` prefix in javascript, so all stubs will
   * have this prefix as well (to make this method more performant).
   *
   *    Opal.add_stubs(["$foo", "$bar", "$baz="]);
   *
   * All stub functions will have a private `rb_stub` property set to true so
   * that other internal methods can detect if a method is just a stub or not.
   * `Kernel#respond_to?` uses this property to detect a methods presence.
   *
   * @param [Array] stubs an array of method stubs to add
   */
  Opal.add_stubs = function(stubs) {
    for (var i = 0, length = stubs.length; i < length; i++) {
      var stub = stubs[i];

      if (!BasicObject.prototype[stub]) {
        BasicObject.prototype[stub] = true;
        add_stub_for(BasicObject.prototype, stub);
      }
    }
  };

  /*
   * Actuall add a method_missing stub function to the given prototype for the
   * given name.
   *
   * @param [Prototype] prototype the target prototype
   * @param [String] stub stub name to add (e.g. "$foo")
   */
  function add_stub_for(prototype, stub) {
    function method_missing_stub() {
      // Copy any given block onto the method_missing dispatcher
      this.$method_missing._p = method_missing_stub._p;

      // Set block property to null ready for the next call (stop false-positives)
      method_missing_stub._p = null;

      // call method missing with correct args (remove '$' prefix on method name)
      return this.$method_missing.apply(this, [stub.slice(1)].concat($slice.call(arguments)));
    }

    method_missing_stub.rb_stub = true;
    prototype[stub] = method_missing_stub;
  }

  // Expose for other parts of Opal to use
  Opal.add_stub_for = add_stub_for;

  // Const missing dispatcher
  Opal.cm = function(name) {
    return this.base.$const_missing(name);
  };

  // Arity count error dispatcher
  Opal.ac = function(actual, expected, object, meth) {
    var inspect = (object._isClass ? object._name + '.' : object._klass._name + '#') + meth;
    var msg = '[' + inspect + '] wrong number of arguments(' + actual + ' for ' + expected + ')';
    throw Opal.ArgumentError.$new(msg);
  };

  // Super dispatcher
  Opal.find_super_dispatcher = function(obj, jsid, current_func, iter, defs) {
    var dispatcher;

    if (defs) {
      dispatcher = obj._isClass ? defs._super : obj._klass._proto;
    }
    else {
      if (obj._isClass) {
        dispatcher = obj._super;
      }
      else {
        dispatcher = find_obj_super_dispatcher(obj, jsid, current_func);
      }
    }

    dispatcher = dispatcher['$' + jsid];
    dispatcher._p = iter;

    return dispatcher;
  };

  // Iter dispatcher for super in a block
  Opal.find_iter_super_dispatcher = function(obj, jsid, current_func, iter, defs) {
    if (current_func._def) {
      return Opal.find_super_dispatcher(obj, current_func._jsid, current_func, iter, defs);
    }
    else {
      return Opal.find_super_dispatcher(obj, jsid, current_func, iter, defs);
    }
  };

  var find_obj_super_dispatcher = function(obj, jsid, current_func) {
    var klass = obj.__meta__ || obj._klass;

    while (klass) {
      if (klass._proto['$' + jsid] === current_func) {
        // ok
        break;
      }

      klass = klass.__parent;
    }

    // if we arent in a class, we couldnt find current?
    if (!klass) {
      throw new Error("could not find current class for super()");
    }

    klass = klass.__parent;

    // else, let's find the next one
    while (klass) {
      var working = klass._proto['$' + jsid];

      if (working && working !== current_func) {
        // ok
        break;
      }

      klass = klass.__parent;
    }

    return klass._proto;
  };

  /*
   * Used to return as an expression. Sometimes, we can't simply return from
   * a javascript function as if we were a method, as the return is used as
   * an expression, or even inside a block which must "return" to the outer
   * method. This helper simply throws an error which is then caught by the
   * method. This approach is expensive, so it is only used when absolutely
   * needed.
   */
  Opal.$return = function(val) {
    Opal.returner.$v = val;
    throw Opal.returner;
  };

  // handles yield calls for 1 yielded arg
  Opal.$yield1 = function(block, arg) {
    if (typeof(block) !== "function") {
      throw Opal.LocalJumpError.$new("no block given");
    }

    if (block.length > 1) {
      if (arg._isArray) {
        return block.apply(null, arg);
      }
      else {
        return block(arg);
      }
    }
    else {
      return block(arg);
    }
  };

  // handles yield for > 1 yielded arg
  Opal.$yieldX = function(block, args) {
    if (typeof(block) !== "function") {
      throw Opal.LocalJumpError.$new("no block given");
    }

    if (block.length > 1 && args.length == 1) {
      if (args[0]._isArray) {
        return block.apply(null, args[0]);
      }
    }

    if (!args._isArray) {
      args = $slice.call(args);
    }

    return block.apply(null, args);
  };

  // Finds the corresponding exception match in candidates.  Each candidate can
  // be a value, or an array of values.  Returns null if not found.
  Opal.$rescue = function(exception, candidates) {
    for (var i = 0; i != candidates.length; i++) {
      var candidate = candidates[i];
      if (candidate._isArray) {
        var subresult;
        if (subresult = Opal.$rescue(exception, candidate)) {
          return subresult;
        }
      }
      else if (candidate['$==='](exception)) {
        return candidate;
      }
    }
    return null;
  };

  Opal.is_a = function(object, klass) {
    if (object.__meta__ === klass) {
      return true;
    }

    var search = object._klass;

    while (search) {
      if (search === klass) {
        return true;
      }

      for (var i = 0, length = search.__inc__.length; i < length; i++) {
        if (search.__inc__[i] == klass) {
          return true;
        }
      }

      search = search._super;
    }

    return false;
  }

  // Helper to convert the given object to an array
  Opal.to_ary = function(value) {
    if (value._isArray) {
      return value;
    }
    else if (value.$to_ary && !value.$to_ary.rb_stub) {
      return value.$to_ary();
    }

    return [value];
  };

  /*
    Call a ruby method on a ruby object with some arguments:

      var my_array = [1, 2, 3, 4]
      Opal.send(my_array, 'length')     # => 4
      Opal.send(my_array, 'reverse!')   # => [4, 3, 2, 1]

    A missing method will be forwarded to the object via
    method_missing.

    The result of either call with be returned.

    @param [Object] recv the ruby object
    @param [String] mid ruby method to call
  */
  Opal.send = function(recv, mid) {
    var args = $slice.call(arguments, 2),
        func = recv['$' + mid];

    if (func) {
      return func.apply(recv, args);
    }

    return recv.$method_missing.apply(recv, [mid].concat(args));
  };

  Opal.block_send = function(recv, mid, block) {
    var args = $slice.call(arguments, 3),
        func = recv['$' + mid];

    if (func) {
      func._p = block;
      return func.apply(recv, args);
    }

    return recv.$method_missing.apply(recv, [mid].concat(args));
  };

  /**
   * Donate methods for a class/module
   */
  Opal.donate = function(klass, defined, indirect) {
    var methods = klass._methods, included_in = klass.__dep__;

    // if (!indirect) {
      klass._methods = methods.concat(defined);
    // }

    if (included_in) {
      for (var i = 0, length = included_in.length; i < length; i++) {
        var includee = included_in[i];
        var dest = includee._proto;

        for (var j = 0, jj = defined.length; j < jj; j++) {
          var method = defined[j];
          dest[method] = klass._proto[method];
          dest[method]._donated = true;
        }

        if (includee.__dep__) {
          Opal.donate(includee, defined, true);
        }
      }
    }
  };

  Opal.defn = function(obj, jsid, body) {
    if (obj.__mod__) {
      obj._proto[jsid] = body;
      Opal.donate(obj, [jsid]);
    }
    else if (obj._isClass) {
      obj._proto[jsid] = body;

      if (obj === RubyBasicObject) {
        define_basic_object_method(jsid, body);
      }
      else if (obj === RubyObject) {
        Opal.donate(obj, [jsid]);
      }
    }
    else {
      obj[jsid] = body;
    }

    return nil;
  };

  /*
   * Define a singleton method on the given object.
   */
  Opal.defs = function(obj, jsid, body) {
    if (obj._isClass || obj.__mod__) {
      obj.constructor.prototype[jsid] = body;
    }
    else {
      obj[jsid] = body;
    }
  };

  function define_basic_object_method(jsid, body) {
    RubyBasicObject._methods.push(jsid);
    for (var i = 0, len = bridged_classes.length; i < len; i++) {
      bridged_classes[i]._proto[jsid] = body;
    }
  }

  Opal.hash = function() {
    if (arguments.length == 1 && arguments[0]._klass == Opal.Hash) {
      return arguments[0];
    }

    var hash   = new Opal.Hash._alloc,
        keys   = [],
        assocs = {};

    hash.map   = assocs;
    hash.keys  = keys;

    if (arguments.length == 1) {
      if (arguments[0]._isArray) {
        var args = arguments[0];

        for (var i = 0, length = args.length; i < length; i++) {
          var pair = args[i];

          if (pair.length !== 2) {
            throw Opal.ArgumentError.$new("value not of length 2: " + pair.$inspect());
          }

          var key = pair[0],
              obj = pair[1];

          if (assocs[key] == null) {
            keys.push(key);
          }

          assocs[key] = obj;
        }
      }
      else {
        var obj = arguments[0];
        for (var key in obj) {
          assocs[key] = obj[key];
          keys.push(key);
        }
      }
    }
    else {
      var length = arguments.length;
      if (length % 2 !== 0) {
        throw Opal.ArgumentError.$new("odd number of arguments for Hash");
      }

      for (var i = 0; i < length; i++) {
        var key = arguments[i],
            obj = arguments[++i];

        if (assocs[key] == null) {
          keys.push(key);
        }

        assocs[key] = obj;
      }
    }

    return hash;
  };

  /*
   * hash2 is a faster creator for hashes that just use symbols and
   * strings as keys. The map and keys array can be constructed at
   * compile time, so they are just added here by the constructor
   * function
   */
  Opal.hash2 = function(keys, map) {
    var hash = new Opal.Hash._alloc;

    hash.keys = keys;
    hash.map  = map;

    return hash;
  };

  /*
   * Create a new range instance with first and last values, and whether the
   * range excludes the last value.
   */
  Opal.range = function(first, last, exc) {
    var range         = new Opal.Range._alloc;
        range.begin   = first;
        range.end     = last;
        range.exclude = exc;

    return range;
  };

  // Initialization
  // --------------

  // Constructors for *instances* of core objects
  boot_defclass('BasicObject', BasicObject);
  boot_defclass('Object', Object, BasicObject);
  boot_defclass('Module', Module, Object);
  boot_defclass('Class', Class, Module);

  // Constructors for *classes* of core objects
  RubyBasicObject = boot_makemeta('BasicObject', BasicObject, Class);
  RubyObject      = boot_makemeta('Object', Object, RubyBasicObject.constructor);
  RubyModule      = boot_makemeta('Module', Module, RubyObject.constructor);
  RubyClass       = boot_makemeta('Class', Class, RubyModule.constructor);

  // Fix booted classes to use their metaclass
  RubyBasicObject._klass = RubyClass;
  RubyObject._klass = RubyClass;
  RubyModule._klass = RubyClass;
  RubyClass._klass = RubyClass;

  // Fix superclasses of booted classes
  RubyBasicObject._super = null;
  RubyObject._super = RubyBasicObject;
  RubyModule._super = RubyObject;
  RubyClass._super = RubyModule;

  // Internally, Object acts like a module as it is "included" into bridged
  // classes. In other words, we donate methods from Object into our bridged
  // classes as their prototypes don't inherit from our root Object, so they
  // act like module includes.
  RubyObject.__dep__ = bridged_classes;

  Opal.base = RubyObject;
  RubyBasicObject._scope = RubyObject._scope = Opal;
  RubyBasicObject._orig_scope = RubyObject._orig_scope = Opal;
  Opal.Kernel = RubyObject;

  RubyModule._scope = RubyObject._scope;
  RubyClass._scope = RubyObject._scope;
  RubyModule._orig_scope = RubyObject._orig_scope;
  RubyClass._orig_scope = RubyObject._orig_scope;

  RubyObject._proto.toString = function() {
    return this.$to_s();
  };

  Opal.top = new RubyObject._alloc();

  Opal.klass(RubyObject, RubyObject, 'NilClass', NilClass);

  var nil = Opal.nil = new NilClass;
  nil.call = nil.apply = function() { throw Opal.LocalJumpError.$new('no block given'); };

  Opal.breaker  = new Error('unexpected break');
  Opal.returner = new Error('unexpected return');

  bridge_class('Array', Array);
  bridge_class('Boolean', Boolean);
  bridge_class('Numeric', Number);
  bridge_class('String', String);
  bridge_class('Proc', Function);
  bridge_class('Exception', Error);
  bridge_class('Regexp', RegExp);
  bridge_class('Time', Date);

  TypeError._super = Error;
}).call(this);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  $opal.add_stubs(['$new', '$class', '$===', '$respond_to?', '$raise', '$type_error', '$__send__', '$coerce_to', '$nil?', '$<=>', '$name', '$inspect']);
  return (function($base) {
    var self = $module($base, 'Opal');

    var def = self._proto, $scope = self._scope;

    $opal.defs(self, '$type_error', function(object, type, method, coerced) {
      var $a, $b, self = this;

      if (method == null) {
        method = nil
      }
      if (coerced == null) {
        coerced = nil
      }
      if ((($a = (($b = method !== false && method !== nil) ? coerced : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return $scope.TypeError.$new("can't convert " + (object.$class()) + " into " + (type) + " (" + (object.$class()) + "#" + (method) + " gives " + (coerced.$class()))
        } else {
        return $scope.TypeError.$new("no implicit conversion of " + (object.$class()) + " into " + (type))
      };
    });

    $opal.defs(self, '$coerce_to', function(object, type, method) {
      var $a, self = this;

      if ((($a = type['$==='](object)) !== nil && (!$a._isBoolean || $a == true))) {
        return object};
      if ((($a = object['$respond_to?'](method)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise(self.$type_error(object, type))
      };
      return object.$__send__(method);
    });

    $opal.defs(self, '$coerce_to!', function(object, type, method) {
      var $a, self = this, coerced = nil;

      coerced = self.$coerce_to(object, type, method);
      if ((($a = type['$==='](coerced)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise(self.$type_error(object, type, method, coerced))
      };
      return coerced;
    });

    $opal.defs(self, '$coerce_to?', function(object, type, method) {
      var $a, self = this, coerced = nil;

      if ((($a = object['$respond_to?'](method)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return nil
      };
      coerced = self.$coerce_to(object, type, method);
      if ((($a = coerced['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return nil};
      if ((($a = type['$==='](coerced)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise(self.$type_error(object, type, method, coerced))
      };
      return coerced;
    });

    $opal.defs(self, '$try_convert', function(object, type, method) {
      var $a, self = this;

      if ((($a = type['$==='](object)) !== nil && (!$a._isBoolean || $a == true))) {
        return object};
      if ((($a = object['$respond_to?'](method)) !== nil && (!$a._isBoolean || $a == true))) {
        return object.$__send__(method)
        } else {
        return nil
      };
    });

    $opal.defs(self, '$compare', function(a, b) {
      var $a, self = this, compare = nil;

      compare = a['$<=>'](b);
      if ((($a = compare === nil) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "comparison of " + (a.$class().$name()) + " with " + (b.$class().$name()) + " failed")};
      return compare;
    });

    $opal.defs(self, '$destructure', function(args) {
      var self = this;

      
      if (args.length == 1) {
        return args[0];
      }
      else if (args._isArray) {
        return args;
      }
      else {
        return $slice.call(args);
      }
    
    });

    $opal.defs(self, '$respond_to?', function(obj, method) {
      var self = this;

      
      if (obj == null || !obj._klass) {
        return false;
      }
    
      return obj['$respond_to?'](method);
    });

    $opal.defs(self, '$inspect', function(obj) {
      var self = this;

      
      if (obj === undefined) {
        return "undefined";
      }
      else if (obj === null) {
        return "null";
      }
      else if (!obj._klass) {
        return obj.toString();
      }
      else {
        return obj.$inspect();
      }
    
    });
    
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/helpers.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$attr_reader', '$attr_writer', '$=~', '$raise', '$const_missing', '$to_str', '$to_proc', '$append_features', '$included', '$name', '$new', '$to_s']);
  return (function($base, $super) {
    function $Module(){};
    var self = $Module = $klass($base, $super, 'Module', $Module);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4;

    $opal.defs(self, '$new', TMP_1 = function() {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      
      function AnonModule(){}
      var klass     = Opal.boot(Opal.Module, AnonModule);
      klass._name   = nil;
      klass._klass  = Opal.Module;
      klass.__dep__ = []
      klass.__mod__ = true;
      klass._proto  = {};

      // inherit scope from parent
      $opal.create_scope(Opal.Module._scope, klass);

      if (block !== nil) {
        var block_self = block._s;
        block._s = null;
        block.call(klass);
        block._s = block_self;
      }

      return klass;
    
    });

    def['$==='] = function(object) {
      var $a, self = this;

      if ((($a = object == null) !== nil && (!$a._isBoolean || $a == true))) {
        return false};
      return $opal.is_a(object, self);
    };

    def['$<'] = function(other) {
      var self = this;

      
      var working = self;

      while (working) {
        if (working === other) {
          return true;
        }

        working = working.__parent;
      }

      return false;
    
    };

    def.$alias_method = function(newname, oldname) {
      var self = this;

      
      self._proto['$' + newname] = self._proto['$' + oldname];

      if (self._methods) {
        $opal.donate(self, ['$' + newname ])
      }
    
      return self;
    };

    def.$alias_native = function(mid, jsid) {
      var self = this;

      if (jsid == null) {
        jsid = mid
      }
      return self._proto['$' + mid] = self._proto[jsid];
    };

    def.$ancestors = function() {
      var self = this;

      
      var parent = self,
          result = [];

      while (parent) {
        result.push(parent);
        result = result.concat(parent.__inc__);

        parent = parent._super;
      }

      return result;
    
    };

    def.$append_features = function(klass) {
      var self = this;

      
      var module   = self,
          included = klass.__inc__;

      // check if this module is already included in the klass
      for (var i = 0, length = included.length; i < length; i++) {
        if (included[i] === module) {
          return;
        }
      }

      included.push(module);
      module.__dep__.push(klass);

      // iclass
      var iclass = {
        name: module._name,

        _proto:   module._proto,
        __parent: klass.__parent,
        __iclass: true
      };

      klass.__parent = iclass;

      var donator   = module._proto,
          prototype = klass._proto,
          methods   = module._methods;

      for (var i = 0, length = methods.length; i < length; i++) {
        var method = methods[i];

        if (prototype.hasOwnProperty(method) && !prototype[method]._donated) {
          // if the target class already has a method of the same name defined
          // and that method was NOT donated, then it must be a method defined
          // by the class so we do not want to override it
        }
        else {
          prototype[method] = donator[method];
          prototype[method]._donated = true;
        }
      }

      if (klass.__dep__) {
        $opal.donate(klass, methods.slice(), true);
      }

      $opal.donate_constants(module, klass);
    
      return self;
    };

    def.$attr_accessor = function(names) {
      var $a, $b, self = this;

      names = $slice.call(arguments, 0);
      ($a = self).$attr_reader.apply($a, [].concat(names));
      return ($b = self).$attr_writer.apply($b, [].concat(names));
    };

    def.$attr_reader = function(names) {
      var self = this;

      names = $slice.call(arguments, 0);
      
      var proto = self._proto, cls = self;
      for (var i = 0, length = names.length; i < length; i++) {
        (function(name) {
          proto[name] = nil;
          var func = function() { return this[name] };

          if (cls._isSingleton) {
            proto.constructor.prototype['$' + name] = func;
          }
          else {
            proto['$' + name] = func;
            $opal.donate(self, ['$' + name ]);
          }
        })(names[i]);
      }
    
      return nil;
    };

    def.$attr_writer = function(names) {
      var self = this;

      names = $slice.call(arguments, 0);
      
      var proto = self._proto, cls = self;
      for (var i = 0, length = names.length; i < length; i++) {
        (function(name) {
          proto[name] = nil;
          var func = function(value) { return this[name] = value; };

          if (cls._isSingleton) {
            proto.constructor.prototype['$' + name + '='] = func;
          }
          else {
            proto['$' + name + '='] = func;
            $opal.donate(self, ['$' + name + '=']);
          }
        })(names[i]);
      }
    
      return nil;
    };

    $opal.defn(self, '$attr', def.$attr_accessor);

    def.$constants = function() {
      var self = this;

      return self._scope.constants;
    };

    def['$const_defined?'] = function(name, inherit) {
      var $a, self = this;

      if (inherit == null) {
        inherit = true
      }
      if ((($a = name['$=~'](/^[A-Z]\w*$/)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.NameError, "wrong constant name " + (name))
      };
      
      scopes = [self._scope];
      if (inherit || self === Opal.Object) {
        var parent = self._super;
        while (parent !== Opal.BasicObject) {
          scopes.push(parent._scope);
          parent = parent._super;
        }
      }

      for (var i = 0, len = scopes.length; i < len; i++) {
        if (scopes[i].hasOwnProperty(name)) {
          return true;
        }
      }

      return false;
    
    };

    def.$const_get = function(name, inherit) {
      var $a, self = this;

      if (inherit == null) {
        inherit = true
      }
      if ((($a = name['$=~'](/^[A-Z]\w*$/)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.NameError, "wrong constant name " + (name))
      };
      
      var scopes = [self._scope];
      if (inherit || self == Opal.Object) {
        var parent = self._super;
        while (parent !== Opal.BasicObject) {
          scopes.push(parent._scope);
          parent = parent._super;
        }
      }

      for (var i = 0, len = scopes.length; i < len; i++) {
        if (scopes[i].hasOwnProperty(name)) {
          return scopes[i][name];
        }
      }

      return self.$const_missing(name);
    
    };

    def.$const_missing = function(const$) {
      var self = this, name = nil;

      name = self._name;
      return self.$raise($scope.NameError, "uninitialized constant " + (name) + "::" + (const$));
    };

    def.$const_set = function(name, value) {
      var $a, self = this;

      if ((($a = name['$=~'](/^[A-Z]\w*$/)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.NameError, "wrong constant name " + (name))
      };
      try {
      name = name.$to_str()
      } catch ($err) {if (true) {
        self.$raise($scope.TypeError, "conversion with #to_str failed")
        }else { throw $err; }
      };
      
      $opal.casgn(self, name, value);
      return value
    ;
    };

    def.$define_method = TMP_2 = function(name, method) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      
      if (method) {
        block = method.$to_proc();
      }

      if (block === nil) {
        throw new Error("no block given");
      }

      var jsid    = '$' + name;
      block._jsid = name;
      block._s    = null;
      block._def  = block;

      self._proto[jsid] = block;
      $opal.donate(self, [jsid]);

      return name;
    ;
    };

    def.$remove_method = function(name) {
      var self = this;

      
      var jsid    = '$' + name;
      var current = self._proto[jsid];
      delete self._proto[jsid];

      // Check if we need to reverse $opal.donate
      // $opal.retire(self, [jsid]);
      return self;
    
    };

    def.$include = function(mods) {
      var self = this;

      mods = $slice.call(arguments, 0);
      
      for (var i = mods.length - 1; i >= 0; i--) {
        var mod = mods[i];

        if (mod === self) {
          continue;
        }

        (mod).$append_features(self);
        (mod).$included(self);
      }
    
      return self;
    };

    def['$include?'] = function(mod) {
      var self = this;

      
      for (var cls = self; cls; cls = cls.parent) {
        for (var i = 0; i != cls.__inc__.length; i++) {
          var mod2 = cls.__inc__[i];
          if (mod === mod2) {
            return true;
          }
        }
      }
      return false;
    
    };

    def.$instance_method = function(name) {
      var self = this;

      
      var meth = self._proto['$' + name];

      if (!meth || meth.rb_stub) {
        self.$raise($scope.NameError, "undefined method `" + (name) + "' for class `" + (self.$name()) + "'");
      }

      return $scope.UnboundMethod.$new(self, meth, name);
    
    };

    def.$instance_methods = function(include_super) {
      var self = this;

      if (include_super == null) {
        include_super = false
      }
      
      var methods = [], proto = self._proto;

      for (var prop in self._proto) {
        if (!include_super && !proto.hasOwnProperty(prop)) {
          continue;
        }

        if (!include_super && proto[prop]._donated) {
          continue;
        }

        if (prop.charAt(0) === '$') {
          methods.push(prop.substr(1));
        }
      }

      return methods;
    
    };

    def.$included = function(mod) {
      var self = this;

      return nil;
    };

    def.$extended = function(mod) {
      var self = this;

      return nil;
    };

    def.$module_eval = TMP_3 = function() {
      var self = this, $iter = TMP_3._p, block = $iter || nil;

      TMP_3._p = null;
      if (block !== false && block !== nil) {
        } else {
        self.$raise($scope.ArgumentError, "no block given")
      };
      
      var old = block._s,
          result;

      block._s = null;
      result = block.call(self);
      block._s = old;

      return result;
    
    };

    $opal.defn(self, '$class_eval', def.$module_eval);

    def.$module_exec = TMP_4 = function() {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      
      if (block === nil) {
        throw new Error("no block given");
      }

      var block_self = block._s, result;

      block._s = null;
      result = block.apply(self, $slice.call(arguments));
      block._s = block_self;

      return result;
    
    };

    $opal.defn(self, '$class_exec', def.$module_exec);

    def['$method_defined?'] = function(method) {
      var self = this;

      
      var body = self._proto['$' + method];
      return (!!body) && !body.rb_stub;
    
    };

    def.$module_function = function(methods) {
      var self = this;

      methods = $slice.call(arguments, 0);
      
      for (var i = 0, length = methods.length; i < length; i++) {
        var meth = methods[i], func = self._proto['$' + meth];

        self.constructor.prototype['$' + meth] = func;
      }

      return self;
    
    };

    def.$name = function() {
      var self = this;

      
      if (self._full_name) {
        return self._full_name;
      }

      var result = [], base = self;

      while (base) {
        if (base._name === nil) {
          return result.length === 0 ? nil : result.join('::');
        }

        result.unshift(base._name);

        base = base._base_module;

        if (base === $opal.Object) {
          break;
        }
      }

      if (result.length === 0) {
        return nil;
      }

      return self._full_name = result.join('::');
    
    };

    def.$public = function() {
      var self = this;

      return nil;
    };

    def.$private_class_method = function(name) {
      var self = this;

      return self['$' + name] || nil;
    };

    $opal.defn(self, '$private', def.$public);

    $opal.defn(self, '$protected', def.$public);

    def['$private_method_defined?'] = function(obj) {
      var self = this;

      return false;
    };

    def.$private_constant = function() {
      var self = this;

      return nil;
    };

    $opal.defn(self, '$protected_method_defined?', def['$private_method_defined?']);

    $opal.defn(self, '$public_instance_methods', def.$instance_methods);

    $opal.defn(self, '$public_method_defined?', def['$method_defined?']);

    def.$remove_class_variable = function() {
      var self = this;

      return nil;
    };

    def.$remove_const = function(name) {
      var self = this;

      
      var old = self._scope[name];
      delete self._scope[name];
      return old;
    
    };

    def.$to_s = function() {
      var self = this;

      return self.$name().$to_s();
    };

    return (def.$undef_method = function(symbol) {
      var self = this;

      $opal.add_stub_for(self._proto, "$" + symbol);
      return self;
    }, nil) && 'undef_method';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/module.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$raise', '$allocate']);
  ;
  return (function($base, $super) {
    function $Class(){};
    var self = $Class = $klass($base, $super, 'Class', $Class);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2;

    $opal.defs(self, '$new', TMP_1 = function(sup) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      if (sup == null) {
        sup = $scope.Object
      }
      TMP_1._p = null;
      
      if (!sup._isClass || sup.__mod__) {
        self.$raise($scope.TypeError, "superclass must be a Class");
      }

      function AnonClass(){};
      var klass       = Opal.boot(sup, AnonClass)
      klass._name     = nil;
      klass.__parent  = sup;

      // inherit scope from parent
      $opal.create_scope(sup._scope, klass);

      sup.$inherited(klass);

      if (block !== nil) {
        var block_self = block._s;
        block._s = null;
        block.call(klass);
        block._s = block_self;
      }

      return klass;
    ;
    });

    def.$allocate = function() {
      var self = this;

      
      var obj = new self._alloc;
      obj._id = Opal.uid();
      return obj;
    
    };

    def.$inherited = function(cls) {
      var self = this;

      return nil;
    };

    def.$new = TMP_2 = function(args) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_2._p = null;
      
      var obj = self.$allocate();

      obj.$initialize._p = block;
      obj.$initialize.apply(obj, args);
      return obj;
    ;
    };

    return (def.$superclass = function() {
      var self = this;

      return self._super || nil;
    }, nil) && 'superclass';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/class.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$raise']);
  return (function($base, $super) {
    function $BasicObject(){};
    var self = $BasicObject = $klass($base, $super, 'BasicObject', $BasicObject);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4;

    $opal.defn(self, '$initialize', function() {
      var self = this;

      return nil;
    });

    $opal.defn(self, '$==', function(other) {
      var self = this;

      return self === other;
    });

    $opal.defn(self, '$__id__', function() {
      var self = this;

      return self._id || (self._id = Opal.uid());
    });

    $opal.defn(self, '$__send__', TMP_1 = function(symbol, args) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_1._p = null;
      
      var func = self['$' + symbol]

      if (func) {
        if (block !== nil) {
          func._p = block;
        }

        return func.apply(self, args);
      }

      if (block !== nil) {
        self.$method_missing._p = block;
      }

      return self.$method_missing.apply(self, [symbol].concat(args));
    
    });

    $opal.defn(self, '$!', function() {
      var self = this;

      return false;
    });

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$equal?', def['$==']);

    $opal.defn(self, '$instance_eval', TMP_2 = function() {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      if (block !== false && block !== nil) {
        } else {
        $scope.Kernel.$raise($scope.ArgumentError, "no block given")
      };
      
      var old = block._s,
          result;

      block._s = null;
      result = block.call(self, self);
      block._s = old;

      return result;
    
    });

    $opal.defn(self, '$instance_exec', TMP_3 = function(args) {
      var self = this, $iter = TMP_3._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_3._p = null;
      if (block !== false && block !== nil) {
        } else {
        $scope.Kernel.$raise($scope.ArgumentError, "no block given")
      };
      
      var block_self = block._s,
          result;

      block._s = null;
      result = block.apply(self, args);
      block._s = block_self;

      return result;
    
    });

    return ($opal.defn(self, '$method_missing', TMP_4 = function(symbol, args) {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_4._p = null;
      return $scope.Kernel.$raise($scope.NoMethodError, "undefined method `" + (symbol) + "' for BasicObject instance");
    }), nil) && 'method_missing';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/basic_object.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $gvars = $opal.gvars;

  $opal.add_stubs(['$raise', '$inspect', '$==', '$name', '$class', '$new', '$respond_to?', '$to_ary', '$to_a', '$allocate', '$copy_instance_variables', '$initialize_clone', '$initialize_copy', '$singleton_class', '$initialize_dup', '$for', '$to_proc', '$append_features', '$extended', '$to_i', '$to_s', '$to_f', '$*', '$===', '$empty?', '$ArgumentError', '$nan?', '$infinite?', '$to_int', '$>', '$length', '$print', '$format', '$puts', '$each', '$<=', '$[]', '$nil?', '$is_a?', '$rand', '$coerce_to', '$respond_to_missing?']);
  return (function($base) {
    var self = $module($base, 'Kernel');

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_9;

    def.$method_missing = TMP_1 = function(symbol, args) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_1._p = null;
      return self.$raise($scope.NoMethodError, "undefined method `" + (symbol) + "' for " + (self.$inspect()));
    };

    def['$=~'] = function(obj) {
      var self = this;

      return false;
    };

    def['$==='] = function(other) {
      var self = this;

      return self['$=='](other);
    };

    def['$<=>'] = function(other) {
      var self = this;

      
      if (self['$=='](other)) {
        return 0;
      }

      return nil;
    ;
    };

    def.$method = function(name) {
      var self = this;

      
      var meth = self['$' + name];

      if (!meth || meth.rb_stub) {
        self.$raise($scope.NameError, "undefined method `" + (name) + "' for class `" + (self.$class().$name()) + "'");
      }

      return $scope.Method.$new(self, meth, name);
    
    };

    def.$methods = function(all) {
      var self = this;

      if (all == null) {
        all = true
      }
      
      var methods = [];

      for (var key in self) {
        if (key[0] == "$" && typeof(self[key]) === "function") {
          if (all == false || all === nil) {
            if (!$opal.hasOwnProperty.call(self, key)) {
              continue;
            }
          }
          if (self[key].rb_stub === undefined) {
            methods.push(key.substr(1));
          }
        }
      }

      return methods;
    
    };

    def.$Array = TMP_2 = function(object, args) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_2._p = null;
      
      if (object == null || object === nil) {
        return [];
      }
      else if (object['$respond_to?']("to_ary")) {
        return object.$to_ary();
      }
      else if (object['$respond_to?']("to_a")) {
        return object.$to_a();
      }
      else {
        return [object];
      }
    ;
    };

    def.$caller = function() {
      var self = this;

      return [];
    };

    def.$class = function() {
      var self = this;

      return self._klass;
    };

    def.$copy_instance_variables = function(other) {
      var self = this;

      
      for (var name in other) {
        if (name.charAt(0) !== '$') {
          if (name !== '_id' && name !== '_klass') {
            self[name] = other[name];
          }
        }
      }
    
    };

    def.$clone = function() {
      var self = this, copy = nil;

      copy = self.$class().$allocate();
      copy.$copy_instance_variables(self);
      copy.$initialize_clone(self);
      return copy;
    };

    def.$initialize_clone = function(other) {
      var self = this;

      return self.$initialize_copy(other);
    };

    def.$define_singleton_method = TMP_3 = function(name) {
      var self = this, $iter = TMP_3._p, body = $iter || nil;

      TMP_3._p = null;
      if (body !== false && body !== nil) {
        } else {
        self.$raise($scope.ArgumentError, "tried to create Proc object without a block")
      };
      
      var jsid   = '$' + name;
      body._jsid = name;
      body._s    = null;
      body._def  = body;

      self.$singleton_class()._proto[jsid] = body;

      return self;
    
    };

    def.$dup = function() {
      var self = this, copy = nil;

      copy = self.$class().$allocate();
      copy.$copy_instance_variables(self);
      copy.$initialize_dup(self);
      return copy;
    };

    def.$initialize_dup = function(other) {
      var self = this;

      return self.$initialize_copy(other);
    };

    def.$enum_for = TMP_4 = function(method, args) {
      var $a, $b, self = this, $iter = TMP_4._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      if (method == null) {
        method = "each"
      }
      TMP_4._p = null;
      return ($a = ($b = $scope.Enumerator).$for, $a._p = block.$to_proc(), $a).apply($b, [self, method].concat(args));
    };

    $opal.defn(self, '$to_enum', def.$enum_for);

    def['$equal?'] = function(other) {
      var self = this;

      return self === other;
    };

    def.$extend = function(mods) {
      var self = this;

      mods = $slice.call(arguments, 0);
      
      var singleton = self.$singleton_class();

      for (var i = mods.length - 1; i >= 0; i--) {
        var mod = mods[i];

        (mod).$append_features(singleton);
        (mod).$extended(self);
      }
    ;
      return self;
    };

    def.$format = function(format, args) {
      var self = this;

      args = $slice.call(arguments, 1);
      
      var idx = 0;
      return format.replace(/%(\d+\$)?([-+ 0]*)(\d*|\*(\d+\$)?)(?:\.(\d*|\*(\d+\$)?))?([cspdiubBoxXfgeEG])|(%%)/g, function(str, idx_str, flags, width_str, w_idx_str, prec_str, p_idx_str, spec, escaped) {
        if (escaped) {
          return '%';
        }

        var width,
        prec,
        is_integer_spec = ("diubBoxX".indexOf(spec) != -1),
        is_float_spec = ("eEfgG".indexOf(spec) != -1),
        prefix = '',
        obj;

        if (width_str === undefined) {
          width = undefined;
        } else if (width_str.charAt(0) == '*') {
          var w_idx = idx++;
          if (w_idx_str) {
            w_idx = parseInt(w_idx_str, 10) - 1;
          }
          width = (args[w_idx]).$to_i();
        } else {
          width = parseInt(width_str, 10);
        }
        if (!prec_str) {
          prec = is_float_spec ? 6 : undefined;
        } else if (prec_str.charAt(0) == '*') {
          var p_idx = idx++;
          if (p_idx_str) {
            p_idx = parseInt(p_idx_str, 10) - 1;
          }
          prec = (args[p_idx]).$to_i();
        } else {
          prec = parseInt(prec_str, 10);
        }
        if (idx_str) {
          idx = parseInt(idx_str, 10) - 1;
        }
        switch (spec) {
        case 'c':
          obj = args[idx];
          if (obj._isString) {
            str = obj.charAt(0);
          } else {
            str = String.fromCharCode((obj).$to_i());
          }
          break;
        case 's':
          str = (args[idx]).$to_s();
          if (prec !== undefined) {
            str = str.substr(0, prec);
          }
          break;
        case 'p':
          str = (args[idx]).$inspect();
          if (prec !== undefined) {
            str = str.substr(0, prec);
          }
          break;
        case 'd':
        case 'i':
        case 'u':
          str = (args[idx]).$to_i().toString();
          break;
        case 'b':
        case 'B':
          str = (args[idx]).$to_i().toString(2);
          break;
        case 'o':
          str = (args[idx]).$to_i().toString(8);
          break;
        case 'x':
        case 'X':
          str = (args[idx]).$to_i().toString(16);
          break;
        case 'e':
        case 'E':
          str = (args[idx]).$to_f().toExponential(prec);
          break;
        case 'f':
          str = (args[idx]).$to_f().toFixed(prec);
          break;
        case 'g':
        case 'G':
          str = (args[idx]).$to_f().toPrecision(prec);
          break;
        }
        idx++;
        if (is_integer_spec || is_float_spec) {
          if (str.charAt(0) == '-') {
            prefix = '-';
            str = str.substr(1);
          } else {
            if (flags.indexOf('+') != -1) {
              prefix = '+';
            } else if (flags.indexOf(' ') != -1) {
              prefix = ' ';
            }
          }
        }
        if (is_integer_spec && prec !== undefined) {
          if (str.length < prec) {
            str = "0"['$*'](prec - str.length) + str;
          }
        }
        var total_len = prefix.length + str.length;
        if (width !== undefined && total_len < width) {
          if (flags.indexOf('-') != -1) {
            str = str + " "['$*'](width - total_len);
          } else {
            var pad_char = ' ';
            if (flags.indexOf('0') != -1) {
              str = "0"['$*'](width - total_len) + str;
            } else {
              prefix = " "['$*'](width - total_len) + prefix;
            }
          }
        }
        var result = prefix + str;
        if ('XEG'.indexOf(spec) != -1) {
          result = result.toUpperCase();
        }
        return result;
      });
    
    };

    def.$hash = function() {
      var self = this;

      return self._id;
    };

    def.$initialize_copy = function(other) {
      var self = this;

      return nil;
    };

    def.$inspect = function() {
      var self = this;

      return self.$to_s();
    };

    def['$instance_of?'] = function(klass) {
      var self = this;

      return self._klass === klass;
    };

    def['$instance_variable_defined?'] = function(name) {
      var self = this;

      return $opal.hasOwnProperty.call(self, name.substr(1));
    };

    def.$instance_variable_get = function(name) {
      var self = this;

      
      var ivar = self[name.substr(1)];

      return ivar == null ? nil : ivar;
    
    };

    def.$instance_variable_set = function(name, value) {
      var self = this;

      return self[name.substr(1)] = value;
    };

    def.$instance_variables = function() {
      var self = this;

      
      var result = [];

      for (var name in self) {
        if (name.charAt(0) !== '$') {
          if (name !== '_klass' && name !== '_id') {
            result.push('@' + name);
          }
        }
      }

      return result;
    
    };

    def.$Integer = function(value, base) {
      var $a, $b, self = this, $case = nil;

      if (base == null) {
        base = nil
      }
      if ((($a = $scope.String['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = value['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise($scope.ArgumentError, "invalid value for Integer: (empty string)")};
        return parseInt(value, ((($a = base) !== false && $a !== nil) ? $a : undefined));};
      if (base !== false && base !== nil) {
        self.$raise(self.$ArgumentError("base is only valid for String values"))};
      return (function() {$case = value;if ($scope.Integer['$===']($case)) {return value}else if ($scope.Float['$===']($case)) {if ((($a = ((($b = value['$nan?']()) !== false && $b !== nil) ? $b : value['$infinite?']())) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.FloatDomainError, "unable to coerce " + (value) + " to Integer")};
      return value.$to_int();}else if ($scope.NilClass['$===']($case)) {return self.$raise($scope.TypeError, "can't convert nil into Integer")}else {if ((($a = value['$respond_to?']("to_int")) !== nil && (!$a._isBoolean || $a == true))) {
        return value.$to_int()
      } else if ((($a = value['$respond_to?']("to_i")) !== nil && (!$a._isBoolean || $a == true))) {
        return value.$to_i()
        } else {
        return self.$raise($scope.TypeError, "can't convert " + (value.$class()) + " into Integer")
      }}})();
    };

    def.$Float = function(value) {
      var $a, self = this;

      if ((($a = $scope.String['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
        return parseFloat(value);
      } else if ((($a = value['$respond_to?']("to_f")) !== nil && (!$a._isBoolean || $a == true))) {
        return value.$to_f()
        } else {
        return self.$raise($scope.TypeError, "can't convert " + (value.$class()) + " into Float")
      };
    };

    def['$is_a?'] = function(klass) {
      var self = this;

      return $opal.is_a(self, klass);
    };

    $opal.defn(self, '$kind_of?', def['$is_a?']);

    def.$lambda = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      block.is_lambda = true;
      return block;
    };

    def.$loop = TMP_6 = function() {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      
      while (true) {
        if (block() === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def['$nil?'] = function() {
      var self = this;

      return false;
    };

    $opal.defn(self, '$object_id', def.$__id__);

    def.$printf = function(args) {
      var $a, self = this;

      args = $slice.call(arguments, 0);
      if (args.$length()['$>'](0)) {
        self.$print(($a = self).$format.apply($a, [].concat(args)))};
      return nil;
    };

    def.$private_methods = function() {
      var self = this;

      return [];
    };

    def.$proc = TMP_7 = function() {
      var self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      if (block !== false && block !== nil) {
        } else {
        self.$raise($scope.ArgumentError, "tried to create Proc object without a block")
      };
      block.is_lambda = false;
      return block;
    };

    def.$puts = function(strs) {
      var $a, self = this;
      if ($gvars.stdout == null) $gvars.stdout = nil;

      strs = $slice.call(arguments, 0);
      return ($a = $gvars.stdout).$puts.apply($a, [].concat(strs));
    };

    def.$p = function(args) {
      var $a, $b, TMP_8, self = this;

      args = $slice.call(arguments, 0);
      ($a = ($b = args).$each, $a._p = (TMP_8 = function(obj){var self = TMP_8._s || this;
        if ($gvars.stdout == null) $gvars.stdout = nil;
if (obj == null) obj = nil;
      return $gvars.stdout.$puts(obj.$inspect())}, TMP_8._s = self, TMP_8), $a).call($b);
      if (args.$length()['$<='](1)) {
        return args['$[]'](0)
        } else {
        return args
      };
    };

    def.$print = function(strs) {
      var $a, self = this;
      if ($gvars.stdout == null) $gvars.stdout = nil;

      strs = $slice.call(arguments, 0);
      return ($a = $gvars.stdout).$print.apply($a, [].concat(strs));
    };

    def.$warn = function(strs) {
      var $a, $b, self = this;
      if ($gvars.VERBOSE == null) $gvars.VERBOSE = nil;
      if ($gvars.stderr == null) $gvars.stderr = nil;

      strs = $slice.call(arguments, 0);
      if ((($a = ((($b = $gvars.VERBOSE['$nil?']()) !== false && $b !== nil) ? $b : strs['$empty?']())) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        ($a = $gvars.stderr).$puts.apply($a, [].concat(strs))
      };
      return nil;
    };

    def.$raise = function(exception, string) {
      var self = this;
      if ($gvars["!"] == null) $gvars["!"] = nil;

      
      if (exception == null && $gvars["!"]) {
        exception = $gvars["!"];
      }
      else if (exception._isString) {
        exception = $scope.RuntimeError.$new(exception);
      }
      else if (!exception['$is_a?']($scope.Exception)) {
        exception = exception.$new(string);
      }

      $gvars["!"] = exception;
      throw exception;
    ;
    };

    $opal.defn(self, '$fail', def.$raise);

    def.$rand = function(max) {
      var self = this;

      
      if (max === undefined) {
        return Math.random();
      }
      else if (max._isRange) {
        var arr = max.$to_a();

        return arr[self.$rand(arr.length)];
      }
      else {
        return Math.floor(Math.random() *
          Math.abs($scope.Opal.$coerce_to(max, $scope.Integer, "to_int")));
      }
    
    };

    $opal.defn(self, '$srand', def.$rand);

    def['$respond_to?'] = function(name, include_all) {
      var $a, self = this;

      if (include_all == null) {
        include_all = false
      }
      if ((($a = self['$respond_to_missing?'](name)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      
      var body = self['$' + name];

      if (typeof(body) === "function" && !body.rb_stub) {
        return true;
      }
    
      return false;
    };

    $opal.defn(self, '$send', def.$__send__);

    $opal.defn(self, '$public_send', def.$__send__);

    def.$singleton_class = function() {
      var self = this;

      
      if (self._isClass) {
        if (self.__meta__) {
          return self.__meta__;
        }

        var meta = new $opal.Class._alloc;
        meta._klass = $opal.Class;
        self.__meta__ = meta;
        // FIXME - is this right? (probably - methods defined on
        // class' singleton should also go to subclasses?)
        meta._proto = self.constructor.prototype;
        meta._isSingleton = true;
        meta.__inc__ = [];
        meta._methods = [];

        meta._scope = self._scope;

        return meta;
      }

      if (self._isClass) {
        return self._klass;
      }

      if (self.__meta__) {
        return self.__meta__;
      }

      else {
        var orig_class = self._klass,
            class_id   = "#<Class:#<" + orig_class._name + ":" + orig_class._id + ">>";

        var Singleton = function () {};
        var meta = Opal.boot(orig_class, Singleton);
        meta._name = class_id;

        meta._proto = self;
        self.__meta__ = meta;
        meta._klass = orig_class._klass;
        meta._scope = orig_class._scope;
        meta.__parent = orig_class;

        return meta;
      }
    
    };

    $opal.defn(self, '$sprintf', def.$format);

    def.$String = function(str) {
      var self = this;

      return String(str);
    };

    def.$tap = TMP_9 = function() {
      var self = this, $iter = TMP_9._p, block = $iter || nil;

      TMP_9._p = null;
      if ($opal.$yield1(block, self) === $breaker) return $breaker.$v;
      return self;
    };

    def.$to_proc = function() {
      var self = this;

      return self;
    };

    def.$to_s = function() {
      var self = this;

      return "#<" + self.$class().$name() + ":" + self._id + ">";
    };

    def.$freeze = function() {
      var self = this;

      self.___frozen___ = true;
      return self;
    };

    def['$frozen?'] = function() {
      var $a, self = this;
      if (self.___frozen___ == null) self.___frozen___ = nil;

      return ((($a = self.___frozen___) !== false && $a !== nil) ? $a : false);
    };

    def['$respond_to_missing?'] = function(method_name) {
      var self = this;

      return false;
    };
        ;$opal.donate(self, ["$method_missing", "$=~", "$===", "$<=>", "$method", "$methods", "$Array", "$caller", "$class", "$copy_instance_variables", "$clone", "$initialize_clone", "$define_singleton_method", "$dup", "$initialize_dup", "$enum_for", "$to_enum", "$equal?", "$extend", "$format", "$hash", "$initialize_copy", "$inspect", "$instance_of?", "$instance_variable_defined?", "$instance_variable_get", "$instance_variable_set", "$instance_variables", "$Integer", "$Float", "$is_a?", "$kind_of?", "$lambda", "$loop", "$nil?", "$object_id", "$printf", "$private_methods", "$proc", "$puts", "$p", "$print", "$warn", "$raise", "$fail", "$rand", "$srand", "$respond_to?", "$send", "$public_send", "$singleton_class", "$sprintf", "$String", "$tap", "$to_proc", "$to_s", "$freeze", "$frozen?", "$respond_to_missing?"]);
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/kernel.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$raise']);
  (function($base, $super) {
    function $NilClass(){};
    var self = $NilClass = $klass($base, $super, 'NilClass', $NilClass);

    var def = self._proto, $scope = self._scope;

    def['$!'] = function() {
      var self = this;

      return true;
    };

    def['$&'] = function(other) {
      var self = this;

      return false;
    };

    def['$|'] = function(other) {
      var self = this;

      return other !== false && other !== nil;
    };

    def['$^'] = function(other) {
      var self = this;

      return other !== false && other !== nil;
    };

    def['$=='] = function(other) {
      var self = this;

      return other === nil;
    };

    def.$dup = function() {
      var self = this;

      return self.$raise($scope.TypeError);
    };

    def.$inspect = function() {
      var self = this;

      return "nil";
    };

    def['$nil?'] = function() {
      var self = this;

      return true;
    };

    def.$singleton_class = function() {
      var self = this;

      return $scope.NilClass;
    };

    def.$to_a = function() {
      var self = this;

      return [];
    };

    def.$to_h = function() {
      var self = this;

      return $opal.hash();
    };

    def.$to_i = function() {
      var self = this;

      return 0;
    };

    $opal.defn(self, '$to_f', def.$to_i);

    def.$to_s = function() {
      var self = this;

      return "";
    };

    def.$object_id = function() {
      var self = this;

      return $scope.NilClass._id || ($scope.NilClass._id = $opal.uid());
    };

    return $opal.defn(self, '$hash', def.$object_id);
  })(self, null);
  return $opal.cdecl($scope, 'NIL', nil);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/nil_class.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$undef_method']);
  (function($base, $super) {
    function $Boolean(){};
    var self = $Boolean = $klass($base, $super, 'Boolean', $Boolean);

    var def = self._proto, $scope = self._scope;

    def._isBoolean = true;

    (function(self) {
      var $scope = self._scope, def = self._proto;

      return self.$undef_method("new")
    })(self.$singleton_class());

    def['$!'] = function() {
      var self = this;

      return self != true;
    };

    def['$&'] = function(other) {
      var self = this;

      return (self == true) ? (other !== false && other !== nil) : false;
    };

    def['$|'] = function(other) {
      var self = this;

      return (self == true) ? true : (other !== false && other !== nil);
    };

    def['$^'] = function(other) {
      var self = this;

      return (self == true) ? (other === false || other === nil) : (other !== false && other !== nil);
    };

    def['$=='] = function(other) {
      var self = this;

      return (self == true) === other.valueOf();
    };

    $opal.defn(self, '$equal?', def['$==']);

    $opal.defn(self, '$singleton_class', def.$class);

    return (def.$to_s = function() {
      var self = this;

      return (self == true) ? 'true' : 'false';
    }, nil) && 'to_s';
  })(self, null);
  $opal.cdecl($scope, 'TrueClass', $scope.Boolean);
  $opal.cdecl($scope, 'FalseClass', $scope.Boolean);
  $opal.cdecl($scope, 'TRUE', true);
  return $opal.cdecl($scope, 'FALSE', false);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/boolean.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module;

  $opal.add_stubs(['$attr_reader', '$name', '$class']);
  (function($base, $super) {
    function $Exception(){};
    var self = $Exception = $klass($base, $super, 'Exception', $Exception);

    var def = self._proto, $scope = self._scope;

    def.message = nil;
    self.$attr_reader("message");

    $opal.defs(self, '$new', function(message) {
      var self = this;

      if (message == null) {
        message = ""
      }
      
      var err = new Error(message);
      err._klass = self;
      err.name = self._name;
      return err;
    
    });

    def.$backtrace = function() {
      var self = this;

      
      var backtrace = self.stack;

      if (typeof(backtrace) === 'string') {
        return backtrace.split("\n").slice(0, 15);
      }
      else if (backtrace) {
        return backtrace.slice(0, 15);
      }

      return [];
    
    };

    def.$inspect = function() {
      var self = this;

      return "#<" + (self.$class().$name()) + ": '" + (self.message) + "'>";
    };

    return $opal.defn(self, '$to_s', def.$message);
  })(self, null);
  (function($base, $super) {
    function $ScriptError(){};
    var self = $ScriptError = $klass($base, $super, 'ScriptError', $ScriptError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.Exception);
  (function($base, $super) {
    function $SyntaxError(){};
    var self = $SyntaxError = $klass($base, $super, 'SyntaxError', $SyntaxError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.ScriptError);
  (function($base, $super) {
    function $LoadError(){};
    var self = $LoadError = $klass($base, $super, 'LoadError', $LoadError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.ScriptError);
  (function($base, $super) {
    function $NotImplementedError(){};
    var self = $NotImplementedError = $klass($base, $super, 'NotImplementedError', $NotImplementedError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.ScriptError);
  (function($base, $super) {
    function $SystemExit(){};
    var self = $SystemExit = $klass($base, $super, 'SystemExit', $SystemExit);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.Exception);
  (function($base, $super) {
    function $StandardError(){};
    var self = $StandardError = $klass($base, $super, 'StandardError', $StandardError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.Exception);
  (function($base, $super) {
    function $NameError(){};
    var self = $NameError = $klass($base, $super, 'NameError', $NameError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.StandardError);
  (function($base, $super) {
    function $NoMethodError(){};
    var self = $NoMethodError = $klass($base, $super, 'NoMethodError', $NoMethodError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.NameError);
  (function($base, $super) {
    function $RuntimeError(){};
    var self = $RuntimeError = $klass($base, $super, 'RuntimeError', $RuntimeError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.StandardError);
  (function($base, $super) {
    function $LocalJumpError(){};
    var self = $LocalJumpError = $klass($base, $super, 'LocalJumpError', $LocalJumpError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.StandardError);
  (function($base, $super) {
    function $TypeError(){};
    var self = $TypeError = $klass($base, $super, 'TypeError', $TypeError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.StandardError);
  (function($base, $super) {
    function $ArgumentError(){};
    var self = $ArgumentError = $klass($base, $super, 'ArgumentError', $ArgumentError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.StandardError);
  (function($base, $super) {
    function $IndexError(){};
    var self = $IndexError = $klass($base, $super, 'IndexError', $IndexError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.StandardError);
  (function($base, $super) {
    function $StopIteration(){};
    var self = $StopIteration = $klass($base, $super, 'StopIteration', $StopIteration);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.IndexError);
  (function($base, $super) {
    function $KeyError(){};
    var self = $KeyError = $klass($base, $super, 'KeyError', $KeyError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.IndexError);
  (function($base, $super) {
    function $RangeError(){};
    var self = $RangeError = $klass($base, $super, 'RangeError', $RangeError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.StandardError);
  (function($base, $super) {
    function $FloatDomainError(){};
    var self = $FloatDomainError = $klass($base, $super, 'FloatDomainError', $FloatDomainError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.RangeError);
  (function($base, $super) {
    function $IOError(){};
    var self = $IOError = $klass($base, $super, 'IOError', $IOError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.StandardError);
  (function($base, $super) {
    function $SystemCallError(){};
    var self = $SystemCallError = $klass($base, $super, 'SystemCallError', $SystemCallError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.StandardError);
  return (function($base) {
    var self = $module($base, 'Errno');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $EINVAL(){};
      var self = $EINVAL = $klass($base, $super, 'EINVAL', $EINVAL);

      var def = self._proto, $scope = self._scope, TMP_1;

      return ($opal.defs(self, '$new', TMP_1 = function() {
        var self = this, $iter = TMP_1._p, $yield = $iter || nil;

        TMP_1._p = null;
        return $opal.find_super_dispatcher(self, 'new', TMP_1, null, $EINVAL).apply(self, ["Invalid argument"]);
      }), nil) && 'new'
    })(self, $scope.SystemCallError)
    
  })(self);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/error.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars;

  $opal.add_stubs(['$respond_to?', '$to_str', '$to_s', '$coerce_to', '$new', '$raise', '$class', '$call']);
  return (function($base, $super) {
    function $Regexp(){};
    var self = $Regexp = $klass($base, $super, 'Regexp', $Regexp);

    var def = self._proto, $scope = self._scope, TMP_1;

    def._isRegexp = true;

    (function(self) {
      var $scope = self._scope, def = self._proto;

      self._proto.$escape = function(string) {
        var self = this;

        
        return string.replace(/([-[\]/{}()*+?.^$\\| ])/g, '\\$1')
                     .replace(/[\n]/g, '\\n')
                     .replace(/[\r]/g, '\\r')
                     .replace(/[\f]/g, '\\f')
                     .replace(/[\t]/g, '\\t');
      
      };
      self._proto.$quote = self._proto.$escape;
      self._proto.$union = function(parts) {
        var self = this;

        parts = $slice.call(arguments, 0);
        return new RegExp(parts.join(''));
      };
      return (self._proto.$new = function(regexp, options) {
        var self = this;

        return new RegExp(regexp, options);
      }, nil) && 'new';
    })(self.$singleton_class());

    def['$=='] = function(other) {
      var self = this;

      return other.constructor == RegExp && self.toString() === other.toString();
    };

    def['$==='] = function(str) {
      var self = this;

      
      if (!str._isString && str['$respond_to?']("to_str")) {
        str = str.$to_str();
      }

      if (!str._isString) {
        return false;
      }

      return self.test(str);
    ;
    };

    def['$=~'] = function(string) {
      var $a, self = this;

      if ((($a = string === nil) !== nil && (!$a._isBoolean || $a == true))) {
        $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
        return nil;};
      string = $scope.Opal.$coerce_to(string, $scope.String, "to_str").$to_s();
      
      var re = self;

      if (re.global) {
        // should we clear it afterwards too?
        re.lastIndex = 0;
      }
      else {
        // rewrite regular expression to add the global flag to capture pre/post match
        re = new RegExp(re.source, 'g' + (re.multiline ? 'm' : '') + (re.ignoreCase ? 'i' : ''));
      }

      var result = re.exec(string);

      if (result) {
        $gvars["~"] = $scope.MatchData.$new(re, result);
      }
      else {
        $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
      }

      return result ? result.index : nil;
    
    };

    $opal.defn(self, '$eql?', def['$==']);

    def.$inspect = function() {
      var self = this;

      return self.toString();
    };

    def.$match = TMP_1 = function(string, pos) {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if ((($a = string === nil) !== nil && (!$a._isBoolean || $a == true))) {
        $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
        return nil;};
      if ((($a = string._isString == null) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = string['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          self.$raise($scope.TypeError, "no implicit conversion of " + (string.$class()) + " into String")
        };
        string = string.$to_str();};
      
      var re = self;

      if (re.global) {
        // should we clear it afterwards too?
        re.lastIndex = 0;
      }
      else {
        re = new RegExp(re.source, 'g' + (re.multiline ? 'm' : '') + (re.ignoreCase ? 'i' : ''));
      }

      var result = re.exec(string);

      if (result) {
        result = $gvars["~"] = $scope.MatchData.$new(re, result);

        if (block === nil) {
          return result;
        }
        else {
          return block.$call(result);
        }
      }
      else {
        return $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
      }
    
    };

    def.$source = function() {
      var self = this;

      return self.source;
    };

    return $opal.defn(self, '$to_s', def.$source);
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/regexp.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  $opal.add_stubs(['$===', '$>', '$<', '$equal?', '$<=>', '$==', '$normalize', '$raise', '$class', '$>=', '$<=']);
  return (function($base) {
    var self = $module($base, 'Comparable');

    var def = self._proto, $scope = self._scope;

    $opal.defs(self, '$normalize', function(what) {
      var $a, self = this;

      if ((($a = $scope.Integer['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
        return what};
      if (what['$>'](0)) {
        return 1};
      if (what['$<'](0)) {
        return -1};
      return 0;
    });

    def['$=='] = function(other) {
      var $a, self = this, cmp = nil;

      try {
      if ((($a = self['$equal?'](other)) !== nil && (!$a._isBoolean || $a == true))) {
          return true};
        if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return false
        };
        return $scope.Comparable.$normalize(cmp)['$=='](0);
      } catch ($err) {if ($opal.$rescue($err, [$scope.StandardError])) {
        return false
        }else { throw $err; }
      };
    };

    def['$>'] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.Comparable.$normalize(cmp)['$>'](0);
    };

    def['$>='] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.Comparable.$normalize(cmp)['$>='](0);
    };

    def['$<'] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.Comparable.$normalize(cmp)['$<'](0);
    };

    def['$<='] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.Comparable.$normalize(cmp)['$<='](0);
    };

    def['$between?'] = function(min, max) {
      var self = this;

      if (self['$<'](min)) {
        return false};
      if (self['$>'](max)) {
        return false};
      return true;
    };
        ;$opal.donate(self, ["$==", "$>", "$>=", "$<", "$<=", "$between?"]);
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/comparable.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  $opal.add_stubs(['$raise', '$enum_for', '$flatten', '$map', '$==', '$destructure', '$nil?', '$coerce_to!', '$coerce_to', '$===', '$new', '$<<', '$[]', '$[]=', '$inspect', '$__send__', '$yield', '$enumerator_size', '$respond_to?', '$size', '$private', '$compare', '$<=>', '$dup', '$sort', '$call', '$first', '$zip', '$to_a']);
  return (function($base) {
    var self = $module($base, 'Enumerable');

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_7, TMP_8, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13, TMP_14, TMP_15, TMP_16, TMP_17, TMP_18, TMP_19, TMP_20, TMP_22, TMP_23, TMP_24, TMP_25, TMP_26, TMP_27, TMP_28, TMP_29, TMP_30, TMP_31, TMP_32, TMP_33, TMP_35, TMP_36, TMP_40, TMP_41;

    def['$all?'] = TMP_1 = function() {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      
      var result = true;

      if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
            result = false;
            return $breaker;
          }
        }
      }
      else {
        self.$each._p = function(obj) {
          if (arguments.length == 1 && (($a = obj) === nil || ($a._isBoolean && $a == false))) {
            result = false;
            return $breaker;
          }
        }
      }

      self.$each();

      return result;
    
    };

    def['$any?'] = TMP_2 = function() {
      var $a, self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      
      var result = false;

      if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result = true;
            return $breaker;
          }
        };
      }
      else {
        self.$each._p = function(obj) {
          if (arguments.length != 1 || (($a = obj) !== nil && (!$a._isBoolean || $a == true))) {
            result = true;
            return $breaker;
          }
        }
      }

      self.$each();

      return result;
    
    };

    def.$chunk = TMP_3 = function(state) {
      var self = this, $iter = TMP_3._p, block = $iter || nil;

      TMP_3._p = null;
      return self.$raise($scope.NotImplementedError);
    };

    def.$collect = TMP_4 = function() {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect")
      };
      
      var result = [];

      self.$each._p = function() {
        var value = $opal.$yieldX(block, arguments);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        result.push(value);
      };

      self.$each();

      return result;
    
    };

    def.$collect_concat = TMP_5 = function() {
      var $a, $b, TMP_6, self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect_concat")
      };
      return ($a = ($b = self).$map, $a._p = (TMP_6 = function(item){var self = TMP_6._s || this, $a;
if (item == null) item = nil;
      return $a = $opal.$yield1(block, item), $a === $breaker ? $a : $a}, TMP_6._s = self, TMP_6), $a).call($b).$flatten(1);
    };

    def.$count = TMP_7 = function(object) {
      var $a, self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      
      var result = 0;

      if (object != null) {
        block = function() {
          return $scope.Opal.$destructure(arguments)['$=='](object);
        };
      }
      else if (block === nil) {
        block = function() { return true; };
      }

      self.$each._p = function() {
        var value = $opal.$yieldX(block, arguments);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
          result++;
        }
      }

      self.$each();

      return result;
    
    };

    def.$cycle = TMP_8 = function(n) {
      var $a, self = this, $iter = TMP_8._p, block = $iter || nil;

      if (n == null) {
        n = nil
      }
      TMP_8._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("cycle", n)
      };
      if ((($a = n['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        n = $scope.Opal['$coerce_to!'](n, $scope.Integer, "to_int");
        if ((($a = n <= 0) !== nil && (!$a._isBoolean || $a == true))) {
          return nil};
      };
      
      var result,
          all  = [];

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        all.push(param);
      }

      self.$each();

      if (result !== undefined) {
        return result;
      }

      if (all.length === 0) {
        return nil;
      }
    
      if ((($a = n['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        
        while (true) {
          for (var i = 0, length = all.length; i < length; i++) {
            var value = $opal.$yield1(block, all[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }
        }
      
        } else {
        
        while (n > 1) {
          for (var i = 0, length = all.length; i < length; i++) {
            var value = $opal.$yield1(block, all[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }

          n--;
        }
      
      };
    };

    def.$detect = TMP_9 = function(ifnone) {
      var $a, self = this, $iter = TMP_9._p, block = $iter || nil;

      TMP_9._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("detect", ifnone)
      };
      
      var result = undefined;

      self.$each._p = function() {
        var params = $scope.Opal.$destructure(arguments),
            value  = $opal.$yield1(block, params);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
          result = params;
          return $breaker;
        }
      };

      self.$each();

      if (result === undefined && ifnone !== undefined) {
        if (typeof(ifnone) === 'function') {
          result = ifnone();
        }
        else {
          result = ifnone;
        }
      }

      return result === undefined ? nil : result;
    
    };

    def.$drop = function(number) {
      var $a, self = this;

      number = $scope.Opal.$coerce_to(number, $scope.Integer, "to_int");
      if ((($a = number < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "attempt to drop negative size")};
      
      var result  = [],
          current = 0;

      self.$each._p = function() {
        if (number <= current) {
          result.push($scope.Opal.$destructure(arguments));
        }

        current++;
      };

      self.$each()

      return result;
    
    };

    def.$drop_while = TMP_10 = function() {
      var $a, self = this, $iter = TMP_10._p, block = $iter || nil;

      TMP_10._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("drop_while")
      };
      
      var result   = [],
          dropping = true;

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments);

        if (dropping) {
          var value = $opal.$yield1(block, param);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
            dropping = false;
            result.push(param);
          }
        }
        else {
          result.push(param);
        }
      };

      self.$each();

      return result;
    
    };

    def.$each_cons = TMP_11 = function(n) {
      var self = this, $iter = TMP_11._p, block = $iter || nil;

      TMP_11._p = null;
      return self.$raise($scope.NotImplementedError);
    };

    def.$each_entry = TMP_12 = function() {
      var self = this, $iter = TMP_12._p, block = $iter || nil;

      TMP_12._p = null;
      return self.$raise($scope.NotImplementedError);
    };

    def.$each_slice = TMP_13 = function(n) {
      var $a, self = this, $iter = TMP_13._p, block = $iter || nil;

      TMP_13._p = null;
      n = $scope.Opal.$coerce_to(n, $scope.Integer, "to_int");
      if ((($a = n <= 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "invalid slice size")};
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_slice", n)
      };
      
      var result,
          slice = []

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments);

        slice.push(param);

        if (slice.length === n) {
          if ($opal.$yield1(block, slice) === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          slice = [];
        }
      };

      self.$each();

      if (result !== undefined) {
        return result;
      }

      // our "last" group, if smaller than n then won't have been yielded
      if (slice.length > 0) {
        if ($opal.$yield1(block, slice) === $breaker) {
          return $breaker.$v;
        }
      }
    ;
      return nil;
    };

    def.$each_with_index = TMP_14 = function(args) {
      var $a, self = this, $iter = TMP_14._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_14._p = null;
      if ((block !== nil)) {
        } else {
        return ($a = self).$enum_for.apply($a, ["each_with_index"].concat(args))
      };
      
      var result,
          index = 0;

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = block(param, index);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        index++;
      };

      self.$each.apply(self, args);

      if (result !== undefined) {
        return result;
      }
    
      return self;
    };

    def.$each_with_object = TMP_15 = function(object) {
      var self = this, $iter = TMP_15._p, block = $iter || nil;

      TMP_15._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_with_object", object)
      };
      
      var result;

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = block(param, object);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }
      };

      self.$each();

      if (result !== undefined) {
        return result;
      }
    
      return object;
    };

    def.$entries = function(args) {
      var self = this;

      args = $slice.call(arguments, 0);
      
      var result = [];

      self.$each._p = function() {
        result.push($scope.Opal.$destructure(arguments));
      };

      self.$each.apply(self, args);

      return result;
    
    };

    $opal.defn(self, '$find', def.$detect);

    def.$find_all = TMP_16 = function() {
      var $a, self = this, $iter = TMP_16._p, block = $iter || nil;

      TMP_16._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("find_all")
      };
      
      var result = [];

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
          result.push(param);
        }
      };

      self.$each();

      return result;
    
    };

    def.$find_index = TMP_17 = function(object) {
      var $a, self = this, $iter = TMP_17._p, block = $iter || nil;

      TMP_17._p = null;
      if ((($a = object === undefined && block === nil) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$enum_for("find_index")};
      
      var result = nil,
          index  = 0;

      if (object != null) {
        self.$each._p = function() {
          var param = $scope.Opal.$destructure(arguments);

          if ((param)['$=='](object)) {
            result = index;
            return $breaker;
          }

          index += 1;
        };
      }
      else if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result = index;
            return $breaker;
          }

          index += 1;
        };
      }

      self.$each();

      return result;
    
    };

    def.$first = function(number) {
      var $a, self = this, result = nil;

      if ((($a = number === undefined) !== nil && (!$a._isBoolean || $a == true))) {
        result = nil;
        
        self.$each._p = function() {
          result = $scope.Opal.$destructure(arguments);

          return $breaker;
        };

        self.$each();
      ;
        } else {
        result = [];
        number = $scope.Opal.$coerce_to(number, $scope.Integer, "to_int");
        if ((($a = number < 0) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise($scope.ArgumentError, "attempt to take negative size")};
        if ((($a = number == 0) !== nil && (!$a._isBoolean || $a == true))) {
          return []};
        
        var current = 0,
            number  = $scope.Opal.$coerce_to(number, $scope.Integer, "to_int");

        self.$each._p = function() {
          result.push($scope.Opal.$destructure(arguments));

          if (number <= ++current) {
            return $breaker;
          }
        };

        self.$each();
      ;
      };
      return result;
    };

    $opal.defn(self, '$flat_map', def.$collect_concat);

    def.$grep = TMP_18 = function(pattern) {
      var $a, self = this, $iter = TMP_18._p, block = $iter || nil;

      TMP_18._p = null;
      
      var result = [];

      if (block !== nil) {
        self.$each._p = function() {
          var param = $scope.Opal.$destructure(arguments),
              value = pattern['$==='](param);

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            value = $opal.$yield1(block, param);

            if (value === $breaker) {
              result = $breaker.$v;
              return $breaker;
            }

            result.push(value);
          }
        };
      }
      else {
        self.$each._p = function() {
          var param = $scope.Opal.$destructure(arguments),
              value = pattern['$==='](param);

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result.push(param);
          }
        };
      }

      self.$each();

      return result;
    ;
    };

    def.$group_by = TMP_19 = function() {
      var $a, $b, $c, self = this, $iter = TMP_19._p, block = $iter || nil, hash = nil;

      TMP_19._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("group_by")
      };
      hash = $scope.Hash.$new();
      
      var result;

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        (($a = value, $b = hash, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, []))))['$<<'](param);
      }

      self.$each();

      if (result !== undefined) {
        return result;
      }
    
      return hash;
    };

    def['$include?'] = function(obj) {
      var self = this;

      
      var result = false;

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments);

        if ((param)['$=='](obj)) {
          result = true;
          return $breaker;
        }
      }

      self.$each();

      return result;
    
    };

    def.$inject = TMP_20 = function(object, sym) {
      var self = this, $iter = TMP_20._p, block = $iter || nil;

      TMP_20._p = null;
      
      var result = object;

      if (block !== nil && sym === undefined) {
        self.$each._p = function() {
          var value = $scope.Opal.$destructure(arguments);

          if (result === undefined) {
            result = value;
            return;
          }

          value = $opal.$yieldX(block, [result, value]);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          result = value;
        };
      }
      else {
        if (sym === undefined) {
          if (!$scope.Symbol['$==='](object)) {
            self.$raise($scope.TypeError, "" + (object.$inspect()) + " is not a Symbol");
          }

          sym    = object;
          result = undefined;
        }

        self.$each._p = function() {
          var value = $scope.Opal.$destructure(arguments);

          if (result === undefined) {
            result = value;
            return;
          }

          result = (result).$__send__(sym, value);
        };
      }

      self.$each();

      return result == undefined ? nil : result;
    ;
    };

    def.$lazy = function() {
      var $a, $b, TMP_21, self = this;

      return ($a = ($b = ($scope.Enumerator)._scope.Lazy).$new, $a._p = (TMP_21 = function(enum$, args){var self = TMP_21._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
      return ($a = enum$).$yield.apply($a, [].concat(args))}, TMP_21._s = self, TMP_21), $a).call($b, self, self.$enumerator_size());
    };

    def.$enumerator_size = function() {
      var $a, self = this;

      if ((($a = self['$respond_to?']("size")) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$size()
        } else {
        return nil
      };
    };

    self.$private("enumerator_size");

    $opal.defn(self, '$map', def.$collect);

    def.$max = TMP_22 = function() {
      var self = this, $iter = TMP_22._p, block = $iter || nil;

      TMP_22._p = null;
      
      var result;

      if (block !== nil) {
        self.$each._p = function() {
          var param = $scope.Opal.$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          var value = block(param, result);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if (value === nil) {
            self.$raise($scope.ArgumentError, "comparison failed");
          }

          if (value > 0) {
            result = param;
          }
        };
      }
      else {
        self.$each._p = function() {
          var param = $scope.Opal.$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          if ($scope.Opal.$compare(param, result) > 0) {
            result = param;
          }
        };
      }

      self.$each();

      return result === undefined ? nil : result;
    
    };

    def.$max_by = TMP_23 = function() {
      var self = this, $iter = TMP_23._p, block = $iter || nil;

      TMP_23._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("max_by")
      };
      
      var result,
          by;

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (result === undefined) {
          result = param;
          by     = value;
          return;
        }

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((value)['$<=>'](by) > 0) {
          result = param
          by     = value;
        }
      };

      self.$each();

      return result === undefined ? nil : result;
    
    };

    $opal.defn(self, '$member?', def['$include?']);

    def.$min = TMP_24 = function() {
      var self = this, $iter = TMP_24._p, block = $iter || nil;

      TMP_24._p = null;
      
      var result;

      if (block !== nil) {
        self.$each._p = function() {
          var param = $scope.Opal.$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          var value = block(param, result);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if (value === nil) {
            self.$raise($scope.ArgumentError, "comparison failed");
          }

          if (value < 0) {
            result = param;
          }
        };
      }
      else {
        self.$each._p = function() {
          var param = $scope.Opal.$destructure(arguments);

          if (result === undefined) {
            result = param;
            return;
          }

          if ($scope.Opal.$compare(param, result) < 0) {
            result = param;
          }
        };
      }

      self.$each();

      return result === undefined ? nil : result;
    
    };

    def.$min_by = TMP_25 = function() {
      var self = this, $iter = TMP_25._p, block = $iter || nil;

      TMP_25._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("min_by")
      };
      
      var result,
          by;

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (result === undefined) {
          result = param;
          by     = value;
          return;
        }

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((value)['$<=>'](by) < 0) {
          result = param
          by     = value;
        }
      };

      self.$each();

      return result === undefined ? nil : result;
    
    };

    def.$minmax = TMP_26 = function() {
      var self = this, $iter = TMP_26._p, block = $iter || nil;

      TMP_26._p = null;
      return self.$raise($scope.NotImplementedError);
    };

    def.$minmax_by = TMP_27 = function() {
      var self = this, $iter = TMP_27._p, block = $iter || nil;

      TMP_27._p = null;
      return self.$raise($scope.NotImplementedError);
    };

    def['$none?'] = TMP_28 = function() {
      var $a, self = this, $iter = TMP_28._p, block = $iter || nil;

      TMP_28._p = null;
      
      var result = true;

      if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result = false;
            return $breaker;
          }
        }
      }
      else {
        self.$each._p = function() {
          var value = $scope.Opal.$destructure(arguments);

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            result = false;
            return $breaker;
          }
        };
      }

      self.$each();

      return result;
    
    };

    def['$one?'] = TMP_29 = function() {
      var $a, self = this, $iter = TMP_29._p, block = $iter || nil;

      TMP_29._p = null;
      
      var result = false;

      if (block !== nil) {
        self.$each._p = function() {
          var value = $opal.$yieldX(block, arguments);

          if (value === $breaker) {
            result = $breaker.$v;
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            if (result === true) {
              result = false;
              return $breaker;
            }

            result = true;
          }
        }
      }
      else {
        self.$each._p = function() {
          var value = $scope.Opal.$destructure(arguments);

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            if (result === true) {
              result = false;
              return $breaker;
            }

            result = true;
          }
        }
      }

      self.$each();

      return result;
    
    };

    def.$partition = TMP_30 = function() {
      var $a, self = this, $iter = TMP_30._p, block = $iter || nil;

      TMP_30._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("partition")
      };
      
      var truthy = [], falsy = [];

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
          truthy.push(param);
        }
        else {
          falsy.push(param);
        }
      };

      self.$each();

      return [truthy, falsy];
    
    };

    $opal.defn(self, '$reduce', def.$inject);

    def.$reject = TMP_31 = function() {
      var $a, self = this, $iter = TMP_31._p, block = $iter || nil;

      TMP_31._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reject")
      };
      
      var result = [];

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
          result.push(param);
        }
      };

      self.$each();

      return result;
    
    };

    def.$reverse_each = TMP_32 = function() {
      var self = this, $iter = TMP_32._p, block = $iter || nil;

      TMP_32._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reverse_each")
      };
      
      var result = [];

      self.$each._p = function() {
        result.push(arguments);
      };

      self.$each();

      for (var i = result.length - 1; i >= 0; i--) {
        $opal.$yieldX(block, result[i]);
      }

      return result;
    
    };

    $opal.defn(self, '$select', def.$find_all);

    def.$slice_before = TMP_33 = function(pattern) {
      var $a, $b, TMP_34, self = this, $iter = TMP_33._p, block = $iter || nil;

      TMP_33._p = null;
      if ((($a = pattern === undefined && block === nil || arguments.length > 1) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "wrong number of arguments (" + (arguments.length) + " for 1)")};
      return ($a = ($b = $scope.Enumerator).$new, $a._p = (TMP_34 = function(e){var self = TMP_34._s || this, $a;
if (e == null) e = nil;
      
        var slice = [];

        if (block !== nil) {
          if (pattern === undefined) {
            self.$each._p = function() {
              var param = $scope.Opal.$destructure(arguments),
                  value = $opal.$yield1(block, param);

              if ((($a = value) !== nil && (!$a._isBoolean || $a == true)) && slice.length > 0) {
                e['$<<'](slice);
                slice = [];
              }

              slice.push(param);
            };
          }
          else {
            self.$each._p = function() {
              var param = $scope.Opal.$destructure(arguments),
                  value = block(param, pattern.$dup());

              if ((($a = value) !== nil && (!$a._isBoolean || $a == true)) && slice.length > 0) {
                e['$<<'](slice);
                slice = [];
              }

              slice.push(param);
            };
          }
        }
        else {
          self.$each._p = function() {
            var param = $scope.Opal.$destructure(arguments),
                value = pattern['$==='](param);

            if ((($a = value) !== nil && (!$a._isBoolean || $a == true)) && slice.length > 0) {
              e['$<<'](slice);
              slice = [];
            }

            slice.push(param);
          };
        }

        self.$each();

        if (slice.length > 0) {
          e['$<<'](slice);
        }
      ;}, TMP_34._s = self, TMP_34), $a).call($b);
    };

    def.$sort = TMP_35 = function() {
      var self = this, $iter = TMP_35._p, block = $iter || nil;

      TMP_35._p = null;
      return self.$raise($scope.NotImplementedError);
    };

    def.$sort_by = TMP_36 = function() {
      var $a, $b, TMP_37, $c, $d, TMP_38, $e, $f, TMP_39, self = this, $iter = TMP_36._p, block = $iter || nil;

      TMP_36._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("sort_by")
      };
      return ($a = ($b = ($c = ($d = ($e = ($f = self).$map, $e._p = (TMP_39 = function(){var self = TMP_39._s || this;

      arg = $scope.Opal.$destructure(arguments);
        return [block.$call(arg), arg];}, TMP_39._s = self, TMP_39), $e).call($f)).$sort, $c._p = (TMP_38 = function(a, b){var self = TMP_38._s || this;
if (a == null) a = nil;if (b == null) b = nil;
      return a['$[]'](0)['$<=>'](b['$[]'](0))}, TMP_38._s = self, TMP_38), $c).call($d)).$map, $a._p = (TMP_37 = function(arg){var self = TMP_37._s || this;
if (arg == null) arg = nil;
      return arg[1];}, TMP_37._s = self, TMP_37), $a).call($b);
    };

    def.$take = function(num) {
      var self = this;

      return self.$first(num);
    };

    def.$take_while = TMP_40 = function() {
      var $a, self = this, $iter = TMP_40._p, block = $iter || nil;

      TMP_40._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("take_while")
      };
      
      var result = [];

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = $opal.$yield1(block, param);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
          return $breaker;
        }

        result.push(param);
      };

      self.$each();

      return result;
    
    };

    $opal.defn(self, '$to_a', def.$entries);

    def.$zip = TMP_41 = function(others) {
      var $a, self = this, $iter = TMP_41._p, block = $iter || nil;

      others = $slice.call(arguments, 0);
      TMP_41._p = null;
      return ($a = self.$to_a()).$zip.apply($a, [].concat(others));
    };
        ;$opal.donate(self, ["$all?", "$any?", "$chunk", "$collect", "$collect_concat", "$count", "$cycle", "$detect", "$drop", "$drop_while", "$each_cons", "$each_entry", "$each_slice", "$each_with_index", "$each_with_object", "$entries", "$find", "$find_all", "$find_index", "$first", "$flat_map", "$grep", "$group_by", "$include?", "$inject", "$lazy", "$enumerator_size", "$map", "$max", "$max_by", "$member?", "$min", "$min_by", "$minmax", "$minmax_by", "$none?", "$one?", "$partition", "$reduce", "$reject", "$reverse_each", "$select", "$slice_before", "$sort", "$sort_by", "$take", "$take_while", "$to_a", "$zip"]);
  })(self)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/enumerable.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$allocate', '$new', '$to_proc', '$coerce_to', '$nil?', '$empty?', '$+', '$class', '$__send__', '$===', '$call', '$enum_for', '$destructure', '$name', '$inspect', '$[]', '$raise', '$yield', '$each', '$enumerator_size', '$respond_to?', '$try_convert', '$<', '$for']);
  ;
  return (function($base, $super) {
    function $Enumerator(){};
    var self = $Enumerator = $klass($base, $super, 'Enumerator', $Enumerator);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4;

    def.size = def.args = def.object = def.method = nil;
    self.$include($scope.Enumerable);

    $opal.defs(self, '$for', TMP_1 = function(object, method, args) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 2);
      if (method == null) {
        method = "each"
      }
      TMP_1._p = null;
      
      var obj = self.$allocate();

      obj.object = object;
      obj.size   = block;
      obj.method = method;
      obj.args   = args;

      return obj;
    ;
    });

    def.$initialize = TMP_2 = function() {
      var $a, $b, self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      if (block !== false && block !== nil) {
        self.object = ($a = ($b = $scope.Generator).$new, $a._p = block.$to_proc(), $a).call($b);
        self.method = "each";
        self.args = [];
        self.size = arguments[0] || nil;
        if ((($a = self.size) !== nil && (!$a._isBoolean || $a == true))) {
          return self.size = $scope.Opal.$coerce_to(self.size, $scope.Integer, "to_int")
          } else {
          return nil
        };
        } else {
        self.object = arguments[0];
        self.method = arguments[1] || "each";
        self.args = $slice.call(arguments, 2);
        return self.size = nil;
      };
    };

    def.$each = TMP_3 = function(args) {
      var $a, $b, $c, self = this, $iter = TMP_3._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_3._p = null;
      if ((($a = ($b = block['$nil?'](), $b !== false && $b !== nil ?args['$empty?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      args = self.args['$+'](args);
      if ((($a = block['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return ($a = self.$class()).$new.apply($a, [self.object, self.method].concat(args))};
      return ($b = ($c = self.object).$__send__, $b._p = block.$to_proc(), $b).apply($c, [self.method].concat(args));
    };

    def.$size = function() {
      var $a, self = this;

      if ((($a = $scope.Proc['$==='](self.size)) !== nil && (!$a._isBoolean || $a == true))) {
        return ($a = self.size).$call.apply($a, [].concat(self.args))
        } else {
        return self.size
      };
    };

    def.$with_index = TMP_4 = function(offset) {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      if (offset == null) {
        offset = 0
      }
      TMP_4._p = null;
      if (offset !== false && offset !== nil) {
        offset = $scope.Opal.$coerce_to(offset, $scope.Integer, "to_int")
        } else {
        offset = 0
      };
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("with_index", offset)
      };
      
      var result

      self.$each._p = function() {
        var param = $scope.Opal.$destructure(arguments),
            value = block(param, index);

        if (value === $breaker) {
          result = $breaker.$v;
          return $breaker;
        }

        index++;
      }

      self.$each();

      if (result !== undefined) {
        return result;
      }
    ;
    };

    $opal.defn(self, '$with_object', def.$each_with_object);

    def.$inspect = function() {
      var $a, self = this, result = nil;

      result = "#<" + (self.$class().$name()) + ": " + (self.object.$inspect()) + ":" + (self.method);
      if ((($a = self.args['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        result = result['$+']("(" + (self.args.$inspect()['$[]']($scope.Range.$new(1, -2))) + ")")
      };
      return result['$+'](">");
    };

    (function($base, $super) {
      function $Generator(){};
      var self = $Generator = $klass($base, $super, 'Generator', $Generator);

      var def = self._proto, $scope = self._scope, TMP_5, TMP_6;

      def.block = nil;
      self.$include($scope.Enumerable);

      def.$initialize = TMP_5 = function() {
        var self = this, $iter = TMP_5._p, block = $iter || nil;

        TMP_5._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.LocalJumpError, "no block given")
        };
        return self.block = block;
      };

      return (def.$each = TMP_6 = function(args) {
        var $a, $b, self = this, $iter = TMP_6._p, block = $iter || nil, yielder = nil;

        args = $slice.call(arguments, 0);
        TMP_6._p = null;
        yielder = ($a = ($b = $scope.Yielder).$new, $a._p = block.$to_proc(), $a).call($b);
        
        try {
          args.unshift(yielder);

          if ($opal.$yieldX(self.block, args) === $breaker) {
            return $breaker.$v;
          }
        }
        catch (e) {
          if (e === $breaker) {
            return $breaker.$v;
          }
          else {
            throw e;
          }
        }
      ;
        return self;
      }, nil) && 'each';
    })(self, null);

    (function($base, $super) {
      function $Yielder(){};
      var self = $Yielder = $klass($base, $super, 'Yielder', $Yielder);

      var def = self._proto, $scope = self._scope, TMP_7;

      def.block = nil;
      def.$initialize = TMP_7 = function() {
        var self = this, $iter = TMP_7._p, block = $iter || nil;

        TMP_7._p = null;
        return self.block = block;
      };

      def.$yield = function(values) {
        var self = this;

        values = $slice.call(arguments, 0);
        
        var value = $opal.$yieldX(self.block, values);

        if (value === $breaker) {
          throw $breaker;
        }

        return value;
      ;
      };

      return (def['$<<'] = function(values) {
        var $a, self = this;

        values = $slice.call(arguments, 0);
        ($a = self).$yield.apply($a, [].concat(values));
        return self;
      }, nil) && '<<';
    })(self, null);

    return (function($base, $super) {
      function $Lazy(){};
      var self = $Lazy = $klass($base, $super, 'Lazy', $Lazy);

      var def = self._proto, $scope = self._scope, TMP_8, TMP_11, TMP_13, TMP_18, TMP_20, TMP_21, TMP_23, TMP_26, TMP_29;

      def.enumerator = nil;
      (function($base, $super) {
        function $StopLazyError(){};
        var self = $StopLazyError = $klass($base, $super, 'StopLazyError', $StopLazyError);

        var def = self._proto, $scope = self._scope;

        return nil;
      })(self, $scope.Exception);

      def.$initialize = TMP_8 = function(object, size) {
        var TMP_9, self = this, $iter = TMP_8._p, block = $iter || nil;

        if (size == null) {
          size = nil
        }
        TMP_8._p = null;
        if ((block !== nil)) {
          } else {
          self.$raise($scope.ArgumentError, "tried to call lazy new without a block")
        };
        self.enumerator = object;
        return $opal.find_super_dispatcher(self, 'initialize', TMP_8, (TMP_9 = function(yielder, each_args){var self = TMP_9._s || this, $a, $b, TMP_10;
if (yielder == null) yielder = nil;each_args = $slice.call(arguments, 1);
        try {
          return ($a = ($b = object).$each, $a._p = (TMP_10 = function(args){var self = TMP_10._s || this;
args = $slice.call(arguments, 0);
            
              args.unshift(yielder);

              if ($opal.$yieldX(block, args) === $breaker) {
                return $breaker;
              }
            ;}, TMP_10._s = self, TMP_10), $a).apply($b, [].concat(each_args))
          } catch ($err) {if ($opal.$rescue($err, [$scope.Exception])) {
            return nil
            }else { throw $err; }
          }}, TMP_9._s = self, TMP_9)).apply(self, [size]);
      };

      $opal.defn(self, '$force', def.$to_a);

      def.$lazy = function() {
        var self = this;

        return self;
      };

      def.$collect = TMP_11 = function() {
        var $a, $b, TMP_12, self = this, $iter = TMP_11._p, block = $iter || nil;

        TMP_11._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.ArgumentError, "tried to call lazy map without a block")
        };
        return ($a = ($b = $scope.Lazy).$new, $a._p = (TMP_12 = function(enum$, args){var self = TMP_12._s || this;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          enum$.$yield(value);
        }, TMP_12._s = self, TMP_12), $a).call($b, self, self.$enumerator_size());
      };

      def.$collect_concat = TMP_13 = function() {
        var $a, $b, TMP_14, self = this, $iter = TMP_13._p, block = $iter || nil;

        TMP_13._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.ArgumentError, "tried to call lazy map without a block")
        };
        return ($a = ($b = $scope.Lazy).$new, $a._p = (TMP_14 = function(enum$, args){var self = TMP_14._s || this, $a, $b, TMP_15, $c, TMP_16;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((value)['$respond_to?']("force") && (value)['$respond_to?']("each")) {
            ($a = ($b = (value)).$each, $a._p = (TMP_15 = function(v){var self = TMP_15._s || this;
if (v == null) v = nil;
          return enum$.$yield(v)}, TMP_15._s = self, TMP_15), $a).call($b)
          }
          else {
            var array = $scope.Opal.$try_convert(value, $scope.Array, "to_ary");

            if (array === nil) {
              enum$.$yield(value);
            }
            else {
              ($a = ($c = (value)).$each, $a._p = (TMP_16 = function(v){var self = TMP_16._s || this;
if (v == null) v = nil;
          return enum$.$yield(v)}, TMP_16._s = self, TMP_16), $a).call($c);
            }
          }
        ;}, TMP_14._s = self, TMP_14), $a).call($b, self, nil);
      };

      def.$drop = function(n) {
        var $a, $b, TMP_17, self = this, current_size = nil, set_size = nil, dropped = nil;

        n = $scope.Opal.$coerce_to(n, $scope.Integer, "to_int");
        if (n['$<'](0)) {
          self.$raise($scope.ArgumentError, "attempt to drop negative size")};
        current_size = self.$enumerator_size();
        set_size = (function() {if ((($a = $scope.Integer['$==='](current_size)) !== nil && (!$a._isBoolean || $a == true))) {
          if (n['$<'](current_size)) {
            return n
            } else {
            return current_size
          }
          } else {
          return current_size
        }; return nil; })();
        dropped = 0;
        return ($a = ($b = $scope.Lazy).$new, $a._p = (TMP_17 = function(enum$, args){var self = TMP_17._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        if (dropped['$<'](n)) {
            return dropped = dropped['$+'](1)
            } else {
            return ($a = enum$).$yield.apply($a, [].concat(args))
          }}, TMP_17._s = self, TMP_17), $a).call($b, self, set_size);
      };

      def.$drop_while = TMP_18 = function() {
        var $a, $b, TMP_19, self = this, $iter = TMP_18._p, block = $iter || nil, succeeding = nil;

        TMP_18._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.ArgumentError, "tried to call lazy drop_while without a block")
        };
        succeeding = true;
        return ($a = ($b = $scope.Lazy).$new, $a._p = (TMP_19 = function(enum$, args){var self = TMP_19._s || this, $a, $b;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        if (succeeding !== false && succeeding !== nil) {
            
            var value = $opal.$yieldX(block, args);

            if (value === $breaker) {
              return $breaker;
            }

            if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
              succeeding = false;

              ($a = enum$).$yield.apply($a, [].concat(args));
            }
          
            } else {
            return ($b = enum$).$yield.apply($b, [].concat(args))
          }}, TMP_19._s = self, TMP_19), $a).call($b, self, nil);
      };

      def.$enum_for = TMP_20 = function(method, args) {
        var $a, $b, self = this, $iter = TMP_20._p, block = $iter || nil;

        args = $slice.call(arguments, 1);
        if (method == null) {
          method = "each"
        }
        TMP_20._p = null;
        return ($a = ($b = self.$class()).$for, $a._p = block.$to_proc(), $a).apply($b, [self, method].concat(args));
      };

      def.$find_all = TMP_21 = function() {
        var $a, $b, TMP_22, self = this, $iter = TMP_21._p, block = $iter || nil;

        TMP_21._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.ArgumentError, "tried to call lazy select without a block")
        };
        return ($a = ($b = $scope.Lazy).$new, $a._p = (TMP_22 = function(enum$, args){var self = TMP_22._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            ($a = enum$).$yield.apply($a, [].concat(args));
          }
        ;}, TMP_22._s = self, TMP_22), $a).call($b, self, nil);
      };

      $opal.defn(self, '$flat_map', def.$collect_concat);

      def.$grep = TMP_23 = function(pattern) {
        var $a, $b, TMP_24, $c, TMP_25, self = this, $iter = TMP_23._p, block = $iter || nil;

        TMP_23._p = null;
        if (block !== false && block !== nil) {
          return ($a = ($b = $scope.Lazy).$new, $a._p = (TMP_24 = function(enum$, args){var self = TMP_24._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
          
            var param = $scope.Opal.$destructure(args),
                value = pattern['$==='](param);

            if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
              value = $opal.$yield1(block, param);

              if (value === $breaker) {
                return $breaker;
              }

              enum$.$yield($opal.$yield1(block, param));
            }
          ;}, TMP_24._s = self, TMP_24), $a).call($b, self, nil)
          } else {
          return ($a = ($c = $scope.Lazy).$new, $a._p = (TMP_25 = function(enum$, args){var self = TMP_25._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
          
            var param = $scope.Opal.$destructure(args),
                value = pattern['$==='](param);

            if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
              enum$.$yield(param);
            }
          ;}, TMP_25._s = self, TMP_25), $a).call($c, self, nil)
        };
      };

      $opal.defn(self, '$map', def.$collect);

      $opal.defn(self, '$select', def.$find_all);

      def.$reject = TMP_26 = function() {
        var $a, $b, TMP_27, self = this, $iter = TMP_26._p, block = $iter || nil;

        TMP_26._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.ArgumentError, "tried to call lazy reject without a block")
        };
        return ($a = ($b = $scope.Lazy).$new, $a._p = (TMP_27 = function(enum$, args){var self = TMP_27._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((($a = value) === nil || ($a._isBoolean && $a == false))) {
            ($a = enum$).$yield.apply($a, [].concat(args));
          }
        ;}, TMP_27._s = self, TMP_27), $a).call($b, self, nil);
      };

      def.$take = function(n) {
        var $a, $b, TMP_28, self = this, current_size = nil, set_size = nil, taken = nil;

        n = $scope.Opal.$coerce_to(n, $scope.Integer, "to_int");
        if (n['$<'](0)) {
          self.$raise($scope.ArgumentError, "attempt to take negative size")};
        current_size = self.$enumerator_size();
        set_size = (function() {if ((($a = $scope.Integer['$==='](current_size)) !== nil && (!$a._isBoolean || $a == true))) {
          if (n['$<'](current_size)) {
            return n
            } else {
            return current_size
          }
          } else {
          return current_size
        }; return nil; })();
        taken = 0;
        return ($a = ($b = $scope.Lazy).$new, $a._p = (TMP_28 = function(enum$, args){var self = TMP_28._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        if (taken['$<'](n)) {
            ($a = enum$).$yield.apply($a, [].concat(args));
            return taken = taken['$+'](1);
            } else {
            return self.$raise($scope.StopLazyError)
          }}, TMP_28._s = self, TMP_28), $a).call($b, self, set_size);
      };

      def.$take_while = TMP_29 = function() {
        var $a, $b, TMP_30, self = this, $iter = TMP_29._p, block = $iter || nil;

        TMP_29._p = null;
        if (block !== false && block !== nil) {
          } else {
          self.$raise($scope.ArgumentError, "tried to call lazy take_while without a block")
        };
        return ($a = ($b = $scope.Lazy).$new, $a._p = (TMP_30 = function(enum$, args){var self = TMP_30._s || this, $a;
if (enum$ == null) enum$ = nil;args = $slice.call(arguments, 1);
        
          var value = $opal.$yieldX(block, args);

          if (value === $breaker) {
            return $breaker;
          }

          if ((($a = value) !== nil && (!$a._isBoolean || $a == true))) {
            ($a = enum$).$yield.apply($a, [].concat(args));
          }
          else {
            self.$raise($scope.StopLazyError);
          }
        ;}, TMP_30._s = self, TMP_30), $a).call($b, self, nil);
      };

      $opal.defn(self, '$to_enum', def.$enum_for);

      return (def.$inspect = function() {
        var self = this;

        return "#<" + (self.$class().$name()) + ": " + (self.enumerator.$inspect()) + ">";
      }, nil) && 'inspect';
    })(self, self);
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/enumerator.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars, $range = $opal.range;

  $opal.add_stubs(['$include', '$new', '$class', '$raise', '$===', '$to_a', '$respond_to?', '$to_ary', '$coerce_to', '$coerce_to?', '$==', '$to_str', '$clone', '$hash', '$<=>', '$inspect', '$empty?', '$enum_for', '$nil?', '$coerce_to!', '$initialize_clone', '$initialize_dup', '$replace', '$eql?', '$length', '$begin', '$end', '$exclude_end?', '$flatten', '$object_id', '$[]', '$to_s', '$join', '$delete_if', '$to_proc', '$each', '$reverse', '$!', '$map', '$rand', '$keep_if', '$shuffle!', '$>', '$<', '$sort', '$times', '$[]=', '$<<', '$at']);
  ;
  return (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_8, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13, TMP_14, TMP_15, TMP_17, TMP_18, TMP_19, TMP_20, TMP_21, TMP_24;

    def.length = nil;
    self.$include($scope.Enumerable);

    def._isArray = true;

    $opal.defs(self, '$[]', function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      return objects;
    });

    def.$initialize = function(args) {
      var $a, self = this;

      args = $slice.call(arguments, 0);
      return ($a = self.$class()).$new.apply($a, [].concat(args));
    };

    $opal.defs(self, '$new', TMP_1 = function(size, obj) {
      var $a, self = this, $iter = TMP_1._p, block = $iter || nil;

      if (size == null) {
        size = nil
      }
      if (obj == null) {
        obj = nil
      }
      TMP_1._p = null;
      if ((($a = arguments.length > 2) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "wrong number of arguments (" + (arguments.length) + " for 0..2)")};
      if ((($a = arguments.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      if ((($a = arguments.length === 1) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = $scope.Array['$==='](size)) !== nil && (!$a._isBoolean || $a == true))) {
          return size.$to_a()
        } else if ((($a = size['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
          return size.$to_ary()}};
      size = $scope.Opal.$coerce_to(size, $scope.Integer, "to_int");
      if ((($a = size < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "negative array size")};
      
      var result = [];

      if (block === nil) {
        for (var i = 0; i < size; i++) {
          result.push(obj);
        }
      }
      else {
        for (var i = 0, value; i < size; i++) {
          value = block(i);

          if (value === $breaker) {
            return $breaker.$v;
          }

          result[i] = value;
        }
      }

      return result;
    
    });

    $opal.defs(self, '$try_convert', function(obj) {
      var self = this;

      return $scope.Opal['$coerce_to?'](obj, $scope.Array, "to_ary");
    });

    def['$&'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.Array['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.Opal.$coerce_to(other, $scope.Array, "to_ary").$to_a()
      };
      
      var result = [],
          seen   = {};

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if (!seen[item]) {
          for (var j = 0, length2 = other.length; j < length2; j++) {
            var item2 = other[j];

            if (!seen[item2] && (item)['$=='](item2)) {
              seen[item] = true;
              result.push(item);
            }
          }
        }
      }

      return result;
    
    };

    def['$*'] = function(other) {
      var $a, self = this;

      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        return self.join(other.$to_str())};
      if ((($a = other['$respond_to?']("to_int")) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.TypeError, "no implicit conversion of " + (other.$class()) + " into Integer")
      };
      other = $scope.Opal.$coerce_to(other, $scope.Integer, "to_int");
      if ((($a = other < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "negative argument")};
      
      var result = [];

      for (var i = 0; i < other; i++) {
        result = result.concat(self);
      }

      return result;
    
    };

    def['$+'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.Array['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.Opal.$coerce_to(other, $scope.Array, "to_ary").$to_a()
      };
      return self.concat(other);
    };

    def['$-'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.Array['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.Opal.$coerce_to(other, $scope.Array, "to_ary").$to_a()
      };
      if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      if ((($a = other.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$clone()};
      
      var seen   = {},
          result = [];

      for (var i = 0, length = other.length; i < length; i++) {
        seen[other[i]] = true;
      }

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if (!seen[item]) {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$<<'] = function(object) {
      var self = this;

      self.push(object);
      return self;
    };

    def['$<=>'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.Array['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
      } else if ((($a = other['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_ary().$to_a()
        } else {
        return nil
      };
      
      if (self.$hash() === other.$hash()) {
        return 0;
      }

      if (self.length != other.length) {
        return (self.length > other.length) ? 1 : -1;
      }

      for (var i = 0, length = self.length; i < length; i++) {
        var tmp = (self[i])['$<=>'](other[i]);

        if (tmp !== 0) {
          return tmp;
        }
      }

      return 0;
    ;
    };

    def['$=='] = function(other) {
      var $a, self = this;

      if ((($a = self === other) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = $scope.Array['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        if ((($a = other['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return false
        };
        return other['$=='](self);
      };
      other = other.$to_a();
      if ((($a = self.length === other.length) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var a = self[i],
            b = other[i];

        if (a._isArray && b._isArray && (a === self)) {
          continue;
        }

        if (!(a)['$=='](b)) {
          return false;
        }
      }
    
      return true;
    };

    def['$[]'] = function(index, length) {
      var $a, self = this;

      if ((($a = $scope.Range['$==='](index)) !== nil && (!$a._isBoolean || $a == true))) {
        
        var size    = self.length,
            exclude = index.exclude,
            from    = $scope.Opal.$coerce_to(index.begin, $scope.Integer, "to_int"),
            to      = $scope.Opal.$coerce_to(index.end, $scope.Integer, "to_int");

        if (from < 0) {
          from += size;

          if (from < 0) {
            return nil;
          }
        }

        if (from > size) {
          return nil;
        }

        if (to < 0) {
          to += size;

          if (to < 0) {
            return [];
          }
        }

        if (!exclude) {
          to += 1;
        }

        return self.slice(from, to);
      ;
        } else {
        index = $scope.Opal.$coerce_to(index, $scope.Integer, "to_int");
        
        var size = self.length;

        if (index < 0) {
          index += size;

          if (index < 0) {
            return nil;
          }
        }

        if (length === undefined) {
          if (index >= size || index < 0) {
            return nil;
          }

          return self[index];
        }
        else {
          length = $scope.Opal.$coerce_to(length, $scope.Integer, "to_int");

          if (length < 0 || index > size || index < 0) {
            return nil;
          }

          return self.slice(index, index + length);
        }
      
      };
    };

    def['$[]='] = function(index, value, extra) {
      var $a, self = this, data = nil, length = nil;

      if ((($a = $scope.Range['$==='](index)) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = $scope.Array['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
          data = value.$to_a()
        } else if ((($a = value['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
          data = value.$to_ary().$to_a()
          } else {
          data = [value]
        };
        
        var size    = self.length,
            exclude = index.exclude,
            from    = $scope.Opal.$coerce_to(index.begin, $scope.Integer, "to_int"),
            to      = $scope.Opal.$coerce_to(index.end, $scope.Integer, "to_int");

        if (from < 0) {
          from += size;

          if (from < 0) {
            self.$raise($scope.RangeError, "" + (index.$inspect()) + " out of range");
          }
        }

        if (to < 0) {
          to += size;
        }

        if (!exclude) {
          to += 1;
        }

        if (from > size) {
          for (var i = size; i < from; i++) {
            self[i] = nil;
          }
        }

        if (to < 0) {
          self.splice.apply(self, [from, 0].concat(data));
        }
        else {
          self.splice.apply(self, [from, to - from].concat(data));
        }

        return value;
      ;
        } else {
        if ((($a = extra === undefined) !== nil && (!$a._isBoolean || $a == true))) {
          length = 1
          } else {
          length = value;
          value = extra;
          if ((($a = $scope.Array['$==='](value)) !== nil && (!$a._isBoolean || $a == true))) {
            data = value.$to_a()
          } else if ((($a = value['$respond_to?']("to_ary")) !== nil && (!$a._isBoolean || $a == true))) {
            data = value.$to_ary().$to_a()
            } else {
            data = [value]
          };
        };
        
        var size   = self.length,
            index  = $scope.Opal.$coerce_to(index, $scope.Integer, "to_int"),
            length = $scope.Opal.$coerce_to(length, $scope.Integer, "to_int"),
            old;

        if (index < 0) {
          old    = index;
          index += size;

          if (index < 0) {
            self.$raise($scope.IndexError, "index " + (old) + " too small for array; minimum " + (-self.length));
          }
        }

        if (length < 0) {
          self.$raise($scope.IndexError, "negative length (" + (length) + ")")
        }

        if (index > size) {
          for (var i = size; i < index; i++) {
            self[i] = nil;
          }
        }

        if (extra === undefined) {
          self[index] = value;
        }
        else {
          self.splice.apply(self, [index, length].concat(data));
        }

        return value;
      ;
      };
    };

    def.$assoc = function(object) {
      var self = this;

      
      for (var i = 0, length = self.length, item; i < length; i++) {
        if (item = self[i], item.length && (item[0])['$=='](object)) {
          return item;
        }
      }

      return nil;
    
    };

    def.$at = function(index) {
      var self = this;

      index = $scope.Opal.$coerce_to(index, $scope.Integer, "to_int");
      
      if (index < 0) {
        index += self.length;
      }

      if (index < 0 || index >= self.length) {
        return nil;
      }

      return self[index];
    
    };

    def.$cycle = TMP_2 = function(n) {
      var $a, $b, self = this, $iter = TMP_2._p, block = $iter || nil;

      if (n == null) {
        n = nil
      }
      TMP_2._p = null;
      if ((($a = ((($b = self['$empty?']()) !== false && $b !== nil) ? $b : n['$=='](0))) !== nil && (!$a._isBoolean || $a == true))) {
        return nil};
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("cycle", n)
      };
      if ((($a = n['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        
        while (true) {
          for (var i = 0, length = self.length; i < length; i++) {
            var value = $opal.$yield1(block, self[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }
        }
      
        } else {
        n = $scope.Opal['$coerce_to!'](n, $scope.Integer, "to_int");
        
        if (n <= 0) {
          return self;
        }

        while (n > 0) {
          for (var i = 0, length = self.length; i < length; i++) {
            var value = $opal.$yield1(block, self[i]);

            if (value === $breaker) {
              return $breaker.$v;
            }
          }

          n--;
        }
      
      };
      return self;
    };

    def.$clear = function() {
      var self = this;

      self.splice(0, self.length);
      return self;
    };

    def.$clone = function() {
      var self = this, copy = nil;

      copy = [];
      copy.$initialize_clone(self);
      return copy;
    };

    def.$dup = function() {
      var self = this, copy = nil;

      copy = [];
      copy.$initialize_dup(self);
      return copy;
    };

    def.$initialize_copy = function(other) {
      var self = this;

      return self.$replace(other);
    };

    def.$collect = TMP_3 = function() {
      var self = this, $iter = TMP_3._p, block = $iter || nil;

      TMP_3._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect")
      };
      
      var result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        var value = Opal.$yield1(block, self[i]);

        if (value === $breaker) {
          return $breaker.$v;
        }

        result.push(value);
      }

      return result;
    
    };

    def['$collect!'] = TMP_4 = function() {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("collect!")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var value = Opal.$yield1(block, self[i]);

        if (value === $breaker) {
          return $breaker.$v;
        }

        self[i] = value;
      }
    
      return self;
    };

    def.$compact = function() {
      var self = this;

      
      var result = [];

      for (var i = 0, length = self.length, item; i < length; i++) {
        if ((item = self[i]) !== nil) {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$compact!'] = function() {
      var self = this;

      
      var original = self.length;

      for (var i = 0, length = self.length; i < length; i++) {
        if (self[i] === nil) {
          self.splice(i, 1);

          length--;
          i--;
        }
      }

      return self.length === original ? nil : self;
    
    };

    def.$concat = function(other) {
      var $a, self = this;

      if ((($a = $scope.Array['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.Opal.$coerce_to(other, $scope.Array, "to_ary").$to_a()
      };
      
      for (var i = 0, length = other.length; i < length; i++) {
        self.push(other[i]);
      }
    
      return self;
    };

    def.$delete = function(object) {
      var self = this;

      
      var original = self.length;

      for (var i = 0, length = original; i < length; i++) {
        if ((self[i])['$=='](object)) {
          self.splice(i, 1);

          length--;
          i--;
        }
      }

      return self.length === original ? nil : object;
    
    };

    def.$delete_at = function(index) {
      var self = this;

      
      index = $scope.Opal.$coerce_to(index, $scope.Integer, "to_int");

      if (index < 0) {
        index += self.length;
      }

      if (index < 0 || index >= self.length) {
        return nil;
      }

      var result = self[index];

      self.splice(index, 1);

      return result;
    ;
    };

    def.$delete_if = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("delete_if")
      };
      
      for (var i = 0, length = self.length, value; i < length; i++) {
        if ((value = block(self[i])) === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          self.splice(i, 1);

          length--;
          i--;
        }
      }
    
      return self;
    };

    def.$drop = function(number) {
      var self = this;

      
      if (number < 0) {
        self.$raise($scope.ArgumentError)
      }

      return self.slice(number);
    ;
    };

    $opal.defn(self, '$dup', def.$clone);

    def.$each = TMP_6 = function() {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var value = $opal.$yield1(block, self[i]);

        if (value == $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def.$each_index = TMP_7 = function() {
      var self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_index")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var value = $opal.$yield1(block, i);

        if (value === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def['$empty?'] = function() {
      var self = this;

      return self.length === 0;
    };

    def['$eql?'] = function(other) {
      var $a, self = this;

      if ((($a = self === other) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = $scope.Array['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      other = other.$to_a();
      if ((($a = self.length === other.length) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        var a = self[i],
            b = other[i];

        if (a._isArray && b._isArray && (a === self)) {
          continue;
        }

        if (!(a)['$eql?'](b)) {
          return false;
        }
      }
    
      return true;
    };

    def.$fetch = TMP_8 = function(index, defaults) {
      var self = this, $iter = TMP_8._p, block = $iter || nil;

      TMP_8._p = null;
      
      var original = index;

      index = $scope.Opal.$coerce_to(index, $scope.Integer, "to_int");

      if (index < 0) {
        index += self.length;
      }

      if (index >= 0 && index < self.length) {
        return self[index];
      }

      if (block !== nil) {
        return block(original);
      }

      if (defaults != null) {
        return defaults;
      }

      if (self.length === 0) {
        self.$raise($scope.IndexError, "index " + (original) + " outside of array bounds: 0...0")
      }
      else {
        self.$raise($scope.IndexError, "index " + (original) + " outside of array bounds: -" + (self.length) + "..." + (self.length));
      }
    ;
    };

    def.$fill = TMP_9 = function(args) {
      var $a, self = this, $iter = TMP_9._p, block = $iter || nil, one = nil, two = nil, obj = nil, left = nil, right = nil;

      args = $slice.call(arguments, 0);
      TMP_9._p = null;
      if (block !== false && block !== nil) {
        if ((($a = args.length > 2) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise($scope.ArgumentError, "wrong number of arguments (" + (args.$length()) + " for 0..2)")};
        $a = $opal.to_ary(args), one = ($a[0] == null ? nil : $a[0]), two = ($a[1] == null ? nil : $a[1]);
        } else {
        if ((($a = args.length == 0) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise($scope.ArgumentError, "wrong number of arguments (0 for 1..3)")
        } else if ((($a = args.length > 3) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise($scope.ArgumentError, "wrong number of arguments (" + (args.$length()) + " for 1..3)")};
        $a = $opal.to_ary(args), obj = ($a[0] == null ? nil : $a[0]), one = ($a[1] == null ? nil : $a[1]), two = ($a[2] == null ? nil : $a[2]);
      };
      if ((($a = $scope.Range['$==='](one)) !== nil && (!$a._isBoolean || $a == true))) {
        if (two !== false && two !== nil) {
          self.$raise($scope.TypeError, "length invalid with range")};
        left = $scope.Opal.$coerce_to(one.$begin(), $scope.Integer, "to_int");
        if ((($a = left < 0) !== nil && (!$a._isBoolean || $a == true))) {
          left += self.length;};
        if ((($a = left < 0) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise($scope.RangeError, "" + (one.$inspect()) + " out of range")};
        right = $scope.Opal.$coerce_to(one.$end(), $scope.Integer, "to_int");
        if ((($a = right < 0) !== nil && (!$a._isBoolean || $a == true))) {
          right += self.length;};
        if ((($a = one['$exclude_end?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          right += 1;
        };
        if ((($a = right <= left) !== nil && (!$a._isBoolean || $a == true))) {
          return self};
      } else if (one !== false && one !== nil) {
        left = $scope.Opal.$coerce_to(one, $scope.Integer, "to_int");
        if ((($a = left < 0) !== nil && (!$a._isBoolean || $a == true))) {
          left += self.length;};
        if ((($a = left < 0) !== nil && (!$a._isBoolean || $a == true))) {
          left = 0};
        if (two !== false && two !== nil) {
          right = $scope.Opal.$coerce_to(two, $scope.Integer, "to_int");
          if ((($a = right == 0) !== nil && (!$a._isBoolean || $a == true))) {
            return self};
          right += left;
          } else {
          right = self.length
        };
        } else {
        left = 0;
        right = self.length;
      };
      if ((($a = left > self.length) !== nil && (!$a._isBoolean || $a == true))) {
        
        for (var i = self.length; i < right; i++) {
          self[i] = nil;
        }
      ;};
      if ((($a = right > self.length) !== nil && (!$a._isBoolean || $a == true))) {
        self.length = right};
      if (block !== false && block !== nil) {
        
        for (var length = self.length; left < right; left++) {
          var value = block(left);

          if (value === $breaker) {
            return $breaker.$v;
          }

          self[left] = value;
        }
      ;
        } else {
        
        for (var length = self.length; left < right; left++) {
          self[left] = obj;
        }
      ;
      };
      return self;
    };

    def.$first = function(count) {
      var self = this;

      
      if (count == null) {
        return self.length === 0 ? nil : self[0];
      }

      count = $scope.Opal.$coerce_to(count, $scope.Integer, "to_int");

      if (count < 0) {
        self.$raise($scope.ArgumentError, "negative array size");
      }

      return self.slice(0, count);
    
    };

    def.$flatten = function(level) {
      var self = this;

      
      var result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if ($scope.Opal['$respond_to?'](item, "to_ary")) {
          item = (item).$to_ary();

          if (level == null) {
            result.push.apply(result, (item).$flatten().$to_a());
          }
          else if (level == 0) {
            result.push(item);
          }
          else {
            result.push.apply(result, (item).$flatten(level - 1).$to_a());
          }
        }
        else {
          result.push(item);
        }
      }

      return result;
    ;
    };

    def['$flatten!'] = function(level) {
      var self = this;

      
      var flattened = self.$flatten(level);

      if (self.length == flattened.length) {
        for (var i = 0, length = self.length; i < length; i++) {
          if (self[i] !== flattened[i]) {
            break;
          }
        }

        if (i == length) {
          return nil;
        }
      }

      self.$replace(flattened);
    ;
      return self;
    };

    def.$hash = function() {
      var self = this;

      return self._id || (self._id = Opal.uid());
    };

    def['$include?'] = function(member) {
      var self = this;

      
      for (var i = 0, length = self.length; i < length; i++) {
        if ((self[i])['$=='](member)) {
          return true;
        }
      }

      return false;
    
    };

    def.$index = TMP_10 = function(object) {
      var self = this, $iter = TMP_10._p, block = $iter || nil;

      TMP_10._p = null;
      
      if (object != null) {
        for (var i = 0, length = self.length; i < length; i++) {
          if ((self[i])['$=='](object)) {
            return i;
          }
        }
      }
      else if (block !== nil) {
        for (var i = 0, length = self.length, value; i < length; i++) {
          if ((value = block(self[i])) === $breaker) {
            return $breaker.$v;
          }

          if (value !== false && value !== nil) {
            return i;
          }
        }
      }
      else {
        return self.$enum_for("index");
      }

      return nil;
    
    };

    def.$insert = function(index, objects) {
      var self = this;

      objects = $slice.call(arguments, 1);
      
      index = $scope.Opal.$coerce_to(index, $scope.Integer, "to_int");

      if (objects.length > 0) {
        if (index < 0) {
          index += self.length + 1;

          if (index < 0) {
            self.$raise($scope.IndexError, "" + (index) + " is out of bounds");
          }
        }
        if (index > self.length) {
          for (var i = self.length; i < index; i++) {
            self.push(nil);
          }
        }

        self.splice.apply(self, [index, 0].concat(objects));
      }
    ;
      return self;
    };

    def.$inspect = function() {
      var self = this;

      
      var i, inspect, el, el_insp, length, object_id;

      inspect = [];
      object_id = self.$object_id();
      length = self.length;

      for (i = 0; i < length; i++) {
        el = self['$[]'](i);

        // Check object_id to ensure it's not the same array get into an infinite loop
        el_insp = (el).$object_id() === object_id ? '[...]' : (el).$inspect();

        inspect.push(el_insp);
      }
      return '[' + inspect.join(', ') + ']';
    ;
    };

    def.$join = function(sep) {
      var $a, self = this;
      if ($gvars[","] == null) $gvars[","] = nil;

      if (sep == null) {
        sep = nil
      }
      if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return ""};
      if ((($a = sep === nil) !== nil && (!$a._isBoolean || $a == true))) {
        sep = $gvars[","]};
      
      var result = [];

      for (var i = 0, length = self.length; i < length; i++) {
        var item = self[i];

        if ($scope.Opal['$respond_to?'](item, "to_str")) {
          var tmp = (item).$to_str();

          if (tmp !== nil) {
            result.push((tmp).$to_s());

            continue;
          }
        }

        if ($scope.Opal['$respond_to?'](item, "to_ary")) {
          var tmp = (item).$to_ary();

          if (tmp !== nil) {
            result.push((tmp).$join(sep));

            continue;
          }
        }

        if ($scope.Opal['$respond_to?'](item, "to_s")) {
          var tmp = (item).$to_s();

          if (tmp !== nil) {
            result.push(tmp);

            continue;
          }
        }

        self.$raise($scope.NoMethodError, "" + ($scope.Opal.$inspect(item)) + " doesn't respond to #to_str, #to_ary or #to_s");
      }

      if (sep === nil) {
        return result.join('');
      }
      else {
        return result.join($scope.Opal['$coerce_to!'](sep, $scope.String, "to_str").$to_s());
      }
    ;
    };

    def.$keep_if = TMP_11 = function() {
      var self = this, $iter = TMP_11._p, block = $iter || nil;

      TMP_11._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("keep_if")
      };
      
      for (var i = 0, length = self.length, value; i < length; i++) {
        if ((value = block(self[i])) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          self.splice(i, 1);

          length--;
          i--;
        }
      }
    
      return self;
    };

    def.$last = function(count) {
      var self = this;

      
      if (count == null) {
        return self.length === 0 ? nil : self[self.length - 1];
      }

      count = $scope.Opal.$coerce_to(count, $scope.Integer, "to_int");

      if (count < 0) {
        self.$raise($scope.ArgumentError, "negative array size");
      }

      if (count > self.length) {
        count = self.length;
      }

      return self.slice(self.length - count, self.length);
    
    };

    def.$length = function() {
      var self = this;

      return self.length;
    };

    $opal.defn(self, '$map', def.$collect);

    $opal.defn(self, '$map!', def['$collect!']);

    def.$pop = function(count) {
      var $a, self = this;

      if ((($a = count === undefined) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
          return nil};
        return self.pop();};
      count = $scope.Opal.$coerce_to(count, $scope.Integer, "to_int");
      if ((($a = count < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "negative array size")};
      if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      if ((($a = count > self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self.splice(0, self.length);
        } else {
        return self.splice(self.length - count, self.length);
      };
    };

    def.$push = function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      
      for (var i = 0, length = objects.length; i < length; i++) {
        self.push(objects[i]);
      }
    
      return self;
    };

    def.$rassoc = function(object) {
      var self = this;

      
      for (var i = 0, length = self.length, item; i < length; i++) {
        item = self[i];

        if (item.length && item[1] !== undefined) {
          if ((item[1])['$=='](object)) {
            return item;
          }
        }
      }

      return nil;
    
    };

    def.$reject = TMP_12 = function() {
      var self = this, $iter = TMP_12._p, block = $iter || nil;

      TMP_12._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reject")
      };
      
      var result = [];

      for (var i = 0, length = self.length, value; i < length; i++) {
        if ((value = block(self[i])) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          result.push(self[i]);
        }
      }
      return result;
    
    };

    def['$reject!'] = TMP_13 = function() {
      var $a, $b, self = this, $iter = TMP_13._p, block = $iter || nil, original = nil;

      TMP_13._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reject!")
      };
      original = self.$length();
      ($a = ($b = self).$delete_if, $a._p = block.$to_proc(), $a).call($b);
      if (self.$length()['$=='](original)) {
        return nil
        } else {
        return self
      };
    };

    def.$replace = function(other) {
      var $a, self = this;

      if ((($a = $scope.Array['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_a()
        } else {
        other = $scope.Opal.$coerce_to(other, $scope.Array, "to_ary").$to_a()
      };
      
      self.splice(0, self.length);
      self.push.apply(self, other);
    
      return self;
    };

    def.$reverse = function() {
      var self = this;

      return self.slice(0).reverse();
    };

    def['$reverse!'] = function() {
      var self = this;

      return self.reverse();
    };

    def.$reverse_each = TMP_14 = function() {
      var $a, $b, self = this, $iter = TMP_14._p, block = $iter || nil;

      TMP_14._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("reverse_each")
      };
      ($a = ($b = self.$reverse()).$each, $a._p = block.$to_proc(), $a).call($b);
      return self;
    };

    def.$rindex = TMP_15 = function(object) {
      var self = this, $iter = TMP_15._p, block = $iter || nil;

      TMP_15._p = null;
      
      if (object != null) {
        for (var i = self.length - 1; i >= 0; i--) {
          if ((self[i])['$=='](object)) {
            return i;
          }
        }
      }
      else if (block !== nil) {
        for (var i = self.length - 1, value; i >= 0; i--) {
          if ((value = block(self[i])) === $breaker) {
            return $breaker.$v;
          }

          if (value !== false && value !== nil) {
            return i;
          }
        }
      }
      else if (object == null) {
        return self.$enum_for("rindex");
      }

      return nil;
    
    };

    def.$sample = function(n) {
      var $a, $b, TMP_16, self = this;

      if (n == null) {
        n = nil
      }
      if ((($a = ($b = n['$!'](), $b !== false && $b !== nil ?self['$empty?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return nil};
      if ((($a = (($b = n !== false && n !== nil) ? self['$empty?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      if (n !== false && n !== nil) {
        return ($a = ($b = ($range(1, n, false))).$map, $a._p = (TMP_16 = function(){var self = TMP_16._s || this;

        return self['$[]'](self.$rand(self.$length()))}, TMP_16._s = self, TMP_16), $a).call($b)
        } else {
        return self['$[]'](self.$rand(self.$length()))
      };
    };

    def.$select = TMP_17 = function() {
      var self = this, $iter = TMP_17._p, block = $iter || nil;

      TMP_17._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("select")
      };
      
      var result = [];

      for (var i = 0, length = self.length, item, value; i < length; i++) {
        item = self[i];

        if ((value = $opal.$yield1(block, item)) === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          result.push(item);
        }
      }

      return result;
    
    };

    def['$select!'] = TMP_18 = function() {
      var $a, $b, self = this, $iter = TMP_18._p, block = $iter || nil;

      TMP_18._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("select!")
      };
      
      var original = self.length;
      ($a = ($b = self).$keep_if, $a._p = block.$to_proc(), $a).call($b);
      return self.length === original ? nil : self;
    
    };

    def.$shift = function(count) {
      var $a, self = this;

      if ((($a = count === undefined) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
          return nil};
        return self.shift();};
      count = $scope.Opal.$coerce_to(count, $scope.Integer, "to_int");
      if ((($a = count < 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "negative array size")};
      if ((($a = self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      return self.splice(0, count);
    };

    $opal.defn(self, '$size', def.$length);

    def.$shuffle = function() {
      var self = this;

      return self.$clone()['$shuffle!']();
    };

    def['$shuffle!'] = function() {
      var self = this;

      
      for (var i = self.length - 1; i > 0; i--) {
        var tmp = self[i],
            j   = Math.floor(Math.random() * (i + 1));

        self[i] = self[j];
        self[j] = tmp;
      }
    
      return self;
    };

    $opal.defn(self, '$slice', def['$[]']);

    def['$slice!'] = function(index, length) {
      var self = this;

      
      if (index < 0) {
        index += self.length;
      }

      if (length != null) {
        return self.splice(index, length);
      }

      if (index < 0 || index >= self.length) {
        return nil;
      }

      return self.splice(index, 1)[0];
    
    };

    def.$sort = TMP_19 = function() {
      var $a, self = this, $iter = TMP_19._p, block = $iter || nil;

      TMP_19._p = null;
      if ((($a = self.length > 1) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return self
      };
      
      if (!(block !== nil)) {
        block = function(a, b) {
          return (a)['$<=>'](b);
        };
      }

      try {
        return self.slice().sort(function(x, y) {
          var ret = block(x, y);

          if (ret === $breaker) {
            throw $breaker;
          }
          else if (ret === nil) {
            self.$raise($scope.ArgumentError, "comparison of " + ((x).$inspect()) + " with " + ((y).$inspect()) + " failed");
          }

          return (ret)['$>'](0) ? 1 : ((ret)['$<'](0) ? -1 : 0);
        });
      }
      catch (e) {
        if (e === $breaker) {
          return $breaker.$v;
        }
        else {
          throw e;
        }
      }
    ;
    };

    def['$sort!'] = TMP_20 = function() {
      var $a, $b, self = this, $iter = TMP_20._p, block = $iter || nil;

      TMP_20._p = null;
      
      var result;

      if ((block !== nil)) {
        result = ($a = ($b = (self.slice())).$sort, $a._p = block.$to_proc(), $a).call($b);
      }
      else {
        result = (self.slice()).$sort();
      }

      self.length = 0;
      for(var i = 0, length = result.length; i < length; i++) {
        self.push(result[i]);
      }

      return self;
    ;
    };

    def.$take = function(count) {
      var self = this;

      
      if (count < 0) {
        self.$raise($scope.ArgumentError);
      }

      return self.slice(0, count);
    ;
    };

    def.$take_while = TMP_21 = function() {
      var self = this, $iter = TMP_21._p, block = $iter || nil;

      TMP_21._p = null;
      
      var result = [];

      for (var i = 0, length = self.length, item, value; i < length; i++) {
        item = self[i];

        if ((value = block(item)) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          return result;
        }

        result.push(item);
      }

      return result;
    
    };

    def.$to_a = function() {
      var self = this;

      return self;
    };

    $opal.defn(self, '$to_ary', def.$to_a);

    $opal.defn(self, '$to_s', def.$inspect);

    def.$transpose = function() {
      var $a, $b, TMP_22, self = this, result = nil, max = nil;

      if ((($a = self['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return []};
      result = [];
      max = nil;
      ($a = ($b = self).$each, $a._p = (TMP_22 = function(row){var self = TMP_22._s || this, $a, $b, TMP_23;
if (row == null) row = nil;
      if ((($a = $scope.Array['$==='](row)) !== nil && (!$a._isBoolean || $a == true))) {
          row = row.$to_a()
          } else {
          row = $scope.Opal.$coerce_to(row, $scope.Array, "to_ary").$to_a()
        };
        ((($a = max) !== false && $a !== nil) ? $a : max = row.length);
        if ((($a = (row.length)['$=='](max)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise($scope.IndexError, "element size differs (" + (row.length) + " should be " + (max))};
        return ($a = ($b = (row.length)).$times, $a._p = (TMP_23 = function(i){var self = TMP_23._s || this, $a, $b, $c, entry = nil;
if (i == null) i = nil;
        entry = (($a = i, $b = result, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, []))));
          return entry['$<<'](row.$at(i));}, TMP_23._s = self, TMP_23), $a).call($b);}, TMP_22._s = self, TMP_22), $a).call($b);
      return result;
    };

    def.$uniq = function() {
      var self = this;

      
      var result = [],
          seen   = {};

      for (var i = 0, length = self.length, item, hash; i < length; i++) {
        item = self[i];
        hash = item;

        if (!seen[hash]) {
          seen[hash] = true;

          result.push(item);
        }
      }

      return result;
    
    };

    def['$uniq!'] = function() {
      var self = this;

      
      var original = self.length,
          seen     = {};

      for (var i = 0, length = original, item, hash; i < length; i++) {
        item = self[i];
        hash = item;

        if (!seen[hash]) {
          seen[hash] = true;
        }
        else {
          self.splice(i, 1);

          length--;
          i--;
        }
      }

      return self.length === original ? nil : self;
    
    };

    def.$unshift = function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      
      for (var i = objects.length - 1; i >= 0; i--) {
        self.unshift(objects[i]);
      }
    
      return self;
    };

    return (def.$zip = TMP_24 = function(others) {
      var self = this, $iter = TMP_24._p, block = $iter || nil;

      others = $slice.call(arguments, 0);
      TMP_24._p = null;
      
      var result = [], size = self.length, part, o;

      for (var i = 0; i < size; i++) {
        part = [self[i]];

        for (var j = 0, jj = others.length; j < jj; j++) {
          o = others[j][i];

          if (o == null) {
            o = nil;
          }

          part[j + 1] = o;
        }

        result[i] = part;
      }

      if (block !== nil) {
        for (var i = 0; i < size; i++) {
          block(result[i]);
        }

        return nil;
      }

      return result;
    
    }, nil) && 'zip';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/array.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$new', '$allocate', '$initialize', '$to_proc', '$__send__', '$clone', '$respond_to?', '$==', '$eql?', '$inspect', '$*', '$class', '$slice', '$uniq', '$flatten']);
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self._proto, $scope = self._scope;

    return ($opal.defs(self, '$inherited', function(klass) {
      var self = this, replace = nil;

      replace = $scope.Class.$new(($scope.Array)._scope.Wrapper);
      
      klass._proto        = replace._proto;
      klass._proto._klass = klass;
      klass._alloc        = replace._alloc;
      klass.__parent      = ($scope.Array)._scope.Wrapper;

      klass.$allocate = replace.$allocate;
      klass.$new      = replace.$new;
      klass["$[]"]    = replace["$[]"];
    
    }), nil) && 'inherited'
  })(self, null);
  return (function($base, $super) {
    function $Wrapper(){};
    var self = $Wrapper = $klass($base, $super, 'Wrapper', $Wrapper);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5;

    def.literal = nil;
    $opal.defs(self, '$allocate', TMP_1 = function(array) {
      var self = this, $iter = TMP_1._p, $yield = $iter || nil, obj = nil;

      if (array == null) {
        array = []
      }
      TMP_1._p = null;
      obj = $opal.find_super_dispatcher(self, 'allocate', TMP_1, null, $Wrapper).apply(self, []);
      obj.literal = array;
      return obj;
    });

    $opal.defs(self, '$new', TMP_2 = function(args) {
      var $a, $b, self = this, $iter = TMP_2._p, block = $iter || nil, obj = nil;

      args = $slice.call(arguments, 0);
      TMP_2._p = null;
      obj = self.$allocate();
      ($a = ($b = obj).$initialize, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
      return obj;
    });

    $opal.defs(self, '$[]', function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      return self.$allocate(objects);
    });

    def.$initialize = TMP_3 = function(args) {
      var $a, $b, self = this, $iter = TMP_3._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_3._p = null;
      return self.literal = ($a = ($b = $scope.Array).$new, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
    };

    def.$method_missing = TMP_4 = function(args) {
      var $a, $b, self = this, $iter = TMP_4._p, block = $iter || nil, result = nil;

      args = $slice.call(arguments, 0);
      TMP_4._p = null;
      result = ($a = ($b = self.literal).$__send__, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
      if ((($a = result === self.literal) !== nil && (!$a._isBoolean || $a == true))) {
        return self
        } else {
        return result
      };
    };

    def.$initialize_copy = function(other) {
      var self = this;

      return self.literal = (other.literal).$clone();
    };

    def['$respond_to?'] = TMP_5 = function(name) {var $zuper = $slice.call(arguments, 0);
      var $a, self = this, $iter = TMP_5._p, $yield = $iter || nil;

      TMP_5._p = null;
      return ((($a = $opal.find_super_dispatcher(self, 'respond_to?', TMP_5, $iter).apply(self, $zuper)) !== false && $a !== nil) ? $a : self.literal['$respond_to?'](name));
    };

    def['$=='] = function(other) {
      var self = this;

      return self.literal['$=='](other);
    };

    def['$eql?'] = function(other) {
      var self = this;

      return self.literal['$eql?'](other);
    };

    def.$to_a = function() {
      var self = this;

      return self.literal;
    };

    def.$to_ary = function() {
      var self = this;

      return self;
    };

    def.$inspect = function() {
      var self = this;

      return self.literal.$inspect();
    };

    def['$*'] = function(other) {
      var self = this;

      
      var result = self.literal['$*'](other);

      if (result._isArray) {
        return self.$class().$allocate(result)
      }
      else {
        return result;
      }
    ;
    };

    def['$[]'] = function(index, length) {
      var self = this;

      
      var result = self.literal.$slice(index, length);

      if (result._isArray && (index._isRange || length !== undefined)) {
        return self.$class().$allocate(result)
      }
      else {
        return result;
      }
    ;
    };

    $opal.defn(self, '$slice', def['$[]']);

    def.$uniq = function() {
      var self = this;

      return self.$class().$allocate(self.literal.$uniq());
    };

    return (def.$flatten = function(level) {
      var self = this;

      return self.$class().$allocate(self.literal.$flatten(level));
    }, nil) && 'flatten';
  })($scope.Array, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/array/inheritance.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$!', '$==', '$call', '$coerce_to!', '$lambda?', '$abs', '$arity', '$raise', '$enum_for', '$flatten', '$inspect', '$===', '$alias_method', '$clone']);
  ;
  return (function($base, $super) {
    function $Hash(){};
    var self = $Hash = $klass($base, $super, 'Hash', $Hash);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7, TMP_8, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13;

    def.proc = def.none = nil;
    self.$include($scope.Enumerable);

    $opal.defs(self, '$[]', function(objs) {
      var self = this;

      objs = $slice.call(arguments, 0);
      return $opal.hash.apply(null, objs);
    });

    $opal.defs(self, '$allocate', function() {
      var self = this;

      
      var hash = new self._alloc;

      hash.map  = {};
      hash.keys = [];
      hash.none = nil;
      hash.proc = nil;

      return hash;
    
    });

    def.$initialize = TMP_1 = function(defaults) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      
      self.none = (defaults === undefined ? nil : defaults);
      self.proc = block;
    
      return self;
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (self === other) {
        return true;
      }

      if (!other.map || !other.keys) {
        return false;
      }

      if (self.keys.length !== other.keys.length) {
        return false;
      }

      var map  = self.map,
          map2 = other.map;

      for (var i = 0, length = self.keys.length; i < length; i++) {
        var key = self.keys[i], obj = map[key], obj2 = map2[key];
        if (obj2 === undefined || (obj)['$=='](obj2)['$!']()) {
          return false;
        }
      }

      return true;
    
    };

    def['$[]'] = function(key) {
      var self = this;

      
      var map = self.map;

      if ($opal.hasOwnProperty.call(map, key)) {
        return map[key];
      }

      var proc = self.proc;

      if (proc !== nil) {
        return (proc).$call(self, key);
      }

      return self.none;
    
    };

    def['$[]='] = function(key, value) {
      var self = this;

      
      var map = self.map;

      if (!$opal.hasOwnProperty.call(map, key)) {
        self.keys.push(key);
      }

      map[key] = value;

      return value;
    
    };

    def.$assoc = function(object) {
      var self = this;

      
      var keys = self.keys, key;

      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];

        if ((key)['$=='](object)) {
          return [key, self.map[key]];
        }
      }

      return nil;
    
    };

    def.$clear = function() {
      var self = this;

      
      self.map = {};
      self.keys = [];
      return self;
    
    };

    def.$clone = function() {
      var self = this;

      
      var map  = {},
          keys = [];

      for (var i = 0, length = self.keys.length; i < length; i++) {
        var key   = self.keys[i],
            value = self.map[key];

        keys.push(key);
        map[key] = value;
      }

      var hash = new self._klass._alloc();

      hash.map  = map;
      hash.keys = keys;
      hash.none = self.none;
      hash.proc = self.proc;

      return hash;
    
    };

    def.$default = function(val) {
      var self = this;

      
      if (val !== undefined && self.proc !== nil) {
        return self.proc.$call(self, val);
      }
      return self.none;
    ;
    };

    def['$default='] = function(object) {
      var self = this;

      
      self.proc = nil;
      return (self.none = object);
    
    };

    def.$default_proc = function() {
      var self = this;

      return self.proc;
    };

    def['$default_proc='] = function(proc) {
      var self = this;

      
      if (proc !== nil) {
        proc = $scope.Opal['$coerce_to!'](proc, $scope.Proc, "to_proc");

        if (proc['$lambda?']() && proc.$arity().$abs() != 2) {
          self.$raise($scope.TypeError, "default_proc takes two arguments");
        }
      }
      self.none = nil;
      return (self.proc = proc);
    ;
    };

    def.$delete = TMP_2 = function(key) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      
      var map  = self.map, result = map[key];

      if (result != null) {
        delete map[key];
        self.keys.$delete(key);

        return result;
      }

      if (block !== nil) {
        return block.$call(key);
      }
      return nil;
    
    };

    def.$delete_if = TMP_3 = function() {
      var self = this, $iter = TMP_3._p, block = $iter || nil;

      TMP_3._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("delete_if")
      };
      
      var map = self.map, keys = self.keys, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          keys.splice(i, 1);
          delete map[key];

          length--;
          i--;
        }
      }

      return self;
    
    };

    $opal.defn(self, '$dup', def.$clone);

    def.$each = TMP_4 = function() {
      var self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each")
      };
      
      var map  = self.map,
          keys = self.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key   = keys[i],
            value = $opal.$yield1(block, [key, map[key]]);

        if (value === $breaker) {
          return $breaker.$v;
        }
      }

      return self;
    
    };

    def.$each_key = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each_key")
      };
      
      var keys = self.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        if (block(key) === $breaker) {
          return $breaker.$v;
        }
      }

      return self;
    
    };

    $opal.defn(self, '$each_pair', def.$each);

    def.$each_value = TMP_6 = function() {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("each_value")
      };
      
      var map = self.map, keys = self.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        if (block(map[keys[i]]) === $breaker) {
          return $breaker.$v;
        }
      }

      return self;
    
    };

    def['$empty?'] = function() {
      var self = this;

      return self.keys.length === 0;
    };

    $opal.defn(self, '$eql?', def['$==']);

    def.$fetch = TMP_7 = function(key, defaults) {
      var self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      
      var value = self.map[key];

      if (value != null) {
        return value;
      }

      if (block !== nil) {
        var value;

        if ((value = block(key)) === $breaker) {
          return $breaker.$v;
        }

        return value;
      }

      if (defaults != null) {
        return defaults;
      }

      self.$raise($scope.KeyError, "key not found");
    
    };

    def.$flatten = function(level) {
      var self = this;

      
      var map = self.map, keys = self.keys, result = [];

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], value = map[key];

        result.push(key);

        if (value._isArray) {
          if (level == null || level === 1) {
            result.push(value);
          }
          else {
            result = result.concat((value).$flatten(level - 1));
          }
        }
        else {
          result.push(value);
        }
      }

      return result;
    
    };

    def['$has_key?'] = function(key) {
      var self = this;

      return $opal.hasOwnProperty.call(self.map, key);
    };

    def['$has_value?'] = function(value) {
      var self = this;

      
      for (var assoc in self.map) {
        if ((self.map[assoc])['$=='](value)) {
          return true;
        }
      }

      return false;
    ;
    };

    def.$hash = function() {
      var self = this;

      return self._id;
    };

    $opal.defn(self, '$include?', def['$has_key?']);

    def.$index = function(object) {
      var self = this;

      
      var map = self.map, keys = self.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        if ((map[key])['$=='](object)) {
          return key;
        }
      }

      return nil;
    
    };

    def.$indexes = function(keys) {
      var self = this;

      keys = $slice.call(arguments, 0);
      
      var result = [], map = self.map, val;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], val = map[key];

        if (val != null) {
          result.push(val);
        }
        else {
          result.push(self.none);
        }
      }

      return result;
    
    };

    $opal.defn(self, '$indices', def.$indexes);

    def.$inspect = function() {
      var self = this;

      
      var inspect = [], keys = self.keys, map = self.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], val = map[key];

        if (val === self) {
          inspect.push((key).$inspect() + '=>' + '{...}');
        } else {
          inspect.push((key).$inspect() + '=>' + (map[key]).$inspect());
        }
      }

      return '{' + inspect.join(', ') + '}';
    ;
    };

    def.$invert = function() {
      var self = this;

      
      var result = $opal.hash(), keys = self.keys, map = self.map,
          keys2 = result.keys, map2 = result.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        keys2.push(obj);
        map2[obj] = key;
      }

      return result;
    
    };

    def.$keep_if = TMP_8 = function() {
      var self = this, $iter = TMP_8._p, block = $iter || nil;

      TMP_8._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("keep_if")
      };
      
      var map = self.map, keys = self.keys, value;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          keys.splice(i, 1);
          delete map[key];

          length--;
          i--;
        }
      }

      return self;
    
    };

    $opal.defn(self, '$key', def.$index);

    $opal.defn(self, '$key?', def['$has_key?']);

    def.$keys = function() {
      var self = this;

      return self.keys.slice(0);
    };

    def.$length = function() {
      var self = this;

      return self.keys.length;
    };

    $opal.defn(self, '$member?', def['$has_key?']);

    def.$merge = TMP_9 = function(other) {
      var self = this, $iter = TMP_9._p, block = $iter || nil;

      TMP_9._p = null;
      
      if (! $scope.Hash['$==='](other)) {
        other = $scope.Opal['$coerce_to!'](other, $scope.Hash, "to_hash");
      }

      var keys = self.keys, map = self.map,
          result = $opal.hash(), keys2 = result.keys, map2 = result.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];

        keys2.push(key);
        map2[key] = map[key];
      }

      var keys = other.keys, map = other.map;

      if (block === nil) {
        for (var i = 0, length = keys.length; i < length; i++) {
          var key = keys[i];

          if (map2[key] == null) {
            keys2.push(key);
          }

          map2[key] = map[key];
        }
      }
      else {
        for (var i = 0, length = keys.length; i < length; i++) {
          var key = keys[i];

          if (map2[key] == null) {
            keys2.push(key);
            map2[key] = map[key];
          }
          else {
            map2[key] = block(key, map2[key], map[key]);
          }
        }
      }

      return result;
    ;
    };

    def['$merge!'] = TMP_10 = function(other) {
      var self = this, $iter = TMP_10._p, block = $iter || nil;

      TMP_10._p = null;
      
      if (! $scope.Hash['$==='](other)) {
        other = $scope.Opal['$coerce_to!'](other, $scope.Hash, "to_hash");
      }

      var keys = self.keys, map = self.map,
          keys2 = other.keys, map2 = other.map;

      if (block === nil) {
        for (var i = 0, length = keys2.length; i < length; i++) {
          var key = keys2[i];

          if (map[key] == null) {
            keys.push(key);
          }

          map[key] = map2[key];
        }
      }
      else {
        for (var i = 0, length = keys2.length; i < length; i++) {
          var key = keys2[i];

          if (map[key] == null) {
            keys.push(key);
            map[key] = map2[key];
          }
          else {
            map[key] = block(key, map[key], map2[key]);
          }
        }
      }

      return self;
    ;
    };

    def.$rassoc = function(object) {
      var self = this;

      
      var keys = self.keys, map = self.map;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((obj)['$=='](object)) {
          return [key, obj];
        }
      }

      return nil;
    
    };

    def.$reject = TMP_11 = function() {
      var self = this, $iter = TMP_11._p, block = $iter || nil;

      TMP_11._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("reject")
      };
      
      var keys = self.keys, map = self.map,
          result = $opal.hash(), map2 = result.map, keys2 = result.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key], value;

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          keys2.push(key);
          map2[key] = obj;
        }
      }

      return result;
    
    };

    def.$replace = function(other) {
      var self = this;

      
      var map = self.map = {}, keys = self.keys = [];

      for (var i = 0, length = other.keys.length; i < length; i++) {
        var key = other.keys[i];
        keys.push(key);
        map[key] = other.map[key];
      }

      return self;
    
    };

    def.$select = TMP_12 = function() {
      var self = this, $iter = TMP_12._p, block = $iter || nil;

      TMP_12._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("select")
      };
      
      var keys = self.keys, map = self.map,
          result = $opal.hash(), map2 = result.map, keys2 = result.keys;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key], value;

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value !== false && value !== nil) {
          keys2.push(key);
          map2[key] = obj;
        }
      }

      return result;
    
    };

    def['$select!'] = TMP_13 = function() {
      var self = this, $iter = TMP_13._p, block = $iter || nil;

      TMP_13._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("select!")
      };
      
      var map = self.map, keys = self.keys, value, result = nil;

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i], obj = map[key];

        if ((value = block(key, obj)) === $breaker) {
          return $breaker.$v;
        }

        if (value === false || value === nil) {
          keys.splice(i, 1);
          delete map[key];

          length--;
          i--;
          result = self
        }
      }

      return result;
    
    };

    def.$shift = function() {
      var self = this;

      
      var keys = self.keys, map = self.map;

      if (keys.length) {
        var key = keys[0], obj = map[key];

        delete map[key];
        keys.splice(0, 1);

        return [key, obj];
      }

      return nil;
    
    };

    $opal.defn(self, '$size', def.$length);

    self.$alias_method("store", "[]=");

    def.$to_a = function() {
      var self = this;

      
      var keys = self.keys, map = self.map, result = [];

      for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];
        result.push([key, map[key]]);
      }

      return result;
    
    };

    def.$to_h = function() {
      var self = this;

      
      var hash   = new Opal.Hash._alloc,
          cloned = self.$clone();

      hash.map  = cloned.map;
      hash.keys = cloned.keys;
      hash.none = cloned.none;
      hash.proc = cloned.proc;

      return hash;
    ;
    };

    def.$to_hash = function() {
      var self = this;

      return self;
    };

    $opal.defn(self, '$to_s', def.$inspect);

    $opal.defn(self, '$update', def['$merge!']);

    $opal.defn(self, '$value?', def['$has_value?']);

    $opal.defn(self, '$values_at', def.$indexes);

    return (def.$values = function() {
      var self = this;

      
      var map    = self.map,
          result = [];

      for (var key in map) {
        result.push(map[key]);
      }

      return result;
    
    }, nil) && 'values';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/hash.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars;

  $opal.add_stubs(['$include', '$to_str', '$===', '$format', '$coerce_to', '$to_s', '$respond_to?', '$<=>', '$raise', '$=~', '$empty?', '$ljust', '$ceil', '$/', '$+', '$rjust', '$floor', '$to_a', '$each_char', '$to_proc', '$coerce_to!', '$initialize_clone', '$initialize_dup', '$enum_for', '$split', '$chomp', '$escape', '$class', '$to_i', '$name', '$!', '$each_line', '$match', '$new', '$try_convert', '$chars', '$&', '$join', '$is_a?', '$[]', '$str', '$value', '$proc', '$send']);
  ;
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7;

    def.length = nil;
    self.$include($scope.Comparable);

    def._isString = true;

    $opal.defs(self, '$try_convert', function(what) {
      var self = this;

      try {
      return what.$to_str()
      } catch ($err) {if (true) {
        return nil
        }else { throw $err; }
      };
    });

    $opal.defs(self, '$new', function(str) {
      var self = this;

      if (str == null) {
        str = ""
      }
      return new String(str);
    });

    def['$%'] = function(data) {
      var $a, self = this;

      if ((($a = $scope.Array['$==='](data)) !== nil && (!$a._isBoolean || $a == true))) {
        return ($a = self).$format.apply($a, [self].concat(data))
        } else {
        return self.$format(self, data)
      };
    };

    def['$*'] = function(count) {
      var self = this;

      
      if (count < 1) {
        return '';
      }

      var result  = '',
          pattern = self;

      while (count > 0) {
        if (count & 1) {
          result += pattern;
        }

        count >>= 1;
        pattern += pattern;
      }

      return result;
    
    };

    def['$+'] = function(other) {
      var self = this;

      other = $scope.Opal.$coerce_to(other, $scope.String, "to_str");
      return self + other.$to_s();
    };

    def['$<=>'] = function(other) {
      var $a, self = this;

      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_str().$to_s();
        return self > other ? 1 : (self < other ? -1 : 0);
        } else {
        
        var cmp = other['$<=>'](self);

        if (cmp === nil) {
          return nil;
        }
        else {
          return cmp > 0 ? -1 : (cmp < 0 ? 1 : 0);
        }
      ;
      };
    };

    def['$=='] = function(other) {
      var $a, self = this;

      if ((($a = $scope.String['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      return self.$to_s() == other.$to_s();
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$===', def['$==']);

    def['$=~'] = function(other) {
      var self = this;

      
      if (other._isString) {
        self.$raise($scope.TypeError, "type mismatch: String given");
      }

      return other['$=~'](self);
    ;
    };

    def['$[]'] = function(index, length) {
      var self = this;

      
      var size = self.length;

      if (index._isRange) {
        var exclude = index.exclude,
            length  = index.end,
            index   = index.begin;

        if (index < 0) {
          index += size;
        }

        if (length < 0) {
          length += size;
        }

        if (!exclude) {
          length += 1;
        }

        if (index > size) {
          return nil;
        }

        length = length - index;

        if (length < 0) {
          length = 0;
        }

        return self.substr(index, length);
      }

      if (index < 0) {
        index += self.length;
      }

      if (length == null) {
        if (index >= self.length || index < 0) {
          return nil;
        }

        return self.substr(index, 1);
      }

      if (index > self.length || index < 0) {
        return nil;
      }

      return self.substr(index, length);
    
    };

    def.$capitalize = function() {
      var self = this;

      return self.charAt(0).toUpperCase() + self.substr(1).toLowerCase();
    };

    def.$casecmp = function(other) {
      var self = this;

      other = $scope.Opal.$coerce_to(other, $scope.String, "to_str").$to_s();
      return (self.toLowerCase())['$<=>'](other.toLowerCase());
    };

    def.$center = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = $scope.Opal.$coerce_to(width, $scope.Integer, "to_int");
      padstr = $scope.Opal.$coerce_to(padstr, $scope.String, "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      
      var ljustified = self.$ljust((width['$+'](self.length))['$/'](2).$ceil(), padstr),
          rjustified = self.$rjust((width['$+'](self.length))['$/'](2).$floor(), padstr);

      return rjustified + ljustified.slice(self.length);
    ;
    };

    def.$chars = TMP_1 = function() {
      var $a, $b, self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$each_char().$to_a()
      };
      return ($a = ($b = self).$each_char, $a._p = block.$to_proc(), $a).call($b);
    };

    def.$chomp = function(separator) {
      var $a, self = this;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      if ((($a = separator === nil || self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      separator = $scope.Opal['$coerce_to!'](separator, $scope.String, "to_str").$to_s();
      
      if (separator === "\n") {
        return self.replace(/\r?\n?$/, '');
      }
      else if (separator === "") {
        return self.replace(/(\r?\n)+$/, '');
      }
      else if (self.length > separator.length) {
        var tail = self.substr(self.length - separator.length, separator.length);

        if (tail === separator) {
          return self.substr(0, self.length - separator.length);
        }
      }
    
      return self;
    };

    def.$chop = function() {
      var self = this;

      
      var length = self.length;

      if (length <= 1) {
        return "";
      }

      if (self.charAt(length - 1) === "\n" && self.charAt(length - 2) === "\r") {
        return self.substr(0, length - 2);
      }
      else {
        return self.substr(0, length - 1);
      }
    
    };

    def.$chr = function() {
      var self = this;

      return self.charAt(0);
    };

    def.$clone = function() {
      var self = this, copy = nil;

      copy = self.slice();
      copy.$initialize_clone(self);
      return copy;
    };

    def.$dup = function() {
      var self = this, copy = nil;

      copy = self.slice();
      copy.$initialize_dup(self);
      return copy;
    };

    def.$count = function(str) {
      var self = this;

      return (self.length - self.replace(new RegExp(str, 'g'), '').length) / str.length;
    };

    $opal.defn(self, '$dup', def.$clone);

    def.$downcase = function() {
      var self = this;

      return self.toLowerCase();
    };

    def.$each_char = TMP_2 = function() {
      var $a, self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_char")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        ((($a = $opal.$yield1(block, self.charAt(i))) === $breaker) ? $breaker.$v : $a);
      }
    
      return self;
    };

    def.$each_line = TMP_3 = function(separator) {
      var $a, self = this, $iter = TMP_3._p, $yield = $iter || nil;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      TMP_3._p = null;
      if (($yield !== nil)) {
        } else {
        return self.$split(separator)
      };
      
      var chomped  = self.$chomp(),
          trailing = self.length != chomped.length,
          splitted = chomped.split(separator);

      for (var i = 0, length = splitted.length; i < length; i++) {
        if (i < length - 1 || trailing) {
          ((($a = $opal.$yield1($yield, splitted[i] + separator)) === $breaker) ? $breaker.$v : $a);
        }
        else {
          ((($a = $opal.$yield1($yield, splitted[i])) === $breaker) ? $breaker.$v : $a);
        }
      }
    ;
      return self;
    };

    def['$empty?'] = function() {
      var self = this;

      return self.length === 0;
    };

    def['$end_with?'] = function(suffixes) {
      var self = this;

      suffixes = $slice.call(arguments, 0);
      
      for (var i = 0, length = suffixes.length; i < length; i++) {
        var suffix = $scope.Opal.$coerce_to(suffixes[i], $scope.String, "to_str").$to_s();

        if (self.length >= suffix.length &&
            self.substr(self.length - suffix.length, suffix.length) == suffix) {
          return true;
        }
      }
    
      return false;
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$equal?', def['$===']);

    def.$gsub = TMP_4 = function(pattern, replace) {
      var $a, $b, self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if ((($a = ((($b = $scope.String['$==='](pattern)) !== false && $b !== nil) ? $b : pattern['$respond_to?']("to_str"))) !== nil && (!$a._isBoolean || $a == true))) {
        pattern = (new RegExp("" + $scope.Regexp.$escape(pattern.$to_str())))};
      if ((($a = $scope.Regexp['$==='](pattern)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.TypeError, "wrong argument type " + (pattern.$class()) + " (expected Regexp)")
      };
      
      var pattern = pattern.toString(),
          options = pattern.substr(pattern.lastIndexOf('/') + 1) + 'g',
          regexp  = pattern.substr(1, pattern.lastIndexOf('/') - 1);

      self.$sub._p = block;
      return self.$sub(new RegExp(regexp, options), replace);
    
    };

    def.$hash = function() {
      var self = this;

      return self.toString();
    };

    def.$hex = function() {
      var self = this;

      return self.$to_i(16);
    };

    def['$include?'] = function(other) {
      var $a, self = this;

      
      if (other._isString) {
        return self.indexOf(other) !== -1;
      }
    
      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.TypeError, "no implicit conversion of " + (other.$class().$name()) + " into String")
      };
      return self.indexOf(other.$to_str()) !== -1;
    };

    def.$index = function(what, offset) {
      var $a, self = this, result = nil;

      if (offset == null) {
        offset = nil
      }
      if ((($a = $scope.String['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
        what = what.$to_s()
      } else if ((($a = what['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        what = what.$to_str().$to_s()
      } else if ((($a = $scope.Regexp['$==='](what)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.TypeError, "type mismatch: " + (what.$class()) + " given")};
      result = -1;
      if (offset !== false && offset !== nil) {
        offset = $scope.Opal.$coerce_to(offset, $scope.Integer, "to_int");
        
        var size = self.length;

        if (offset < 0) {
          offset = offset + size;
        }

        if (offset > size) {
          return nil;
        }
      
        if ((($a = $scope.Regexp['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
          result = ((($a = (what['$=~'](self.substr(offset)))) !== false && $a !== nil) ? $a : -1)
          } else {
          result = self.substr(offset).indexOf(what)
        };
        
        if (result !== -1) {
          result += offset;
        }
      
      } else if ((($a = $scope.Regexp['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
        result = ((($a = (what['$=~'](self))) !== false && $a !== nil) ? $a : -1)
        } else {
        result = self.indexOf(what)
      };
      if ((($a = result === -1) !== nil && (!$a._isBoolean || $a == true))) {
        return nil
        } else {
        return result
      };
    };

    def.$inspect = function() {
      var self = this;

      
      var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          meta      = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
          };

      escapable.lastIndex = 0;

      return escapable.test(self) ? '"' + self.replace(escapable, function(a) {
        var c = meta[a];

        return typeof c === 'string' ? c :
          '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + self + '"';
    
    };

    def.$intern = function() {
      var self = this;

      return self;
    };

    def.$lines = function(separator) {
      var self = this;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      return self.$each_line(separator).$to_a();
    };

    def.$length = function() {
      var self = this;

      return self.length;
    };

    def.$ljust = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = $scope.Opal.$coerce_to(width, $scope.Integer, "to_int");
      padstr = $scope.Opal.$coerce_to(padstr, $scope.String, "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      
      var index  = -1,
          result = "";

      width -= self.length;

      while (++index < width) {
        result += padstr;
      }

      return self + result.slice(0, width);
    
    };

    def.$lstrip = function() {
      var self = this;

      return self.replace(/^\s*/, '');
    };

    def.$match = TMP_5 = function(pattern, pos) {
      var $a, $b, self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if ((($a = ((($b = $scope.String['$==='](pattern)) !== false && $b !== nil) ? $b : pattern['$respond_to?']("to_str"))) !== nil && (!$a._isBoolean || $a == true))) {
        pattern = (new RegExp("" + $scope.Regexp.$escape(pattern.$to_str())))};
      if ((($a = $scope.Regexp['$==='](pattern)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.TypeError, "wrong argument type " + (pattern.$class()) + " (expected Regexp)")
      };
      return ($a = ($b = pattern).$match, $a._p = block.$to_proc(), $a).call($b, self, pos);
    };

    def.$next = function() {
      var self = this;

      
      if (self.length === 0) {
        return "";
      }

      var initial = self.substr(0, self.length - 1);
      var last    = String.fromCharCode(self.charCodeAt(self.length - 1) + 1);

      return initial + last;
    
    };

    def.$ord = function() {
      var self = this;

      return self.charCodeAt(0);
    };

    def.$partition = function(str) {
      var self = this;

      
      var result = self.split(str);
      var splitter = (result[0].length === self.length ? "" : str);

      return [result[0], splitter, result.slice(1).join(str.toString())];
    
    };

    def.$reverse = function() {
      var self = this;

      return self.split('').reverse().join('');
    };

    def.$rindex = function(search, offset) {
      var self = this;

      
      var search_type = (search == null ? Opal.NilClass : search.constructor);
      if (search_type != String && search_type != RegExp) {
        var msg = "type mismatch: " + search_type + " given";
        self.$raise($scope.TypeError.$new(msg));
      }

      if (self.length == 0) {
        return search.length == 0 ? 0 : nil;
      }

      var result = -1;
      if (offset != null) {
        if (offset < 0) {
          offset = self.length + offset;
        }

        if (search_type == String) {
          result = self.lastIndexOf(search, offset);
        }
        else {
          result = self.substr(0, offset + 1).$reverse().search(search);
          if (result !== -1) {
            result = offset - result;
          }
        }
      }
      else {
        if (search_type == String) {
          result = self.lastIndexOf(search);
        }
        else {
          result = self.$reverse().search(search);
          if (result !== -1) {
            result = self.length - 1 - result;
          }
        }
      }

      return result === -1 ? nil : result;
    
    };

    def.$rjust = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = $scope.Opal.$coerce_to(width, $scope.Integer, "to_int");
      padstr = $scope.Opal.$coerce_to(padstr, $scope.String, "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      
      var chars     = Math.floor(width - self.length),
          patterns  = Math.floor(chars / padstr.length),
          result    = Array(patterns + 1).join(padstr),
          remaining = chars - result.length;

      return result + padstr.slice(0, remaining) + self;
    
    };

    def.$rstrip = function() {
      var self = this;

      return self.replace(/\s*$/, '');
    };

    def.$scan = TMP_6 = function(pattern) {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      
      if (pattern.global) {
        // should we clear it afterwards too?
        pattern.lastIndex = 0;
      }
      else {
        // rewrite regular expression to add the global flag to capture pre/post match
        pattern = new RegExp(pattern.source, 'g' + (pattern.multiline ? 'm' : '') + (pattern.ignoreCase ? 'i' : ''));
      }

      var result = [];
      var match;

      while ((match = pattern.exec(self)) != null) {
        var match_data = $scope.MatchData.$new(pattern, match);
        if (block === nil) {
          match.length == 1 ? result.push(match[0]) : result.push(match.slice(1));
        }
        else {
          match.length == 1 ? block(match[0]) : block.apply(self, match.slice(1));
        }
      }

      return (block !== nil ? self : result);
    
    };

    $opal.defn(self, '$size', def.$length);

    $opal.defn(self, '$slice', def['$[]']);

    def.$split = function(pattern, limit) {
      var self = this, $a;
      if ($gvars[";"] == null) $gvars[";"] = nil;

      if (pattern == null) {
        pattern = ((($a = $gvars[";"]) !== false && $a !== nil) ? $a : " ")
      }
      
      if (pattern === nil || pattern === undefined) {
        pattern = $gvars[";"];
      }

      var result = [];
      if (limit !== undefined) {
        limit = $scope.Opal['$coerce_to!'](limit, $scope.Integer, "to_int");
      }

      if (self.length === 0) {
        return [];
      }

      if (limit === 1) {
        return [self];
      }

      if (pattern && pattern._isRegexp) {
        var pattern_str = pattern.toString();

        /* Opal and JS's repr of an empty RE. */
        var blank_pattern = (pattern_str.substr(0, 3) == '/^/') ||
                  (pattern_str.substr(0, 6) == '/(?:)/');

        /* This is our fast path */
        if (limit === undefined || limit === 0) {
          result = self.split(blank_pattern ? /(?:)/ : pattern);
        }
        else {
          /* RegExp.exec only has sane behavior with global flag */
          if (! pattern.global) {
            pattern = eval(pattern_str + 'g');
          }

          var match_data;
          var prev_index = 0;
          pattern.lastIndex = 0;

          while ((match_data = pattern.exec(self)) !== null) {
            var segment = self.slice(prev_index, match_data.index);
            result.push(segment);

            prev_index = pattern.lastIndex;

            if (match_data[0].length === 0) {
              if (blank_pattern) {
                /* explicitly split on JS's empty RE form.*/
                pattern = /(?:)/;
              }

              result = self.split(pattern);
              /* with "unlimited", ruby leaves a trail on blanks. */
              if (limit !== undefined && limit < 0 && blank_pattern) {
                result.push('');
              }

              prev_index = undefined;
              break;
            }

            if (limit !== undefined && limit > 1 && result.length + 1 == limit) {
              break;
            }
          }

          if (prev_index !== undefined) {
            result.push(self.slice(prev_index, self.length));
          }
        }
      }
      else {
        var splitted = 0, start = 0, lim = 0;

        if (pattern === nil || pattern === undefined) {
          pattern = ' '
        } else {
          pattern = $scope.Opal.$try_convert(pattern, $scope.String, "to_str").$to_s();
        }

        var string = (pattern == ' ') ? self.replace(/[\r\n\t\v]\s+/g, ' ')
                                      : self;
        var cursor = -1;
        while ((cursor = string.indexOf(pattern, start)) > -1 && cursor < string.length) {
          if (splitted + 1 === limit) {
            break;
          }

          if (pattern == ' ' && cursor == start) {
            start = cursor + 1;
            continue;
          }

          result.push(string.substr(start, pattern.length ? cursor - start : 1));
          splitted++;

          start = cursor + (pattern.length ? pattern.length : 1);
        }

        if (string.length > 0 && (limit < 0 || string.length > start)) {
          if (string.length == start) {
            result.push('');
          }
          else {
            result.push(string.substr(start, string.length));
          }
        }
      }

      if (limit === undefined || limit === 0) {
        while (result[result.length-1] === '') {
          result.length = result.length - 1;
        }
      }

      if (limit > 0) {
        var tail = result.slice(limit - 1).join('');
        result.splice(limit - 1, result.length - 1, tail);
      }

      return result;
    ;
    };

    def.$squeeze = function(sets) {
      var self = this;

      sets = $slice.call(arguments, 0);
      
      if (sets.length === 0) {
        return self.replace(/(.)\1+/g, '$1');
      }
    
      
      var set = $scope.Opal.$coerce_to(sets[0], $scope.String, "to_str").$chars();

      for (var i = 1, length = sets.length; i < length; i++) {
        set = (set)['$&']($scope.Opal.$coerce_to(sets[i], $scope.String, "to_str").$chars());
      }

      if (set.length === 0) {
        return self;
      }

      return self.replace(new RegExp("([" + $scope.Regexp.$escape((set).$join()) + "])\\1+", "g"), "$1");
    ;
    };

    def['$start_with?'] = function(prefixes) {
      var self = this;

      prefixes = $slice.call(arguments, 0);
      
      for (var i = 0, length = prefixes.length; i < length; i++) {
        var prefix = $scope.Opal.$coerce_to(prefixes[i], $scope.String, "to_str").$to_s();

        if (self.indexOf(prefix) === 0) {
          return true;
        }
      }

      return false;
    
    };

    def.$strip = function() {
      var self = this;

      return self.replace(/^\s*/, '').replace(/\s*$/, '');
    };

    def.$sub = TMP_7 = function(pattern, replace) {
      var self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      
      if (typeof(replace) === 'string') {
        // convert Ruby back reference to JavaScript back reference
        replace = replace.replace(/\\([1-9])/g, '$$$1')
        return self.replace(pattern, replace);
      }
      if (block !== nil) {
        return self.replace(pattern, function() {
          // FIXME: this should be a formal MatchData object with all the goodies
          var match_data = []
          for (var i = 0, len = arguments.length; i < len; i++) {
            var arg = arguments[i];
            if (arg == undefined) {
              match_data.push(nil);
            }
            else {
              match_data.push(arg);
            }
          }

          var str = match_data.pop();
          var offset = match_data.pop();
          var match_len = match_data.length;

          // $1, $2, $3 not being parsed correctly in Ruby code
          //for (var i = 1; i < match_len; i++) {
          //  __gvars[String(i)] = match_data[i];
          //}
          $gvars["&"] = match_data[0];
          $gvars["~"] = match_data;
          return block(match_data[0]);
        });
      }
      else if (replace !== undefined) {
        if (replace['$is_a?']($scope.Hash)) {
          return self.replace(pattern, function(str) {
            var value = replace['$[]'](self.$str());

            return (value == null) ? nil : self.$value().$to_s();
          });
        }
        else {
          replace = $scope.String.$try_convert(replace);

          if (replace == null) {
            self.$raise($scope.TypeError, "can't convert " + (replace.$class()) + " into String");
          }

          return self.replace(pattern, replace);
        }
      }
      else {
        // convert Ruby back reference to JavaScript back reference
        replace = replace.toString().replace(/\\([1-9])/g, '$$$1')
        return self.replace(pattern, replace);
      }
    ;
    };

    $opal.defn(self, '$succ', def.$next);

    def.$sum = function(n) {
      var self = this;

      if (n == null) {
        n = 16
      }
      
      var result = 0;

      for (var i = 0, length = self.length; i < length; i++) {
        result += (self.charCodeAt(i) % ((1 << n) - 1));
      }

      return result;
    
    };

    def.$swapcase = function() {
      var self = this;

      
      var str = self.replace(/([a-z]+)|([A-Z]+)/g, function($0,$1,$2) {
        return $1 ? $0.toUpperCase() : $0.toLowerCase();
      });

      if (self.constructor === String) {
        return str;
      }

      return self.$class().$new(str);
    
    };

    def.$to_f = function() {
      var self = this;

      
      if (self.charAt(0) === '_') {
        return 0;
      }

      var result = parseFloat(self.replace(/_/g, ''));

      if (isNaN(result) || result == Infinity || result == -Infinity) {
        return 0;
      }
      else {
        return result;
      }
    
    };

    def.$to_i = function(base) {
      var self = this;

      if (base == null) {
        base = 10
      }
      
      var result = parseInt(self, base);

      if (isNaN(result)) {
        return 0;
      }

      return result;
    
    };

    def.$to_proc = function() {
      var $a, $b, TMP_8, self = this;

      return ($a = ($b = self).$proc, $a._p = (TMP_8 = function(recv, args){var self = TMP_8._s || this, $a;
if (recv == null) recv = nil;args = $slice.call(arguments, 1);
      return ($a = recv).$send.apply($a, [self].concat(args))}, TMP_8._s = self, TMP_8), $a).call($b);
    };

    def.$to_s = function() {
      var self = this;

      return self.toString();
    };

    $opal.defn(self, '$to_str', def.$to_s);

    $opal.defn(self, '$to_sym', def.$intern);

    def.$tr = function(from, to) {
      var self = this;

      
      if (from.length == 0 || from === to) {
        return self;
      }

      var subs = {};
      var from_chars = from.split('');
      var from_length = from_chars.length;
      var to_chars = to.split('');
      var to_length = to_chars.length;

      var inverse = false;
      var global_sub = null;
      if (from_chars[0] === '^') {
        inverse = true;
        from_chars.shift();
        global_sub = to_chars[to_length - 1]
        from_length -= 1;
      }

      var from_chars_expanded = [];
      var last_from = null;
      var in_range = false;
      for (var i = 0; i < from_length; i++) {
        var ch = from_chars[i];
        if (last_from == null) {
          last_from = ch;
          from_chars_expanded.push(ch);
        }
        else if (ch === '-') {
          if (last_from === '-') {
            from_chars_expanded.push('-');
            from_chars_expanded.push('-');
          }
          else if (i == from_length - 1) {
            from_chars_expanded.push('-');
          }
          else {
            in_range = true;
          }
        }
        else if (in_range) {
          var start = last_from.charCodeAt(0) + 1;
          var end = ch.charCodeAt(0);
          for (var c = start; c < end; c++) {
            from_chars_expanded.push(String.fromCharCode(c));
          }
          from_chars_expanded.push(ch);
          in_range = null;
          last_from = null;
        }
        else {
          from_chars_expanded.push(ch);
        }
      }

      from_chars = from_chars_expanded;
      from_length = from_chars.length;

      if (inverse) {
        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = true;
        }
      }
      else {
        if (to_length > 0) {
          var to_chars_expanded = [];
          var last_to = null;
          var in_range = false;
          for (var i = 0; i < to_length; i++) {
            var ch = to_chars[i];
            if (last_from == null) {
              last_from = ch;
              to_chars_expanded.push(ch);
            }
            else if (ch === '-') {
              if (last_to === '-') {
                to_chars_expanded.push('-');
                to_chars_expanded.push('-');
              }
              else if (i == to_length - 1) {
                to_chars_expanded.push('-');
              }
              else {
                in_range = true;
              }
            }
            else if (in_range) {
              var start = last_from.charCodeAt(0) + 1;
              var end = ch.charCodeAt(0);
              for (var c = start; c < end; c++) {
                to_chars_expanded.push(String.fromCharCode(c));
              }
              to_chars_expanded.push(ch);
              in_range = null;
              last_from = null;
            }
            else {
              to_chars_expanded.push(ch);
            }
          }

          to_chars = to_chars_expanded;
          to_length = to_chars.length;
        }

        var length_diff = from_length - to_length;
        if (length_diff > 0) {
          var pad_char = (to_length > 0 ? to_chars[to_length - 1] : '');
          for (var i = 0; i < length_diff; i++) {
            to_chars.push(pad_char);
          }
        }

        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = to_chars[i];
        }
      }

      var new_str = ''
      for (var i = 0, length = self.length; i < length; i++) {
        var ch = self.charAt(i);
        var sub = subs[ch];
        if (inverse) {
          new_str += (sub == null ? global_sub : ch);
        }
        else {
          new_str += (sub != null ? sub : ch);
        }
      }
      return new_str;
    
    };

    def.$tr_s = function(from, to) {
      var self = this;

      
      if (from.length == 0) {
        return self;
      }

      var subs = {};
      var from_chars = from.split('');
      var from_length = from_chars.length;
      var to_chars = to.split('');
      var to_length = to_chars.length;

      var inverse = false;
      var global_sub = null;
      if (from_chars[0] === '^') {
        inverse = true;
        from_chars.shift();
        global_sub = to_chars[to_length - 1]
        from_length -= 1;
      }

      var from_chars_expanded = [];
      var last_from = null;
      var in_range = false;
      for (var i = 0; i < from_length; i++) {
        var ch = from_chars[i];
        if (last_from == null) {
          last_from = ch;
          from_chars_expanded.push(ch);
        }
        else if (ch === '-') {
          if (last_from === '-') {
            from_chars_expanded.push('-');
            from_chars_expanded.push('-');
          }
          else if (i == from_length - 1) {
            from_chars_expanded.push('-');
          }
          else {
            in_range = true;
          }
        }
        else if (in_range) {
          var start = last_from.charCodeAt(0) + 1;
          var end = ch.charCodeAt(0);
          for (var c = start; c < end; c++) {
            from_chars_expanded.push(String.fromCharCode(c));
          }
          from_chars_expanded.push(ch);
          in_range = null;
          last_from = null;
        }
        else {
          from_chars_expanded.push(ch);
        }
      }

      from_chars = from_chars_expanded;
      from_length = from_chars.length;

      if (inverse) {
        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = true;
        }
      }
      else {
        if (to_length > 0) {
          var to_chars_expanded = [];
          var last_to = null;
          var in_range = false;
          for (var i = 0; i < to_length; i++) {
            var ch = to_chars[i];
            if (last_from == null) {
              last_from = ch;
              to_chars_expanded.push(ch);
            }
            else if (ch === '-') {
              if (last_to === '-') {
                to_chars_expanded.push('-');
                to_chars_expanded.push('-');
              }
              else if (i == to_length - 1) {
                to_chars_expanded.push('-');
              }
              else {
                in_range = true;
              }
            }
            else if (in_range) {
              var start = last_from.charCodeAt(0) + 1;
              var end = ch.charCodeAt(0);
              for (var c = start; c < end; c++) {
                to_chars_expanded.push(String.fromCharCode(c));
              }
              to_chars_expanded.push(ch);
              in_range = null;
              last_from = null;
            }
            else {
              to_chars_expanded.push(ch);
            }
          }

          to_chars = to_chars_expanded;
          to_length = to_chars.length;
        }

        var length_diff = from_length - to_length;
        if (length_diff > 0) {
          var pad_char = (to_length > 0 ? to_chars[to_length - 1] : '');
          for (var i = 0; i < length_diff; i++) {
            to_chars.push(pad_char);
          }
        }

        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = to_chars[i];
        }
      }
      var new_str = ''
      var last_substitute = null
      for (var i = 0, length = self.length; i < length; i++) {
        var ch = self.charAt(i);
        var sub = subs[ch]
        if (inverse) {
          if (sub == null) {
            if (last_substitute == null) {
              new_str += global_sub;
              last_substitute = true;
            }
          }
          else {
            new_str += ch;
            last_substitute = null;
          }
        }
        else {
          if (sub != null) {
            if (last_substitute == null || last_substitute !== sub) {
              new_str += sub;
              last_substitute = sub;
            }
          }
          else {
            new_str += ch;
            last_substitute = null;
          }
        }
      }
      return new_str;
    
    };

    def.$upcase = function() {
      var self = this;

      return self.toUpperCase();
    };

    def.$freeze = function() {
      var self = this;

      return self;
    };

    return (def['$frozen?'] = function() {
      var self = this;

      return true;
    }, nil) && 'frozen?';
  })(self, null);
  return $opal.cdecl($scope, 'Symbol', $scope.String);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/string.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$new', '$allocate', '$initialize', '$to_proc', '$__send__', '$class', '$clone', '$respond_to?', '$==', '$inspect']);
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self._proto, $scope = self._scope;

    return ($opal.defs(self, '$inherited', function(klass) {
      var self = this, replace = nil;

      replace = $scope.Class.$new(($scope.String)._scope.Wrapper);
      
      klass._proto        = replace._proto;
      klass._proto._klass = klass;
      klass._alloc        = replace._alloc;
      klass.__parent      = ($scope.String)._scope.Wrapper;

      klass.$allocate = replace.$allocate;
      klass.$new      = replace.$new;
    
    }), nil) && 'inherited'
  })(self, null);
  return (function($base, $super) {
    function $Wrapper(){};
    var self = $Wrapper = $klass($base, $super, 'Wrapper', $Wrapper);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4;

    def.literal = nil;
    $opal.defs(self, '$allocate', TMP_1 = function(string) {
      var self = this, $iter = TMP_1._p, $yield = $iter || nil, obj = nil;

      if (string == null) {
        string = ""
      }
      TMP_1._p = null;
      obj = $opal.find_super_dispatcher(self, 'allocate', TMP_1, null, $Wrapper).apply(self, []);
      obj.literal = string;
      return obj;
    });

    $opal.defs(self, '$new', TMP_2 = function(args) {
      var $a, $b, self = this, $iter = TMP_2._p, block = $iter || nil, obj = nil;

      args = $slice.call(arguments, 0);
      TMP_2._p = null;
      obj = self.$allocate();
      ($a = ($b = obj).$initialize, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
      return obj;
    });

    $opal.defs(self, '$[]', function(objects) {
      var self = this;

      objects = $slice.call(arguments, 0);
      return self.$allocate(objects);
    });

    def.$initialize = function(string) {
      var self = this;

      if (string == null) {
        string = ""
      }
      return self.literal = string;
    };

    def.$method_missing = TMP_3 = function(args) {
      var $a, $b, self = this, $iter = TMP_3._p, block = $iter || nil, result = nil;

      args = $slice.call(arguments, 0);
      TMP_3._p = null;
      result = ($a = ($b = self.literal).$__send__, $a._p = block.$to_proc(), $a).apply($b, [].concat(args));
      if ((($a = result._isString != null) !== nil && (!$a._isBoolean || $a == true))) {
        if ((($a = result == self.literal) !== nil && (!$a._isBoolean || $a == true))) {
          return self
          } else {
          return self.$class().$allocate(result)
        }
        } else {
        return result
      };
    };

    def.$initialize_copy = function(other) {
      var self = this;

      return self.literal = (other.literal).$clone();
    };

    def['$respond_to?'] = TMP_4 = function(name) {var $zuper = $slice.call(arguments, 0);
      var $a, self = this, $iter = TMP_4._p, $yield = $iter || nil;

      TMP_4._p = null;
      return ((($a = $opal.find_super_dispatcher(self, 'respond_to?', TMP_4, $iter).apply(self, $zuper)) !== false && $a !== nil) ? $a : self.literal['$respond_to?'](name));
    };

    def['$=='] = function(other) {
      var self = this;

      return self.literal['$=='](other);
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$===', def['$==']);

    def.$to_s = function() {
      var self = this;

      return self.literal;
    };

    def.$to_str = function() {
      var self = this;

      return self;
    };

    return (def.$inspect = function() {
      var self = this;

      return self.literal.$inspect();
    }, nil) && 'inspect';
  })($scope.String, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/string/inheritance.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars;

  $opal.add_stubs(['$attr_reader', '$pre_match', '$post_match', '$[]', '$===', '$!', '$==', '$raise', '$inspect']);
  return (function($base, $super) {
    function $MatchData(){};
    var self = $MatchData = $klass($base, $super, 'MatchData', $MatchData);

    var def = self._proto, $scope = self._scope, TMP_1;

    def.string = def.matches = def.begin = nil;
    self.$attr_reader("post_match", "pre_match", "regexp", "string");

    $opal.defs(self, '$new', TMP_1 = function(regexp, match_groups) {
      var self = this, $iter = TMP_1._p, $yield = $iter || nil, data = nil;

      TMP_1._p = null;
      data = $opal.find_super_dispatcher(self, 'new', TMP_1, null, $MatchData).apply(self, [regexp, match_groups]);
      $gvars["`"] = data.$pre_match();
      $gvars["'"] = data.$post_match();
      $gvars["~"] = data;
      return data;
    });

    def.$initialize = function(regexp, match_groups) {
      var self = this;

      self.regexp = regexp;
      self.begin = match_groups.index;
      self.string = match_groups.input;
      self.pre_match = self.string.substr(0, regexp.lastIndex - match_groups[0].length);
      self.post_match = self.string.substr(regexp.lastIndex);
      self.matches = [];
      
      for (var i = 0, length = match_groups.length; i < length; i++) {
        var group = match_groups[i];

        if (group == null) {
          self.matches.push(nil);
        }
        else {
          self.matches.push(group);
        }
      }
    
    };

    def['$[]'] = function(args) {
      var $a, self = this;

      args = $slice.call(arguments, 0);
      return ($a = self.matches)['$[]'].apply($a, [].concat(args));
    };

    def['$=='] = function(other) {
      var $a, $b, $c, $d, self = this;

      if ((($a = $scope.MatchData['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      return ($a = ($b = ($c = ($d = self.string == other.string, $d !== false && $d !== nil ?self.regexp == other.regexp : $d), $c !== false && $c !== nil ?self.pre_match == other.pre_match : $c), $b !== false && $b !== nil ?self.post_match == other.post_match : $b), $a !== false && $a !== nil ?self.begin == other.begin : $a);
    };

    def.$begin = function(pos) {
      var $a, $b, self = this;

      if ((($a = ($b = pos['$=='](0)['$!'](), $b !== false && $b !== nil ?pos['$=='](1)['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "MatchData#begin only supports 0th element")};
      return self.begin;
    };

    def.$captures = function() {
      var self = this;

      return self.matches.slice(1);
    };

    def.$inspect = function() {
      var self = this;

      
      var str = "#<MatchData " + (self.matches[0]).$inspect();

      for (var i = 1, length = self.matches.length; i < length; i++) {
        str += " " + i + ":" + (self.matches[i]).$inspect();
      }

      return str + ">";
    ;
    };

    def.$length = function() {
      var self = this;

      return self.matches.length;
    };

    $opal.defn(self, '$size', def.$length);

    def.$to_a = function() {
      var self = this;

      return self.matches;
    };

    def.$to_s = function() {
      var self = this;

      return self.matches[0];
    };

    return (def.$values_at = function(indexes) {
      var self = this;

      indexes = $slice.call(arguments, 0);
      
      var values       = [],
          match_length = self.matches.length;

      for (var i = 0, length = indexes.length; i < length; i++) {
        var pos = indexes[i];

        if (pos >= 0) {
          values.push(self.matches[pos]);
        }
        else {
          pos += match_length;

          if (pos > 0) {
            values.push(self.matches[pos]);
          }
          else {
            values.push(nil);
          }
        }
      }

      return values;
    ;
    }, nil) && 'values_at';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/match_data.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$coerce', '$===', '$raise', '$class', '$__send__', '$send_coerced', '$to_int', '$coerce_to!', '$-@', '$**', '$-', '$respond_to?', '$==', '$enum_for', '$gcd', '$lcm', '$<', '$>', '$floor', '$/', '$%']);
  ;
  (function($base, $super) {
    function $Numeric(){};
    var self = $Numeric = $klass($base, $super, 'Numeric', $Numeric);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6;

    self.$include($scope.Comparable);

    def._isNumber = true;

    def.$coerce = function(other, type) {
      var self = this, $case = nil;

      if (type == null) {
        type = "operation"
      }
      try {
      
      if (other._isNumber) {
        return [self, other];
      }
      else {
        return other.$coerce(self);
      }
    
      } catch ($err) {if (true) {
        return (function() {$case = type;if ("operation"['$===']($case)) {return self.$raise($scope.TypeError, "" + (other.$class()) + " can't be coerce into Numeric")}else if ("comparison"['$===']($case)) {return self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")}else { return nil }})()
        }else { throw $err; }
      };
    };

    def.$send_coerced = function(method, other) {
      var $a, self = this, type = nil, $case = nil, a = nil, b = nil;

      type = (function() {$case = method;if ("+"['$===']($case) || "-"['$===']($case) || "*"['$===']($case) || "/"['$===']($case) || "%"['$===']($case) || "&"['$===']($case) || "|"['$===']($case) || "^"['$===']($case) || "**"['$===']($case)) {return "operation"}else if (">"['$===']($case) || ">="['$===']($case) || "<"['$===']($case) || "<="['$===']($case) || "<=>"['$===']($case)) {return "comparison"}else { return nil }})();
      $a = $opal.to_ary(self.$coerce(other, type)), a = ($a[0] == null ? nil : $a[0]), b = ($a[1] == null ? nil : $a[1]);
      return a.$__send__(method, b);
    };

    def['$+'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self + other;
      }
      else {
        return self.$send_coerced("+", other);
      }
    
    };

    def['$-'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self - other;
      }
      else {
        return self.$send_coerced("-", other);
      }
    
    };

    def['$*'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self * other;
      }
      else {
        return self.$send_coerced("*", other);
      }
    
    };

    def['$/'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self / other;
      }
      else {
        return self.$send_coerced("/", other);
      }
    
    };

    def['$%'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        if (other < 0 || self < 0) {
          return (self % other + other) % other;
        }
        else {
          return self % other;
        }
      }
      else {
        return self.$send_coerced("%", other);
      }
    
    };

    def['$&'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self & other;
      }
      else {
        return self.$send_coerced("&", other);
      }
    
    };

    def['$|'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self | other;
      }
      else {
        return self.$send_coerced("|", other);
      }
    
    };

    def['$^'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self ^ other;
      }
      else {
        return self.$send_coerced("^", other);
      }
    
    };

    def['$<'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self < other;
      }
      else {
        return self.$send_coerced("<", other);
      }
    
    };

    def['$<='] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self <= other;
      }
      else {
        return self.$send_coerced("<=", other);
      }
    
    };

    def['$>'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self > other;
      }
      else {
        return self.$send_coerced(">", other);
      }
    
    };

    def['$>='] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self >= other;
      }
      else {
        return self.$send_coerced(">=", other);
      }
    
    };

    def['$<=>'] = function(other) {
      var self = this;

      try {
      
      if (other._isNumber) {
        return self > other ? 1 : (self < other ? -1 : 0);
      }
      else {
        return self.$send_coerced("<=>", other);
      }
    
      } catch ($err) {if ($opal.$rescue($err, [$scope.ArgumentError])) {
        return nil
        }else { throw $err; }
      };
    };

    def['$<<'] = function(count) {
      var self = this;

      return self << count.$to_int();
    };

    def['$>>'] = function(count) {
      var self = this;

      return self >> count.$to_int();
    };

    def['$[]'] = function(bit) {
      var self = this, min = nil, max = nil;

      bit = $scope.Opal['$coerce_to!'](bit, $scope.Integer, "to_int");
      min = ((2)['$**'](30))['$-@']();
      max = ((2)['$**'](30))['$-'](1);
      return (bit < min || bit > max) ? 0 : (self >> bit) % 2;
    };

    def['$+@'] = function() {
      var self = this;

      return +self;
    };

    def['$-@'] = function() {
      var self = this;

      return -self;
    };

    def['$~'] = function() {
      var self = this;

      return ~self;
    };

    def['$**'] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return Math.pow(self, other);
      }
      else {
        return self.$send_coerced("**", other);
      }
    
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (other._isNumber) {
        return self == Number(other);
      }
      else if (other['$respond_to?']("==")) {
        return other['$=='](self);
      }
      else {
        return false;
      }
    ;
    };

    def.$abs = function() {
      var self = this;

      return Math.abs(self);
    };

    def.$ceil = function() {
      var self = this;

      return Math.ceil(self);
    };

    def.$chr = function() {
      var self = this;

      return String.fromCharCode(self);
    };

    def.$conj = function() {
      var self = this;

      return self;
    };

    $opal.defn(self, '$conjugate', def.$conj);

    def.$downto = TMP_1 = function(finish) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("downto", finish)
      };
      
      for (var i = self; i >= finish; i--) {
        if (block(i) === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$equal?', def['$==']);

    def['$even?'] = function() {
      var self = this;

      return self % 2 === 0;
    };

    def.$floor = function() {
      var self = this;

      return Math.floor(self);
    };

    def.$gcd = function(other) {
      var $a, self = this;

      if ((($a = $scope.Integer['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.TypeError, "not an integer")
      };
      
      var min = Math.abs(self),
          max = Math.abs(other);

      while (min > 0) {
        var tmp = min;

        min = max % min;
        max = tmp;
      }

      return max;
    
    };

    def.$gcdlcm = function(other) {
      var self = this;

      return [self.$gcd(), self.$lcm()];
    };

    def.$hash = function() {
      var self = this;

      return self.toString();
    };

    def['$integer?'] = function() {
      var self = this;

      return self % 1 === 0;
    };

    def['$is_a?'] = TMP_2 = function(klass) {var $zuper = $slice.call(arguments, 0);
      var $a, $b, self = this, $iter = TMP_2._p, $yield = $iter || nil;

      TMP_2._p = null;
      if ((($a = (($b = klass['$==']($scope.Fixnum)) ? $scope.Integer['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']($scope.Integer)) ? $scope.Integer['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']($scope.Float)) ? $scope.Float['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      return $opal.find_super_dispatcher(self, 'is_a?', TMP_2, $iter).apply(self, $zuper);
    };

    $opal.defn(self, '$kind_of?', def['$is_a?']);

    def['$instance_of?'] = TMP_3 = function(klass) {var $zuper = $slice.call(arguments, 0);
      var $a, $b, self = this, $iter = TMP_3._p, $yield = $iter || nil;

      TMP_3._p = null;
      if ((($a = (($b = klass['$==']($scope.Fixnum)) ? $scope.Integer['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']($scope.Integer)) ? $scope.Integer['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      if ((($a = (($b = klass['$==']($scope.Float)) ? $scope.Float['$==='](self) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return true};
      return $opal.find_super_dispatcher(self, 'instance_of?', TMP_3, $iter).apply(self, $zuper);
    };

    def.$lcm = function(other) {
      var $a, self = this;

      if ((($a = $scope.Integer['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.TypeError, "not an integer")
      };
      
      if (self == 0 || other == 0) {
        return 0;
      }
      else {
        return Math.abs(self * other / self.$gcd(other));
      }
    
    };

    $opal.defn(self, '$magnitude', def.$abs);

    $opal.defn(self, '$modulo', def['$%']);

    def.$next = function() {
      var self = this;

      return self + 1;
    };

    def['$nonzero?'] = function() {
      var self = this;

      return self == 0 ? nil : self;
    };

    def['$odd?'] = function() {
      var self = this;

      return self % 2 !== 0;
    };

    def.$ord = function() {
      var self = this;

      return self;
    };

    def.$pred = function() {
      var self = this;

      return self - 1;
    };

    def.$round = function() {
      var self = this;

      return Math.round(self);
    };

    def.$step = TMP_4 = function(limit, step) {
      var $a, self = this, $iter = TMP_4._p, block = $iter || nil;

      if (step == null) {
        step = 1
      }
      TMP_4._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("step", limit, step)
      };
      if ((($a = step == 0) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "step cannot be 0")};
      
      var value = self;

      if (step > 0) {
        while (value <= limit) {
          block(value);
          value += step;
        }
      }
      else {
        while (value >= limit) {
          block(value);
          value += step;
        }
      }
    
      return self;
    };

    $opal.defn(self, '$succ', def.$next);

    def.$times = TMP_5 = function() {
      var self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("times")
      };
      
      for (var i = 0; i < self; i++) {
        if (block(i) === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def.$to_f = function() {
      var self = this;

      return self;
    };

    def.$to_i = function() {
      var self = this;

      return parseInt(self);
    };

    $opal.defn(self, '$to_int', def.$to_i);

    def.$to_s = function(base) {
      var $a, $b, self = this;

      if (base == null) {
        base = 10
      }
      if ((($a = ((($b = base['$<'](2)) !== false && $b !== nil) ? $b : base['$>'](36))) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "base must be between 2 and 36")};
      return self.toString(base);
    };

    $opal.defn(self, '$inspect', def.$to_s);

    def.$divmod = function(rhs) {
      var self = this, q = nil, r = nil;

      q = (self['$/'](rhs)).$floor();
      r = self['$%'](rhs);
      return [q, r];
    };

    def.$upto = TMP_6 = function(finish) {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$enum_for("upto", finish)
      };
      
      for (var i = self; i <= finish; i++) {
        if (block(i) === $breaker) {
          return $breaker.$v;
        }
      }
    
      return self;
    };

    def['$zero?'] = function() {
      var self = this;

      return self == 0;
    };

    def.$size = function() {
      var self = this;

      return 4;
    };

    def['$nan?'] = function() {
      var self = this;

      return isNaN(self);
    };

    def['$finite?'] = function() {
      var self = this;

      return self != Infinity && self != -Infinity;
    };

    def['$infinite?'] = function() {
      var self = this;

      
      if (self == Infinity) {
        return +1;
      }
      else if (self == -Infinity) {
        return -1;
      }
      else {
        return nil;
      }
    
    };

    def['$positive?'] = function() {
      var self = this;

      return 1 / self > 0;
    };

    return (def['$negative?'] = function() {
      var self = this;

      return 1 / self < 0;
    }, nil) && 'negative?';
  })(self, null);
  $opal.cdecl($scope, 'Fixnum', $scope.Numeric);
  (function($base, $super) {
    function $Integer(){};
    var self = $Integer = $klass($base, $super, 'Integer', $Integer);

    var def = self._proto, $scope = self._scope;

    return ($opal.defs(self, '$===', function(other) {
      var self = this;

      
      if (!other._isNumber) {
        return false;
      }

      return (other % 1) === 0;
    
    }), nil) && '==='
  })(self, $scope.Numeric);
  return (function($base, $super) {
    function $Float(){};
    var self = $Float = $klass($base, $super, 'Float', $Float);

    var def = self._proto, $scope = self._scope, $a;

    $opal.defs(self, '$===', function(other) {
      var self = this;

      return !!other._isNumber;
    });

    $opal.cdecl($scope, 'INFINITY', Infinity);

    $opal.cdecl($scope, 'NAN', NaN);

    if ((($a = (typeof(Number.EPSILON) !== "undefined")) !== nil && (!$a._isBoolean || $a == true))) {
      return $opal.cdecl($scope, 'EPSILON', Number.EPSILON)
      } else {
      return $opal.cdecl($scope, 'EPSILON', 2.2204460492503130808472633361816E-16)
    };
  })(self, $scope.Numeric);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/numeric.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs([]);
  return (function($base, $super) {
    function $Complex(){};
    var self = $Complex = $klass($base, $super, 'Complex', $Complex);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.Numeric)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/complex.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs([]);
  return (function($base, $super) {
    function $Rational(){};
    var self = $Rational = $klass($base, $super, 'Rational', $Rational);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.Numeric)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/rational.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$raise']);
  return (function($base, $super) {
    function $Proc(){};
    var self = $Proc = $klass($base, $super, 'Proc', $Proc);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2;

    def._isProc = true;

    def.is_lambda = false;

    $opal.defs(self, '$new', TMP_1 = function() {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if (block !== false && block !== nil) {
        } else {
        self.$raise($scope.ArgumentError, "tried to create a Proc object without a block")
      };
      return block;
    });

    def.$call = TMP_2 = function(args) {
      var self = this, $iter = TMP_2._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_2._p = null;
      
      if (block !== nil) {
        self._p = block;
      }

      var result;

      if (self.is_lambda) {
        result = self.apply(null, args);
      }
      else {
        result = Opal.$yieldX(self, args);
      }

      if (result === $breaker) {
        return $breaker.$v;
      }

      return result;
    
    };

    $opal.defn(self, '$[]', def.$call);

    def.$to_proc = function() {
      var self = this;

      return self;
    };

    def['$lambda?'] = function() {
      var self = this;

      return !!self.is_lambda;
    };

    return (def.$arity = function() {
      var self = this;

      return self.length;
    }, nil) && 'arity';
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/proc.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$attr_reader', '$class', '$arity', '$new', '$name']);
  (function($base, $super) {
    function $Method(){};
    var self = $Method = $klass($base, $super, 'Method', $Method);

    var def = self._proto, $scope = self._scope, TMP_1;

    def.method = def.receiver = def.owner = def.name = def.obj = nil;
    self.$attr_reader("owner", "receiver", "name");

    def.$initialize = function(receiver, method, name) {
      var self = this;

      self.receiver = receiver;
      self.owner = receiver.$class();
      self.name = name;
      return self.method = method;
    };

    def.$arity = function() {
      var self = this;

      return self.method.$arity();
    };

    def.$call = TMP_1 = function(args) {
      var self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 0);
      TMP_1._p = null;
      
      self.method._p = block;

      return self.method.apply(self.receiver, args);
    ;
    };

    $opal.defn(self, '$[]', def.$call);

    def.$unbind = function() {
      var self = this;

      return $scope.UnboundMethod.$new(self.owner, self.method, self.name);
    };

    def.$to_proc = function() {
      var self = this;

      return self.method;
    };

    return (def.$inspect = function() {
      var self = this;

      return "#<Method: " + (self.obj.$class().$name()) + "#" + (self.name) + "}>";
    }, nil) && 'inspect';
  })(self, null);
  return (function($base, $super) {
    function $UnboundMethod(){};
    var self = $UnboundMethod = $klass($base, $super, 'UnboundMethod', $UnboundMethod);

    var def = self._proto, $scope = self._scope;

    def.method = def.name = def.owner = nil;
    self.$attr_reader("owner", "name");

    def.$initialize = function(owner, method, name) {
      var self = this;

      self.owner = owner;
      self.method = method;
      return self.name = name;
    };

    def.$arity = function() {
      var self = this;

      return self.method.$arity();
    };

    def.$bind = function(object) {
      var self = this;

      return $scope.Method.$new(object, self.method, self.name);
    };

    return (def.$inspect = function() {
      var self = this;

      return "#<UnboundMethod: " + (self.owner.$name()) + "#" + (self.name) + ">";
    }, nil) && 'inspect';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/method.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$attr_reader', '$<=', '$<', '$enum_for', '$succ', '$!', '$==', '$===', '$exclude_end?', '$eql?', '$begin', '$end', '$-', '$abs', '$to_i', '$raise', '$inspect']);
  ;
  return (function($base, $super) {
    function $Range(){};
    var self = $Range = $klass($base, $super, 'Range', $Range);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3;

    def.begin = def.exclude = def.end = nil;
    self.$include($scope.Enumerable);

    def._isRange = true;

    self.$attr_reader("begin", "end");

    def.$initialize = function(first, last, exclude) {
      var self = this;

      if (exclude == null) {
        exclude = false
      }
      self.begin = first;
      self.end = last;
      return self.exclude = exclude;
    };

    def['$=='] = function(other) {
      var self = this;

      
      if (!other._isRange) {
        return false;
      }

      return self.exclude === other.exclude &&
             self.begin   ==  other.begin &&
             self.end     ==  other.end;
    
    };

    def['$==='] = function(value) {
      var $a, $b, self = this;

      return (($a = self.begin['$<='](value)) ? ((function() {if ((($b = self.exclude) !== nil && (!$b._isBoolean || $b == true))) {
        return value['$<'](self.end)
        } else {
        return value['$<='](self.end)
      }; return nil; })()) : $a);
    };

    $opal.defn(self, '$cover?', def['$===']);

    def.$each = TMP_1 = function() {
      var $a, $b, self = this, $iter = TMP_1._p, block = $iter || nil, current = nil, last = nil;

      TMP_1._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      current = self.begin;
      last = self.end;
      while (current['$<'](last)) {
      if ($opal.$yield1(block, current) === $breaker) return $breaker.$v;
      current = current.$succ();};
      if ((($a = ($b = self.exclude['$!'](), $b !== false && $b !== nil ?current['$=='](last) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        if ($opal.$yield1(block, current) === $breaker) return $breaker.$v};
      return self;
    };

    def['$eql?'] = function(other) {
      var $a, $b, self = this;

      if ((($a = $scope.Range['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      return ($a = ($b = self.exclude['$==='](other['$exclude_end?']()), $b !== false && $b !== nil ?self.begin['$eql?'](other.$begin()) : $b), $a !== false && $a !== nil ?self.end['$eql?'](other.$end()) : $a);
    };

    def['$exclude_end?'] = function() {
      var self = this;

      return self.exclude;
    };

    $opal.defn(self, '$first', def.$begin);

    $opal.defn(self, '$include?', def['$cover?']);

    $opal.defn(self, '$last', def.$end);

    def.$max = TMP_2 = function() {var $zuper = $slice.call(arguments, 0);
      var self = this, $iter = TMP_2._p, $yield = $iter || nil;

      TMP_2._p = null;
      if (($yield !== nil)) {
        return $opal.find_super_dispatcher(self, 'max', TMP_2, $iter).apply(self, $zuper)
        } else {
        return self.exclude ? self.end - 1 : self.end;
      };
    };

    $opal.defn(self, '$member?', def['$cover?']);

    def.$min = TMP_3 = function() {var $zuper = $slice.call(arguments, 0);
      var self = this, $iter = TMP_3._p, $yield = $iter || nil;

      TMP_3._p = null;
      if (($yield !== nil)) {
        return $opal.find_super_dispatcher(self, 'min', TMP_3, $iter).apply(self, $zuper)
        } else {
        return self.begin
      };
    };

    $opal.defn(self, '$member?', def['$include?']);

    def.$size = function() {
      var $a, $b, self = this, _begin = nil, _end = nil, infinity = nil;

      _begin = self.begin;
      _end = self.end;
      if ((($a = self.exclude) !== nil && (!$a._isBoolean || $a == true))) {
        _end = _end['$-'](1)};
      if ((($a = ($b = $scope.Numeric['$==='](_begin), $b !== false && $b !== nil ?$scope.Numeric['$==='](_end) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return nil
      };
      if (_end['$<'](_begin)) {
        return 0};
      infinity = ($scope.Float)._scope.INFINITY;
      if ((($a = ((($b = infinity['$=='](_begin.$abs())) !== false && $b !== nil) ? $b : _end.$abs()['$=='](infinity))) !== nil && (!$a._isBoolean || $a == true))) {
        return infinity};
      return ((Math.abs(_end - _begin) + 1)).$to_i();
    };

    def.$step = function(n) {
      var self = this;

      if (n == null) {
        n = 1
      }
      return self.$raise($scope.NotImplementedError);
    };

    def.$to_s = function() {
      var self = this;

      return self.begin.$inspect() + (self.exclude ? '...' : '..') + self.end.$inspect();
    };

    return $opal.defn(self, '$inspect', def.$to_s);
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/range.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$include', '$kind_of?', '$to_i', '$coerce_to', '$between?', '$raise', '$new', '$compact', '$nil?', '$===', '$<=>', '$to_f', '$strftime', '$is_a?', '$zero?', '$utc?', '$warn', '$yday', '$rjust', '$ljust', '$zone', '$sec', '$min', '$hour', '$day', '$month', '$year', '$wday', '$isdst']);
  ;
  return (function($base, $super) {
    function $Time(){};
    var self = $Time = $klass($base, $super, 'Time', $Time);

    var def = self._proto, $scope = self._scope;

    self.$include($scope.Comparable);

    
    var days_of_week = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        short_days   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        short_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        long_months  = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  ;

    $opal.defs(self, '$at', function(seconds, frac) {
      var self = this;

      if (frac == null) {
        frac = 0
      }
      return new Date(seconds * 1000 + frac);
    });

    $opal.defs(self, '$new', function(year, month, day, hour, minute, second, utc_offset) {
      var self = this;

      
      switch (arguments.length) {
        case 1:
          return new Date(year, 0);

        case 2:
          return new Date(year, month - 1);

        case 3:
          return new Date(year, month - 1, day);

        case 4:
          return new Date(year, month - 1, day, hour);

        case 5:
          return new Date(year, month - 1, day, hour, minute);

        case 6:
          return new Date(year, month - 1, day, hour, minute, second);

        case 7:
          return new Date(year, month - 1, day, hour, minute, second);

        default:
          return new Date();
      }
    
    });

    $opal.defs(self, '$local', function(year, month, day, hour, minute, second, millisecond) {
      var $a, self = this;

      if (month == null) {
        month = nil
      }
      if (day == null) {
        day = nil
      }
      if (hour == null) {
        hour = nil
      }
      if (minute == null) {
        minute = nil
      }
      if (second == null) {
        second = nil
      }
      if (millisecond == null) {
        millisecond = nil
      }
      if ((($a = arguments.length === 10) !== nil && (!$a._isBoolean || $a == true))) {
        
        var args = $slice.call(arguments).reverse();

        second = args[9];
        minute = args[8];
        hour   = args[7];
        day    = args[6];
        month  = args[5];
        year   = args[4];
      };
      year = (function() {if ((($a = year['$kind_of?']($scope.String)) !== nil && (!$a._isBoolean || $a == true))) {
        return year.$to_i()
        } else {
        return $scope.Opal.$coerce_to(year, $scope.Integer, "to_int")
      }; return nil; })();
      month = (function() {if ((($a = month['$kind_of?']($scope.String)) !== nil && (!$a._isBoolean || $a == true))) {
        return month.$to_i()
        } else {
        return $scope.Opal.$coerce_to(((($a = month) !== false && $a !== nil) ? $a : 1), $scope.Integer, "to_int")
      }; return nil; })();
      if ((($a = month['$between?'](1, 12)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "month out of range: " + (month))
      };
      day = (function() {if ((($a = day['$kind_of?']($scope.String)) !== nil && (!$a._isBoolean || $a == true))) {
        return day.$to_i()
        } else {
        return $scope.Opal.$coerce_to(((($a = day) !== false && $a !== nil) ? $a : 1), $scope.Integer, "to_int")
      }; return nil; })();
      if ((($a = day['$between?'](1, 31)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "day out of range: " + (day))
      };
      hour = (function() {if ((($a = hour['$kind_of?']($scope.String)) !== nil && (!$a._isBoolean || $a == true))) {
        return hour.$to_i()
        } else {
        return $scope.Opal.$coerce_to(((($a = hour) !== false && $a !== nil) ? $a : 0), $scope.Integer, "to_int")
      }; return nil; })();
      if ((($a = hour['$between?'](0, 24)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "hour out of range: " + (hour))
      };
      minute = (function() {if ((($a = minute['$kind_of?']($scope.String)) !== nil && (!$a._isBoolean || $a == true))) {
        return minute.$to_i()
        } else {
        return $scope.Opal.$coerce_to(((($a = minute) !== false && $a !== nil) ? $a : 0), $scope.Integer, "to_int")
      }; return nil; })();
      if ((($a = minute['$between?'](0, 59)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "minute out of range: " + (minute))
      };
      second = (function() {if ((($a = second['$kind_of?']($scope.String)) !== nil && (!$a._isBoolean || $a == true))) {
        return second.$to_i()
        } else {
        return $scope.Opal.$coerce_to(((($a = second) !== false && $a !== nil) ? $a : 0), $scope.Integer, "to_int")
      }; return nil; })();
      if ((($a = second['$between?'](0, 59)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "second out of range: " + (second))
      };
      return ($a = self).$new.apply($a, [].concat([year, month, day, hour, minute, second].$compact()));
    });

    $opal.defs(self, '$gm', function(year, month, day, hour, minute, second, utc_offset) {
      var $a, self = this;

      if ((($a = year['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.TypeError, "missing year (got nil)")};
      
      if (month > 12 || day > 31 || hour > 24 || minute > 59 || second > 59) {
        self.$raise($scope.ArgumentError);
      }

      var date = new Date(Date.UTC(year, (month || 1) - 1, (day || 1), (hour || 0), (minute || 0), (second || 0)));
      date.tz_offset = 0
      return date;
    ;
    });

    (function(self) {
      var $scope = self._scope, def = self._proto;

      self._proto.$mktime = self._proto.$local;
      return self._proto.$utc = self._proto.$gm;
    })(self.$singleton_class());

    $opal.defs(self, '$now', function() {
      var self = this;

      return new Date();
    });

    def['$+'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.Time['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.TypeError, "time + time?")};
      other = $scope.Opal.$coerce_to(other, $scope.Integer, "to_int");
      
      var result = new Date(self.getTime() + (other * 1000));
      result.tz_offset = self.tz_offset;
      return result;
    
    };

    def['$-'] = function(other) {
      var $a, self = this;

      if ((($a = $scope.Time['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        return (self.getTime() - other.getTime()) / 1000;
        } else {
        other = $scope.Opal.$coerce_to(other, $scope.Integer, "to_int");
        
        var result = new Date(self.getTime() - (other * 1000));
        result.tz_offset = self.tz_offset;
        return result;
      
      };
    };

    def['$<=>'] = function(other) {
      var self = this;

      return self.$to_f()['$<=>'](other.$to_f());
    };

    def['$=='] = function(other) {
      var self = this;

      return self.$to_f() === other.$to_f();
    };

    def.$asctime = function() {
      var self = this;

      return self.$strftime("%a %b %e %H:%M:%S %Y");
    };

    $opal.defn(self, '$ctime', def.$asctime);

    def.$day = function() {
      var self = this;

      return self.getDate();
    };

    def.$yday = function() {
      var self = this;

      
      // http://javascript.about.com/library/bldayyear.htm
      var onejan = new Date(self.getFullYear(), 0, 1);
      return Math.ceil((self - onejan) / 86400000);
    
    };

    def.$isdst = function() {
      var self = this;

      return self.$raise($scope.NotImplementedError);
    };

    def['$eql?'] = function(other) {
      var $a, self = this;

      return ($a = other['$is_a?']($scope.Time), $a !== false && $a !== nil ?(self['$<=>'](other))['$zero?']() : $a);
    };

    def['$friday?'] = function() {
      var self = this;

      return self.getDay() === 5;
    };

    def.$hour = function() {
      var self = this;

      return self.getHours();
    };

    def.$inspect = function() {
      var $a, self = this;

      if ((($a = self['$utc?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return self.$strftime("%Y-%m-%d %H:%M:%S UTC")
        } else {
        return self.$strftime("%Y-%m-%d %H:%M:%S %z")
      };
    };

    $opal.defn(self, '$mday', def.$day);

    def.$min = function() {
      var self = this;

      return self.getMinutes();
    };

    def.$mon = function() {
      var self = this;

      return self.getMonth() + 1;
    };

    def['$monday?'] = function() {
      var self = this;

      return self.getDay() === 1;
    };

    $opal.defn(self, '$month', def.$mon);

    def['$saturday?'] = function() {
      var self = this;

      return self.getDay() === 6;
    };

    def.$sec = function() {
      var self = this;

      return self.getSeconds();
    };

    def.$usec = function() {
      var self = this;

      self.$warn("Microseconds are not supported");
      return 0;
    };

    def.$zone = function() {
      var self = this;

      
      var string = self.toString(),
          result;

      if (string.indexOf('(') == -1) {
        result = string.match(/[A-Z]{3,4}/)[0];
      }
      else {
        result = string.match(/\([^)]+\)/)[0].match(/[A-Z]/g).join('');
      }

      if (result == "GMT" && /(GMT\W*\d{4})/.test(string)) {
        return RegExp.$1;
      }
      else {
        return result;
      }
    
    };

    def.$getgm = function() {
      var self = this;

      
      var result = new Date(self.getTime());
      result.tz_offset = 0;
      return result;
    
    };

    def['$gmt?'] = function() {
      var self = this;

      return self.tz_offset == 0;
    };

    def.$gmt_offset = function() {
      var self = this;

      return -self.getTimezoneOffset() * 60;
    };

    def.$strftime = function(format) {
      var self = this;

      
      return format.replace(/%([\-_#^0]*:{0,2})(\d+)?([EO]*)(.)/g, function(full, flags, width, _, conv) {
        var result = "",
            width  = parseInt(width),
            zero   = flags.indexOf('0') !== -1,
            pad    = flags.indexOf('-') === -1,
            blank  = flags.indexOf('_') !== -1,
            upcase = flags.indexOf('^') !== -1,
            invert = flags.indexOf('#') !== -1,
            colons = (flags.match(':') || []).length;

        if (zero && blank) {
          if (flags.indexOf('0') < flags.indexOf('_')) {
            zero = false;
          }
          else {
            blank = false;
          }
        }

        switch (conv) {
          case 'Y':
            result += self.getFullYear();
            break;

          case 'C':
            zero    = !blank;
            result += Match.round(self.getFullYear() / 100);
            break;

          case 'y':
            zero    = !blank;
            result += (self.getFullYear() % 100);
            break;

          case 'm':
            zero    = !blank;
            result += (self.getMonth() + 1);
            break;

          case 'B':
            result += long_months[self.getMonth()];
            break;

          case 'b':
          case 'h':
            blank   = !zero;
            result += short_months[self.getMonth()];
            break;

          case 'd':
            zero    = !blank
            result += self.getDate();
            break;

          case 'e':
            blank   = !zero
            result += self.getDate();
            break;

          case 'j':
            result += self.$yday();
            break;

          case 'H':
            zero    = !blank;
            result += self.getHours();
            break;

          case 'k':
            blank   = !zero;
            result += self.getHours();
            break;

          case 'I':
            zero    = !blank;
            result += (self.getHours() % 12 || 12);
            break;

          case 'l':
            blank   = !zero;
            result += (self.getHours() % 12 || 12);
            break;

          case 'P':
            result += (self.getHours() >= 12 ? "pm" : "am");
            break;

          case 'p':
            result += (self.getHours() >= 12 ? "PM" : "AM");
            break;

          case 'M':
            zero    = !blank;
            result += self.getMinutes();
            break;

          case 'S':
            zero    = !blank;
            result += self.getSeconds();
            break;

          case 'L':
            zero    = !blank;
            width   = isNaN(width) ? 3 : width;
            result += self.getMilliseconds();
            break;

          case 'N':
            width   = isNaN(width) ? 9 : width;
            result += (self.getMilliseconds().toString()).$rjust(3, "0");
            result  = (result).$ljust(width, "0");
            break;

          case 'z':
            var offset  = self.getTimezoneOffset(),
                hours   = Math.floor(Math.abs(offset) / 60),
                minutes = Math.abs(offset) % 60;

            result += offset < 0 ? "+" : "-";
            result += hours < 10 ? "0" : "";
            result += hours;

            if (colons > 0) {
              result += ":";
            }

            result += minutes < 10 ? "0" : "";
            result += minutes;

            if (colons > 1) {
              result += ":00";
            }

            break;

          case 'Z':
            result += self.$zone();
            break;

          case 'A':
            result += days_of_week[self.getDay()];
            break;

          case 'a':
            result += short_days[self.getDay()];
            break;

          case 'u':
            result += (self.getDay() + 1);
            break;

          case 'w':
            result += self.getDay();
            break;

          // TODO: week year
          // TODO: week number

          case 's':
            result += parseInt(self.getTime() / 1000)
            break;

          case 'n':
            result += "\n";
            break;

          case 't':
            result += "\t";
            break;

          case '%':
            result += "%";
            break;

          case 'c':
            result += self.$strftime("%a %b %e %T %Y");
            break;

          case 'D':
          case 'x':
            result += self.$strftime("%m/%d/%y");
            break;

          case 'F':
            result += self.$strftime("%Y-%m-%d");
            break;

          case 'v':
            result += self.$strftime("%e-%^b-%4Y");
            break;

          case 'r':
            result += self.$strftime("%I:%M:%S %p");
            break;

          case 'R':
            result += self.$strftime("%H:%M");
            break;

          case 'T':
          case 'X':
            result += self.$strftime("%H:%M:%S");
            break;

          default:
            return full;
        }

        if (upcase) {
          result = result.toUpperCase();
        }

        if (invert) {
          result = result.replace(/[A-Z]/, function(c) { c.toLowerCase() }).
                          replace(/[a-z]/, function(c) { c.toUpperCase() });
        }

        if (pad && (zero || blank)) {
          result = (result).$rjust(isNaN(width) ? 2 : width, blank ? " " : "0");
        }

        return result;
      });
    
    };

    def['$sunday?'] = function() {
      var self = this;

      return self.getDay() === 0;
    };

    def['$thursday?'] = function() {
      var self = this;

      return self.getDay() === 4;
    };

    def.$to_a = function() {
      var self = this;

      return [self.$sec(), self.$min(), self.$hour(), self.$day(), self.$month(), self.$year(), self.$wday(), self.$yday(), self.$isdst(), self.$zone()];
    };

    def.$to_f = function() {
      var self = this;

      return self.getTime() / 1000;
    };

    def.$to_i = function() {
      var self = this;

      return parseInt(self.getTime() / 1000);
    };

    $opal.defn(self, '$to_s', def.$inspect);

    def['$tuesday?'] = function() {
      var self = this;

      return self.getDay() === 2;
    };

    $opal.defn(self, '$utc?', def['$gmt?']);

    def.$utc_offset = function() {
      var self = this;

      return self.getTimezoneOffset() * -60;
    };

    def.$wday = function() {
      var self = this;

      return self.getDay();
    };

    def['$wednesday?'] = function() {
      var self = this;

      return self.getDay() === 3;
    };

    return (def.$year = function() {
      var self = this;

      return self.getFullYear();
    }, nil) && 'year';
  })(self, null);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/time.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  $opal.add_stubs(['$==', '$[]', '$upcase', '$const_set', '$new', '$unshift', '$each', '$define_struct_attribute', '$instance_eval', '$to_proc', '$raise', '$<<', '$members', '$define_method', '$instance_variable_get', '$instance_variable_set', '$include', '$each_with_index', '$class', '$===', '$>=', '$size', '$include?', '$to_sym', '$enum_for', '$hash', '$all?', '$length', '$map', '$+', '$name', '$join', '$inspect', '$each_pair']);
  return (function($base, $super) {
    function $Struct(){};
    var self = $Struct = $klass($base, $super, 'Struct', $Struct);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_8, TMP_10;

    $opal.defs(self, '$new', TMP_1 = function(name, args) {var $zuper = $slice.call(arguments, 0);
      var $a, $b, $c, TMP_2, self = this, $iter = TMP_1._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      TMP_1._p = null;
      if (self['$==']($scope.Struct)) {
        } else {
        return $opal.find_super_dispatcher(self, 'new', TMP_1, $iter, $Struct).apply(self, $zuper)
      };
      if (name['$[]'](0)['$=='](name['$[]'](0).$upcase())) {
        return $scope.Struct.$const_set(name, ($a = self).$new.apply($a, [].concat(args)))
        } else {
        args.$unshift(name);
        return ($b = ($c = $scope.Class).$new, $b._p = (TMP_2 = function(){var self = TMP_2._s || this, $a, $b, TMP_3, $c;

        ($a = ($b = args).$each, $a._p = (TMP_3 = function(arg){var self = TMP_3._s || this;
if (arg == null) arg = nil;
          return self.$define_struct_attribute(arg)}, TMP_3._s = self, TMP_3), $a).call($b);
          if (block !== false && block !== nil) {
            return ($a = ($c = self).$instance_eval, $a._p = block.$to_proc(), $a).call($c)
            } else {
            return nil
          };}, TMP_2._s = self, TMP_2), $b).call($c, self);
      };
    });

    $opal.defs(self, '$define_struct_attribute', function(name) {
      var $a, $b, TMP_4, $c, TMP_5, self = this;

      if (self['$==']($scope.Struct)) {
        self.$raise($scope.ArgumentError, "you cannot define attributes to the Struct class")};
      self.$members()['$<<'](name);
      ($a = ($b = self).$define_method, $a._p = (TMP_4 = function(){var self = TMP_4._s || this;

      return self.$instance_variable_get("@" + (name))}, TMP_4._s = self, TMP_4), $a).call($b, name);
      return ($a = ($c = self).$define_method, $a._p = (TMP_5 = function(value){var self = TMP_5._s || this;
if (value == null) value = nil;
      return self.$instance_variable_set("@" + (name), value)}, TMP_5._s = self, TMP_5), $a).call($c, "" + (name) + "=");
    });

    $opal.defs(self, '$members', function() {
      var $a, self = this;
      if (self.members == null) self.members = nil;

      if (self['$==']($scope.Struct)) {
        self.$raise($scope.ArgumentError, "the Struct class has no members")};
      return ((($a = self.members) !== false && $a !== nil) ? $a : self.members = []);
    });

    $opal.defs(self, '$inherited', function(klass) {
      var $a, $b, TMP_6, self = this, members = nil;
      if (self.members == null) self.members = nil;

      if (self['$==']($scope.Struct)) {
        return nil};
      members = self.members;
      return ($a = ($b = klass).$instance_eval, $a._p = (TMP_6 = function(){var self = TMP_6._s || this;

      return self.members = members}, TMP_6._s = self, TMP_6), $a).call($b);
    });

    (function(self) {
      var $scope = self._scope, def = self._proto;

      return self._proto['$[]'] = self._proto.$new
    })(self.$singleton_class());

    self.$include($scope.Enumerable);

    def.$initialize = function(args) {
      var $a, $b, TMP_7, self = this;

      args = $slice.call(arguments, 0);
      return ($a = ($b = self.$members()).$each_with_index, $a._p = (TMP_7 = function(name, index){var self = TMP_7._s || this;
if (name == null) name = nil;if (index == null) index = nil;
      return self.$instance_variable_set("@" + (name), args['$[]'](index))}, TMP_7._s = self, TMP_7), $a).call($b);
    };

    def.$members = function() {
      var self = this;

      return self.$class().$members();
    };

    def['$[]'] = function(name) {
      var $a, self = this;

      if ((($a = $scope.Integer['$==='](name)) !== nil && (!$a._isBoolean || $a == true))) {
        if (name['$>='](self.$members().$size())) {
          self.$raise($scope.IndexError, "offset " + (name) + " too large for struct(size:" + (self.$members().$size()) + ")")};
        name = self.$members()['$[]'](name);
      } else if ((($a = self.$members()['$include?'](name.$to_sym())) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.NameError, "no member '" + (name) + "' in struct")
      };
      return self.$instance_variable_get("@" + (name));
    };

    def['$[]='] = function(name, value) {
      var $a, self = this;

      if ((($a = $scope.Integer['$==='](name)) !== nil && (!$a._isBoolean || $a == true))) {
        if (name['$>='](self.$members().$size())) {
          self.$raise($scope.IndexError, "offset " + (name) + " too large for struct(size:" + (self.$members().$size()) + ")")};
        name = self.$members()['$[]'](name);
      } else if ((($a = self.$members()['$include?'](name.$to_sym())) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.NameError, "no member '" + (name) + "' in struct")
      };
      return self.$instance_variable_set("@" + (name), value);
    };

    def.$each = TMP_8 = function() {
      var $a, $b, TMP_9, self = this, $iter = TMP_8._p, $yield = $iter || nil;

      TMP_8._p = null;
      if (($yield !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      ($a = ($b = self.$members()).$each, $a._p = (TMP_9 = function(name){var self = TMP_9._s || this, $a;
if (name == null) name = nil;
      return $a = $opal.$yield1($yield, self['$[]'](name)), $a === $breaker ? $a : $a}, TMP_9._s = self, TMP_9), $a).call($b);
      return self;
    };

    def.$each_pair = TMP_10 = function() {
      var $a, $b, TMP_11, self = this, $iter = TMP_10._p, $yield = $iter || nil;

      TMP_10._p = null;
      if (($yield !== nil)) {
        } else {
        return self.$enum_for("each_pair")
      };
      ($a = ($b = self.$members()).$each, $a._p = (TMP_11 = function(name){var self = TMP_11._s || this, $a;
if (name == null) name = nil;
      return $a = $opal.$yieldX($yield, [name, self['$[]'](name)]), $a === $breaker ? $a : $a}, TMP_11._s = self, TMP_11), $a).call($b);
      return self;
    };

    def['$eql?'] = function(other) {
      var $a, $b, $c, TMP_12, self = this;

      return ((($a = self.$hash()['$=='](other.$hash())) !== false && $a !== nil) ? $a : ($b = ($c = other.$each_with_index())['$all?'], $b._p = (TMP_12 = function(object, index){var self = TMP_12._s || this;
if (object == null) object = nil;if (index == null) index = nil;
      return self['$[]'](self.$members()['$[]'](index))['$=='](object)}, TMP_12._s = self, TMP_12), $b).call($c));
    };

    def.$length = function() {
      var self = this;

      return self.$members().$length();
    };

    $opal.defn(self, '$size', def.$length);

    def.$to_a = function() {
      var $a, $b, TMP_13, self = this;

      return ($a = ($b = self.$members()).$map, $a._p = (TMP_13 = function(name){var self = TMP_13._s || this;
if (name == null) name = nil;
      return self['$[]'](name)}, TMP_13._s = self, TMP_13), $a).call($b);
    };

    $opal.defn(self, '$values', def.$to_a);

    def.$inspect = function() {
      var $a, $b, TMP_14, self = this, result = nil;

      result = "#<struct ";
      if (self.$class()['$==']($scope.Struct)) {
        result = result['$+']("" + (self.$class().$name()) + " ")};
      result = result['$+'](($a = ($b = self.$each_pair()).$map, $a._p = (TMP_14 = function(name, value){var self = TMP_14._s || this;
if (name == null) name = nil;if (value == null) value = nil;
      return "" + (name) + "=" + (value.$inspect())}, TMP_14._s = self, TMP_14), $a).call($b).$join(", "));
      result = result['$+'](">");
      return result;
    };

    return $opal.defn(self, '$to_s', def.$inspect);
  })(self, null)
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/struct.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module, $gvars = $opal.gvars;
  if ($gvars.stdout == null) $gvars.stdout = nil;
  if ($gvars.stderr == null) $gvars.stderr = nil;

  $opal.add_stubs(['$write', '$join', '$map', '$String', '$getbyte', '$getc', '$raise', '$new', '$to_s', '$extend']);
  (function($base, $super) {
    function $IO(){};
    var self = $IO = $klass($base, $super, 'IO', $IO);

    var def = self._proto, $scope = self._scope;

    $opal.cdecl($scope, 'SEEK_SET', 0);

    $opal.cdecl($scope, 'SEEK_CUR', 1);

    $opal.cdecl($scope, 'SEEK_END', 2);

    (function($base) {
      var self = $module($base, 'Writable');

      var def = self._proto, $scope = self._scope;

      def['$<<'] = function(string) {
        var self = this;

        self.$write(string);
        return self;
      };

      def.$print = function(args) {
        var $a, $b, TMP_1, self = this;
        if ($gvars[","] == null) $gvars[","] = nil;

        args = $slice.call(arguments, 0);
        return self.$write(($a = ($b = args).$map, $a._p = (TMP_1 = function(arg){var self = TMP_1._s || this;
if (arg == null) arg = nil;
        return self.$String(arg)}, TMP_1._s = self, TMP_1), $a).call($b).$join($gvars[","]));
      };

      def.$puts = function(args) {
        var $a, $b, TMP_2, self = this;
        if ($gvars["/"] == null) $gvars["/"] = nil;

        args = $slice.call(arguments, 0);
        return self.$write(($a = ($b = args).$map, $a._p = (TMP_2 = function(arg){var self = TMP_2._s || this;
if (arg == null) arg = nil;
        return self.$String(arg)}, TMP_2._s = self, TMP_2), $a).call($b).$join($gvars["/"]));
      };
            ;$opal.donate(self, ["$<<", "$print", "$puts"]);
    })(self);

    return (function($base) {
      var self = $module($base, 'Readable');

      var def = self._proto, $scope = self._scope;

      def.$readbyte = function() {
        var self = this;

        return self.$getbyte();
      };

      def.$readchar = function() {
        var self = this;

        return self.$getc();
      };

      def.$readline = function(sep) {
        var self = this;
        if ($gvars["/"] == null) $gvars["/"] = nil;

        if (sep == null) {
          sep = $gvars["/"]
        }
        return self.$raise($scope.NotImplementedError);
      };

      def.$readpartial = function(integer, outbuf) {
        var self = this;

        if (outbuf == null) {
          outbuf = nil
        }
        return self.$raise($scope.NotImplementedError);
      };
            ;$opal.donate(self, ["$readbyte", "$readchar", "$readline", "$readpartial"]);
    })(self);
  })(self, null);
  $opal.cdecl($scope, 'STDERR', $gvars.stderr = $scope.IO.$new());
  $opal.cdecl($scope, 'STDIN', $gvars.stdin = $scope.IO.$new());
  $opal.cdecl($scope, 'STDOUT', $gvars.stdout = $scope.IO.$new());
  $opal.defs($gvars.stdout, '$write', function(string) {
    var self = this;

    console.log(string.$to_s());;
    return nil;
  });
  $opal.defs($gvars.stderr, '$write', function(string) {
    var self = this;

    console.warn(string.$to_s());;
    return nil;
  });
  $gvars.stdout.$extend(($scope.IO)._scope.Writable);
  return $gvars.stderr.$extend(($scope.IO)._scope.Writable);
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/io.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice;

  $opal.add_stubs(['$include']);
  $opal.defs(self, '$to_s', function() {
    var self = this;

    return "main";
  });
  return ($opal.defs(self, '$include', function(mod) {
    var self = this;

    return $scope.Object.$include(mod);
  }), nil) && 'include';
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/main.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $gvars = $opal.gvars, $hash2 = $opal.hash2;

  $opal.add_stubs(['$new']);
  $gvars["&"] = $gvars["~"] = $gvars["`"] = $gvars["'"] = nil;
  $gvars[":"] = [];
  $gvars["\""] = [];
  $gvars["/"] = "\n";
  $gvars[","] = nil;
  $opal.cdecl($scope, 'ARGV', []);
  $opal.cdecl($scope, 'ARGF', $scope.Object.$new());
  $opal.cdecl($scope, 'ENV', $hash2([], {}));
  $gvars.VERBOSE = false;
  $gvars.DEBUG = false;
  $gvars.SAFE = 0;
  $opal.cdecl($scope, 'RUBY_PLATFORM', "opal");
  $opal.cdecl($scope, 'RUBY_ENGINE', "opal");
  $opal.cdecl($scope, 'RUBY_VERSION', "2.1.1");
  $opal.cdecl($scope, 'RUBY_ENGINE_VERSION', "0.6.1");
  return $opal.cdecl($scope, 'RUBY_RELEASE_DATE', "2014-04-15");
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/corelib/variables.js.map
;
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice;

  $opal.add_stubs([]);
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  return true;
})(Opal);

//# sourceMappingURL=/__opal_source_maps__/opal.js.map
;

/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $module = $opal.module;

  (function($base, $super) {
    function $Set(){};
    var self = $Set = $klass($base, $super, 'Set', $Set);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_4, TMP_6;

    def.hash = nil;
    self.$include($scope.Enumerable);

    $opal.defs(self, '$[]', function(ary) {
      var self = this;

      ary = $slice.call(arguments, 0);
      return self.$new(ary);
    });

    def.$initialize = TMP_1 = function(enum$) {
      var $a, $b, TMP_2, self = this, $iter = TMP_1._p, block = $iter || nil;

      if (enum$ == null) {
        enum$ = nil
      }
      TMP_1._p = null;
      self.hash = $scope.Hash.$new();
      if ((($a = enum$['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return nil};
      if (block !== false && block !== nil) {
        return ($a = ($b = self).$do_with_enum, $a._p = (TMP_2 = function(o){var self = TMP_2._s || this;
if (o == null) o = nil;
        return self.$add(block['$[]'](o))}, TMP_2._s = self, TMP_2), $a).call($b, enum$)
        } else {
        return self.$merge(enum$)
      };
    };

    def['$=='] = function(other) {
      var $a, $b, TMP_3, self = this;

      if ((($a = self['$equal?'](other)) !== nil && (!$a._isBoolean || $a == true))) {
        return true
      } else if ((($a = other['$instance_of?'](self.$class())) !== nil && (!$a._isBoolean || $a == true))) {
        return self.hash['$=='](other.$instance_variable_get("@hash"))
      } else if ((($a = ($b = other['$is_a?']($scope.Set), $b !== false && $b !== nil ?self.$size()['$=='](other.$size()) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        return ($a = ($b = other)['$all?'], $a._p = (TMP_3 = function(o){var self = TMP_3._s || this;
          if (self.hash == null) self.hash = nil;
if (o == null) o = nil;
        return self.hash['$include?'](o)}, TMP_3._s = self, TMP_3), $a).call($b)
        } else {
        return false
      };
    };

    def.$add = function(o) {
      var self = this;

      self.hash['$[]='](o, true);
      return self;
    };

    $opal.defn(self, '$<<', def.$add);

    def['$add?'] = function(o) {
      var $a, self = this;

      if ((($a = self['$include?'](o)) !== nil && (!$a._isBoolean || $a == true))) {
        return nil
        } else {
        return self.$add(o)
      };
    };

    def.$each = TMP_4 = function() {
      var $a, $b, self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each")
      };
      ($a = ($b = self.hash).$each_key, $a._p = block.$to_proc(), $a).call($b);
      return self;
    };

    def['$empty?'] = function() {
      var self = this;

      return self.hash['$empty?']();
    };

    def.$clear = function() {
      var self = this;

      self.hash.$clear();
      return self;
    };

    def['$include?'] = function(o) {
      var self = this;

      return self.hash['$include?'](o);
    };

    $opal.defn(self, '$member?', def['$include?']);

    def.$merge = function(enum$) {
      var $a, $b, TMP_5, self = this;

      ($a = ($b = self).$do_with_enum, $a._p = (TMP_5 = function(o){var self = TMP_5._s || this;
if (o == null) o = nil;
      return self.$add(o)}, TMP_5._s = self, TMP_5), $a).call($b, enum$);
      return self;
    };

    def.$do_with_enum = TMP_6 = function(enum$) {
      var $a, $b, self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      return ($a = ($b = enum$).$each, $a._p = block.$to_proc(), $a).call($b);
    };

    def.$size = function() {
      var self = this;

      return self.hash.$size();
    };

    $opal.defn(self, '$length', def.$size);

    return (def.$to_a = function() {
      var self = this;

      return self.hash.$keys();
    }, nil) && 'to_a';
  })(self, null);
  return (function($base) {
    var self = $module($base, 'Enumerable');

    var def = self._proto, $scope = self._scope, TMP_7;

    def.$to_set = TMP_7 = function(klass, args) {
      var $a, $b, self = this, $iter = TMP_7._p, block = $iter || nil;

      args = $slice.call(arguments, 1);
      if (klass == null) {
        klass = $scope.Set
      }
      TMP_7._p = null;
      return ($a = ($b = klass).$new, $a._p = block.$to_proc(), $a).apply($b, [self].concat(args));
    }
        ;$opal.donate(self, ["$to_set"]);
  })(self);
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  return (function($base) {
    var self = $module($base, 'Comparable');

    var def = self._proto, $scope = self._scope;

    $opal.defs(self, '$normalize', function(what) {
      var $a, self = this;

      if ((($a = $scope.Integer['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
        return what};
      if (what['$>'](0)) {
        return 1};
      if (what['$<'](0)) {
        return -1};
      return 0;
    });

    def['$=='] = function(other) {
      var $a, self = this, cmp = nil;

      try {
      if ((($a = self['$equal?'](other)) !== nil && (!$a._isBoolean || $a == true))) {
          return true};
        if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return false
        };
        return $scope.Comparable.$normalize(cmp)['$=='](0);
      } catch ($err) {if ($opal.$rescue($err, [$scope.StandardError])) {
        return false
        }else { throw $err; }
      };
    };

    def['$>'] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.Comparable.$normalize(cmp)['$>'](0);
    };

    def['$>='] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.Comparable.$normalize(cmp)['$>='](0);
    };

    def['$<'] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.Comparable.$normalize(cmp)['$<'](0);
    };

    def['$<='] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return $scope.Comparable.$normalize(cmp)['$<='](0);
    };

    def['$between?'] = function(min, max) {
      var self = this;

      if (self['$<'](min)) {
        return false};
      if (self['$>'](max)) {
        return false};
      return true;
    };
        ;$opal.donate(self, ["$==", "$>", "$>=", "$<", "$<=", "$between?"]);
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars;

  ;
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3, TMP_4, TMP_5, TMP_6, TMP_7;

    def.length = nil;
    self.$include($scope.Comparable);

    def._isString = true;

    $opal.defs(self, '$try_convert', function(what) {
      var self = this;

      try {
      return what.$to_str()
      } catch ($err) {if (true) {
        return nil
        }else { throw $err; }
      };
    });

    $opal.defs(self, '$new', function(str) {
      var self = this;

      if (str == null) {
        str = ""
      }
      return new String(str);
    });

    def['$%'] = function(data) {
      var $a, self = this;

      if ((($a = $scope.Array['$==='](data)) !== nil && (!$a._isBoolean || $a == true))) {
        return ($a = self).$format.apply($a, [self].concat(data))
        } else {
        return self.$format(self, data)
      };
    };

    def['$*'] = function(count) {
      var self = this;

      
      if (count < 1) {
        return '';
      }

      var result  = '',
          pattern = self;

      while (count > 0) {
        if (count & 1) {
          result += pattern;
        }

        count >>= 1;
        pattern += pattern;
      }

      return result;
    
    };

    def['$+'] = function(other) {
      var self = this;

      other = $scope.Opal.$coerce_to(other, $scope.String, "to_str");
      return self + other.$to_s();
    };

    def['$<=>'] = function(other) {
      var $a, self = this;

      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        other = other.$to_str().$to_s();
        return self > other ? 1 : (self < other ? -1 : 0);
        } else {
        
        var cmp = other['$<=>'](self);

        if (cmp === nil) {
          return nil;
        }
        else {
          return cmp > 0 ? -1 : (cmp < 0 ? 1 : 0);
        }
      ;
      };
    };

    def['$=='] = function(other) {
      var $a, self = this;

      if ((($a = $scope.String['$==='](other)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        return false
      };
      return self.$to_s() == other.$to_s();
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$===', def['$==']);

    def['$=~'] = function(other) {
      var self = this;

      
      if (other._isString) {
        self.$raise($scope.TypeError, "type mismatch: String given");
      }

      return other['$=~'](self);
    ;
    };

    def['$[]'] = function(index, length) {
      var self = this;

      
      var size = self.length;

      if (index._isRange) {
        var exclude = index.exclude,
            length  = index.end,
            index   = index.begin;

        if (index < 0) {
          index += size;
        }

        if (length < 0) {
          length += size;
        }

        if (!exclude) {
          length += 1;
        }

        if (index > size) {
          return nil;
        }

        length = length - index;

        if (length < 0) {
          length = 0;
        }

        return self.substr(index, length);
      }

      if (index < 0) {
        index += self.length;
      }

      if (length == null) {
        if (index >= self.length || index < 0) {
          return nil;
        }

        return self.substr(index, 1);
      }

      if (index > self.length || index < 0) {
        return nil;
      }

      return self.substr(index, length);
    
    };

    def.$capitalize = function() {
      var self = this;

      return self.charAt(0).toUpperCase() + self.substr(1).toLowerCase();
    };

    def.$casecmp = function(other) {
      var self = this;

      other = $scope.Opal.$coerce_to(other, $scope.String, "to_str").$to_s();
      return (self.toLowerCase())['$<=>'](other.toLowerCase());
    };

    def.$center = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = $scope.Opal.$coerce_to(width, $scope.Integer, "to_int");
      padstr = $scope.Opal.$coerce_to(padstr, $scope.String, "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      
      var ljustified = self.$ljust((width['$+'](self.length))['$/'](2).$ceil(), padstr),
          rjustified = self.$rjust((width['$+'](self.length))['$/'](2).$floor(), padstr);

      return rjustified + ljustified.slice(self.length);
    ;
    };

    def.$chars = TMP_1 = function() {
      var $a, $b, self = this, $iter = TMP_1._p, block = $iter || nil;

      TMP_1._p = null;
      if (block !== false && block !== nil) {
        } else {
        return self.$each_char().$to_a()
      };
      return ($a = ($b = self).$each_char, $a._p = block.$to_proc(), $a).call($b);
    };

    def.$chomp = function(separator) {
      var $a, self = this;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      if ((($a = separator === nil || self.length === 0) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      separator = $scope.Opal['$coerce_to!'](separator, $scope.String, "to_str").$to_s();
      
      if (separator === "\n") {
        return self.replace(/\r?\n?$/, '');
      }
      else if (separator === "") {
        return self.replace(/(\r?\n)+$/, '');
      }
      else if (self.length > separator.length) {
        var tail = self.substr(self.length - separator.length, separator.length);

        if (tail === separator) {
          return self.substr(0, self.length - separator.length);
        }
      }
    
      return self;
    };

    def.$chop = function() {
      var self = this;

      
      var length = self.length;

      if (length <= 1) {
        return "";
      }

      if (self.charAt(length - 1) === "\n" && self.charAt(length - 2) === "\r") {
        return self.substr(0, length - 2);
      }
      else {
        return self.substr(0, length - 1);
      }
    
    };

    def.$chr = function() {
      var self = this;

      return self.charAt(0);
    };

    def.$clone = function() {
      var self = this, copy = nil;

      copy = self.slice();
      copy.$initialize_clone(self);
      return copy;
    };

    def.$dup = function() {
      var self = this, copy = nil;

      copy = self.slice();
      copy.$initialize_dup(self);
      return copy;
    };

    def.$count = function(str) {
      var self = this;

      return (self.length - self.replace(new RegExp(str, 'g'), '').length) / str.length;
    };

    $opal.defn(self, '$dup', def.$clone);

    def.$downcase = function() {
      var self = this;

      return self.toLowerCase();
    };

    def.$each_char = TMP_2 = function() {
      var $a, self = this, $iter = TMP_2._p, block = $iter || nil;

      TMP_2._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_char")
      };
      
      for (var i = 0, length = self.length; i < length; i++) {
        ((($a = $opal.$yield1(block, self.charAt(i))) === $breaker) ? $breaker.$v : $a);
      }
    
      return self;
    };

    def.$each_line = TMP_3 = function(separator) {
      var $a, self = this, $iter = TMP_3._p, $yield = $iter || nil;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      TMP_3._p = null;
      if (($yield !== nil)) {
        } else {
        return self.$split(separator)
      };
      
      var chomped  = self.$chomp(),
          trailing = self.length != chomped.length,
          splitted = chomped.split(separator);

      for (var i = 0, length = splitted.length; i < length; i++) {
        if (i < length - 1 || trailing) {
          ((($a = $opal.$yield1($yield, splitted[i] + separator)) === $breaker) ? $breaker.$v : $a);
        }
        else {
          ((($a = $opal.$yield1($yield, splitted[i])) === $breaker) ? $breaker.$v : $a);
        }
      }
    ;
      return self;
    };

    def['$empty?'] = function() {
      var self = this;

      return self.length === 0;
    };

    def['$end_with?'] = function(suffixes) {
      var self = this;

      suffixes = $slice.call(arguments, 0);
      
      for (var i = 0, length = suffixes.length; i < length; i++) {
        var suffix = $scope.Opal.$coerce_to(suffixes[i], $scope.String, "to_str").$to_s();

        if (self.length >= suffix.length &&
            self.substr(self.length - suffix.length, suffix.length) == suffix) {
          return true;
        }
      }
    
      return false;
    };

    $opal.defn(self, '$eql?', def['$==']);

    $opal.defn(self, '$equal?', def['$===']);

    def.$gsub = TMP_4 = function(pattern, replace) {
      var $a, $b, self = this, $iter = TMP_4._p, block = $iter || nil;

      TMP_4._p = null;
      if ((($a = ((($b = $scope.String['$==='](pattern)) !== false && $b !== nil) ? $b : pattern['$respond_to?']("to_str"))) !== nil && (!$a._isBoolean || $a == true))) {
        pattern = (new RegExp("" + $scope.Regexp.$escape(pattern.$to_str())))};
      if ((($a = $scope.Regexp['$==='](pattern)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.TypeError, "wrong argument type " + (pattern.$class()) + " (expected Regexp)")
      };
      
      var pattern = pattern.toString(),
          options = pattern.substr(pattern.lastIndexOf('/') + 1) + 'g',
          regexp  = pattern.substr(1, pattern.lastIndexOf('/') - 1);

      self.$sub._p = block;
      return self.$sub(new RegExp(regexp, options), replace);
    
    };

    def.$hash = function() {
      var self = this;

      return self.toString();
    };

    def.$hex = function() {
      var self = this;

      return self.$to_i(16);
    };

    def['$include?'] = function(other) {
      var $a, self = this;

      
      if (other._isString) {
        return self.indexOf(other) !== -1;
      }
    
      if ((($a = other['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.TypeError, "no implicit conversion of " + (other.$class().$name()) + " into String")
      };
      return self.indexOf(other.$to_str()) !== -1;
    };

    def.$index = function(what, offset) {
      var $a, self = this, result = nil;

      if (offset == null) {
        offset = nil
      }
      if ((($a = $scope.String['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
        what = what.$to_s()
      } else if ((($a = what['$respond_to?']("to_str")) !== nil && (!$a._isBoolean || $a == true))) {
        what = what.$to_str().$to_s()
      } else if ((($a = $scope.Regexp['$==='](what)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.TypeError, "type mismatch: " + (what.$class()) + " given")};
      result = -1;
      if (offset !== false && offset !== nil) {
        offset = $scope.Opal.$coerce_to(offset, $scope.Integer, "to_int");
        
        var size = self.length;

        if (offset < 0) {
          offset = offset + size;
        }

        if (offset > size) {
          return nil;
        }
      
        if ((($a = $scope.Regexp['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
          result = ((($a = (what['$=~'](self.substr(offset)))) !== false && $a !== nil) ? $a : -1)
          } else {
          result = self.substr(offset).indexOf(what)
        };
        
        if (result !== -1) {
          result += offset;
        }
      
      } else if ((($a = $scope.Regexp['$==='](what)) !== nil && (!$a._isBoolean || $a == true))) {
        result = ((($a = (what['$=~'](self))) !== false && $a !== nil) ? $a : -1)
        } else {
        result = self.indexOf(what)
      };
      if ((($a = result === -1) !== nil && (!$a._isBoolean || $a == true))) {
        return nil
        } else {
        return result
      };
    };

    def.$inspect = function() {
      var self = this;

      
      var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
          meta      = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
          };

      escapable.lastIndex = 0;

      return escapable.test(self) ? '"' + self.replace(escapable, function(a) {
        var c = meta[a];

        return typeof c === 'string' ? c :
          '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + self + '"';
    
    };

    def.$intern = function() {
      var self = this;

      return self;
    };

    def.$lines = function(separator) {
      var self = this;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      return self.$each_line(separator).$to_a();
    };

    def.$length = function() {
      var self = this;

      return self.length;
    };

    def.$ljust = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = $scope.Opal.$coerce_to(width, $scope.Integer, "to_int");
      padstr = $scope.Opal.$coerce_to(padstr, $scope.String, "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      
      var index  = -1,
          result = "";

      width -= self.length;

      while (++index < width) {
        result += padstr;
      }

      return self + result.slice(0, width);
    
    };

    def.$lstrip = function() {
      var self = this;

      return self.replace(/^\s*/, '');
    };

    def.$match = TMP_5 = function(pattern, pos) {
      var $a, $b, self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      if ((($a = ((($b = $scope.String['$==='](pattern)) !== false && $b !== nil) ? $b : pattern['$respond_to?']("to_str"))) !== nil && (!$a._isBoolean || $a == true))) {
        pattern = (new RegExp("" + $scope.Regexp.$escape(pattern.$to_str())))};
      if ((($a = $scope.Regexp['$==='](pattern)) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.TypeError, "wrong argument type " + (pattern.$class()) + " (expected Regexp)")
      };
      return ($a = ($b = pattern).$match, $a._p = block.$to_proc(), $a).call($b, self, pos);
    };

    def.$next = function() {
      var self = this;

      
      if (self.length === 0) {
        return "";
      }

      var initial = self.substr(0, self.length - 1);
      var last    = String.fromCharCode(self.charCodeAt(self.length - 1) + 1);

      return initial + last;
    
    };

    def.$ord = function() {
      var self = this;

      return self.charCodeAt(0);
    };

    def.$partition = function(str) {
      var self = this;

      
      var result = self.split(str);
      var splitter = (result[0].length === self.length ? "" : str);

      return [result[0], splitter, result.slice(1).join(str.toString())];
    
    };

    def.$reverse = function() {
      var self = this;

      return self.split('').reverse().join('');
    };

    def.$rindex = function(search, offset) {
      var self = this;

      
      var search_type = (search == null ? Opal.NilClass : search.constructor);
      if (search_type != String && search_type != RegExp) {
        var msg = "type mismatch: " + search_type + " given";
        self.$raise($scope.TypeError.$new(msg));
      }

      if (self.length == 0) {
        return search.length == 0 ? 0 : nil;
      }

      var result = -1;
      if (offset != null) {
        if (offset < 0) {
          offset = self.length + offset;
        }

        if (search_type == String) {
          result = self.lastIndexOf(search, offset);
        }
        else {
          result = self.substr(0, offset + 1).$reverse().search(search);
          if (result !== -1) {
            result = offset - result;
          }
        }
      }
      else {
        if (search_type == String) {
          result = self.lastIndexOf(search);
        }
        else {
          result = self.$reverse().search(search);
          if (result !== -1) {
            result = self.length - 1 - result;
          }
        }
      }

      return result === -1 ? nil : result;
    
    };

    def.$rjust = function(width, padstr) {
      var $a, self = this;

      if (padstr == null) {
        padstr = " "
      }
      width = $scope.Opal.$coerce_to(width, $scope.Integer, "to_int");
      padstr = $scope.Opal.$coerce_to(padstr, $scope.String, "to_str").$to_s();
      if ((($a = padstr['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        self.$raise($scope.ArgumentError, "zero width padding")};
      if ((($a = width <= self.length) !== nil && (!$a._isBoolean || $a == true))) {
        return self};
      
      var chars     = Math.floor(width - self.length),
          patterns  = Math.floor(chars / padstr.length),
          result    = Array(patterns + 1).join(padstr),
          remaining = chars - result.length;

      return result + padstr.slice(0, remaining) + self;
    
    };

    def.$rstrip = function() {
      var self = this;

      return self.replace(/\s*$/, '');
    };

    def.$scan = TMP_6 = function(pattern) {
      var self = this, $iter = TMP_6._p, block = $iter || nil;

      TMP_6._p = null;
      
      if (pattern.global) {
        // should we clear it afterwards too?
        pattern.lastIndex = 0;
      }
      else {
        // rewrite regular expression to add the global flag to capture pre/post match
        pattern = new RegExp(pattern.source, 'g' + (pattern.multiline ? 'm' : '') + (pattern.ignoreCase ? 'i' : ''));
      }

      var result = [];
      var match;

      while ((match = pattern.exec(self)) != null) {
        var match_data = $scope.MatchData.$new(pattern, match);
        if (block === nil) {
          match.length == 1 ? result.push(match[0]) : result.push(match.slice(1));
        }
        else {
          match.length == 1 ? block(match[0]) : block.apply(self, match.slice(1));
        }
      }

      return (block !== nil ? self : result);
    
    };

    $opal.defn(self, '$size', def.$length);

    $opal.defn(self, '$slice', def['$[]']);

    def.$split = function(pattern, limit) {
      var self = this, $a;
      if ($gvars[";"] == null) $gvars[";"] = nil;

      if (pattern == null) {
        pattern = ((($a = $gvars[";"]) !== false && $a !== nil) ? $a : " ")
      }
      
      if (pattern === nil || pattern === undefined) {
        pattern = $gvars[";"];
      }

      var result = [];
      if (limit !== undefined) {
        limit = $scope.Opal['$coerce_to!'](limit, $scope.Integer, "to_int");
      }

      if (self.length === 0) {
        return [];
      }

      if (limit === 1) {
        return [self];
      }

      if (pattern && pattern._isRegexp) {
        var pattern_str = pattern.toString();

        /* Opal and JS's repr of an empty RE. */
        var blank_pattern = (pattern_str.substr(0, 3) == '/^/') ||
                  (pattern_str.substr(0, 6) == '/(?:)/');

        /* This is our fast path */
        if (limit === undefined || limit === 0) {
          result = self.split(blank_pattern ? /(?:)/ : pattern);
        }
        else {
          /* RegExp.exec only has sane behavior with global flag */
          if (! pattern.global) {
            pattern = eval(pattern_str + 'g');
          }

          var match_data;
          var prev_index = 0;
          pattern.lastIndex = 0;

          while ((match_data = pattern.exec(self)) !== null) {
            var segment = self.slice(prev_index, match_data.index);
            result.push(segment);

            prev_index = pattern.lastIndex;

            if (match_data[0].length === 0) {
              if (blank_pattern) {
                /* explicitly split on JS's empty RE form.*/
                pattern = /(?:)/;
              }

              result = self.split(pattern);
              /* with "unlimited", ruby leaves a trail on blanks. */
              if (limit !== undefined && limit < 0 && blank_pattern) {
                result.push('');
              }

              prev_index = undefined;
              break;
            }

            if (limit !== undefined && limit > 1 && result.length + 1 == limit) {
              break;
            }
          }

          if (prev_index !== undefined) {
            result.push(self.slice(prev_index, self.length));
          }
        }
      }
      else {
        var splitted = 0, start = 0, lim = 0;

        if (pattern === nil || pattern === undefined) {
          pattern = ' '
        } else {
          pattern = $scope.Opal.$try_convert(pattern, $scope.String, "to_str").$to_s();
        }

        var string = (pattern == ' ') ? self.replace(/[\r\n\t\v]\s+/g, ' ')
                                      : self;
        var cursor = -1;
        while ((cursor = string.indexOf(pattern, start)) > -1 && cursor < string.length) {
          if (splitted + 1 === limit) {
            break;
          }

          if (pattern == ' ' && cursor == start) {
            start = cursor + 1;
            continue;
          }

          result.push(string.substr(start, pattern.length ? cursor - start : 1));
          splitted++;

          start = cursor + (pattern.length ? pattern.length : 1);
        }

        if (string.length > 0 && (limit < 0 || string.length > start)) {
          if (string.length == start) {
            result.push('');
          }
          else {
            result.push(string.substr(start, string.length));
          }
        }
      }

      if (limit === undefined || limit === 0) {
        while (result[result.length-1] === '') {
          result.length = result.length - 1;
        }
      }

      if (limit > 0) {
        var tail = result.slice(limit - 1).join('');
        result.splice(limit - 1, result.length - 1, tail);
      }

      return result;
    ;
    };

    def.$squeeze = function(sets) {
      var self = this;

      sets = $slice.call(arguments, 0);
      
      if (sets.length === 0) {
        return self.replace(/(.)\1+/g, '$1');
      }
    
      
      var set = $scope.Opal.$coerce_to(sets[0], $scope.String, "to_str").$chars();

      for (var i = 1, length = sets.length; i < length; i++) {
        set = (set)['$&']($scope.Opal.$coerce_to(sets[i], $scope.String, "to_str").$chars());
      }

      if (set.length === 0) {
        return self;
      }

      return self.replace(new RegExp("([" + $scope.Regexp.$escape((set).$join()) + "])\\1+", "g"), "$1");
    ;
    };

    def['$start_with?'] = function(prefixes) {
      var self = this;

      prefixes = $slice.call(arguments, 0);
      
      for (var i = 0, length = prefixes.length; i < length; i++) {
        var prefix = $scope.Opal.$coerce_to(prefixes[i], $scope.String, "to_str").$to_s();

        if (self.indexOf(prefix) === 0) {
          return true;
        }
      }

      return false;
    
    };

    def.$strip = function() {
      var self = this;

      return self.replace(/^\s*/, '').replace(/\s*$/, '');
    };

    def.$sub = TMP_7 = function(pattern, replace) {
      var self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      
      if (typeof(replace) === 'string') {
        // convert Ruby back reference to JavaScript back reference
        replace = replace.replace(/\\([1-9])/g, '$$$1')
        return self.replace(pattern, replace);
      }
      if (block !== nil) {
        return self.replace(pattern, function() {
          // FIXME: this should be a formal MatchData object with all the goodies
          var match_data = []
          for (var i = 0, len = arguments.length; i < len; i++) {
            var arg = arguments[i];
            if (arg == undefined) {
              match_data.push(nil);
            }
            else {
              match_data.push(arg);
            }
          }

          var str = match_data.pop();
          var offset = match_data.pop();
          var match_len = match_data.length;

          // $1, $2, $3 not being parsed correctly in Ruby code
          //for (var i = 1; i < match_len; i++) {
          //  __gvars[String(i)] = match_data[i];
          //}
          $gvars["&"] = match_data[0];
          $gvars["~"] = match_data;
          return block(match_data[0]);
        });
      }
      else if (replace !== undefined) {
        if (replace['$is_a?']($scope.Hash)) {
          return self.replace(pattern, function(str) {
            var value = replace['$[]'](self.$str());

            return (value == null) ? nil : self.$value().$to_s();
          });
        }
        else {
          replace = $scope.String.$try_convert(replace);

          if (replace == null) {
            self.$raise($scope.TypeError, "can't convert " + (replace.$class()) + " into String");
          }

          return self.replace(pattern, replace);
        }
      }
      else {
        // convert Ruby back reference to JavaScript back reference
        replace = replace.toString().replace(/\\([1-9])/g, '$$$1')
        return self.replace(pattern, replace);
      }
    ;
    };

    $opal.defn(self, '$succ', def.$next);

    def.$sum = function(n) {
      var self = this;

      if (n == null) {
        n = 16
      }
      
      var result = 0;

      for (var i = 0, length = self.length; i < length; i++) {
        result += (self.charCodeAt(i) % ((1 << n) - 1));
      }

      return result;
    
    };

    def.$swapcase = function() {
      var self = this;

      
      var str = self.replace(/([a-z]+)|([A-Z]+)/g, function($0,$1,$2) {
        return $1 ? $0.toUpperCase() : $0.toLowerCase();
      });

      if (self.constructor === String) {
        return str;
      }

      return self.$class().$new(str);
    
    };

    def.$to_f = function() {
      var self = this;

      
      if (self.charAt(0) === '_') {
        return 0;
      }

      var result = parseFloat(self.replace(/_/g, ''));

      if (isNaN(result) || result == Infinity || result == -Infinity) {
        return 0;
      }
      else {
        return result;
      }
    
    };

    def.$to_i = function(base) {
      var self = this;

      if (base == null) {
        base = 10
      }
      
      var result = parseInt(self, base);

      if (isNaN(result)) {
        return 0;
      }

      return result;
    
    };

    def.$to_proc = function() {
      var $a, $b, TMP_8, self = this;

      return ($a = ($b = self).$proc, $a._p = (TMP_8 = function(recv, args){var self = TMP_8._s || this, $a;
if (recv == null) recv = nil;args = $slice.call(arguments, 1);
      return ($a = recv).$send.apply($a, [self].concat(args))}, TMP_8._s = self, TMP_8), $a).call($b);
    };

    def.$to_s = function() {
      var self = this;

      return self.toString();
    };

    $opal.defn(self, '$to_str', def.$to_s);

    $opal.defn(self, '$to_sym', def.$intern);

    def.$tr = function(from, to) {
      var self = this;

      
      if (from.length == 0 || from === to) {
        return self;
      }

      var subs = {};
      var from_chars = from.split('');
      var from_length = from_chars.length;
      var to_chars = to.split('');
      var to_length = to_chars.length;

      var inverse = false;
      var global_sub = null;
      if (from_chars[0] === '^') {
        inverse = true;
        from_chars.shift();
        global_sub = to_chars[to_length - 1]
        from_length -= 1;
      }

      var from_chars_expanded = [];
      var last_from = null;
      var in_range = false;
      for (var i = 0; i < from_length; i++) {
        var ch = from_chars[i];
        if (last_from == null) {
          last_from = ch;
          from_chars_expanded.push(ch);
        }
        else if (ch === '-') {
          if (last_from === '-') {
            from_chars_expanded.push('-');
            from_chars_expanded.push('-');
          }
          else if (i == from_length - 1) {
            from_chars_expanded.push('-');
          }
          else {
            in_range = true;
          }
        }
        else if (in_range) {
          var start = last_from.charCodeAt(0) + 1;
          var end = ch.charCodeAt(0);
          for (var c = start; c < end; c++) {
            from_chars_expanded.push(String.fromCharCode(c));
          }
          from_chars_expanded.push(ch);
          in_range = null;
          last_from = null;
        }
        else {
          from_chars_expanded.push(ch);
        }
      }

      from_chars = from_chars_expanded;
      from_length = from_chars.length;

      if (inverse) {
        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = true;
        }
      }
      else {
        if (to_length > 0) {
          var to_chars_expanded = [];
          var last_to = null;
          var in_range = false;
          for (var i = 0; i < to_length; i++) {
            var ch = to_chars[i];
            if (last_from == null) {
              last_from = ch;
              to_chars_expanded.push(ch);
            }
            else if (ch === '-') {
              if (last_to === '-') {
                to_chars_expanded.push('-');
                to_chars_expanded.push('-');
              }
              else if (i == to_length - 1) {
                to_chars_expanded.push('-');
              }
              else {
                in_range = true;
              }
            }
            else if (in_range) {
              var start = last_from.charCodeAt(0) + 1;
              var end = ch.charCodeAt(0);
              for (var c = start; c < end; c++) {
                to_chars_expanded.push(String.fromCharCode(c));
              }
              to_chars_expanded.push(ch);
              in_range = null;
              last_from = null;
            }
            else {
              to_chars_expanded.push(ch);
            }
          }

          to_chars = to_chars_expanded;
          to_length = to_chars.length;
        }

        var length_diff = from_length - to_length;
        if (length_diff > 0) {
          var pad_char = (to_length > 0 ? to_chars[to_length - 1] : '');
          for (var i = 0; i < length_diff; i++) {
            to_chars.push(pad_char);
          }
        }

        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = to_chars[i];
        }
      }

      var new_str = ''
      for (var i = 0, length = self.length; i < length; i++) {
        var ch = self.charAt(i);
        var sub = subs[ch];
        if (inverse) {
          new_str += (sub == null ? global_sub : ch);
        }
        else {
          new_str += (sub != null ? sub : ch);
        }
      }
      return new_str;
    
    };

    def.$tr_s = function(from, to) {
      var self = this;

      
      if (from.length == 0) {
        return self;
      }

      var subs = {};
      var from_chars = from.split('');
      var from_length = from_chars.length;
      var to_chars = to.split('');
      var to_length = to_chars.length;

      var inverse = false;
      var global_sub = null;
      if (from_chars[0] === '^') {
        inverse = true;
        from_chars.shift();
        global_sub = to_chars[to_length - 1]
        from_length -= 1;
      }

      var from_chars_expanded = [];
      var last_from = null;
      var in_range = false;
      for (var i = 0; i < from_length; i++) {
        var ch = from_chars[i];
        if (last_from == null) {
          last_from = ch;
          from_chars_expanded.push(ch);
        }
        else if (ch === '-') {
          if (last_from === '-') {
            from_chars_expanded.push('-');
            from_chars_expanded.push('-');
          }
          else if (i == from_length - 1) {
            from_chars_expanded.push('-');
          }
          else {
            in_range = true;
          }
        }
        else if (in_range) {
          var start = last_from.charCodeAt(0) + 1;
          var end = ch.charCodeAt(0);
          for (var c = start; c < end; c++) {
            from_chars_expanded.push(String.fromCharCode(c));
          }
          from_chars_expanded.push(ch);
          in_range = null;
          last_from = null;
        }
        else {
          from_chars_expanded.push(ch);
        }
      }

      from_chars = from_chars_expanded;
      from_length = from_chars.length;

      if (inverse) {
        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = true;
        }
      }
      else {
        if (to_length > 0) {
          var to_chars_expanded = [];
          var last_to = null;
          var in_range = false;
          for (var i = 0; i < to_length; i++) {
            var ch = to_chars[i];
            if (last_from == null) {
              last_from = ch;
              to_chars_expanded.push(ch);
            }
            else if (ch === '-') {
              if (last_to === '-') {
                to_chars_expanded.push('-');
                to_chars_expanded.push('-');
              }
              else if (i == to_length - 1) {
                to_chars_expanded.push('-');
              }
              else {
                in_range = true;
              }
            }
            else if (in_range) {
              var start = last_from.charCodeAt(0) + 1;
              var end = ch.charCodeAt(0);
              for (var c = start; c < end; c++) {
                to_chars_expanded.push(String.fromCharCode(c));
              }
              to_chars_expanded.push(ch);
              in_range = null;
              last_from = null;
            }
            else {
              to_chars_expanded.push(ch);
            }
          }

          to_chars = to_chars_expanded;
          to_length = to_chars.length;
        }

        var length_diff = from_length - to_length;
        if (length_diff > 0) {
          var pad_char = (to_length > 0 ? to_chars[to_length - 1] : '');
          for (var i = 0; i < length_diff; i++) {
            to_chars.push(pad_char);
          }
        }

        for (var i = 0; i < from_length; i++) {
          subs[from_chars[i]] = to_chars[i];
        }
      }
      var new_str = ''
      var last_substitute = null
      for (var i = 0, length = self.length; i < length; i++) {
        var ch = self.charAt(i);
        var sub = subs[ch]
        if (inverse) {
          if (sub == null) {
            if (last_substitute == null) {
              new_str += global_sub;
              last_substitute = true;
            }
          }
          else {
            new_str += ch;
            last_substitute = null;
          }
        }
        else {
          if (sub != null) {
            if (last_substitute == null || last_substitute !== sub) {
              new_str += sub;
              last_substitute = sub;
            }
          }
          else {
            new_str += ch;
            last_substitute = null;
          }
        }
      }
      return new_str;
    
    };

    def.$upcase = function() {
      var self = this;

      return self.toUpperCase();
    };

    def.$freeze = function() {
      var self = this;

      return self;
    };

    return (def['$frozen?'] = function() {
      var self = this;

      return true;
    }, nil) && 'frozen?';
  })(self, null);
  return $opal.cdecl($scope, 'Symbol', $scope.String);
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, $b, TMP_4, $c, TMP_6, $d, TMP_8, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $hash2 = $opal.hash2;

  ;
  (function($base, $super) {
    function $Encoding(){};
    var self = $Encoding = $klass($base, $super, 'Encoding', $Encoding);

    var def = self._proto, $scope = self._scope, TMP_1;

    def.ascii = def.dummy = def.name = nil;
    $opal.defs(self, '$register', TMP_1 = function(name, options) {
      var $a, $b, $c, TMP_2, self = this, $iter = TMP_1._p, block = $iter || nil, names = nil, encoding = nil;

      if (options == null) {
        options = $hash2([], {})
      }
      TMP_1._p = null;
      names = [name]['$+']((((($a = options['$[]']("aliases")) !== false && $a !== nil) ? $a : [])));
      encoding = ($a = ($b = $scope.Class).$new, $a._p = block.$to_proc(), $a).call($b, self).$new(name, names, ((($a = options['$[]']("ascii")) !== false && $a !== nil) ? $a : false), ((($a = options['$[]']("dummy")) !== false && $a !== nil) ? $a : false));
      return ($a = ($c = names).$each, $a._p = (TMP_2 = function(name){var self = TMP_2._s || this;
if (name == null) name = nil;
      return self.$const_set(name.$sub("-", "_"), encoding)}, TMP_2._s = self, TMP_2), $a).call($c);
    });

    $opal.defs(self, '$find', function(name) {try {

      var $a, $b, TMP_3, self = this;

      if ((($a = self['$==='](name)) !== nil && (!$a._isBoolean || $a == true))) {
        return name};
      ($a = ($b = self.$constants()).$each, $a._p = (TMP_3 = function(const$){var self = TMP_3._s || this, $a, $b, encoding = nil;
if (const$ == null) const$ = nil;
      encoding = self.$const_get(const$);
        if ((($a = ((($b = encoding.$name()['$=='](name)) !== false && $b !== nil) ? $b : encoding.$names()['$include?'](name))) !== nil && (!$a._isBoolean || $a == true))) {
          $opal.$return(encoding)
          } else {
          return nil
        };}, TMP_3._s = self, TMP_3), $a).call($b);
      return self.$raise($scope.ArgumentError, "unknown encoding name - " + (name));
      } catch ($returner) { if ($returner === $opal.returner) { return $returner.$v } throw $returner; }
    });

    (function(self) {
      var $scope = self._scope, def = self._proto;

      return self.$attr_accessor("default_external")
    })(self.$singleton_class());

    self.$attr_reader("name", "names");

    def.$initialize = function(name, names, ascii, dummy) {
      var self = this;

      self.name = name;
      self.names = names;
      self.ascii = ascii;
      return self.dummy = dummy;
    };

    def['$ascii_compatible?'] = function() {
      var self = this;

      return self.ascii;
    };

    def['$dummy?'] = function() {
      var self = this;

      return self.dummy;
    };

    def.$to_s = function() {
      var self = this;

      return self.name;
    };

    def.$inspect = function() {
      var $a, self = this;

      return "#<Encoding:" + (self.name) + ((function() {if ((($a = self.dummy) !== nil && (!$a._isBoolean || $a == true))) {
        return " (dummy)"
        } else {
        return nil
      }; return nil; })()) + ">";
    };

    def.$each_byte = function() {
      var self = this;

      return self.$raise($scope.NotImplementedError);
    };

    def.$getbyte = function() {
      var self = this;

      return self.$raise($scope.NotImplementedError);
    };

    return (def.$bytesize = function() {
      var self = this;

      return self.$raise($scope.NotImplementedError);
    }, nil) && 'bytesize';
  })(self, null);
  ($a = ($b = $scope.Encoding).$register, $a._p = (TMP_4 = function(){var self = TMP_4._s || this, TMP_5;

  $opal.defn(self, '$each_byte', TMP_5 = function(string) {
      var $a, self = this, $iter = TMP_5._p, block = $iter || nil;

      TMP_5._p = null;
      
      for (var i = 0, length = string.length; i < length; i++) {
        var code = string.charCodeAt(i);

        if (code <= 0x7f) {
          ((($a = $opal.$yield1(block, code)) === $breaker) ? $breaker.$v : $a);
        }
        else {
          var encoded = encodeURIComponent(string.charAt(i)).substr(1).split('%');

          for (var j = 0, encoded_length = encoded.length; j < encoded_length; j++) {
            ((($a = $opal.$yield1(block, parseInt(encoded[j], 16))) === $breaker) ? $breaker.$v : $a);
          }
        }
      }
    
    });
    return ($opal.defn(self, '$bytesize', function() {
      var self = this;

      return self.$bytes().$length();
    }), nil) && 'bytesize';}, TMP_4._s = self, TMP_4), $a).call($b, "UTF-8", $hash2(["aliases", "ascii"], {"aliases": ["CP65001"], "ascii": true}));
  ($a = ($c = $scope.Encoding).$register, $a._p = (TMP_6 = function(){var self = TMP_6._s || this, TMP_7;

  $opal.defn(self, '$each_byte', TMP_7 = function(string) {
      var $a, self = this, $iter = TMP_7._p, block = $iter || nil;

      TMP_7._p = null;
      
      for (var i = 0, length = string.length; i < length; i++) {
        var code = string.charCodeAt(i);

        ((($a = $opal.$yield1(block, code & 0xff)) === $breaker) ? $breaker.$v : $a);
        ((($a = $opal.$yield1(block, code >> 8)) === $breaker) ? $breaker.$v : $a);
      }
    
    });
    return ($opal.defn(self, '$bytesize', function() {
      var self = this;

      return self.$bytes().$length();
    }), nil) && 'bytesize';}, TMP_6._s = self, TMP_6), $a).call($c, "UTF-16LE");
  ($a = ($d = $scope.Encoding).$register, $a._p = (TMP_8 = function(){var self = TMP_8._s || this, TMP_9;

  $opal.defn(self, '$each_byte', TMP_9 = function(string) {
      var $a, self = this, $iter = TMP_9._p, block = $iter || nil;

      TMP_9._p = null;
      
      for (var i = 0, length = string.length; i < length; i++) {
        ((($a = $opal.$yield1(block, string.charCodeAt(i) & 0xff)) === $breaker) ? $breaker.$v : $a);
      }
    
    });
    return ($opal.defn(self, '$bytesize', function() {
      var self = this;

      return self.$bytes().$length();
    }), nil) && 'bytesize';}, TMP_8._s = self, TMP_8), $a).call($d, "ASCII-8BIT", $hash2(["aliases", "ascii"], {"aliases": ["BINARY"], "ascii": true}));
  return (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self._proto, $scope = self._scope, TMP_10;

    def.encoding = nil;
    def.encoding = ($scope.Encoding)._scope.UTF_16LE;

    def.$bytes = function() {
      var self = this;

      return self.$each_byte().$to_a();
    };

    def.$bytesize = function() {
      var self = this;

      return self.encoding.$bytesize(self);
    };

    def.$each_byte = TMP_10 = function() {
      var $a, $b, self = this, $iter = TMP_10._p, block = $iter || nil;

      TMP_10._p = null;
      if ((block !== nil)) {
        } else {
        return self.$enum_for("each_byte")
      };
      ($a = ($b = self.encoding).$each_byte, $a._p = block.$to_proc(), $a).call($b, self);
      return self;
    };

    def.$encoding = function() {
      var self = this;

      return self.encoding;
    };

    def.$force_encoding = function(encoding) {
      var self = this;

      encoding = $scope.Encoding.$find(encoding);
      if (encoding['$=='](self.encoding)) {
        return self};
      
      var result = new String(self);
      result.encoding = encoding;

      return result;
    
    };

    return (def.$getbyte = function(idx) {
      var self = this;

      return self.encoding.$getbyte(self, idx);
    }, nil) && 'getbyte';
  })(self, null);
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  return (function($base, $super) {
    function $StringScanner(){};
    var self = $StringScanner = $klass($base, $super, 'StringScanner', $StringScanner);

    var def = self._proto, $scope = self._scope;

    def.pos = def.string = def.working = def.prev_pos = def.matched = def.match = nil;
    self.$attr_reader("pos");

    self.$attr_reader("matched");

    def.$initialize = function(string) {
      var self = this;

      self.string = string;
      self.pos = 0;
      self.matched = nil;
      self.working = string;
      return self.match = [];
    };

    def['$bol?'] = function() {
      var self = this;

      return self.pos === 0 || self.string.charAt(self.pos - 1) === "\n";
    };

    def.$scan = function(regex) {
      var self = this;

      
      var regex  = new RegExp('^' + regex.toString().substring(1, regex.toString().length - 1)),
          result = regex.exec(self.working);

      if (result == null) {
        return self.matched = nil;
      }
      else if (typeof(result) === 'object') {
        self.prev_pos = self.pos;
        self.pos      += result[0].length;
        self.working  = self.working.substring(result[0].length);
        self.matched  = result[0];
        self.match    = result;

        return result[0];
      }
      else if (typeof(result) === 'string') {
        self.pos     += result.length;
        self.working  = self.working.substring(result.length);

        return result;
      }
      else {
        return nil;
      }
    ;
    };

    def['$[]'] = function(idx) {
      var self = this;

      
      var match = self.match;

      if (idx < 0) {
        idx += match.length;
      }

      if (idx < 0 || idx >= match.length) {
        return nil;
      }

      return match[idx];
    ;
    };

    def.$check = function(regex) {
      var self = this;

      
      var regexp = new RegExp('^' + regex.toString().substring(1, regex.toString().length - 1)),
          result = regexp.exec(self.working);

      if (result == null) {
        return self.matched = nil;
      }

      return self.matched = result[0];
    ;
    };

    def.$peek = function(length) {
      var self = this;

      return self.working.substring(0, length);
    };

    def['$eos?'] = function() {
      var self = this;

      return self.working.length === 0;
    };

    def.$skip = function(re) {
      var self = this;

      
      re = new RegExp('^' + re.source)
      var result = re.exec(self.working);

      if (result == null) {
        return self.matched = nil;
      }
      else {
        var match_str = result[0];
        var match_len = match_str.length;
        self.matched = match_str;
        self.prev_pos = self.pos;
        self.pos += match_len;
        self.working = self.working.substring(match_len);
        return match_len;
      }
    ;
    };

    def.$get_byte = function() {
      var self = this;

      
      var result = nil;
      if (self.pos < self.string.length) {
        self.prev_pos = self.pos;
        self.pos += 1;
        result = self.matched = self.working.substring(0, 1);
        self.working = self.working.substring(1);
      }
      else {
        self.matched = nil;
      }

      return result;
    ;
    };

    $opal.defn(self, '$getch', def.$get_byte);

    def['$pos='] = function(pos) {
      var self = this;

      
      if (pos < 0) {
        pos += self.string.$length();
      }
    ;
      self.pos = pos;
      return self.working = self.string.slice(pos);
    };

    def.$rest = function() {
      var self = this;

      return self.working;
    };

    def.$terminate = function() {
      var self = this;

      self.match = nil;
      return self['$pos='](self.string.$length());
    };

    return (def.$unscan = function() {
      var self = this;

      self.pos = self.prev_pos;
      self.prev_pos = nil;
      self.match = nil;
      return self;
    }, nil) && 'unscan';
  })(self, null)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  return (function($base) {
    var self = $module($base, 'Comparable');

    var def = self._proto, $scope = self._scope;

    def['$=='] = function(other) {
      var $a, self = this, cmp = nil;

      try {
      if ((($a = self['$equal?'](other)) !== nil && (!$a._isBoolean || $a == true))) {
          return true};
        if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return false
        };
        return cmp == 0;
      } catch ($err) {if ($opal.$rescue($err, [$scope.StandardError])) {
        return false
        }else { throw $err; }
      };
    };

    def['$>'] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return cmp > 0;
    };

    def['$>='] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return cmp >= 0;
    };

    def['$<'] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return cmp < 0;
    };

    def['$<='] = function(other) {
      var $a, self = this, cmp = nil;

      if ((($a = cmp = (self['$<=>'](other))) !== nil && (!$a._isBoolean || $a == true))) {
        } else {
        self.$raise($scope.ArgumentError, "comparison of " + (self.$class()) + " with " + (other.$class()) + " failed")
      };
      return cmp <= 0;
    };
        ;$opal.donate(self, ["$==", "$>", "$>=", "$<", "$<="]);
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  return (function($base, $super) {
    function $Dir(){};
    var self = $Dir = $klass($base, $super, 'Dir', $Dir);

    var def = self._proto, $scope = self._scope;

    $opal.defs(self, '$pwd', function() {
      var $a, self = this;

      return ((($a = $scope.ENV['$[]']("PWD")) !== false && $a !== nil) ? $a : ".");
    });

    $opal.defs(self, '$getwd', function() {
      var $a, self = this;

      return ((($a = $scope.ENV['$[]']("PWD")) !== false && $a !== nil) ? $a : ".");
    });

    return ($opal.defs(self, '$home', function() {
      var self = this;

      return $scope.ENV['$[]']("HOME");
    }), nil) && 'home';
  })(self, null)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  return (function($base, $super) {
    function $SecurityError(){};
    var self = $SecurityError = $klass($base, $super, 'SecurityError', $SecurityError);

    var def = self._proto, $scope = self._scope;

    return nil;
  })(self, $scope.Exception)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass, $gvars = $opal.gvars, $range = $opal.range;

  (function($base, $super) {
    function $Kernel(){};
    var self = $Kernel = $klass($base, $super, 'Kernel', $Kernel);

    var def = self._proto, $scope = self._scope, TMP_1;

    return (def.$open = TMP_1 = function(path, rest) {
      var $a, $b, self = this, $iter = TMP_1._p, $yield = $iter || nil, file = nil;

      rest = $slice.call(arguments, 1);
      TMP_1._p = null;
      file = ($a = $scope.File).$new.apply($a, [path].concat(rest));
      if (($yield !== nil)) {
        return $b = $opal.$yield1($yield, file), $b === $breaker ? $b : $b
        } else {
        return file
      };
    }, nil) && 'open'
  })(self, null);
  return (function($base, $super) {
    function $File(){};
    var self = $File = $klass($base, $super, 'File', $File);

    var def = self._proto, $scope = self._scope, TMP_2;

    def.eof = def.path = nil;
    $opal.cdecl($scope, 'SEPARATOR', "/");

    $opal.cdecl($scope, 'ALT_SEPARATOR', nil);

    self.$attr_reader("eof");

    self.$attr_reader("lineno");

    self.$attr_reader("path");

    def.$initialize = function(path, mode) {
      var self = this;

      if (mode == null) {
        mode = "r"
      }
      self.path = path;
      self.contents = nil;
      self.eof = false;
      return self.lineno = 0;
    };

    def.$read = function() {
      var $a, self = this, res = nil;

      if ((($a = self.eof) !== nil && (!$a._isBoolean || $a == true))) {
        return ""
        } else {
        res = $scope.File.$read(self.path);
        self.eof = true;
        self.lineno = res.$size();
        return res;
      };
    };

    def.$each_line = TMP_2 = function(separator) {
      var $a, self = this, $iter = TMP_2._p, block = $iter || nil, lines = nil;
      if ($gvars["/"] == null) $gvars["/"] = nil;

      if (separator == null) {
        separator = $gvars["/"]
      }
      TMP_2._p = null;
      if ((($a = self.eof) !== nil && (!$a._isBoolean || $a == true))) {
        return (function() {if ((block !== nil)) {
          return self
          } else {
          return [].$to_enum()
        }; return nil; })()};
      if ((block !== nil)) {
        lines = $scope.File.$read(self.path);
        
        self.eof = false;
        self.lineno = 0; 
        var chomped  = lines.$chomp(),
            trailing = lines.length != chomped.length,
            splitted = chomped.split(separator);

        for (var i = 0, length = splitted.length; i < length; i++) {
          self.lineno += 1;
          if (i < length - 1 || trailing) {
            ((($a = $opal.$yield1(block, splitted[i] + separator)) === $breaker) ? $breaker.$v : $a);
          }
          else {
            ((($a = $opal.$yield1(block, splitted[i])) === $breaker) ? $breaker.$v : $a);
          }
        }
        self.eof = true;
      
        return self;
        } else {
        return self.$read().$each_line()
      };
    };

    $opal.defs(self, '$expand_path', function(path) {
      var self = this;

      return path;
    });

    $opal.defs(self, '$join', function(paths) {
      var self = this;

      paths = $slice.call(arguments, 0);
      return paths['$*']($scope.SEPARATOR);
    });

    $opal.defs(self, '$basename', function(path) {
      var $a, self = this, offset = nil;

      if ((($a = (offset = path.$rindex($scope.SEPARATOR))) !== nil && (!$a._isBoolean || $a == true))) {
        return path['$[]']($range((offset['$+'](1)), -1, false))
        } else {
        return path
      };
    });

    $opal.defs(self, '$dirname', function(path) {
      var $a, self = this, offset = nil;

      if ((($a = (offset = path.$rindex($scope.SEPARATOR))) !== nil && (!$a._isBoolean || $a == true))) {
        return path['$[]']($range(0, (offset['$-'](1)), false))
        } else {
        return "."
      };
    });

    $opal.defs(self, '$extname', function(path) {
      var $a, self = this, last_dot_idx = nil;

      if ((($a = path['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return ""};
      last_dot_idx = path['$[]']($range(1, -1, false)).$rindex(".");
      if ((($a = last_dot_idx['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
        return ""
        } else {
        return path['$[]']($range((last_dot_idx['$+'](1)), -1, false))
      };
    });

    $opal.defs(self, '$file?', function(path) {
      var self = this;

      return true;
    });

    return ($opal.defs(self, '$read', function(path) {
      var self = this;

      
      var data = ''
      var status = -1;
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', path, false);
        xhr.addEventListener('load', function() {
          status = this.status;
          // status is 0 for local file mode (i.e., file://)
          if (status == 0 || status == 200) {
            data = this.responseText;
          }
        });
        xhr.overrideMimeType('text/plain');
        xhr.send();
      }
      catch (e) {
        status = 0;
      }
      // assume that no data in local file mode means it doesn't exist
      if (status == 404 || (status == 0 && data == '')) {
        throw $scope.IOError.$new('No such file or directory: ' + path);
      }
    
      return data;
    }), nil) && 'read';
  })(self, null);
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice;

  ;
  ;
  ;
  return true;
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Debug');

      var def = self._proto, $scope = self._scope, TMP_1;

      self.show_debug = nil;

      $opal.defs(self, '$debug', TMP_1 = function() {
        var $a, self = this, $iter = TMP_1._p, $yield = $iter || nil;

        TMP_1._p = null;
        if ((($a = self['$show_debug_output?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$warn(((($a = $opal.$yieldX($yield, [])) === $breaker) ? $breaker.$v : $a))
          } else {
          return nil
        };
      });

      $opal.defs(self, '$set_debug', function(value) {
        var self = this;

        return self.show_debug = value;
      });

      $opal.defs(self, '$show_debug_output?', function() {
        var $a, $b, self = this;
        if (self.show_debug == null) self.show_debug = nil;

        return ((($a = self.show_debug) !== false && $a !== nil) ? $a : ((($b = $scope.ENV['$[]']("DEBUG")['$==']("true")) ? $scope.ENV['$[]']("SUPPRESS_DEBUG")['$==']("true")['$!']() : $b)));
      });

      $opal.defs(self, '$puts_indented', function(level, args) {
        var $a, $b, TMP_2, self = this, indentation = nil;

        args = $slice.call(arguments, 1);
        indentation = " "['$*'](level)['$*'](2);
        return ($a = ($b = args).$each, $a._p = (TMP_2 = function(arg){var self = TMP_2._s || this, $a, $b, TMP_3;
if (arg == null) arg = nil;
        return ($a = ($b = self).$debug, $a._p = (TMP_3 = function(){var self = TMP_3._s || this;

          return "" + (indentation) + (arg)}, TMP_3._s = self, TMP_3), $a).call($b)}, TMP_2._s = self, TMP_2), $a).call($b);
      });
      
    })(self)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    $opal.cdecl($scope, 'VERSION', "1.5.0-preview.7")
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $gvars = $opal.gvars;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Timings(){};
      var self = $Timings = $klass($base, $super, 'Timings', $Timings);

      var def = self._proto, $scope = self._scope;

      def.timers = def.log = nil;
      def.$initialize = function() {
        var self = this;

        self.log = $hash2([], {});
        return self.timers = $hash2([], {});
      };

      def.$start = function(key) {
        var $a, self = this;

        return self.timers['$[]='](key, (($a = $opal.Object._scope.Time) == null ? $opal.cm('Time') : $a).$now());
      };

      def.$record = function(key) {
        var $a, self = this;

        return self.log['$[]='](key, ((($a = $opal.Object._scope.Time) == null ? $opal.cm('Time') : $a).$now()['$-']((self.timers.$delete(key)))));
      };

      def.$read_parse = function() {
        var $a, self = this, time = nil;

        if (((time = (((($a = self.log['$[]']("read")) !== false && $a !== nil) ? $a : 0))['$+']((((($a = self.log['$[]']("parse")) !== false && $a !== nil) ? $a : 0)))))['$>'](0)) {
          return time
          } else {
          return nil
        };
      };

      def.$convert = function() {
        var self = this;

        return self.log['$[]']("convert");
      };

      def.$read_parse_convert = function() {
        var $a, self = this, time = nil;

        if (((time = (((($a = self.log['$[]']("read")) !== false && $a !== nil) ? $a : 0))['$+']((((($a = self.log['$[]']("parse")) !== false && $a !== nil) ? $a : 0)))['$+']((((($a = self.log['$[]']("convert")) !== false && $a !== nil) ? $a : 0)))))['$>'](0)) {
          return time
          } else {
          return nil
        };
      };

      def.$total = function() {
        var $a, self = this, time = nil;

        if (((time = (((($a = self.log['$[]']("read")) !== false && $a !== nil) ? $a : 0))['$+']((((($a = self.log['$[]']("parse")) !== false && $a !== nil) ? $a : 0)))['$+']((((($a = self.log['$[]']("convert")) !== false && $a !== nil) ? $a : 0)))['$+']((((($a = self.log['$[]']("write")) !== false && $a !== nil) ? $a : 0)))))['$>'](0)) {
          return time
          } else {
          return nil
        };
      };

      return (def.$print_report = function(to, subject) {
        var self = this;
        if ($gvars.stdout == null) $gvars.stdout = nil;

        if (to == null) {
          to = $gvars.stdout
        }
        if (subject == null) {
          subject = nil
        }
        if (subject !== false && subject !== nil) {
          to.$puts("Input file: " + (subject))};
        to.$puts("  Time to read and parse source: " + ("%05.5f"['$%'](self.$read_parse())));
        to.$puts("  Time to convert document: " + ("%05.5f"['$%'](self.$convert())));
        return to.$puts("  Total time (read, parse and convert): " + ("%05.5f"['$%'](self.$read_parse_convert())));
      }, nil) && 'print_report';
    })(self, null)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $klass = $opal.klass;

  (function($base, $super) {
    function $NilClass(){};
    var self = $NilClass = $klass($base, $super, 'NilClass', $NilClass);

    var def = self._proto, $scope = self._scope, $a;

    if ((($a = self['$respond_to?']("nil_or_empty?")) !== nil && (!$a._isBoolean || $a == true))) {
      return nil
      } else {
      return $opal.defn(self, '$nil_or_empty?', def['$nil?'])
    }
  })(self, null);
  (function($base, $super) {
    function $String(){};
    var self = $String = $klass($base, $super, 'String', $String);

    var def = self._proto, $scope = self._scope, $a;

    if ((($a = self['$respond_to?']("nil_or_empty?")) !== nil && (!$a._isBoolean || $a == true))) {
      return nil
      } else {
      return $opal.defn(self, '$nil_or_empty?', def['$empty?'])
    }
  })(self, null);
  (function($base, $super) {
    function $Array(){};
    var self = $Array = $klass($base, $super, 'Array', $Array);

    var def = self._proto, $scope = self._scope, $a;

    if ((($a = self['$respond_to?']("nil_or_empty?")) !== nil && (!$a._isBoolean || $a == true))) {
      return nil
      } else {
      return $opal.defn(self, '$nil_or_empty?', def['$empty?'])
    }
  })(self, null);
  (function($base, $super) {
    function $Hash(){};
    var self = $Hash = $klass($base, $super, 'Hash', $Hash);

    var def = self._proto, $scope = self._scope, $a;

    if ((($a = self['$respond_to?']("nil_or_empty?")) !== nil && (!$a._isBoolean || $a == true))) {
      return nil
      } else {
      return $opal.defn(self, '$nil_or_empty?', def['$empty?'])
    }
  })(self, null);
  return (function($base, $super) {
    function $Numeric(){};
    var self = $Numeric = $klass($base, $super, 'Numeric', $Numeric);

    var def = self._proto, $scope = self._scope, $a;

    if ((($a = self['$respond_to?']("nil_or_empty?")) !== nil && (!$a._isBoolean || $a == true))) {
      return nil
      } else {
      return $opal.defn(self, '$nil_or_empty?', def['$nil?'])
    }
  })(self, null);
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice;

  ;
  if ($scope.RUBY_ENGINE['$==']("opal")) {
    return nil};
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $range = $opal.range, $gvars = $opal.gvars;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Helpers');

      var def = self._proto, $scope = self._scope;

      $opal.defs(self, '$require_library', function(name, gem) {
        var $a, self = this, e = nil;

        if (gem == null) {
          gem = true
        }
        try {
        return true
        } catch ($err) {if ($opal.$rescue($err, [(($a = $opal.Object._scope.LoadError) == null ? $opal.cm('LoadError') : $a)])) {e = $err;
          if (gem !== false && gem !== nil) {
            return self.$fail("asciidoctor: FAILED: required gem '" + ((function() {if (gem['$=='](true)) {
              return name
              } else {
              return gem
            }; return nil; })()) + "' is not installed. Processing aborted.")
            } else {
            return self.$fail("asciidoctor: FAILED: " + (e.$message().$chomp(".")) + ". Processing aborted.")
          }
          }else { throw $err; }
        };
      });

      $opal.defs(self, '$normalize_lines', function(data) {
        var $a, self = this;

        if (data.$class()['$==']((($a = $opal.Object._scope.String) == null ? $opal.cm('String') : $a))) {
          return (self.$normalize_lines_from_string(data))
          } else {
          return (self.$normalize_lines_array(data))
        };
      });

      $opal.defs(self, '$normalize_lines_array', function(data) {
        var $a, $b, TMP_1, $c, TMP_2, $d, TMP_3, $e, TMP_4, self = this, leading_bytes = nil, first_line = nil, utf8 = nil, leading_2_bytes = nil;

        if ((($a = data['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return []};
        leading_bytes = ((first_line = data['$[]'](0)))['$[]']($range(0, 2, false)).$bytes().$to_a();
        if ((($a = $scope.COERCE_ENCODING) !== nil && (!$a._isBoolean || $a == true))) {
          utf8 = ((($a = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $a))._scope.UTF_8;
          if (((leading_2_bytes = leading_bytes['$[]']($range(0, 1, false))))['$==']($scope.BOM_BYTES_UTF_16LE)) {
            return ($a = ($b = ((data.$join().$force_encoding(((($c = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $c))._scope.UTF_16LE))['$[]']($range(1, -1, false)).$encode(utf8)).$lines()).$map, $a._p = (TMP_1 = function(line){var self = TMP_1._s || this;
if (line == null) line = nil;
            return line.$rstrip()}, TMP_1._s = self, TMP_1), $a).call($b)
          } else if (leading_2_bytes['$==']($scope.BOM_BYTES_UTF_16BE)) {
            data['$[]='](0, (first_line.$force_encoding(((($a = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $a))._scope.UTF_16BE))['$[]']($range(1, -1, false)));
            return ($a = ($c = data).$map, $a._p = (TMP_2 = function(line){var self = TMP_2._s || this, $a;
if (line == null) line = nil;
            return "" + (((line.$force_encoding(((($a = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $a))._scope.UTF_16BE)).$encode(utf8)).$rstrip())}, TMP_2._s = self, TMP_2), $a).call($c);
          } else if (leading_bytes['$[]']($range(0, 2, false))['$==']($scope.BOM_BYTES_UTF_8)) {
            data['$[]='](0, (first_line.$force_encoding(utf8))['$[]']($range(1, -1, false)))};
          return ($a = ($d = data).$map, $a._p = (TMP_3 = function(line){var self = TMP_3._s || this;
if (line == null) line = nil;
          if (line.$encoding()['$=='](utf8)) {
              return line.$rstrip()
              } else {
              return (line.$force_encoding(utf8)).$rstrip()
            }}, TMP_3._s = self, TMP_3), $a).call($d);
          } else {
          if (leading_bytes['$==']($scope.BOM_BYTES_UTF_8)) {
            data['$[]='](0, first_line['$[]']($range(3, -1, false)))};
          return ($a = ($e = data).$map, $a._p = (TMP_4 = function(line){var self = TMP_4._s || this;
if (line == null) line = nil;
          return line.$rstrip()}, TMP_4._s = self, TMP_4), $a).call($e);
        };
      });

      $opal.defs(self, '$normalize_lines_from_string', function(data) {
        var $a, $b, TMP_5, self = this, utf8 = nil, leading_bytes = nil, leading_2_bytes = nil;

        if ((($a = data['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return []};
        if ((($a = $scope.COERCE_ENCODING) !== nil && (!$a._isBoolean || $a == true))) {
          utf8 = ((($a = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $a))._scope.UTF_8;
          leading_bytes = data['$[]']($range(0, 2, false)).$bytes().$to_a();
          if (((leading_2_bytes = leading_bytes['$[]']($range(0, 1, false))))['$==']($scope.BOM_BYTES_UTF_16LE)) {
            data = (data.$force_encoding(((($a = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $a))._scope.UTF_16LE))['$[]']($range(1, -1, false)).$encode(utf8)
          } else if (leading_2_bytes['$==']($scope.BOM_BYTES_UTF_16BE)) {
            data = (data.$force_encoding(((($a = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $a))._scope.UTF_16BE))['$[]']($range(1, -1, false)).$encode(utf8)
          } else if (leading_bytes['$[]']($range(0, 2, false))['$==']($scope.BOM_BYTES_UTF_8)) {
            data = (function() {if (data.$encoding()['$=='](utf8)) {
              return data['$[]']($range(1, -1, false))
              } else {
              return (data.$force_encoding(utf8))['$[]']($range(1, -1, false))
            }; return nil; })()
          } else if (data.$encoding()['$=='](utf8)) {
            } else {
            data = data.$force_encoding(utf8)
          };
        } else if (data['$[]']($range(0, 2, false)).$bytes().$to_a()['$==']($scope.BOM_BYTES_UTF_8)) {
          data = data['$[]']($range(3, -1, false))};
        return ($a = ($b = data.$each_line()).$map, $a._p = (TMP_5 = function(line){var self = TMP_5._s || this;
if (line == null) line = nil;
        return line.$rstrip()}, TMP_5._s = self, TMP_5), $a).call($b);
      });

      $opal.cdecl($scope, 'REGEXP_ENCODE_URI_CHARS', /[^\w\-.!~*';:@=+$,()\[\]]/);

      $opal.defs(self, '$encode_uri', function(str) {
        var $a, $b, TMP_6, self = this;

        return ($a = ($b = str).$gsub, $a._p = (TMP_6 = function(){var self = TMP_6._s || this, $a, $b, TMP_7;
          if ($gvars["&"] == null) $gvars["&"] = nil;

        return ($a = ($b = $gvars["&"].$each_byte()).$map, $a._p = (TMP_7 = function(c){var self = TMP_7._s || this;
if (c == null) c = nil;
          return self.$sprintf("%%%02X", c)}, TMP_7._s = self, TMP_7), $a).call($b).$join()}, TMP_6._s = self, TMP_6), $a).call($b, $scope.REGEXP_ENCODE_URI_CHARS);
      });

      $opal.defs(self, '$rootname', function(file_name) {
        var $a, $b, self = this, ext = nil;

        if ((($a = ((ext = (($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b).$extname(file_name)))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return file_name
          } else {
          return file_name['$[]']($range(0, ext.$length()['$-@'](), true))
        };
      });

      $opal.defs(self, '$mkdir_p', function(dir) {
        var $a, $b, $c, self = this, parent_dir = nil;

        if ((($a = (($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b)['$directory?'](dir)) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          parent_dir = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname(dir);
          if ((($a = ($b = (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c)['$directory?'](parent_dir = (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c).$dirname(dir))['$!'](), $b !== false && $b !== nil ?parent_dir['$=='](".")['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            self.$mkdir_p(parent_dir)};
          return (($a = $opal.Object._scope.Dir) == null ? $opal.cm('Dir') : $a).$mkdir(dir);
        };
      });
      
    })(self)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $hash2 = $opal.hash2, $gvars = $opal.gvars, $range = $opal.range;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Substitutors');

      var def = self._proto, $scope = self._scope;

      $opal.cdecl($scope, 'SPECIAL_CHARS', $hash2(["&", "<", ">"], {"&": "&amp;", "<": "&lt;", ">": "&gt;"}));

      $opal.cdecl($scope, 'SPECIAL_CHARS_PATTERN', (new RegExp("[" + $scope.SPECIAL_CHARS.$keys().$join() + "]")));

      $opal.cdecl($scope, 'SUBS', $hash2(["basic", "normal", "verbatim", "title", "header", "pass"], {"basic": ["specialcharacters"], "normal": ["specialcharacters", "quotes", "attributes", "replacements", "macros", "post_replacements"], "verbatim": ["specialcharacters", "callouts"], "title": ["specialcharacters", "quotes", "replacements", "macros", "attributes", "post_replacements"], "header": ["specialcharacters", "attributes"], "pass": []}));

      $opal.cdecl($scope, 'COMPOSITE_SUBS', $hash2(["none", "normal", "verbatim", "specialchars"], {"none": [], "normal": $scope.SUBS['$[]']("normal"), "verbatim": $scope.SUBS['$[]']("verbatim"), "specialchars": ["specialcharacters"]}));

      $opal.cdecl($scope, 'SUB_SYMBOLS', $hash2(["a", "m", "n", "p", "q", "r", "c", "v"], {"a": "attributes", "m": "macros", "n": "normal", "p": "post_replacements", "q": "quotes", "r": "replacements", "c": "specialcharacters", "v": "verbatim"}));

      $opal.cdecl($scope, 'SUB_OPTIONS', $hash2(["block", "inline"], {"block": $scope.COMPOSITE_SUBS.$keys()['$+']($scope.SUBS['$[]']("normal"))['$+'](["callouts"]), "inline": $scope.COMPOSITE_SUBS.$keys()['$+']($scope.SUBS['$[]']("normal"))}));

      $opal.cdecl($scope, 'PASS_START', "\u0096");

      $opal.cdecl($scope, 'PASS_END', "\u0097");

      $opal.cdecl($scope, 'PASS_MATCH', /\u0096(\d+)\u0097/);

      $opal.cdecl($scope, 'PASS_MATCH_HI', /<span[^>]*>\u0096<\/span>[^\d]*(\d+)[^\d]*<span[^>]*>\u0097<\/span>/);

      self.$attr_reader("passthroughs");

      def.$apply_subs = function(source, subs, expand) {
        var $a, $b, TMP_1, $c, TMP_2, self = this, effective_subs = nil, text = nil, multiline = nil, has_passthroughs = nil;

        if (subs == null) {
          subs = "normal"
        }
        if (expand == null) {
          expand = false
        }
        if ((($a = subs['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          return source
        } else if (subs['$==']("normal")) {
          subs = $scope.SUBS['$[]']("normal")
        } else if (expand !== false && expand !== nil) {
          if ((($a = subs['$is_a?']((($b = $opal.Object._scope.Symbol) == null ? $opal.cm('Symbol') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            subs = ((($a = $scope.COMPOSITE_SUBS['$[]'](subs)) !== false && $a !== nil) ? $a : [subs])
            } else {
            effective_subs = [];
            ($a = ($b = subs).$each, $a._p = (TMP_1 = function(key){var self = TMP_1._s || this, $a;
if (key == null) key = nil;
            if ((($a = $scope.COMPOSITE_SUBS['$has_key?'](key)) !== nil && (!$a._isBoolean || $a == true))) {
                return effective_subs = effective_subs['$+']($scope.COMPOSITE_SUBS['$[]'](key))
                } else {
                return effective_subs['$<<'](key)
              }}, TMP_1._s = self, TMP_1), $a).call($b);
            subs = effective_subs;
          }};
        if ((($a = subs['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return source};
        text = (function() {if ((($a = (multiline = source['$is_a?']((($c = $opal.Object._scope.Array) == null ? $opal.cm('Array') : $c)))) !== nil && (!$a._isBoolean || $a == true))) {
          return (source['$*']($scope.EOL))
          } else {
          return source
        }; return nil; })();
        if ((($a = (has_passthroughs = subs['$include?']("macros"))) !== nil && (!$a._isBoolean || $a == true))) {
          text = self.$extract_passthroughs(text)};
        ($a = ($c = subs).$each, $a._p = (TMP_2 = function(type){var self = TMP_2._s || this, $a, $case = nil;
if (type == null) type = nil;
        return (function() {$case = type;if ("specialcharacters"['$===']($case)) {return text = self.$sub_specialcharacters(text)}else if ("quotes"['$===']($case)) {return text = self.$sub_quotes(text)}else if ("attributes"['$===']($case)) {return text = self.$sub_attributes(text.$split($scope.EOL))['$*']($scope.EOL)}else if ("replacements"['$===']($case)) {return text = self.$sub_replacements(text)}else if ("macros"['$===']($case)) {return text = self.$sub_macros(text)}else if ("highlight"['$===']($case)) {return text = self.$highlight_source(text, (subs['$include?']("callouts")))}else if ("callouts"['$===']($case)) {if ((($a = subs['$include?']("highlight")) !== nil && (!$a._isBoolean || $a == true))) {
            return nil
            } else {
            return text = self.$sub_callouts(text)
          }}else if ("post_replacements"['$===']($case)) {return text = self.$sub_post_replacements(text)}else {return self.$warn("asciidoctor: WARNING: unknown substitution type " + (type))}})()}, TMP_2._s = self, TMP_2), $a).call($c);
        if (has_passthroughs !== false && has_passthroughs !== nil) {
          text = self.$restore_passthroughs(text)};
        if (multiline !== false && multiline !== nil) {
          return (text.$split($scope.EOL))
          } else {
          return text
        };
      };

      def.$apply_normal_subs = function(lines) {
        var $a, $b, self = this;

        return self.$apply_subs((function() {if ((($a = lines['$is_a?']((($b = $opal.Object._scope.Array) == null ? $opal.cm('Array') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          return (lines['$*']($scope.EOL))
          } else {
          return lines
        }; return nil; })());
      };

      def.$apply_title_subs = function(title) {
        var self = this;

        return self.$apply_subs(title, $scope.SUBS['$[]']("title"));
      };

      def.$apply_header_subs = function(text) {
        var self = this;

        return self.$apply_subs(text, $scope.SUBS['$[]']("header"));
      };

      def.$extract_passthroughs = function(text) {
        var $a, $b, $c, TMP_3, TMP_4, $d, TMP_5, self = this;

        if ((($a = ((($b = ((($c = (text['$include?']("++"))) !== false && $c !== nil) ? $c : (text['$include?']("$$")))) !== false && $b !== nil) ? $b : (text['$include?']("ss:")))) !== nil && (!$a._isBoolean || $a == true))) {
          text = ($a = ($b = text).$gsub, $a._p = (TMP_3 = function(){var self = TMP_3._s || this, $a, m = nil, subs = nil, index = nil;
            if (self.passthroughs == null) self.passthroughs = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0)['$[]']($range(1, -1, false));};
            if ((($a = m['$[]'](4)['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              text = m['$[]'](2);
              subs = ((function() {if (m['$[]'](1)['$==']("$$")) {
                return ["specialcharacters"]
                } else {
                return []
              }; return nil; })());
              } else {
              text = self.$unescape_brackets(m['$[]'](4));
              if ((($a = m['$[]'](3)['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                subs = []
                } else {
                subs = self.$resolve_pass_subs(m['$[]'](3))
              };
            };
            self.passthroughs['$<<']($hash2(["text", "subs"], {"text": text, "subs": subs}));
            index = self.passthroughs.$size()['$-'](1);
            return "" + ($scope.PASS_START) + (index) + ($scope.PASS_END);}, TMP_3._s = self, TMP_3), $a).call($b, $scope.PassInlineMacroRx)};
        if ((($a = (text['$include?']("`"))) !== nil && (!$a._isBoolean || $a == true))) {
          text = ($a = ($c = text).$gsub, $a._p = (TMP_4 = function(){var self = TMP_4._s || this, $a, $b, m = nil, unescaped_attrs = nil, attributes = nil, index = nil;
            if (self.passthroughs == null) self.passthroughs = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              if (m['$[]'](2)['$==']("")) {
                m['$[]='](2, nil)}};
            unescaped_attrs = nil;
            if ((($a = m['$[]'](3)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return (function() {if ((($a = m['$[]'](2)) !== nil && (!$a._isBoolean || $a == true))) {
                return "" + (m['$[]'](1)) + "[" + (m['$[]'](2)) + "]" + (m['$[]'](3)['$[]']($range(1, -1, false)))
                } else {
                return "" + (m['$[]'](1)) + (m['$[]'](3)['$[]']($range(1, -1, false)))
              }; return nil; })();
            } else if ((($a = (($b = m['$[]'](1)['$==']("\\")) ? m['$[]'](2) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              unescaped_attrs = "[" + (m['$[]'](2)) + "]"};
            if ((($a = ($b = unescaped_attrs['$!'](), $b !== false && $b !== nil ?m['$[]'](2) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              attributes = self.$parse_attributes(m['$[]'](2))
              } else {
              attributes = nil
            };
            self.passthroughs['$<<']($hash2(["text", "subs", "attributes", "type"], {"text": m['$[]'](4), "subs": ["specialcharacters"], "attributes": attributes, "type": "monospaced"}));
            index = self.passthroughs.$size()['$-'](1);
            return "" + (((($a = unescaped_attrs) !== false && $a !== nil) ? $a : m['$[]'](1))) + ($scope.PASS_START) + (index) + ($scope.PASS_END);}, TMP_4._s = self, TMP_4), $a).call($c, $scope.PassInlineLiteralRx)};
        if ((($a = (text['$include?']("math:"))) !== nil && (!$a._isBoolean || $a == true))) {
          text = ($a = ($d = text).$gsub, $a._p = (TMP_5 = function(){var self = TMP_5._s || this, $a, m = nil, type = nil, default_type = nil, subs = nil, index = nil;
            if (self.document == null) self.document = nil;
            if (self.passthroughs == null) self.passthroughs = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0)['$[]']($range(1, -1, false));};
            type = m['$[]'](1).$to_sym();
            if (type['$==']("math")) {
              type = ((function() {if ((($a = ((default_type = self.$document().$attributes()['$[]']("math")))['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                return "asciimath"
                } else {
                return default_type
              }; return nil; })()).$to_sym()};
            text = self.$unescape_brackets(m['$[]'](3));
            if ((($a = m['$[]'](2)['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              subs = (function() {if ((($a = (self.document['$basebackend?']("html"))) !== nil && (!$a._isBoolean || $a == true))) {
                return ["specialcharacters"]
                } else {
                return []
              }; return nil; })()
              } else {
              subs = self.$resolve_pass_subs(m['$[]'](2))
            };
            self.passthroughs['$<<']($hash2(["text", "subs", "type"], {"text": text, "subs": subs, "type": type}));
            index = self.passthroughs.$size()['$-'](1);
            return "" + ($scope.PASS_START) + (index) + ($scope.PASS_END);}, TMP_5._s = self, TMP_5), $a).call($d, $scope.MathInlineMacroRx)};
        return text;
      };

      def.$restore_passthroughs = function(text) {
        var $a, $b, TMP_6, self = this;
        if (self.passthroughs == null) self.passthroughs = nil;

        if ((($a = ((($b = self.passthroughs['$nil_or_empty?']()) !== false && $b !== nil) ? $b : text['$include?']($scope.PASS_START)['$!']())) !== nil && (!$a._isBoolean || $a == true))) {
          return text};
        return ($a = ($b = text).$gsub, $a._p = (TMP_6 = function(){var self = TMP_6._s || this, $a, pass = nil, subbed_text = nil, subs = nil, type = nil;
          if (self.passthroughs == null) self.passthroughs = nil;
          if ($gvars["~"] == null) $gvars["~"] = nil;

        pass = self.passthroughs['$[]']($gvars["~"]['$[]'](1).$to_i());
          subbed_text = (function() {if ((($a = (subs = pass['$[]']("subs"))) !== nil && (!$a._isBoolean || $a == true))) {
            return (self.$apply_subs(pass['$[]']("text"), subs))
            } else {
            return pass['$[]']("text")
          }; return nil; })();
          if ((($a = (type = pass['$[]']("type"))) !== nil && (!$a._isBoolean || $a == true))) {
            return $scope.Inline.$new(self, "quoted", subbed_text, $hash2(["type", "attributes"], {"type": type, "attributes": pass['$[]']("attributes")})).$convert()
            } else {
            return subbed_text
          };}, TMP_6._s = self, TMP_6), $a).call($b, $scope.PASS_MATCH);
      };

      def.$sub_specialcharacters = function(text) {
        var $a, $b, TMP_7, self = this;

        if ((($a = $scope.SUPPORTS_GSUB_RESULT_HASH) !== nil && (!$a._isBoolean || $a == true))) {
          return text.$gsub($scope.SPECIAL_CHARS_PATTERN, $scope.SPECIAL_CHARS)
          } else {
          return ($a = ($b = text).$gsub, $a._p = (TMP_7 = function(){var self = TMP_7._s || this;
            if ($gvars["&"] == null) $gvars["&"] = nil;

          return $scope.SPECIAL_CHARS['$[]']($gvars["&"])}, TMP_7._s = self, TMP_7), $a).call($b, $scope.SPECIAL_CHARS_PATTERN)
        };
      };

      $opal.defn(self, '$sub_specialchars', def.$sub_specialcharacters);

      def.$sub_quotes = function(text) {
        var $a, $b, TMP_8, $c, TMP_10, self = this, result = nil;

        if ((($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          result = text;
          ($a = ($b = $scope.QUOTE_SUBS).$each, $a._p = (TMP_8 = function(type, scope, pattern){var self = TMP_8._s || this, $a, $b, TMP_9;
if (type == null) type = nil;if (scope == null) scope = nil;if (pattern == null) pattern = nil;
          return result = ($a = ($b = result).$gsub, $a._p = (TMP_9 = function(){var self = TMP_9._s || this;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            return self.$convert_quoted_text($gvars["~"], type, scope)}, TMP_9._s = self, TMP_9), $a).call($b, pattern)}, TMP_8._s = self, TMP_8), $a).call($b);
          } else {
          result = "" + (text);
          ($a = ($c = $scope.QUOTE_SUBS).$each, $a._p = (TMP_10 = function(type, scope, pattern){var self = TMP_10._s || this, $a, $b, TMP_11;
if (type == null) type = nil;if (scope == null) scope = nil;if (pattern == null) pattern = nil;
          return ($a = ($b = result)['$gsub!'], $a._p = (TMP_11 = function(){var self = TMP_11._s || this;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            return self.$convert_quoted_text($gvars["~"], type, scope)}, TMP_11._s = self, TMP_11), $a).call($b, pattern)}, TMP_10._s = self, TMP_10), $a).call($c);
        };
        return result;
      };

      def.$sub_replacements = function(text) {
        var $a, $b, TMP_12, $c, TMP_14, self = this, result = nil;

        if ((($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          result = text;
          ($a = ($b = $scope.REPLACEMENTS).$each, $a._p = (TMP_12 = function(pattern, replacement, restore){var self = TMP_12._s || this, $a, $b, TMP_13;
if (pattern == null) pattern = nil;if (replacement == null) replacement = nil;if (restore == null) restore = nil;
          return result = ($a = ($b = result).$gsub, $a._p = (TMP_13 = function(){var self = TMP_13._s || this;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            return self.$do_replacement($gvars["~"], replacement, restore)}, TMP_13._s = self, TMP_13), $a).call($b, pattern)}, TMP_12._s = self, TMP_12), $a).call($b);
          } else {
          result = "" + (text);
          ($a = ($c = $scope.REPLACEMENTS).$each, $a._p = (TMP_14 = function(pattern, replacement, restore){var self = TMP_14._s || this, $a, $b, TMP_15;
if (pattern == null) pattern = nil;if (replacement == null) replacement = nil;if (restore == null) restore = nil;
          return ($a = ($b = result)['$gsub!'], $a._p = (TMP_15 = function(){var self = TMP_15._s || this;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            return self.$do_replacement($gvars["~"], replacement, restore)}, TMP_15._s = self, TMP_15), $a).call($b, pattern)}, TMP_14._s = self, TMP_14), $a).call($c);
        };
        return result;
      };

      def.$do_replacement = function(m, replacement, restore) {
        var $a, self = this, matched = nil, $case = nil;

        if ((($a = ((matched = m['$[]'](0)))['$include?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
          return matched.$tr("\\", "")
          } else {
          return (function() {$case = restore;if ("none"['$===']($case)) {return replacement}else if ("leading"['$===']($case)) {return "" + (m['$[]'](1)) + (replacement)}else if ("bounding"['$===']($case)) {return "" + (m['$[]'](1)) + (replacement) + (m['$[]'](2))}else { return nil }})()
        };
      };

      def.$sub_attributes = function(data, opts) {
        var $a, $b, TMP_16, self = this, string_data = nil, lines = nil, result = nil;

        if (opts == null) {
          opts = $hash2([], {})
        }
        if ((($a = data['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return data};
        string_data = data['$is_a?']((($a = $opal.Object._scope.String) == null ? $opal.cm('String') : $a));
        lines = (function() {if (string_data !== false && string_data !== nil) {
          return [data]
          } else {
          return data
        }; return nil; })();
        result = [];
        ($a = ($b = lines).$each, $a._p = (TMP_16 = function(line){var self = TMP_16._s || this, $a, $b, TMP_17, $c, $d, reject = nil, reject_if_empty = nil;
if (line == null) line = nil;
        reject = false;
          reject_if_empty = false;
          if ((($a = line['$include?']("{")) !== nil && (!$a._isBoolean || $a == true))) {
            line = ($a = ($b = line).$gsub, $a._p = (TMP_17 = function(){var self = TMP_17._s || this, $a, $b, TMP_18, $c, TMP_19, m = nil, offset = nil, directive = nil, expr = nil, $case = nil, args = nil, _ = nil, value = nil, val = nil, key = nil;
              if (self.document == null) self.document = nil;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            m = $gvars["~"];
              if ((($a = ((($b = m['$[]'](1)['$==']("\\")) !== false && $b !== nil) ? $b : m['$[]'](4)['$==']("\\"))) !== nil && (!$a._isBoolean || $a == true))) {
                return "{" + (m['$[]'](2)) + "}"
              } else if ((($a = m['$[]'](3)['$nil_or_empty?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
                offset = ((directive = m['$[]'](3))).$length()['$+'](1);
                expr = m['$[]'](2)['$[]']($range(offset, -1, false));
                return (function() {$case = directive;if ("set"['$===']($case)) {args = expr.$split(":");
                $a = $opal.to_ary($scope.Parser.$store_attribute(args['$[]'](0), ((($b = args['$[]'](1)) !== false && $b !== nil) ? $b : ""), self.document)), _ = ($a[0] == null ? nil : $a[0]), value = ($a[1] == null ? nil : $a[1]);
                if (value !== false && value !== nil) {
                } else if (self.document.$attributes().$fetch("attribute-undefined", $scope.Compliance.$attribute_undefined())['$==']("drop-line")) {
                  ($a = ($b = $scope.Debug).$debug, $a._p = (TMP_18 = function(){var self = TMP_18._s || this;

                  return "Undefining attribute: " + (self.$key()) + ", line marked for removal"}, TMP_18._s = self, TMP_18), $a).call($b);
                  reject = true;
                  return ($breaker.$v = "", $breaker);};
                reject_if_empty = true;
                return "";}else if ("counter"['$===']($case) || "counter2"['$===']($case)) {args = expr.$split(":");
                val = self.document.$counter(args['$[]'](0), args['$[]'](1));
                if (directive['$==']("counter2")) {
                  reject_if_empty = true;
                  return "";
                  } else {
                  return val
                };}else {self.$warn("asciidoctor: WARNING: illegal attribute directive: " + (m['$[]'](3)));
                return m['$[]'](0);}})();
              } else if ((($a = ($c = (key = m['$[]'](2).$downcase()), $c !== false && $c !== nil ?(self.document.$attributes()['$has_key?'](key)) : $c)) !== nil && (!$a._isBoolean || $a == true))) {
                return self.document.$attributes()['$[]'](key)
              } else if ((($a = $scope.INTRINSIC_ATTRIBUTES['$has_key?'](key)) !== nil && (!$a._isBoolean || $a == true))) {
                return $scope.INTRINSIC_ATTRIBUTES['$[]'](key)
                } else {
                return (function() {$case = (((($a = opts['$[]']("attribute_missing")) !== false && $a !== nil) ? $a : self.document.$attributes().$fetch("attribute-missing", $scope.Compliance.$attribute_missing())));if ("skip"['$===']($case)) {return m['$[]'](0)}else if ("drop-line"['$===']($case)) {($a = ($c = $scope.Debug).$debug, $a._p = (TMP_19 = function(){var self = TMP_19._s || this;

                return "Missing attribute: " + (key) + ", line marked for removal"}, TMP_19._s = self, TMP_19), $a).call($c);
                reject = true;
                return ($breaker.$v = "", $breaker);}else {reject_if_empty = true;
                return "";}})()
              };}, TMP_17._s = self, TMP_17), $a).call($b, $scope.AttributeReferenceRx)};
          if ((($a = ((($c = reject) !== false && $c !== nil) ? $c : ((($d = reject_if_empty !== false && reject_if_empty !== nil) ? line['$empty?']() : $d)))) !== nil && (!$a._isBoolean || $a == true))) {
            return nil
            } else {
            return result['$<<'](line)
          };}, TMP_16._s = self, TMP_16), $a).call($b);
        if (string_data !== false && string_data !== nil) {
          return (result['$*']($scope.EOL))
          } else {
          return result
        };
      };

      def.$sub_macros = function(source) {
        var $a, $b, $c, TMP_20, TMP_22, $d, TMP_24, $e, TMP_26, $f, $g, TMP_28, TMP_29, $h, TMP_30, $i, $j, TMP_31, TMP_32, $k, TMP_33, self = this, found = nil, found_colon = nil, use_link_attrs = nil, experimental = nil, result = nil, extensions = nil;
        if (self.document == null) self.document = nil;

        if ((($a = source['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return source};
        found = $hash2([], {});
        found['$[]=']("square_bracket", source['$include?']("["));
        found['$[]=']("round_bracket", source['$include?']("("));
        found['$[]=']("colon", found_colon = source['$include?'](":"));
        found['$[]=']("macroish", (($a = found['$[]']("square_bracket"), $a !== false && $a !== nil ?found_colon : $a)));
        found['$[]=']("macroish_short_form", (($a = ($b = found['$[]']("square_bracket"), $b !== false && $b !== nil ?found_colon : $b), $a !== false && $a !== nil ?source['$include?'](":[") : $a)));
        use_link_attrs = self.document.$attributes()['$has_key?']("linkattrs");
        experimental = self.document.$attributes()['$has_key?']("experimental");
        result = "" + (source);
        if (experimental !== false && experimental !== nil) {
          if ((($a = ($b = found['$[]']("macroish_short_form"), $b !== false && $b !== nil ?(((($c = result['$include?']("kbd:")) !== false && $c !== nil) ? $c : result['$include?']("btn:"))) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            result = ($a = ($b = result).$gsub, $a._p = (TMP_20 = function(){var self = TMP_20._s || this, $a, $b, TMP_21, m = nil, captured = nil, keys = nil, label = nil;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            m = $gvars["~"];
              if ((($a = ((captured = m['$[]'](0)))['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
                return captured['$[]']($range(1, -1, false));};
              if ((($a = captured['$start_with?']("kbd")) !== nil && (!$a._isBoolean || $a == true))) {
                keys = self.$unescape_bracketed_text(m['$[]'](1));
                if (keys['$==']("+")) {
                  keys = ["+"]
                  } else {
                  keys = ($a = ($b = keys.$split($scope.KbdDelimiterRx)).$inject, $a._p = (TMP_21 = function(c, key){var self = TMP_21._s || this, $a;
if (c == null) c = nil;if (key == null) key = nil;
                  if ((($a = key['$end_with?']("++")) !== nil && (!$a._isBoolean || $a == true))) {
                      c['$<<'](key['$[]']($range(0, -3, false)).$strip());
                      c['$<<']("+");
                      } else {
                      c['$<<'](key.$strip())
                    };
                    return c;}, TMP_21._s = self, TMP_21), $a).call($b, [])
                };
                return $scope.Inline.$new(self, "kbd", nil, $hash2(["attributes"], {"attributes": $hash2(["keys"], {"keys": keys})})).$convert();
              } else if ((($a = captured['$start_with?']("btn")) !== nil && (!$a._isBoolean || $a == true))) {
                label = self.$unescape_bracketed_text(m['$[]'](1));
                return $scope.Inline.$new(self, "button", label).$convert();
                } else {
                return nil
              };}, TMP_20._s = self, TMP_20), $a).call($b, $scope.KbdBtnInlineMacroRx)};
          if ((($a = ($c = found['$[]']("macroish"), $c !== false && $c !== nil ?result['$include?']("menu:") : $c)) !== nil && (!$a._isBoolean || $a == true))) {
            result = ($a = ($c = result).$gsub, $a._p = (TMP_22 = function(){var self = TMP_22._s || this, $a, $b, TMP_23, m = nil, captured = nil, menu = nil, items = nil, submenus = nil, menuitem = nil, delim = nil;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            m = $gvars["~"];
              if ((($a = ((captured = m['$[]'](0)))['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
                return captured['$[]']($range(1, -1, false));};
              menu = m['$[]'](1);
              items = m['$[]'](2);
              if ((($a = items['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
                submenus = [];
                menuitem = nil;
              } else if ((($a = (delim = (function() {if ((($b = items['$include?']("&gt;")) !== nil && (!$b._isBoolean || $b == true))) {
                return "&gt;"
                } else {
                return ((function() {if ((($b = items['$include?'](",")) !== nil && (!$b._isBoolean || $b == true))) {
                  return ","
                  } else {
                  return nil
                }; return nil; })())
              }; return nil; })())) !== nil && (!$a._isBoolean || $a == true))) {
                submenus = ($a = ($b = items.$split(delim)).$map, $a._p = (TMP_23 = function(it){var self = TMP_23._s || this;
if (it == null) it = nil;
                return it.$strip()}, TMP_23._s = self, TMP_23), $a).call($b);
                menuitem = submenus.$pop();
                } else {
                submenus = [];
                menuitem = items.$rstrip();
              };
              return $scope.Inline.$new(self, "menu", nil, $hash2(["attributes"], {"attributes": $hash2(["menu", "submenus", "menuitem"], {"menu": menu, "submenus": submenus, "menuitem": menuitem})})).$convert();}, TMP_22._s = self, TMP_22), $a).call($c, $scope.MenuInlineMacroRx)};
          if ((($a = ($d = result['$include?']("\""), $d !== false && $d !== nil ?result['$include?']("&gt;") : $d)) !== nil && (!$a._isBoolean || $a == true))) {
            result = ($a = ($d = result).$gsub, $a._p = (TMP_24 = function(){var self = TMP_24._s || this, $a, $b, $c, TMP_25, m = nil, captured = nil, input = nil, menu = nil, submenus = nil, menuitem = nil;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            m = $gvars["~"];
              if ((($a = ((captured = m['$[]'](0)))['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
                return captured['$[]']($range(1, -1, false));};
              input = m['$[]'](1);
              $a = $opal.to_ary(($b = ($c = input.$split("&gt;")).$map, $b._p = (TMP_25 = function(it){var self = TMP_25._s || this;
if (it == null) it = nil;
              return it.$strip()}, TMP_25._s = self, TMP_25), $b).call($c)), menu = ($a[0] == null ? nil : $a[0]), submenus = $slice.call($a, 1);
              menuitem = submenus.$pop();
              return $scope.Inline.$new(self, "menu", nil, $hash2(["attributes"], {"attributes": $hash2(["menu", "submenus", "menuitem"], {"menu": menu, "submenus": submenus, "menuitem": menuitem})})).$convert();}, TMP_24._s = self, TMP_24), $a).call($d, $scope.MenuInlineRx)};};
        if ((($a = ($e = (extensions = self.document.$extensions()), $e !== false && $e !== nil ?extensions['$inline_macros?']() : $e)) !== nil && (!$a._isBoolean || $a == true))) {
          ($a = ($e = extensions.$inline_macros()).$each, $a._p = (TMP_26 = function(extension){var self = TMP_26._s || this, $a, $b, TMP_27;
if (extension == null) extension = nil;
          return result = ($a = ($b = result).$gsub, $a._p = (TMP_27 = function(){var self = TMP_27._s || this, $a, m = nil, target = nil, attributes = nil;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            m = $gvars["~"];
              if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
                return m['$[]'](0)['$[]']($range(1, -1, false));};
              target = m['$[]'](1);
              attributes = (function() {if (extension.$config()['$[]']("format")['$==']("short")) {
                return $hash2([], {})
              } else if (extension.$config()['$[]']("content_model")['$==']("attributes")) {
                return self.$parse_attributes(m['$[]'](2), (((($a = extension.$config()['$[]']("pos_attrs")) !== false && $a !== nil) ? $a : [])), $hash2(["sub_input", "unescape_input"], {"sub_input": true, "unescape_input": true}))
                } else {
                return $hash2(["text"], {"text": (self.$unescape_bracketed_text(m['$[]'](2)))})
              }; return nil; })();
              return extension.$process_method()['$[]'](self, target, attributes);}, TMP_27._s = self, TMP_27), $a).call($b, extension.$config()['$[]']("regexp"))}, TMP_26._s = self, TMP_26), $a).call($e)};
        if ((($a = ($f = found['$[]']("macroish"), $f !== false && $f !== nil ?(((($g = result['$include?']("image:")) !== false && $g !== nil) ? $g : result['$include?']("icon:"))) : $f)) !== nil && (!$a._isBoolean || $a == true))) {
          result = ($a = ($f = result).$gsub, $a._p = (TMP_28 = function(){var self = TMP_28._s || this, $a, $b, $c, m = nil, raw_attrs = nil, type = nil, posattrs = nil, target = nil, attrs = nil;
            if (self.document == null) self.document = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0)['$[]']($range(1, -1, false));};
            raw_attrs = self.$unescape_bracketed_text(m['$[]'](2));
            if ((($a = m['$[]'](0)['$start_with?']("icon:")) !== nil && (!$a._isBoolean || $a == true))) {
              type = "icon";
              posattrs = ["size"];
              } else {
              type = "image";
              posattrs = ["alt", "width", "height"];
            };
            target = self.$sub_attributes(m['$[]'](1));
            if (type['$==']("icon")) {
              } else {
              self.document.$register("images", target)
            };
            attrs = self.$parse_attributes(raw_attrs, posattrs);
            ($a = "alt", $b = attrs, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, $scope.File.$basename(target, $scope.File.$extname(target)))));
            return $scope.Inline.$new(self, "image", nil, $hash2(["type", "target", "attributes"], {"type": type, "target": target, "attributes": attrs})).$convert();}, TMP_28._s = self, TMP_28), $a).call($f, $scope.ImageInlineMacroRx)};
        if ((($a = ((($g = found['$[]']("macroish_short_form")) !== false && $g !== nil) ? $g : found['$[]']("round_bracket"))) !== nil && (!$a._isBoolean || $a == true))) {
          result = ($a = ($g = result).$gsub, $a._p = (TMP_29 = function(){var self = TMP_29._s || this, $a, $b, m = nil, num_brackets = nil, text_in_brackets = nil, macro_name = nil, terms = nil, text = nil;
            if (self.document == null) self.document = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0)['$[]']($range(1, -1, false));};
            if ((($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              if (m['$[]'](1)['$==']("")) {
                m['$[]='](1, nil)}};
            num_brackets = 0;
            text_in_brackets = nil;
            if ((($a = (macro_name = m['$[]'](1))) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              text_in_brackets = m['$[]'](3);
              if ((($a = ($b = (text_in_brackets['$start_with?']("(")), $b !== false && $b !== nil ?(text_in_brackets['$end_with?'](")")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                text_in_brackets = text_in_brackets['$[]']($range(1, -1, true));
                num_brackets = 3;
                } else {
                num_brackets = 2
              };
            };
            if ((($a = ((($b = macro_name['$==']("indexterm")) !== false && $b !== nil) ? $b : num_brackets['$=='](3))) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = macro_name['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
                terms = self.$split_simple_csv(self.$normalize_string(text_in_brackets))
                } else {
                terms = self.$split_simple_csv(self.$normalize_string(m['$[]'](2), true))
              };
              self.document.$register("indexterms", [].concat(terms));
              return $scope.Inline.$new(self, "indexterm", nil, $hash2(["attributes"], {"attributes": $hash2(["terms"], {"terms": terms})})).$convert();
              } else {
              if ((($a = macro_name['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
                text = self.$normalize_string(text_in_brackets)
                } else {
                text = self.$normalize_string(m['$[]'](2), true)
              };
              self.document.$register("indexterms", [text]);
              return $scope.Inline.$new(self, "indexterm", text, $hash2(["type"], {"type": "visible"})).$convert();
            };}, TMP_29._s = self, TMP_29), $a).call($g, $scope.IndextermInlineMacroRx)};
        if ((($a = (($h = found_colon !== false && found_colon !== nil) ? (result['$include?']("://")) : $h)) !== nil && (!$a._isBoolean || $a == true))) {
          result = ($a = ($h = result).$gsub, $a._p = (TMP_30 = function(){var self = TMP_30._s || this, $a, $b, $c, m = nil, prefix = nil, target = nil, suffix = nil, $case = nil, attrs = nil, text = nil;
            if (self.document == null) self.document = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](2)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return "" + (m['$[]'](1)) + (m['$[]'](2)['$[]']($range(1, -1, false))) + (m['$[]'](3));};
            if ((($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              if (m['$[]'](3)['$==']("")) {
                m['$[]='](3, nil)}};
            if ((($a = (($b = m['$[]'](1)['$==']("link:")) ? m['$[]'](3)['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0);};
            prefix = ((function() {if ((($a = m['$[]'](1)['$==']("link:")['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](1)
              } else {
              return ""
            }; return nil; })());
            target = m['$[]'](2);
            suffix = "";
            if ((($a = ((($b = m['$[]'](3)) !== false && $b !== nil) ? $b : ($c = target['$=~']($scope.UriTerminator), ($c === nil || $c === false)))) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              $case = $gvars["~"]['$[]'](0);if (")"['$===']($case)) {target = target['$[]']($range(0, -2, false));
              suffix = ")";}else if (";"['$===']($case)) {if ((($a = ($b = prefix['$start_with?']("&lt;"), $b !== false && $b !== nil ?target['$end_with?']("&gt;") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                prefix = prefix['$[]']($range(4, -1, false));
                target = target['$[]']($range(0, -5, false));
              } else if ((($a = target['$end_with?'](");")) !== nil && (!$a._isBoolean || $a == true))) {
                target = target['$[]']($range(0, -3, false));
                suffix = ");";
                } else {
                target = target['$[]']($range(0, -2, false));
                suffix = ";";
              }}else if (":"['$===']($case)) {if ((($a = target['$end_with?']("):")) !== nil && (!$a._isBoolean || $a == true))) {
                target = target['$[]']($range(0, -3, false));
                suffix = "):";
                } else {
                target = target['$[]']($range(0, -2, false));
                suffix = ":";
              }}
            };
            self.document.$register("links", target);
            attrs = nil;
            if ((($a = m['$[]'](3)['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              text = ""
              } else {
              if ((($a = (($b = use_link_attrs !== false && use_link_attrs !== nil) ? (((($c = m['$[]'](3)['$start_with?']("\"")) !== false && $c !== nil) ? $c : m['$[]'](3)['$include?'](","))) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                attrs = self.$parse_attributes(self.$sub_attributes(m['$[]'](3).$gsub("\\]", "]")), []);
                text = attrs['$[]'](1);
                } else {
                text = self.$sub_attributes(m['$[]'](3).$gsub("\\]", "]"))
              };
              if ((($a = text['$end_with?']("^")) !== nil && (!$a._isBoolean || $a == true))) {
                text = text.$chop();
                ((($a = attrs) !== false && $a !== nil) ? $a : attrs = $hash2([], {}));
                if ((($a = attrs['$has_key?']("window")) !== nil && (!$a._isBoolean || $a == true))) {
                  } else {
                  attrs['$[]=']("window", "_blank")
                };};
            };
            if ((($a = text['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = self.document['$attr?']("hide-uri-scheme")) !== nil && (!$a._isBoolean || $a == true))) {
                text = target.$sub($scope.UriSniffRx, "")
                } else {
                text = target
              }};
            return "" + (prefix) + ($scope.Inline.$new(self, "anchor", text, $hash2(["type", "target", "attributes"], {"type": "link", "target": target, "attributes": attrs})).$convert()) + (suffix);}, TMP_30._s = self, TMP_30), $a).call($h, $scope.LinkInlineRx)};
        if ((($a = ((($i = ($j = found['$[]']("macroish"), $j !== false && $j !== nil ?(result['$include?']("link:")) : $j)) !== false && $i !== nil) ? $i : (result['$include?']("mailto:")))) !== nil && (!$a._isBoolean || $a == true))) {
          result = ($a = ($i = result).$gsub, $a._p = (TMP_31 = function(){var self = TMP_31._s || this, $a, $b, $c, m = nil, raw_target = nil, mailto = nil, target = nil, attrs = nil, text = nil;
            if (self.document == null) self.document = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0)['$[]']($range(1, -1, false));};
            raw_target = m['$[]'](1);
            mailto = m['$[]'](0)['$start_with?']("mailto:");
            target = (function() {if (mailto !== false && mailto !== nil) {
              return "mailto:" + (raw_target)
              } else {
              return raw_target
            }; return nil; })();
            attrs = nil;
            if ((($a = (($b = use_link_attrs !== false && use_link_attrs !== nil) ? (((($c = m['$[]'](2)['$start_with?']("\"")) !== false && $c !== nil) ? $c : m['$[]'](2)['$include?'](","))) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              attrs = self.$parse_attributes(self.$sub_attributes(m['$[]'](2).$gsub("\\]", "]")), []);
              text = attrs['$[]'](1);
              if (mailto !== false && mailto !== nil) {
                if ((($a = attrs['$has_key?'](2)) !== nil && (!$a._isBoolean || $a == true))) {
                  target = "" + (target) + "?subject=" + ($scope.Helpers.$encode_uri(attrs['$[]'](2)));
                  if ((($a = attrs['$has_key?'](3)) !== nil && (!$a._isBoolean || $a == true))) {
                    target = "" + (target) + "&amp;body=" + ($scope.Helpers.$encode_uri(attrs['$[]'](3)))};}};
              } else {
              text = self.$sub_attributes(m['$[]'](2).$gsub("\\]", "]"))
            };
            if ((($a = text['$end_with?']("^")) !== nil && (!$a._isBoolean || $a == true))) {
              text = text.$chop();
              ((($a = attrs) !== false && $a !== nil) ? $a : attrs = $hash2([], {}));
              if ((($a = attrs['$has_key?']("window")) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                attrs['$[]=']("window", "_blank")
              };};
            self.document.$register("links", target);
            if ((($a = text['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = self.document['$attr?']("hide-uri-scheme")) !== nil && (!$a._isBoolean || $a == true))) {
                text = raw_target.$sub($scope.UriSniffRx, "")
                } else {
                text = raw_target
              }};
            return $scope.Inline.$new(self, "anchor", text, $hash2(["type", "target", "attributes"], {"type": "link", "target": target, "attributes": attrs})).$convert();}, TMP_31._s = self, TMP_31), $a).call($i, $scope.LinkInlineMacroRx)};
        if ((($a = result['$include?']("@")) !== nil && (!$a._isBoolean || $a == true))) {
          result = ($a = ($j = result).$gsub, $a._p = (TMP_32 = function(){var self = TMP_32._s || this, $a, m = nil, address = nil, lead = nil, $case = nil, target = nil;
            if (self.document == null) self.document = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            address = m['$[]'](0);
            if ((($a = (lead = m['$[]'](1))) !== nil && (!$a._isBoolean || $a == true))) {
              $case = lead;if ("\\"['$===']($case)) {return address['$[]']($range(1, -1, false));}else {return address;}};
            target = "mailto:" + (address);
            self.document.$register("links", target);
            return $scope.Inline.$new(self, "anchor", address, $hash2(["type", "target"], {"type": "link", "target": target})).$convert();}, TMP_32._s = self, TMP_32), $a).call($j, $scope.EmailInlineMacroRx)};
        if ((($a = ($k = found['$[]']("macroish_short_form"), $k !== false && $k !== nil ?result['$include?']("footnote") : $k)) !== nil && (!$a._isBoolean || $a == true))) {
          result = ($a = ($k = result).$gsub, $a._p = (TMP_33 = function(){var self = TMP_33._s || this, $a, $b, $c, TMP_34, m = nil, id = nil, text = nil, index = nil, type = nil, target = nil, footnote = nil;
            if (self.document == null) self.document = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0)['$[]']($range(1, -1, false));};
            if (m['$[]'](1)['$==']("footnote")) {
              id = nil;
              text = self.$restore_passthroughs(self.$sub_inline_xrefs(self.$sub_inline_anchors(self.$normalize_string(m['$[]'](2), true))));
              index = self.document.$counter("footnote-number");
              self.document.$register("footnotes", ($scope.Document)._scope.Footnote.$new(index, id, text));
              type = nil;
              target = nil;
              } else {
              $a = $opal.to_ary(m['$[]'](2).$split(",", 2)), id = ($a[0] == null ? nil : $a[0]), text = ($a[1] == null ? nil : $a[1]);
              id = id.$strip();
              if ((($a = text['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                if ((($a = (footnote = ($b = ($c = self.document.$references()['$[]']("footnotes")).$find, $b._p = (TMP_34 = function(fn){var self = TMP_34._s || this;
if (fn == null) fn = nil;
                return fn.$id()['$=='](id)}, TMP_34._s = self, TMP_34), $b).call($c))) !== nil && (!$a._isBoolean || $a == true))) {
                  index = footnote.$index();
                  text = footnote.$text();
                  } else {
                  index = nil;
                  text = id;
                };
                target = id;
                id = nil;
                type = "xref";
                } else {
                text = self.$restore_passthroughs(self.$sub_inline_xrefs(self.$sub_inline_anchors(self.$normalize_string(text, true))));
                index = self.document.$counter("footnote-number");
                self.document.$register("footnotes", ($scope.Document)._scope.Footnote.$new(index, id, text));
                type = "ref";
                target = nil;
              };
            };
            return $scope.Inline.$new(self, "footnote", text, $hash2(["attributes", "id", "target", "type"], {"attributes": $hash2(["index"], {"index": index}), "id": id, "target": target, "type": type})).$convert();}, TMP_33._s = self, TMP_33), $a).call($k, $scope.FootnoteInlineMacroRx)};
        return self.$sub_inline_xrefs(self.$sub_inline_anchors(result, found), found);
      };

      def.$sub_inline_anchors = function(text, found) {
        var $a, $b, $c, TMP_35, $d, $e, TMP_36, self = this;

        if (found == null) {
          found = nil
        }
        if ((($a = ($b = (((($c = found['$!']()) !== false && $c !== nil) ? $c : found['$[]']("square_bracket"))), $b !== false && $b !== nil ?text['$include?']("[[[") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          text = ($a = ($b = text).$gsub, $a._p = (TMP_35 = function(){var self = TMP_35._s || this, $a, m = nil, id = nil, reftext = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0)['$[]']($range(1, -1, false));};
            id = reftext = m['$[]'](1);
            return $scope.Inline.$new(self, "anchor", reftext, $hash2(["type", "target"], {"type": "bibref", "target": id})).$convert();}, TMP_35._s = self, TMP_35), $a).call($b, $scope.InlineBiblioAnchorRx)};
        if ((($a = ((($c = (($d = (((($e = found['$!']()) !== false && $e !== nil) ? $e : found['$[]']("square_bracket"))), $d !== false && $d !== nil ?text['$include?']("[[") : $d))) !== false && $c !== nil) ? $c : (($d = (((($e = found['$!']()) !== false && $e !== nil) ? $e : found['$[]']("macroish"))), $d !== false && $d !== nil ?text['$include?']("anchor:") : $d)))) !== nil && (!$a._isBoolean || $a == true))) {
          text = ($a = ($c = text).$gsub, $a._p = (TMP_36 = function(){var self = TMP_36._s || this, $a, $b, TMP_37, m = nil, id = nil, reftext = nil;
            if (self.document == null) self.document = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0)['$[]']($range(1, -1, false));};
            if ((($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              if (m['$[]'](1)['$==']("")) {
                m['$[]='](1, nil)};
              if (m['$[]'](2)['$==']("")) {
                m['$[]='](2, nil)};
              if (m['$[]'](4)['$==']("")) {
                m['$[]='](4, nil)};};
            id = ((($a = m['$[]'](1)) !== false && $a !== nil) ? $a : m['$[]'](3));
            reftext = ((($a = ((($b = m['$[]'](2)) !== false && $b !== nil) ? $b : m['$[]'](4))) !== false && $a !== nil) ? $a : "[" + (id) + "]");
            if ((($a = self.document.$references()['$[]']("ids")['$has_key?'](id)) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              ($a = ($b = $scope.Debug).$debug, $a._p = (TMP_37 = function(){var self = TMP_37._s || this;

              return "Missing reference for anchor " + (id)}, TMP_37._s = self, TMP_37), $a).call($b)
            };
            return $scope.Inline.$new(self, "anchor", reftext, $hash2(["type", "target"], {"type": "ref", "target": id})).$convert();}, TMP_36._s = self, TMP_36), $a).call($c, $scope.InlineAnchorRx)};
        return text;
      };

      def.$sub_inline_xrefs = function(text, found) {
        var $a, $b, $c, TMP_38, self = this;

        if (found == null) {
          found = nil
        }
        if ((($a = ((($b = (((($c = found['$!']()) !== false && $c !== nil) ? $c : found['$[]']("macroish")))) !== false && $b !== nil) ? $b : text['$include?']("&lt;&lt;"))) !== nil && (!$a._isBoolean || $a == true))) {
          text = ($a = ($b = text).$gsub, $a._p = (TMP_38 = function(){var self = TMP_38._s || this, $a, $b, $c, TMP_39, m = nil, id = nil, reftext = nil, path = nil, fragment = nil, refid = nil, target = nil;
            if (self.document == null) self.document = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](0)['$[]']($range(1, -1, false));};
            if ((($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              if (m['$[]'](1)['$==']("")) {
                m['$[]='](1, nil)}};
            if ((($a = m['$[]'](1)) !== nil && (!$a._isBoolean || $a == true))) {
              $a = $opal.to_ary(($b = ($c = m['$[]'](1).$split(",", 2)).$map, $b._p = (TMP_39 = function(it){var self = TMP_39._s || this;
if (it == null) it = nil;
              return it.$strip()}, TMP_39._s = self, TMP_39), $b).call($c)), id = ($a[0] == null ? nil : $a[0]), reftext = ($a[1] == null ? nil : $a[1]);
              id = id.$sub($scope.DoubleQuotedRx, "\\2");
              reftext = (function() {if ((($a = reftext['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                return nil
                } else {
                return reftext.$sub($scope.DoubleQuotedMultiRx, "\\2")
              }; return nil; })();
              } else {
              id = m['$[]'](2);
              if ((($a = m['$[]'](3)['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                reftext = m['$[]'](3)
              };
            };
            if ((($a = id['$include?']("#")) !== nil && (!$a._isBoolean || $a == true))) {
              $a = $opal.to_ary(id.$split("#")), path = ($a[0] == null ? nil : $a[0]), fragment = ($a[1] == null ? nil : $a[1])
              } else {
              path = nil;
              fragment = id;
            };
            if ((($a = path['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              refid = fragment;
              target = "#" + (fragment);
              } else {
              path = $scope.Helpers.$rootname(path);
              if ((($a = ((($b = self.document.$attributes()['$[]']("docname")['$=='](path)) !== false && $b !== nil) ? $b : self.document.$references()['$[]']("includes")['$include?'](path))) !== nil && (!$a._isBoolean || $a == true))) {
                refid = fragment;
                path = nil;
                target = "#" + (fragment);
                } else {
                refid = (function() {if (fragment !== false && fragment !== nil) {
                  return "" + (path) + "#" + (fragment)
                  } else {
                  return path
                }; return nil; })();
                path = "" + (self.document.$attributes()['$[]']("relfileprefix")) + (path) + (self.document.$attributes().$fetch("outfilesuffix", ".html"));
                target = (function() {if (fragment !== false && fragment !== nil) {
                  return "" + (path) + "#" + (fragment)
                  } else {
                  return path
                }; return nil; })();
              };
            };
            return $scope.Inline.$new(self, "anchor", reftext, $hash2(["type", "target", "attributes"], {"type": "xref", "target": target, "attributes": $hash2(["path", "fragment", "refid"], {"path": path, "fragment": fragment, "refid": refid})})).$convert();}, TMP_38._s = self, TMP_38), $a).call($b, $scope.XrefInlineMacroRx)};
        return text;
      };

      def.$sub_callouts = function(text) {
        var $a, $b, TMP_40, self = this;

        return ($a = ($b = text).$gsub, $a._p = (TMP_40 = function(){var self = TMP_40._s || this, m = nil;
          if (self.document == null) self.document = nil;
          if ($gvars["~"] == null) $gvars["~"] = nil;

        m = $gvars["~"];
          if (m['$[]'](1)['$==']("\\")) {
            return m['$[]'](0).$sub("\\", "");};
          return $scope.Inline.$new(self, "callout", m['$[]'](3), $hash2(["id"], {"id": self.document.$callouts().$read_next_id()})).$convert();}, TMP_40._s = self, TMP_40), $a).call($b, $scope.CalloutConvertRx);
      };

      def.$sub_post_replacements = function(text) {
        var $a, $b, TMP_41, $c, TMP_42, self = this, lines = nil, last = nil;
        if (self.document == null) self.document = nil;
        if (self.attributes == null) self.attributes = nil;

        if ((($a = ((($b = (self.document.$attributes()['$has_key?']("hardbreaks"))) !== false && $b !== nil) ? $b : (self.attributes['$has_key?']("hardbreaks-option")))) !== nil && (!$a._isBoolean || $a == true))) {
          lines = (text.$split($scope.EOL));
          if (lines.$size()['$=='](1)) {
            return text};
          last = lines.$pop();
          return ($a = ($b = lines).$map, $a._p = (TMP_41 = function(line){var self = TMP_41._s || this;
if (line == null) line = nil;
          return $scope.Inline.$new(self, "break", line.$rstrip().$chomp($scope.LINE_BREAK), $hash2(["type"], {"type": "line"})).$convert()}, TMP_41._s = self, TMP_41), $a).call($b).$push(last)['$*']($scope.EOL);
        } else if ((($a = text['$include?']("+")) !== nil && (!$a._isBoolean || $a == true))) {
          return ($a = ($c = text).$gsub, $a._p = (TMP_42 = function(){var self = TMP_42._s || this;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          return $scope.Inline.$new(self, "break", $gvars["~"]['$[]'](1), $hash2(["type"], {"type": "line"})).$convert()}, TMP_42._s = self, TMP_42), $a).call($c, $scope.LineBreakRx)
          } else {
          return text
        };
      };

      def.$convert_quoted_text = function(match, type, scope) {
        var $a, $b, self = this, unescaped_attrs = nil, attrs = nil, attributes = nil, id = nil;

        unescaped_attrs = nil;
        if ((($a = match['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = (($b = scope['$==']("constrained")) ? ((attrs = match['$[]'](2)))['$nil_or_empty?']()['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            unescaped_attrs = "[" + (attrs) + "]"
            } else {
            return match['$[]'](0)['$[]']($range(1, -1, false))
          }};
        if (scope['$==']("constrained")) {
          if (unescaped_attrs !== false && unescaped_attrs !== nil) {
            return "" + (unescaped_attrs) + ($scope.Inline.$new(self, "quoted", match['$[]'](3), $hash2(["type"], {"type": type})).$convert())
            } else {
            attributes = self.$parse_quoted_text_attributes(match['$[]'](2));
            id = (function() {if (attributes !== false && attributes !== nil) {
              return attributes.$delete("id")
              } else {
              return nil
            }; return nil; })();
            return "" + (match['$[]'](1)) + ($scope.Inline.$new(self, "quoted", match['$[]'](3), $hash2(["type", "id", "attributes"], {"type": type, "id": id, "attributes": attributes})).$convert());
          }
          } else {
          attributes = self.$parse_quoted_text_attributes(match['$[]'](1));
          id = (function() {if (attributes !== false && attributes !== nil) {
            return attributes.$delete("id")
            } else {
            return nil
          }; return nil; })();
          return $scope.Inline.$new(self, "quoted", match['$[]'](2), $hash2(["type", "id", "attributes"], {"type": type, "id": id, "attributes": attributes})).$convert();
        };
      };

      def.$parse_quoted_text_attributes = function(str) {
        var $a, $b, self = this, _ = nil, segments = nil, id = nil, more_roles = nil, roles = nil, attrs = nil;

        if (str !== false && str !== nil) {
          } else {
          return nil
        };
        if ((($a = str['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return $hash2([], {})};
        if ((($a = str['$include?']("{")) !== nil && (!$a._isBoolean || $a == true))) {
          str = self.$sub_attributes(str)};
        str = str.$strip();
        if ((($a = str['$include?'](",")) !== nil && (!$a._isBoolean || $a == true))) {
          $a = $opal.to_ary(str.$split(",", 2)), str = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1])};
        if ((($a = str['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return $hash2([], {})
        } else if ((($a = ((($b = str['$start_with?'](".")) !== false && $b !== nil) ? $b : str['$start_with?']("#"))) !== nil && (!$a._isBoolean || $a == true))) {
          segments = str.$split("#", 2);
          if (segments.$length()['$>'](1)) {
            $a = $opal.to_ary(segments['$[]'](1).$split(".")), id = ($a[0] == null ? nil : $a[0]), more_roles = $slice.call($a, 1)
            } else {
            id = nil;
            more_roles = [];
          };
          roles = (function() {if ((($a = segments['$[]'](0)['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return []
            } else {
            return segments['$[]'](0).$split(".")
          }; return nil; })();
          if (roles.$length()['$>'](1)) {
            roles.$shift()};
          if (more_roles.$length()['$>'](0)) {
            roles.$concat(more_roles)};
          attrs = $hash2([], {});
          if (id !== false && id !== nil) {
            attrs['$[]=']("id", id)};
          if ((($a = roles['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            attrs['$[]=']("role", roles['$*'](" "))
          };
          return attrs;
          } else {
          return $hash2(["role"], {"role": str})
        };
      };

      def.$parse_attributes = function(attrline, posattrs, opts) {
        var $a, self = this, block = nil, into = nil;
        if (self.document == null) self.document = nil;

        if (posattrs == null) {
          posattrs = ["role"]
        }
        if (opts == null) {
          opts = $hash2([], {})
        }
        if (attrline !== false && attrline !== nil) {
          } else {
          return nil
        };
        if ((($a = attrline['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return $hash2([], {})};
        if ((($a = opts['$[]']("sub_input")) !== nil && (!$a._isBoolean || $a == true))) {
          attrline = self.document.$sub_attributes(attrline)};
        if ((($a = opts['$[]']("unescape_input")) !== nil && (!$a._isBoolean || $a == true))) {
          attrline = self.$unescape_bracketed_text(attrline)};
        block = nil;
        if ((($a = opts.$fetch("sub_result", true)) !== nil && (!$a._isBoolean || $a == true))) {
          block = self};
        if ((($a = (into = opts['$[]']("into"))) !== nil && (!$a._isBoolean || $a == true))) {
          return $scope.AttributeList.$new(attrline, block).$parse_into(into, posattrs)
          } else {
          return $scope.AttributeList.$new(attrline, block).$parse(posattrs)
        };
      };

      def.$unescape_bracketed_text = function(text) {
        var $a, self = this;

        if ((($a = text['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return ""};
        return text.$strip().$tr($scope.EOL, " ").$gsub("\\]", "]");
      };

      def.$normalize_string = function(str, unescape_brackets) {
        var $a, self = this;

        if (unescape_brackets == null) {
          unescape_brackets = false
        }
        if ((($a = str['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return ""
        } else if (unescape_brackets !== false && unescape_brackets !== nil) {
          return self.$unescape_brackets(str.$strip().$tr($scope.EOL, " "))
          } else {
          return str.$strip().$tr($scope.EOL, " ")
        };
      };

      def.$unescape_brackets = function(str) {
        var $a, self = this;

        if ((($a = str['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return ""
          } else {
          return str.$gsub("\\]", "]")
        };
      };

      def.$split_simple_csv = function(str) {
        var $a, $b, TMP_43, $c, TMP_44, self = this, values = nil, current = nil, quote_open = nil;

        if ((($a = str['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          values = []
        } else if ((($a = str['$include?']("\"")) !== nil && (!$a._isBoolean || $a == true))) {
          values = [];
          current = [];
          quote_open = false;
          ($a = ($b = str).$each_char, $a._p = (TMP_43 = function(c){var self = TMP_43._s || this, $case = nil;
if (c == null) c = nil;
          return (function() {$case = c;if (","['$===']($case)) {if (quote_open !== false && quote_open !== nil) {
              return current.$push(c)
              } else {
              values['$<<'](current.$join().$strip());
              return current = [];
            }}else if ("\""['$===']($case)) {return quote_open = quote_open['$!']()}else {return current.$push(c)}})()}, TMP_43._s = self, TMP_43), $a).call($b);
          values['$<<'](current.$join().$strip());
          } else {
          values = ($a = ($c = str.$split(",")).$map, $a._p = (TMP_44 = function(it){var self = TMP_44._s || this;
if (it == null) it = nil;
          return it.$strip()}, TMP_44._s = self, TMP_44), $a).call($c)
        };
        return values;
      };

      def.$resolve_subs = function(subs, type, defaults, subject) {
        var $a, $b, TMP_45, self = this, candidates = nil, modification_group = nil, resolved = nil, invalid = nil;

        if (type == null) {
          type = "block"
        }
        if (defaults == null) {
          defaults = nil
        }
        if (subject == null) {
          subject = nil
        }
        if ((($a = subs['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return []};
        candidates = [];
        modification_group = (function() {if (defaults !== false && defaults !== nil) {
          return nil
          } else {
          return false
        }; return nil; })();
        ($a = ($b = subs.$split(",")).$each, $a._p = (TMP_45 = function(val){var self = TMP_45._s || this, $a, $b, $c, key = nil, first = nil, operation = nil, resolved_keys = nil, resolved_key = nil, candidate = nil, $case = nil;
if (val == null) val = nil;
        key = val.$strip();
          if ((($a = modification_group['$=='](false)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            if (((first = key.$chr()))['$==']("+")) {
              operation = "append";
              key = key['$[]']($range(1, -1, false));
            } else if (first['$==']("-")) {
              operation = "remove";
              key = key['$[]']($range(1, -1, false));
            } else if ((($a = key['$end_with?']("+")) !== nil && (!$a._isBoolean || $a == true))) {
              operation = "prepend";
              key = key.$chop();
            } else if (modification_group !== false && modification_group !== nil) {
              self.$warn("asciidoctor: WARNING: invalid entry in substitution modification group" + ((function() {if (subject !== false && subject !== nil) {
                return " for "
                } else {
                return nil
              }; return nil; })()) + (subject) + ": " + (key));
              return nil;;
              } else {
              operation = nil
            };
            if ((($a = modification_group['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
              if (operation !== false && operation !== nil) {
                candidates = defaults.$dup();
                modification_group = true;
                } else {
                modification_group = false
              }};};
          key = key.$to_sym();
          if ((($a = (($b = type['$==']("inline")) ? (((($c = key['$==']("verbatim")) !== false && $c !== nil) ? $c : key['$==']("v"))) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            resolved_keys = ["specialcharacters"]
          } else if ((($a = $scope.COMPOSITE_SUBS['$has_key?'](key)) !== nil && (!$a._isBoolean || $a == true))) {
            resolved_keys = $scope.COMPOSITE_SUBS['$[]'](key)
          } else if ((($a = ($b = (($c = type['$==']("inline")) ? key.$length()['$=='](1) : $c), $b !== false && $b !== nil ?($scope.SUB_SYMBOLS['$has_key?'](key)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            resolved_key = $scope.SUB_SYMBOLS['$[]'](key);
            if ((($a = (candidate = $scope.COMPOSITE_SUBS['$[]'](resolved_key))) !== nil && (!$a._isBoolean || $a == true))) {
              resolved_keys = candidate
              } else {
              resolved_keys = [resolved_key]
            };
            } else {
            resolved_keys = [key]
          };
          if (modification_group !== false && modification_group !== nil) {
            return (function() {$case = operation;if ("append"['$===']($case)) {return candidates = candidates['$+'](resolved_keys)}else if ("prepend"['$===']($case)) {return candidates = resolved_keys['$+'](candidates)}else if ("remove"['$===']($case)) {return candidates = candidates['$-'](resolved_keys)}else { return nil }})()
            } else {
            return candidates = candidates['$+'](resolved_keys)
          };}, TMP_45._s = self, TMP_45), $a).call($b);
        resolved = candidates['$&']($scope.SUB_OPTIONS['$[]'](type));
        if ((($a = (candidates['$-'](resolved))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          invalid = candidates['$-'](resolved);
          self.$warn("asciidoctor: WARNING: invalid substitution type" + ((function() {if (invalid.$size()['$>'](1)) {
            return "s"
            } else {
            return ""
          }; return nil; })()) + ((function() {if (subject !== false && subject !== nil) {
            return " for "
            } else {
            return nil
          }; return nil; })()) + (subject) + ": " + (invalid['$*'](", ")));
        };
        return resolved;
      };

      def.$resolve_block_subs = function(subs, defaults, subject) {
        var self = this;

        return self.$resolve_subs(subs, "block", defaults, subject);
      };

      def.$resolve_pass_subs = function(subs) {
        var self = this;

        return self.$resolve_subs(subs, "inline", nil, "passthrough macro");
      };

      def.$highlight_source = function(source, sub_callouts, highlighter) {
        var $a, $b, TMP_46, $c, TMP_48, self = this, callout_marks = nil, lineno = nil, callout_on_last = nil, last = nil, linenums_mode = nil, $case = nil, result = nil, lexer = nil, opts = nil, reached_code = nil;
        if (self.document == null) self.document = nil;
        if (self.passthroughs == null) self.passthroughs = nil;

        if (highlighter == null) {
          highlighter = nil
        }
        ((($a = highlighter) !== false && $a !== nil) ? $a : highlighter = self.document.$attributes()['$[]']("source-highlighter"));
        $scope.Helpers.$require_library(highlighter, ((function() {if (highlighter['$==']("pygments")) {
          return "pygments.rb"
          } else {
          return highlighter
        }; return nil; })()));
        callout_marks = $hash2([], {});
        lineno = 0;
        callout_on_last = false;
        if (sub_callouts !== false && sub_callouts !== nil) {
          last = -1;
          source = ($a = ($b = source.$split($scope.EOL)).$map, $a._p = (TMP_46 = function(line){var self = TMP_46._s || this, $a, $b, TMP_47;
if (line == null) line = nil;
          lineno = lineno['$+'](1);
            return ($a = ($b = line).$gsub, $a._p = (TMP_47 = function(){var self = TMP_47._s || this, $a, $b, $c, m = nil;
              if ($gvars["~"] == null) $gvars["~"] = nil;

            m = $gvars["~"];
              if (m['$[]'](1)['$==']("\\")) {
                return m['$[]'](0).$sub("\\", "")
                } else {
                (($a = lineno, $b = callout_marks, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, []))))['$<<'](m['$[]'](3));
                last = lineno;
                return nil;
              };}, TMP_47._s = self, TMP_47), $a).call($b, $scope.CalloutScanRx);}, TMP_46._s = self, TMP_46), $a).call($b)['$*']($scope.EOL);
          callout_on_last = (last['$=='](lineno));};
        linenums_mode = nil;
        $case = highlighter;if ("coderay"['$===']($case)) {result = ((($a = $opal.Object._scope.CodeRay) == null ? $opal.cm('CodeRay') : $a))._scope.Duo['$[]'](self.$attr("language", "text").$to_sym(), "html", $hash2(["css", "line_numbers", "line_number_anchors"], {"css": (((($a = self.document.$attributes()['$[]']("coderay-css")) !== false && $a !== nil) ? $a : "class")).$to_sym(), "line_numbers": (linenums_mode = ((function() {if ((($a = (self['$attr?']("linenums"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (((($a = self.document.$attributes()['$[]']("coderay-linenums-mode")) !== false && $a !== nil) ? $a : "table")).$to_sym()
          } else {
          return nil
        }; return nil; })())), "line_number_anchors": false})).$highlight(source)}else if ("pygments"['$===']($case)) {if ((($a = (lexer = ((($c = $opal.Object._scope.Pygments) == null ? $opal.cm('Pygments') : $c))._scope.Lexer['$[]'](self.$attr("language")))) !== nil && (!$a._isBoolean || $a == true))) {
          opts = $hash2(["cssclass", "classprefix", "nobackground"], {"cssclass": "pyhl", "classprefix": "tok-", "nobackground": true});
          if ((((($a = self.document.$attributes()['$[]']("pygments-css")) !== false && $a !== nil) ? $a : "class"))['$==']("class")) {
            } else {
            opts['$[]=']("noclasses", true);
            opts['$[]=']("style", (((($a = self.document.$attributes()['$[]']("pygments-style")) !== false && $a !== nil) ? $a : ($scope.Stylesheets)._scope.DEFAULT_PYGMENTS_STYLE)));
          };
          if ((($a = self['$attr?']("linenums")) !== nil && (!$a._isBoolean || $a == true))) {
            if ((opts['$[]=']("linenos", ((($a = self.document.$attributes()['$[]']("pygments-linenums-mode")) !== false && $a !== nil) ? $a : "table")))['$==']("table")) {
              result = lexer.$highlight(source, $hash2(["options"], {"options": opts})).$sub(/<div class="pyhl">(.*)<\/div>/m, "\\1").$gsub(/<pre[^>]*>(.*?)<\/pre>\s*/m, "\\1")
              } else {
              result = lexer.$highlight(source, $hash2(["options"], {"options": opts})).$sub(/<div class="pyhl"><pre[^>]*>(.*?)<\/pre><\/div>/m, "\\1")
            }
            } else {
            opts['$[]=']("nowrap", true);
            result = lexer.$highlight(source, $hash2(["options"], {"options": opts}));
          };
          } else {
          result = source
        }};
        if ((($a = self.passthroughs['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          result = result.$gsub($scope.PASS_MATCH_HI, "" + ($scope.PASS_START) + "\\1" + ($scope.PASS_END))
        };
        if ((($a = ((($c = sub_callouts['$!']()) !== false && $c !== nil) ? $c : callout_marks['$empty?']())) !== nil && (!$a._isBoolean || $a == true))) {
          return result
          } else {
          lineno = 0;
          reached_code = linenums_mode['$==']("table")['$!']();
          return ($a = ($c = result.$split($scope.EOL)).$map, $a._p = (TMP_48 = function(line){var self = TMP_48._s || this, $a, $b, $c, TMP_49, conums = nil, tail = nil, pos = nil, conums_markup = nil;
            if (self.document == null) self.document = nil;
if (line == null) line = nil;
          if (reached_code !== false && reached_code !== nil) {
              } else {
              if ((($a = line['$include?']("<td class=\"code\">")) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                return line;
              };
              reached_code = true;
            };
            lineno = lineno['$+'](1);
            if ((($a = (conums = callout_marks.$delete(lineno))) !== nil && (!$a._isBoolean || $a == true))) {
              tail = nil;
              if ((($a = ($b = (($c = callout_on_last !== false && callout_on_last !== nil) ? callout_marks['$empty?']() : $c), $b !== false && $b !== nil ?(pos = line.$index("</pre>")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                tail = line['$[]']($range(pos, -1, false));
                line = line['$[]']($range(0, pos, true));};
              if (conums.$size()['$=='](1)) {
                return "" + (line) + ($scope.Inline.$new(self, "callout", conums['$[]'](0), $hash2(["id"], {"id": self.document.$callouts().$read_next_id()})).$convert()) + (tail)
                } else {
                conums_markup = ($a = ($b = conums).$map, $a._p = (TMP_49 = function(conum){var self = TMP_49._s || this;
                  if (self.document == null) self.document = nil;
if (conum == null) conum = nil;
                return $scope.Inline.$new(self, "callout", conum, $hash2(["id"], {"id": self.document.$callouts().$read_next_id()})).$convert()}, TMP_49._s = self, TMP_49), $a).call($b)['$*'](" ");
                return "" + (line) + (conums_markup) + (tail);
              };
              } else {
              return line
            };}, TMP_48._s = self, TMP_48), $a).call($c)['$*']($scope.EOL);
        };
      };

      def.$lock_in_subs = function() {
        var $a, $b, $c, $d, $e, TMP_50, self = this, default_subs = nil, $case = nil, custom_subs = nil, highlighter = nil;
        if (self.default_subs == null) self.default_subs = nil;
        if (self.content_model == null) self.content_model = nil;
        if (self.context == null) self.context = nil;
        if (self.attributes == null) self.attributes = nil;
        if (self.style == null) self.style = nil;
        if (self.document == null) self.document = nil;
        if (self.subs == null) self.subs = nil;

        if ((($a = self.default_subs) !== nil && (!$a._isBoolean || $a == true))) {
          default_subs = self.default_subs
          } else {
          $case = self.content_model;if ("simple"['$===']($case)) {default_subs = $scope.SUBS['$[]']("normal")}else if ("verbatim"['$===']($case)) {default_subs = (function() {if ((($a = ((($b = self.context['$==']("listing")) !== false && $b !== nil) ? $b : ((($c = self.context['$==']("literal")) ? (self['$option?']("listparagraph"))['$!']() : $c)))) !== nil && (!$a._isBoolean || $a == true))) {
            return $scope.SUBS['$[]']("verbatim")
          } else if (self.context['$==']("verse")) {
            return $scope.SUBS['$[]']("normal")
            } else {
            return $scope.SUBS['$[]']("basic")
          }; return nil; })()}else if ("raw"['$===']($case)) {default_subs = $scope.SUBS['$[]']("pass")}else {return nil}
        };
        if ((($a = (custom_subs = self.attributes['$[]']("subs"))) !== nil && (!$a._isBoolean || $a == true))) {
          self.subs = self.$resolve_block_subs(custom_subs, default_subs, self.context)
          } else {
          self.subs = default_subs.$dup()
        };
        if ((($a = ($b = ($c = ($d = (($e = self.context['$==']("listing")) ? self.style['$==']("source") : $e), $d !== false && $d !== nil ?(self.document['$basebackend?']("html")) : $d), $c !== false && $c !== nil ?(((($d = ((highlighter = self.document.$attributes()['$[]']("source-highlighter")))['$==']("coderay")) !== false && $d !== nil) ? $d : highlighter['$==']("pygments"))) : $c), $b !== false && $b !== nil ?(self['$attr?']("language")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.subs = ($a = ($b = self.subs).$map, $a._p = (TMP_50 = function(sub){var self = TMP_50._s || this;
if (sub == null) sub = nil;
          if (sub['$==']("specialcharacters")) {
              return "highlight"
              } else {
              return sub
            }}, TMP_50._s = self, TMP_50), $a).call($b)
          } else {
          return nil
        };
      };
            ;$opal.donate(self, ["$apply_subs", "$apply_normal_subs", "$apply_title_subs", "$apply_header_subs", "$extract_passthroughs", "$restore_passthroughs", "$sub_specialcharacters", "$sub_specialchars", "$sub_quotes", "$sub_replacements", "$do_replacement", "$sub_attributes", "$sub_macros", "$sub_inline_anchors", "$sub_inline_xrefs", "$sub_callouts", "$sub_post_replacements", "$convert_quoted_text", "$parse_quoted_text_attributes", "$parse_attributes", "$unescape_bracketed_text", "$normalize_string", "$unescape_brackets", "$split_simple_csv", "$resolve_subs", "$resolve_block_subs", "$resolve_pass_subs", "$highlight_source", "$lock_in_subs"]);
    })(self)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $AbstractNode(){};
      var self = $AbstractNode = $klass($base, $super, 'AbstractNode', $AbstractNode);

      var def = self._proto, $scope = self._scope;

      def.document = def.attributes = def.path_resolver = def.style = nil;
      self.$include($scope.Substitutors);

      self.$attr_reader("parent");

      self.$attr_reader("document");

      self.$attr_reader("context");

      self.$attr_reader("node_name");

      self.$attr_accessor("id");

      self.$attr_reader("attributes");

      def.$initialize = function(parent, context) {
        var $a, self = this;

        if (context['$==']("document")) {
          self.parent = nil;
          self.document = parent;
        } else if ((($a = (self.parent = parent)) !== nil && (!$a._isBoolean || $a == true))) {
          self.document = parent.$document()
          } else {
          self.document = nil
        };
        self.context = context;
        self.node_name = context.$to_s();
        self.attributes = $hash2([], {});
        return self.passthroughs = [];
      };

      def['$parent='] = function(parent) {
        var self = this;

        self.parent = parent;
        self.document = parent.$document();
        return nil;
      };

      def['$inline?'] = function() {
        var $a, self = this;

        return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
      };

      def['$block?'] = function() {
        var $a, self = this;

        return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
      };

      def.$attr = function(name, default_value, inherit) {
        var $a, $b, self = this;

        if (default_value == null) {
          default_value = nil
        }
        if (inherit == null) {
          inherit = true
        }
        if ((($a = name['$is_a?']((($b = $opal.Object._scope.Symbol) == null ? $opal.cm('Symbol') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          name = name.$to_s()};
        if (self['$=='](self.document)) {
          inherit = false};
        if (inherit !== false && inherit !== nil) {
          return ((($a = ((($b = self.attributes['$[]'](name)) !== false && $b !== nil) ? $b : self.document.$attributes()['$[]'](name))) !== false && $a !== nil) ? $a : default_value)
          } else {
          return ((($a = self.attributes['$[]'](name)) !== false && $a !== nil) ? $a : default_value)
        };
      };

      def['$attr?'] = function(name, expect, inherit) {
        var $a, $b, self = this;

        if (expect == null) {
          expect = nil
        }
        if (inherit == null) {
          inherit = true
        }
        if ((($a = name['$is_a?']((($b = $opal.Object._scope.Symbol) == null ? $opal.cm('Symbol') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          name = name.$to_s()};
        if (self['$=='](self.document)) {
          inherit = false};
        if ((($a = expect['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return ((($a = self.attributes['$has_key?'](name)) !== false && $a !== nil) ? $a : ((($b = inherit !== false && inherit !== nil) ? self.document.$attributes()['$has_key?'](name) : $b)))
        } else if (inherit !== false && inherit !== nil) {
          return expect['$==']((((($a = self.attributes['$[]'](name)) !== false && $a !== nil) ? $a : self.document.$attributes()['$[]'](name))))
          } else {
          return expect['$=='](self.attributes['$[]'](name))
        };
      };

      def.$set_attr = function(name, value, overwrite) {
        var $a, $b, self = this;

        if (overwrite == null) {
          overwrite = nil
        }
        if ((($a = overwrite['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.attributes['$[]='](name, value);
          return true;
        } else if ((($a = ((($b = overwrite) !== false && $b !== nil) ? $b : (self.attributes['$key?'](name))['$!']())) !== nil && (!$a._isBoolean || $a == true))) {
          self.attributes['$[]='](name, value);
          return true;
          } else {
          return false
        };
      };

      def.$set_option = function(name) {
        var $a, self = this;

        if ((($a = self.attributes['$has_key?']("options")) !== nil && (!$a._isBoolean || $a == true))) {
          self.attributes['$[]=']("options", "" + (self.attributes['$[]']("options")) + "," + (name))
          } else {
          self.attributes['$[]=']("options", name)
        };
        return self.attributes['$[]=']("" + (name) + "-option", "");
      };

      def['$option?'] = function(name) {
        var self = this;

        return self.attributes['$has_key?']("" + (name) + "-option");
      };

      def.$update_attributes = function(attributes) {
        var self = this;

        self.attributes.$update(attributes);
        return nil;
      };

      def.$converter = function() {
        var self = this;

        return self.document.$converter();
      };

      def['$role?'] = function(expect) {
        var $a, self = this;

        if (expect == null) {
          expect = nil
        }
        if ((($a = expect['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return ((($a = self.attributes['$has_key?']("role")) !== false && $a !== nil) ? $a : self.document.$attributes()['$has_key?']("role"))
          } else {
          return expect['$==']((((($a = self.attributes['$[]']("role")) !== false && $a !== nil) ? $a : self.document.$attributes()['$[]']("role"))))
        };
      };

      def.$role = function() {
        var $a, self = this;

        return ((($a = self.attributes['$[]']("role")) !== false && $a !== nil) ? $a : self.document.$attributes()['$[]']("role"));
      };

      def['$has_role?'] = function(name) {
        var $a, $b, self = this, val = nil;

        if ((($a = (val = (((($b = self.attributes['$[]']("role")) !== false && $b !== nil) ? $b : self.document.$attributes()['$[]']("role"))))) !== nil && (!$a._isBoolean || $a == true))) {
          return val.$split(" ")['$include?'](name)
          } else {
          return false
        };
      };

      def.$roles = function() {
        var $a, $b, self = this, val = nil;

        if ((($a = (val = (((($b = self.attributes['$[]']("role")) !== false && $b !== nil) ? $b : self.document.$attributes()['$[]']("role"))))) !== nil && (!$a._isBoolean || $a == true))) {
          return val.$split(" ")
          } else {
          return []
        };
      };

      def['$reftext?'] = function() {
        var $a, self = this;

        return ((($a = self.attributes['$has_key?']("reftext")) !== false && $a !== nil) ? $a : self.document.$attributes()['$has_key?']("reftext"));
      };

      def.$reftext = function() {
        var $a, self = this;

        return ((($a = self.attributes['$[]']("reftext")) !== false && $a !== nil) ? $a : self.document.$attributes()['$[]']("reftext"));
      };

      def.$icon_uri = function(name) {
        var $a, self = this;

        if ((($a = self['$attr?']("icon")) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$image_uri(self.$attr("icon"), nil)
          } else {
          return self.$image_uri("" + (name) + "." + (self.document.$attr("icontype", "png")), "iconsdir")
        };
      };

      def.$media_uri = function(target, asset_dir_key) {
        var $a, $b, self = this;

        if (asset_dir_key == null) {
          asset_dir_key = "imagesdir"
        }
        if ((($a = ($b = target['$include?'](":"), $b !== false && $b !== nil ?$scope.UriSniffRx['$=~'](target) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return target
        } else if ((($a = (($b = asset_dir_key !== false && asset_dir_key !== nil) ? self['$attr?'](asset_dir_key) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$normalize_web_path(target, self.document.$attr(asset_dir_key))
          } else {
          return self.$normalize_web_path(target)
        };
      };

      def.$image_uri = function(target_image, asset_dir_key) {
        var $a, $b, self = this;

        if (asset_dir_key == null) {
          asset_dir_key = "imagesdir"
        }
        if ((($a = ($b = target_image['$include?'](":"), $b !== false && $b !== nil ?$scope.UriSniffRx['$=~'](target_image) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return target_image
        } else if ((($a = (($b = self.document.$safe()['$<'](($scope.SafeMode)._scope.SECURE)) ? self.document['$attr?']("data-uri") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$generate_data_uri(target_image, asset_dir_key)
        } else if ((($a = (($b = asset_dir_key !== false && asset_dir_key !== nil) ? self['$attr?'](asset_dir_key) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$normalize_web_path(target_image, self.document.$attr(asset_dir_key))
          } else {
          return self.$normalize_web_path(target_image)
        };
      };

      def.$generate_data_uri = function(target_image, asset_dir_key) {
        var $a, $b, TMP_1, $c, self = this, ext = nil, mimetype = nil, image_path = nil, bindata = nil;

        if (asset_dir_key == null) {
          asset_dir_key = nil
        }
        ext = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$extname(target_image)['$[]']($range(1, -1, false));
        mimetype = "image/"['$+'](ext);
        if (ext['$==']("svg")) {
          mimetype = "" + (mimetype) + "+xml"};
        if (asset_dir_key !== false && asset_dir_key !== nil) {
          image_path = self.$normalize_system_path(target_image, self.document.$attr(asset_dir_key), nil, $hash2(["target_name"], {"target_name": "image"}))
          } else {
          image_path = self.$normalize_system_path(target_image)
        };
        if ((($a = (($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b)['$readable?'](image_path)) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          self.$warn("asciidoctor: WARNING: image to embed not found or not readable: " + (image_path));
          return "data:" + (mimetype) + ":base64,";
        };
        bindata = nil;
        if ((($a = (($b = $opal.Object._scope.IO) == null ? $opal.cm('IO') : $b)['$respond_to?']("binread")) !== nil && (!$a._isBoolean || $a == true))) {
          bindata = (($a = $opal.Object._scope.IO) == null ? $opal.cm('IO') : $a).$binread(image_path)
          } else {
          bindata = ($a = ($b = (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c)).$open, $a._p = (TMP_1 = function(file){var self = TMP_1._s || this;
if (file == null) file = nil;
          return file.$read()}, TMP_1._s = self, TMP_1), $a).call($b, image_path, "rb")
        };
        return "data:" + (mimetype) + ";base64," + ((($a = $opal.Object._scope.Base64) == null ? $opal.cm('Base64') : $a).$encode64(bindata).$delete($scope.EOL));
      };

      def.$read_asset = function(path, warn_on_failure) {
        var $a, $b, self = this;

        if (warn_on_failure == null) {
          warn_on_failure = false
        }
        if ((($a = (($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b)['$readable?'](path)) !== nil && (!$a._isBoolean || $a == true))) {
          return (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$read(path).$chomp()
          } else {
          if (warn_on_failure !== false && warn_on_failure !== nil) {
            self.$warn("asciidoctor: WARNING: file does not exist or cannot be read: " + (path))};
          return nil;
        };
      };

      def.$normalize_web_path = function(target, start) {
        var $a, self = this;

        if (start == null) {
          start = nil
        }
        return (((($a = self.path_resolver) !== false && $a !== nil) ? $a : self.path_resolver = $scope.PathResolver.$new())).$web_path(target, start);
      };

      def.$normalize_system_path = function(target, start, jail, opts) {
        var $a, $b, self = this;

        if (start == null) {
          start = nil
        }
        if (jail == null) {
          jail = nil
        }
        if (opts == null) {
          opts = $hash2([], {})
        }
        if ((($a = start['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
          start = self.document.$base_dir()};
        if ((($a = ($b = jail['$nil?'](), $b !== false && $b !== nil ?self.document.$safe()['$>='](($scope.SafeMode)._scope.SAFE) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          jail = self.document.$base_dir()};
        return (((($a = self.path_resolver) !== false && $a !== nil) ? $a : self.path_resolver = $scope.PathResolver.$new())).$system_path(target, start, jail, opts);
      };

      def.$normalize_asset_path = function(asset_ref, asset_name, autocorrect) {
        var self = this;

        if (asset_name == null) {
          asset_name = "path"
        }
        if (autocorrect == null) {
          autocorrect = true
        }
        return self.$normalize_system_path(asset_ref, self.document.$base_dir(), nil, $hash2(["target_name", "recover"], {"target_name": asset_name, "recover": autocorrect}));
      };

      def.$relative_path = function(filename) {
        var $a, self = this;

        return (((($a = self.path_resolver) !== false && $a !== nil) ? $a : self.path_resolver = $scope.PathResolver.$new())).$relative_path(filename, self.document.$base_dir());
      };

      return (def.$list_marker_keyword = function(list_type) {
        var $a, self = this;

        if (list_type == null) {
          list_type = nil
        }
        return $scope.ORDERED_LIST_KEYWORDS['$[]'](((($a = list_type) !== false && $a !== nil) ? $a : self.style));
      }, nil) && 'list_marker_keyword';
    })(self, null)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $AbstractBlock(){};
      var self = $AbstractBlock = $klass($base, $super, 'AbstractBlock', $AbstractBlock);

      var def = self._proto, $scope = self._scope, TMP_1;

      def.document = def.attributes = def.blocks = def.subs = def.title = def.subbed_title = def.caption = def.context = def.next_section_index = def.next_section_number = nil;
      self.$attr_accessor("content_model");

      self.$attr_reader("subs");

      self.$attr_reader("blocks");

      self.$attr_accessor("level");

      self.$attr_writer("title");

      self.$attr_accessor("style");

      self.$attr_accessor("caption");

      def.$initialize = TMP_1 = function(parent, context) {var $zuper = $slice.call(arguments, 0);
        var $a, $b, self = this, $iter = TMP_1._p, $yield = $iter || nil;

        TMP_1._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_1, $iter).apply(self, $zuper);
        self.content_model = "compound";
        self.subs = [];
        self.default_subs = nil;
        self.blocks = [];
        self.id = nil;
        self.title = nil;
        self.caption = nil;
        self.style = nil;
        self.level = (function() {if (context['$==']("document")) {
          return 0
        } else if ((($a = (($b = parent !== false && parent !== nil) ? context['$==']("section")['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return parent.$level()
          } else {
          return nil
        }; return nil; })();
        self.next_section_index = 0;
        return self.next_section_number = 1;
      };

      def['$block?'] = function() {
        var self = this;

        return true;
      };

      def['$inline?'] = function() {
        var self = this;

        return false;
      };

      def['$context='] = function(context) {
        var self = this;

        self.context = context;
        return self.node_name = context.$to_s();
      };

      def.$convert = function() {
        var self = this;

        self.document.$playback_attributes(self.attributes);
        return self.$converter().$convert(self);
      };

      $opal.defn(self, '$render', def.$convert);

      def.$content = function() {
        var $a, $b, TMP_2, self = this;

        return ($a = ($b = self.blocks).$map, $a._p = (TMP_2 = function(b){var self = TMP_2._s || this;
if (b == null) b = nil;
        return b.$convert()}, TMP_2._s = self, TMP_2), $a).call($b)['$*']($scope.EOL);
      };

      def['$sub?'] = function(name) {
        var self = this;

        return self.subs['$include?'](name);
      };

      def['$title?'] = function() {
        var self = this;

        return self.title['$nil_or_empty?']()['$!']();
      };

      def.$title = function() {
        var $a, $b, self = this;

        if ((($a = (($b = self['subbed_title'], $b != null && $b !== nil) ? 'instance-variable' : nil)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.subbed_title
        } else if ((($a = self.title) !== nil && (!$a._isBoolean || $a == true))) {
          return self.subbed_title = self.$apply_title_subs(self.title)
          } else {
          return self.title
        };
      };

      def.$captioned_title = function() {
        var self = this;

        return "" + (self.caption) + (self.$title());
      };

      def['$blocks?'] = function() {
        var self = this;

        return self.blocks['$empty?']()['$!']();
      };

      def['$<<'] = function(block) {
        var self = this;

        return self.blocks['$<<'](block);
      };

      def.$sections = function() {
        var $a, $b, TMP_3, self = this;

        return ($a = ($b = self.blocks).$select, $a._p = (TMP_3 = function(block){var self = TMP_3._s || this;
if (block == null) block = nil;
        return block.$context()['$==']("section")}, TMP_3._s = self, TMP_3), $a).call($b);
      };

      def.$remove_sub = function(sub) {
        var self = this;

        self.subs.$delete(sub);
        return nil;
      };

      def.$assign_caption = function(caption, key) {
        var $a, $b, self = this, value = nil, caption_key = nil, caption_title = nil, caption_num = nil;

        if (caption == null) {
          caption = nil
        }
        if (key == null) {
          key = nil
        }
        if ((($a = ((($b = self['$title?']()) !== false && $b !== nil) ? $b : self.caption['$!']())) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return nil
        };
        if (caption !== false && caption !== nil) {
          self.caption = caption
        } else if ((($a = (value = self.document.$attributes()['$[]']("caption"))) !== nil && (!$a._isBoolean || $a == true))) {
          self.caption = value
        } else if ((($a = self['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          ((($a = key) !== false && $a !== nil) ? $a : key = self.context.$to_s());
          caption_key = "" + (key) + "-caption";
          if ((($a = (caption_title = self.document.$attributes()['$[]'](caption_key))) !== nil && (!$a._isBoolean || $a == true))) {
            caption_num = self.document.$counter_increment("" + (key) + "-number", self);
            self.caption = "" + (caption_title) + " " + (caption_num) + ". ";};};
        return nil;
      };

      def.$assign_index = function(section) {
        var $a, $b, $c, $d, self = this, appendix_number = nil, caption = nil;

        section['$index='](self.next_section_index);
        self.next_section_index = self.next_section_index['$+'](1);
        if (section.$sectname()['$==']("appendix")) {
          appendix_number = self.document.$counter("appendix-number", "A");
          if ((($a = section.$numbered()) !== nil && (!$a._isBoolean || $a == true))) {
            section['$number='](appendix_number)};
          if ((($a = ((caption = self.document.$attr("appendix-caption", "")))['$==']("")['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            return section['$caption=']("" + (caption) + " " + (appendix_number) + ": ")
            } else {
            return section['$caption=']("" + (appendix_number) + ". ")
          };
        } else if ((($a = section.$numbered()) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = ($b = (((($c = section.$level()['$=='](1)) !== false && $c !== nil) ? $c : ((($d = section.$level()['$=='](0)) ? section.$special() : $d)))), $b !== false && $b !== nil ?self.document.$doctype()['$==']("book") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            return section['$number='](self.document.$counter("chapter-number", 1))
            } else {
            section['$number='](self.next_section_number);
            return self.next_section_number = self.next_section_number['$+'](1);
          }
          } else {
          return nil
        };
      };

      return (def.$reindex_sections = function() {
        var $a, $b, TMP_4, self = this;

        self.next_section_index = 0;
        self.next_section_number = 0;
        return ($a = ($b = self.blocks).$each, $a._p = (TMP_4 = function(block){var self = TMP_4._s || this;
if (block == null) block = nil;
        if (block.$context()['$==']("section")) {
            self.$assign_index(block);
            return block.$reindex_sections();
            } else {
            return nil
          }}, TMP_4._s = self, TMP_4), $a).call($b);
      }, nil) && 'reindex_sections';
    })(self, $scope.AbstractNode)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $AttributeList(){};
      var self = $AttributeList = $klass($base, $super, 'AttributeList', $AttributeList);

      var def = self._proto, $scope = self._scope;

      def.attributes = def.scanner = def.delimiter = def.block = def.delimiter_skip_pattern = def.delimiter_boundary_pattern = nil;
      $opal.cdecl($scope, 'BoundaryRxs', $hash2(["\"", "'", ","], {"\"": /.*?[^\\](?=")/, "'": /.*?[^\\](?=')/, ",": /.*?(?=[ \t]*(,|$))/}));

      $opal.cdecl($scope, 'EscapedQuoteRxs', $hash2(["\"", "'"], {"\"": /\\"/, "'": /\\'/}));

      $opal.cdecl($scope, 'NameRx', /[A-Za-z:_][A-Za-z:_\-.]*/);

      $opal.cdecl($scope, 'BlankRx', /[ \t]+/);

      $opal.cdecl($scope, 'SkipRxs', $hash2(["blank", ","], {"blank": $scope.BlankRx, ",": /[ \t]*(,|$)/}));

      def.$initialize = function(source, block, delimiter) {
        var $a, self = this;

        if (block == null) {
          block = nil
        }
        if (delimiter == null) {
          delimiter = ","
        }
        self.scanner = (($a = $opal.Object._scope.StringScanner) == null ? $opal.cm('StringScanner') : $a).$new(source);
        self.block = block;
        self.delimiter = delimiter;
        self.delimiter_skip_pattern = $scope.SkipRxs['$[]'](delimiter);
        self.delimiter_boundary_pattern = $scope.BoundaryRxs['$[]'](delimiter);
        return self.attributes = nil;
      };

      def.$parse_into = function(attributes, posattrs) {
        var self = this;

        if (posattrs == null) {
          posattrs = []
        }
        return attributes.$update(self.$parse(posattrs));
      };

      def.$parse = function(posattrs) {
        var $a, $b, self = this, index = nil;

        if (posattrs == null) {
          posattrs = []
        }
        if ((($a = self.attributes) !== nil && (!$a._isBoolean || $a == true))) {
          return self.attributes};
        self.attributes = $hash2([], {});
        index = 0;
        while ((($b = self.$parse_attribute(index, posattrs)) !== nil && (!$b._isBoolean || $b == true))) {
        if ((($b = self.scanner['$eos?']()) !== nil && (!$b._isBoolean || $b == true))) {
          break;};
        self.$skip_delimiter();
        index = index['$+'](1);};
        return self.attributes;
      };

      def.$rekey = function(posattrs) {
        var self = this;

        return $scope.AttributeList.$rekey(self.attributes, posattrs);
      };

      $opal.defs(self, '$rekey', function(attributes, pos_attrs) {
        var $a, $b, TMP_1, self = this;

        ($a = ($b = pos_attrs).$each_with_index, $a._p = (TMP_1 = function(key, index){var self = TMP_1._s || this, $a, pos = nil, val = nil;
if (key == null) key = nil;if (index == null) index = nil;
        if (key !== false && key !== nil) {
            } else {
            return nil;
          };
          pos = index['$+'](1);
          if ((($a = (val = attributes['$[]'](pos))) !== nil && (!$a._isBoolean || $a == true))) {
            return attributes['$[]='](key, val)
            } else {
            return nil
          };}, TMP_1._s = self, TMP_1), $a).call($b);
        return attributes;
      });

      def.$parse_attribute = function(index, pos_attrs) {
        var $a, $b, TMP_2, $c, self = this, single_quoted_value = nil, first = nil, name = nil, value = nil, skipped = nil, c = nil, resolved_value = nil, $case = nil, resolved_name = nil, pos_name = nil;

        if (index == null) {
          index = 0
        }
        if (pos_attrs == null) {
          pos_attrs = []
        }
        single_quoted_value = false;
        self.$skip_blank();
        if (((first = self.scanner.$peek(1)))['$==']("\"")) {
          name = self.$parse_attribute_value(self.scanner.$get_byte());
          value = nil;
        } else if (first['$==']("'")) {
          name = self.$parse_attribute_value(self.scanner.$get_byte());
          value = nil;
          single_quoted_value = true;
          } else {
          name = self.$scan_name();
          skipped = 0;
          c = nil;
          if ((($a = self.scanner['$eos?']()) !== nil && (!$a._isBoolean || $a == true))) {
            if (name !== false && name !== nil) {
              } else {
              return false
            }
            } else {
            skipped = ((($a = self.$skip_blank()) !== false && $a !== nil) ? $a : 0);
            c = self.scanner.$get_byte();
          };
          if ((($a = ((($b = c['$!']()) !== false && $b !== nil) ? $b : c['$=='](self.delimiter))) !== nil && (!$a._isBoolean || $a == true))) {
            value = nil
          } else if ((($a = ((($b = c['$==']("=")['$!']()) !== false && $b !== nil) ? $b : name['$!']())) !== nil && (!$a._isBoolean || $a == true))) {
            name = "" + (name) + (" "['$*'](skipped)) + (c) + (self.$scan_to_delimiter());
            value = nil;
            } else {
            self.$skip_blank();
            if ((($a = self.scanner.$peek(1)) !== nil && (!$a._isBoolean || $a == true))) {
              if (((c = self.scanner.$get_byte()))['$==']("\"")) {
                value = self.$parse_attribute_value(c)
              } else if (c['$==']("'")) {
                value = self.$parse_attribute_value(c);
                single_quoted_value = true;
              } else if (c['$=='](self.delimiter)) {
                value = nil
                } else {
                value = "" + (c) + (self.$scan_to_delimiter());
                if (value['$==']("None")) {
                  return true};
              }};
          };
        };
        if (value !== false && value !== nil) {
          resolved_value = (function() {$case = name;if ("options"['$===']($case) || "opts"['$===']($case)) {name = "options";
          ($a = ($b = value.$split(",")).$each, $a._p = (TMP_2 = function(o){var self = TMP_2._s || this;
            if (self.attributes == null) self.attributes = nil;
if (o == null) o = nil;
          return self.attributes['$[]=']("" + (o.$strip()) + "-option", "")}, TMP_2._s = self, TMP_2), $a).call($b);
          return value;}else if ("title"['$===']($case)) {return value}else {if ((($a = (($c = single_quoted_value !== false && single_quoted_value !== nil) ? self.block : $c)) !== nil && (!$a._isBoolean || $a == true))) {
            return (self.block.$apply_normal_subs(value))
            } else {
            return value
          }}})();
          self.attributes['$[]='](name, resolved_value);
          } else {
          resolved_name = (function() {if ((($a = (($c = single_quoted_value !== false && single_quoted_value !== nil) ? self.block : $c)) !== nil && (!$a._isBoolean || $a == true))) {
            return (self.block.$apply_normal_subs(name))
            } else {
            return name
          }; return nil; })();
          if ((($a = (pos_name = pos_attrs['$[]'](index))) !== nil && (!$a._isBoolean || $a == true))) {
            self.attributes['$[]='](pos_name, resolved_name)};
          self.attributes['$[]='](index['$+'](1), resolved_name);
        };
        return true;
      };

      def.$parse_attribute_value = function(quote) {
        var $a, self = this, value = nil;

        if (self.scanner.$peek(1)['$=='](quote)) {
          self.scanner.$get_byte();
          return "";};
        if ((($a = (value = self.$scan_to_quote(quote))) !== nil && (!$a._isBoolean || $a == true))) {
          self.scanner.$get_byte();
          return value.$gsub($scope.EscapedQuoteRxs['$[]'](quote), quote);
          } else {
          return "" + (quote) + (self.$scan_to_delimiter())
        };
      };

      def.$skip_blank = function() {
        var self = this;

        return self.scanner.$skip($scope.BlankRx);
      };

      def.$skip_delimiter = function() {
        var self = this;

        return self.scanner.$skip(self.delimiter_skip_pattern);
      };

      def.$scan_name = function() {
        var self = this;

        return self.scanner.$scan($scope.NameRx);
      };

      def.$scan_to_delimiter = function() {
        var self = this;

        return self.scanner.$scan(self.delimiter_boundary_pattern);
      };

      return (def.$scan_to_quote = function(quote) {
        var self = this;

        return self.scanner.$scan($scope.BoundaryRxs['$[]'](quote));
      }, nil) && 'scan_to_quote';
    })(self, null)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Block(){};
      var self = $Block = $klass($base, $super, 'Block', $Block);

      var def = self._proto, $scope = self._scope, $a, TMP_1, TMP_2;

      def.subs = def.attributes = def.content_model = def.lines = def.blocks = def.context = def.style = nil;
      $opal.cdecl($scope, 'DEFAULT_CONTENT_MODEL', (($a = $opal.Object._scope.Hash) == null ? $opal.cm('Hash') : $a).$new("simple").$merge($hash2(["audio", "image", "listing", "literal", "math", "open", "page_break", "pass", "thematic_break", "video"], {"audio": "empty", "image": "empty", "listing": "verbatim", "literal": "verbatim", "math": "raw", "open": "compound", "page_break": "empty", "pass": "raw", "thematic_break": "empty", "video": "empty"})));

      $opal.defn(self, '$blockname', def.$context);

      self.$attr_accessor("lines");

      def.$initialize = TMP_1 = function(parent, context, opts) {
        var $a, $b, $c, self = this, $iter = TMP_1._p, $yield = $iter || nil, attrs = nil, subs = nil, raw_source = nil;

        if (opts == null) {
          opts = $hash2([], {})
        }
        TMP_1._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_1, null).apply(self, [parent, context]);
        self.content_model = ((($a = opts['$[]']("content_model")) !== false && $a !== nil) ? $a : $scope.DEFAULT_CONTENT_MODEL['$[]'](context));
        if ((($a = ((attrs = opts['$[]']("attributes")))['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.attributes = $hash2([], {})
          } else {
          self.attributes = attrs.$dup()
        };
        if ((($a = opts['$has_key?']("subs")) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = ((($b = ((subs = opts['$[]']("subs")))['$!']()) !== false && $b !== nil) ? $b : (subs['$is_a?']((($c = $opal.Object._scope.Array) == null ? $opal.cm('Array') : $c))))) !== nil && (!$a._isBoolean || $a == true))) {
            self.subs = ((($a = subs) !== false && $a !== nil) ? $a : []);
            self.default_subs = self.subs.$dup();
            self.attributes.$delete("subs");
            } else {
            self.attributes['$[]=']("subs", "" + (subs))
          }};
        if ((($a = ((raw_source = opts['$[]']("source")))['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          return self.lines = []
        } else if ((($a = raw_source['$is_a?']((($b = $opal.Object._scope.String) == null ? $opal.cm('String') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          return self.lines = $scope.Helpers.$normalize_lines_from_string(raw_source)
          } else {
          return self.lines = raw_source.$dup()
        };
      };

      def.$content = TMP_2 = function() {var $zuper = $slice.call(arguments, 0);
        var $a, $b, $c, self = this, $iter = TMP_2._p, $yield = $iter || nil, $case = nil, result = nil, first = nil, last = nil;

        TMP_2._p = null;
        return (function() {$case = self.content_model;if ("compound"['$===']($case)) {return $opal.find_super_dispatcher(self, 'content', TMP_2, $iter).apply(self, $zuper)}else if ("simple"['$===']($case)) {return self.$apply_subs(self.lines['$*']($scope.EOL), self.subs)}else if ("verbatim"['$===']($case) || "raw"['$===']($case)) {result = self.$apply_subs(self.lines, self.subs);
        if (result.$size()['$<'](2)) {
          return result['$[]'](0)
          } else {
          while ((($b = ($c = (first = result['$[]'](0)), $c !== false && $c !== nil ?first.$rstrip()['$empty?']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          result.$shift()};
          while ((($b = ($c = (last = result['$[]'](-1)), $c !== false && $c !== nil ?last.$rstrip()['$empty?']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          result.$pop()};
          return result['$*']($scope.EOL);
        };}else {if (self.content_model['$==']("empty")) {
          } else {
          self.$warn("Unknown content model '" + (self.content_model) + "' for block: " + (self.$to_s()))
        };
        return nil;}})();
      };

      def.$source = function() {
        var self = this;

        return self.lines['$*']($scope.EOL);
      };

      return (def.$to_s = function() {
        var self = this, content_summary = nil;

        content_summary = (function() {if (self.content_model['$==']("compound")) {
          return "blocks: " + (self.blocks.$size())
          } else {
          return "lines: " + (self.lines.$size())
        }; return nil; })();
        return "#<" + (self.$class()) + "@" + (self.$object_id()) + " {context: " + (self.context.$inspect()) + ", content_model: " + (self.content_model.$inspect()) + ", style: " + (self.style.$inspect()) + ", " + (content_summary) + "}>";
      }, nil) && 'to_s';
    })(self, $scope.AbstractBlock)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Callouts(){};
      var self = $Callouts = $klass($base, $super, 'Callouts', $Callouts);

      var def = self._proto, $scope = self._scope;

      def.co_index = def.lists = def.list_index = nil;
      def.$initialize = function() {
        var self = this;

        self.lists = [];
        self.list_index = 0;
        return self.$next_list();
      };

      def.$register = function(li_ordinal) {
        var self = this, id = nil;

        self.$current_list()['$<<']($hash2(["ordinal", "id"], {"ordinal": li_ordinal.$to_i(), "id": (id = self.$generate_next_callout_id())}));
        self.co_index = self.co_index['$+'](1);
        return id;
      };

      def.$read_next_id = function() {
        var self = this, id = nil, list = nil;

        id = nil;
        list = self.$current_list();
        if (self.co_index['$<='](list.$size())) {
          id = list['$[]'](self.co_index['$-'](1))['$[]']("id")};
        self.co_index = self.co_index['$+'](1);
        return id;
      };

      def.$callout_ids = function(li_ordinal) {
        var $a, $b, TMP_1, self = this;

        return ($a = ($b = self.$current_list()).$map, $a._p = (TMP_1 = function(element){var self = TMP_1._s || this;
if (element == null) element = nil;
        if (element['$[]']("ordinal")['$=='](li_ordinal)) {
            return "" + (element['$[]']("id")) + " "
            } else {
            return nil
          }}, TMP_1._s = self, TMP_1), $a).call($b).$join().$chop();
      };

      def.$current_list = function() {
        var self = this;

        return self.lists['$[]'](self.list_index['$-'](1));
      };

      def.$next_list = function() {
        var self = this;

        self.list_index = self.list_index['$+'](1);
        if (self.lists.$size()['$<'](self.list_index)) {
          self.lists['$<<']([])};
        self.co_index = 1;
        return nil;
      };

      def.$rewind = function() {
        var self = this;

        self.list_index = 1;
        self.co_index = 1;
        return nil;
      };

      def.$generate_next_callout_id = function() {
        var self = this;

        return self.$generate_callout_id(self.list_index, self.co_index);
      };

      return (def.$generate_callout_id = function(list_index, co_index) {
        var self = this;

        return "CO" + (list_index) + "-" + (co_index);
      }, nil) && 'generate_callout_id';
    })(self, null)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Converter');

      var def = self._proto, $scope = self._scope;

      nil
      
    })(self);

    (function($base, $super) {
      function $Base(){};
      var self = $Base = $klass($base, $super, 'Base', $Base);

      var def = self._proto, $scope = self._scope;

      return self.$include($scope.Converter)
    })($scope.Converter, null);

    (function($base, $super) {
      function $BuiltIn(){};
      var self = $BuiltIn = $klass($base, $super, 'BuiltIn', $BuiltIn);

      var def = self._proto, $scope = self._scope;

      def.$initialize = function(backend, opts) {
        var self = this;

        if (opts == null) {
          opts = $hash2([], {})
        }
        return nil;
      };

      def.$convert = function(node, transform) {
        var $a, self = this;

        if (transform == null) {
          transform = nil
        }
        ((($a = transform) !== false && $a !== nil) ? $a : transform = node.$node_name());
        return self.$send(transform, node);
      };

      def.$convert_with_options = function(node, transform, opts) {
        var $a, self = this;

        if (transform == null) {
          transform = nil
        }
        if (opts == null) {
          opts = $hash2([], {})
        }
        ((($a = transform) !== false && $a !== nil) ? $a : transform = node.$node_name());
        return self.$send(transform, node, opts);
      };

      $opal.defn(self, '$handles?', def['$respond_to?']);

      def.$content = function(node) {
        var self = this;

        return node.$content();
      };

      $opal.defn(self, '$pass', def.$content);

      return (def.$skip = function(node) {
        var self = this;

        return nil;
      }, nil) && 'skip';
    })($scope.Converter, null);
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Converter');

      var def = self._proto, $scope = self._scope;

      (function($base, $super) {
        function $Factory(){};
        var self = $Factory = $klass($base, $super, 'Factory', $Factory);

        var def = self._proto, $scope = self._scope;

        def.converters = def.star_converter = nil;
        self.__default__ = nil;

        (function(self) {
          var $scope = self._scope, def = self._proto;

          self._proto.$default = function(initialize_singleton) {
            var $a, $b, self = this;
            if (self.__default__ == null) self.__default__ = nil;

            if (initialize_singleton == null) {
              initialize_singleton = true
            }
            if (initialize_singleton !== false && initialize_singleton !== nil) {
              } else {
              return ((($a = self.__default__) !== false && $a !== nil) ? $a : self.$new())
            };
            return ((($a = self.__default__) !== false && $a !== nil) ? $a : self.__default__ = (function() { try {
            (function() {if ((($b = ($opal.Object._scope.ThreadSafe == null ? nil : 'constant')) !== nil && (!$b._isBoolean || $b == true))) {
                return nil
                } else {
                return true
              }; return nil; })()
              self.$new(((($b = $opal.Object._scope.ThreadSafe) == null ? $opal.cm('ThreadSafe') : $b))._scope.Cache.$new())
            } catch ($err) {if ($opal.$rescue($err, [(($b = $opal.Object._scope.LoadError) == null ? $opal.cm('LoadError') : $b)])) {
              self.$warn("asciidoctor: WARNING: gem 'thread_safe' is not installed. This gem recommended when registering custom converters.")
              self.$new()
              }else { throw $err; }
            }})());
          };
          self._proto.$register = function(converter, backends) {
            var self = this;

            if (backends == null) {
              backends = ["*"]
            }
            return self.$default().$register(converter, backends);
          };
          self._proto.$resolve = function(backend) {
            var self = this;

            return self.$default().$resolve(backend);
          };
          self._proto.$converters = function() {
            var self = this;

            return self.$default().$converters();
          };
          return (self._proto.$unregister_all = function() {
            var self = this;

            return self.$default().$unregister_all();
          }, nil) && 'unregister_all';
        })(self.$singleton_class());

        self.$attr_reader("converters");

        def.$initialize = function(converters) {
          var $a, self = this;

          if (converters == null) {
            converters = nil
          }
          self.converters = ((($a = converters) !== false && $a !== nil) ? $a : $hash2([], {}));
          return self.star_converter = nil;
        };

        def.$register = function(converter, backends) {
          var $a, $b, TMP_1, self = this;

          if (backends == null) {
            backends = ["*"]
          }
          ($a = ($b = backends).$each, $a._p = (TMP_1 = function(backend){var self = TMP_1._s || this;
            if (self.converters == null) self.converters = nil;
if (backend == null) backend = nil;
          self.converters['$[]='](backend, converter);
            if (backend['$==']("*")) {
              return self.star_converter = converter
              } else {
              return nil
            };}, TMP_1._s = self, TMP_1), $a).call($b);
          return nil;
        };

        def.$resolve = function(backend) {
          var $a, $b, self = this;

          return ($a = self.converters, $a !== false && $a !== nil ?(((($b = self.converters['$[]'](backend)) !== false && $b !== nil) ? $b : self.star_converter)) : $a);
        };

        def.$unregister_all = function() {
          var self = this;

          self.converters.$clear();
          return self.star_converter = nil;
        };

        return (def.$create = function(backend, opts) {
          var $a, $b, self = this, converter = nil, base_converter = nil, $case = nil, template_converter = nil;

          if (opts == null) {
            opts = $hash2([], {})
          }
          if ((($a = (converter = self.$resolve(backend))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = converter['$is_a?']((($b = $opal.Object._scope.Class) == null ? $opal.cm('Class') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
              return converter.$new(backend, opts)
              } else {
              return converter
            }};
          base_converter = (function() {$case = backend;if ("html5"['$===']($case)) {if ((($a = (function(){ try { return (((((($b = $opal.Object._scope.Asciidoctor) == null ? $opal.cm('Asciidoctor') : $b))._scope.Converter)._scope.Html5Converter) != null ? 'constant' : nil); } catch (err) { if (err._klass === Opal.NameError) { return nil; } else { throw(err); }}; })()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            
          };
          return $scope.Html5Converter.$new(backend, opts);}else if ("docbook5"['$===']($case)) {if ((($a = (function(){ try { return (((((($b = $opal.Object._scope.Asciidoctor) == null ? $opal.cm('Asciidoctor') : $b))._scope.Converter)._scope.DocBook5Converter) != null ? 'constant' : nil); } catch (err) { if (err._klass === Opal.NameError) { return nil; } else { throw(err); }}; })()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            
          };
          return $scope.DocBook5Converter.$new(backend, opts);}else if ("docbook45"['$===']($case)) {if ((($a = (function(){ try { return (((((($b = $opal.Object._scope.Asciidoctor) == null ? $opal.cm('Asciidoctor') : $b))._scope.Converter)._scope.DocBook45Converter) != null ? 'constant' : nil); } catch (err) { if (err._klass === Opal.NameError) { return nil; } else { throw(err); }}; })()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            
          };
          return $scope.DocBook45Converter.$new(backend, opts);}else { return nil }})();
          if ((($a = opts['$key?']("template_dirs")) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            return base_converter
          };
          if ((($a = (function(){ try { return (((((($b = $opal.Object._scope.Asciidoctor) == null ? $opal.cm('Asciidoctor') : $b))._scope.Converter)._scope.TemplateConverter) != null ? 'constant' : nil); } catch (err) { if (err._klass === Opal.NameError) { return nil; } else { throw(err); }}; })()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            
          };
          if ((($a = (function(){ try { return (((((($b = $opal.Object._scope.Asciidoctor) == null ? $opal.cm('Asciidoctor') : $b))._scope.Converter)._scope.CompositeConverter) != null ? 'constant' : nil); } catch (err) { if (err._klass === Opal.NameError) { return nil; } else { throw(err); }}; })()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            
          };
          template_converter = $scope.TemplateConverter.$new(backend, opts['$[]']("template_dirs"), opts);
          return $scope.CompositeConverter.$new(backend, template_converter, base_converter);
        }, nil) && 'create';
      })(self, null)
      
    })(self)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $range = $opal.range, $hash2 = $opal.hash2;

  (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Converter');

      var def = self._proto, $scope = self._scope;

      (function($base) {
        var self = $module($base, 'Config');

        var def = self._proto, $scope = self._scope;

        def.$register_for = function(backends) {
          var $a, $b, TMP_1, $c, TMP_2, self = this, metaclass = nil;

          backends = $slice.call(arguments, 0);
          $scope.Factory.$register(self, backends);
          metaclass = (function(self) {
            var $scope = self._scope, def = self._proto;

            return self
          })(self.$singleton_class());
          if (backends['$=='](["*"])) {
            ($a = ($b = metaclass).$send, $a._p = (TMP_1 = function(name){var self = TMP_1._s || this;
if (name == null) name = nil;
            return true}, TMP_1._s = self, TMP_1), $a).call($b, "define_method", "converts?")
            } else {
            ($a = ($c = metaclass).$send, $a._p = (TMP_2 = function(name){var self = TMP_2._s || this;
if (name == null) name = nil;
            return backends['$include?'](name)}, TMP_2._s = self, TMP_2), $a).call($c, "define_method", "converts?")
          };
          return nil;
        }
                ;$opal.donate(self, ["$register_for"]);
      })(self);

      (function($base) {
        var self = $module($base, 'BackendInfo');

        var def = self._proto, $scope = self._scope;

        def.$backend_info = function() {
          var $a, self = this;
          if (self.backend_info == null) self.backend_info = nil;

          return ((($a = self.backend_info) !== false && $a !== nil) ? $a : self.backend_info = self.$setup_backend_info());
        };

        def.$setup_backend_info = function() {
          var $a, self = this, base = nil, ext = nil, type = nil, syntax = nil;
          if (self.backend == null) self.backend = nil;

          if ((($a = self.backend) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "Cannot determine backend for converter: " + (self.$class()))
          };
          base = self.backend.$sub($scope.TrailingDigitsRx, "");
          if ((($a = (ext = $scope.DEFAULT_EXTENSIONS['$[]'](base))) !== nil && (!$a._isBoolean || $a == true))) {
            type = ext['$[]']($range(1, -1, false))
            } else {
            base = "html";
            ext = ".html";
            type = "html";
            syntax = "html";
          };
          return $hash2(["basebackend", "outfilesuffix", "filetype", "htmlsyntax"], {"basebackend": base, "outfilesuffix": ext, "filetype": type, "htmlsyntax": syntax});
        };

        def.$filetype = function(value) {
          var self = this;

          if (value == null) {
            value = nil
          }
          if (value !== false && value !== nil) {
            return self.$backend_info()['$[]=']("filetype", value)
            } else {
            return self.$backend_info()['$[]']("filetype")
          };
        };

        def.$basebackend = function(value) {
          var self = this;

          if (value == null) {
            value = nil
          }
          if (value !== false && value !== nil) {
            return self.$backend_info()['$[]=']("basebackend", value)
            } else {
            return self.$backend_info()['$[]']("basebackend")
          };
        };

        def.$outfilesuffix = function(value) {
          var self = this;

          if (value == null) {
            value = nil
          }
          if (value !== false && value !== nil) {
            return self.$backend_info()['$[]=']("outfilesuffix", value)
            } else {
            return self.$backend_info()['$[]']("outfilesuffix")
          };
        };

        def.$htmlsyntax = function(value) {
          var self = this;

          if (value == null) {
            value = nil
          }
          if (value !== false && value !== nil) {
            return self.$backend_info()['$[]=']("htmlsyntax", value)
            } else {
            return self.$backend_info()['$[]']("htmlsyntax")
          };
        };
                ;$opal.donate(self, ["$backend_info", "$setup_backend_info", "$filetype", "$basebackend", "$outfilesuffix", "$htmlsyntax"]);
      })(self);

      (function(self) {
        var $scope = self._scope, def = self._proto;

        return (self._proto.$included = function(converter) {
          var self = this;

          return converter.$extend($scope.Config);
        }, nil) && 'included'
      })(self.$singleton_class());

      self.$include($scope.Config);

      self.$include($scope.BackendInfo);

      def.$initialize = function(backend, opts) {
        var self = this;

        if (opts == null) {
          opts = $hash2([], {})
        }
        self.backend = backend;
        return self.$setup_backend_info();
      };

      def.$convert = function(node, transform) {
        var $a, self = this;

        if (transform == null) {
          transform = nil
        }
        return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
      };

      def.$convert_with_options = function(node, transform, opts) {
        var self = this;

        if (transform == null) {
          transform = nil
        }
        if (opts == null) {
          opts = $hash2([], {})
        }
        return self.$convert(node, transform);
      };
            ;$opal.donate(self, ["$initialize", "$convert", "$convert_with_options"]);
    })(self);

    (function($base) {
      var self = $module($base, 'Writer');

      var def = self._proto, $scope = self._scope;

      def.$write = function(output, target) {
        var $a, $b, TMP_3, $c, self = this;

        if ((($a = target['$respond_to?']("write")) !== nil && (!$a._isBoolean || $a == true))) {
          target.$write(output.$chomp());
          target.$write($scope.EOL);
          } else {
          ($a = ($b = (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c)).$open, $a._p = (TMP_3 = function(f){var self = TMP_3._s || this;
if (f == null) f = nil;
          return f.$write(output)}, TMP_3._s = self, TMP_3), $a).call($b, target, "w")
        };
        return nil;
      }
            ;$opal.donate(self, ["$write"]);
    })(self);
    
  })(self);
  ;
  return true;
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Html5Converter(){};
      var self = $Html5Converter = $klass($base, $super, 'Html5Converter', $Html5Converter);

      var def = self._proto, $scope = self._scope;

      def.xml_mode = def.void_element_slash = def.stylesheets = nil;
      $opal.cdecl($scope, 'QUOTE_TAGS', $hash2(["emphasis", "strong", "monospaced", "superscript", "subscript", "double", "single", "asciimath", "latexmath"], {"emphasis": ["<em>", "</em>", true], "strong": ["<strong>", "</strong>", true], "monospaced": ["<code>", "</code>", true], "superscript": ["<sup>", "</sup>", true], "subscript": ["<sub>", "</sub>", true], "double": ["&#8220;", "&#8221;", false], "single": ["&#8216;", "&#8217;", false], "asciimath": ["\\$", "\\$", false], "latexmath": ["\\(", "\\)", false]}));

      $scope.QUOTE_TAGS['$default=']([nil, nil, nil]);

      def.$initialize = function(backend, opts) {
        var $a, self = this;

        if (opts == null) {
          opts = $hash2([], {})
        }
        self.xml_mode = opts['$[]']("htmlsyntax")['$==']("xml");
        self.void_element_slash = (function() {if ((($a = self.xml_mode) !== nil && (!$a._isBoolean || $a == true))) {
          return "/"
          } else {
          return nil
        }; return nil; })();
        return self.stylesheets = $scope.Stylesheets.$instance();
      };

      def.$document = function(node) {
        var $a, $b, $c, TMP_1, TMP_2, self = this, result = nil, slash = nil, br = nil, linkcss = nil, lang_attribute = nil, iconfont_stylesheet = nil, $case = nil, pygments_style = nil, docinfo_content = nil, body_attrs = nil, authorcount = nil;

        result = [];
        slash = self.void_element_slash;
        br = "<br" + (slash) + ">";
        linkcss = ((($a = node.$safe()['$>='](($scope.SafeMode)._scope.SECURE)) !== false && $a !== nil) ? $a : (node['$attr?']("linkcss")));
        result['$<<']("<!DOCTYPE html>");
        lang_attribute = (function() {if ((($a = (node['$attr?']("nolang"))) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return " lang=\"" + (node.$attr("lang", "en")) + "\""
        }; return nil; })();
        result['$<<']("<html" + ((function() {if ((($a = self.xml_mode) !== nil && (!$a._isBoolean || $a == true))) {
          return " xmlns=\"http://www.w3.org/1999/xhtml\""
          } else {
          return nil
        }; return nil; })()) + (lang_attribute) + ">");
        result['$<<']("<head>\n<meta charset=\"" + (node.$attr("encoding", "UTF-8")) + "\"" + (slash) + ">\n<!--[if IE]><meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\"" + (slash) + "><![endif]-->\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"" + (slash) + ">\n<meta name=\"generator\" content=\"Asciidoctor " + (node.$attr("asciidoctor-version")) + "\"" + (slash) + ">");
        if ((($a = node['$attr?']("app-name")) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<meta name=\"application-name\" content=\"" + (node.$attr("app-name")) + "\"" + (slash) + ">")};
        if ((($a = node['$attr?']("description")) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<meta name=\"description\" content=\"" + (node.$attr("description")) + "\"" + (slash) + ">")};
        if ((($a = node['$attr?']("keywords")) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<meta name=\"keywords\" content=\"" + (node.$attr("keywords")) + "\"" + (slash) + ">")};
        if ((($a = node['$attr?']("authors")) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<meta name=\"author\" content=\"" + (node.$attr("authors")) + "\"" + (slash) + ">")};
        if ((($a = node['$attr?']("copyright")) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<meta name=\"copyright\" content=\"" + (node.$attr("copyright")) + "\"" + (slash) + ">")};
        result['$<<']("<title>" + (((($a = node.$doctitle($hash2(["sanitize"], {"sanitize": true}))) !== false && $a !== nil) ? $a : node.$attr("untitled-label"))) + "</title>");
        if ((($a = $scope.DEFAULT_STYLESHEET_KEYS['$include?'](node.$attr("stylesheet"))) !== nil && (!$a._isBoolean || $a == true))) {
          if (linkcss !== false && linkcss !== nil) {
            result['$<<']("<link rel=\"stylesheet\" href=\"" + (node.$normalize_web_path($scope.DEFAULT_STYLESHEET_NAME, (node.$attr("stylesdir", "")))) + "\"" + (slash) + ">")
            } else {
            result['$<<'](self.stylesheets.$embed_primary_stylesheet())
          }
        } else if ((($a = node['$attr?']("stylesheet")) !== nil && (!$a._isBoolean || $a == true))) {
          if (linkcss !== false && linkcss !== nil) {
            result['$<<']("<link rel=\"stylesheet\" href=\"" + (node.$normalize_web_path((node.$attr("stylesheet")), (node.$attr("stylesdir", "")))) + "\"" + (slash) + ">")
            } else {
            result['$<<']("<style>\n" + (node.$read_asset(node.$normalize_system_path((node.$attr("stylesheet")), (node.$attr("stylesdir", ""))), true)) + "\n</style>")
          }};
        if ((($a = node['$attr?']("icons", "font")) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = (node.$attr("iconfont-remote", ""))['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            result['$<<']("<link rel=\"stylesheet\" href=\"" + (node.$attr("iconfont-cdn", "http://cdnjs.cloudflare.com/ajax/libs/font-awesome/3.2.1/css/font-awesome.min.css")) + "\"" + (slash) + ">")
            } else {
            iconfont_stylesheet = "" + (node.$attr("iconfont-name", "font-awesome")) + ".css";
            result['$<<']("<link rel=\"stylesheet\" href=\"" + (node.$normalize_web_path(iconfont_stylesheet, (node.$attr("stylesdir", "")))) + "\"" + (slash) + ">");
          }};
        $case = node.$attr("source-highlighter");if ("coderay"['$===']($case)) {if ((node.$attr("coderay-css", "class"))['$==']("class")) {
          if (linkcss !== false && linkcss !== nil) {
            result['$<<']("<link rel=\"stylesheet\" href=\"" + (node.$normalize_web_path(self.stylesheets.$coderay_stylesheet_name(), (node.$attr("stylesdir", "")))) + "\"" + (slash) + ">")
            } else {
            result['$<<'](self.stylesheets.$embed_coderay_stylesheet())
          }}}else if ("pygments"['$===']($case)) {if ((node.$attr("pygments-css", "class"))['$==']("class")) {
          pygments_style = (self.$doc().$attr("pygments-style", "pastie"));
          if (linkcss !== false && linkcss !== nil) {
            result['$<<']("<link rel=\"stylesheet\" href=\"" + (node.$normalize_web_path(self.stylesheets.$pygments_stylesheet_name(pygments_style), (node.$attr("stylesdir", "")))) + "\"" + (slash) + ">")
            } else {
            result['$<<']((self.stylesheets.$instance().$embed_pygments_stylesheet(pygments_style)))
          };}}else if ("highlightjs"['$===']($case) || "highlight.js"['$===']($case)) {result['$<<']("<link rel=\"stylesheet\" href=\"" + (node.$attr("highlightjsdir", "http://cdnjs.cloudflare.com/ajax/libs/highlight.js/7.4")) + "/styles/" + (node.$attr("highlightjs-theme", "googlecode")) + ".min.css\"" + (slash) + ">\n<script src=\"" + (node.$attr("highlightjsdir", "http://cdnjs.cloudflare.com/ajax/libs/highlight.js/7.4")) + "/highlight.min.js\"></script>\n<script src=\"" + (node.$attr("highlightjsdir", "http://cdnjs.cloudflare.com/ajax/libs/highlight.js/7.4")) + "/lang/common.min.js\"></script>\n<script>hljs.initHighlightingOnLoad()</script>")}else if ("prettify"['$===']($case)) {result['$<<']("<link rel=\"stylesheet\" href=\"" + (node.$attr("prettifydir", "http://cdnjs.cloudflare.com/ajax/libs/prettify/r298")) + "/" + (node.$attr("prettify-theme", "prettify")) + ".min.css\"" + (slash) + ">\n<script src=\"" + (node.$attr("prettifydir", "http://cdnjs.cloudflare.com/ajax/libs/prettify/r298")) + "/prettify.min.js\"></script>\n<script>document.addEventListener('DOMContentLoaded', prettyPrint)</script>")};
        if ((($a = node['$attr?']("math")) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<script type=\"text/x-mathjax-config\">\nMathJax.Hub.Config({\n  tex2jax: {\n    inlineMath: [" + ($scope.INLINE_MATH_DELIMITERS['$[]']("latexmath")) + "],\n    displayMath: [" + ($scope.BLOCK_MATH_DELIMITERS['$[]']("latexmath")) + "],\n    ignoreClass: \"nomath|nolatexmath\"\n  },\n  asciimath2jax: {\n    delimiters: [" + ($scope.BLOCK_MATH_DELIMITERS['$[]']("asciimath")) + "],\n    ignoreClass: \"nomath|noasciimath\"\n  }\n});\n</script>\n<script type=\"text/javascript\" src=\"http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-MML-AM_HTMLorMML\"></script>\n<script>document.addEventListener('DOMContentLoaded', MathJax.Hub.TypeSet)</script>")};
        if ((($a = ((docinfo_content = node.$docinfo()))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          result['$<<'](docinfo_content)
        };
        result['$<<']("</head>");
        body_attrs = [];
        if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          body_attrs['$<<']("id=\"" + (node.$id()) + "\"")};
        if ((($a = ($b = ($c = (node['$attr?']("toc-class")), $c !== false && $c !== nil ?(node['$attr?']("toc")) : $c), $b !== false && $b !== nil ?(node['$attr?']("toc-placement", "auto")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          body_attrs['$<<']("class=\"" + (node.$doctype()) + " " + (node.$attr("toc-class")) + " toc-" + (node.$attr("toc-position", "left")) + "\"")
          } else {
          body_attrs['$<<']("class=\"" + (node.$doctype()) + "\"")
        };
        if ((($a = node['$attr?']("max-width")) !== nil && (!$a._isBoolean || $a == true))) {
          body_attrs['$<<']("style=\"max-width: " + (node.$attr("max-width")) + ";\"")};
        result['$<<']("<body " + (body_attrs['$*'](" ")) + ">");
        if ((($a = node.$noheader()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          result['$<<']("<div id=\"header\">");
          if (node.$doctype()['$==']("manpage")) {
            result['$<<']("<h1>" + (node.$doctitle()) + " Manual Page</h1>");
            if ((($a = ($b = (node['$attr?']("toc")), $b !== false && $b !== nil ?(node['$attr?']("toc-placement", "auto")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              result['$<<']("<div id=\"toc\" class=\"" + (node.$attr("toc-class", "toc")) + "\">\n<div id=\"toctitle\">" + (node.$attr("toc-title")) + "</div>\n" + (self.$outline(node)) + "\n</div>")};
            result['$<<']("<h2>" + (node.$attr("manname-title")) + "</h2>\n<div class=\"sectionbody\">\n<p>" + (node.$attr("manname")) + " - " + (node.$attr("manpurpose")) + "</p>\n</div>");
            } else {
            if ((($a = node['$has_header?']()) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = node.$notitle()) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                result['$<<']("<h1>" + (node.$header().$title()) + "</h1>")
              };
              if ((($a = node['$attr?']("author")) !== nil && (!$a._isBoolean || $a == true))) {
                result['$<<']("<span id=\"author\" class=\"author\">" + (node.$attr("author")) + "</span>" + (br));
                if ((($a = node['$attr?']("email")) !== nil && (!$a._isBoolean || $a == true))) {
                  result['$<<']("<span id=\"email\" class=\"email\">" + (node.$sub_macros(node.$attr("email"))) + "</span>" + (br))};
                if (((authorcount = (node.$attr("authorcount")).$to_i()))['$>'](1)) {
                  ($a = ($b = ($range(2, authorcount, false))).$each, $a._p = (TMP_1 = function(idx){var self = TMP_1._s || this, $a;
if (idx == null) idx = nil;
                  result['$<<']("<span id=\"author" + (idx) + "\" class=\"author\">" + (node.$attr("author_" + (idx))) + "</span>" + (br));
                    if ((($a = node['$attr?']("email_" + (idx))) !== nil && (!$a._isBoolean || $a == true))) {
                      return result['$<<']("<span id=\"email" + (idx) + "\" class=\"email\">" + (node.$sub_macros(node.$attr("email_" + (idx)))) + "</span>" + (br))
                      } else {
                      return nil
                    };}, TMP_1._s = self, TMP_1), $a).call($b)};};
              if ((($a = node['$attr?']("revnumber")) !== nil && (!$a._isBoolean || $a == true))) {
                result['$<<']("<span id=\"revnumber\">" + ((((($a = (node.$attr("version-label"))) !== false && $a !== nil) ? $a : "")).$downcase()) + " " + (node.$attr("revnumber")) + ((function() {if ((($a = (node['$attr?']("revdate"))) !== nil && (!$a._isBoolean || $a == true))) {
                  return ","
                  } else {
                  return ""
                }; return nil; })()) + "</span>")};
              if ((($a = node['$attr?']("revdate")) !== nil && (!$a._isBoolean || $a == true))) {
                result['$<<']("<span id=\"revdate\">" + (node.$attr("revdate")) + "</span>")};
              if ((($a = node['$attr?']("revremark")) !== nil && (!$a._isBoolean || $a == true))) {
                result['$<<']("" + (br) + "<span id=\"revremark\">" + (node.$attr("revremark")) + "</span>")};};
            if ((($a = ($c = (node['$attr?']("toc")), $c !== false && $c !== nil ?(node['$attr?']("toc-placement", "auto")) : $c)) !== nil && (!$a._isBoolean || $a == true))) {
              result['$<<']("<div id=\"toc\" class=\"" + (node.$attr("toc-class", "toc")) + "\">\n<div id=\"toctitle\">" + (node.$attr("toc-title")) + "</div>\n" + (self.$outline(node)) + "\n</div>")};
          };
          result['$<<']("</div>");
        };
        result['$<<']("<div id=\"content\">\n" + (node.$content()) + "\n</div>");
        if ((($a = ($c = node['$footnotes?'](), $c !== false && $c !== nil ?(node['$attr?']("nofootnotes"))['$!']() : $c)) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<div id=\"footnotes\">\n<hr" + (slash) + ">");
          ($a = ($c = node.$footnotes()).$each, $a._p = (TMP_2 = function(footnote){var self = TMP_2._s || this;
if (footnote == null) footnote = nil;
          return result['$<<']("<div class=\"footnote\" id=\"_footnote_" + (footnote.$index()) + "\">\n<a href=\"#_footnoteref_" + (footnote.$index()) + "\">" + (footnote.$index()) + "</a>. " + (footnote.$text()) + "\n</div>")}, TMP_2._s = self, TMP_2), $a).call($c);
          result['$<<']("</div>");};
        if ((($a = node.$nofooter()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          result['$<<']("<div id=\"footer\">");
          result['$<<']("<div id=\"footer-text\">");
          if ((($a = node['$attr?']("revnumber")) !== nil && (!$a._isBoolean || $a == true))) {
            result['$<<']("" + (node.$attr("version-label")) + " " + (node.$attr("revnumber")) + (br))};
          if ((($a = node['$attr?']("last-update-label")) !== nil && (!$a._isBoolean || $a == true))) {
            result['$<<']("" + (node.$attr("last-update-label")) + " " + (node.$attr("docdatetime")))};
          result['$<<']("</div>");
          if ((($a = ((docinfo_content = node.$docinfo("footer")))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            result['$<<'](docinfo_content)
          };
          result['$<<']("</div>");
        };
        result['$<<']("</body>");
        result['$<<']("</html>");
        return result['$*']($scope.EOL);
      };

      def.$embedded = function(node) {
        var $a, $b, TMP_3, self = this, result = nil, id_attr = nil;

        result = [];
        if ((($a = ($b = node.$notitle()['$!'](), $b !== false && $b !== nil ?node['$has_header?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          id_attr = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
            return " id=\"" + (node.$id()) + "\""
            } else {
            return nil
          }; return nil; })();
          result['$<<']("<h1" + (id_attr) + ">" + (node.$header().$title()) + "</h1>");};
        result['$<<'](node.$content());
        if ((($a = ($b = node['$footnotes?'](), $b !== false && $b !== nil ?(node['$attr?']("nofootnotes"))['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<div id=\"footnotes\">\n<hr" + (self.void_element_slash) + ">");
          ($a = ($b = node.$footnotes()).$each, $a._p = (TMP_3 = function(footnote){var self = TMP_3._s || this;
if (footnote == null) footnote = nil;
          return result['$<<']("<div class=\"footnote\" id=\"_footnote_" + (footnote.$index()) + "\">\n<a href=\"#_footnoteref_" + (footnote.$index()) + "\">" + (footnote.$index()) + "</a> " + (footnote.$text()) + "\n</div>")}, TMP_3._s = self, TMP_3), $a).call($b);
          result['$<<']("</div>");};
        return result['$*']($scope.EOL);
      };

      def.$outline = function(node, opts) {
        var $a, $b, TMP_4, self = this, sections = nil, sectnumlevels = nil, toclevels = nil, result = nil, slevel = nil, first_section = nil;

        if (opts == null) {
          opts = $hash2([], {})
        }
        if ((($a = ((sections = node.$sections()))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return nil};
        sectnumlevels = ((($a = opts['$[]']("sectnumlevels")) !== false && $a !== nil) ? $a : (node.$document().$attr("sectnumlevels", 3)).$to_i());
        toclevels = ((($a = opts['$[]']("toclevels")) !== false && $a !== nil) ? $a : (node.$document().$attr("toclevels", 2)).$to_i());
        result = [];
        slevel = ((first_section = sections['$[]'](0))).$level();
        if ((($a = (($b = slevel['$=='](0)) ? first_section.$special() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          slevel = 1};
        result['$<<']("<ul class=\"sectlevel" + (slevel) + "\">");
        ($a = ($b = sections).$each, $a._p = (TMP_4 = function(section){var self = TMP_4._s || this, $a, $b, $c, section_num = nil, child_toc_level = nil;
if (section == null) section = nil;
        section_num = (function() {if ((($a = (($b = ($c = section.$numbered(), $c !== false && $c !== nil ?section.$caption()['$!']() : $c), $b !== false && $b !== nil ?section.$level()['$<='](sectnumlevels) : $b))) !== nil && (!$a._isBoolean || $a == true))) {
            return "" + (section.$sectnum()) + " "
            } else {
            return nil
          }; return nil; })();
          result['$<<']("<li><a href=\"#" + (section.$id()) + "\">" + (section_num) + (section.$captioned_title()) + "</a></li>");
          if ((($a = (($b = section.$level()['$<'](toclevels)) ? (child_toc_level = self.$outline(section, $hash2(["toclevels", "secnumlevels"], {"toclevels": toclevels, "secnumlevels": sectnumlevels}))) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            result['$<<']("<li>");
            result['$<<'](child_toc_level);
            return result['$<<']("</li>");
            } else {
            return nil
          };}, TMP_4._s = self, TMP_4), $a).call($b);
        result['$<<']("</ul>");
        return result['$*']($scope.EOL);
      };

      def.$section = function(node) {
        var $a, $b, $c, self = this, slevel = nil, htag = nil, id_attr = nil, anchor = nil, link_start = nil, link_end = nil, class_attr = nil, role = nil, sectnum = nil;

        slevel = node.$level();
        if ((($a = (($b = slevel['$=='](0)) ? node.$special() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          slevel = 1};
        htag = "h" + (slevel['$+'](1));
        id_attr = anchor = link_start = link_end = nil;
        if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          id_attr = " id=\"" + (node.$id()) + "\"";
          if ((($a = node.$document()['$attr?']("sectanchors")) !== nil && (!$a._isBoolean || $a == true))) {
            anchor = "<a class=\"anchor\" href=\"#" + (node.$id()) + "\"></a>"
          } else if ((($a = node.$document()['$attr?']("sectlinks")) !== nil && (!$a._isBoolean || $a == true))) {
            link_start = "<a class=\"link\" href=\"#" + (node.$id()) + "\">";
            link_end = "</a>";};};
        if (slevel['$=='](0)) {
          return "<h1" + (id_attr) + " class=\"sect0\">" + (anchor) + (link_start) + (node.$title()) + (link_end) + "</h1>\n" + (node.$content())
          } else {
          class_attr = (function() {if ((($a = (role = node.$role())) !== nil && (!$a._isBoolean || $a == true))) {
            return " class=\"sect" + (slevel) + " " + (role) + "\""
            } else {
            return " class=\"sect" + (slevel) + "\""
          }; return nil; })();
          sectnum = (function() {if ((($a = ($b = ($c = node.$numbered(), $c !== false && $c !== nil ?node.$caption()['$!']() : $c), $b !== false && $b !== nil ?slevel['$<=']((node.$document().$attr("sectnumlevels", 3)).$to_i()) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            return "" + (node.$sectnum()) + " "
            } else {
            return nil
          }; return nil; })();
          return "<div" + (class_attr) + ">\n<" + (htag) + (id_attr) + ">" + (anchor) + (link_start) + (sectnum) + (node.$captioned_title()) + (link_end) + "</" + (htag) + ">\n" + ((function() {if (slevel['$=='](1)) {
            return "<div class=\"sectionbody\">\n" + (node.$content()) + "\n</div>"
            } else {
            return node.$content()
          }; return nil; })()) + "\n</div>";
        };
      };

      def.$admonition = function(node) {
        var $a, self = this, id_attr = nil, name = nil, title_element = nil, caption = nil, role = nil;

        id_attr = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        name = node.$attr("name");
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "<div class=\"title\">" + (node.$title()) + "</div>\n"
          } else {
          return nil
        }; return nil; })();
        caption = (function() {if ((($a = node.$document()['$attr?']("icons")) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = node.$document()['$attr?']("icons", "font")) !== nil && (!$a._isBoolean || $a == true))) {
            return "<i class=\"icon-" + (name) + "\" title=\"" + (node.$caption()) + "\"></i>"
            } else {
            return "<img src=\"" + (node.$icon_uri(name)) + "\" alt=\"" + (node.$caption()) + "\"" + (self.void_element_slash) + ">"
          }
          } else {
          return "<div class=\"title\">" + (node.$caption()) + "</div>"
        }; return nil; })();
        return "<div" + (id_attr) + " class=\"admonitionblock " + (name) + (($a = (role = node.$role()), $a !== false && $a !== nil ?" " + (role) : $a)) + "\">\n<table>\n<tr>\n<td class=\"icon\">\n" + (caption) + "\n</td>\n<td class=\"content\">\n" + (title_element) + (node.$content()) + "\n</td>\n</tr>\n</table>\n</div>";
      };

      def.$audio = function(node) {
        var $a, self = this, xml = nil, id_attribute = nil, classes = nil, class_attribute = nil, title_element = nil;

        xml = node.$document()['$attr?']("htmlsyntax", "xml");
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = ["audioblock", node.$style(), node.$role()].$compact();
        class_attribute = " class=\"" + (classes['$*'](" ")) + "\"";
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "<div class=\"title\">" + (node.$captioned_title()) + "</div>\n"
          } else {
          return nil
        }; return nil; })();
        return "<div" + (id_attribute) + (class_attribute) + ">\n" + (title_element) + "<div class=\"content\">\n<audio src=\"" + (node.$media_uri(node.$attr("target"))) + "\"" + ((function() {if ((($a = (node['$option?']("autoplay"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (self.$append_boolean_attribute("autoplay", xml))
          } else {
          return nil
        }; return nil; })()) + ((function() {if ((($a = (node['$option?']("nocontrols"))) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return (self.$append_boolean_attribute("controls", xml))
        }; return nil; })()) + ((function() {if ((($a = (node['$option?']("loop"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (self.$append_boolean_attribute("loop", xml))
          } else {
          return nil
        }; return nil; })()) + ">\nYour browser does not support the audio tag.\n</audio>\n</div>\n</div>";
      };

      def.$colist = function(node) {
        var $a, $b, TMP_5, $c, TMP_6, self = this, result = nil, id_attribute = nil, classes = nil, class_attribute = nil, font_icons = nil;

        result = [];
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = ["colist", node.$style(), node.$role()].$compact();
        class_attribute = " class=\"" + (classes['$*'](" ")) + "\"";
        result['$<<']("<div" + (id_attribute) + (class_attribute) + ">");
        if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<div class=\"title\">" + (node.$title()) + "</div>")};
        if ((($a = node.$document()['$attr?']("icons")) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<table>");
          font_icons = node.$document()['$attr?']("icons", "font");
          ($a = ($b = node.$items()).$each_with_index, $a._p = (TMP_5 = function(item, i){var self = TMP_5._s || this, num = nil, num_element = nil;
            if (self.void_element_slash == null) self.void_element_slash = nil;
if (item == null) item = nil;if (i == null) i = nil;
          num = i['$+'](1);
            num_element = (function() {if (font_icons !== false && font_icons !== nil) {
              return "<i class=\"conum\" data-value=\"" + (num) + "\"></i><b>" + (num) + "</b>"
              } else {
              return "<img src=\"" + (node.$icon_uri("callouts/" + (num))) + "\" alt=\"" + (num) + "\"" + (self.void_element_slash) + ">"
            }; return nil; })();
            return result['$<<']("<tr>\n<td>" + (num_element) + "</td>\n<td>" + (item.$text()) + "</td>\n</tr>");}, TMP_5._s = self, TMP_5), $a).call($b);
          result['$<<']("</table>");
          } else {
          result['$<<']("<ol>");
          ($a = ($c = node.$items()).$each, $a._p = (TMP_6 = function(item){var self = TMP_6._s || this;
if (item == null) item = nil;
          return result['$<<']("<li>\n<p>" + (item.$text()) + "</p>\n</li>")}, TMP_6._s = self, TMP_6), $a).call($c);
          result['$<<']("</ol>");
        };
        result['$<<']("</div>");
        return result['$*']($scope.EOL);
      };

      def.$dlist = function(node) {
        var $a, $b, TMP_7, $c, TMP_9, $d, TMP_11, self = this, result = nil, id_attribute = nil, classes = nil, $case = nil, class_attribute = nil, slash = nil, col_style_attribute = nil, dt_style_attribute = nil;

        result = [];
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = (function() {$case = node.$style();if ("qanda"['$===']($case)) {return ["qlist", "qanda", node.$role()]}else if ("horizontal"['$===']($case)) {return ["hdlist", node.$role()]}else {return ["dlist", node.$style(), node.$role()]}})().$compact();
        class_attribute = " class=\"" + (classes['$*'](" ")) + "\"";
        result['$<<']("<div" + (id_attribute) + (class_attribute) + ">");
        if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<div class=\"title\">" + (node.$title()) + "</div>")};
        $case = node.$style();if ("qanda"['$===']($case)) {result['$<<']("<ol>");
        ($a = ($b = node.$items()).$each, $a._p = (TMP_7 = function(terms, dd){var self = TMP_7._s || this, $a, $b, TMP_8;
if (terms == null) terms = nil;if (dd == null) dd = nil;
        result['$<<']("<li>");
          ($a = ($b = [].concat(terms)).$each, $a._p = (TMP_8 = function(dt){var self = TMP_8._s || this;
if (dt == null) dt = nil;
          return result['$<<']("<p><em>" + (dt.$text()) + "</em></p>")}, TMP_8._s = self, TMP_8), $a).call($b);
          if (dd !== false && dd !== nil) {
            if ((($a = dd['$text?']()) !== nil && (!$a._isBoolean || $a == true))) {
              result['$<<']("<p>" + (dd.$text()) + "</p>")};
            if ((($a = dd['$blocks?']()) !== nil && (!$a._isBoolean || $a == true))) {
              result['$<<'](dd.$content())};};
          return result['$<<']("</li>");}, TMP_7._s = self, TMP_7), $a).call($b);
        result['$<<']("</ol>");}else if ("horizontal"['$===']($case)) {slash = self.void_element_slash;
        result['$<<']("<table>");
        if ((($a = ((($c = (node['$attr?']("labelwidth"))) !== false && $c !== nil) ? $c : (node['$attr?']("itemwidth")))) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<colgroup>");
          col_style_attribute = (function() {if ((($a = (node['$attr?']("labelwidth"))) !== nil && (!$a._isBoolean || $a == true))) {
            return " style=\"width: " + ((node.$attr("labelwidth")).$chomp("%")) + "%;\""
            } else {
            return nil
          }; return nil; })();
          result['$<<']("<col" + (col_style_attribute) + (slash) + ">");
          col_style_attribute = (function() {if ((($a = (node['$attr?']("itemwidth"))) !== nil && (!$a._isBoolean || $a == true))) {
            return " style=\"width: " + ((node.$attr("itemwidth")).$chomp("%")) + "%;\""
            } else {
            return nil
          }; return nil; })();
          result['$<<']("<col" + (col_style_attribute) + (slash) + ">");
          result['$<<']("</colgroup>");};
        ($a = ($c = node.$items()).$each, $a._p = (TMP_9 = function(terms, dd){var self = TMP_9._s || this, $a, $b, TMP_10, terms_array = nil, last_term = nil;
if (terms == null) terms = nil;if (dd == null) dd = nil;
        result['$<<']("<tr>");
          result['$<<']("<td class=\"hdlist1" + ((function() {if ((($a = (node['$option?']("strong"))) !== nil && (!$a._isBoolean || $a == true))) {
            return " strong"
            } else {
            return nil
          }; return nil; })()) + "\">");
          terms_array = [].concat(terms);
          last_term = terms_array['$[]'](-1);
          ($a = ($b = terms_array).$each, $a._p = (TMP_10 = function(dt){var self = TMP_10._s || this, $a;
if (dt == null) dt = nil;
          result['$<<'](dt.$text());
            if ((($a = dt['$=='](last_term)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              return result['$<<']("<br" + (slash) + ">")
              } else {
              return nil
            };}, TMP_10._s = self, TMP_10), $a).call($b);
          result['$<<']("</td>");
          result['$<<']("<td class=\"hdlist2\">");
          if (dd !== false && dd !== nil) {
            if ((($a = dd['$text?']()) !== nil && (!$a._isBoolean || $a == true))) {
              result['$<<']("<p>" + (dd.$text()) + "</p>")};
            if ((($a = dd['$blocks?']()) !== nil && (!$a._isBoolean || $a == true))) {
              result['$<<'](dd.$content())};};
          result['$<<']("</td>");
          return result['$<<']("</tr>");}, TMP_9._s = self, TMP_9), $a).call($c);
        result['$<<']("</table>");}else {result['$<<']("<dl>");
        dt_style_attribute = (function() {if ((($a = node.$style()) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return " class=\"hdlist1\""
        }; return nil; })();
        ($a = ($d = node.$items()).$each, $a._p = (TMP_11 = function(terms, dd){var self = TMP_11._s || this, $a, $b, TMP_12;
if (terms == null) terms = nil;if (dd == null) dd = nil;
        ($a = ($b = [].concat(terms)).$each, $a._p = (TMP_12 = function(dt){var self = TMP_12._s || this;
if (dt == null) dt = nil;
          return result['$<<']("<dt" + (dt_style_attribute) + ">" + (dt.$text()) + "</dt>")}, TMP_12._s = self, TMP_12), $a).call($b);
          if (dd !== false && dd !== nil) {
            result['$<<']("<dd>");
            if ((($a = dd['$text?']()) !== nil && (!$a._isBoolean || $a == true))) {
              result['$<<']("<p>" + (dd.$text()) + "</p>")};
            if ((($a = dd['$blocks?']()) !== nil && (!$a._isBoolean || $a == true))) {
              result['$<<'](dd.$content())};
            return result['$<<']("</dd>");
            } else {
            return nil
          };}, TMP_11._s = self, TMP_11), $a).call($d);
        result['$<<']("</dl>");};
        result['$<<']("</div>");
        return result['$*']($scope.EOL);
      };

      def.$example = function(node) {
        var $a, self = this, id_attribute = nil, title_element = nil, role = nil;

        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "<div class=\"title\">" + (node.$captioned_title()) + "</div>\n"
          } else {
          return nil
        }; return nil; })();
        return "<div" + (id_attribute) + " class=\"" + ((function() {if ((($a = (role = node.$role())) !== nil && (!$a._isBoolean || $a == true))) {
          return ["exampleblock", role]['$*'](" ")
          } else {
          return "exampleblock"
        }; return nil; })()) + "\">\n" + (title_element) + "<div class=\"content\">\n" + (node.$content()) + "\n</div>\n</div>";
      };

      def.$floating_title = function(node) {
        var $a, self = this, tag_name = nil, id_attribute = nil, classes = nil;

        tag_name = "h" + (node.$level()['$+'](1));
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = [node.$style(), node.$role()].$compact();
        return "<" + (tag_name) + (id_attribute) + " class=\"" + (classes['$*'](" ")) + "\">" + (node.$title()) + "</" + (tag_name) + ">";
      };

      def.$image = function(node) {
        var $a, $b, self = this, align = nil, float$ = nil, style_attribute = nil, styles = nil, width_attribute = nil, height_attribute = nil, img_element = nil, link = nil, id_attribute = nil, classes = nil, class_attribute = nil, title_element = nil;

        align = (function() {if ((($a = (node['$attr?']("align"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (node.$attr("align"))
          } else {
          return nil
        }; return nil; })();
        float$ = (function() {if ((($a = (node['$attr?']("float"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (node.$attr("float"))
          } else {
          return nil
        }; return nil; })();
        style_attribute = (function() {if ((($a = ((($b = align) !== false && $b !== nil) ? $b : float$)) !== nil && (!$a._isBoolean || $a == true))) {
          styles = [(function() {if (align !== false && align !== nil) {
            return "text-align: " + (align)
            } else {
            return nil
          }; return nil; })(), (function() {if (float$ !== false && float$ !== nil) {
            return "float: " + (float$)
            } else {
            return nil
          }; return nil; })()].$compact();
          return " style=\"" + (styles['$*'](";")) + "\"";
          } else {
          return nil
        }; return nil; })();
        width_attribute = (function() {if ((($a = (node['$attr?']("width"))) !== nil && (!$a._isBoolean || $a == true))) {
          return " width=\"" + (node.$attr("width")) + "\""
          } else {
          return nil
        }; return nil; })();
        height_attribute = (function() {if ((($a = (node['$attr?']("height"))) !== nil && (!$a._isBoolean || $a == true))) {
          return " height=\"" + (node.$attr("height")) + "\""
          } else {
          return nil
        }; return nil; })();
        img_element = "<img src=\"" + (node.$image_uri(node.$attr("target"))) + "\" alt=\"" + (node.$attr("alt")) + "\"" + (width_attribute) + (height_attribute) + (self.void_element_slash) + ">";
        if ((($a = (link = node.$attr("link"))) !== nil && (!$a._isBoolean || $a == true))) {
          img_element = "<a class=\"image\" href=\"" + (link) + "\">" + (img_element) + "</a>"};
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = ["imageblock", node.$style(), node.$role()].$compact();
        class_attribute = " class=\"" + (classes['$*'](" ")) + "\"";
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "\n<div class=\"title\">" + (node.$captioned_title()) + "</div>"
          } else {
          return nil
        }; return nil; })();
        return "<div" + (id_attribute) + (class_attribute) + (style_attribute) + ">\n<div class=\"content\">\n" + (img_element) + "\n</div>" + (title_element) + "\n</div>";
      };

      def.$listing = function(node) {
        var $a, self = this, nowrap = nil, language = nil, language_classes = nil, $case = nil, pre_class = nil, code_class = nil, pre_start = nil, pre_end = nil, id_attribute = nil, title_element = nil, role = nil;

        nowrap = ((($a = (node.$document()['$attr?']("prewrap"))['$!']()) !== false && $a !== nil) ? $a : (node['$option?']("nowrap")));
        if (node.$style()['$==']("source")) {
          language = node.$attr("language");
          language_classes = (function() {if (language !== false && language !== nil) {
            return "" + (language) + " language-" + (language)
            } else {
            return nil
          }; return nil; })();
          $case = node.$attr("source-highlighter");if ("coderay"['$===']($case)) {pre_class = (function() {if (nowrap !== false && nowrap !== nil) {
            return " class=\"CodeRay nowrap\""
            } else {
            return " class=\"CodeRay\""
          }; return nil; })();
          code_class = (function() {if (language !== false && language !== nil) {
            return " class=\"" + (language_classes) + "\""
            } else {
            return nil
          }; return nil; })();}else if ("pygments"['$===']($case)) {pre_class = (function() {if (nowrap !== false && nowrap !== nil) {
            return " class=\"pygments highlight nowrap\""
            } else {
            return " class=\"pygments highlight\""
          }; return nil; })();
          code_class = (function() {if (language !== false && language !== nil) {
            return " class=\"" + (language_classes) + "\""
            } else {
            return nil
          }; return nil; })();}else if ("highlightjs"['$===']($case) || "highlight.js"['$===']($case)) {pre_class = (function() {if (nowrap !== false && nowrap !== nil) {
            return " class=\"highlight nowrap\""
            } else {
            return " class=\"highlight\""
          }; return nil; })();
          code_class = (function() {if (language !== false && language !== nil) {
            return " class=\"" + (language_classes) + "\""
            } else {
            return nil
          }; return nil; })();}else if ("prettify"['$===']($case)) {pre_class = " class=\"prettyprint" + ((function() {if (nowrap !== false && nowrap !== nil) {
            return " nowrap"
            } else {
            return nil
          }; return nil; })()) + ((function() {if ((($a = (node['$attr?']("linenums"))) !== nil && (!$a._isBoolean || $a == true))) {
            return " linenums"
            } else {
            return nil
          }; return nil; })()) + "\"";
          code_class = (function() {if (language !== false && language !== nil) {
            return " class=\"" + (language_classes) + "\""
            } else {
            return nil
          }; return nil; })();}else if ("html-pipeline"['$===']($case)) {pre_class = (function() {if (language !== false && language !== nil) {
            return " lang=\"" + (language) + "\""
            } else {
            return nil
          }; return nil; })();
          code_class = nil;}else {pre_class = (function() {if (nowrap !== false && nowrap !== nil) {
            return " class=\"highlight nowrap\""
            } else {
            return " class=\"highlight\""
          }; return nil; })();
          code_class = (function() {if (language !== false && language !== nil) {
            return " class=\"" + (language_classes) + "\""
            } else {
            return nil
          }; return nil; })();};
          pre_start = "<pre" + (pre_class) + "><code" + (code_class) + ">";
          pre_end = "</code></pre>";
          } else {
          pre_start = "<pre" + ((function() {if (nowrap !== false && nowrap !== nil) {
            return " class=\"nowrap\""
            } else {
            return nil
          }; return nil; })()) + ">";
          pre_end = "</pre>";
        };
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "<div class=\"title\">" + (node.$captioned_title()) + "</div>\n"
          } else {
          return nil
        }; return nil; })();
        return "<div" + (id_attribute) + " class=\"listingblock" + (($a = (role = node.$role()), $a !== false && $a !== nil ?" " + (role) : $a)) + "\">\n" + (title_element) + "<div class=\"content\">\n" + (pre_start) + (node.$content()) + (pre_end) + "\n</div>\n</div>";
      };

      def.$literal = function(node) {
        var $a, self = this, id_attribute = nil, title_element = nil, nowrap = nil, role = nil;

        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "<div class=\"title\">" + (node.$title()) + "</div>\n"
          } else {
          return nil
        }; return nil; })();
        nowrap = ((($a = (node.$document()['$attr?']("prewrap"))['$!']()) !== false && $a !== nil) ? $a : (node['$option?']("nowrap")));
        return "<div" + (id_attribute) + " class=\"literalblock" + (($a = (role = node.$role()), $a !== false && $a !== nil ?" " + (role) : $a)) + "\">\n" + (title_element) + "<div class=\"content\">\n<pre" + ((function() {if (nowrap !== false && nowrap !== nil) {
          return " class=\"nowrap\""
          } else {
          return nil
        }; return nil; })()) + ">" + (node.$content()) + "</pre>\n</div>\n</div>";
      };

      def.$math = function(node) {
        var $a, $b, self = this, id_attribute = nil, title_element = nil, open = nil, close = nil, equation = nil, role = nil;

        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "<div class=\"title\">" + (node.$title()) + "</div>\n"
          } else {
          return nil
        }; return nil; })();
        $a = $opal.to_ary($scope.BLOCK_MATH_DELIMITERS['$[]'](node.$style().$to_sym())), open = ($a[0] == null ? nil : $a[0]), close = ($a[1] == null ? nil : $a[1]);
        equation = node.$content().$strip();
        if ((($a = ($b = node.$subs()['$nil_or_empty?'](), $b !== false && $b !== nil ?(node['$attr?']("subs"))['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          equation = node.$sub_specialcharacters(equation)};
        if ((($a = ($b = (equation['$start_with?'](open)), $b !== false && $b !== nil ?(equation['$end_with?'](close)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          equation = "" + (open) + (equation) + (close)
        };
        return "<div" + (id_attribute) + " class=\"" + ((function() {if ((($a = (role = node.$role())) !== nil && (!$a._isBoolean || $a == true))) {
          return ["mathblock", role]['$*'](" ")
          } else {
          return "mathblock"
        }; return nil; })()) + "\">\n" + (title_element) + "<div class=\"content\">\n" + (equation) + "\n</div>\n</div>";
      };

      def.$olist = function(node) {
        var $a, $b, TMP_13, self = this, result = nil, id_attribute = nil, classes = nil, class_attribute = nil, type_attribute = nil, keyword = nil, start_attribute = nil;

        result = [];
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = ["olist", node.$style(), node.$role()].$compact();
        class_attribute = " class=\"" + (classes['$*'](" ")) + "\"";
        result['$<<']("<div" + (id_attribute) + (class_attribute) + ">");
        if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<div class=\"title\">" + (node.$title()) + "</div>")};
        type_attribute = (function() {if ((($a = (keyword = node.$list_marker_keyword())) !== nil && (!$a._isBoolean || $a == true))) {
          return " type=\"" + (keyword) + "\""
          } else {
          return nil
        }; return nil; })();
        start_attribute = (function() {if ((($a = (node['$attr?']("start"))) !== nil && (!$a._isBoolean || $a == true))) {
          return " start=\"" + (node.$attr("start")) + "\""
          } else {
          return nil
        }; return nil; })();
        result['$<<']("<ol class=\"" + (node.$style()) + "\"" + (type_attribute) + (start_attribute) + ">");
        ($a = ($b = node.$items()).$each, $a._p = (TMP_13 = function(item){var self = TMP_13._s || this, $a;
if (item == null) item = nil;
        result['$<<']("<li>");
          result['$<<']("<p>" + (item.$text()) + "</p>");
          if ((($a = item['$blocks?']()) !== nil && (!$a._isBoolean || $a == true))) {
            result['$<<'](item.$content())};
          return result['$<<']("</li>");}, TMP_13._s = self, TMP_13), $a).call($b);
        result['$<<']("</ol>");
        result['$<<']("</div>");
        return result['$*']($scope.EOL);
      };

      def.$open = function(node) {
        var $a, $b, $c, $d, self = this, style = nil, id_attr = nil, title_el = nil, role = nil;

        if (((style = node.$style()))['$==']("abstract")) {
          if ((($a = (($b = node.$parent()['$=='](node.$document())) ? node.$document().$doctype()['$==']("book") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            self.$warn("asciidoctor: WARNING: abstract block cannot be used in a document without a title when doctype is book. Excluding block content.");
            return "";
            } else {
            id_attr = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
              return " id=\"" + (node.$id()) + "\""
              } else {
              return nil
            }; return nil; })();
            title_el = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return "<div class=\"title\">" + (node.$title()) + "</div>"
              } else {
              return nil
            }; return nil; })();
            return "<div" + (id_attr) + " class=\"quoteblock abstract" + (($a = (role = node.$role()), $a !== false && $a !== nil ?" " + (role) : $a)) + "\">\n" + (title_el) + "<blockquote>\n" + (node.$content()) + "\n</blockquote>\n</div>";
          }
        } else if ((($a = (($b = style['$==']("partintro")) ? (((($c = ((($d = node.$level()['$=='](0)['$!']()) !== false && $d !== nil) ? $d : node.$parent().$context()['$==']("section")['$!']())) !== false && $c !== nil) ? $c : node.$document().$doctype()['$==']("book")['$!']())) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          self.$warn("asciidoctor: ERROR: partintro block can only be used when doctype is book and it's a child of a book part. Excluding block content.");
          return "";
          } else {
          id_attr = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
            return " id=\"" + (node.$id()) + "\""
            } else {
            return nil
          }; return nil; })();
          title_el = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return "<div class=\"title\">" + (node.$title()) + "</div>"
            } else {
            return nil
          }; return nil; })();
          return "<div" + (id_attr) + " class=\"openblock" + ((function() {if ((($a = (($b = style !== false && style !== nil) ? style['$==']("open")['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            return " " + (style)
            } else {
            return ""
          }; return nil; })()) + (($a = (role = node.$role()), $a !== false && $a !== nil ?" " + (role) : $a)) + "\">\n" + (title_el) + "<div class=\"content\">\n" + (node.$content()) + "\n</div>\n</div>";
        };
      };

      def.$page_break = function(node) {
        var self = this;

        return "<div style=\"page-break-after: always;\"></div>";
      };

      def.$paragraph = function(node) {
        var $a, self = this, attributes = nil;

        attributes = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = node.$role()) !== nil && (!$a._isBoolean || $a == true))) {
            return " id=\"" + (node.$id()) + "\" class=\"paragraph " + (node.$role()) + "\""
            } else {
            return " id=\"" + (node.$id()) + "\" class=\"paragraph\""
          }
        } else if ((($a = node.$role()) !== nil && (!$a._isBoolean || $a == true))) {
          return " class=\"paragraph " + (node.$role()) + "\""
          } else {
          return " class=\"paragraph\""
        }; return nil; })();
        if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "<div" + (attributes) + ">\n<div class=\"title\">" + (node.$title()) + "</div>\n<p>" + (node.$content()) + "</p>\n</div>"
          } else {
          return "<div" + (attributes) + ">\n<p>" + (node.$content()) + "</p>\n</div>"
        };
      };

      def.$preamble = function(node) {
        var $a, $b, self = this, toc = nil;

        toc = (function() {if ((($a = ($b = (node['$attr?']("toc")), $b !== false && $b !== nil ?(node['$attr?']("toc-placement", "preamble")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return "\n<div id=\"toc\" class=\"" + (node.$attr("toc-class", "toc")) + "\">\n<div id=\"toctitle\">" + (node.$attr("toc-title")) + "</div>\n" + (self.$outline(node.$document())) + "\n</div>"
          } else {
          return nil
        }; return nil; })();
        return "<div id=\"preamble\">\n<div class=\"sectionbody\">\n" + (node.$content()) + "\n</div>" + (toc) + "\n</div>";
      };

      def.$quote = function(node) {
        var $a, $b, self = this, id_attribute = nil, classes = nil, class_attribute = nil, title_element = nil, attribution = nil, citetitle = nil, cite_element = nil, attribution_text = nil, attribution_element = nil;

        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = ["quoteblock", node.$role()].$compact();
        class_attribute = " class=\"" + (classes['$*'](" ")) + "\"";
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "\n<div class=\"title\">" + (node.$title()) + "</div>"
          } else {
          return nil
        }; return nil; })();
        attribution = (function() {if ((($a = (node['$attr?']("attribution"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (node.$attr("attribution"))
          } else {
          return nil
        }; return nil; })();
        citetitle = (function() {if ((($a = (node['$attr?']("citetitle"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (node.$attr("citetitle"))
          } else {
          return nil
        }; return nil; })();
        if ((($a = ((($b = attribution) !== false && $b !== nil) ? $b : citetitle)) !== nil && (!$a._isBoolean || $a == true))) {
          cite_element = (function() {if (citetitle !== false && citetitle !== nil) {
            return "<cite>" + (citetitle) + "</cite>"
            } else {
            return nil
          }; return nil; })();
          attribution_text = (function() {if (attribution !== false && attribution !== nil) {
            return "" + ((function() {if (citetitle !== false && citetitle !== nil) {
              return "<br" + (self.void_element_slash) + ">\n"
              } else {
              return nil
            }; return nil; })()) + "&#8212; " + (attribution)
            } else {
            return nil
          }; return nil; })();
          attribution_element = "\n<div class=\"attribution\">\n" + (cite_element) + (attribution_text) + "\n</div>";
          } else {
          attribution_element = nil
        };
        return "<div" + (id_attribute) + (class_attribute) + ">" + (title_element) + "\n<blockquote>\n" + (node.$content()) + "\n</blockquote>" + (attribution_element) + "\n</div>";
      };

      def.$thematic_break = function(node) {
        var self = this;

        return "<hr" + (self.void_element_slash) + ">";
      };

      def.$sidebar = function(node) {
        var $a, self = this, id_attribute = nil, title_element = nil, role = nil;

        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "<div class=\"title\">" + (node.$title()) + "</div>\n"
          } else {
          return nil
        }; return nil; })();
        return "<div" + (id_attribute) + " class=\"" + ((function() {if ((($a = (role = node.$role())) !== nil && (!$a._isBoolean || $a == true))) {
          return ["sidebarblock", role]['$*'](" ")
          } else {
          return "sidebarblock"
        }; return nil; })()) + "\">\n<div class=\"content\">\n" + (title_element) + (node.$content()) + "\n</div>\n</div>";
      };

      def.$table = function(node) {
        var $a, $b, TMP_14, $c, TMP_15, $d, TMP_16, $e, $f, TMP_20, self = this, result = nil, id_attribute = nil, classes = nil, role_class = nil, class_attribute = nil, styles = nil, style_attribute = nil, slash = nil, tag = nil;

        result = [];
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = ["tableblock", "frame-" + (node.$attr("frame", "all")), "grid-" + (node.$attr("grid", "all"))];
        if ((($a = (role_class = node.$role())) !== nil && (!$a._isBoolean || $a == true))) {
          classes['$<<'](role_class)};
        class_attribute = " class=\"" + (classes['$*'](" ")) + "\"";
        styles = [(function() {if ((($a = (node['$option?']("autowidth"))) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return "width: " + (node.$attr("tablepcwidth")) + "%;"
        }; return nil; })(), (function() {if ((($a = (node['$attr?']("float"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "float: " + (node.$attr("float")) + ";"
          } else {
          return nil
        }; return nil; })()].$compact();
        style_attribute = (function() {if (styles.$size()['$>'](0)) {
          return " style=\"" + (styles['$*'](" ")) + "\""
          } else {
          return nil
        }; return nil; })();
        result['$<<']("<table" + (id_attribute) + (class_attribute) + (style_attribute) + ">");
        if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<caption class=\"title\">" + (node.$captioned_title()) + "</caption>")};
        if ((node.$attr("rowcount"))['$>'](0)) {
          slash = self.void_element_slash;
          result['$<<']("<colgroup>");
          if ((($a = node['$option?']("autowidth")) !== nil && (!$a._isBoolean || $a == true))) {
            tag = "<col" + (slash) + ">";
            ($a = ($b = node.$columns().$size()).$times, $a._p = (TMP_14 = function(){var self = TMP_14._s || this;

            return result['$<<'](tag)}, TMP_14._s = self, TMP_14), $a).call($b);
            } else {
            ($a = ($c = node.$columns()).$each, $a._p = (TMP_15 = function(col){var self = TMP_15._s || this;
if (col == null) col = nil;
            return result['$<<']("<col style=\"width: " + (col.$attr("colpcwidth")) + "%;\"" + (slash) + ">")}, TMP_15._s = self, TMP_15), $a).call($c)
          };
          result['$<<']("</colgroup>");
          ($a = ($d = ($e = ($f = ["head", "foot", "body"]).$select, $e._p = (TMP_20 = function(tsec){var self = TMP_20._s || this;
if (tsec == null) tsec = nil;
          return node.$rows()['$[]'](tsec)['$empty?']()['$!']()}, TMP_20._s = self, TMP_20), $e).call($f)).$each, $a._p = (TMP_16 = function(tsec){var self = TMP_16._s || this, $a, $b, TMP_17;
if (tsec == null) tsec = nil;
          result['$<<']("<t" + (tsec) + ">");
            ($a = ($b = node.$rows()['$[]'](tsec)).$each, $a._p = (TMP_17 = function(row){var self = TMP_17._s || this, $a, $b, TMP_18;
if (row == null) row = nil;
            result['$<<']("<tr>");
              ($a = ($b = row).$each, $a._p = (TMP_18 = function(cell){var self = TMP_18._s || this, $a, $b, TMP_19, $c, cell_content = nil, $case = nil, cell_tag_name = nil, cell_class_attribute = nil, cell_colspan_attribute = nil, cell_rowspan_attribute = nil, cell_style_attribute = nil;
if (cell == null) cell = nil;
              if (tsec['$==']("head")) {
                  cell_content = cell.$text()
                  } else {
                  $case = cell.$style();if ("asciidoc"['$===']($case)) {cell_content = "<div>" + (cell.$content()) + "</div>"}else if ("verse"['$===']($case)) {cell_content = "<div class=\"verse\">" + (cell.$text()) + "</div>"}else if ("literal"['$===']($case)) {cell_content = "<div class=\"literal\"><pre>" + (cell.$text()) + "</pre></div>"}else {cell_content = "";
                  ($a = ($b = cell.$content()).$each, $a._p = (TMP_19 = function(text){var self = TMP_19._s || this;
if (text == null) text = nil;
                  return cell_content = "" + (cell_content) + "<p class=\"tableblock\">" + (text) + "</p>"}, TMP_19._s = self, TMP_19), $a).call($b);}
                };
                cell_tag_name = ((function() {if ((($a = ((($c = tsec['$==']("head")) !== false && $c !== nil) ? $c : cell.$style()['$==']("header"))) !== nil && (!$a._isBoolean || $a == true))) {
                  return "th"
                  } else {
                  return "td"
                }; return nil; })());
                cell_class_attribute = " class=\"tableblock halign-" + (cell.$attr("halign")) + " valign-" + (cell.$attr("valign")) + "\"";
                cell_colspan_attribute = (function() {if ((($a = cell.$colspan()) !== nil && (!$a._isBoolean || $a == true))) {
                  return " colspan=\"" + (cell.$colspan()) + "\""
                  } else {
                  return nil
                }; return nil; })();
                cell_rowspan_attribute = (function() {if ((($a = cell.$rowspan()) !== nil && (!$a._isBoolean || $a == true))) {
                  return " rowspan=\"" + (cell.$rowspan()) + "\""
                  } else {
                  return nil
                }; return nil; })();
                cell_style_attribute = (function() {if ((($a = (node.$document()['$attr?']("cellbgcolor"))) !== nil && (!$a._isBoolean || $a == true))) {
                  return " style=\"background-color: " + (node.$document().$attr("cellbgcolor")) + ";\""
                  } else {
                  return nil
                }; return nil; })();
                return result['$<<']("<" + (cell_tag_name) + (cell_class_attribute) + (cell_colspan_attribute) + (cell_rowspan_attribute) + (cell_style_attribute) + ">" + (cell_content) + "</" + (cell_tag_name) + ">");}, TMP_18._s = self, TMP_18), $a).call($b);
              return result['$<<']("</tr>");}, TMP_17._s = self, TMP_17), $a).call($b);
            return result['$<<']("</t" + (tsec) + ">");}, TMP_16._s = self, TMP_16), $a).call($d);};
        result['$<<']("</table>");
        return result['$*']($scope.EOL);
      };

      def.$toc = function(node) {
        var $a, $b, self = this, doc = nil, id_attr = nil, title_id_attr = nil, title = nil, levels = nil, role = nil;

        if ((($a = ((doc = node.$document()))['$attr?']("toc")) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return "<!-- toc disabled -->"
        };
        if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          id_attr = " id=\"" + (node.$id()) + "\"";
          title_id_attr = "";
        } else if ((($a = ((($b = doc['$embedded?']()) !== false && $b !== nil) ? $b : (doc['$attr?']("toc-placement"))['$!']())) !== nil && (!$a._isBoolean || $a == true))) {
          id_attr = " id=\"toc\"";
          title_id_attr = " id=\"toctitle\"";
          } else {
          id_attr = nil;
          title_id_attr = nil;
        };
        title = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return node.$title()
          } else {
          return (doc.$attr("toc-title"))
        }; return nil; })();
        levels = (function() {if ((($a = (node['$attr?']("levels"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (node.$attr("levels")).$to_i()
          } else {
          return nil
        }; return nil; })();
        role = (function() {if ((($a = node['$role?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return node.$role()
          } else {
          return (doc.$attr("toc-class", "toc"))
        }; return nil; })();
        return "<div" + (id_attr) + " class=\"" + (role) + "\">\n<div" + (title_id_attr) + " class=\"title\">" + (title) + "</div>\n" + (self.$outline(doc, $hash2(["toclevels"], {"toclevels": levels}))) + "\n</div>";
      };

      def.$ulist = function(node) {
        var $a, $b, TMP_21, self = this, result = nil, id_attribute = nil, div_classes = nil, marker_checked = nil, marker_unchecked = nil, checklist = nil, ul_class_attribute = nil;

        result = [];
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        div_classes = ["ulist", node.$style(), node.$role()].$compact();
        marker_checked = nil;
        marker_unchecked = nil;
        if ((($a = (checklist = node['$option?']("checklist"))) !== nil && (!$a._isBoolean || $a == true))) {
          div_classes.$insert(1, "checklist");
          ul_class_attribute = " class=\"checklist\"";
          if ((($a = node['$option?']("interactive")) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = node.$document()['$attr?']("htmlsyntax", "xml")) !== nil && (!$a._isBoolean || $a == true))) {
              marker_checked = "<input type=\"checkbox\" data-item-complete=\"1\" checked=\"checked\"/> ";
              marker_unchecked = "<input type=\"checkbox\" data-item-complete=\"0\"/> ";
              } else {
              marker_checked = "<input type=\"checkbox\" data-item-complete=\"1\" checked> ";
              marker_unchecked = "<input type=\"checkbox\" data-item-complete=\"0\"> ";
            }
          } else if ((($a = node.$document()['$attr?']("icons", "font")) !== nil && (!$a._isBoolean || $a == true))) {
            marker_checked = "<i class=\"icon-check\"></i> ";
            marker_unchecked = "<i class=\"icon-check-empty\"></i> ";
            } else {
            marker_checked = "&#10003; ";
            marker_unchecked = "&#10063; ";
          };
          } else {
          ul_class_attribute = (function() {if ((($a = node.$style()) !== nil && (!$a._isBoolean || $a == true))) {
            return " class=\"" + (node.$style()) + "\""
            } else {
            return nil
          }; return nil; })()
        };
        result['$<<']("<div" + (id_attribute) + " class=\"" + (div_classes['$*'](" ")) + "\">");
        if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          result['$<<']("<div class=\"title\">" + (node.$title()) + "</div>")};
        result['$<<']("<ul" + (ul_class_attribute) + ">");
        ($a = ($b = node.$items()).$each, $a._p = (TMP_21 = function(item){var self = TMP_21._s || this, $a, $b;
if (item == null) item = nil;
        result['$<<']("<li>");
          if ((($a = (($b = checklist !== false && checklist !== nil) ? (item['$attr?']("checkbox")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            result['$<<']("<p>" + ((function() {if ((($a = (item['$attr?']("checked"))) !== nil && (!$a._isBoolean || $a == true))) {
              return marker_checked
              } else {
              return marker_unchecked
            }; return nil; })()) + (item.$text()) + "</p>")
            } else {
            result['$<<']("<p>" + (item.$text()) + "</p>")
          };
          if ((($a = item['$blocks?']()) !== nil && (!$a._isBoolean || $a == true))) {
            result['$<<'](item.$content())};
          return result['$<<']("</li>");}, TMP_21._s = self, TMP_21), $a).call($b);
        result['$<<']("</ul>");
        result['$<<']("</div>");
        return result['$*']($scope.EOL);
      };

      def.$verse = function(node) {
        var $a, $b, self = this, id_attribute = nil, classes = nil, class_attribute = nil, title_element = nil, attribution = nil, citetitle = nil, cite_element = nil, attribution_text = nil, attribution_element = nil;

        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = ["verseblock", node.$role()].$compact();
        class_attribute = " class=\"" + (classes['$*'](" ")) + "\"";
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "\n<div class=\"title\">" + (node.$title()) + "</div>"
          } else {
          return nil
        }; return nil; })();
        attribution = (function() {if ((($a = (node['$attr?']("attribution"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (node.$attr("attribution"))
          } else {
          return nil
        }; return nil; })();
        citetitle = (function() {if ((($a = (node['$attr?']("citetitle"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (node.$attr("citetitle"))
          } else {
          return nil
        }; return nil; })();
        if ((($a = ((($b = attribution) !== false && $b !== nil) ? $b : citetitle)) !== nil && (!$a._isBoolean || $a == true))) {
          cite_element = (function() {if (citetitle !== false && citetitle !== nil) {
            return "<cite>" + (citetitle) + "</cite>"
            } else {
            return nil
          }; return nil; })();
          attribution_text = (function() {if (attribution !== false && attribution !== nil) {
            return "" + ((function() {if (citetitle !== false && citetitle !== nil) {
              return "<br" + (self.void_element_slash) + ">\n"
              } else {
              return nil
            }; return nil; })()) + "&#8212; " + (attribution)
            } else {
            return nil
          }; return nil; })();
          attribution_element = "\n<div class=\"attribution\">\n" + (cite_element) + (attribution_text) + "\n</div>";
          } else {
          attribution_element = nil
        };
        return "<div" + (id_attribute) + (class_attribute) + ">" + (title_element) + "\n<pre class=\"content\">" + (node.$content()) + "</pre>" + (attribution_element) + "\n</div>";
      };

      def.$video = function(node) {
        var $a, $b, self = this, xml = nil, id_attribute = nil, classes = nil, class_attribute = nil, title_element = nil, width_attribute = nil, height_attribute = nil, $case = nil, start_anchor = nil, delimiter = nil, autoplay_param = nil, loop_param = nil, start_param = nil, end_param = nil, controls_param = nil, poster_attribute = nil, poster = nil, time_anchor = nil;

        xml = node.$document()['$attr?']("htmlsyntax", "xml");
        id_attribute = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return " id=\"" + (node.$id()) + "\""
          } else {
          return nil
        }; return nil; })();
        classes = ["videoblock", node.$style(), node.$role()].$compact();
        class_attribute = " class=\"" + (classes['$*'](" ")) + "\"";
        title_element = (function() {if ((($a = node['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return "\n<div class=\"title\">" + (node.$captioned_title()) + "</div>"
          } else {
          return nil
        }; return nil; })();
        width_attribute = (function() {if ((($a = (node['$attr?']("width"))) !== nil && (!$a._isBoolean || $a == true))) {
          return " width=\"" + (node.$attr("width")) + "\""
          } else {
          return nil
        }; return nil; })();
        height_attribute = (function() {if ((($a = (node['$attr?']("height"))) !== nil && (!$a._isBoolean || $a == true))) {
          return " height=\"" + (node.$attr("height")) + "\""
          } else {
          return nil
        }; return nil; })();
        return (function() {$case = node.$attr("poster");if ("vimeo"['$===']($case)) {start_anchor = (function() {if ((($a = (node['$attr?']("start"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "#at=" + (node.$attr("start"))
          } else {
          return nil
        }; return nil; })();
        delimiter = "?";
        autoplay_param = (function() {if ((($a = (node['$option?']("autoplay"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "" + (delimiter) + "autoplay=1"
          } else {
          return nil
        }; return nil; })();
        if (autoplay_param !== false && autoplay_param !== nil) {
          delimiter = "&amp;"};
        loop_param = (function() {if ((($a = (node['$option?']("loop"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "" + (delimiter) + "loop=1"
          } else {
          return nil
        }; return nil; })();
        return "<div" + (id_attribute) + (class_attribute) + ">" + (title_element) + "\n<div class=\"content\">\n<iframe" + (width_attribute) + (height_attribute) + " src=\"//player.vimeo.com/video/" + (node.$attr("target")) + (start_anchor) + (autoplay_param) + (loop_param) + "\" frameborder=\"0\"" + (self.$append_boolean_attribute("webkitAllowFullScreen", xml)) + (self.$append_boolean_attribute("mozallowfullscreen", xml)) + (self.$append_boolean_attribute("allowFullScreen", xml)) + "></iframe>\n</div>\n</div>";}else if ("youtube"['$===']($case)) {start_param = (function() {if ((($a = (node['$attr?']("start"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "&amp;start=" + (node.$attr("start"))
          } else {
          return nil
        }; return nil; })();
        end_param = (function() {if ((($a = (node['$attr?']("end"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "&amp;end=" + (node.$attr("end"))
          } else {
          return nil
        }; return nil; })();
        autoplay_param = (function() {if ((($a = (node['$option?']("autoplay"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "&amp;autoplay=1"
          } else {
          return nil
        }; return nil; })();
        loop_param = (function() {if ((($a = (node['$option?']("loop"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "&amp;loop=1"
          } else {
          return nil
        }; return nil; })();
        controls_param = (function() {if ((($a = (node['$option?']("nocontrols"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "&amp;controls=0"
          } else {
          return nil
        }; return nil; })();
        return "<div" + (id_attribute) + (class_attribute) + ">" + (title_element) + "\n<div class=\"content\">\n<iframe" + (width_attribute) + (height_attribute) + " src=\"//www.youtube.com/embed/" + (node.$attr("target")) + "?rel=0" + (start_param) + (end_param) + (autoplay_param) + (loop_param) + (controls_param) + "\" frameborder=\"0\"" + ((function() {if ((($a = (node['$option?']("nofullscreen"))) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return (self.$append_boolean_attribute("allowfullscreen", xml))
        }; return nil; })()) + "></iframe>\n</div>\n</div>";}else {poster_attribute = (function() {if ((($a = (("") + (poster = node.$attr("poster")))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return " poster=\"" + (node.$media_uri(poster)) + "\""
        }; return nil; })();
        time_anchor = (function() {if ((($a = (((($b = (node['$attr?']("start"))) !== false && $b !== nil) ? $b : (node['$attr?']("end"))))) !== nil && (!$a._isBoolean || $a == true))) {
          return "#t=" + (node.$attr("start")) + ((function() {if ((($a = (node['$attr?']("end"))) !== nil && (!$a._isBoolean || $a == true))) {
            return ","
            } else {
            return nil
          }; return nil; })()) + (node.$attr("end"))
          } else {
          return nil
        }; return nil; })();
        return "<div" + (id_attribute) + (class_attribute) + ">" + (title_element) + "\n<div class=\"content\">\n<video src=\"" + (node.$media_uri(node.$attr("target"))) + (time_anchor) + "\"" + (width_attribute) + (height_attribute) + (poster_attribute) + ((function() {if ((($a = (node['$option?']("autoplay"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (self.$append_boolean_attribute("autoplay", xml))
          } else {
          return nil
        }; return nil; })()) + ((function() {if ((($a = (node['$option?']("nocontrols"))) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return (self.$append_boolean_attribute("controls", xml))
        }; return nil; })()) + ((function() {if ((($a = (node['$option?']("loop"))) !== nil && (!$a._isBoolean || $a == true))) {
          return (self.$append_boolean_attribute("loop", xml))
          } else {
          return nil
        }; return nil; })()) + ">\nYour browser does not support the video tag.\n</video>\n</div>\n</div>";}})();
      };

      def.$inline_anchor = function(node) {
        var $a, $b, self = this, target = nil, $case = nil, refid = nil, text = nil, class_attr = nil, role = nil, window_attr = nil;

        target = node.$target();
        return (function() {$case = node.$type();if ("xref"['$===']($case)) {refid = ((($a = (node.$attr("refid"))) !== false && $a !== nil) ? $a : target);
        text = ((($a = node.$text()) !== false && $a !== nil) ? $a : (((($b = node.$document().$references()['$[]']("ids")['$[]'](refid)) !== false && $b !== nil) ? $b : "[" + (refid) + "]")));
        return "<a href=\"" + (target) + "\">" + (text) + "</a>";}else if ("ref"['$===']($case)) {return "<a id=\"" + (target) + "\"></a>"}else if ("link"['$===']($case)) {class_attr = (function() {if ((($a = (role = node.$role())) !== nil && (!$a._isBoolean || $a == true))) {
          return " class=\"" + (role) + "\""
          } else {
          return nil
        }; return nil; })();
        window_attr = (function() {if ((($a = (node['$attr?']("window"))) !== nil && (!$a._isBoolean || $a == true))) {
          return " target=\"" + (node.$attr("window")) + "\""
          } else {
          return nil
        }; return nil; })();
        return "<a href=\"" + (target) + "\"" + (class_attr) + (window_attr) + ">" + (node.$text()) + "</a>";}else if ("bibref"['$===']($case)) {return "<a id=\"" + (target) + "\"></a>[" + (target) + "]"}else {return self.$warn("asciidoctor: WARNING: unknown anchor type: " + (node.$type().$inspect()))}})();
      };

      def.$inline_break = function(node) {
        var self = this;

        return "" + (node.$text()) + "<br" + (self.void_element_slash) + ">";
      };

      def.$inline_button = function(node) {
        var self = this;

        return "<b class=\"button\">" + (node.$text()) + "</b>";
      };

      def.$inline_callout = function(node) {
        var $a, self = this, src = nil;

        if ((($a = node.$document()['$attr?']("icons", "font")) !== nil && (!$a._isBoolean || $a == true))) {
          return "<i class=\"conum\" data-value=\"" + (node.$text()) + "\"></i><b>(" + (node.$text()) + ")</b>"
        } else if ((($a = node.$document()['$attr?']("icons")) !== nil && (!$a._isBoolean || $a == true))) {
          src = node.$icon_uri("callouts/" + (node.$text()));
          return "<img src=\"" + (src) + "\" alt=\"" + (node.$text()) + "\"" + (self.void_element_slash) + ">";
          } else {
          return "<b>(" + (node.$text()) + ")</b>"
        };
      };

      def.$inline_footnote = function(node) {
        var $a, self = this, index = nil, id_attr = nil;

        if ((($a = (index = node.$attr("index"))) !== nil && (!$a._isBoolean || $a == true))) {
          if (node.$type()['$==']("xref")) {
            return "<span class=\"footnoteref\">[<a class=\"footnote\" href=\"#_footnote_" + (index) + "\" title=\"View footnote.\">" + (index) + "</a>]</span>"
            } else {
            id_attr = (function() {if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
              return " id=\"_footnote_" + (node.$id()) + "\""
              } else {
              return nil
            }; return nil; })();
            return "<span class=\"footnote\"" + (id_attr) + ">[<a id=\"_footnoteref_" + (index) + "\" class=\"footnote\" href=\"#_footnote_" + (index) + "\" title=\"View footnote.\">" + (index) + "</a>]</span>";
          }
        } else if (node.$type()['$==']("xref")) {
          return "<span class=\"footnoteref red\" title=\"Unresolved footnote reference.\">[" + (node.$text()) + "]</span>"
          } else {
          return nil
        };
      };

      def.$inline_image = function(node) {
        var $a, $b, TMP_22, self = this, type = nil, style_class = nil, title_attribute = nil, img = nil, resolved_target = nil, attrs = nil, window_attr = nil, style_classes = nil, role = nil, style_attr = nil;

        if ((($a = (($b = ((type = node.$type()))['$==']("icon")) ? (node.$document()['$attr?']("icons", "font")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          style_class = "icon-" + (node.$target());
          if ((($a = node['$attr?']("size")) !== nil && (!$a._isBoolean || $a == true))) {
            style_class = "" + (style_class) + " icon-" + (node.$attr("size"))};
          if ((($a = node['$attr?']("rotate")) !== nil && (!$a._isBoolean || $a == true))) {
            style_class = "" + (style_class) + " icon-rotate-" + (node.$attr("rotate"))};
          if ((($a = node['$attr?']("flip")) !== nil && (!$a._isBoolean || $a == true))) {
            style_class = "" + (style_class) + " icon-flip-" + (node.$attr("flip"))};
          title_attribute = (function() {if ((($a = (node['$attr?']("title"))) !== nil && (!$a._isBoolean || $a == true))) {
            return " title=\"" + (node.$attr("title")) + "\""
            } else {
            return nil
          }; return nil; })();
          img = "<i class=\"" + (style_class) + "\"" + (title_attribute) + "></i>";
        } else if ((($a = (($b = type['$==']("icon")) ? (node.$document()['$attr?']("icons"))['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          img = "[" + (node.$attr("alt")) + "]"
          } else {
          resolved_target = (function() {if ((($a = (type['$==']("icon"))) !== nil && (!$a._isBoolean || $a == true))) {
            return (node.$icon_uri(node.$target()))
            } else {
            return (node.$image_uri(node.$target()))
          }; return nil; })();
          attrs = ($a = ($b = ["alt", "width", "height", "title"]).$map, $a._p = (TMP_22 = function(name){var self = TMP_22._s || this, $a;
if (name == null) name = nil;
          if ((($a = (node['$attr?'](name))) !== nil && (!$a._isBoolean || $a == true))) {
              return " " + (name) + "=\"" + (node.$attr(name)) + "\""
              } else {
              return nil
            }}, TMP_22._s = self, TMP_22), $a).call($b).$join();
          img = "<img src=\"" + (resolved_target) + "\"" + (attrs) + (self.void_element_slash) + ">";
        };
        if ((($a = node['$attr?']("link")) !== nil && (!$a._isBoolean || $a == true))) {
          window_attr = (function() {if ((($a = (node['$attr?']("window"))) !== nil && (!$a._isBoolean || $a == true))) {
            return " target=\"" + (node.$attr("window")) + "\""
            } else {
            return nil
          }; return nil; })();
          img = "<a class=\"image\" href=\"" + (node.$attr("link")) + "\"" + (window_attr) + ">" + (img) + "</a>";};
        style_classes = (function() {if ((($a = (role = node.$role())) !== nil && (!$a._isBoolean || $a == true))) {
          return "" + (type) + " " + (role)
          } else {
          return type
        }; return nil; })();
        style_attr = (function() {if ((($a = (node['$attr?']("float"))) !== nil && (!$a._isBoolean || $a == true))) {
          return " style=\"float: " + (node.$attr("float")) + "\""
          } else {
          return nil
        }; return nil; })();
        return "<span class=\"" + (style_classes) + "\"" + (style_attr) + ">" + (img) + "</span>";
      };

      def.$inline_indexterm = function(node) {
        var self = this;

        if (node.$type()['$==']("visible")) {
          return node.$text()
          } else {
          return ""
        };
      };

      def.$inline_kbd = function(node) {
        var $a, $b, TMP_23, self = this, keys = nil, key_combo = nil;

        if (((keys = node.$attr("keys"))).$size()['$=='](1)) {
          return "<kbd>" + (keys['$[]'](0)) + "</kbd>"
          } else {
          key_combo = ($a = ($b = keys).$map, $a._p = (TMP_23 = function(key){var self = TMP_23._s || this;
if (key == null) key = nil;
          return "<kbd>" + (key) + "</kbd>+"}, TMP_23._s = self, TMP_23), $a).call($b).$join().$chop();
          return "<span class=\"keyseq\">" + (key_combo) + "</span>";
        };
      };

      def.$inline_menu = function(node) {
        var $a, $b, TMP_24, self = this, menu = nil, submenus = nil, submenu_path = nil, menuitem = nil;

        menu = node.$attr("menu");
        if ((($a = ((submenus = node.$attr("submenus")))['$empty?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          submenu_path = ($a = ($b = submenus).$map, $a._p = (TMP_24 = function(submenu){var self = TMP_24._s || this;
if (submenu == null) submenu = nil;
          return "<span class=\"submenu\">" + (submenu) + "</span>&#160;&#9656; "}, TMP_24._s = self, TMP_24), $a).call($b).$join().$chop();
          return "<span class=\"menuseq\"><span class=\"menu\">" + (menu) + "</span>&#160;&#9656; " + (submenu_path) + " <span class=\"menuitem\">" + (node.$attr("menuitem")) + "</span></span>";
        } else if ((($a = (menuitem = node.$attr("menuitem"))) !== nil && (!$a._isBoolean || $a == true))) {
          return "<span class=\"menuseq\"><span class=\"menu\">" + (menu) + "</span>&#160;&#9656; <span class=\"menuitem\">" + (menuitem) + "</span></span>"
          } else {
          return "<span class=\"menu\">" + (menu) + "</span>"
        };
      };

      def.$inline_quoted = function(node) {
        var $a, self = this, open = nil, close = nil, is_tag = nil, quoted_text = nil, role = nil;

        $a = $opal.to_ary($scope.QUOTE_TAGS['$[]'](node.$type())), open = ($a[0] == null ? nil : $a[0]), close = ($a[1] == null ? nil : $a[1]), is_tag = ($a[2] == null ? nil : $a[2]);
        quoted_text = (function() {if ((($a = (role = node.$role())) !== nil && (!$a._isBoolean || $a == true))) {
          if (is_tag !== false && is_tag !== nil) {
            return "" + (open.$chop()) + " class=\"" + (role) + "\">" + (node.$text()) + (close)
            } else {
            return "<span class=\"" + (role) + "\">" + (open) + (node.$text()) + (close) + "</span>"
          }
          } else {
          return "" + (open) + (node.$text()) + (close)
        }; return nil; })();
        if ((($a = node.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          return "<a id=\"" + (node.$id()) + "\"></a>" + (quoted_text)
          } else {
          return quoted_text
        };
      };

      return (def.$append_boolean_attribute = function(name, xml) {
        var self = this;

        if (xml !== false && xml !== nil) {
          return " " + (name) + "=\"" + (name) + "\""
          } else {
          return " " + (name)
        };
      }, nil) && 'append_boolean_attribute';
    })($scope.Converter, ($scope.Converter)._scope.BuiltIn)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Document(){};
      var self = $Document = $klass($base, $super, 'Document', $Document);

      var def = self._proto, $scope = self._scope, $a, TMP_1, TMP_9, TMP_15;

      def.attributes = def.safe = def.reader = def.callouts = def.base_dir = def.parsed = def.parent_document = def.extensions = def.options = def.counters = def.references = def.doctype = def.backend = def.header = def.blocks = def.attributes_modified = def.id = def.original_attributes = def.attribute_overrides = def.converter = nil;
      $opal.cdecl($scope, 'Footnote', (($a = $opal.Object._scope.Struct) == null ? $opal.cm('Struct') : $a).$new("index", "id", "text"));

      (function($base, $super) {
        function $AttributeEntry(){};
        var self = $AttributeEntry = $klass($base, $super, 'AttributeEntry', $AttributeEntry);

        var def = self._proto, $scope = self._scope;

        self.$attr_reader("name", "value", "negate");

        def.$initialize = function(name, value, negate) {
          var $a, self = this;

          if (negate == null) {
            negate = nil
          }
          self.name = name;
          self.value = value;
          return self.negate = (function() {if ((($a = negate['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return value['$nil?']()
            } else {
            return negate
          }; return nil; })();
        };

        return (def.$save_to = function(block_attributes) {
          var $a, $b, $c, self = this;

          return (($a = "attribute_entries", $b = block_attributes, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, []))))['$<<'](self);
        }, nil) && 'save_to';
      })(self, null);

      self.$attr_reader("safe");

      self.$attr_reader("references");

      self.$attr_reader("counters");

      self.$attr_reader("callouts");

      self.$attr_reader("header");

      self.$attr_reader("base_dir");

      self.$attr_reader("parent_document");

      self.$attr_reader("reader");

      self.$attr_reader("converter");

      self.$attr_reader("extensions");

      def.$initialize = TMP_1 = function(data, options) {
        var $a, $b, $c, TMP_2, TMP_3, $e, $f, TMP_4, $g, TMP_5, $h, $i, self = this, $iter = TMP_1._p, $yield = $iter || nil, parent_doc = nil, attr_overrides = nil, initialize_extensions = nil, safe_mode = nil, header_footer = nil, attrs = nil, safe_mode_name = nil, backend_val = nil, doctype_val = nil, now = nil, localdate = nil, localtime = nil, registry = nil, ext_registry = nil, ext_block = nil;

        if (data == null) {
          data = nil
        }
        if (options == null) {
          options = $hash2([], {})
        }
        TMP_1._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_1, null).apply(self, [self, "document"]);
        if ((($a = (parent_doc = options.$delete("parent"))) !== nil && (!$a._isBoolean || $a == true))) {
          self.parent_document = parent_doc;
          ($a = "base_dir", $b = options, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, parent_doc.$base_dir())));
          self.references = ($a = ($b = parent_doc.$references()).$inject, $a._p = (TMP_2 = function(accum, $d){var self = TMP_2._s || this;
if (accum == null) accum = nil;key = $d[0];ref = $d[1];
          if (key['$==']("footnotes")) {
              accum['$[]=']("footnotes", [])
              } else {
              accum['$[]='](key, ref)
            };
            return accum;}, TMP_2._s = self, TMP_2), $a).call($b, $hash2([], {}));
          attr_overrides = parent_doc.$attributes().$dup();
          attr_overrides.$delete("doctype");
          self.attribute_overrides = attr_overrides;
          self.safe = parent_doc.$safe();
          self.converter = parent_doc.$converter();
          initialize_extensions = false;
          self.extensions = parent_doc.$extensions();
          } else {
          self.parent_document = nil;
          self.references = $hash2(["ids", "footnotes", "links", "images", "indexterms", "includes"], {"ids": $hash2([], {}), "footnotes": [], "links": [], "images": [], "indexterms": [], "includes": (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new()});
          attr_overrides = $hash2([], {});
          ($a = ($c = (((($e = options['$[]']("attributes")) !== false && $e !== nil) ? $e : $hash2([], {})))).$each, $a._p = (TMP_3 = function(key, value){var self = TMP_3._s || this, $a;
if (key == null) key = nil;if (value == null) value = nil;
          if ((($a = key['$start_with?']("!")) !== nil && (!$a._isBoolean || $a == true))) {
              key = key['$[]']($range(1, -1, false));
              value = nil;
            } else if ((($a = key['$end_with?']("!")) !== nil && (!$a._isBoolean || $a == true))) {
              key = key.$chop();
              value = nil;};
            return attr_overrides['$[]='](key.$downcase(), value);}, TMP_3._s = self, TMP_3), $a).call($c);
          self.attribute_overrides = attr_overrides;
          self.safe = nil;
          self.converter = nil;
          initialize_extensions = (function(){ try { return ((((($a = $opal.Object._scope.Asciidoctor) == null ? $opal.cm('Asciidoctor') : $a))._scope.Extensions) != null ? 'constant' : nil); } catch (err) { if (err._klass === Opal.NameError) { return nil; } else { throw(err); }}; })();
          self.extensions = nil;
        };
        self.parsed = false;
        self.header = nil;
        self.counters = $hash2([], {});
        self.callouts = $scope.Callouts.$new();
        self.attributes_modified = (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new();
        self.options = options;
        if (parent_doc !== false && parent_doc !== nil) {
        } else if ((($a = ((safe_mode = options['$[]']("safe")))['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.safe = ($scope.SafeMode)._scope.SECURE
        } else if ((($a = safe_mode['$is_a?']((($e = $opal.Object._scope.Fixnum) == null ? $opal.cm('Fixnum') : $e))) !== nil && (!$a._isBoolean || $a == true))) {
          self.safe = safe_mode
          } else {
          self.safe = (function() {try {return $scope.SafeMode.$const_get(safe_mode.$to_s().$upcase()).$to_i() } catch ($err) { return ($scope.SafeMode)._scope.SECURE.$to_i() }})()
        };
        header_footer = (($a = "header_footer", $e = options, ((($f = $e['$[]']($a)) !== false && $f !== nil) ? $f : $e['$[]=']($a, false))));
        attrs = self.attributes;
        attrs['$[]=']("encoding", "UTF-8");
        attrs['$[]=']("sectids", "");
        if (header_footer !== false && header_footer !== nil) {
          } else {
          attrs['$[]=']("notitle", "")
        };
        attrs['$[]=']("toc-placement", "auto");
        attrs['$[]=']("stylesheet", "");
        if (header_footer !== false && header_footer !== nil) {
          attrs['$[]=']("copycss", "")};
        attrs['$[]=']("prewrap", "");
        attrs['$[]=']("attribute-undefined", $scope.Compliance.$attribute_undefined());
        attrs['$[]=']("attribute-missing", $scope.Compliance.$attribute_missing());
        attrs['$[]=']("caution-caption", "Caution");
        attrs['$[]=']("important-caption", "Important");
        attrs['$[]=']("note-caption", "Note");
        attrs['$[]=']("tip-caption", "Tip");
        attrs['$[]=']("warning-caption", "Warning");
        attrs['$[]=']("appendix-caption", "Appendix");
        attrs['$[]=']("example-caption", "Example");
        attrs['$[]=']("figure-caption", "Figure");
        attrs['$[]=']("table-caption", "Table");
        attrs['$[]=']("toc-title", "Table of Contents");
        attrs['$[]=']("manname-title", "NAME");
        attrs['$[]=']("untitled-label", "Untitled");
        attrs['$[]=']("version-label", "Version");
        attrs['$[]=']("last-update-label", "Last updated");
        attr_overrides['$[]=']("asciidoctor", "");
        attr_overrides['$[]=']("asciidoctor-version", $scope.VERSION);
        safe_mode_name = ($a = ($e = $scope.SafeMode.$constants()).$detect, $a._p = (TMP_4 = function(l){var self = TMP_4._s || this;
          if (self.safe == null) self.safe = nil;
if (l == null) l = nil;
        return $scope.SafeMode.$const_get(l)['$=='](self.safe)}, TMP_4._s = self, TMP_4), $a).call($e).$to_s().$downcase();
        attr_overrides['$[]=']("safe-mode-name", safe_mode_name);
        attr_overrides['$[]=']("safe-mode-" + (safe_mode_name), "");
        attr_overrides['$[]=']("safe-mode-level", self.safe);
        attr_overrides['$[]=']("embedded", (function() {if (header_footer !== false && header_footer !== nil) {
          return nil
          } else {
          return ""
        }; return nil; })());
        ($a = "max-include-depth", $f = attr_overrides, ((($g = $f['$[]']($a)) !== false && $g !== nil) ? $g : $f['$[]=']($a, 64)));
        if ((($a = attr_overrides['$[]']("allow-uri-read")['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          attr_overrides['$[]=']("allow-uri-read", nil)
        };
        attr_overrides['$[]=']("user-home", $scope.USER_HOME);
        if ((($a = options['$[]']("base_dir")) !== nil && (!$a._isBoolean || $a == true))) {
          self.base_dir = attr_overrides['$[]=']("docdir", (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path(options['$[]']("base_dir")))
        } else if ((($a = attr_overrides['$[]']("docdir")) !== nil && (!$a._isBoolean || $a == true))) {
          self.base_dir = attr_overrides['$[]=']("docdir", (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path(attr_overrides['$[]']("docdir")))
          } else {
          self.base_dir = attr_overrides['$[]=']("docdir", (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path((($a = $opal.Object._scope.Dir) == null ? $opal.cm('Dir') : $a).$pwd()))
        };
        if ((($a = (backend_val = options['$[]']("backend"))) !== nil && (!$a._isBoolean || $a == true))) {
          attr_overrides['$[]=']("backend", "" + (backend_val))};
        if ((($a = (doctype_val = options['$[]']("doctype"))) !== nil && (!$a._isBoolean || $a == true))) {
          attr_overrides['$[]=']("doctype", "" + (doctype_val))};
        if (self.safe['$>='](($scope.SafeMode)._scope.SERVER)) {
          ($a = "copycss", $f = attr_overrides, ((($g = $f['$[]']($a)) !== false && $g !== nil) ? $g : $f['$[]=']($a, nil)));
          ($a = "source-highlighter", $f = attr_overrides, ((($g = $f['$[]']($a)) !== false && $g !== nil) ? $g : $f['$[]=']($a, nil)));
          ($a = "backend", $f = attr_overrides, ((($g = $f['$[]']($a)) !== false && $g !== nil) ? $g : $f['$[]=']($a, $scope.DEFAULT_BACKEND)));
          if ((($a = ($f = parent_doc['$!'](), $f !== false && $f !== nil ?attr_overrides['$key?']("docfile") : $f)) !== nil && (!$a._isBoolean || $a == true))) {
            attr_overrides['$[]=']("docfile", attr_overrides['$[]']("docfile")['$[]']($range((attr_overrides['$[]']("docdir").$length()['$+'](1)), -1, false)))};
          attr_overrides['$[]=']("docdir", "");
          attr_overrides['$[]=']("user-home", ".");
          if (self.safe['$>='](($scope.SafeMode)._scope.SECURE)) {
            if ((($a = attr_overrides.$fetch("linkcss", "")['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              attr_overrides['$[]=']("linkcss", "")
            };
            ($a = "icons", $f = attr_overrides, ((($g = $f['$[]']($a)) !== false && $g !== nil) ? $g : $f['$[]=']($a, nil)));};};
        ($a = ($f = attr_overrides).$delete_if, $a._p = (TMP_5 = function(key, val){var self = TMP_5._s || this, $a, $b, $c, verdict = nil;
if (key == null) key = nil;if (val == null) val = nil;
        verdict = false;
          if ((($a = val['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
            attrs.$delete(key)
            } else {
            if ((($a = ($b = (val['$is_a?']((($c = $opal.Object._scope.String) == null ? $opal.cm('String') : $c))), $b !== false && $b !== nil ?(val['$end_with?']("@")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              val = val.$chop();
              verdict = true;};
            attrs['$[]='](key, val);
          };
          return verdict;}, TMP_5._s = self, TMP_5), $a).call($f);
        if (parent_doc !== false && parent_doc !== nil) {
          self.reader = $scope.Reader.$new(data, options['$[]']("cursor"));
          $scope.Parser.$parse(self.reader, self);
          self.callouts.$rewind();
          return self.parsed = true;
          } else {
          ($a = "backend", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, $scope.DEFAULT_BACKEND)));
          ($a = "doctype", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, $scope.DEFAULT_DOCTYPE)));
          self.$update_backend_attributes(attrs['$[]']("backend"), true);
          now = (($a = $opal.Object._scope.Time) == null ? $opal.cm('Time') : $a).$now();
          localdate = (($a = "localdate", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, now.$strftime("%Y-%m-%d")))));
          localtime = (($a = "localtime", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, ((function() {try {return now.$strftime("%H:%M:%S %Z") } catch ($err) { return now.$strftime("%H:%M:%S") }})())))));
          ($a = "localdatetime", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, "" + (localdate) + " " + (localtime))));
          ($a = "docdate", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, localdate)));
          ($a = "doctime", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, localtime)));
          ($a = "docdatetime", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, "" + (localdate) + " " + (localtime))));
          ($a = "stylesdir", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, ".")));
          ($a = "iconsdir", $g = attrs, ((($h = $g['$[]']($a)) !== false && $h !== nil) ? $h : $g['$[]=']($a, (($i = $opal.Object._scope.File) == null ? $opal.cm('File') : $i).$join(attrs.$fetch("imagesdir", "./images"), "icons"))));
          self.extensions = (function() {if (initialize_extensions !== false && initialize_extensions !== nil) {
            registry = (function() {if ((($a = (ext_registry = options['$[]']("extensions_registry"))) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = ((($g = (ext_registry['$is_a?'](($scope.Extensions)._scope.Registry))) !== false && $g !== nil) ? $g : (($h = (($i = $opal.Object._scope.RUBY_ENGINE_JRUBY) == null ? $opal.cm('RUBY_ENGINE_JRUBY') : $i), $h !== false && $h !== nil ?(ext_registry['$is_a?']((((($i = $opal.Object._scope.AsciidoctorJ) == null ? $opal.cm('AsciidoctorJ') : $i))._scope.Extensions)._scope.ExtensionRegistry)) : $h)))) !== nil && (!$a._isBoolean || $a == true))) {
                return ext_registry
                } else {
                return nil
              }
            } else if ((($a = ((ext_block = options['$[]']("extensions")))['$is_a?']((($g = $opal.Object._scope.Proc) == null ? $opal.cm('Proc') : $g))) !== nil && (!$a._isBoolean || $a == true))) {
              return ($a = ($g = $scope.Extensions).$build_registry, $a._p = ext_block.$to_proc(), $a).call($g)
              } else {
              return nil
            }; return nil; })();
            return (((($a = registry) !== false && $a !== nil) ? $a : registry = ($scope.Extensions)._scope.Registry.$new())).$activate(self);
            } else {
            return nil
          }; return nil; })();
          self.reader = $scope.PreprocessorReader.$new(self, data, ($scope.Reader)._scope.Cursor.$new(attrs['$[]']("docfile"), self.base_dir));
          if ((($a = (($h = data !== false && data !== nil) ? options['$[]']("parse") : $h)) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$parse()
            } else {
            return nil
          };
        };
      };

      def.$parse = function(data) {
        var $a, $b, $c, TMP_6, TMP_7, self = this, exts = nil;

        if (data == null) {
          data = nil
        }
        if ((($a = self.parsed) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          if (data !== false && data !== nil) {
            self.reader = $scope.PreprocessorReader.$new(self, data, ($scope.Reader)._scope.Cursor.$new(self.attributes['$[]']("docfile"), self.base_dir))};
          if ((($a = ($b = (exts = (function() {if ((($c = self.parent_document) !== nil && (!$c._isBoolean || $c == true))) {
            return nil
            } else {
            return self.extensions
          }; return nil; })()), $b !== false && $b !== nil ?exts['$preprocessors?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            ($a = ($b = exts.$preprocessors()).$each, $a._p = (TMP_6 = function(ext){var self = TMP_6._s || this, $a;
              if (self.reader == null) self.reader = nil;
if (ext == null) ext = nil;
            return self.reader = ((($a = ext.$process_method()['$[]'](self, self.reader)) !== false && $a !== nil) ? $a : self.reader)}, TMP_6._s = self, TMP_6), $a).call($b)};
          $scope.Parser.$parse(self.reader, self, $hash2(["header_only"], {"header_only": self.options['$[]']("parse_header_only")['$!']()['$!']()}));
          self.callouts.$rewind();
          if ((($a = (($c = exts !== false && exts !== nil) ? exts['$treeprocessors?']() : $c)) !== nil && (!$a._isBoolean || $a == true))) {
            ($a = ($c = exts.$treeprocessors()).$each, $a._p = (TMP_7 = function(ext){var self = TMP_7._s || this;
if (ext == null) ext = nil;
            return ext.$process_method()['$[]'](self)}, TMP_7._s = self, TMP_7), $a).call($c)};
          self.parsed = true;
        };
        return self;
      };

      def.$counter = function(name, seed) {
        var $a, $b, self = this, attr_is_seed = nil, attr_val = nil;

        if (seed == null) {
          seed = nil
        }
        if ((($a = ($b = (attr_is_seed = ((attr_val = self.attributes['$[]'](name)))['$nil_or_empty?']()['$!']()), $b !== false && $b !== nil ?self.counters['$key?'](name) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          self.counters['$[]='](name, self.$nextval(attr_val))
          } else {
          if ((($a = seed['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
            seed = self.$nextval((function() {if (attr_is_seed !== false && attr_is_seed !== nil) {
              return attr_val
              } else {
              return 0
            }; return nil; })())
          } else if (seed.$to_i().$to_s()['$=='](seed)) {
            seed = seed.$to_i()};
          self.counters['$[]='](name, seed);
        };
        return (self.attributes['$[]='](name, self.counters['$[]'](name)));
      };

      def.$counter_increment = function(counter_name, block) {
        var self = this, val = nil;

        val = self.$counter(counter_name);
        $scope.AttributeEntry.$new(counter_name, val).$save_to(block.$attributes());
        return val;
      };

      def.$nextval = function(current) {
        var $a, $b, self = this, intval = nil;

        if ((($a = current['$is_a?']((($b = $opal.Object._scope.Integer) == null ? $opal.cm('Integer') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          return current['$+'](1)
          } else {
          intval = current.$to_i();
          if ((($a = intval.$to_s()['$=='](current.$to_s())['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            return (current['$[]'](0).$ord()['$+'](1)).$chr()
            } else {
            return intval['$+'](1)
          };
        };
      };

      def.$register = function(type, value) {
        var $a, $b, self = this, $case = nil;

        return (function() {$case = type;if ("ids"['$===']($case)) {if ((($a = value['$is_a?']((($b = $opal.Object._scope.Array) == null ? $opal.cm('Array') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          return self.references['$[]']("ids")['$[]='](value['$[]'](0), (((($a = value['$[]'](1)) !== false && $a !== nil) ? $a : "["['$+'](value['$[]'](0))['$+']("]"))))
          } else {
          return self.references['$[]']("ids")['$[]='](value, "["['$+'](value)['$+']("]"))
        }}else if ("footnotes"['$===']($case) || "indexterms"['$===']($case)) {return self.references['$[]'](type)['$<<'](value)}else {if ((($a = self.options['$[]']("catalog_assets")) !== nil && (!$a._isBoolean || $a == true))) {
          return self.references['$[]'](type)['$<<'](value)
          } else {
          return nil
        }}})();
      };

      def['$footnotes?'] = function() {
        var self = this;

        return self.references['$[]']("footnotes")['$empty?']()['$!']();
      };

      def.$footnotes = function() {
        var self = this;

        return self.references['$[]']("footnotes");
      };

      def['$nested?'] = function() {
        var self = this;

        return self.parent_document['$!']()['$!']();
      };

      def['$embedded?'] = function() {
        var self = this;

        return self.attributes['$key?']("embedded");
      };

      def['$extensions?'] = function() {
        var self = this;

        return self.extensions['$!']()['$!']();
      };

      def.$source = function() {
        var $a, self = this;

        if ((($a = self.reader) !== nil && (!$a._isBoolean || $a == true))) {
          return self.reader.$source()
          } else {
          return nil
        };
      };

      def.$source_lines = function() {
        var $a, self = this;

        if ((($a = self.reader) !== nil && (!$a._isBoolean || $a == true))) {
          return self.reader.$source_lines()
          } else {
          return nil
        };
      };

      def.$doctype = function() {
        var $a, self = this;

        return ((($a = self.doctype) !== false && $a !== nil) ? $a : self.doctype = self.attributes['$[]']("doctype"));
      };

      def.$backend = function() {
        var $a, self = this;

        return ((($a = self.backend) !== false && $a !== nil) ? $a : self.backend = self.attributes['$[]']("backend"));
      };

      def['$basebackend?'] = function(base) {
        var self = this;

        return self.attributes['$[]']("basebackend")['$=='](base);
      };

      def.$title = function() {
        var self = this;

        return self.attributes['$[]']("title");
      };

      def['$title='] = function(title) {
        var $a, self = this;

        ((($a = self.header) !== false && $a !== nil) ? $a : self.header = $scope.Section.$new(self, 0));
        return self.header['$title='](title);
      };

      def.$doctitle = function(opts) {
        var $a, $b, self = this, val = nil, sect = nil;

        if (opts == null) {
          opts = $hash2([], {})
        }
        if ((($a = ((val = self.attributes.$fetch("title", "")))['$empty?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          val = self.$title()
        } else if ((($a = ($b = (sect = self.$first_section()), $b !== false && $b !== nil ?sect['$title?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          val = sect.$title()
          } else {
          return nil
        };
        if ((($a = ($b = opts['$[]']("sanitize"), $b !== false && $b !== nil ?val['$include?']("<") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return val.$gsub($scope.XmlSanitizeRx, "").$tr_s(" ", " ").$strip()
          } else {
          return val
        };
      };

      $opal.defn(self, '$name', def.$doctitle);

      def.$author = function() {
        var self = this;

        return self.attributes['$[]']("author");
      };

      def.$revdate = function() {
        var self = this;

        return self.attributes['$[]']("revdate");
      };

      def.$notitle = function() {
        var $a, self = this;

        return ($a = self.attributes['$key?']("showtitle")['$!'](), $a !== false && $a !== nil ?self.attributes['$key?']("notitle") : $a);
      };

      def.$noheader = function() {
        var self = this;

        return self.attributes['$key?']("noheader");
      };

      def.$nofooter = function() {
        var self = this;

        return self.attributes['$key?']("nofooter");
      };

      def.$first_section = function() {
        var $a, $b, TMP_8, $c, self = this;

        if ((($a = self['$has_header?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return self.header
          } else {
          return ($a = ($b = (((($c = self.blocks) !== false && $c !== nil) ? $c : []))).$detect, $a._p = (TMP_8 = function(e){var self = TMP_8._s || this;
if (e == null) e = nil;
          return e.$context()['$==']("section")}, TMP_8._s = self, TMP_8), $a).call($b)
        };
      };

      def['$has_header?'] = function() {
        var $a, self = this;

        if ((($a = self.header) !== nil && (!$a._isBoolean || $a == true))) {
          return true
          } else {
          return false
        };
      };

      $opal.defn(self, '$header?', def['$has_header?']);

      def['$<<'] = TMP_9 = function(block) {var $zuper = $slice.call(arguments, 0);
        var self = this, $iter = TMP_9._p, $yield = $iter || nil;

        TMP_9._p = null;
        $opal.find_super_dispatcher(self, '<<', TMP_9, $iter).apply(self, $zuper);
        if (block.$context()['$==']("section")) {
          return self.$assign_index(block)
          } else {
          return nil
        };
      };

      def.$finalize_header = function(unrooted_attributes, header_valid) {
        var self = this;

        if (header_valid == null) {
          header_valid = true
        }
        self.$clear_playback_attributes(unrooted_attributes);
        self.$save_attributes();
        if (header_valid !== false && header_valid !== nil) {
          } else {
          unrooted_attributes['$[]=']("invalid-header", true)
        };
        return unrooted_attributes;
      };

      def.$save_attributes = function() {
        var $a, $b, $c, $d, TMP_10, TMP_11, self = this, val = nil, toc_val = nil, toc2_val = nil, toc_position_val = nil, default_toc_position = nil, default_toc_class = nil, position = nil, $case = nil;

        if (self.attributes['$[]']("basebackend")['$==']("docbook")) {
          if ((($a = ((($b = self['$attribute_locked?']("toc")) !== false && $b !== nil) ? $b : self.attributes_modified['$include?']("toc"))) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.attributes['$[]=']("toc", "")
          };
          if ((($a = ((($b = self['$attribute_locked?']("numbered")) !== false && $b !== nil) ? $b : self.attributes_modified['$include?']("numbered"))) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.attributes['$[]=']("numbered", "")
          };};
        if ((($a = ((($b = self.attributes['$key?']("doctitle")) !== false && $b !== nil) ? $b : ((val = self.$doctitle()))['$!']())) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          self.attributes['$[]=']("doctitle", val)
        };
        if ((($a = self.id) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          self.id = self.attributes['$[]']("css-signature")
        };
        toc_val = self.attributes['$[]']("toc");
        toc2_val = self.attributes['$[]']("toc2");
        toc_position_val = self.attributes['$[]']("toc-position");
        if ((($a = ((($b = ((($c = toc_val !== false && toc_val !== nil) ? (((($d = toc_val['$==']("")['$!']()) !== false && $d !== nil) ? $d : toc_position_val['$nil_or_empty?']()['$!']())) : $c))) !== false && $b !== nil) ? $b : toc2_val)) !== nil && (!$a._isBoolean || $a == true))) {
          default_toc_position = "left";
          default_toc_class = "toc2";
          position = ($a = ($b = [toc_position_val, toc2_val, toc_val]).$find, $a._p = (TMP_10 = function(pos){var self = TMP_10._s || this;
if (pos == null) pos = nil;
          return pos['$nil_or_empty?']()['$!']()}, TMP_10._s = self, TMP_10), $a).call($b);
          if ((($a = ($c = position['$!'](), $c !== false && $c !== nil ?toc2_val : $c)) !== nil && (!$a._isBoolean || $a == true))) {
            position = default_toc_position};
          self.attributes['$[]=']("toc", "");
          $case = position;if ("left"['$===']($case) || "<"['$===']($case) || "&lt;"['$===']($case)) {self.attributes['$[]=']("toc-position", "left")}else if ("right"['$===']($case) || ">"['$===']($case) || "&gt;"['$===']($case)) {self.attributes['$[]=']("toc-position", "right")}else if ("top"['$===']($case) || "^"['$===']($case)) {self.attributes['$[]=']("toc-position", "top")}else if ("bottom"['$===']($case) || "v"['$===']($case)) {self.attributes['$[]=']("toc-position", "bottom")}else if ("preamble"['$===']($case)) {self.attributes.$delete("toc2");
          self.attributes['$[]=']("toc-placement", "preamble");
          default_toc_class = nil;
          default_toc_position = nil;}else if ("default"['$===']($case)) {self.attributes.$delete("toc2");
          default_toc_class = nil;
          default_toc_position = "default";};
          if (default_toc_class !== false && default_toc_class !== nil) {
            ($a = "toc-class", $c = self.attributes, ((($d = $c['$[]']($a)) !== false && $d !== nil) ? $d : $c['$[]=']($a, default_toc_class)))};
          if (default_toc_position !== false && default_toc_position !== nil) {
            ($a = "toc-position", $c = self.attributes, ((($d = $c['$[]']($a)) !== false && $d !== nil) ? $d : $c['$[]=']($a, default_toc_position)))};};
        self.original_attributes = self.attributes.$dup();
        if ((($a = self['$nested?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return ($a = ($c = $scope.FLEXIBLE_ATTRIBUTES).$each, $a._p = (TMP_11 = function(name){var self = TMP_11._s || this, $a, $b;
            if (self.attribute_overrides == null) self.attribute_overrides = nil;
if (name == null) name = nil;
          if ((($a = ($b = self.attribute_overrides['$key?'](name), $b !== false && $b !== nil ?self.attribute_overrides['$[]'](name)['$nil?']()['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              return self.attribute_overrides.$delete(name)
              } else {
              return nil
            }}, TMP_11._s = self, TMP_11), $a).call($c)
        };
      };

      def.$restore_attributes = function() {
        var self = this;

        return self.attributes = self.original_attributes;
      };

      def.$clear_playback_attributes = function(attributes) {
        var self = this;

        return attributes.$delete("attribute_entries");
      };

      def.$playback_attributes = function(block_attributes) {
        var $a, $b, TMP_12, self = this;

        if ((($a = block_attributes['$key?']("attribute_entries")) !== nil && (!$a._isBoolean || $a == true))) {
          return ($a = ($b = block_attributes['$[]']("attribute_entries")).$each, $a._p = (TMP_12 = function(entry){var self = TMP_12._s || this, $a;
            if (self.attributes == null) self.attributes = nil;
if (entry == null) entry = nil;
          if ((($a = entry.$negate()) !== nil && (!$a._isBoolean || $a == true))) {
              return self.attributes.$delete(entry.$name())
              } else {
              return self.attributes['$[]='](entry.$name(), entry.$value())
            }}, TMP_12._s = self, TMP_12), $a).call($b)
          } else {
          return nil
        };
      };

      def.$set_attribute = function(name, value) {
        var $a, self = this, $case = nil;

        if ((($a = self['$attribute_locked?'](name)) !== nil && (!$a._isBoolean || $a == true))) {
          return false
          } else {
          $case = name;if ("backend"['$===']($case)) {self.$update_backend_attributes(self.$apply_attribute_value_subs(value))}else if ("doctype"['$===']($case)) {self.$update_doctype_attributes(self.$apply_attribute_value_subs(value))}else {self.attributes['$[]='](name, self.$apply_attribute_value_subs(value))};
          self.attributes_modified['$<<'](name);
          return true;
        };
      };

      def.$delete_attribute = function(name) {
        var $a, self = this;

        if ((($a = self['$attribute_locked?'](name)) !== nil && (!$a._isBoolean || $a == true))) {
          return false
          } else {
          self.attributes.$delete(name);
          self.attributes_modified['$<<'](name);
          return true;
        };
      };

      def['$attribute_locked?'] = function(name) {
        var self = this;

        return self.attribute_overrides['$key?'](name);
      };

      def.$apply_attribute_value_subs = function(value) {
        var $a, self = this, m = nil, subs = nil;

        if ((($a = (m = $scope.AttributeEntryPassMacroRx.$match(value))) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = m['$[]'](1)['$empty?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            subs = self.$resolve_pass_subs(m['$[]'](1));
            if ((($a = subs['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](2)
              } else {
              return (self.$apply_subs(m['$[]'](2), subs))
            };
            } else {
            return m['$[]'](2)
          }
          } else {
          return self.$apply_header_subs(value)
        };
      };

      def.$update_backend_attributes = function(new_backend, force) {
        var $a, $b, $c, self = this, attrs = nil, current_backend = nil, current_basebackend = nil, current_doctype = nil, resolved_name = nil, new_basebackend = nil, new_filetype = nil, new_outfilesuffix = nil, current_filetype = nil, page_width = nil;

        if (force == null) {
          force = false
        }
        if ((($a = ((($b = force) !== false && $b !== nil) ? $b : ((($c = new_backend !== false && new_backend !== nil) ? new_backend['$=='](self.attributes['$[]']("backend"))['$!']() : $c)))) !== nil && (!$a._isBoolean || $a == true))) {
          attrs = self.attributes;
          current_backend = attrs['$[]']("backend");
          current_basebackend = attrs['$[]']("basebackend");
          current_doctype = attrs['$[]']("doctype");
          if ((($a = new_backend['$start_with?']("xhtml")) !== nil && (!$a._isBoolean || $a == true))) {
            attrs['$[]=']("htmlsyntax", "xml");
            new_backend = new_backend['$[]']($range(1, -1, false));
          } else if ((($a = new_backend['$start_with?']("html")) !== nil && (!$a._isBoolean || $a == true))) {
            attrs['$[]=']("htmlsyntax", "html")};
          if ((($a = (resolved_name = $scope.BACKEND_ALIASES['$[]'](new_backend))) !== nil && (!$a._isBoolean || $a == true))) {
            new_backend = resolved_name};
          if (current_backend !== false && current_backend !== nil) {
            attrs.$delete("backend-" + (current_backend));
            if (current_doctype !== false && current_doctype !== nil) {
              attrs.$delete("backend-" + (current_backend) + "-doctype-" + (current_doctype))};};
          if (current_doctype !== false && current_doctype !== nil) {
            attrs['$[]=']("doctype-" + (current_doctype), "");
            attrs['$[]=']("backend-" + (new_backend) + "-doctype-" + (current_doctype), "");};
          attrs['$[]=']("backend", new_backend);
          attrs['$[]=']("backend-" + (new_backend), "");
          if ((($a = (self.converter = self.$create_converter())['$is_a?'](($scope.Converter)._scope.BackendInfo)) !== nil && (!$a._isBoolean || $a == true))) {
            new_basebackend = self.converter.$basebackend();
            attrs['$[]=']("outfilesuffix", self.converter.$outfilesuffix());
            new_filetype = self.converter.$filetype();
            } else {
            new_basebackend = new_backend.$sub($scope.TrailingDigitsRx, "");
            new_outfilesuffix = ((($a = $scope.DEFAULT_EXTENSIONS['$[]'](new_basebackend)) !== false && $a !== nil) ? $a : ".html");
            new_filetype = new_outfilesuffix['$[]']($range(1, -1, false));
            if ((($a = self['$attribute_locked?']("outfilesuffix")) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              attrs['$[]=']("outfilesuffix", new_outfilesuffix)
            };
          };
          if ((($a = (current_filetype = attrs['$[]']("filetype"))) !== nil && (!$a._isBoolean || $a == true))) {
            attrs.$delete("filetype-" + (current_filetype))};
          attrs['$[]=']("filetype", new_filetype);
          attrs['$[]=']("filetype-" + (new_filetype), "");
          if ((($a = (page_width = $scope.DEFAULT_PAGE_WIDTHS['$[]'](new_basebackend))) !== nil && (!$a._isBoolean || $a == true))) {
            attrs['$[]=']("pagewidth", page_width)
            } else {
            attrs.$delete("pagewidth")
          };
          if ((($a = new_basebackend['$=='](current_basebackend)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            if (current_basebackend !== false && current_basebackend !== nil) {
              attrs.$delete("basebackend-" + (current_basebackend));
              if (current_doctype !== false && current_doctype !== nil) {
                attrs.$delete("basebackend-" + (current_basebackend) + "-doctype-" + (current_doctype))};};
            attrs['$[]=']("basebackend", new_basebackend);
            attrs['$[]=']("basebackend-" + (new_basebackend), "");
            if (current_doctype !== false && current_doctype !== nil) {
              attrs['$[]=']("basebackend-" + (new_basebackend) + "-doctype-" + (current_doctype), "")};};
          return self.backend = nil;
          } else {
          return nil
        };
      };

      def.$update_doctype_attributes = function(new_doctype) {
        var $a, $b, self = this, attrs = nil, current_doctype = nil, current_backend = nil, current_basebackend = nil;

        if ((($a = (($b = new_doctype !== false && new_doctype !== nil) ? new_doctype['$=='](self.attributes['$[]']("doctype"))['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          attrs = self.attributes;
          current_doctype = attrs['$[]']("doctype");
          current_backend = attrs['$[]']("backend");
          current_basebackend = attrs['$[]']("basebackend");
          if (current_doctype !== false && current_doctype !== nil) {
            attrs.$delete("doctype-" + (current_doctype));
            if (current_backend !== false && current_backend !== nil) {
              attrs.$delete("backend-" + (current_backend) + "-doctype-" + (current_doctype))};
            if (current_basebackend !== false && current_basebackend !== nil) {
              attrs.$delete("basebackend-" + (current_basebackend) + "-doctype-" + (current_doctype))};};
          attrs['$[]=']("doctype", new_doctype);
          attrs['$[]=']("doctype-" + (new_doctype), "");
          if (current_backend !== false && current_backend !== nil) {
            attrs['$[]=']("backend-" + (current_backend) + "-doctype-" + (new_doctype), "")};
          if (current_basebackend !== false && current_basebackend !== nil) {
            attrs['$[]=']("basebackend-" + (current_basebackend) + "-doctype-" + (new_doctype), "")};
          return self.doctype = nil;
          } else {
          return nil
        };
      };

      def.$create_converter = function() {
        var $a, self = this, converter_opts = nil, template_dirs = nil, template_dir = nil, converter_factory = nil, converter = nil;

        converter_opts = $hash2([], {});
        converter_opts['$[]=']("htmlsyntax", self.attributes['$[]']("htmlsyntax"));
        template_dirs = (function() {if ((($a = (template_dir = self.options['$[]']("template_dir"))) !== nil && (!$a._isBoolean || $a == true))) {
          return converter_opts['$[]=']("template_dirs", [template_dir])
        } else if ((($a = (template_dirs = self.options['$[]']("template_dirs"))) !== nil && (!$a._isBoolean || $a == true))) {
          return converter_opts['$[]=']("template_dirs", template_dirs)
          } else {
          return nil
        }; return nil; })();
        if (template_dirs !== false && template_dirs !== nil) {
          converter_opts['$[]=']("template_cache", self.options.$fetch("template_cache", true));
          converter_opts['$[]=']("template_engine", self.options['$[]']("template_engine"));
          converter_opts['$[]=']("template_engine_options", self.options['$[]']("template_engine_options"));
          converter_opts['$[]=']("eruby", self.options['$[]']("eruby"));};
        converter_factory = (function() {if ((($a = (converter = self.options['$[]']("converter"))) !== nil && (!$a._isBoolean || $a == true))) {
          return ($scope.Converter)._scope.Factory.$new((($a = $opal.Object._scope.Hash) == null ? $opal.cm('Hash') : $a)['$[]'](self.$backend(), converter))
          } else {
          return ($scope.Converter)._scope.Factory.$default(false)
        }; return nil; })();
        return converter_factory.$create(self.$backend(), converter_opts);
      };

      def.$convert = function(opts) {
        var $a, $b, TMP_13, self = this, block = nil, output = nil, transform = nil, exts = nil;

        if (opts == null) {
          opts = $hash2([], {})
        }
        if ((($a = self.parsed) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          self.$parse()
        };
        self.$restore_attributes();
        if (self.$doctype()['$==']("inline")) {
          if ((($a = ($b = (block = self.blocks['$[]'](0)), $b !== false && $b !== nil ?block.$content_model()['$==']("compound")['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            output = block.$content()
            } else {
            output = ""
          }
          } else {
          transform = (function() {if ((($a = ((function() {if ((($b = (opts['$key?']("header_footer"))) !== nil && (!$b._isBoolean || $b == true))) {
            return opts['$[]']("header_footer")
            } else {
            return self.options['$[]']("header_footer")
          }; return nil; })())) !== nil && (!$a._isBoolean || $a == true))) {
            return "document"
            } else {
            return "embedded"
          }; return nil; })();
          output = self.converter.$convert(self, transform);
        };
        if ((($a = self.parent_document) !== nil && (!$a._isBoolean || $a == true))) {
        } else if ((($a = ($b = (exts = self.extensions), $b !== false && $b !== nil ?exts['$postprocessors?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          ($a = ($b = exts.$postprocessors()).$each, $a._p = (TMP_13 = function(ext){var self = TMP_13._s || this;
if (ext == null) ext = nil;
          return output = ext.$process_method()['$[]'](self, output)}, TMP_13._s = self, TMP_13), $a).call($b)};
        return output;
      };

      $opal.defn(self, '$render', def.$convert);

      def.$write = function(output, target) {
        var $a, $b, TMP_14, $c, self = this;

        if ((($a = self.converter['$is_a?']($scope.Writer)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.converter.$write(output, target)
          } else {
          if ((($a = target['$respond_to?']("write")) !== nil && (!$a._isBoolean || $a == true))) {
            target.$write(output.$chomp());
            target.$write($scope.EOL);
            } else {
            ($a = ($b = (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c)).$open, $a._p = (TMP_14 = function(f){var self = TMP_14._s || this;
if (f == null) f = nil;
            return f.$write(output)}, TMP_14._s = self, TMP_14), $a).call($b, target, "w")
          };
          return nil;
        };
      };

      def.$content = TMP_15 = function() {var $zuper = $slice.call(arguments, 0);
        var self = this, $iter = TMP_15._p, $yield = $iter || nil;

        TMP_15._p = null;
        self.attributes.$delete("title");
        return $opal.find_super_dispatcher(self, 'content', TMP_15, $iter).apply(self, $zuper);
      };

      def.$docinfo = function(pos, ext) {
        var $a, $b, $c, self = this, $case = nil, qualifier = nil, content = nil, docinfo = nil, docinfo1 = nil, docinfo2 = nil, docinfo_filename = nil, docinfo_path = nil, content2 = nil;

        if (pos == null) {
          pos = "header"
        }
        if (ext == null) {
          ext = nil
        }
        if (self.$safe()['$>='](($scope.SafeMode)._scope.SECURE)) {
          return ""
          } else {
          $case = pos;if ("footer"['$===']($case)) {qualifier = "-footer"}else {qualifier = nil};
          if ((($a = ext['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
            ext = self.attributes['$[]']("outfilesuffix")};
          content = nil;
          docinfo = self.attributes['$key?']("docinfo");
          docinfo1 = self.attributes['$key?']("docinfo1");
          docinfo2 = self.attributes['$key?']("docinfo2");
          docinfo_filename = "docinfo" + (qualifier) + (ext);
          if ((($a = ((($b = docinfo1) !== false && $b !== nil) ? $b : docinfo2)) !== nil && (!$a._isBoolean || $a == true))) {
            docinfo_path = self.$normalize_system_path(docinfo_filename);
            content = self.$read_asset(docinfo_path);
            if ((($a = content['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              if ((($a = $scope.FORCE_ENCODING) !== nil && (!$a._isBoolean || $a == true))) {
                content.$force_encoding(((($a = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $a))._scope.UTF_8)};
              content = self.$sub_attributes(content.$split($scope.EOL))['$*']($scope.EOL);
            };};
          if ((($a = ($b = (((($c = docinfo) !== false && $c !== nil) ? $c : docinfo2)), $b !== false && $b !== nil ?self.attributes['$key?']("docname") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            docinfo_path = self.$normalize_system_path("" + (self.attributes['$[]']("docname")) + "-" + (docinfo_filename));
            content2 = self.$read_asset(docinfo_path);
            if ((($a = content2['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              if ((($a = $scope.FORCE_ENCODING) !== nil && (!$a._isBoolean || $a == true))) {
                content2.$force_encoding(((($a = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $a))._scope.UTF_8)};
              content2 = self.$sub_attributes(content2.$split($scope.EOL))['$*']($scope.EOL);
              content = (function() {if ((($a = content['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
                return content2
                } else {
                return "" + (content) + ($scope.EOL) + (content2)
              }; return nil; })();
            };};
          return content.$to_s();
        };
      };

      return (def.$to_s = function() {
        var $a, self = this;

        return "#<" + (self.$class()) + "@" + (self.$object_id()) + " {doctype: " + (self.$doctype().$inspect()) + ", doctitle: " + (((function() {if ((($a = self.header['$=='](nil)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          return self.header.$title()
          } else {
          return nil
        }; return nil; })()).$inspect()) + ", blocks: " + (self.blocks.$size()) + "}>";
      }, nil) && 'to_s';
    })(self, $scope.AbstractBlock)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Inline(){};
      var self = $Inline = $klass($base, $super, 'Inline', $Inline);

      var def = self._proto, $scope = self._scope, TMP_1;

      self.$attr_reader("text");

      self.$attr_reader("type");

      self.$attr_accessor("target");

      def.$initialize = TMP_1 = function(parent, context, text, opts) {
        var $a, self = this, $iter = TMP_1._p, $yield = $iter || nil, more_attributes = nil;

        if (text == null) {
          text = nil
        }
        if (opts == null) {
          opts = $hash2([], {})
        }
        TMP_1._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_1, null).apply(self, [parent, context]);
        self.node_name = "inline_" + (context);
        self.text = text;
        self.id = opts['$[]']("id");
        self.type = opts['$[]']("type");
        self.target = opts['$[]']("target");
        if ((($a = ((more_attributes = opts['$[]']("attributes")))['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          return self.$update_attributes(more_attributes)
        };
      };

      def['$block?'] = function() {
        var self = this;

        return false;
      };

      def['$inline?'] = function() {
        var self = this;

        return true;
      };

      def.$convert = function() {
        var self = this;

        return self.$converter().$convert(self);
      };

      return $opal.defn(self, '$render', def.$convert);
    })(self, $scope.AbstractNode)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $List(){};
      var self = $List = $klass($base, $super, 'List', $List);

      var def = self._proto, $scope = self._scope, TMP_1, TMP_2;

      def.blocks = def.context = def.document = def.style = nil;
      $opal.defn(self, '$items', def.$blocks);

      $opal.defn(self, '$items?', def['$blocks?']);

      def.$initialize = TMP_1 = function(parent, context) {var $zuper = $slice.call(arguments, 0);
        var self = this, $iter = TMP_1._p, $yield = $iter || nil;

        TMP_1._p = null;
        return $opal.find_super_dispatcher(self, 'initialize', TMP_1, $iter).apply(self, $zuper);
      };

      def.$content = function() {
        var self = this;

        return self.blocks;
      };

      def.$convert = TMP_2 = function() {var $zuper = $slice.call(arguments, 0);
        var self = this, $iter = TMP_2._p, $yield = $iter || nil, result = nil;

        TMP_2._p = null;
        if (self.context['$==']("colist")) {
          result = $opal.find_super_dispatcher(self, 'convert', TMP_2, $iter).apply(self, $zuper);
          self.document.$callouts().$next_list();
          return result;
          } else {
          return $opal.find_super_dispatcher(self, 'convert', TMP_2, $iter).apply(self, $zuper)
        };
      };

      $opal.defn(self, '$render', def.$convert);

      return (def.$to_s = function() {
        var self = this;

        return "#<" + (self.$class()) + "@" + (self.$object_id()) + " {context: " + (self.context.$inspect()) + ", style: " + (self.style.$inspect()) + ", items: " + (self.$items().$size()) + "}>";
      }, nil) && 'to_s';
    })(self, $scope.AbstractBlock);

    (function($base, $super) {
      function $ListItem(){};
      var self = $ListItem = $klass($base, $super, 'ListItem', $ListItem);

      var def = self._proto, $scope = self._scope, TMP_3;

      def.text = def.blocks = nil;
      self.$attr_accessor("marker");

      def.$initialize = TMP_3 = function(parent, text) {
        var self = this, $iter = TMP_3._p, $yield = $iter || nil;

        if (text == null) {
          text = nil
        }
        TMP_3._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_3, null).apply(self, [parent, "list_item"]);
        self.text = text;
        return self.level = parent.$level();
      };

      def['$text?'] = function() {
        var self = this;

        return self.text['$nil_or_empty?']()['$!']();
      };

      def.$text = function() {
        var self = this;

        return self.$apply_subs(self.text);
      };

      def.$fold_first = function(continuation_connects_first_block, content_adjacent) {
        var $a, $b, $c, $d, $e, $f, self = this, first_block = nil, block = nil;

        if (continuation_connects_first_block == null) {
          continuation_connects_first_block = false
        }
        if (content_adjacent == null) {
          content_adjacent = false
        }
        if ((($a = ($b = ($c = (first_block = self.blocks['$[]'](0)), $c !== false && $c !== nil ?first_block['$is_a?']($scope.Block) : $c), $b !== false && $b !== nil ?(((($c = ((($d = first_block.$context()['$==']("paragraph")) ? continuation_connects_first_block['$!']() : $d))) !== false && $c !== nil) ? $c : (($d = ($e = (((($f = content_adjacent) !== false && $f !== nil) ? $f : continuation_connects_first_block['$!']())), $e !== false && $e !== nil ?first_block.$context()['$==']("literal") : $e), $d !== false && $d !== nil ?first_block['$option?']("listparagraph") : $d)))) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          block = self.$blocks().$shift();
          if ((($a = self.text['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            block.$lines().$unshift(self.text)
          };
          self.text = block.$source();};
        return nil;
      };

      return (def.$to_s = function() {
        var $a, self = this;

        return "#<" + (self.$class()) + "@" + (self.$object_id()) + " {list_context: " + (self.$parent().$context().$inspect()) + ", text: " + (self.text.$inspect()) + ", blocks: " + ((((($a = self.blocks) !== false && $a !== nil) ? $a : [])).$size()) + "}>";
      }, nil) && 'to_s';
    })(self, $scope.AbstractBlock);
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range, $gvars = $opal.gvars;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Parser(){};
      var self = $Parser = $klass($base, $super, 'Parser', $Parser);

      var def = self._proto, $scope = self._scope;

      $opal.cdecl($scope, 'BlockMatchData', $scope.Struct.$new("context", "masq", "tip", "terminator"));

      def.$initialize = function() {
        var self = this;

        return self.$raise("Au contraire, mon frere. No lexer instances will be running around.");
      };

      $opal.defs(self, '$parse', function(reader, document, options) {
        var $a, $b, self = this, block_attributes = nil, new_section = nil;

        if (options == null) {
          options = $hash2([], {})
        }
        block_attributes = self.$parse_document_header(reader, document);
        if ((($a = options['$[]']("header_only")) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          while ((($b = reader['$has_more_lines?']()) !== nil && (!$b._isBoolean || $b == true))) {
          $b = $opal.to_ary(self.$next_section(reader, document, block_attributes)), new_section = ($b[0] == null ? nil : $b[0]), block_attributes = ($b[1] == null ? nil : $b[1]);
          if (new_section !== false && new_section !== nil) {
            document['$<<'](new_section)};}
        };
        return document;
      });

      $opal.defs(self, '$parse_document_header', function(reader, document) {
        var $a, $b, self = this, block_attributes = nil, assigned_doctitle = nil, val = nil, section_title = nil, _ = nil, doctitle = nil;

        block_attributes = self.$parse_block_metadata_lines(reader, document);
        if ((($a = block_attributes['$has_key?']("title")) !== nil && (!$a._isBoolean || $a == true))) {
          return document.$finalize_header(block_attributes, false)};
        assigned_doctitle = nil;
        if ((($a = ((val = document.$attributes()['$[]']("doctitle")))['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          document['$title='](val);
          assigned_doctitle = val;
        };
        section_title = nil;
        if ((($a = self['$is_next_line_document_title?'](reader, block_attributes)) !== nil && (!$a._isBoolean || $a == true))) {
          $a = $opal.to_ary(self.$parse_section_title(reader, document)), document['$id='](($a[0] == null ? nil : $a[0])), _ = ($a[1] == null ? nil : $a[1]), doctitle = ($a[2] == null ? nil : $a[2]), _ = ($a[3] == null ? nil : $a[3]), _ = ($a[4] == null ? nil : $a[4]);
          if (assigned_doctitle !== false && assigned_doctitle !== nil) {
            } else {
            document['$title='](doctitle);
            assigned_doctitle = doctitle;
          };
          document.$attributes()['$[]=']("doctitle", section_title = doctitle);
          if ((($a = document.$id()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            document['$id='](block_attributes.$delete("id"))
          };
          self.$parse_header_metadata(reader, document);};
        if ((($a = ($b = ((val = document.$attributes()['$[]']("doctitle")))['$nil_or_empty?']()['$!'](), $b !== false && $b !== nil ?val['$=='](section_title)['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          document['$title='](val);
          assigned_doctitle = val;};
        if (assigned_doctitle !== false && assigned_doctitle !== nil) {
          document.$attributes()['$[]=']("doctitle", assigned_doctitle)};
        if (document.$doctype()['$==']("manpage")) {
          self.$parse_manpage_header(reader, document)};
        return document.$finalize_header(block_attributes);
      });

      $opal.defs(self, '$parse_manpage_header', function(reader, document) {
        var $a, self = this, m = nil, name_section = nil, name_section_buffer = nil;

        if ((($a = (m = $scope.ManpageTitleVolnumRx.$match(document.$attributes()['$[]']("doctitle")))) !== nil && (!$a._isBoolean || $a == true))) {
          document.$attributes()['$[]=']("mantitle", document.$sub_attributes(m['$[]'](1).$rstrip().$downcase()));
          document.$attributes()['$[]=']("manvolnum", m['$[]'](2).$strip());
          } else {
          self.$warn("asciidoctor: ERROR: " + (reader.$prev_line_info()) + ": malformed manpage title")
        };
        reader.$skip_blank_lines();
        if ((($a = self['$is_next_line_section?'](reader, $hash2([], {}))) !== nil && (!$a._isBoolean || $a == true))) {
          name_section = self.$initialize_section(reader, document, $hash2([], {}));
          if (name_section.$level()['$=='](1)) {
            name_section_buffer = reader.$read_lines_until($hash2(["break_on_blank_lines"], {"break_on_blank_lines": true})).$join(" ").$tr_s(" ", " ");
            if ((($a = (m = $scope.ManpageNamePurposeRx.$match(name_section_buffer))) !== nil && (!$a._isBoolean || $a == true))) {
              document.$attributes()['$[]=']("manname", m['$[]'](1));
              document.$attributes()['$[]=']("manpurpose", m['$[]'](2));
              if (document.$backend()['$==']("manpage")) {
                document.$attributes()['$[]=']("docname", document.$attributes()['$[]']("manname"));
                return document.$attributes()['$[]=']("outfilesuffix", "." + (document.$attributes()['$[]']("manvolnum")));
                } else {
                return nil
              };
              } else {
              return self.$warn("asciidoctor: ERROR: " + (reader.$prev_line_info()) + ": malformed name section body")
            };
            } else {
            return self.$warn("asciidoctor: ERROR: " + (reader.$prev_line_info()) + ": name section title must be at level 1")
          };
          } else {
          return self.$warn("asciidoctor: ERROR: " + (reader.$prev_line_info()) + ": name section expected")
        };
      });

      $opal.defs(self, '$next_section', function(reader, parent, attributes) {
        var $a, $b, $c, $d, self = this, preamble = nil, part = nil, intro = nil, has_header = nil, doctype = nil, section = nil, current_level = nil, expected_next_levels = nil, title = nil, next_level = nil, new_section = nil, block_line_info = nil, new_block = nil, first_block = nil, document = nil, child_block = nil;

        if (attributes == null) {
          attributes = $hash2([], {})
        }
        preamble = false;
        part = false;
        intro = false;
        if ((($a = ($b = (($c = parent.$context()['$==']("document")) ? parent.$blocks()['$empty?']() : $c), $b !== false && $b !== nil ?(((($c = ((($d = (has_header = parent['$has_header?']())) !== false && $d !== nil) ? $d : attributes.$delete("invalid-header"))) !== false && $c !== nil) ? $c : self['$is_next_line_section?'](reader, attributes)['$!']())) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          doctype = parent.$doctype();
          if (has_header !== false && has_header !== nil) {
            preamble = intro = $scope.Block.$new(parent, "preamble", $hash2(["content_model"], {"content_model": "compound"}));
            parent['$<<'](preamble);};
          section = parent;
          current_level = 0;
          if ((($a = parent.$attributes()['$has_key?']("fragment")) !== nil && (!$a._isBoolean || $a == true))) {
            expected_next_levels = nil
          } else if (doctype['$==']("book")) {
            expected_next_levels = [0, 1]
            } else {
            expected_next_levels = [1]
          };
          } else {
          doctype = parent.$document().$doctype();
          section = self.$initialize_section(reader, parent, attributes);
          attributes = (function() {if ((($a = (title = attributes['$[]']("title"))) !== nil && (!$a._isBoolean || $a == true))) {
            return $hash2(["title"], {"title": title})
            } else {
            return $hash2([], {})
          }; return nil; })();
          current_level = section.$level();
          if ((($a = (($b = current_level['$=='](0)) ? doctype['$==']("book") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            part = section.$special()['$!']();
            if ((($a = ($b = section.$special(), $b !== false && $b !== nil ?(["preface", "appendix"]['$include?'](section.$sectname())) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              expected_next_levels = [current_level['$+'](2)]
              } else {
              expected_next_levels = [current_level['$+'](1)]
            };
            } else {
            expected_next_levels = [current_level['$+'](1)]
          };
        };
        reader.$skip_blank_lines();
        while ((($b = reader['$has_more_lines?']()) !== nil && (!$b._isBoolean || $b == true))) {
        self.$parse_block_metadata_lines(reader, section, attributes);
        if ((($b = (next_level = self['$is_next_line_section?'](reader, attributes))) !== nil && (!$b._isBoolean || $b == true))) {
          next_level = next_level['$+'](section.$document().$attr("leveloffset", 0).$to_i());
          if ((($b = ((($c = next_level['$>'](current_level)) !== false && $c !== nil) ? $c : ((($d = section.$context()['$==']("document")) ? next_level['$=='](0) : $d)))) !== nil && (!$b._isBoolean || $b == true))) {
            if ((($b = (($c = next_level['$=='](0)) ? doctype['$==']("book")['$!']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
              self.$warn("asciidoctor: ERROR: " + (reader.$line_info()) + ": only book doctypes can contain level 0 sections")
            } else if ((($b = (($c = expected_next_levels !== false && expected_next_levels !== nil) ? expected_next_levels['$include?'](next_level)['$!']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
              self.$warn(((("asciidoctor: WARNING: ") + (reader.$line_info())) + ": section title out of sequence: ")['$+']("expected " + ((function() {if (expected_next_levels.$size()['$>'](1)) {
                return "levels"
                } else {
                return "level"
              }; return nil; })()) + " " + (expected_next_levels['$*'](" or ")) + ", ")['$+']("got level " + (next_level)))};
            $b = $opal.to_ary(self.$next_section(reader, section, attributes)), new_section = ($b[0] == null ? nil : $b[0]), attributes = ($b[1] == null ? nil : $b[1]);
            section['$<<'](new_section);
            } else {
            if ((($b = (($c = next_level['$=='](0)) ? doctype['$==']("book")['$!']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
              self.$warn("asciidoctor: ERROR: " + (reader.$line_info()) + ": only book doctypes can contain level 0 sections")};
            break;;
          };
          } else {
          block_line_info = reader.$line_info();
          if ((($b = (new_block = self.$next_block(reader, (((($c = intro) !== false && $c !== nil) ? $c : section)), attributes, $hash2(["parse_metadata"], {"parse_metadata": false})))) !== nil && (!$b._isBoolean || $b == true))) {
            if (part !== false && part !== nil) {
              if ((($b = section['$blocks?']()['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
                if ((($b = new_block.$style()['$==']("partintro")['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
                  if (new_block.$context()['$==']("paragraph")) {
                    new_block['$context=']("open");
                    new_block['$style=']("partintro");
                    } else {
                    intro = $scope.Block.$new(section, "open", $hash2(["content_model"], {"content_model": "compound"}));
                    intro['$style=']("partintro");
                    new_block['$parent='](intro);
                    section['$<<'](intro);
                  }}
              } else if (section.$blocks().$size()['$=='](1)) {
                first_block = section.$blocks()['$[]'](0);
                if ((($b = ($c = intro['$!'](), $c !== false && $c !== nil ?first_block.$content_model()['$==']("compound") : $c)) !== nil && (!$b._isBoolean || $b == true))) {
                  self.$warn("asciidoctor: ERROR: " + (block_line_info) + ": illegal block content outside of partintro block")
                } else if ((($b = first_block.$content_model()['$==']("compound")['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
                  intro = $scope.Block.$new(section, "open", $hash2(["content_model"], {"content_model": "compound"}));
                  intro['$style=']("partintro");
                  section.$blocks().$shift();
                  if (first_block.$style()['$==']("partintro")) {
                    first_block['$context=']("paragraph");
                    first_block['$style='](nil);};
                  first_block['$parent='](intro);
                  intro['$<<'](first_block);
                  new_block['$parent='](intro);
                  section['$<<'](intro);};}};
            (((($b = intro) !== false && $b !== nil) ? $b : section))['$<<'](new_block);
            attributes = $hash2([], {});};
        };
        reader.$skip_blank_lines();};
        if (part !== false && part !== nil) {
          if ((($a = ($b = section['$blocks?'](), $b !== false && $b !== nil ?section.$blocks()['$[]'](-1).$context()['$==']("section") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$warn("asciidoctor: ERROR: " + (reader.$line_info()) + ": invalid part, must have at least one section (e.g., chapter, appendix, etc.)")
          }
        } else if (preamble !== false && preamble !== nil) {
          document = parent;
          if ((($a = preamble['$blocks?']()) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = ($b = ($c = $scope.Compliance.$unwrap_standalone_preamble(), $c !== false && $c !== nil ?document.$blocks().$size()['$=='](1) : $c), $b !== false && $b !== nil ?(((($c = doctype['$==']("book")['$!']()) !== false && $c !== nil) ? $c : preamble.$blocks()['$[]'](0).$style()['$==']("abstract")['$!']())) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              document.$blocks().$shift();
              while ((($b = (child_block = preamble.$blocks().$shift())) !== nil && (!$b._isBoolean || $b == true))) {
              child_block['$parent='](document);
              document['$<<'](child_block);};}
            } else {
            document.$blocks().$shift()
          };};
        return [(function() {if ((($a = section['$=='](parent)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          return section
          } else {
          return nil
        }; return nil; })(), attributes.$dup()];
      });

      $opal.defs(self, '$next_block', function(reader, parent, attributes, options) {
        var $a, $b, $c, $d, $e, TMP_1, $f, TMP_2, $g, TMP_3, TMP_4, $h, $i, TMP_5, $j, $k, $l, TMP_6, TMP_7, self = this, skipped = nil, text_only = nil, parse_metadata = nil, document = nil, extensions = nil, block_extensions = nil, block_macro_extensions = nil, in_list = nil, block = nil, style = nil, explicit_style = nil, this_line = nil, delimited_block = nil, block_context = nil, cloaked_context = nil, terminator = nil, delimited_blk_match = nil, first_char = nil, match = nil, blk_ctx = nil, posattrs = nil, target = nil, extension = nil, raw_attributes = nil, default_attrs = nil, expected_index = nil, list_item = nil, coids = nil, marker = nil, float_id = nil, float_reftext = nil, float_title = nil, float_level = nil, _ = nil, tmp_sect = nil, break_at_list = nil, lines = nil, first_line = nil, admonition_match = nil, admonition_name = nil, attribution = nil, citetitle = nil, first_line_shifted = nil, indent = nil, $case = nil, language = nil, linenums = nil, default_math_syntax = nil, cursor = nil, block_reader = nil, content_model = nil, pos_attrs = nil, resolved_target = nil, scaledwidth = nil, block_id = nil;

        if (attributes == null) {
          attributes = $hash2([], {})
        }
        if (options == null) {
          options = $hash2([], {})
        }
        skipped = reader.$skip_blank_lines();
        if ((($a = reader['$has_more_lines?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return nil
        };
        if ((($a = ($b = (text_only = options['$[]']("text")), $b !== false && $b !== nil ?skipped['$>'](0) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          options.$delete("text");
          text_only = false;};
        parse_metadata = options.$fetch("parse_metadata", true);
        document = parent.$document();
        if ((($a = (extensions = document.$extensions())) !== nil && (!$a._isBoolean || $a == true))) {
          block_extensions = extensions['$blocks?']();
          block_macro_extensions = extensions['$block_macros?']();
          } else {
          block_extensions = block_macro_extensions = false
        };
        in_list = (parent['$is_a?']($scope.List));
        block = nil;
        style = nil;
        explicit_style = nil;
        while ((($b = ($c = block['$!'](), $c !== false && $c !== nil ?reader['$has_more_lines?']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
        if ((($b = (($c = parse_metadata !== false && parse_metadata !== nil) ? self.$parse_block_metadata_line(reader, document, attributes, options) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          reader.$advance();
          continue;;};
        this_line = reader.$read_line();
        delimited_block = false;
        block_context = nil;
        cloaked_context = nil;
        terminator = nil;
        if ((($b = attributes['$[]'](1)) !== nil && (!$b._isBoolean || $b == true))) {
          $b = $opal.to_ary(self.$parse_style_attribute(attributes, reader)), style = ($b[0] == null ? nil : $b[0]), explicit_style = ($b[1] == null ? nil : $b[1])};
        if ((($b = (delimited_blk_match = self['$is_delimited_block?'](this_line, true))) !== nil && (!$b._isBoolean || $b == true))) {
          delimited_block = true;
          block_context = cloaked_context = delimited_blk_match.$context();
          terminator = delimited_blk_match.$terminator();
          if ((($b = style['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
            style = attributes['$[]=']("style", block_context.$to_s())
          } else if ((($b = style['$=='](block_context.$to_s())['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
            if ((($b = delimited_blk_match.$masq()['$include?'](style)) !== nil && (!$b._isBoolean || $b == true))) {
              block_context = style.$to_sym()
            } else if ((($b = ($c = delimited_blk_match.$masq()['$include?']("admonition"), $c !== false && $c !== nil ?$scope.ADMONITION_STYLES['$include?'](style) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
              block_context = "admonition"
            } else if ((($b = (($c = block_extensions !== false && block_extensions !== nil) ? extensions['$registered_for_block?'](style, block_context) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
              block_context = style.$to_sym()
              } else {
              self.$warn("asciidoctor: WARNING: " + (reader.$prev_line_info()) + ": invalid style for " + (block_context) + " block: " + (style));
              style = block_context.$to_s();
            }};};
        if (delimited_block !== false && delimited_block !== nil) {
          } else {
          while ((($c = true) !== nil && (!$c._isBoolean || $c == true))) {
          if ((($c = ($d = (($e = style !== false && style !== nil) ? $scope.Compliance.$strict_verbatim_paragraphs() : $e), $d !== false && $d !== nil ?$scope.VERBATIM_STYLES['$include?'](style) : $d)) !== nil && (!$c._isBoolean || $c == true))) {
            block_context = style.$to_sym();
            reader.$unshift_line(this_line);
            break;;};
          if (text_only !== false && text_only !== nil) {
            } else {
            first_char = (function() {if ((($c = $scope.Compliance.$markdown_syntax()) !== nil && (!$c._isBoolean || $c == true))) {
              return this_line.$lstrip().$chr()
              } else {
              return this_line.$chr()
            }; return nil; })();
            if ((($c = ($d = ($e = ($scope.LAYOUT_BREAK_LINES['$has_key?'](first_char)), $e !== false && $e !== nil ?this_line.$length()['$>='](3) : $e), $d !== false && $d !== nil ?((function() {if ((($e = $scope.Compliance.$markdown_syntax()) !== nil && (!$e._isBoolean || $e == true))) {
              return $scope.LayoutBreakLinePlusRx
              } else {
              return $scope.LayoutBreakLineRx
            }; return nil; })())['$=~'](this_line) : $d)) !== nil && (!$c._isBoolean || $c == true))) {
              block = $scope.Block.$new(parent, $scope.LAYOUT_BREAK_LINES['$[]'](first_char), $hash2(["content_model"], {"content_model": "empty"}));
              break;;
            } else if ((($c = ($d = this_line['$end_with?']("]"), $d !== false && $d !== nil ?(match = $scope.MediaBlockMacroRx.$match(this_line)) : $d)) !== nil && (!$c._isBoolean || $c == true))) {
              blk_ctx = match['$[]'](1).$to_sym();
              block = $scope.Block.$new(parent, blk_ctx, $hash2(["content_model"], {"content_model": "empty"}));
              if (blk_ctx['$==']("image")) {
                posattrs = ["alt", "width", "height"]
              } else if (blk_ctx['$==']("video")) {
                posattrs = ["poster", "width", "height"]
                } else {
                posattrs = []
              };
              if ((($c = ((($d = style['$!']()) !== false && $d !== nil) ? $d : explicit_style)) !== nil && (!$c._isBoolean || $c == true))) {
                } else {
                if (blk_ctx['$==']("image")) {
                  attributes['$[]=']("alt", style)};
                attributes.$delete("style");
                style = nil;
              };
              block.$parse_attributes(match['$[]'](3), posattrs, $hash2(["unescape_input", "sub_input", "sub_result", "into"], {"unescape_input": (blk_ctx['$==']("image")), "sub_input": true, "sub_result": false, "into": attributes}));
              target = block.$sub_attributes(match['$[]'](2), $hash2(["attribute_missing"], {"attribute_missing": "drop-line"}));
              if ((($c = target['$empty?']()) !== nil && (!$c._isBoolean || $c == true))) {
                if (document.$attributes().$fetch("attribute-missing", $scope.Compliance.$attribute_missing())['$==']("skip")) {
                  return $scope.Block.$new(parent, "paragraph", $hash2(["content_model", "source"], {"content_model": "simple", "source": [this_line]}))
                  } else {
                  attributes.$clear();
                  return nil;
                }};
              attributes['$[]=']("target", target);
              break;;
            } else if ((($c = (($d = first_char['$==']("t")) ? (match = $scope.TocBlockMacroRx.$match(this_line)) : $d)) !== nil && (!$c._isBoolean || $c == true))) {
              block = $scope.Block.$new(parent, "toc", $hash2(["content_model"], {"content_model": "empty"}));
              block.$parse_attributes(match['$[]'](1), [], $hash2(["sub_result", "into"], {"sub_result": false, "into": attributes}));
              break;;
            } else if ((($c = ($d = (($e = block_macro_extensions !== false && block_macro_extensions !== nil) ? (match = $scope.GenericBlockMacroRx.$match(this_line)) : $e), $d !== false && $d !== nil ?(extension = extensions['$registered_for_block_macro?'](match['$[]'](1))) : $d)) !== nil && (!$c._isBoolean || $c == true))) {
              target = match['$[]'](2);
              raw_attributes = match['$[]'](3);
              if (extension.$config()['$[]']("content_model")['$==']("attributes")) {
                if ((($c = raw_attributes['$empty?']()) !== nil && (!$c._isBoolean || $c == true))) {
                  } else {
                  document.$parse_attributes(raw_attributes, (((($c = extension.$config()['$[]']("pos_attrs")) !== false && $c !== nil) ? $c : [])), $hash2(["sub_input", "sub_result", "into"], {"sub_input": true, "sub_result": false, "into": attributes}))
                }
                } else {
                attributes['$[]=']("text", raw_attributes)
              };
              if ((($c = (default_attrs = extension.$config()['$[]']("default_attrs"))) !== nil && (!$c._isBoolean || $c == true))) {
                ($c = ($d = default_attrs).$each, $c._p = (TMP_1 = function(k, v){var self = TMP_1._s || this, $a, $b, $c;
if (k == null) k = nil;if (v == null) v = nil;
                return ($a = k, $b = attributes, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, v)))}, TMP_1._s = self, TMP_1), $c).call($d)};
              if ((($c = (block = extension.$process_method()['$[]'](parent, target, attributes.$dup()))) !== nil && (!$c._isBoolean || $c == true))) {
                attributes.$replace(block.$attributes())
                } else {
                attributes.$clear();
                return nil;
              };
              break;;};
          };
          if ((($c = (match = $scope.CalloutListRx.$match(this_line))) !== nil && (!$c._isBoolean || $c == true))) {
            block = $scope.List.$new(parent, "colist");
            attributes['$[]=']("style", "arabic");
            reader.$unshift_line(this_line);
            expected_index = 1;
            while ((($e = ($f = reader['$has_more_lines?'](), $f !== false && $f !== nil ?(match = $scope.CalloutListRx.$match(reader.$peek_line())) : $f)) !== nil && (!$e._isBoolean || $e == true))) {
            if ((($e = match['$[]'](1).$to_i()['$=='](expected_index)['$!']()) !== nil && (!$e._isBoolean || $e == true))) {
              self.$warn("asciidoctor: WARNING: " + (reader.$path()) + ": line " + (reader.$lineno()['$-'](2)) + ": callout list item index: expected " + (expected_index) + " got " + (match['$[]'](1)))};
            list_item = self.$next_list_item(reader, block, match);
            expected_index = expected_index['$+'](1);
            if (list_item !== false && list_item !== nil) {
              block['$<<'](list_item);
              coids = document.$callouts().$callout_ids(block.$items().$size());
              if ((($e = coids['$empty?']()['$!']()) !== nil && (!$e._isBoolean || $e == true))) {
                list_item.$attributes()['$[]=']("coids", coids)
                } else {
                self.$warn("asciidoctor: WARNING: " + (reader.$path()) + ": line " + (reader.$lineno()['$-'](2)) + ": no callouts refer to list item " + (block.$items().$size()))
              };};};
            document.$callouts().$next_list();
            break;;
          } else if ((($c = $scope.UnorderedListRx['$=~'](this_line)) !== nil && (!$c._isBoolean || $c == true))) {
            reader.$unshift_line(this_line);
            block = self.$next_outline_list(reader, "ulist", parent);
            break;;
          } else if ((($c = (match = $scope.OrderedListRx.$match(this_line))) !== nil && (!$c._isBoolean || $c == true))) {
            reader.$unshift_line(this_line);
            block = self.$next_outline_list(reader, "olist", parent);
            if ((($c = ($e = attributes['$[]']("style")['$!'](), $e !== false && $e !== nil ?block.$attributes()['$[]']("style")['$!']() : $e)) !== nil && (!$c._isBoolean || $c == true))) {
              marker = block.$items()['$[]'](0).$marker();
              if ((($c = marker['$start_with?'](".")) !== nil && (!$c._isBoolean || $c == true))) {
                attributes['$[]=']("style", (((($c = $scope.ORDERED_LIST_STYLES['$[]'](marker.$length()['$-'](1))) !== false && $c !== nil) ? $c : $scope.ORDERED_LIST_STYLES['$[]'](0))).$to_s())
                } else {
                style = ($c = ($e = $scope.ORDERED_LIST_STYLES).$detect, $c._p = (TMP_2 = function(s){var self = TMP_2._s || this;
if (s == null) s = nil;
                return $scope.OrderedListMarkerRxMap['$[]'](s)['$=~'](marker)}, TMP_2._s = self, TMP_2), $c).call($e);
                attributes['$[]=']("style", (((($c = style) !== false && $c !== nil) ? $c : $scope.ORDERED_LIST_STYLES['$[]'](0))).$to_s());
              };};
            break;;
          } else if ((($c = (match = $scope.DefinitionListRx.$match(this_line))) !== nil && (!$c._isBoolean || $c == true))) {
            reader.$unshift_line(this_line);
            block = self.$next_labeled_list(reader, match, parent);
            break;;
          } else if ((($c = ($f = (((($g = style['$==']("float")) !== false && $g !== nil) ? $g : style['$==']("discrete"))), $f !== false && $f !== nil ?self['$is_section_title?'](this_line, ((function() {if ((($g = $scope.Compliance.$underline_style_section_titles()) !== nil && (!$g._isBoolean || $g == true))) {
            return reader.$peek_line(true)
            } else {
            return nil
          }; return nil; })())) : $f)) !== nil && (!$c._isBoolean || $c == true))) {
            reader.$unshift_line(this_line);
            $c = $opal.to_ary(self.$parse_section_title(reader, document)), float_id = ($c[0] == null ? nil : $c[0]), float_reftext = ($c[1] == null ? nil : $c[1]), float_title = ($c[2] == null ? nil : $c[2]), float_level = ($c[3] == null ? nil : $c[3]), _ = ($c[4] == null ? nil : $c[4]);
            if (float_reftext !== false && float_reftext !== nil) {
              attributes['$[]=']("reftext", float_reftext)};
            if ((($c = attributes['$has_key?']("id")) !== nil && (!$c._isBoolean || $c == true))) {
              ((($c = float_id) !== false && $c !== nil) ? $c : float_id = attributes['$[]']("id"))};
            block = $scope.Block.$new(parent, "floating_title", $hash2(["content_model"], {"content_model": "empty"}));
            if ((($c = float_id['$nil_or_empty?']()) !== nil && (!$c._isBoolean || $c == true))) {
              tmp_sect = $scope.Section.$new(parent);
              tmp_sect['$title='](float_title);
              block['$id='](tmp_sect.$generate_id());
              } else {
              block['$id='](float_id)
            };
            block['$level='](float_level);
            block['$title='](float_title);
            break;;
          } else if ((($c = (($f = style !== false && style !== nil) ? style['$==']("normal")['$!']() : $f)) !== nil && (!$c._isBoolean || $c == true))) {
            if ((($c = $scope.PARAGRAPH_STYLES['$include?'](style)) !== nil && (!$c._isBoolean || $c == true))) {
              block_context = style.$to_sym();
              cloaked_context = "paragraph";
              reader.$unshift_line(this_line);
              break;;
            } else if ((($c = $scope.ADMONITION_STYLES['$include?'](style)) !== nil && (!$c._isBoolean || $c == true))) {
              block_context = "admonition";
              cloaked_context = "paragraph";
              reader.$unshift_line(this_line);
              break;;
            } else if ((($c = (($f = block_extensions !== false && block_extensions !== nil) ? extensions['$registered_for_block?'](style, "paragraph") : $f)) !== nil && (!$c._isBoolean || $c == true))) {
              block_context = style.$to_sym();
              cloaked_context = "paragraph";
              reader.$unshift_line(this_line);
              break;;
              } else {
              self.$warn("asciidoctor: WARNING: " + (reader.$prev_line_info()) + ": invalid style for paragraph: " + (style));
              style = nil;
            }};
          break_at_list = ((($c = skipped['$=='](0)) ? in_list : $c));
          if ((($c = ($f = style['$==']("normal")['$!'](), $f !== false && $f !== nil ?$scope.LiteralParagraphRx['$=~'](this_line) : $f)) !== nil && (!$c._isBoolean || $c == true))) {
            reader.$unshift_line(this_line);
            lines = ($c = ($f = reader).$read_lines_until, $c._p = (TMP_3 = function(line){var self = TMP_3._s || this, $a, $b, $c;
if (line == null) line = nil;
            return ((($a = ((($b = break_at_list !== false && break_at_list !== nil) ? $scope.AnyListRx['$=~'](line) : $b))) !== false && $a !== nil) ? $a : (($b = $scope.Compliance.$block_terminates_paragraph(), $b !== false && $b !== nil ?(((($c = self['$is_delimited_block?'](line)) !== false && $c !== nil) ? $c : $scope.BlockAttributeLineRx['$=~'](line))) : $b)))}, TMP_3._s = self, TMP_3), $c).call($f, $hash2(["break_on_blank_lines", "break_on_list_continuation", "preserve_last_line"], {"break_on_blank_lines": true, "break_on_list_continuation": true, "preserve_last_line": true}));
            self['$reset_block_indent!'](lines);
            block = $scope.Block.$new(parent, "literal", $hash2(["content_model", "source", "attributes"], {"content_model": "verbatim", "source": lines, "attributes": attributes}));
            if (in_list !== false && in_list !== nil) {
              block.$set_option("listparagraph")};
            } else {
            reader.$unshift_line(this_line);
            lines = ($c = ($g = reader).$read_lines_until, $c._p = (TMP_4 = function(line){var self = TMP_4._s || this, $a, $b, $c;
if (line == null) line = nil;
            return ((($a = ((($b = break_at_list !== false && break_at_list !== nil) ? $scope.AnyListRx['$=~'](line) : $b))) !== false && $a !== nil) ? $a : (($b = $scope.Compliance.$block_terminates_paragraph(), $b !== false && $b !== nil ?(((($c = self['$is_delimited_block?'](line)) !== false && $c !== nil) ? $c : $scope.BlockAttributeLineRx['$=~'](line))) : $b)))}, TMP_4._s = self, TMP_4), $c).call($g, $hash2(["break_on_blank_lines", "break_on_list_continuation", "preserve_last_line", "skip_line_comments"], {"break_on_blank_lines": true, "break_on_list_continuation": true, "preserve_last_line": true, "skip_line_comments": true}));
            if ((($c = lines['$empty?']()) !== nil && (!$c._isBoolean || $c == true))) {
              reader.$advance();
              return nil;};
            self.$catalog_inline_anchors(lines.$join($scope.EOL), document);
            first_line = lines['$[]'](0);
            if ((($c = ($h = text_only['$!'](), $h !== false && $h !== nil ?(admonition_match = $scope.AdmonitionParagraphRx.$match(first_line)) : $h)) !== nil && (!$c._isBoolean || $c == true))) {
              lines['$[]='](0, admonition_match.$post_match().$lstrip());
              attributes['$[]=']("style", admonition_match['$[]'](1));
              attributes['$[]=']("name", admonition_name = admonition_match['$[]'](1).$downcase());
              ($c = "caption", $h = attributes, ((($i = $h['$[]']($c)) !== false && $i !== nil) ? $i : $h['$[]=']($c, document.$attributes()['$[]']("" + (admonition_name) + "-caption"))));
              block = $scope.Block.$new(parent, "admonition", $hash2(["content_model", "source", "attributes"], {"content_model": "simple", "source": lines, "attributes": attributes}));
            } else if ((($c = ($h = ($i = text_only['$!'](), $i !== false && $i !== nil ?$scope.Compliance.$markdown_syntax() : $i), $h !== false && $h !== nil ?first_line['$start_with?']("> ") : $h)) !== nil && (!$c._isBoolean || $c == true))) {
              ($c = ($h = lines)['$map!'], $c._p = (TMP_5 = function(line){var self = TMP_5._s || this, $a;
if (line == null) line = nil;
              if (line['$=='](">")) {
                  return line['$[]']($range(1, -1, false))
                } else if ((($a = line['$start_with?']("> ")) !== nil && (!$a._isBoolean || $a == true))) {
                  return line['$[]']($range(2, -1, false))
                  } else {
                  return line
                }}, TMP_5._s = self, TMP_5), $c).call($h);
              if ((($c = lines['$[]'](-1)['$start_with?']("-- ")) !== nil && (!$c._isBoolean || $c == true))) {
                $c = $opal.to_ary(lines.$pop()['$[]']($range(3, -1, false)).$split(", ", 2)), attribution = ($c[0] == null ? nil : $c[0]), citetitle = ($c[1] == null ? nil : $c[1]);
                while ((($i = lines['$[]'](-1)['$empty?']()) !== nil && (!$i._isBoolean || $i == true))) {
                lines.$pop()};
                } else {
                $c = $opal.to_ary(nil), attribution = ($c[0] == null ? nil : $c[0]), citetitle = ($c[1] == null ? nil : $c[1])
              };
              attributes['$[]=']("style", "quote");
              if (attribution !== false && attribution !== nil) {
                attributes['$[]=']("attribution", attribution)};
              if (citetitle !== false && citetitle !== nil) {
                attributes['$[]=']("citetitle", citetitle)};
              block = self.$build_block("quote", "compound", false, parent, $scope.Reader.$new(lines), attributes);
            } else if ((($c = ($i = ($j = ($k = ($l = text_only['$!'](), $l !== false && $l !== nil ?lines.$size()['$>'](1) : $l), $k !== false && $k !== nil ?first_line['$start_with?']("\"") : $k), $j !== false && $j !== nil ?lines['$[]'](-1)['$start_with?']("-- ") : $j), $i !== false && $i !== nil ?lines['$[]'](-2)['$end_with?']("\"") : $i)) !== nil && (!$c._isBoolean || $c == true))) {
              lines['$[]='](0, first_line['$[]']($range(1, -1, false)));
              $c = $opal.to_ary(lines.$pop()['$[]']($range(3, -1, false)).$split(", ", 2)), attribution = ($c[0] == null ? nil : $c[0]), citetitle = ($c[1] == null ? nil : $c[1]);
              while ((($i = lines['$[]'](-1)['$empty?']()) !== nil && (!$i._isBoolean || $i == true))) {
              lines.$pop()};
              lines['$[]='](-1, lines['$[]'](-1).$chop());
              attributes['$[]=']("style", "quote");
              if (attribution !== false && attribution !== nil) {
                attributes['$[]=']("attribution", attribution)};
              if (citetitle !== false && citetitle !== nil) {
                attributes['$[]=']("citetitle", citetitle)};
              block = $scope.Block.$new(parent, "quote", $hash2(["content_model", "source", "attributes"], {"content_model": "simple", "source": lines, "attributes": attributes}));
              } else {
              if ((($c = (($i = style['$==']("normal")) ? (((($j = ((first_char = lines['$[]'](0).$chr()))['$=='](" ")) !== false && $j !== nil) ? $j : first_char['$==']($scope.TAB))) : $i)) !== nil && (!$c._isBoolean || $c == true))) {
                first_line = lines['$[]'](0);
                first_line_shifted = first_line.$lstrip();
                indent = self.$line_length(first_line)['$-'](self.$line_length(first_line_shifted));
                lines['$[]='](0, first_line_shifted);
                ($c = ($i = lines.$size()).$times, $c._p = (TMP_6 = function(i){var self = TMP_6._s || this;
if (i == null) i = nil;
                if (i['$>'](0)) {
                    return lines['$[]='](i, lines['$[]'](i)['$[]']($range(indent, -1, false)))
                    } else {
                    return nil
                  }}, TMP_6._s = self, TMP_6), $c).call($i);};
              block = $scope.Block.$new(parent, "paragraph", $hash2(["content_model", "source", "attributes"], {"content_model": "simple", "source": lines, "attributes": attributes}));
            };
          };
          break;;}
        };
        if ((($b = ($c = block['$!'](), $c !== false && $c !== nil ?block_context : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          if ((($b = ((($c = block_context['$==']("abstract")) !== false && $c !== nil) ? $c : block_context['$==']("partintro"))) !== nil && (!$b._isBoolean || $b == true))) {
            block_context = "open"};
          $case = block_context;if ("admonition"['$===']($case)) {attributes['$[]=']("name", admonition_name = style.$downcase());
          ($b = "caption", $c = attributes, ((($j = $c['$[]']($b)) !== false && $j !== nil) ? $j : $c['$[]=']($b, document.$attributes()['$[]']("" + (admonition_name) + "-caption"))));
          block = self.$build_block(block_context, "compound", terminator, parent, reader, attributes);}else if ("comment"['$===']($case)) {self.$build_block(block_context, "skip", terminator, parent, reader, attributes);
          return nil;}else if ("example"['$===']($case)) {block = self.$build_block(block_context, "compound", terminator, parent, reader, attributes)}else if ("listing"['$===']($case) || "fenced_code"['$===']($case) || "source"['$===']($case)) {if (block_context['$==']("fenced_code")) {
            style = attributes['$[]=']("style", "source");
            $b = $opal.to_ary(this_line['$[]']($range(3, -1, false)).$split(",", 2)), language = ($b[0] == null ? nil : $b[0]), linenums = ($b[1] == null ? nil : $b[1]);
            if ((($b = (($c = language !== false && language !== nil) ? ((language = language.$strip()))['$empty?']()['$!']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
              attributes['$[]=']("language", language);
              if ((($b = (($c = linenums !== false && linenums !== nil) ? linenums.$strip()['$empty?']()['$!']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
                attributes['$[]=']("linenums", "")};};
            terminator = terminator['$[]']($range(0, 2, false));
          } else if (block_context['$==']("source")) {
            $scope.AttributeList.$rekey(attributes, [nil, "language", "linenums"])};
          block = self.$build_block("listing", "verbatim", terminator, parent, reader, attributes);}else if ("literal"['$===']($case)) {block = self.$build_block(block_context, "verbatim", terminator, parent, reader, attributes)}else if ("pass"['$===']($case)) {block = self.$build_block(block_context, "raw", terminator, parent, reader, attributes)}else if ("math"['$===']($case) || "latexmath"['$===']($case) || "asciimath"['$===']($case)) {if (block_context['$==']("math")) {
            attributes['$[]=']("style", (function() {if ((($b = ((default_math_syntax = document.$attributes()['$[]']("math")))['$nil_or_empty?']()) !== nil && (!$b._isBoolean || $b == true))) {
              return "asciimath"
              } else {
              return default_math_syntax
            }; return nil; })())};
          block = self.$build_block("math", "raw", terminator, parent, reader, attributes);}else if ("open"['$===']($case) || "sidebar"['$===']($case)) {block = self.$build_block(block_context, "compound", terminator, parent, reader, attributes)}else if ("table"['$===']($case)) {cursor = reader.$cursor();
          block_reader = $scope.Reader.$new(reader.$read_lines_until($hash2(["terminator", "skip_line_comments"], {"terminator": terminator, "skip_line_comments": true})), cursor);
          $case = terminator.$chr();if (","['$===']($case)) {attributes['$[]=']("format", "csv")}else if (":"['$===']($case)) {attributes['$[]=']("format", "dsv")};
          block = self.$next_table(block_reader, parent, attributes);}else if ("quote"['$===']($case) || "verse"['$===']($case)) {$scope.AttributeList.$rekey(attributes, [nil, "attribution", "citetitle"]);
          block = self.$build_block(block_context, ((function() {if (block_context['$==']("verse")) {
            return "verbatim"
            } else {
            return "compound"
          }; return nil; })()), terminator, parent, reader, attributes);}else {if ((($b = (($c = block_extensions !== false && block_extensions !== nil) ? (extension = extensions['$registered_for_block?'](block_context, cloaked_context)) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
            if ((($b = ((content_model = extension.$config()['$[]']("content_model")))['$==']("skip")['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
              if ((($b = ((pos_attrs = ((($c = extension.$config()['$[]']("pos_attrs")) !== false && $c !== nil) ? $c : [])))['$empty?']()['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
                $scope.AttributeList.$rekey(attributes, [nil].$concat(pos_attrs))};
              if ((($b = (default_attrs = extension.$config()['$[]']("default_attrs"))) !== nil && (!$b._isBoolean || $b == true))) {
                ($b = ($c = default_attrs).$each, $b._p = (TMP_7 = function(k, v){var self = TMP_7._s || this, $a, $b, $c;
if (k == null) k = nil;if (v == null) v = nil;
                return ($a = k, $b = attributes, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, v)))}, TMP_7._s = self, TMP_7), $b).call($c)};};
            block = self.$build_block(block_context, content_model, terminator, parent, reader, attributes, $hash2(["extension"], {"extension": extension}));
            if ((($b = (($j = block !== false && block !== nil) ? content_model['$==']("skip")['$!']() : $j)) !== nil && (!$b._isBoolean || $b == true))) {
              } else {
              attributes.$clear();
              return nil;
            };
            } else {
            self.$raise("Unsupported block type " + (block_context) + " at " + (reader.$line_info()))
          }};};};
        if (block !== false && block !== nil) {
          if ((($a = block['$title?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            block['$title='](attributes['$[]']("title"))
          };
          if (block.$context()['$==']("image")) {
            resolved_target = attributes['$[]']("target");
            block.$document().$register("images", resolved_target);
            ($a = "alt", $b = attributes, ((($j = $b['$[]']($a)) !== false && $j !== nil) ? $j : $b['$[]=']($a, (($k = $opal.Object._scope.File) == null ? $opal.cm('File') : $k).$basename(resolved_target, (($k = $opal.Object._scope.File) == null ? $opal.cm('File') : $k).$extname(resolved_target)).$tr("_-", " "))));
            block.$assign_caption(attributes.$delete("caption"), "figure");
            if ((($a = (scaledwidth = attributes['$[]']("scaledwidth"))) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = ($range(48, 57, false))['$include?']((((($b = scaledwidth['$[]'](-1)) !== false && $b !== nil) ? $b : 0)).$ord())) !== nil && (!$a._isBoolean || $a == true))) {
                attributes['$[]=']("scaledwidth", "" + (scaledwidth) + "%")}};
            } else {
            ($a = block, ((($b = $a.$caption()) !== false && $b !== nil) ? $b : $a['$caption='](attributes.$delete("caption"))))
          };
          block['$style='](attributes['$[]']("style"));
          if ((($a = (block_id = (($b = block, ((($j = $b.$id()) !== false && $j !== nil) ? $j : $b['$id='](attributes['$[]']("id"))))))) !== nil && (!$a._isBoolean || $a == true))) {
            document.$register("ids", [block_id, (((($a = attributes['$[]']("reftext")) !== false && $a !== nil) ? $a : ((function() {if ((($b = block['$title?']()) !== nil && (!$b._isBoolean || $b == true))) {
              return block.$title()
              } else {
              return nil
            }; return nil; })())))])};
          if ((($a = attributes['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            block.$attributes().$update(attributes)
          };
          block.$lock_in_subs();
          if ((($a = block['$sub?']("callouts")) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = (self.$catalog_callouts(block.$source(), document))) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              block.$remove_sub("callouts")
            }};};
        return block;
      });

      $opal.defs(self, '$is_delimited_block?', function(line, return_match_data) {
        var $a, $b, self = this, line_len = nil, tip = nil, tl = nil, fenced_code = nil, tip_3 = nil, context = nil, masq = nil;

        if (return_match_data == null) {
          return_match_data = false
        }
        if ((($a = (($b = ((line_len = line.$length()))['$>'](1)) ? ($scope.DELIMITED_BLOCK_LEADERS['$include?'](line['$[]']($range(0, 1, false)))) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return nil
        };
        if (line_len['$=='](2)) {
          tip = line;
          tl = 2;
          } else {
          if (line_len['$<='](4)) {
            tip = line;
            tl = line_len;
            } else {
            tip = line['$[]']($range(0, 3, false));
            tl = 4;
          };
          fenced_code = false;
          if ((($a = $scope.Compliance.$markdown_syntax()) !== nil && (!$a._isBoolean || $a == true))) {
            tip_3 = ((function() {if (tl['$=='](4)) {
              return tip.$chop()
              } else {
              return tip
            }; return nil; })());
            if (tip_3['$==']("```")) {
              if ((($a = (($b = tl['$=='](4)) ? tip['$end_with?']("`") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                return nil};
              tip = tip_3;
              tl = 3;
              fenced_code = true;
            } else if (tip_3['$==']("~~~")) {
              if ((($a = (($b = tl['$=='](4)) ? tip['$end_with?']("~") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                return nil};
              tip = tip_3;
              tl = 3;
              fenced_code = true;};};
          if ((($a = (($b = tl['$=='](3)) ? fenced_code['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            return nil};
        };
        if ((($a = $scope.DELIMITED_BLOCKS['$has_key?'](tip)) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = ((($b = tl['$<'](4)) !== false && $b !== nil) ? $b : tl['$=='](line_len))) !== nil && (!$a._isBoolean || $a == true))) {
            if (return_match_data !== false && return_match_data !== nil) {
              ($a = $scope.DELIMITED_BLOCKS['$[]'](tip))['$to_a'] ? ($a = $a['$to_a']()) : ($a)._isArray ? $a : ($a = [$a]), context = ($a[0] == null ? nil : $a[0]), masq = ($a[1] == null ? nil : $a[1]);
              return $scope.BlockMatchData.$new(context, masq, tip, tip);
              } else {
              return true
            }
          } else if (((("") + (tip)) + (tip['$[]']($range(-1, -1, false))['$*']((line_len['$-'](tl)))))['$=='](line)) {
            if (return_match_data !== false && return_match_data !== nil) {
              ($a = $scope.DELIMITED_BLOCKS['$[]'](tip))['$to_a'] ? ($a = $a['$to_a']()) : ($a)._isArray ? $a : ($a = [$a]), context = ($a[0] == null ? nil : $a[0]), masq = ($a[1] == null ? nil : $a[1]);
              return $scope.BlockMatchData.$new(context, masq, tip, line);
              } else {
              return true
            }
            } else {
            return nil
          }
          } else {
          return nil
        };
      });

      $opal.defs(self, '$build_block', function(block_context, content_model, terminator, parent, reader, attributes, options) {
        var $a, $b, TMP_8, $c, self = this, skip_processing = nil, parse_as_content_model = nil, lines = nil, block_reader = nil, cursor = nil, indent = nil, extension = nil, block = nil;

        if (options == null) {
          options = $hash2([], {})
        }
        if ((($a = ((($b = content_model['$==']("skip")) !== false && $b !== nil) ? $b : content_model['$==']("raw"))) !== nil && (!$a._isBoolean || $a == true))) {
          skip_processing = content_model['$==']("skip");
          parse_as_content_model = "simple";
          } else {
          skip_processing = false;
          parse_as_content_model = content_model;
        };
        if ((($a = terminator['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
          if (parse_as_content_model['$==']("verbatim")) {
            lines = reader.$read_lines_until($hash2(["break_on_blank_lines", "break_on_list_continuation"], {"break_on_blank_lines": true, "break_on_list_continuation": true}))
            } else {
            if (content_model['$==']("compound")) {
              content_model = "simple"};
            lines = ($a = ($b = reader).$read_lines_until, $a._p = (TMP_8 = function(line){var self = TMP_8._s || this, $a, $b;
if (line == null) line = nil;
            return ($a = $scope.Compliance.$block_terminates_paragraph(), $a !== false && $a !== nil ?(((($b = self['$is_delimited_block?'](line)) !== false && $b !== nil) ? $b : $scope.BlockAttributeLineRx['$=~'](line))) : $a)}, TMP_8._s = self, TMP_8), $a).call($b, $hash2(["break_on_blank_lines", "break_on_list_continuation", "preserve_last_line", "skip_line_comments", "skip_processing"], {"break_on_blank_lines": true, "break_on_list_continuation": true, "preserve_last_line": true, "skip_line_comments": true, "skip_processing": skip_processing}));
          };
          block_reader = nil;
        } else if ((($a = parse_as_content_model['$==']("compound")['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          lines = reader.$read_lines_until($hash2(["terminator", "skip_processing"], {"terminator": terminator, "skip_processing": skip_processing}));
          block_reader = nil;
        } else if (terminator['$=='](false)) {
          lines = nil;
          block_reader = reader;
          } else {
          lines = nil;
          cursor = reader.$cursor();
          block_reader = $scope.Reader.$new(reader.$read_lines_until($hash2(["terminator", "skip_processing"], {"terminator": terminator, "skip_processing": skip_processing})), cursor);
        };
        if (content_model['$==']("skip")) {
          attributes.$clear();
          return lines;};
        if ((($a = (($c = content_model['$==']("verbatim")) ? (indent = attributes['$[]']("indent")) : $c)) !== nil && (!$a._isBoolean || $a == true))) {
          self['$reset_block_indent!'](lines, indent.$to_i())};
        if ((($a = (extension = options['$[]']("extension"))) !== nil && (!$a._isBoolean || $a == true))) {
          attributes.$delete("style");
          if ((($a = (block = extension.$process_method()['$[]'](parent, ((($c = block_reader) !== false && $c !== nil) ? $c : ($scope.Reader.$new(lines))), attributes.$dup()))) !== nil && (!$a._isBoolean || $a == true))) {
            attributes.$replace(block.$attributes());
            if ((($a = (($c = block.$content_model()['$==']("compound")) ? ((lines = block.$lines()))['$nil_or_empty?']()['$!']() : $c)) !== nil && (!$a._isBoolean || $a == true))) {
              content_model = "compound";
              block_reader = $scope.Reader.$new(lines);};
            } else {
            return nil
          };
          } else {
          block = $scope.Block.$new(parent, block_context, $hash2(["content_model", "source", "attributes"], {"content_model": content_model, "source": lines, "attributes": attributes}))
        };
        if ((($a = ($c = (attributes['$has_key?']("title")), $c !== false && $c !== nil ?(block.$document()['$attr?']("" + (block.$context()) + "-caption")) : $c)) !== nil && (!$a._isBoolean || $a == true))) {
          block['$title='](attributes.$delete("title"));
          block.$assign_caption(attributes.$delete("caption"));};
        if (content_model['$==']("compound")) {
          self.$parse_blocks(block_reader, block)};
        return block;
      });

      $opal.defs(self, '$parse_blocks', function(reader, parent) {
        var $a, $b, self = this, block = nil;

        while ((($b = reader['$has_more_lines?']()) !== nil && (!$b._isBoolean || $b == true))) {
        block = $scope.Parser.$next_block(reader, parent);
        if (block !== false && block !== nil) {
          parent['$<<'](block)};};
      });

      $opal.defs(self, '$next_outline_list', function(reader, list_type, parent) {
        var $a, $b, $c, self = this, list_block = nil, match = nil, marker = nil, this_item_level = nil, ancestor = nil, list_item = nil;

        list_block = $scope.List.$new(parent, list_type);
        if (parent.$context()['$=='](list_type)) {
          list_block['$level='](parent.$level()['$+'](1))
          } else {
          list_block['$level='](1)
        };
        while ((($b = ($c = reader['$has_more_lines?'](), $c !== false && $c !== nil ?(match = $scope.ListRxMap['$[]'](list_type).$match(reader.$peek_line())) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
        marker = self.$resolve_list_marker(list_type, match['$[]'](1));
        if ((($b = ($c = list_block['$items?'](), $c !== false && $c !== nil ?marker['$=='](list_block.$items()['$[]'](0).$marker())['$!']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          this_item_level = list_block.$level()['$+'](1);
          ancestor = parent;
          while (ancestor.$context()['$=='](list_type)) {
          if (marker['$=='](ancestor.$items()['$[]'](0).$marker())) {
            this_item_level = ancestor.$level();
            break;;};
          ancestor = ancestor.$parent();};
          } else {
          this_item_level = list_block.$level()
        };
        if ((($b = ((($c = list_block['$items?']()['$!']()) !== false && $c !== nil) ? $c : this_item_level['$=='](list_block.$level()))) !== nil && (!$b._isBoolean || $b == true))) {
          list_item = self.$next_list_item(reader, list_block, match)
        } else if (this_item_level['$<'](list_block.$level())) {
          break;
        } else if (this_item_level['$>'](list_block.$level())) {
          list_block.$items()['$[]'](-1)['$<<'](self.$next_block(reader, list_block))};
        if (list_item !== false && list_item !== nil) {
          list_block['$<<'](list_item)};
        list_item = nil;
        reader.$skip_blank_lines();};
        return list_block;
      });

      $opal.defs(self, '$catalog_callouts', function(text, document) {
        var $a, $b, TMP_9, self = this, found = nil;

        found = false;
        if ((($a = text['$include?']("<")) !== nil && (!$a._isBoolean || $a == true))) {
          ($a = ($b = text).$scan, $a._p = (TMP_9 = function(){var self = TMP_9._s || this, $a, m = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0).$chr()['$==']("\\")['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              document.$callouts().$register(m['$[]'](2))};
            return found = true;}, TMP_9._s = self, TMP_9), $a).call($b, $scope.CalloutQuickScanRx)};
        return found;
      });

      $opal.defs(self, '$catalog_inline_anchors', function(text, document) {
        var $a, $b, TMP_10, self = this;

        if ((($a = text['$include?']("[")) !== nil && (!$a._isBoolean || $a == true))) {
          ($a = ($b = text).$scan, $a._p = (TMP_10 = function(){var self = TMP_10._s || this, $a, m = nil, id = nil, reftext = nil;
            if ($gvars["~"] == null) $gvars["~"] = nil;

          m = $gvars["~"];
            if ((($a = m['$[]'](0)['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              return nil;};
            id = ((($a = m['$[]'](1)) !== false && $a !== nil) ? $a : m['$[]'](3));
            reftext = ((($a = m['$[]'](2)) !== false && $a !== nil) ? $a : m['$[]'](4));
            return document.$register("ids", [id, reftext]);}, TMP_10._s = self, TMP_10), $a).call($b, $scope.InlineAnchorRx)};
        return nil;
      });

      $opal.defs(self, '$next_labeled_list', function(reader, match, parent) {
        var $a, $b, $c, self = this, list_block = nil, previous_pair = nil, sibling_pattern = nil, term = nil, item = nil;

        list_block = $scope.List.$new(parent, "dlist");
        previous_pair = nil;
        sibling_pattern = $scope.DefinitionListSiblingRx['$[]'](match['$[]'](2));
        while ((($b = ($c = reader['$has_more_lines?'](), $c !== false && $c !== nil ?(match = sibling_pattern.$match(reader.$peek_line())) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
        $b = $opal.to_ary(self.$next_list_item(reader, list_block, match, sibling_pattern)), term = ($b[0] == null ? nil : $b[0]), item = ($b[1] == null ? nil : $b[1]);
        if ((($b = (($c = previous_pair !== false && previous_pair !== nil) ? previous_pair['$[]'](-1)['$!']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          previous_pair.$pop();
          previous_pair['$[]'](0)['$<<'](term);
          previous_pair['$<<'](item);
          } else {
          list_block.$items()['$<<']((previous_pair = [[term], item]))
        };};
        return list_block;
      });

      $opal.defs(self, '$next_list_item', function(reader, list_block, match, sibling_trait) {
        var $a, $b, self = this, list_type = nil, list_term = nil, list_item = nil, has_text = nil, text = nil, checkbox = nil, checked = nil, cursor = nil, list_item_reader = nil, comment_lines = nil, subsequent_line = nil, continuation_connects_first_block = nil, content_adjacent = nil, options = nil, new_block = nil;

        if (sibling_trait == null) {
          sibling_trait = nil
        }
        if (((list_type = list_block.$context()))['$==']("dlist")) {
          list_term = $scope.ListItem.$new(list_block, match['$[]'](1));
          list_item = $scope.ListItem.$new(list_block, match['$[]'](3));
          has_text = match['$[]'](3)['$nil_or_empty?']()['$!']();
          } else {
          text = match['$[]'](2);
          checkbox = false;
          if ((($a = (($b = list_type['$==']("ulist")) ? text['$start_with?']("[") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = text['$start_with?']("[ ] ")) !== nil && (!$a._isBoolean || $a == true))) {
              checkbox = true;
              checked = false;
              text = text['$[]']($range(3, -1, false)).$lstrip();
            } else if ((($a = ((($b = text['$start_with?']("[*] ")) !== false && $b !== nil) ? $b : text['$start_with?']("[x] "))) !== nil && (!$a._isBoolean || $a == true))) {
              checkbox = true;
              checked = true;
              text = text['$[]']($range(3, -1, false)).$lstrip();}};
          list_item = $scope.ListItem.$new(list_block, text);
          if (checkbox !== false && checkbox !== nil) {
            list_block.$attributes()['$[]=']("checklist-option", "");
            list_item.$attributes()['$[]=']("checkbox", "");
            if (checked !== false && checked !== nil) {
              list_item.$attributes()['$[]=']("checked", "")};};
          ((($a = sibling_trait) !== false && $a !== nil) ? $a : sibling_trait = self.$resolve_list_marker(list_type, match['$[]'](1), list_block.$items().$size(), true, reader));
          list_item['$marker='](sibling_trait);
          has_text = true;
        };
        reader.$advance();
        cursor = reader.$cursor();
        list_item_reader = $scope.Reader.$new(self.$read_lines_for_list_item(reader, list_type, sibling_trait, has_text), cursor);
        if ((($a = list_item_reader['$has_more_lines?']()) !== nil && (!$a._isBoolean || $a == true))) {
          comment_lines = list_item_reader.$skip_line_comments();
          subsequent_line = list_item_reader.$peek_line();
          if ((($a = comment_lines['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            list_item_reader.$unshift_lines(comment_lines)
          };
          if ((($a = subsequent_line['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            continuation_connects_first_block = subsequent_line['$empty?']();
            if ((($a = ($b = continuation_connects_first_block['$!'](), $b !== false && $b !== nil ?list_type['$==']("dlist")['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              has_text = false};
            content_adjacent = ($a = continuation_connects_first_block['$!'](), $a !== false && $a !== nil ?subsequent_line['$empty?']()['$!']() : $a);
            } else {
            continuation_connects_first_block = false;
            content_adjacent = false;
          };
          options = $hash2(["text"], {"text": has_text['$!']()});
          while ((($b = list_item_reader['$has_more_lines?']()) !== nil && (!$b._isBoolean || $b == true))) {
          new_block = self.$next_block(list_item_reader, list_block, $hash2([], {}), options);
          if (new_block !== false && new_block !== nil) {
            list_item['$<<'](new_block)};};
          list_item.$fold_first(continuation_connects_first_block, content_adjacent);};
        if (list_type['$==']("dlist")) {
          if ((($a = ((($b = list_item['$text?']()) !== false && $b !== nil) ? $b : list_item['$blocks?']())) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            list_item = nil
          };
          return [list_term, list_item];
          } else {
          return list_item
        };
      });

      $opal.defs(self, '$read_lines_for_list_item', function(reader, list_type, sibling_trait, has_text) {
        var $a, $b, $c, $d, TMP_11, $e, TMP_12, $f, TMP_13, TMP_14, $g, $h, TMP_15, self = this, buffer = nil, continuation = nil, within_nested_list = nil, detached_continuation = nil, this_line = nil, prev_line = nil, match = nil, nested_list_type = nil;
        if ($gvars["~"] == null) $gvars["~"] = nil;

        if (sibling_trait == null) {
          sibling_trait = nil
        }
        if (has_text == null) {
          has_text = true
        }
        buffer = [];
        continuation = "inactive";
        within_nested_list = false;
        detached_continuation = nil;
        while ((($b = reader['$has_more_lines?']()) !== nil && (!$b._isBoolean || $b == true))) {
        this_line = reader.$read_line();
        if ((($b = self['$is_sibling_list_item?'](this_line, list_type, sibling_trait)) !== nil && (!$b._isBoolean || $b == true))) {
          break;};
        prev_line = (function() {if ((($b = buffer['$empty?']()) !== nil && (!$b._isBoolean || $b == true))) {
          return nil
          } else {
          return buffer['$[]'](-1)
        }; return nil; })();
        if (prev_line['$==']($scope.LIST_CONTINUATION)) {
          if (continuation['$==']("inactive")) {
            continuation = "active";
            has_text = true;
            if (within_nested_list !== false && within_nested_list !== nil) {
              } else {
              buffer['$[]='](-1, "")
            };};
          if (this_line['$==']($scope.LIST_CONTINUATION)) {
            if ((($b = continuation['$==']("frozen")['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
              continuation = "frozen";
              buffer['$<<'](this_line);};
            this_line = nil;
            continue;;};};
        if ((($b = (match = self['$is_delimited_block?'](this_line, true))) !== nil && (!$b._isBoolean || $b == true))) {
          if (continuation['$==']("active")) {
            buffer['$<<'](this_line);
            buffer.$concat(reader.$read_lines_until($hash2(["terminator", "read_last_line"], {"terminator": match.$terminator(), "read_last_line": true})));
            continuation = "inactive";
            } else {
            break;
          }
        } else if ((($b = ($c = (($d = list_type['$==']("dlist")) ? continuation['$==']("active")['$!']() : $d), $c !== false && $c !== nil ?$scope.BlockAttributeLineRx['$=~'](this_line) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          break;
        } else if ((($b = (($c = continuation['$==']("active")) ? this_line['$empty?']()['$!']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          if ((($b = $scope.LiteralParagraphRx['$=~'](this_line)) !== nil && (!$b._isBoolean || $b == true))) {
            reader.$unshift_line(this_line);
            buffer.$concat(($b = ($c = reader).$read_lines_until, $b._p = (TMP_11 = function(line){var self = TMP_11._s || this, $a;
if (line == null) line = nil;
            return (($a = list_type['$==']("dlist")) ? self['$is_sibling_list_item?'](line, list_type, sibling_trait) : $a)}, TMP_11._s = self, TMP_11), $b).call($c, $hash2(["preserve_last_line", "break_on_blank_lines", "break_on_list_continuation"], {"preserve_last_line": true, "break_on_blank_lines": true, "break_on_list_continuation": true})));
            continuation = "inactive";
          } else if ((($b = ((($d = ((($e = $scope.BlockTitleRx['$=~'](this_line)) !== false && $e !== nil) ? $e : $scope.BlockAttributeLineRx['$=~'](this_line))) !== false && $d !== nil) ? $d : $scope.AttributeEntryRx['$=~'](this_line))) !== nil && (!$b._isBoolean || $b == true))) {
            buffer['$<<'](this_line)
            } else {
            if ((($b = nested_list_type = ($d = ($e = ((function() {if (within_nested_list !== false && within_nested_list !== nil) {
              return ["dlist"]
              } else {
              return $scope.NESTABLE_LIST_CONTEXTS
            }; return nil; })())).$detect, $d._p = (TMP_12 = function(ctx){var self = TMP_12._s || this;
if (ctx == null) ctx = nil;
            return $scope.ListRxMap['$[]'](ctx)['$=~'](this_line)}, TMP_12._s = self, TMP_12), $d).call($e)) !== nil && (!$b._isBoolean || $b == true))) {
              within_nested_list = true;
              if ((($b = (($d = nested_list_type['$==']("dlist")) ? $gvars["~"]['$[]'](3)['$nil_or_empty?']() : $d)) !== nil && (!$b._isBoolean || $b == true))) {
                has_text = false};};
            buffer['$<<'](this_line);
            continuation = "inactive";
          }
        } else if ((($b = ($d = prev_line['$nil?']()['$!'](), $d !== false && $d !== nil ?prev_line['$empty?']() : $d)) !== nil && (!$b._isBoolean || $b == true))) {
          if ((($b = this_line['$empty?']()) !== nil && (!$b._isBoolean || $b == true))) {
            reader.$skip_blank_lines();
            this_line = reader.$read_line();
            if ((($b = ((($d = this_line['$nil?']()) !== false && $d !== nil) ? $d : self['$is_sibling_list_item?'](this_line, list_type, sibling_trait))) !== nil && (!$b._isBoolean || $b == true))) {
              break;};};
          if (this_line['$==']($scope.LIST_CONTINUATION)) {
            detached_continuation = buffer.$size();
            buffer['$<<'](this_line);
          } else if (has_text !== false && has_text !== nil) {
            if ((($b = self['$is_sibling_list_item?'](this_line, list_type, sibling_trait)) !== nil && (!$b._isBoolean || $b == true))) {
              break;
            } else if ((($b = nested_list_type = ($d = ($f = $scope.NESTABLE_LIST_CONTEXTS).$detect, $d._p = (TMP_13 = function(ctx){var self = TMP_13._s || this;
if (ctx == null) ctx = nil;
            return $scope.ListRxMap['$[]'](ctx)['$=~'](this_line)}, TMP_13._s = self, TMP_13), $d).call($f)) !== nil && (!$b._isBoolean || $b == true))) {
              buffer['$<<'](this_line);
              within_nested_list = true;
              if ((($b = (($d = nested_list_type['$==']("dlist")) ? $gvars["~"]['$[]'](3)['$nil_or_empty?']() : $d)) !== nil && (!$b._isBoolean || $b == true))) {
                has_text = false};
            } else if ((($b = $scope.LiteralParagraphRx['$=~'](this_line)) !== nil && (!$b._isBoolean || $b == true))) {
              reader.$unshift_line(this_line);
              buffer.$concat(($b = ($d = reader).$read_lines_until, $b._p = (TMP_14 = function(line){var self = TMP_14._s || this, $a;
if (line == null) line = nil;
              return (($a = list_type['$==']("dlist")) ? self['$is_sibling_list_item?'](line, list_type, sibling_trait) : $a)}, TMP_14._s = self, TMP_14), $b).call($d, $hash2(["preserve_last_line", "break_on_blank_lines", "break_on_list_continuation"], {"preserve_last_line": true, "break_on_blank_lines": true, "break_on_list_continuation": true})));
              } else {
              break;
            }
            } else {
            if (within_nested_list !== false && within_nested_list !== nil) {
              } else {
              buffer.$pop()
            };
            buffer['$<<'](this_line);
            has_text = true;
          };
          } else {
          if ((($b = this_line['$empty?']()['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
            has_text = true};
          if ((($b = nested_list_type = ($g = ($h = ((function() {if (within_nested_list !== false && within_nested_list !== nil) {
            return ["dlist"]
            } else {
            return $scope.NESTABLE_LIST_CONTEXTS
          }; return nil; })())).$detect, $g._p = (TMP_15 = function(ctx){var self = TMP_15._s || this;
if (ctx == null) ctx = nil;
          return $scope.ListRxMap['$[]'](ctx)['$=~'](this_line)}, TMP_15._s = self, TMP_15), $g).call($h)) !== nil && (!$b._isBoolean || $b == true))) {
            within_nested_list = true;
            if ((($b = (($g = nested_list_type['$==']("dlist")) ? $gvars["~"]['$[]'](3)['$nil_or_empty?']() : $g)) !== nil && (!$b._isBoolean || $b == true))) {
              has_text = false};};
          buffer['$<<'](this_line);
        };
        this_line = nil;};
        if (this_line !== false && this_line !== nil) {
          reader.$unshift_line(this_line)};
        if (detached_continuation !== false && detached_continuation !== nil) {
          buffer.$delete_at(detached_continuation)};
        while ((($b = ($g = buffer['$empty?']()['$!'](), $g !== false && $g !== nil ?buffer['$[]'](-1)['$empty?']() : $g)) !== nil && (!$b._isBoolean || $b == true))) {
        buffer.$pop()};
        if ((($a = ($b = buffer['$empty?']()['$!'](), $b !== false && $b !== nil ?buffer['$[]'](-1)['$==']($scope.LIST_CONTINUATION) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          buffer.$pop()};
        return buffer;
      });

      $opal.defs(self, '$initialize_section', function(reader, parent, attributes) {
        var $a, $b, self = this, document = nil, sect_id = nil, sect_reftext = nil, sect_title = nil, sect_level = nil, _ = nil, section = nil, style = nil, id = nil;

        if (attributes == null) {
          attributes = $hash2([], {})
        }
        document = parent.$document();
        $a = $opal.to_ary(self.$parse_section_title(reader, document)), sect_id = ($a[0] == null ? nil : $a[0]), sect_reftext = ($a[1] == null ? nil : $a[1]), sect_title = ($a[2] == null ? nil : $a[2]), sect_level = ($a[3] == null ? nil : $a[3]), _ = ($a[4] == null ? nil : $a[4]);
        if (sect_reftext !== false && sect_reftext !== nil) {
          attributes['$[]=']("reftext", sect_reftext)};
        section = $scope.Section.$new(parent, sect_level, document.$attributes()['$has_key?']("numbered"));
        section['$id='](sect_id);
        section['$title='](sect_title);
        if ((($a = attributes['$[]'](1)) !== nil && (!$a._isBoolean || $a == true))) {
          $a = $opal.to_ary(self.$parse_style_attribute(attributes, reader)), style = ($a[0] == null ? nil : $a[0]), _ = ($a[1] == null ? nil : $a[1]);
          if (style !== false && style !== nil) {
            section['$sectname='](style);
            section['$special='](true);
            if ((($a = (($b = section.$sectname()['$==']("abstract")) ? document.$doctype()['$==']("book") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              section['$sectname=']("sect1");
              section['$special='](false);
              section['$level='](1);};
            } else {
            section['$sectname=']("sect" + (section.$level()))
          };
        } else if ((($a = (($b = sect_title.$downcase()['$==']("synopsis")) ? document.$doctype()['$==']("manpage") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          section['$special='](true);
          section['$sectname=']("synopsis");
          } else {
          section['$sectname=']("sect" + (section.$level()))
        };
        if ((($a = ($b = section.$id()['$!'](), $b !== false && $b !== nil ?(id = attributes['$[]']("id")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          section['$id='](id)
          } else {
          ($a = section, ((($b = $a.$id()) !== false && $b !== nil) ? $b : $a['$id='](section.$generate_id())))
        };
        if ((($a = section.$id()) !== nil && (!$a._isBoolean || $a == true))) {
          section.$document().$register("ids", [section.$id(), (((($a = attributes['$[]']("reftext")) !== false && $a !== nil) ? $a : section.$title()))])};
        section.$update_attributes(attributes);
        reader.$skip_blank_lines();
        return section;
      });

      $opal.defs(self, '$section_level', function(line) {
        var self = this;

        return $scope.SECTION_LEVELS['$[]'](line.$chr());
      });

      $opal.defs(self, '$single_line_section_level', function(marker) {
        var self = this;

        return marker.$length()['$-'](1);
      });

      $opal.defs(self, '$is_next_line_section?', function(reader, attributes) {
        var $a, $b, $c, $d, self = this, val = nil, ord_0 = nil;

        if ((($a = ($b = ($c = ((val = attributes['$[]'](1)))['$nil?']()['$!'](), $c !== false && $c !== nil ?(((($d = ((ord_0 = val['$[]'](0).$ord()))['$=='](100)) !== false && $d !== nil) ? $d : ord_0['$=='](102))) : $c), $b !== false && $b !== nil ?val['$=~']($scope.FloatingTitleStyleRx) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return false};
        if ((($a = reader['$has_more_lines?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return false
        };
        if ((($a = $scope.Compliance.$underline_style_section_titles()) !== nil && (!$a._isBoolean || $a == true))) {
          return ($a = self)['$is_section_title?'].apply($a, [].concat(reader.$peek_lines(2)))
          } else {
          return self['$is_section_title?'](reader.$peek_line())
        };
      });

      $opal.defs(self, '$is_next_line_document_title?', function(reader, attributes) {
        var self = this;

        return self['$is_next_line_section?'](reader, attributes)['$=='](0);
      });

      $opal.defs(self, '$is_section_title?', function(line1, line2) {
        var $a, $b, self = this, level = nil;

        if (line2 == null) {
          line2 = nil
        }
        if ((($a = (level = self['$is_single_line_section_title?'](line1))) !== nil && (!$a._isBoolean || $a == true))) {
          return level
        } else if ((($a = (($b = line2 !== false && line2 !== nil) ? (level = self['$is_two_line_section_title?'](line1, line2)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return level
          } else {
          return false
        };
      });

      $opal.defs(self, '$is_single_line_section_title?', function(line1) {
        var $a, $b, $c, $d, self = this, first_char = nil, match = nil;

        first_char = (function() {if (line1 !== false && line1 !== nil) {
          return line1.$chr()
          } else {
          return nil
        }; return nil; })();
        if ((($a = ($b = (((($c = first_char['$==']("=")) !== false && $c !== nil) ? $c : (($d = $scope.Compliance.$markdown_syntax(), $d !== false && $d !== nil ?first_char['$==']("#") : $d)))), $b !== false && $b !== nil ?(match = $scope.AtxSectionRx.$match(line1)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$single_line_section_level(match['$[]'](1))
          } else {
          return false
        };
      });

      $opal.defs(self, '$is_two_line_section_title?', function(line1, line2) {
        var $a, $b, $c, $d, $e, $f, self = this;

        if ((($a = ($b = ($c = ($d = ($e = (($f = line1 !== false && line1 !== nil) ? line2 : $f), $e !== false && $e !== nil ?$scope.SECTION_LEVELS['$has_key?'](line2.$chr()) : $e), $d !== false && $d !== nil ?line2['$=~']($scope.SetextSectionLineRx) : $d), $c !== false && $c !== nil ?line1['$=~']($scope.SetextSectionTitleRx) : $c), $b !== false && $b !== nil ?(self.$line_length(line1)['$-'](self.$line_length(line2))).$abs()['$<='](1) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$section_level(line2)
          } else {
          return false
        };
      });

      $opal.defs(self, '$parse_section_title', function(reader, document) {
        var $a, $b, $c, $d, $e, self = this, line1 = nil, sect_id = nil, sect_title = nil, sect_level = nil, sect_reftext = nil, single_line = nil, first_char = nil, match = nil, anchor_match = nil, line2 = nil, name_match = nil;

        line1 = reader.$read_line();
        sect_id = nil;
        sect_title = nil;
        sect_level = -1;
        sect_reftext = nil;
        single_line = true;
        first_char = line1.$chr();
        if ((($a = ($b = (((($c = first_char['$==']("=")) !== false && $c !== nil) ? $c : (($d = $scope.Compliance.$markdown_syntax(), $d !== false && $d !== nil ?first_char['$==']("#") : $d)))), $b !== false && $b !== nil ?(match = $scope.AtxSectionRx.$match(line1)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          sect_level = self.$single_line_section_level(match['$[]'](1));
          sect_title = match['$[]'](2);
          if ((($a = ($b = sect_title['$end_with?']("]]"), $b !== false && $b !== nil ?(anchor_match = $scope.InlineSectionAnchorRx.$match(sect_title)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = anchor_match['$[]'](2)['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
              sect_title = anchor_match['$[]'](1);
              sect_id = anchor_match['$[]'](3);
              sect_reftext = anchor_match['$[]'](4);}};
        } else if ((($a = $scope.Compliance.$underline_style_section_titles()) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = ($b = ($c = ($d = ($e = (line2 = reader.$peek_line(true)), $e !== false && $e !== nil ?$scope.SECTION_LEVELS['$has_key?'](line2.$chr()) : $e), $d !== false && $d !== nil ?line2['$=~']($scope.SetextSectionLineRx) : $d), $c !== false && $c !== nil ?(name_match = $scope.SetextSectionTitleRx.$match(line1)) : $c), $b !== false && $b !== nil ?(self.$line_length(line1)['$-'](self.$line_length(line2))).$abs()['$<='](1) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            sect_title = name_match['$[]'](1);
            if ((($a = ($b = sect_title['$end_with?']("]]"), $b !== false && $b !== nil ?(anchor_match = $scope.InlineSectionAnchorRx.$match(sect_title)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = anchor_match['$[]'](2)['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
                sect_title = anchor_match['$[]'](1);
                sect_id = anchor_match['$[]'](3);
                sect_reftext = anchor_match['$[]'](4);}};
            sect_level = self.$section_level(line2);
            single_line = false;
            reader.$advance();}};
        if (sect_level['$>='](0)) {
          sect_level = sect_level['$+'](document.$attr("leveloffset", 0).$to_i())};
        return [sect_id, sect_reftext, sect_title, sect_level, single_line];
      });

      $opal.defs(self, '$line_length', function(line) {
        var $a, self = this;

        if ((($a = $scope.FORCE_UNICODE_LINE_LENGTH) !== nil && (!$a._isBoolean || $a == true))) {
          return line.$scan($scope.UnicodeCharScanRx).$length()
          } else {
          return line.$length()
        };
      });

      $opal.defs(self, '$parse_header_metadata', function(reader, document) {
        var $a, $b, TMP_16, $c, TMP_17, $d, self = this, metadata = nil, implicit_author = nil, implicit_authors = nil, author_metadata = nil, rev_metadata = nil, rev_line = nil, match = nil, author_line = nil, authors = nil, author_key = nil;

        if (document == null) {
          document = nil
        }
        self.$process_attribute_entries(reader, document);
        metadata = $hash2([], {});
        implicit_author = nil;
        implicit_authors = nil;
        if ((($a = ($b = reader['$has_more_lines?'](), $b !== false && $b !== nil ?reader['$next_line_empty?']()['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          author_metadata = self.$process_authors(reader.$read_line());
          if ((($a = author_metadata['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            if (document !== false && document !== nil) {
              ($a = ($b = author_metadata).$each, $a._p = (TMP_16 = function(key, val){var self = TMP_16._s || this, $a, $b;
if (key == null) key = nil;if (val == null) val = nil;
              if ((($a = document.$attributes()['$has_key?'](key)) !== nil && (!$a._isBoolean || $a == true))) {
                  return nil
                  } else {
                  return document.$attributes()['$[]='](key, ((function() {if ((($a = (val['$is_a?']((($b = $opal.Object._scope.String) == null ? $opal.cm('String') : $b)))) !== nil && (!$a._isBoolean || $a == true))) {
                    return document.$apply_header_subs(val)
                    } else {
                    return val
                  }; return nil; })()))
                }}, TMP_16._s = self, TMP_16), $a).call($b);
              implicit_author = document.$attributes()['$[]']("author");
              implicit_authors = document.$attributes()['$[]']("authors");};
            metadata = author_metadata;
          };
          self.$process_attribute_entries(reader, document);
          rev_metadata = $hash2([], {});
          if ((($a = ($c = reader['$has_more_lines?'](), $c !== false && $c !== nil ?reader['$next_line_empty?']()['$!']() : $c)) !== nil && (!$a._isBoolean || $a == true))) {
            rev_line = reader.$read_line();
            if ((($a = (match = $scope.RevisionInfoLineRx.$match(rev_line))) !== nil && (!$a._isBoolean || $a == true))) {
              rev_metadata['$[]=']("revdate", match['$[]'](2).$strip());
              if ((($a = match['$[]'](1)['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                rev_metadata['$[]=']("revnumber", match['$[]'](1).$rstrip())
              };
              if ((($a = match['$[]'](3)['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                rev_metadata['$[]=']("revremark", match['$[]'](3).$rstrip())
              };
              } else {
              reader.$unshift_line(rev_line)
            };};
          if ((($a = rev_metadata['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            if (document !== false && document !== nil) {
              ($a = ($c = rev_metadata).$each, $a._p = (TMP_17 = function(key, val){var self = TMP_17._s || this, $a;
if (key == null) key = nil;if (val == null) val = nil;
              if ((($a = document.$attributes()['$has_key?'](key)) !== nil && (!$a._isBoolean || $a == true))) {
                  return nil
                  } else {
                  return document.$attributes()['$[]='](key, document.$apply_header_subs(val))
                }}, TMP_17._s = self, TMP_17), $a).call($c)};
            metadata.$update(rev_metadata);
          };
          self.$process_attribute_entries(reader, document);
          reader.$skip_blank_lines();};
        if (document !== false && document !== nil) {
          author_metadata = nil;
          if ((($a = ($d = document.$attributes()['$has_key?']("author"), $d !== false && $d !== nil ?((author_line = document.$attributes()['$[]']("author")))['$=='](implicit_author)['$!']() : $d)) !== nil && (!$a._isBoolean || $a == true))) {
            author_metadata = self.$process_authors(author_line, true, false)
          } else if ((($a = ($d = document.$attributes()['$has_key?']("authors"), $d !== false && $d !== nil ?((author_line = document.$attributes()['$[]']("authors")))['$=='](implicit_authors)['$!']() : $d)) !== nil && (!$a._isBoolean || $a == true))) {
            author_metadata = self.$process_authors(author_line, true)
            } else {
            authors = [];
            author_key = "author_" + (authors.$size()['$+'](1));
            while ((($d = document.$attributes()['$has_key?'](author_key)) !== nil && (!$d._isBoolean || $d == true))) {
            authors['$<<'](document.$attributes()['$[]'](author_key));
            author_key = "author_" + (authors.$size()['$+'](1));};
            if (authors.$size()['$=='](1)) {
              author_metadata = self.$process_authors(authors['$[]'](0), true, false)
            } else if (authors.$size()['$>'](1)) {
              author_metadata = self.$process_authors(authors.$join("; "), true)};
          };
          if (author_metadata !== false && author_metadata !== nil) {
            document.$attributes().$update(author_metadata);
            if ((($a = ($d = document.$attributes()['$has_key?']("email")['$!'](), $d !== false && $d !== nil ?document.$attributes()['$has_key?']("email_1") : $d)) !== nil && (!$a._isBoolean || $a == true))) {
              document.$attributes()['$[]=']("email", document.$attributes()['$[]']("email_1"))};};};
        return metadata;
      });

      $opal.defs(self, '$process_authors', function(author_line, names_only, multiple) {
        var $a, $b, TMP_18, $c, TMP_19, self = this, author_metadata = nil, keys = nil, author_entries = nil;

        if (names_only == null) {
          names_only = false
        }
        if (multiple == null) {
          multiple = true
        }
        author_metadata = $hash2([], {});
        keys = ["author", "authorinitials", "firstname", "middlename", "lastname", "email"];
        author_entries = (function() {if (multiple !== false && multiple !== nil) {
          return ($a = ($b = (author_line.$split(";"))).$map, $a._p = (TMP_18 = function(line){var self = TMP_18._s || this;
if (line == null) line = nil;
          return line.$strip()}, TMP_18._s = self, TMP_18), $a).call($b)
          } else {
          return [author_line]
        }; return nil; })();
        ($a = ($c = author_entries).$each_with_index, $a._p = (TMP_19 = function(author_entry, idx){var self = TMP_19._s || this, $a, $b, TMP_20, $c, TMP_21, $d, TMP_22, key_map = nil, segments = nil, match = nil, fname = nil, mname = nil, lname = nil;
if (author_entry == null) author_entry = nil;if (idx == null) idx = nil;
        if ((($a = author_entry['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return nil;};
          key_map = $hash2([], {});
          if ((($a = idx['$zero?']()) !== nil && (!$a._isBoolean || $a == true))) {
            ($a = ($b = keys).$each, $a._p = (TMP_20 = function(key){var self = TMP_20._s || this;
if (key == null) key = nil;
            return key_map['$[]='](key.$to_sym(), key)}, TMP_20._s = self, TMP_20), $a).call($b)
            } else {
            ($a = ($c = keys).$each, $a._p = (TMP_21 = function(key){var self = TMP_21._s || this;
if (key == null) key = nil;
            return key_map['$[]='](key.$to_sym(), "" + (key) + "_" + (idx['$+'](1)))}, TMP_21._s = self, TMP_21), $a).call($c)
          };
          segments = nil;
          if (names_only !== false && names_only !== nil) {
            segments = author_entry.$split(" ", 3)
          } else if ((($a = (match = $scope.AuthorInfoLineRx.$match(author_entry))) !== nil && (!$a._isBoolean || $a == true))) {
            segments = match.$to_a();
            segments.$shift();};
          if ((($a = segments['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
            author_metadata['$[]='](key_map['$[]']("author"), author_metadata['$[]='](key_map['$[]']("firstname"), fname = author_entry.$strip().$tr_s(" ", " ")));
            author_metadata['$[]='](key_map['$[]']("authorinitials"), fname['$[]'](0, 1));
            } else {
            author_metadata['$[]='](key_map['$[]']("firstname"), fname = segments['$[]'](0).$tr("_", " "));
            author_metadata['$[]='](key_map['$[]']("author"), fname);
            author_metadata['$[]='](key_map['$[]']("authorinitials"), fname['$[]'](0, 1));
            if ((($a = ($d = segments['$[]'](1)['$nil?']()['$!'](), $d !== false && $d !== nil ?segments['$[]'](2)['$nil?']()['$!']() : $d)) !== nil && (!$a._isBoolean || $a == true))) {
              author_metadata['$[]='](key_map['$[]']("middlename"), mname = segments['$[]'](1).$tr("_", " "));
              author_metadata['$[]='](key_map['$[]']("lastname"), lname = segments['$[]'](2).$tr("_", " "));
              author_metadata['$[]='](key_map['$[]']("author"), [fname, mname, lname].$join(" "));
              author_metadata['$[]='](key_map['$[]']("authorinitials"), [fname['$[]'](0, 1), mname['$[]'](0, 1), lname['$[]'](0, 1)].$join());
            } else if ((($a = segments['$[]'](1)['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              author_metadata['$[]='](key_map['$[]']("lastname"), lname = segments['$[]'](1).$tr("_", " "));
              author_metadata['$[]='](key_map['$[]']("author"), [fname, lname].$join(" "));
              author_metadata['$[]='](key_map['$[]']("authorinitials"), [fname['$[]'](0, 1), lname['$[]'](0, 1)].$join());};
            if ((($a = ((($d = names_only) !== false && $d !== nil) ? $d : segments['$[]'](3)['$nil?']())) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              author_metadata['$[]='](key_map['$[]']("email"), segments['$[]'](3))
            };
          };
          author_metadata['$[]=']("authorcount", idx['$+'](1));
          if (idx['$=='](1)) {
            ($a = ($d = keys).$each, $a._p = (TMP_22 = function(key){var self = TMP_22._s || this, $a;
if (key == null) key = nil;
            if ((($a = author_metadata['$has_key?'](key)) !== nil && (!$a._isBoolean || $a == true))) {
                return author_metadata['$[]=']("" + (key) + "_1", author_metadata['$[]'](key))
                } else {
                return nil
              }}, TMP_22._s = self, TMP_22), $a).call($d)};
          if ((($a = idx['$zero?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return author_metadata['$[]=']("authors", author_metadata['$[]'](key_map['$[]']("author")))
            } else {
            return author_metadata['$[]=']("authors", "" + (author_metadata['$[]']("authors")) + ", " + (author_metadata['$[]'](key_map['$[]']("author"))))
          };}, TMP_19._s = self, TMP_19), $a).call($c);
        return author_metadata;
      });

      $opal.defs(self, '$parse_block_metadata_lines', function(reader, parent, attributes, options) {
        var $a, $b, self = this;

        if (attributes == null) {
          attributes = $hash2([], {})
        }
        if (options == null) {
          options = $hash2([], {})
        }
        while ((($b = self.$parse_block_metadata_line(reader, parent, attributes, options)) !== nil && (!$b._isBoolean || $b == true))) {
        reader.$advance();
        reader.$skip_blank_lines();};
        return attributes;
      });

      $opal.defs(self, '$parse_block_metadata_line', function(reader, parent, attributes, options) {
        var $a, $b, $c, self = this, next_line = nil, commentish = nil, match = nil, terminator = nil, in_square_brackets = nil;

        if (options == null) {
          options = $hash2([], {})
        }
        if ((($a = reader['$has_more_lines?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return false
        };
        next_line = reader.$peek_line();
        if ((($a = ($b = (commentish = next_line['$start_with?']("//")), $b !== false && $b !== nil ?(match = $scope.CommentBlockRx.$match(next_line)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          terminator = match['$[]'](0);
          reader.$read_lines_until($hash2(["skip_first_line", "preserve_last_line", "terminator", "skip_processing"], {"skip_first_line": true, "preserve_last_line": true, "terminator": terminator, "skip_processing": true}));
        } else if ((($a = (($b = commentish !== false && commentish !== nil) ? $scope.CommentLineRx['$=~'](next_line) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
        } else if ((($a = ($b = ($c = options['$[]']("text")['$!'](), $c !== false && $c !== nil ?next_line['$start_with?'](":") : $c), $b !== false && $b !== nil ?(match = $scope.AttributeEntryRx.$match(next_line)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          self.$process_attribute_entry(reader, parent, attributes, match)
        } else if ((($a = ($b = (in_square_brackets = ($c = next_line['$start_with?']("["), $c !== false && $c !== nil ?next_line['$end_with?']("]") : $c)), $b !== false && $b !== nil ?(match = $scope.BlockAnchorRx.$match(next_line)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = match['$[]'](1)['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            attributes['$[]=']("id", match['$[]'](1));
            if ((($a = match['$[]'](2)['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              attributes['$[]=']("reftext", match['$[]'](2))
            };
          }
        } else if ((($a = (($b = in_square_brackets !== false && in_square_brackets !== nil) ? (match = $scope.BlockAttributeListRx.$match(next_line)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          parent.$document().$parse_attributes(match['$[]'](1), [], $hash2(["sub_input", "into"], {"sub_input": true, "into": attributes}))
        } else if ((($a = ($b = options['$[]']("text")['$!'](), $b !== false && $b !== nil ?(match = $scope.BlockTitleRx.$match(next_line)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          attributes['$[]=']("title", match['$[]'](1))
          } else {
          return false
        };
        return true;
      });

      $opal.defs(self, '$process_attribute_entries', function(reader, parent, attributes) {
        var $a, $b, self = this;

        if (attributes == null) {
          attributes = nil
        }
        reader.$skip_comment_lines();
        while ((($b = self.$process_attribute_entry(reader, parent, attributes)) !== nil && (!$b._isBoolean || $b == true))) {
        reader.$advance();
        reader.$skip_comment_lines();};
      });

      $opal.defs(self, '$process_attribute_entry', function(reader, parent, attributes, match) {
        var $a, $b, self = this, name = nil, value = nil, next_line = nil;

        if (attributes == null) {
          attributes = nil
        }
        if (match == null) {
          match = nil
        }
        ((($a = match) !== false && $a !== nil) ? $a : match = ((function() {if ((($b = reader['$has_more_lines?']()) !== nil && (!$b._isBoolean || $b == true))) {
          return $scope.AttributeEntryRx.$match(reader.$peek_line())
          } else {
          return nil
        }; return nil; })()));
        if (match !== false && match !== nil) {
          name = match['$[]'](1);
          value = ((($a = match['$[]'](2)) !== false && $a !== nil) ? $a : "");
          if ((($a = value['$end_with?']($scope.LINE_BREAK)) !== nil && (!$a._isBoolean || $a == true))) {
            value = value.$chop().$rstrip();
            while ((($b = reader.$advance()) !== nil && (!$b._isBoolean || $b == true))) {
            next_line = reader.$peek_line().$strip();
            if ((($b = next_line['$empty?']()) !== nil && (!$b._isBoolean || $b == true))) {
              break;};
            if ((($b = next_line['$end_with?']($scope.LINE_BREAK)) !== nil && (!$b._isBoolean || $b == true))) {
              value = "" + (value) + " " + (next_line.$chop().$rstrip())
              } else {
              value = "" + (value) + " " + (next_line);
              break;;
            };};};
          self.$store_attribute(name, value, ((function() {if (parent !== false && parent !== nil) {
            return parent.$document()
            } else {
            return nil
          }; return nil; })()), attributes);
          return true;
          } else {
          return false
        };
      });

      $opal.defs(self, '$store_attribute', function(name, value, doc, attrs) {
        var $a, $b, self = this, accessible = nil;

        if (doc == null) {
          doc = nil
        }
        if (attrs == null) {
          attrs = nil
        }
        if ((($a = name['$end_with?']("!")) !== nil && (!$a._isBoolean || $a == true))) {
          value = nil;
          name = name.$chop();
        } else if ((($a = name['$start_with?']("!")) !== nil && (!$a._isBoolean || $a == true))) {
          value = nil;
          name = name['$[]']($range(1, -1, false));};
        name = self.$sanitize_attribute_name(name);
        accessible = true;
        if (doc !== false && doc !== nil) {
          accessible = (function() {if ((($a = value['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return doc.$delete_attribute(name)
            } else {
            return doc.$set_attribute(name, value)
          }; return nil; })()};
        if ((($a = ((($b = accessible['$!']()) !== false && $b !== nil) ? $b : attrs['$nil?']())) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          ($scope.Document)._scope.AttributeEntry.$new(name, value).$save_to(attrs)
        };
        return [name, value];
      });

      $opal.defs(self, '$resolve_list_marker', function(list_type, marker, ordinal, validate, reader) {
        var $a, $b, self = this;

        if (ordinal == null) {
          ordinal = 0
        }
        if (validate == null) {
          validate = false
        }
        if (reader == null) {
          reader = nil
        }
        if ((($a = (($b = list_type['$==']("olist")) ? marker['$start_with?'](".")['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$resolve_ordered_list_marker(marker, ordinal, validate, reader)
        } else if (list_type['$==']("colist")) {
          return "<1>"
          } else {
          return marker
        };
      });

      $opal.defs(self, '$resolve_ordered_list_marker', function(marker, ordinal, validate, reader) {
        var $a, $b, TMP_23, $c, self = this, number_style = nil, expected = nil, actual = nil, $case = nil;

        if (ordinal == null) {
          ordinal = 0
        }
        if (validate == null) {
          validate = false
        }
        if (reader == null) {
          reader = nil
        }
        number_style = ($a = ($b = $scope.ORDERED_LIST_STYLES).$detect, $a._p = (TMP_23 = function(s){var self = TMP_23._s || this;
if (s == null) s = nil;
        return $scope.OrderedListMarkerRxMap['$[]'](s)['$=~'](marker)}, TMP_23._s = self, TMP_23), $a).call($b);
        expected = actual = nil;
        $case = number_style;if ("arabic"['$===']($case)) {if (validate !== false && validate !== nil) {
          expected = ordinal['$+'](1);
          actual = marker.$to_i();};
        marker = "1.";}else if ("loweralpha"['$===']($case)) {if (validate !== false && validate !== nil) {
          expected = ("a"['$[]'](0).$ord()['$+'](ordinal)).$chr();
          actual = marker.$chomp(".");};
        marker = "a.";}else if ("upperalpha"['$===']($case)) {if (validate !== false && validate !== nil) {
          expected = ("A"['$[]'](0).$ord()['$+'](ordinal)).$chr();
          actual = marker.$chomp(".");};
        marker = "A.";}else if ("lowerroman"['$===']($case)) {if (validate !== false && validate !== nil) {
          expected = ordinal['$+'](1);
          actual = self.$roman_numeral_to_int(marker.$chomp(")"));};
        marker = "i)";}else if ("upperroman"['$===']($case)) {if (validate !== false && validate !== nil) {
          expected = ordinal['$+'](1);
          actual = self.$roman_numeral_to_int(marker.$chomp(")"));};
        marker = "I)";};
        if ((($a = (($c = validate !== false && validate !== nil) ? expected['$=='](actual)['$!']() : $c)) !== nil && (!$a._isBoolean || $a == true))) {
          self.$warn("asciidoctor: WARNING: " + (reader.$line_info()) + ": list item index: expected " + (expected) + ", got " + (actual))};
        return marker;
      });

      $opal.defs(self, '$is_sibling_list_item?', function(line, list_type, sibling_trait) {
        var $a, $b, self = this, matcher = nil, expected_marker = nil, m = nil;

        if ((($a = sibling_trait['$is_a?']((($b = $opal.Object._scope.Regexp) == null ? $opal.cm('Regexp') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          matcher = sibling_trait;
          expected_marker = false;
          } else {
          matcher = $scope.ListRxMap['$[]'](list_type);
          expected_marker = sibling_trait;
        };
        if ((($a = (m = matcher.$match(line))) !== nil && (!$a._isBoolean || $a == true))) {
          if (expected_marker !== false && expected_marker !== nil) {
            return expected_marker['$=='](self.$resolve_list_marker(list_type, m['$[]'](1)))
            } else {
            return true
          }
          } else {
          return false
        };
      });

      $opal.defs(self, '$next_table', function(table_reader, parent, attributes) {
        var $a, $b, $c, $d, $e, $f, TMP_24, self = this, table = nil, explicit_col_specs = nil, skipped = nil, parser_ctx = nil, loop_idx = nil, line = nil, next_line = nil, next_cell_spec = nil, seen = nil, m = nil, cell_text = nil, even_width = nil;

        table = $scope.Table.$new(parent, attributes);
        if ((($a = (attributes['$has_key?']("title"))) !== nil && (!$a._isBoolean || $a == true))) {
          table['$title='](attributes.$delete("title"));
          table.$assign_caption(attributes.$delete("caption"));};
        if ((($a = attributes['$has_key?']("cols")) !== nil && (!$a._isBoolean || $a == true))) {
          table.$create_columns(self.$parse_col_specs(attributes['$[]']("cols")));
          explicit_col_specs = true;
          } else {
          explicit_col_specs = false
        };
        skipped = table_reader.$skip_blank_lines();
        parser_ctx = ($scope.Table)._scope.ParserContext.$new(table_reader, table, attributes);
        loop_idx = -1;
        while ((($b = table_reader['$has_more_lines?']()) !== nil && (!$b._isBoolean || $b == true))) {
        loop_idx = loop_idx['$+'](1);
        line = table_reader.$read_line();
        if ((($b = ($c = ($d = ($e = (($f = skipped['$=='](0)) ? loop_idx['$zero?']() : $f), $e !== false && $e !== nil ?attributes['$has_key?']("options")['$!']() : $e), $d !== false && $d !== nil ?((next_line = table_reader.$peek_line()))['$nil?']()['$!']() : $d), $c !== false && $c !== nil ?next_line['$empty?']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          table['$has_header_option='](true);
          table.$set_option("header");};
        if (parser_ctx.$format()['$==']("psv")) {
          if ((($b = parser_ctx['$starts_with_delimiter?'](line)) !== nil && (!$b._isBoolean || $b == true))) {
            line = line['$[]']($range(1, -1, false));
            parser_ctx.$close_open_cell();
            } else {
            $b = $opal.to_ary(self.$parse_cell_spec(line, "start")), next_cell_spec = ($b[0] == null ? nil : $b[0]), line = ($b[1] == null ? nil : $b[1]);
            if ((($b = next_cell_spec['$nil?']()['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
              parser_ctx.$close_open_cell(next_cell_spec)};
          }};
        seen = false;
        while ((($c = ((($d = seen['$!']()) !== false && $d !== nil) ? $d : line['$empty?']()['$!']())) !== nil && (!$c._isBoolean || $c == true))) {
        seen = true;
        if ((($c = (m = parser_ctx.$match_delimiter(line))) !== nil && (!$c._isBoolean || $c == true))) {
          if (parser_ctx.$format()['$==']("csv")) {
            if ((($c = parser_ctx['$buffer_has_unclosed_quotes?'](m.$pre_match())) !== nil && (!$c._isBoolean || $c == true))) {
              line = parser_ctx.$skip_matched_delimiter(m);
              continue;;}
          } else if ((($c = m.$pre_match()['$end_with?']("\\")) !== nil && (!$c._isBoolean || $c == true))) {
            line = parser_ctx.$skip_matched_delimiter(m, true);
            continue;;};
          if (parser_ctx.$format()['$==']("psv")) {
            $c = $opal.to_ary(self.$parse_cell_spec(m.$pre_match(), "end")), next_cell_spec = ($c[0] == null ? nil : $c[0]), cell_text = ($c[1] == null ? nil : $c[1]);
            parser_ctx.$push_cell_spec(next_cell_spec);
            parser_ctx['$buffer=']("" + (parser_ctx.$buffer()) + (cell_text));
            } else {
            parser_ctx['$buffer=']("" + (parser_ctx.$buffer()) + (m.$pre_match()))
          };
          line = m.$post_match();
          parser_ctx.$close_cell();
          } else {
          parser_ctx['$buffer=']("" + (parser_ctx.$buffer()) + (line) + ($scope.EOL));
          if (parser_ctx.$format()['$==']("csv")) {
            parser_ctx['$buffer=']("" + (parser_ctx.$buffer().$rstrip()) + " ")};
          line = "";
          if ((($c = ((($d = parser_ctx.$format()['$==']("psv")) !== false && $d !== nil) ? $d : ((($e = parser_ctx.$format()['$==']("csv")) ? parser_ctx['$buffer_has_unclosed_quotes?']() : $e)))) !== nil && (!$c._isBoolean || $c == true))) {
            parser_ctx.$keep_cell_open()
            } else {
            parser_ctx.$close_cell(true)
          };
        };};
        if ((($b = parser_ctx['$cell_open?']()) !== nil && (!$b._isBoolean || $b == true))) {
          } else {
          skipped = table_reader.$skip_blank_lines()
        };
        if ((($b = table_reader['$has_more_lines?']()['$!']()) !== nil && (!$b._isBoolean || $b == true))) {
          parser_ctx.$close_cell(true)};};
        ($a = "colcount", $b = table.$attributes(), ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, parser_ctx.$col_count())));
        if ((($a = explicit_col_specs['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          even_width = ((100.0)['$/'](parser_ctx.$col_count())).$floor();
          ($a = ($b = table.$columns()).$each, $a._p = (TMP_24 = function(c){var self = TMP_24._s || this;
if (c == null) c = nil;
          return c.$assign_width(0, even_width)}, TMP_24._s = self, TMP_24), $a).call($b);};
        table.$partition_header_footer(attributes);
        return table;
      });

      $opal.defs(self, '$parse_col_specs', function(records) {
        var $a, $b, TMP_25, $c, TMP_26, self = this, specs = nil;

        if ((($a = $scope.DigitsRx['$=~'](records)) !== nil && (!$a._isBoolean || $a == true))) {
          return ($a = ($b = (($c = $opal.Object._scope.Array) == null ? $opal.cm('Array') : $c)).$new, $a._p = (TMP_25 = function(){var self = TMP_25._s || this;

          return $hash2(["width"], {"width": 1})}, TMP_25._s = self, TMP_25), $a).call($b, records.$to_i())};
        specs = [];
        ($a = ($c = records.$split(",")).$each, $a._p = (TMP_26 = function(record){var self = TMP_26._s || this, $a, $b, TMP_27, m = nil, spec = nil, colspec = nil, rowspec = nil, repeat = nil;
if (record == null) record = nil;
        if ((($a = (m = $scope.ColumnSpecRx.$match(record))) !== nil && (!$a._isBoolean || $a == true))) {
            spec = $hash2([], {});
            if ((($a = m['$[]'](2)) !== nil && (!$a._isBoolean || $a == true))) {
              $a = $opal.to_ary(m['$[]'](2).$split(".")), colspec = ($a[0] == null ? nil : $a[0]), rowspec = ($a[1] == null ? nil : $a[1]);
              if ((($a = ($b = colspec['$nil_or_empty?']()['$!'](), $b !== false && $b !== nil ?($scope.Table)._scope.ALIGNMENTS['$[]']("h")['$has_key?'](colspec) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                spec['$[]=']("halign", ($scope.Table)._scope.ALIGNMENTS['$[]']("h")['$[]'](colspec))};
              if ((($a = ($b = rowspec['$nil_or_empty?']()['$!'](), $b !== false && $b !== nil ?($scope.Table)._scope.ALIGNMENTS['$[]']("v")['$has_key?'](rowspec) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                spec['$[]=']("valign", ($scope.Table)._scope.ALIGNMENTS['$[]']("v")['$[]'](rowspec))};};
            spec['$[]=']("width", (function() {if ((($a = m['$[]'](3)['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](3).$to_i()
              } else {
              return 1
            }; return nil; })());
            if ((($a = ($b = m['$[]'](4), $b !== false && $b !== nil ?($scope.Table)._scope.TEXT_STYLES['$has_key?'](m['$[]'](4)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              spec['$[]=']("style", ($scope.Table)._scope.TEXT_STYLES['$[]'](m['$[]'](4)))};
            repeat = (function() {if ((($a = m['$[]'](1)['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              return m['$[]'](1).$to_i()
              } else {
              return 1
            }; return nil; })();
            return ($a = ($b = (1)).$upto, $a._p = (TMP_27 = function(){var self = TMP_27._s || this;

            return specs['$<<'](spec.$dup())}, TMP_27._s = self, TMP_27), $a).call($b, repeat);
            } else {
            return nil
          }}, TMP_26._s = self, TMP_26), $a).call($c);
        return specs;
      });

      $opal.defs(self, '$parse_cell_spec', function(line, pos) {
        var $a, $b, self = this, spec = nil, rest = nil, m = nil, colspec = nil, rowspec = nil;

        if (pos == null) {
          pos = "start"
        }
        spec = ((function() {if (pos['$==']("end")) {
          return $hash2([], {})
          } else {
          return nil
        }; return nil; })());
        rest = line;
        if ((($a = (m = ((function() {if (pos['$==']("start")) {
          return $scope.CellSpecStartRx
          } else {
          return $scope.CellSpecEndRx
        }; return nil; })()).$match(line))) !== nil && (!$a._isBoolean || $a == true))) {
          spec = $hash2([], {});
          if ((($a = m['$[]'](0)['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return [spec, line]};
          rest = ((function() {if (pos['$==']("start")) {
            return m.$post_match()
            } else {
            return m.$pre_match()
          }; return nil; })());
          if ((($a = m['$[]'](1)) !== nil && (!$a._isBoolean || $a == true))) {
            $a = $opal.to_ary(m['$[]'](1).$split(".")), colspec = ($a[0] == null ? nil : $a[0]), rowspec = ($a[1] == null ? nil : $a[1]);
            colspec = (function() {if ((($a = colspec['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return 1
              } else {
              return colspec.$to_i()
            }; return nil; })();
            rowspec = (function() {if ((($a = rowspec['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return 1
              } else {
              return rowspec.$to_i()
            }; return nil; })();
            if (m['$[]'](2)['$==']("+")) {
              if (colspec['$=='](1)) {
                } else {
                spec['$[]=']("colspan", colspec)
              };
              if (rowspec['$=='](1)) {
                } else {
                spec['$[]=']("rowspan", rowspec)
              };
            } else if (m['$[]'](2)['$==']("*")) {
              if (colspec['$=='](1)) {
                } else {
                spec['$[]=']("repeatcol", colspec)
              }};};
          if ((($a = m['$[]'](3)) !== nil && (!$a._isBoolean || $a == true))) {
            $a = $opal.to_ary(m['$[]'](3).$split(".")), colspec = ($a[0] == null ? nil : $a[0]), rowspec = ($a[1] == null ? nil : $a[1]);
            if ((($a = ($b = colspec['$nil_or_empty?']()['$!'](), $b !== false && $b !== nil ?($scope.Table)._scope.ALIGNMENTS['$[]']("h")['$has_key?'](colspec) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              spec['$[]=']("halign", ($scope.Table)._scope.ALIGNMENTS['$[]']("h")['$[]'](colspec))};
            if ((($a = ($b = rowspec['$nil_or_empty?']()['$!'](), $b !== false && $b !== nil ?($scope.Table)._scope.ALIGNMENTS['$[]']("v")['$has_key?'](rowspec) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              spec['$[]=']("valign", ($scope.Table)._scope.ALIGNMENTS['$[]']("v")['$[]'](rowspec))};};
          if ((($a = ($b = m['$[]'](4), $b !== false && $b !== nil ?($scope.Table)._scope.TEXT_STYLES['$has_key?'](m['$[]'](4)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            spec['$[]=']("style", ($scope.Table)._scope.TEXT_STYLES['$[]'](m['$[]'](4)))};};
        return [spec, rest];
      });

      $opal.defs(self, '$parse_style_attribute', function(attributes, reader) {
        var $a, $b, TMP_28, $c, TMP_29, $d, TMP_30, self = this, original_style = nil, raw_style = nil, type = nil, collector = nil, parsed = nil, save_current = nil, parsed_style = nil, options = nil, existing_opts = nil;

        if (reader == null) {
          reader = nil
        }
        original_style = attributes['$[]']("style");
        raw_style = attributes['$[]'](1);
        if ((($a = ((($b = raw_style['$!']()) !== false && $b !== nil) ? $b : raw_style['$include?'](" "))) !== nil && (!$a._isBoolean || $a == true))) {
          attributes['$[]=']("style", raw_style);
          return [raw_style, original_style];
          } else {
          type = "style";
          collector = [];
          parsed = $hash2([], {});
          save_current = ($a = ($b = self).$lambda, $a._p = (TMP_28 = function(){var self = TMP_28._s || this, $a, $b, $c, $case = nil;

          if ((($a = collector['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = type['$==']("style")['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
                return self.$warn("asciidoctor: WARNING:" + ((function() {if ((($a = reader['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
                  return nil
                  } else {
                  return " " + (reader.$prev_line_info()) + ":"
                }; return nil; })()) + " invalid empty " + (type) + " detected in style attribute")
                } else {
                return nil
              }
              } else {
              $case = type;if ("role"['$===']($case) || "option"['$===']($case)) {($a = type, $b = parsed, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, [])));
              parsed['$[]'](type).$push(collector.$join());}else if ("id"['$===']($case)) {if ((($a = parsed['$has_key?']("id")) !== nil && (!$a._isBoolean || $a == true))) {
                self.$warn("asciidoctor: WARNING:" + ((function() {if ((($a = reader['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
                  return nil
                  } else {
                  return " " + (reader.$prev_line_info()) + ":"
                }; return nil; })()) + " multiple ids detected in style attribute")};
              parsed['$[]='](type, collector.$join());}else {parsed['$[]='](type, collector.$join())};
              return collector = [];
            }}, TMP_28._s = self, TMP_28), $a).call($b);
          ($a = ($c = raw_style).$each_char, $a._p = (TMP_29 = function(c){var self = TMP_29._s || this, $a, $b, $c, $case = nil;
if (c == null) c = nil;
          if ((($a = ((($b = ((($c = c['$=='](".")) !== false && $c !== nil) ? $c : c['$==']("#"))) !== false && $b !== nil) ? $b : c['$==']("%"))) !== nil && (!$a._isBoolean || $a == true))) {
              save_current.$call();
              return (function() {$case = c;if ("."['$===']($case)) {return type = "role"}else if ("#"['$===']($case)) {return type = "id"}else if ("%"['$===']($case)) {return type = "option"}else { return nil }})();
              } else {
              return collector.$push(c)
            }}, TMP_29._s = self, TMP_29), $a).call($c);
          if (type['$==']("style")) {
            parsed_style = attributes['$[]=']("style", raw_style)
            } else {
            save_current.$call();
            if ((($a = parsed['$has_key?']("style")) !== nil && (!$a._isBoolean || $a == true))) {
              parsed_style = attributes['$[]=']("style", parsed['$[]']("style"))
              } else {
              parsed_style = nil
            };
            if ((($a = parsed['$has_key?']("id")) !== nil && (!$a._isBoolean || $a == true))) {
              attributes['$[]=']("id", parsed['$[]']("id"))};
            if ((($a = parsed['$has_key?']("role")) !== nil && (!$a._isBoolean || $a == true))) {
              attributes['$[]=']("role", parsed['$[]']("role")['$*'](" "))};
            if ((($a = parsed['$has_key?']("option")) !== nil && (!$a._isBoolean || $a == true))) {
              ($a = ($d = ((options = parsed['$[]']("option")))).$each, $a._p = (TMP_30 = function(option){var self = TMP_30._s || this;
if (option == null) option = nil;
              return attributes['$[]=']("" + (option) + "-option", "")}, TMP_30._s = self, TMP_30), $a).call($d);
              if ((($a = (existing_opts = attributes['$[]']("options"))) !== nil && (!$a._isBoolean || $a == true))) {
                attributes['$[]=']("options", (options['$+'](existing_opts.$split(",")))['$*'](","))
                } else {
                attributes['$[]=']("options", options['$*'](","))
              };};
          };
          return [parsed_style, original_style];
        };
      });

      $opal.defs(self, '$reset_block_indent!', function(lines, indent) {
        var $a, $b, TMP_31, $c, TMP_32, $d, TMP_33, self = this, tab_detected = nil, tab_expansion = nil, offsets = nil, offset = nil, padding = nil;

        if (indent == null) {
          indent = 0
        }
        if ((($a = ((($b = indent['$!']()) !== false && $b !== nil) ? $b : lines['$empty?']())) !== nil && (!$a._isBoolean || $a == true))) {
          return nil};
        tab_detected = false;
        tab_expansion = "    ";
        offsets = ($a = ($b = lines).$map, $a._p = (TMP_31 = function(line){var self = TMP_31._s || this, $a, flush_line = nil, offset = nil;
if (line == null) line = nil;
        if ((($a = line.$chr().$lstrip()['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            return ($breaker.$v = [], $breaker)
          };
          if ((($a = line['$include?']($scope.TAB)) !== nil && (!$a._isBoolean || $a == true))) {
            tab_detected = true;
            line = line.$gsub($scope.TAB_PATTERN, tab_expansion);};
          if ((($a = ((flush_line = line.$lstrip()))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return nil
          } else if (((offset = line.$length()['$-'](flush_line.$length())))['$=='](0)) {
            return ($breaker.$v = [], $breaker)
            } else {
            return offset
          };}, TMP_31._s = self, TMP_31), $a).call($b);
        if ((($a = ((($c = offsets['$empty?']()) !== false && $c !== nil) ? $c : ((offsets = offsets.$compact()))['$empty?']())) !== nil && (!$a._isBoolean || $a == true))) {
        } else if (((offset = offsets.$min()))['$>'](0)) {
          ($a = ($c = lines)['$map!'], $a._p = (TMP_32 = function(line){var self = TMP_32._s || this;
if (line == null) line = nil;
          if (tab_detected !== false && tab_detected !== nil) {
              line = line.$gsub($scope.TAB_PATTERN, tab_expansion)};
            return line['$[]']($range(offset, -1, false)).$to_s();}, TMP_32._s = self, TMP_32), $a).call($c)};
        if (indent['$>'](0)) {
          padding = " "['$*'](indent);
          ($a = ($d = lines)['$map!'], $a._p = (TMP_33 = function(line){var self = TMP_33._s || this;
if (line == null) line = nil;
          return "" + (padding) + (line)}, TMP_33._s = self, TMP_33), $a).call($d);};
        return nil;
      });

      $opal.defs(self, '$sanitize_attribute_name', function(name) {
        var self = this;

        return name.$gsub($scope.InvalidAttributeNameCharsRx, "").$downcase();
      });

      return ($opal.defs(self, '$roman_numeral_to_int', function(value) {
        var $a, $b, TMP_34, self = this, digits = nil, result = nil;

        value = value.$downcase();
        digits = $hash2(["i", "v", "x"], {"i": 1, "v": 5, "x": 10});
        result = 0;
        ($a = ($b = ($range(0, value.$length()['$-'](1), false))).$each, $a._p = (TMP_34 = function(i){var self = TMP_34._s || this, $a, $b, digit = nil;
if (i == null) i = nil;
        digit = digits['$[]'](value['$[]']($range(i, i, false)));
          if ((($a = (($b = i['$+'](1)['$<'](value.$length())) ? digits['$[]'](value['$[]']($range(i['$+'](1), i['$+'](1), false)))['$>'](digit) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            return result = result['$-'](digit)
            } else {
            return result = result['$+'](digit)
          };}, TMP_34._s = self, TMP_34), $a).call($b);
        return result;
      }), nil) && 'roman_numeral_to_int';
    })(self, null)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range, $gvars = $opal.gvars;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $PathResolver(){};
      var self = $PathResolver = $klass($base, $super, 'PathResolver', $PathResolver);

      var def = self._proto, $scope = self._scope;

      def.file_separator = def._partition_path_web = def._partition_path_sys = def.working_dir = nil;
      $opal.cdecl($scope, 'DOT', ".");

      $opal.cdecl($scope, 'DOT_DOT', "..");

      $opal.cdecl($scope, 'DOT_SLASH', "./");

      $opal.cdecl($scope, 'SLASH', "/");

      $opal.cdecl($scope, 'BACKSLASH', "\\");

      $opal.cdecl($scope, 'DOUBLE_SLASH', "//");

      $opal.cdecl($scope, 'WindowsRootRx', /^[a-zA-Z]:(?:\\|\/)/);

      self.$attr_accessor("file_separator");

      self.$attr_accessor("working_dir");

      def.$initialize = function(file_separator, working_dir) {
        var $a, $b, self = this;

        if (file_separator == null) {
          file_separator = nil
        }
        if (working_dir == null) {
          working_dir = nil
        }
        self.file_separator = (function() {if (file_separator !== false && file_separator !== nil) {
          return file_separator
          } else {
          return (((($a = ((($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b))._scope.ALT_SEPARATOR) !== false && $a !== nil) ? $a : ((($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b))._scope.SEPARATOR))
        }; return nil; })();
        if (working_dir !== false && working_dir !== nil) {
          self.working_dir = (function() {if ((($a = (self['$is_root?'](working_dir))) !== nil && (!$a._isBoolean || $a == true))) {
            return working_dir
            } else {
            return ((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path(working_dir))
          }; return nil; })()
          } else {
          self.working_dir = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path((($a = $opal.Object._scope.Dir) == null ? $opal.cm('Dir') : $a).$pwd())
        };
        self._partition_path_sys = $hash2([], {});
        return self._partition_path_web = $hash2([], {});
      };

      def['$is_root?'] = function(path) {
        var $a, $b, self = this;

        if ((($a = path['$start_with?']($scope.SLASH)) !== nil && (!$a._isBoolean || $a == true))) {
          return true
        } else if ((($a = (($b = self.file_separator['$==']($scope.BACKSLASH)) ? $scope.WindowsRootRx['$=~'](path) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return true
          } else {
          return false
        };
      };

      def['$is_unc?'] = function(path) {
        var self = this;

        return path['$start_with?']($scope.DOUBLE_SLASH);
      };

      def['$is_web_root?'] = function(path) {
        var self = this;

        return path['$start_with?']($scope.SLASH);
      };

      def.$posixfy = function(path) {
        var $a, self = this;

        if ((($a = path['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return ""
        } else if ((($a = path['$include?']($scope.BACKSLASH)) !== nil && (!$a._isBoolean || $a == true))) {
          return path.$tr($scope.BACKSLASH, $scope.SLASH)
          } else {
          return path
        };
      };

      def.$expand_path = function(path) {
        var $a, self = this, path_segments = nil, path_root = nil, _ = nil;

        $a = $opal.to_ary(self.$partition_path(path)), path_segments = ($a[0] == null ? nil : $a[0]), path_root = ($a[1] == null ? nil : $a[1]), _ = ($a[2] == null ? nil : $a[2]);
        return self.$join_path(path_segments, path_root);
      };

      def.$partition_path = function(path, web_path) {
        var $a, self = this, result = nil, posix_path = nil, root = nil, path_segments = nil;

        if (web_path == null) {
          web_path = false
        }
        if ((($a = (result = (function() {if (web_path !== false && web_path !== nil) {
          return self._partition_path_web['$[]'](path)
          } else {
          return self._partition_path_sys['$[]'](path)
        }; return nil; })())) !== nil && (!$a._isBoolean || $a == true))) {
          return result};
        posix_path = self.$posixfy(path);
        root = (function() {if (web_path !== false && web_path !== nil) {
          if ((($a = self['$is_web_root?'](posix_path)) !== nil && (!$a._isBoolean || $a == true))) {
            return $scope.SLASH
          } else if ((($a = posix_path['$start_with?']($scope.DOT_SLASH)) !== nil && (!$a._isBoolean || $a == true))) {
            return $scope.DOT_SLASH
            } else {
            return nil
          }
        } else if ((($a = self['$is_root?'](posix_path)) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = self['$is_unc?'](posix_path)) !== nil && (!$a._isBoolean || $a == true))) {
            return $scope.DOUBLE_SLASH
          } else if ((($a = posix_path['$start_with?']($scope.SLASH)) !== nil && (!$a._isBoolean || $a == true))) {
            return $scope.SLASH
            } else {
            return posix_path['$[]']($range(0, (posix_path.$index($scope.SLASH)), false))
          }
        } else if ((($a = posix_path['$start_with?']($scope.DOT_SLASH)) !== nil && (!$a._isBoolean || $a == true))) {
          return $scope.DOT_SLASH
          } else {
          return nil
        }; return nil; })();
        path_segments = posix_path.$split($scope.SLASH);
        if (root['$==']($scope.DOUBLE_SLASH)) {
          path_segments = path_segments['$[]']($range(2, -1, false))
        } else if (root !== false && root !== nil) {
          path_segments.$shift()};
        path_segments.$delete($scope.DOT);
        return ((function() {if (web_path !== false && web_path !== nil) {
          return self._partition_path_web
          } else {
          return self._partition_path_sys
        }; return nil; })())['$[]='](path, [path_segments, root, posix_path]);
      };

      def.$join_path = function(segments, root) {
        var self = this;

        if (root == null) {
          root = nil
        }
        if (root !== false && root !== nil) {
          return "" + (root) + (segments['$*']($scope.SLASH))
          } else {
          return segments['$*']($scope.SLASH)
        };
      };

      def.$system_path = function(target, start, jail, opts) {
        var $a, $b, TMP_1, self = this, recover = nil, target_segments = nil, target_root = nil, _ = nil, resolved_target = nil, jail_segments = nil, jail_root = nil, start_segments = nil, start_root = nil, resolved_segments = nil, warned = nil;

        if (jail == null) {
          jail = nil
        }
        if (opts == null) {
          opts = $hash2([], {})
        }
        recover = opts.$fetch("recover", true);
        if (jail !== false && jail !== nil) {
          if ((($a = self['$is_root?'](jail)) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$raise((($a = $opal.Object._scope.SecurityError) == null ? $opal.cm('SecurityError') : $a), "Jail is not an absolute path: " + (jail))
          };
          jail = self.$posixfy(jail);};
        if ((($a = target['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          target_segments = []
          } else {
          $a = $opal.to_ary(self.$partition_path(target)), target_segments = ($a[0] == null ? nil : $a[0]), target_root = ($a[1] == null ? nil : $a[1]), _ = ($a[2] == null ? nil : $a[2])
        };
        if ((($a = target_segments['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = start['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            return (function() {if (jail !== false && jail !== nil) {
              return jail
              } else {
              return self.working_dir
            }; return nil; })()
          } else if ((($a = self['$is_root?'](start)) !== nil && (!$a._isBoolean || $a == true))) {
            if (jail !== false && jail !== nil) {
              } else {
              return self.$expand_path(start)
            }
            } else {
            return self.$system_path(start, jail, jail)
          }};
        if ((($a = (($b = target_root !== false && target_root !== nil) ? target_root['$==']($scope.DOT_SLASH)['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          resolved_target = self.$join_path(target_segments, target_root);
          if ((($a = ((($b = jail['$!']()) !== false && $b !== nil) ? $b : (resolved_target['$start_with?'](jail)))) !== nil && (!$a._isBoolean || $a == true))) {
            return resolved_target};};
        if ((($a = start['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          start = (function() {if (jail !== false && jail !== nil) {
            return jail
            } else {
            return self.working_dir
          }; return nil; })()
        } else if ((($a = self['$is_root?'](start)) !== nil && (!$a._isBoolean || $a == true))) {
          start = self.$posixfy(start)
          } else {
          start = self.$system_path(start, jail, jail)
        };
        if (jail['$=='](start)) {
          $a = $opal.to_ary(self.$partition_path(jail)), jail_segments = ($a[0] == null ? nil : $a[0]), jail_root = ($a[1] == null ? nil : $a[1]), _ = ($a[2] == null ? nil : $a[2]);
          start_segments = jail_segments.$dup();
        } else if (jail !== false && jail !== nil) {
          if ((($a = start['$start_with?'](jail)) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$raise((($a = $opal.Object._scope.SecurityError) == null ? $opal.cm('SecurityError') : $a), "" + (((($a = opts['$[]']("target_name")) !== false && $a !== nil) ? $a : "Start path")) + " " + (start) + " is outside of jail: " + (jail) + " (disallowed in safe mode)")
          };
          $a = $opal.to_ary(self.$partition_path(start)), start_segments = ($a[0] == null ? nil : $a[0]), start_root = ($a[1] == null ? nil : $a[1]), _ = ($a[2] == null ? nil : $a[2]);
          $a = $opal.to_ary(self.$partition_path(jail)), jail_segments = ($a[0] == null ? nil : $a[0]), jail_root = ($a[1] == null ? nil : $a[1]), _ = ($a[2] == null ? nil : $a[2]);
          } else {
          $a = $opal.to_ary(self.$partition_path(start)), start_segments = ($a[0] == null ? nil : $a[0]), start_root = ($a[1] == null ? nil : $a[1]), _ = ($a[2] == null ? nil : $a[2]);
          jail_root = start_root;
        };
        resolved_segments = start_segments.$dup();
        warned = false;
        ($a = ($b = target_segments).$each, $a._p = (TMP_1 = function(segment){var self = TMP_1._s || this, $a;
if (segment == null) segment = nil;
        if (segment['$==']($scope.DOT_DOT)) {
            if (jail !== false && jail !== nil) {
              if (resolved_segments.$length()['$>'](jail_segments.$length())) {
                return resolved_segments.$pop()
              } else if ((($a = recover['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
                return self.$raise((($a = $opal.Object._scope.SecurityError) == null ? $opal.cm('SecurityError') : $a), "" + (((($a = opts['$[]']("target_name")) !== false && $a !== nil) ? $a : "path")) + " " + (target) + " refers to location outside jail: " + (jail) + " (disallowed in safe mode)")
              } else if ((($a = warned['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
                self.$warn("asciidoctor: WARNING: " + (((($a = opts['$[]']("target_name")) !== false && $a !== nil) ? $a : "path")) + " has illegal reference to ancestor of jail, auto-recovering");
                return warned = true;
                } else {
                return nil
              }
              } else {
              return resolved_segments.$pop()
            }
            } else {
            return resolved_segments.$push(segment)
          }}, TMP_1._s = self, TMP_1), $a).call($b);
        return self.$join_path(resolved_segments, jail_root);
      };

      def.$web_path = function(target, start) {
        var $a, $b, TMP_2, self = this, uri_prefix = nil, target_segments = nil, target_root = nil, _ = nil, resolved_segments = nil;
        if ($gvars["~"] == null) $gvars["~"] = nil;

        if (start == null) {
          start = nil
        }
        target = self.$posixfy(target);
        start = self.$posixfy(start);
        uri_prefix = nil;
        if ((($a = ((($b = start['$nil_or_empty?']()) !== false && $b !== nil) ? $b : (self['$is_web_root?'](target)))) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          target = "" + (start) + ($scope.SLASH) + (target);
          if ((($a = ($b = (target['$include?'](":")), $b !== false && $b !== nil ?$scope.UriSniffRx['$=~'](target) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            uri_prefix = $gvars["~"]['$[]'](0);
            target = target['$[]']($range(uri_prefix.$length(), -1, false));};
        };
        $a = $opal.to_ary(self.$partition_path(target, true)), target_segments = ($a[0] == null ? nil : $a[0]), target_root = ($a[1] == null ? nil : $a[1]), _ = ($a[2] == null ? nil : $a[2]);
        resolved_segments = [];
        ($a = ($b = target_segments).$each, $a._p = (TMP_2 = function(segment){var self = TMP_2._s || this, $a, $b;
if (segment == null) segment = nil;
        if (segment['$==']($scope.DOT_DOT)) {
            if ((($a = resolved_segments['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = (($b = target_root !== false && target_root !== nil) ? target_root['$==']($scope.DOT_SLASH)['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                return nil
                } else {
                return resolved_segments['$<<'](segment)
              }
            } else if (resolved_segments['$[]'](-1)['$==']($scope.DOT_DOT)) {
              return resolved_segments['$<<'](segment)
              } else {
              return resolved_segments.$pop()
            }
            } else {
            return resolved_segments['$<<'](segment)
          }}, TMP_2._s = self, TMP_2), $a).call($b);
        if (uri_prefix !== false && uri_prefix !== nil) {
          return "" + (uri_prefix) + (self.$join_path(resolved_segments, target_root))
          } else {
          return self.$join_path(resolved_segments, target_root)
        };
      };

      return (def.$relative_path = function(filename, base_directory) {
        var $a, $b, self = this, offset = nil;

        if ((($a = ($b = (self['$is_root?'](filename)), $b !== false && $b !== nil ?(self['$is_root?'](base_directory)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          offset = base_directory.$chomp(self.file_separator).$length()['$+'](1);
          return filename['$[]']($range(offset, -1, false));
          } else {
          return filename
        };
      }, nil) && 'relative_path';
    })(self, null)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Reader(){};
      var self = $Reader = $klass($base, $super, 'Reader', $Reader);

      var def = self._proto, $scope = self._scope, TMP_4;

      def.file = def.dir = def.lines = def.process_lines = def.look_ahead = def.eof = def.unescape_next_line = def.lineno = def.path = def.source_lines = nil;
      (function($base, $super) {
        function $Cursor(){};
        var self = $Cursor = $klass($base, $super, 'Cursor', $Cursor);

        var def = self._proto, $scope = self._scope;

        self.$attr_accessor("file");

        self.$attr_accessor("dir");

        self.$attr_accessor("path");

        self.$attr_accessor("lineno");

        def.$initialize = function(file, dir, path, lineno) {
          var self = this;

          if (dir == null) {
            dir = nil
          }
          if (path == null) {
            path = nil
          }
          if (lineno == null) {
            lineno = nil
          }
          self.file = file;
          self.dir = dir;
          self.path = path;
          return self.lineno = lineno;
        };

        def.$line_info = function() {
          var self = this;

          return "" + (self.$path()) + ": line " + (self.$lineno());
        };

        return $opal.defn(self, '$to_s', def.$line_info);
      })(self, null);

      self.$attr_reader("file");

      self.$attr_reader("dir");

      self.$attr_reader("path");

      self.$attr_reader("lineno");

      self.$attr_reader("source_lines");

      self.$attr_accessor("process_lines");

      def.$initialize = function(data, cursor, opts) {
        var $a, $b, self = this;

        if (data == null) {
          data = nil
        }
        if (cursor == null) {
          cursor = nil
        }
        if (opts == null) {
          opts = $hash2(["normalize"], {"normalize": false})
        }
        if ((($a = cursor['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.file = self.dir = nil;
          self.path = "<stdin>";
          self.lineno = 1;
        } else if ((($a = cursor['$is_a?']((($b = $opal.Object._scope.String) == null ? $opal.cm('String') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          self.file = cursor;
          self.dir = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname(self.file);
          self.path = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$basename(self.file);
          self.lineno = 1;
          } else {
          self.file = cursor.$file();
          self.dir = cursor.$dir();
          self.path = ((($a = cursor.$path()) !== false && $a !== nil) ? $a : "<stdin>");
          if ((($a = self.file) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = self.dir) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              self.dir = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname(self.file);
              if (self.dir['$=='](".")) {
                self.dir = nil};
            };
            if ((($a = cursor.$path()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              self.path = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$basename(self.file)
            };};
          self.lineno = ((($a = cursor.$lineno()) !== false && $a !== nil) ? $a : 1);
        };
        self.lines = (function() {if (data !== false && data !== nil) {
          return (self.$prepare_lines(data, opts))
          } else {
          return []
        }; return nil; })();
        self.source_lines = self.lines.$dup();
        self.eof = self.lines['$empty?']();
        self.look_ahead = 0;
        self.process_lines = true;
        return self.unescape_next_line = false;
      };

      def.$prepare_lines = function(data, opts) {
        var $a, $b, self = this;

        if (opts == null) {
          opts = $hash2([], {})
        }
        if ((($a = data['$is_a?']((($b = $opal.Object._scope.String) == null ? $opal.cm('String') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = opts['$[]']("normalize")) !== nil && (!$a._isBoolean || $a == true))) {
            return $scope.Helpers.$normalize_lines_from_string(data)
            } else {
            return data.$split($scope.EOL)
          }
        } else if ((($a = opts['$[]']("normalize")) !== nil && (!$a._isBoolean || $a == true))) {
          return $scope.Helpers.$normalize_lines_array(data)
          } else {
          return data.$dup()
        };
      };

      def.$process_line = function(line) {
        var $a, self = this;

        if ((($a = self.process_lines) !== nil && (!$a._isBoolean || $a == true))) {
          self.look_ahead = self.look_ahead['$+'](1)};
        return line;
      };

      def['$has_more_lines?'] = function() {
        var $a, self = this;

        return (((($a = self.eof) !== false && $a !== nil) ? $a : (self.eof = self.$peek_line()['$nil?']())))['$!']();
      };

      def['$next_line_empty?'] = function() {
        var self = this;

        return self.$peek_line()['$nil_or_empty?']();
      };

      def.$peek_line = function(direct) {
        var $a, $b, self = this, line = nil;

        if (direct == null) {
          direct = false
        }
        if ((($a = ((($b = direct) !== false && $b !== nil) ? $b : self.look_ahead['$>'](0))) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = self.unescape_next_line) !== nil && (!$a._isBoolean || $a == true))) {
            return self.lines['$[]'](0)['$[]']($range(1, -1, false))
            } else {
            return self.lines['$[]'](0)
          }
        } else if ((($a = ((($b = self.eof) !== false && $b !== nil) ? $b : self.lines['$empty?']())) !== nil && (!$a._isBoolean || $a == true))) {
          self.eof = true;
          self.look_ahead = 0;
          return nil;
        } else if ((($a = ((line = self.$process_line(self.lines['$[]'](0))))['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$peek_line()
          } else {
          return line
        };
      };

      def.$peek_lines = function(num, direct) {
        var $a, $b, TMP_1, $c, TMP_2, self = this, old_look_ahead = nil, result = nil;

        if (num == null) {
          num = 1
        }
        if (direct == null) {
          direct = true
        }
        old_look_ahead = self.look_ahead;
        result = [];
        ($a = ($b = num).$times, $a._p = (TMP_1 = function(){var self = TMP_1._s || this, $a, line = nil;

        if ((($a = (line = self.$read_line(direct))) !== nil && (!$a._isBoolean || $a == true))) {
            return result['$<<'](line)
            } else {
            return ($breaker.$v = nil, $breaker)
          }}, TMP_1._s = self, TMP_1), $a).call($b);
        if ((($a = result['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          ($a = ($c = result).$reverse_each, $a._p = (TMP_2 = function(line){var self = TMP_2._s || this;
if (line == null) line = nil;
          return self.$unshift(line)}, TMP_2._s = self, TMP_2), $a).call($c);
          if (direct !== false && direct !== nil) {
            self.look_ahead = old_look_ahead};
        };
        return result;
      };

      def.$read_line = function(direct) {
        var $a, $b, $c, self = this;

        if (direct == null) {
          direct = false
        }
        if ((($a = ((($b = ((($c = direct) !== false && $c !== nil) ? $c : self.look_ahead['$>'](0))) !== false && $b !== nil) ? $b : self['$has_more_lines?']())) !== nil && (!$a._isBoolean || $a == true))) {
          return self.$shift()
          } else {
          return nil
        };
      };

      def.$read_lines = function() {
        var $a, $b, self = this, lines = nil;

        lines = [];
        while ((($b = self['$has_more_lines?']()) !== nil && (!$b._isBoolean || $b == true))) {
        lines['$<<'](self.$shift())};
        return lines;
      };

      $opal.defn(self, '$readlines', def.$read_lines);

      def.$read = function() {
        var self = this;

        return self.$read_lines()['$*']($scope.EOL);
      };

      def.$advance = function(direct) {
        var self = this;

        if (direct == null) {
          direct = true
        }
        return self.$read_line(direct)['$!']()['$!']();
      };

      def.$unshift_line = function(line_to_restore) {
        var self = this;

        self.$unshift(line_to_restore);
        return nil;
      };

      $opal.defn(self, '$restore_line', def.$unshift_line);

      def.$unshift_lines = function(lines_to_restore) {
        var $a, $b, TMP_3, self = this;

        ($a = ($b = lines_to_restore).$reverse_each, $a._p = (TMP_3 = function(line){var self = TMP_3._s || this;
if (line == null) line = nil;
        return self.$unshift(line)}, TMP_3._s = self, TMP_3), $a).call($b);
        return nil;
      };

      $opal.defn(self, '$restore_lines', def.$unshift_lines);

      def.$replace_line = function(replacement) {
        var self = this;

        self.$advance();
        self.$unshift(replacement);
        return nil;
      };

      def.$skip_blank_lines = function() {
        var $a, $b, self = this, num_skipped = nil, next_line = nil;

        if ((($a = self['$eof?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return 0};
        num_skipped = 0;
        while ((($b = (next_line = self.$peek_line())) !== nil && (!$b._isBoolean || $b == true))) {
        if ((($b = next_line['$empty?']()) !== nil && (!$b._isBoolean || $b == true))) {
          self.$advance();
          num_skipped = num_skipped['$+'](1);
          } else {
          return num_skipped
        }};
        return num_skipped;
      };

      def.$skip_comment_lines = function(opts) {
        var $a, $b, $c, $d, self = this, comment_lines = nil, include_blank_lines = nil, next_line = nil, commentish = nil, match = nil;

        if (opts == null) {
          opts = $hash2([], {})
        }
        if ((($a = self['$eof?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return []};
        comment_lines = [];
        include_blank_lines = opts['$[]']("include_blank_lines");
        while ((($b = (next_line = self.$peek_line())) !== nil && (!$b._isBoolean || $b == true))) {
        if ((($b = (($c = include_blank_lines !== false && include_blank_lines !== nil) ? next_line['$empty?']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          comment_lines['$<<'](self.$shift())
        } else if ((($b = ($c = (commentish = next_line['$start_with?']("//")), $c !== false && $c !== nil ?(match = $scope.CommentBlockRx.$match(next_line)) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          comment_lines['$<<'](self.$shift());
          ($b = comment_lines).$push.apply($b, [].concat((self.$read_lines_until($hash2(["terminator", "read_last_line", "skip_processing"], {"terminator": match['$[]'](0), "read_last_line": true, "skip_processing": true})))));
        } else if ((($c = (($d = commentish !== false && commentish !== nil) ? $scope.CommentLineRx['$=~'](next_line) : $d)) !== nil && (!$c._isBoolean || $c == true))) {
          comment_lines['$<<'](self.$shift())
          } else {
          break;
        }};
        return comment_lines;
      };

      def.$skip_line_comments = function() {
        var $a, $b, self = this, comment_lines = nil, next_line = nil;

        if ((($a = self['$eof?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return []};
        comment_lines = [];
        while ((($b = (next_line = self.$peek_line())) !== nil && (!$b._isBoolean || $b == true))) {
        if ((($b = $scope.CommentLineRx['$=~'](next_line)) !== nil && (!$b._isBoolean || $b == true))) {
          comment_lines['$<<'](self.$shift())
          } else {
          break;
        }};
        return comment_lines;
      };

      def.$terminate = function() {
        var self = this;

        self.lineno = self.lineno['$+'](self.lines.$size());
        self.lines.$clear();
        self.eof = true;
        self.look_ahead = 0;
        return nil;
      };

      def['$eof?'] = function() {
        var self = this;

        return self['$has_more_lines?']()['$!']();
      };

      $opal.defn(self, '$empty?', def['$eof?']);

      def.$read_lines_until = TMP_4 = function(options) {
        var $a, $b, $c, $d, $e, self = this, $iter = TMP_4._p, $yield = $iter || nil, result = nil, restore_process_lines = nil, terminator = nil, break_on_blank_lines = nil, break_on_list_continuation = nil, skip_line_comments = nil, line_read = nil, line_restored = nil, complete = nil, line = nil;

        if (options == null) {
          options = $hash2([], {})
        }
        TMP_4._p = null;
        result = [];
        if ((($a = options['$[]']("skip_first_line")) !== nil && (!$a._isBoolean || $a == true))) {
          self.$advance()};
        if ((($a = ($b = self.process_lines, $b !== false && $b !== nil ?options['$[]']("skip_processing") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          self.process_lines = false;
          restore_process_lines = true;
          } else {
          restore_process_lines = false
        };
        if ((($a = (terminator = options['$[]']("terminator"))) !== nil && (!$a._isBoolean || $a == true))) {
          break_on_blank_lines = false;
          break_on_list_continuation = false;
          } else {
          break_on_blank_lines = options['$[]']("break_on_blank_lines");
          break_on_list_continuation = options['$[]']("break_on_list_continuation");
        };
        skip_line_comments = options['$[]']("skip_line_comments");
        line_read = false;
        line_restored = false;
        complete = false;
        while ((($b = ($c = complete['$!'](), $c !== false && $c !== nil ?(line = self.$read_line()) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
        complete = (function() {while ((($c = true) !== nil && (!$c._isBoolean || $c == true))) {
        if ((($c = (($d = terminator !== false && terminator !== nil) ? line['$=='](terminator) : $d)) !== nil && (!$c._isBoolean || $c == true))) {
          return true};
        if ((($c = (($d = break_on_blank_lines !== false && break_on_blank_lines !== nil) ? line['$empty?']() : $d)) !== nil && (!$c._isBoolean || $c == true))) {
          return true};
        if ((($c = ($d = (($e = break_on_list_continuation !== false && break_on_list_continuation !== nil) ? line_read : $e), $d !== false && $d !== nil ?line['$==']($scope.LIST_CONTINUATION) : $d)) !== nil && (!$c._isBoolean || $c == true))) {
          options['$[]=']("preserve_last_line", true);
          return true;};
        if ((($c = (($d = ($yield !== nil)) ? (((($e = $opal.$yield1($yield, line)) === $breaker) ? $breaker.$v : $e)) : $d)) !== nil && (!$c._isBoolean || $c == true))) {
          return true};
        return false;}; return nil; })();
        if (complete !== false && complete !== nil) {
          if ((($b = options['$[]']("read_last_line")) !== nil && (!$b._isBoolean || $b == true))) {
            result['$<<'](line);
            line_read = true;};
          if ((($b = options['$[]']("preserve_last_line")) !== nil && (!$b._isBoolean || $b == true))) {
            self.$restore_line(line);
            line_restored = true;};
        } else if ((($b = ($c = (($d = skip_line_comments !== false && skip_line_comments !== nil) ? line['$start_with?']("//") : $d), $c !== false && $c !== nil ?$scope.CommentLineRx['$=~'](line) : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          } else {
          result['$<<'](line);
          line_read = true;
        };};
        if (restore_process_lines !== false && restore_process_lines !== nil) {
          self.process_lines = true;
          if ((($a = (($b = line_restored !== false && line_restored !== nil) ? terminator['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            self.look_ahead = self.look_ahead['$-'](1)};};
        return result;
      };

      def.$shift = function() {
        var self = this;

        self.lineno = self.lineno['$+'](1);
        if (self.look_ahead['$=='](0)) {
          } else {
          self.look_ahead = self.look_ahead['$-'](1)
        };
        return self.lines.$shift();
      };

      def.$unshift = function(line) {
        var self = this;

        self.lineno = self.lineno['$-'](1);
        self.look_ahead = self.look_ahead['$+'](1);
        self.eof = false;
        return self.lines.$unshift(line);
      };

      def.$cursor = function() {
        var self = this;

        return $scope.Cursor.$new(self.file, self.dir, self.path, self.lineno);
      };

      def.$line_info = function() {
        var self = this;

        return "" + (self.path) + ": line " + (self.lineno);
      };

      $opal.defn(self, '$next_line_info', def.$line_info);

      def.$prev_line_info = function() {
        var self = this;

        return "" + (self.path) + ": line " + (self.lineno['$-'](1));
      };

      def.$lines = function() {
        var self = this;

        return self.lines.$dup();
      };

      def.$string = function() {
        var self = this;

        return self.lines['$*']($scope.EOL);
      };

      def.$source = function() {
        var self = this;

        return self.source_lines['$*']($scope.EOL);
      };

      return (def.$to_s = function() {
        var self = this;

        return self.$line_info();
      }, nil) && 'to_s';
    })(self, null);

    (function($base, $super) {
      function $PreprocessorReader(){};
      var self = $PreprocessorReader = $klass($base, $super, 'PreprocessorReader', $PreprocessorReader);

      var def = self._proto, $scope = self._scope, TMP_5, TMP_6, TMP_7, TMP_20;

      def.document = def.lineno = def.process_lines = def.look_ahead = def.skipping = def.include_stack = def.conditional_stack = def.path = def.include_processor_extensions = def.maxdepth = def.dir = def.lines = def.file = def.includes = def.unescape_next_line = nil;
      self.$attr_reader("include_stack");

      self.$attr_reader("includes");

      def.$initialize = TMP_5 = function(document, data, cursor) {
        var $a, $b, $c, self = this, $iter = TMP_5._p, $yield = $iter || nil, include_depth_default = nil;

        if (data == null) {
          data = nil
        }
        if (cursor == null) {
          cursor = nil
        }
        TMP_5._p = null;
        self.document = document;
        $opal.find_super_dispatcher(self, 'initialize', TMP_5, null).apply(self, [data, cursor, $hash2(["normalize"], {"normalize": true})]);
        include_depth_default = document.$attributes().$fetch("max-include-depth", 64).$to_i();
        if (include_depth_default['$<'](0)) {
          include_depth_default = 0};
        self.maxdepth = $hash2(["abs", "rel"], {"abs": include_depth_default, "rel": include_depth_default});
        self.include_stack = [];
        self.includes = (($a = "includes", $b = document.$references(), ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, []))));
        self.skipping = false;
        self.conditional_stack = [];
        return self.include_processor_extensions = nil;
      };

      def.$prepare_lines = TMP_6 = function(data, opts) {var $zuper = $slice.call(arguments, 0);
        var $a, $b, $c, self = this, $iter = TMP_6._p, $yield = $iter || nil, result = nil, front_matter = nil, first = nil, last = nil, indent = nil;

        if (opts == null) {
          opts = $hash2([], {})
        }
        TMP_6._p = null;
        result = $opal.find_super_dispatcher(self, 'prepare_lines', TMP_6, $iter).apply(self, $zuper);
        if ((($a = ($b = self.document, $b !== false && $b !== nil ?(self.document.$attributes()['$has_key?']("skip-front-matter")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = (front_matter = self['$skip_front_matter!'](result))) !== nil && (!$a._isBoolean || $a == true))) {
            self.document.$attributes()['$[]=']("front-matter", front_matter['$*']($scope.EOL))}};
        if ((($a = opts.$fetch("condense", true)) !== nil && (!$a._isBoolean || $a == true))) {
          while ((($b = ($c = (first = result['$[]'](0)), $c !== false && $c !== nil ?first['$empty?']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          ($b = result.$shift(), $b !== false && $b !== nil ?self.lineno = self.lineno['$+'](1) : $b)};
          while ((($b = ($c = (last = result['$[]'](-1)), $c !== false && $c !== nil ?last['$empty?']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          result.$pop()};};
        if ((($a = (indent = opts.$fetch("indent", nil))) !== nil && (!$a._isBoolean || $a == true))) {
          $scope.Parser['$reset_block_indent!'](result, indent.$to_i())};
        return result;
      };

      def.$process_line = function(line) {
        var $a, $b, $c, $d, self = this, match = nil, escaped = nil;

        if ((($a = self.process_lines) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          return line
        };
        if ((($a = line['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.look_ahead = self.look_ahead['$+'](1);
          return "";};
        if ((($a = ($b = ($c = line['$end_with?']("]"), $c !== false && $c !== nil ?line['$start_with?']("[")['$!']() : $c), $b !== false && $b !== nil ?line['$include?']("::") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = ($b = line['$include?']("if"), $b !== false && $b !== nil ?(match = $scope.ConditionalDirectiveRx.$match(line)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = line['$start_with?']("\\")) !== nil && (!$a._isBoolean || $a == true))) {
              self.unescape_next_line = true;
              self.look_ahead = self.look_ahead['$+'](1);
              return line['$[]']($range(1, -1, false));
            } else if ((($a = ($b = self).$preprocess_conditional_inclusion.apply($b, [].concat(match.$captures()))) !== nil && (!$a._isBoolean || $a == true))) {
              self.$advance();
              return nil;
              } else {
              self.look_ahead = self.look_ahead['$+'](1);
              return line;
            }
          } else if ((($a = self.skipping) !== nil && (!$a._isBoolean || $a == true))) {
            self.$advance();
            return nil;
          } else if ((($a = ($c = (((($d = (escaped = line['$start_with?']("\\include::"))) !== false && $d !== nil) ? $d : line['$start_with?']("include::"))), $c !== false && $c !== nil ?(match = $scope.IncludeDirectiveRx.$match(line)) : $c)) !== nil && (!$a._isBoolean || $a == true))) {
            if (escaped !== false && escaped !== nil) {
              self.unescape_next_line = true;
              self.look_ahead = self.look_ahead['$+'](1);
              return line['$[]']($range(1, -1, false));
            } else if ((($a = self.$preprocess_include(match['$[]'](1), match['$[]'](2).$strip())) !== nil && (!$a._isBoolean || $a == true))) {
              return nil
              } else {
              self.look_ahead = self.look_ahead['$+'](1);
              return line;
            }
            } else {
            self.look_ahead = self.look_ahead['$+'](1);
            return line;
          }
        } else if ((($a = self.skipping) !== nil && (!$a._isBoolean || $a == true))) {
          self.$advance();
          return nil;
          } else {
          self.look_ahead = self.look_ahead['$+'](1);
          return line;
        };
      };

      def.$peek_line = TMP_7 = function(direct) {var $zuper = $slice.call(arguments, 0);
        var $a, self = this, $iter = TMP_7._p, $yield = $iter || nil, line = nil;

        if (direct == null) {
          direct = false
        }
        TMP_7._p = null;
        if ((($a = (line = $opal.find_super_dispatcher(self, 'peek_line', TMP_7, $iter).apply(self, $zuper))) !== nil && (!$a._isBoolean || $a == true))) {
          return line
        } else if ((($a = self.include_stack['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return nil
          } else {
          self.$pop_include();
          return self.$peek_line(direct);
        };
      };

      def.$preprocess_conditional_inclusion = function(directive, target, delimiter, text) {
        var $a, $b, $c, $d, TMP_8, TMP_9, TMP_10, $e, TMP_11, $f, self = this, stack_size = nil, pair = nil, skip = nil, $case = nil, expr_match = nil, lhs = nil, op = nil, rhs = nil, conditional_line = nil;

        if ((($a = ((($b = (($c = (((($d = directive['$==']("ifdef")) !== false && $d !== nil) ? $d : directive['$==']("ifndef"))), $c !== false && $c !== nil ?target['$empty?']() : $c))) !== false && $b !== nil) ? $b : ((($c = directive['$==']("endif")) ? text : $c)))) !== nil && (!$a._isBoolean || $a == true))) {
          return false};
        target = target.$downcase();
        if (directive['$==']("endif")) {
          stack_size = self.conditional_stack.$size();
          if (stack_size['$>'](0)) {
            pair = self.conditional_stack['$[]'](-1);
            if ((($a = ((($b = target['$empty?']()) !== false && $b !== nil) ? $b : target['$=='](pair['$[]']("target")))) !== nil && (!$a._isBoolean || $a == true))) {
              self.conditional_stack.$pop();
              self.skipping = (function() {if ((($a = self.conditional_stack['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                return false
                } else {
                return self.conditional_stack['$[]'](-1)['$[]']("skipping")
              }; return nil; })();
              } else {
              self.$warn("asciidoctor: ERROR: " + (self.$line_info()) + ": mismatched macro: endif::" + (target) + "[], expected endif::" + (pair['$[]']("target")) + "[]")
            };
            } else {
            self.$warn("asciidoctor: ERROR: " + (self.$line_info()) + ": unmatched macro: endif::" + (target) + "[]")
          };
          return true;};
        skip = false;
        if ((($a = self.skipping) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          $case = directive;if ("ifdef"['$===']($case)) {$case = delimiter;if (nil['$===']($case)) {skip = self.document.$attributes()['$has_key?'](target)['$!']()}else if (","['$===']($case)) {skip = ($a = ($b = target.$split(",")).$detect, $a._p = (TMP_8 = function(name){var self = TMP_8._s || this;
            if (self.document == null) self.document = nil;
if (name == null) name = nil;
          return self.document.$attributes()['$has_key?'](name)}, TMP_8._s = self, TMP_8), $a).call($b)['$!']()}else if ("+"['$===']($case)) {skip = ($a = ($c = target.$split("+")).$detect, $a._p = (TMP_9 = function(name){var self = TMP_9._s || this;
            if (self.document == null) self.document = nil;
if (name == null) name = nil;
          return self.document.$attributes()['$has_key?'](name)['$!']()}, TMP_9._s = self, TMP_9), $a).call($c)}}else if ("ifndef"['$===']($case)) {$case = delimiter;if (nil['$===']($case)) {skip = self.document.$attributes()['$has_key?'](target)}else if (","['$===']($case)) {skip = ($a = ($d = target.$split(",")).$detect, $a._p = (TMP_10 = function(name){var self = TMP_10._s || this;
            if (self.document == null) self.document = nil;
if (name == null) name = nil;
          return self.document.$attributes()['$has_key?'](name)['$!']()}, TMP_10._s = self, TMP_10), $a).call($d)['$!']()}else if ("+"['$===']($case)) {skip = ($a = ($e = target.$split("+")).$detect, $a._p = (TMP_11 = function(name){var self = TMP_11._s || this;
            if (self.document == null) self.document = nil;
if (name == null) name = nil;
          return self.document.$attributes()['$has_key?'](name)}, TMP_11._s = self, TMP_11), $a).call($e)}}else if ("ifeval"['$===']($case)) {if ((($a = ((($f = target['$empty?']()['$!']()) !== false && $f !== nil) ? $f : ((expr_match = $scope.EvalExpressionRx.$match(text.$strip())))['$!']())) !== nil && (!$a._isBoolean || $a == true))) {
            return false};
          lhs = self.$resolve_expr_val(expr_match['$[]'](1));
          op = expr_match['$[]'](2);
          rhs = self.$resolve_expr_val(expr_match['$[]'](3));
          skip = (lhs.$send(op.$to_sym(), rhs))['$!']();}
        };
        if ((($a = ((($f = directive['$==']("ifeval")) !== false && $f !== nil) ? $f : text['$!']())) !== nil && (!$a._isBoolean || $a == true))) {
          if (skip !== false && skip !== nil) {
            self.skipping = true};
          self.conditional_stack['$<<']($hash2(["target", "skip", "skipping"], {"target": target, "skip": skip, "skipping": self.skipping}));
        } else if ((($a = ((($f = self.skipping) !== false && $f !== nil) ? $f : skip)) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          conditional_line = self.$peek_line(true);
          self.$replace_line(text.$rstrip());
          self.$unshift(conditional_line);
          return true;
        };
        return true;
      };

      def.$preprocess_include = function(raw_target, raw_attributes) {
        var $a, $b, $c, $d, TMP_12, TMP_13, TMP_14, $e, TMP_16, $f, TMP_19, self = this, target = nil, extension = nil, abs_maxdepth = nil, target_type = nil, include_file = nil, path = nil, inc_lines = nil, tags = nil, attributes = nil, selected = nil, inc_line_offset = nil, inc_lineno = nil, active_tag = nil, tags_found = nil, missing_tags = nil;

        if ((($a = ((target = self.document.$sub_attributes(raw_target, $hash2(["attribute_missing"], {"attribute_missing": "drop-line"}))))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          if (self.document.$attributes().$fetch("attribute-missing", $scope.Compliance.$attribute_missing())['$==']("skip")) {
            self.$replace_line("Unresolved directive in " + (self.path) + " - include::" + (raw_target) + "[" + (raw_attributes) + "]");
            return true;
            } else {
            self.$advance();
            return true;
          }
        } else if ((($a = ($b = self['$include_processors?'](), $b !== false && $b !== nil ?(extension = ($c = ($d = self.include_processor_extensions).$find, $c._p = (TMP_12 = function(candidate){var self = TMP_12._s || this;
if (candidate == null) candidate = nil;
        return candidate.$instance()['$handles?'](target)}, TMP_12._s = self, TMP_12), $c).call($d)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          self.$advance();
          extension.$process_method()['$[]'](self, target, $scope.AttributeList.$new(raw_attributes).$parse());
          return true;
        } else if (self.document.$safe()['$>='](($scope.SafeMode)._scope.SECURE)) {
          self.$replace_line("link:" + (target) + "[]");
          return true;
        } else if ((($a = (($b = ((abs_maxdepth = self.maxdepth['$[]']("abs")))['$>'](0)) ? self.include_stack.$size()['$>='](abs_maxdepth) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          self.$warn("asciidoctor: ERROR: " + (self.$line_info()) + ": maximum include depth of " + (self.maxdepth['$[]']("rel")) + " exceeded");
          return false;
        } else if (abs_maxdepth['$>'](0)) {
          if ((($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            target_type = "file";
            include_file = path = (function() {if ((($a = self.include_stack['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = $opal.Object._scope.Dir) == null ? $opal.cm('Dir') : $a).$pwd()['$=='](self.document.$base_dir())) {
                return target
                } else {
                return ((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$join(self.dir, target))
              }
              } else {
              return (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$join(self.dir, target)
            }; return nil; })();
          } else if ((($a = ($b = target['$include?'](":"), $b !== false && $b !== nil ?$scope.UriSniffRx['$=~'](target) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = self.document.$attributes()['$has_key?']("allow-uri-read")) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              self.$replace_line("link:" + (target) + "[]");
              return true;
            };
            target_type = "uri";
            include_file = path = target;
            if ((($a = self.document.$attributes()['$has_key?']("cache-uri")) !== nil && (!$a._isBoolean || $a == true))) {
              $scope.Helpers.$require_library("open-uri/cached", "open-uri-cached")
            } else if ((($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              (($a = $opal.Object._scope.OpenURI) == null ? $opal.cm('OpenURI') : $a)};
            } else {
            target_type = "file";
            include_file = self.document.$normalize_system_path(target, self.dir, nil, $hash2(["target_name"], {"target_name": "include file"}));
            if ((($a = (($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b)['$file?'](include_file)) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              self.$warn("asciidoctor: WARNING: " + (self.$line_info()) + ": include file not found: " + (include_file));
              self.$replace_line("Unresolved directive in " + (self.path) + " - include::" + (target) + "[" + (raw_attributes) + "]");
              return true;
            };
            path = $scope.PathResolver.$new().$relative_path(include_file, self.document.$base_dir());
          };
          inc_lines = nil;
          tags = nil;
          attributes = $hash2([], {});
          if ((($a = raw_attributes['$empty?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            attributes = $scope.AttributeList.$new(raw_attributes).$parse();
            if ((($a = attributes['$has_key?']("lines")) !== nil && (!$a._isBoolean || $a == true))) {
              inc_lines = [];
              ($a = ($b = attributes['$[]']("lines").$split($scope.DataDelimiterRx)).$each, $a._p = (TMP_13 = function(linedef){var self = TMP_13._s || this, $a, $b, $c, from = nil, to = nil;
if (linedef == null) linedef = nil;
              if ((($a = linedef['$include?']("..")) !== nil && (!$a._isBoolean || $a == true))) {
                  $a = $opal.to_ary(($b = ($c = linedef.$split("..")).$map, $b._p = "to_i".$to_proc(), $b).call($c)), from = ($a[0] == null ? nil : $a[0]), to = ($a[1] == null ? nil : $a[1]);
                  if (to['$=='](-1)) {
                    inc_lines['$<<'](from);
                    return inc_lines['$<<']((1.0)['$/'](0.0));
                    } else {
                    return inc_lines.$concat((($a = $opal.Object._scope.Range) == null ? $opal.cm('Range') : $a).$new(from, to).$to_a())
                  };
                  } else {
                  return inc_lines['$<<'](linedef.$to_i())
                }}, TMP_13._s = self, TMP_13), $a).call($b);
              inc_lines = inc_lines.$sort().$uniq();
            } else if ((($a = attributes['$has_key?']("tag")) !== nil && (!$a._isBoolean || $a == true))) {
              tags = [attributes['$[]']("tag")].$to_set()
            } else if ((($a = attributes['$has_key?']("tags")) !== nil && (!$a._isBoolean || $a == true))) {
              tags = attributes['$[]']("tags").$split($scope.DataDelimiterRx).$uniq().$to_set()};};
          if ((($a = inc_lines['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = inc_lines['$empty?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              selected = [];
              inc_line_offset = 0;
              inc_lineno = 0;
              try {
              ($a = ($c = self).$open, $a._p = (TMP_14 = function(f){var self = TMP_14._s || this, $a, $b, TMP_15;
if (f == null) f = nil;
                return ($a = ($b = f).$each_line, $a._p = (TMP_15 = function(l){var self = TMP_15._s || this, $a, $b, $c, take = nil;
if (l == null) l = nil;
                  inc_lineno = inc_lineno['$+'](1);
                    take = inc_lines['$[]'](0);
                    if ((($a = ($b = take['$is_a?']((($c = $opal.Object._scope.Float) == null ? $opal.cm('Float') : $c)), $b !== false && $b !== nil ?take['$infinite?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                      selected.$push(l);
                      if (inc_line_offset['$=='](0)) {
                        return inc_line_offset = inc_lineno
                        } else {
                        return nil
                      };
                      } else {
                      if (f.$lineno()['$=='](take)) {
                        selected.$push(l);
                        if (inc_line_offset['$=='](0)) {
                          inc_line_offset = inc_lineno};
                        inc_lines.$shift();};
                      if ((($a = inc_lines['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                        return ($breaker.$v = nil, $breaker)
                        } else {
                        return nil
                      };
                    };}, TMP_15._s = self, TMP_15), $a).call($b)}, TMP_14._s = self, TMP_14), $a).call($c, include_file, "r")
              } catch ($err) {if (true) {
                self.$warn("asciidoctor: WARNING: " + (self.$line_info()) + ": include " + (target_type) + " not readable: " + (include_file));
                self.$replace_line("Unresolved directive in " + (self.path) + " - include::" + (target) + "[" + (raw_attributes) + "]");
                return true;
                }else { throw $err; }
              };
              self.$advance();
              self.$push_include(selected, include_file, path, inc_line_offset, attributes);}
          } else if ((($a = tags['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = tags['$empty?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              selected = [];
              inc_line_offset = 0;
              inc_lineno = 0;
              active_tag = nil;
              tags_found = (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new();
              try {
              ($a = ($e = self).$open, $a._p = (TMP_16 = function(f){var self = TMP_16._s || this, $a, $b, TMP_17;
if (f == null) f = nil;
                return ($a = ($b = f).$each_line, $a._p = (TMP_17 = function(l){var self = TMP_17._s || this, $a, $b, TMP_18;
if (l == null) l = nil;
                  inc_lineno = inc_lineno['$+'](1);
                    if ((($a = $scope.FORCE_ENCODING) !== nil && (!$a._isBoolean || $a == true))) {
                      l.$force_encoding(((($a = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $a))._scope.UTF_8)};
                    if ((($a = active_tag['$nil?']()['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
                      if ((($a = l['$include?']("end::" + (active_tag) + "[]")) !== nil && (!$a._isBoolean || $a == true))) {
                        return active_tag = nil
                        } else {
                        selected.$push(l);
                        if (inc_line_offset['$=='](0)) {
                          return inc_line_offset = inc_lineno
                          } else {
                          return nil
                        };
                      }
                      } else {
                      return ($a = ($b = tags).$each, $a._p = (TMP_18 = function(tag){var self = TMP_18._s || this, $a;
if (tag == null) tag = nil;
                      if ((($a = l['$include?']("tag::" + (tag) + "[]")) !== nil && (!$a._isBoolean || $a == true))) {
                          active_tag = tag;
                          tags_found['$<<'](tag);
                          return ($breaker.$v = nil, $breaker);
                          } else {
                          return nil
                        }}, TMP_18._s = self, TMP_18), $a).call($b)
                    };}, TMP_17._s = self, TMP_17), $a).call($b)}, TMP_16._s = self, TMP_16), $a).call($e, include_file, "r")
              } catch ($err) {if (true) {
                self.$warn("asciidoctor: WARNING: " + (self.$line_info()) + ": include " + (target_type) + " not readable: " + (include_file));
                self.$replace_line("Unresolved directive in " + (self.path) + " - include::" + (target) + "[" + (raw_attributes) + "]");
                return true;
                }else { throw $err; }
              };
              if ((($a = ((missing_tags = tags.$to_a()['$-'](tags_found.$to_a())))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                self.$warn("asciidoctor: WARNING: " + (self.$line_info()) + ": tag" + ((function() {if (missing_tags.$size()['$>'](1)) {
                  return "s"
                  } else {
                  return nil
                }; return nil; })()) + " '" + (missing_tags['$*'](",")) + "' not found in include " + (target_type) + ": " + (include_file))
              };
              self.$advance();
              self.$push_include(selected, include_file, path, inc_line_offset, attributes);}
            } else {
            try {
            self.$advance();
              self.$push_include(($a = ($f = self).$open, $a._p = (TMP_19 = function(f){var self = TMP_19._s || this;
if (f == null) f = nil;
              return f.$read()}, TMP_19._s = self, TMP_19), $a).call($f, include_file, "r"), include_file, path, 1, attributes);
            } catch ($err) {if (true) {
              self.$warn("asciidoctor: WARNING: " + (self.$line_info()) + ": include " + (target_type) + " not readable: " + (include_file));
              self.$replace_line("Unresolved directive in " + (self.path) + " - include::" + (target) + "[" + (raw_attributes) + "]");
              return true;
              }else { throw $err; }
            }
          };
          return true;
          } else {
          return false
        };
      };

      def.$push_include = function(data, file, path, lineno, attributes) {
        var $a, self = this, depth = nil;

        if (file == null) {
          file = nil
        }
        if (path == null) {
          path = nil
        }
        if (lineno == null) {
          lineno = 1
        }
        if (attributes == null) {
          attributes = $hash2([], {})
        }
        self.include_stack['$<<']([self.lines, self.file, self.dir, self.path, self.lineno, self.maxdepth, self.process_lines]);
        if (file !== false && file !== nil) {
          self.file = file;
          self.dir = $scope.File.$dirname(file);
          self.process_lines = $scope.ASCIIDOC_EXTENSIONS['$[]']((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$extname(file));
          } else {
          self.file = nil;
          self.dir = ".";
          self.process_lines = true;
        };
        self.path = (function() {if (path !== false && path !== nil) {
          self.includes['$<<']($scope.Helpers.$rootname(path));
          return path;
          } else {
          return "<stdin>"
        }; return nil; })();
        self.lineno = lineno;
        if ((($a = attributes['$has_key?']("depth")) !== nil && (!$a._isBoolean || $a == true))) {
          depth = attributes['$[]']("depth").$to_i();
          if (depth['$<='](0)) {
            depth = 1};
          self.maxdepth = $hash2(["abs", "rel"], {"abs": (self.include_stack.$size()['$-'](1))['$+'](depth), "rel": depth});};
        self.lines = self.$prepare_lines(data, $hash2(["normalize", "condense", "indent"], {"normalize": true, "condense": false, "indent": attributes['$[]']("indent")}));
        if ((($a = self.lines['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.$pop_include()
          } else {
          self.eof = false;
          self.look_ahead = 0;
        };
        return nil;
      };

      def.$pop_include = function() {
        var $a, self = this;

        if (self.include_stack.$size()['$>'](0)) {
          $a = $opal.to_ary(self.include_stack.$pop()), self.lines = ($a[0] == null ? nil : $a[0]), self.file = ($a[1] == null ? nil : $a[1]), self.dir = ($a[2] == null ? nil : $a[2]), self.path = ($a[3] == null ? nil : $a[3]), self.lineno = ($a[4] == null ? nil : $a[4]), self.maxdepth = ($a[5] == null ? nil : $a[5]), self.process_lines = ($a[6] == null ? nil : $a[6]);
          self.eof = self.lines['$empty?']();
          self.look_ahead = 0;};
        return nil;
      };

      def.$include_depth = function() {
        var self = this;

        return self.include_stack.$size();
      };

      def['$exceeded_max_depth?'] = function() {
        var $a, $b, self = this, abs_maxdepth = nil;

        if ((($a = (($b = ((abs_maxdepth = self.maxdepth['$[]']("abs")))['$>'](0)) ? self.include_stack.$size()['$>='](abs_maxdepth) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return self.maxdepth['$[]']("rel")
          } else {
          return false
        };
      };

      def.$shift = TMP_20 = function() {var $zuper = $slice.call(arguments, 0);
        var $a, self = this, $iter = TMP_20._p, $yield = $iter || nil;

        TMP_20._p = null;
        if ((($a = self.unescape_next_line) !== nil && (!$a._isBoolean || $a == true))) {
          self.unescape_next_line = false;
          return $opal.find_super_dispatcher(self, 'shift', TMP_20, $iter).apply(self, $zuper)['$[]']($range(1, -1, false));
          } else {
          return $opal.find_super_dispatcher(self, 'shift', TMP_20, $iter).apply(self, $zuper)
        };
      };

      def['$skip_front_matter!'] = function(data, increment_linenos) {
        var $a, $b, $c, self = this, front_matter = nil, original_data = nil;

        if (increment_linenos == null) {
          increment_linenos = true
        }
        front_matter = nil;
        if (data['$[]'](0)['$==']("---")) {
          original_data = data.$dup();
          front_matter = [];
          data.$shift();
          if (increment_linenos !== false && increment_linenos !== nil) {
            self.lineno = self.lineno['$+'](1)};
          while ((($b = ($c = data['$empty?']()['$!'](), $c !== false && $c !== nil ?data['$[]'](0)['$==']("---")['$!']() : $c)) !== nil && (!$b._isBoolean || $b == true))) {
          front_matter.$push(data.$shift());
          if (increment_linenos !== false && increment_linenos !== nil) {
            self.lineno = self.lineno['$+'](1)};};
          if ((($a = data['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            ($a = data).$unshift.apply($a, [].concat(original_data));
            if (increment_linenos !== false && increment_linenos !== nil) {
              self.lineno = 0};
            front_matter = nil;
            } else {
            data.$shift();
            if (increment_linenos !== false && increment_linenos !== nil) {
              self.lineno = self.lineno['$+'](1)};
          };};
        return front_matter;
      };

      def.$resolve_expr_val = function(str) {
        var $a, $b, $c, self = this, val = nil, type = nil;

        val = str;
        type = nil;
        if ((($a = ((($b = ($c = val['$start_with?']("\""), $c !== false && $c !== nil ?val['$end_with?']("\"") : $c)) !== false && $b !== nil) ? $b : ($c = val['$start_with?']("'"), $c !== false && $c !== nil ?val['$end_with?']("'") : $c))) !== nil && (!$a._isBoolean || $a == true))) {
          type = "string";
          val = val['$[]']($range(1, -1, true));};
        if ((($a = val['$include?']("{")) !== nil && (!$a._isBoolean || $a == true))) {
          val = self.document.$sub_attributes(val)};
        if (type['$==']("string")) {
        } else if ((($a = val['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          val = nil
        } else if ((($a = val.$strip()['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          val = " "
        } else if (val['$==']("true")) {
          val = true
        } else if (val['$==']("false")) {
          val = false
        } else if ((($a = val['$include?'](".")) !== nil && (!$a._isBoolean || $a == true))) {
          val = val.$to_f()
          } else {
          val = val.$to_i()
        };
        return val;
      };

      def['$include_processors?'] = function() {
        var $a, $b, self = this;

        if ((($a = self.include_processor_extensions['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = ($b = self.document['$extensions?'](), $b !== false && $b !== nil ?self.document.$extensions()['$include_processors?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            self.include_processor_extensions = self.document.$extensions().$include_processors();
            return true;
            } else {
            self.include_processor_extensions = false;
            return false;
          }
          } else {
          return self.include_processor_extensions['$=='](false)['$!']()
        };
      };

      return (def.$to_s = function() {
        var $a, $b, TMP_21, self = this;

        return "#<" + (self.$class()) + "@" + (self.$object_id()) + " {path: " + (self.path.$inspect()) + ", line #: " + (self.lineno) + ", include depth: " + (self.include_stack.$size()) + ", include stack: [" + (($a = ($b = self.include_stack).$map, $a._p = (TMP_21 = function(inc){var self = TMP_21._s || this;
if (inc == null) inc = nil;
        return inc.$to_s()}, TMP_21._s = self, TMP_21), $a).call($b).$join(", ")) + "]}>";
      }, nil) && 'to_s';
    })(self, $scope.Reader);
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $range = $opal.range;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Section(){};
      var self = $Section = $klass($base, $super, 'Section', $Section);

      var def = self._proto, $scope = self._scope, TMP_1, TMP_2, TMP_3;

      def.level = def.document = def.parent = def.number = def.title = def.numbered = def.blocks = nil;
      self.$attr_accessor("index");

      self.$attr_accessor("number");

      self.$attr_accessor("sectname");

      self.$attr_accessor("special");

      self.$attr_accessor("numbered");

      def.$initialize = TMP_1 = function(parent, level, numbered) {
        var $a, $b, self = this, $iter = TMP_1._p, $yield = $iter || nil;

        if (parent == null) {
          parent = nil
        }
        if (level == null) {
          level = nil
        }
        if (numbered == null) {
          numbered = true
        }
        TMP_1._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_1, null).apply(self, [parent, "section"]);
        if ((($a = level['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
          if (parent !== false && parent !== nil) {
            self.level = parent.$level()['$+'](1)
          } else if ((($a = self.level['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
            self.level = 1}
          } else {
          self.level = level
        };
        self.numbered = (($a = numbered !== false && numbered !== nil) ? self.level['$>'](0) : $a);
        self.special = ($a = (($b = parent !== false && parent !== nil) ? parent.$context()['$==']("section") : $b), $a !== false && $a !== nil ?parent.$special() : $a);
        self.index = 0;
        return self.number = 1;
      };

      $opal.defn(self, '$name', def.$title);

      def.$generate_id = function() {
        var $a, $b, self = this, sep = nil, pre = nil, base_id = nil, gen_id = nil, cnt = nil;

        if ((($a = self.document.$attributes()['$has_key?']("sectids")) !== nil && (!$a._isBoolean || $a == true))) {
          sep = ((($a = self.document.$attributes()['$[]']("idseparator")) !== false && $a !== nil) ? $a : "_");
          pre = ((($a = self.document.$attributes()['$[]']("idprefix")) !== false && $a !== nil) ? $a : "_");
          base_id = "" + (pre) + (self.$title().$downcase().$gsub($scope.InvalidSectionIdCharsRx, sep).$tr_s(sep, sep).$chomp(sep));
          if ((($a = ($b = pre['$empty?'](), $b !== false && $b !== nil ?base_id['$start_with?'](sep) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            base_id = base_id['$[]']($range(1, -1, false));
            while ((($b = base_id['$start_with?'](sep)) !== nil && (!$b._isBoolean || $b == true))) {
            base_id = base_id['$[]']($range(1, -1, false))};};
          gen_id = base_id;
          cnt = 2;
          while ((($b = self.document.$references()['$[]']("ids")['$has_key?'](gen_id)) !== nil && (!$b._isBoolean || $b == true))) {
          gen_id = "" + (base_id) + (sep) + (cnt);
          cnt = cnt['$+'](1);};
          return gen_id;
          } else {
          return nil
        };
      };

      def.$sectnum = function(delimiter, append) {
        var $a, $b, $c, $d, self = this;

        if (delimiter == null) {
          delimiter = "."
        }
        if (append == null) {
          append = nil
        }
        ((($a = append) !== false && $a !== nil) ? $a : append = ((function() {if (append['$=='](false)) {
          return ""
          } else {
          return delimiter
        }; return nil; })()));
        if ((($a = ($b = ($c = ($d = self.level, $d !== false && $d !== nil ?self.level['$>'](1) : $d), $c !== false && $c !== nil ?self.parent : $c), $b !== false && $b !== nil ?self.parent.$context()['$==']("section") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          return "" + (self.parent.$sectnum(delimiter)) + (self.number) + (append)
          } else {
          return "" + (self.number) + (append)
        };
      };

      def['$<<'] = TMP_2 = function(block) {var $zuper = $slice.call(arguments, 0);
        var self = this, $iter = TMP_2._p, $yield = $iter || nil;

        TMP_2._p = null;
        $opal.find_super_dispatcher(self, '<<', TMP_2, $iter).apply(self, $zuper);
        if (block.$context()['$==']("section")) {
          return self.$assign_index(block)
          } else {
          return nil
        };
      };

      return (def.$to_s = TMP_3 = function() {var $zuper = $slice.call(arguments, 0);
        var $a, self = this, $iter = TMP_3._p, $yield = $iter || nil, qualified_title = nil;

        TMP_3._p = null;
        if ((($a = self.title['$=='](nil)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          qualified_title = (function() {if ((($a = self.numbered) !== nil && (!$a._isBoolean || $a == true))) {
            return "" + (self.$sectnum()) + " " + (self.title)
            } else {
            return self.title
          }; return nil; })();
          return "#<" + (self.$class()) + "@" + (self.$object_id()) + " {level: " + (self.level) + ", title: " + (qualified_title.$inspect()) + ", blocks: " + (self.blocks.$size()) + "}>";
          } else {
          return $opal.find_super_dispatcher(self, 'to_s', TMP_3, $iter).apply(self, $zuper)
        };
      }, nil) && 'to_s';
    })(self, $scope.AbstractBlock)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Stylesheets(){};
      var self = $Stylesheets = $klass($base, $super, 'Stylesheets', $Stylesheets);

      var def = self._proto, $scope = self._scope, $a;

      def.primary_stylesheet_data = def.coderay_stylesheet_data = def.pygments_stylesheet_data = nil;
      $opal.cdecl($scope, 'DEFAULT_STYLESHEET_NAME', "asciidoctor.css");

      $opal.cdecl($scope, 'DEFAULT_PYGMENTS_STYLE', "pastie");

      $opal.cdecl($scope, 'STYLESHEETS_DATA_PATH', (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$join($scope.DATA_PATH, "stylesheets"));

      self.__instance__ = self.$new();

      $opal.defs(self, '$instance', function() {
        var self = this;
        if (self.__instance__ == null) self.__instance__ = nil;

        return self.__instance__;
      });

      def.$primary_stylesheet_name = function() {
        var self = this;

        return $scope.DEFAULT_STYLESHEET_NAME;
      };

      def.$primary_stylesheet_data = function() {
        var $a, $b, self = this;

        return ((($a = self.primary_stylesheet_data) !== false && $a !== nil) ? $a : self.primary_stylesheet_data = (($b = $opal.Object._scope.IO) == null ? $opal.cm('IO') : $b).$read((($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b).$join($scope.STYLESHEETS_DATA_PATH, "asciidoctor-default.css")).$chomp());
      };

      def.$embed_primary_stylesheet = function() {
        var self = this;

        return "<style>\n" + (self.$primary_stylesheet_data()) + "\n</style>";
      };

      def.$write_primary_stylesheet = function(target_dir) {
        var $a, $b, TMP_1, $c, self = this;

        return ($a = ($b = (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c)).$open, $a._p = (TMP_1 = function(f){var self = TMP_1._s || this;
if (f == null) f = nil;
        return f.$write(self.$primary_stylesheet_data())}, TMP_1._s = self, TMP_1), $a).call($b, (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c).$join(target_dir, self.$primary_stylesheet_name()), "w");
      };

      def.$coderay_stylesheet_name = function() {
        var self = this;

        return "coderay-asciidoctor.css";
      };

      def.$coderay_stylesheet_data = function() {
        var $a, $b, self = this;

        return ((($a = self.coderay_stylesheet_data) !== false && $a !== nil) ? $a : self.coderay_stylesheet_data = (($b = $opal.Object._scope.IO) == null ? $opal.cm('IO') : $b).$read((($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b).$join($scope.STYLESHEETS_DATA_PATH, "coderay-asciidoctor.css")).$chomp());
      };

      def.$embed_coderay_stylesheet = function() {
        var self = this;

        return "<style>\n" + (self.$coderay_stylesheet_data()) + "\n</style>";
      };

      def.$write_coderay_stylesheet = function(target_dir) {
        var $a, $b, TMP_2, $c, self = this;

        return ($a = ($b = (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c)).$open, $a._p = (TMP_2 = function(f){var self = TMP_2._s || this;
if (f == null) f = nil;
        return f.$write(self.$coderay_stylesheet_data())}, TMP_2._s = self, TMP_2), $a).call($b, (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c).$join(target_dir, self.$coderay_stylesheet_name()), "w");
      };

      def.$pygments_stylesheet_name = function(style) {
        var $a, self = this;

        if (style == null) {
          style = nil
        }
        ((($a = style) !== false && $a !== nil) ? $a : style = $scope.DEFAULT_PYGMENTS_STYLE);
        return "pygments-" + (style) + ".css";
      };

      def.$pygments_stylesheet_data = function(style) {
        var $a, self = this;

        if (style == null) {
          style = nil
        }
        ((($a = style) !== false && $a !== nil) ? $a : style = $scope.DEFAULT_PYGMENTS_STYLE);
        return (((($a = self.pygments_stylesheet_data) !== false && $a !== nil) ? $a : self.pygments_stylesheet_data = self.$load_pygments()));
      };

      def.$embed_pygments_stylesheet = function(style) {
        var self = this;

        if (style == null) {
          style = nil
        }
        return "<style>\n" + (self.$pygments_stylesheet_data(style)) + "\n</style>";
      };

      def.$write_pygments_stylesheet = function(target_dir, style) {
        var $a, $b, TMP_3, $c, self = this;

        if (style == null) {
          style = nil
        }
        return ($a = ($b = (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c)).$open, $a._p = (TMP_3 = function(f){var self = TMP_3._s || this;
if (f == null) f = nil;
        return f.$write(self.$pygments_stylesheet_data(style))}, TMP_3._s = self, TMP_3), $a).call($b, (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c).$join(target_dir, self.$pygments_stylesheet_name(style)), "w");
      };

      return (def.$load_pygments = function() {
        var $a, self = this;

        if ((($a = ($opal.Object._scope.Pygments == null ? nil : 'constant')) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          $scope.Helpers.$require_library("pygments", "pygments.rb")
        };
        return $hash2([], {});
      }, nil) && 'load_pygments';
    })(self, null)
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base, $super) {
      function $Table(){};
      var self = $Table = $klass($base, $super, 'Table', $Table);

      var def = self._proto, $scope = self._scope, TMP_1;

      def.attributes = def.document = def.has_header_option = def.rows = nil;
      (function($base, $super) {
        function $Rows(){};
        var self = $Rows = $klass($base, $super, 'Rows', $Rows);

        var def = self._proto, $scope = self._scope;

        self.$attr_accessor("head", "foot", "body");

        def.$initialize = function(head, foot, body) {
          var self = this;

          if (head == null) {
            head = []
          }
          if (foot == null) {
            foot = []
          }
          if (body == null) {
            body = []
          }
          self.head = head;
          self.foot = foot;
          return self.body = body;
        };

        return $opal.defn(self, '$[]', def.$send);
      })(self, null);

      $opal.cdecl($scope, 'DEFAULT_DATA_FORMAT', "psv");

      $opal.cdecl($scope, 'DATA_FORMATS', ["psv", "dsv", "csv"]);

      $opal.cdecl($scope, 'DEFAULT_DELIMITERS', $hash2(["psv", "dsv", "csv"], {"psv": "|", "dsv": ":", "csv": ","}));

      $opal.cdecl($scope, 'TEXT_STYLES', $hash2(["d", "s", "e", "m", "h", "l", "v", "a"], {"d": "none", "s": "strong", "e": "emphasis", "m": "monospaced", "h": "header", "l": "literal", "v": "verse", "a": "asciidoc"}));

      $opal.cdecl($scope, 'ALIGNMENTS', $hash2(["h", "v"], {"h": $hash2(["<", ">", "^"], {"<": "left", ">": "right", "^": "center"}), "v": $hash2(["<", ">", "^"], {"<": "top", ">": "bottom", "^": "middle"})}));

      self.$attr_accessor("columns");

      self.$attr_accessor("rows");

      self.$attr_accessor("has_header_option");

      def.$initialize = TMP_1 = function(parent, attributes) {
        var $a, $b, $c, self = this, $iter = TMP_1._p, $yield = $iter || nil, pcwidth = nil, pcwidth_intval = nil;

        TMP_1._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_1, null).apply(self, [parent, "table"]);
        self.rows = $scope.Rows.$new();
        self.columns = [];
        self.has_header_option = attributes['$has_key?']("header-option");
        pcwidth = attributes['$[]']("width");
        pcwidth_intval = pcwidth.$to_i().$abs();
        if ((($a = ((($b = (($c = pcwidth_intval['$=='](0)) ? pcwidth['$==']("0")['$!']() : $c)) !== false && $b !== nil) ? $b : pcwidth_intval['$>'](100))) !== nil && (!$a._isBoolean || $a == true))) {
          pcwidth_intval = 100};
        self.attributes['$[]=']("tablepcwidth", pcwidth_intval);
        if ((($a = self.document.$attributes()['$has_key?']("pagewidth")) !== nil && (!$a._isBoolean || $a == true))) {
          return ($a = "tableabswidth", $b = self.attributes, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, ((self.attributes['$[]']("tablepcwidth").$to_f()['$/'](100))['$*'](self.document.$attributes()['$[]']("pagewidth"))).$round())))
          } else {
          return nil
        };
      };

      def['$header_row?'] = function() {
        var $a, self = this;

        return ($a = self.has_header_option, $a !== false && $a !== nil ?self.rows.$body()['$empty?']() : $a);
      };

      def.$create_columns = function(col_specs) {
        var $a, $b, TMP_2, $c, TMP_3, self = this, total_width = nil, cols = nil, even_width = nil;

        total_width = 0;
        cols = [];
        ($a = ($b = col_specs).$each, $a._p = (TMP_2 = function(col_spec){var self = TMP_2._s || this;
if (col_spec == null) col_spec = nil;
        total_width = total_width['$+'](col_spec['$[]']("width"));
          return cols['$<<']($scope.Column.$new(self, cols.$size(), col_spec));}, TMP_2._s = self, TMP_2), $a).call($b);
        if ((($a = cols['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          self.attributes['$[]=']("colcount", cols.$size());
          even_width = ((100.0)['$/'](cols.$size())).$floor();
          ($a = ($c = cols).$each, $a._p = (TMP_3 = function(c){var self = TMP_3._s || this;
if (c == null) c = nil;
          return c.$assign_width(total_width, even_width)}, TMP_3._s = self, TMP_3), $a).call($c);
        };
        self.columns = cols;
        return nil;
      };

      return (def.$partition_header_footer = function(attributes) {
        var $a, $b, TMP_4, $c, self = this, num_body_rows = nil, head = nil;

        self.attributes['$[]=']("rowcount", self.rows.$body().$size());
        num_body_rows = self.rows.$body().$size();
        if ((($a = (($b = num_body_rows['$>'](0)) ? self.has_header_option : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          head = self.rows.$body().$shift();
          num_body_rows = num_body_rows['$-'](1);
          ($a = ($b = head).$each, $a._p = (TMP_4 = function(c){var self = TMP_4._s || this;
if (c == null) c = nil;
          return c['$style='](nil)}, TMP_4._s = self, TMP_4), $a).call($b);
          self.rows['$head=']([head]);};
        if ((($a = (($c = num_body_rows['$>'](0)) ? attributes['$has_key?']("footer-option") : $c)) !== nil && (!$a._isBoolean || $a == true))) {
          self.rows['$foot=']([self.rows.$body().$pop()])};
        return nil;
      }, nil) && 'partition_header_footer';
    })(self, $scope.AbstractBlock);

    (function($base, $super) {
      function $Column(){};
      var self = $Column = $klass($base, $super, 'Column', $Column);

      var def = self._proto, $scope = self._scope, TMP_5;

      def.attributes = nil;
      self.$attr_accessor("style");

      def.$initialize = TMP_5 = function(table, index, attributes) {
        var $a, $b, $c, self = this, $iter = TMP_5._p, $yield = $iter || nil;

        if (attributes == null) {
          attributes = $hash2([], {})
        }
        TMP_5._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_5, null).apply(self, [table, "column"]);
        self.style = attributes['$[]']("style");
        attributes['$[]=']("colnumber", index['$+'](1));
        ($a = "width", $b = attributes, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, 1)));
        ($a = "halign", $b = attributes, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, "left")));
        ($a = "valign", $b = attributes, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, "top")));
        return self.$update_attributes(attributes);
      };

      $opal.defn(self, '$table', def.$parent);

      return (def.$assign_width = function(total_width, even_width) {
        var $a, self = this, width = nil;

        if (total_width['$>'](0)) {
          width = ((self.attributes['$[]']("width").$to_f()['$/'](total_width))['$*'](100)).$floor()
          } else {
          width = even_width
        };
        self.attributes['$[]=']("colpcwidth", width);
        if ((($a = self.$parent().$attributes()['$has_key?']("tableabswidth")) !== nil && (!$a._isBoolean || $a == true))) {
          self.attributes['$[]=']("colabswidth", ((width.$to_f()['$/'](100))['$*'](self.$parent().$attributes()['$[]']("tableabswidth"))).$round())};
        return nil;
      }, nil) && 'assign_width';
    })($scope.Table, $scope.AbstractNode);

    (function($base, $super) {
      function $Cell(){};
      var self = $Cell = $klass($base, $super, 'Cell', $Cell);

      var def = self._proto, $scope = self._scope, TMP_6, TMP_8;

      def.style = def.document = def.text = def.inner_document = def.colspan = def.rowspan = def.attributes = nil;
      self.$attr_accessor("style");

      self.$attr_accessor("colspan");

      self.$attr_accessor("rowspan");

      $opal.defn(self, '$column', def.$parent);

      self.$attr_reader("inner_document");

      def.$initialize = TMP_6 = function(column, text, attributes, cursor) {
        var $a, $b, self = this, $iter = TMP_6._p, $yield = $iter || nil, parent_doctitle = nil, inner_document_lines = nil, unprocessed_lines = nil, processed_lines = nil;

        if (attributes == null) {
          attributes = $hash2([], {})
        }
        if (cursor == null) {
          cursor = nil
        }
        TMP_6._p = null;
        $opal.find_super_dispatcher(self, 'initialize', TMP_6, null).apply(self, [column, "cell"]);
        self.text = text;
        self.style = nil;
        self.colspan = nil;
        self.rowspan = nil;
        if (column !== false && column !== nil) {
          self.style = column.$attributes()['$[]']("style");
          self.$update_attributes(column.$attributes());};
        if (attributes !== false && attributes !== nil) {
          self.colspan = attributes.$delete("colspan");
          self.rowspan = attributes.$delete("rowspan");
          if ((($a = attributes['$has_key?']("style")) !== nil && (!$a._isBoolean || $a == true))) {
            self.style = attributes['$[]']("style")};
          self.$update_attributes(attributes);};
        if ((($a = (($b = self.style['$==']("asciidoc")) ? column.$table()['$header_row?']()['$!']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          parent_doctitle = self.document.$attributes().$delete("doctitle");
          inner_document_lines = self.text.$split($scope.EOL);
          if ((($a = ((($b = inner_document_lines['$empty?']()) !== false && $b !== nil) ? $b : inner_document_lines['$[]'](0)['$include?']("::")['$!']())) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            unprocessed_lines = inner_document_lines['$[]'](0);
            processed_lines = $scope.PreprocessorReader.$new(self.document, unprocessed_lines).$readlines();
            if ((($a = processed_lines['$=='](unprocessed_lines)['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
              inner_document_lines.$shift();
              ($a = inner_document_lines).$unshift.apply($a, [].concat(processed_lines));};
          };
          self.inner_document = $scope.Document.$new(inner_document_lines, $hash2(["header_footer", "parent", "cursor"], {"header_footer": false, "parent": self.document, "cursor": cursor}));
          if ((($b = parent_doctitle['$nil?']()) !== nil && (!$b._isBoolean || $b == true))) {
            return nil
            } else {
            return self.document.$attributes()['$[]=']("doctitle", parent_doctitle)
          };
          } else {
          return nil
        };
      };

      def.$text = function() {
        var self = this;

        return self.$apply_normal_subs(self.text).$strip();
      };

      def.$content = function() {
        var $a, $b, TMP_7, self = this;

        if (self.style['$==']("asciidoc")) {
          return self.inner_document.$convert()
          } else {
          return ($a = ($b = self.$text().$split($scope.BlankLineRx)).$map, $a._p = (TMP_7 = function(p){var self = TMP_7._s || this, $a, $b;
            if (self.style == null) self.style = nil;
if (p == null) p = nil;
          if ((($a = ((($b = self.style['$!']()) !== false && $b !== nil) ? $b : self.style['$==']("header"))) !== nil && (!$a._isBoolean || $a == true))) {
              return p
              } else {
              return $scope.Inline.$new(self.$parent(), "quoted", p, $hash2(["type"], {"type": self.style})).$convert()
            }}, TMP_7._s = self, TMP_7), $a).call($b)
        };
      };

      return (def.$to_s = TMP_8 = function() {var $zuper = $slice.call(arguments, 0);
        var $a, self = this, $iter = TMP_8._p, $yield = $iter || nil;

        TMP_8._p = null;
        return "" + ($opal.find_super_dispatcher(self, 'to_s', TMP_8, $iter).apply(self, $zuper).$to_s()) + " - [text: " + (self.text) + ", colspan: " + (((($a = self.colspan) !== false && $a !== nil) ? $a : 1)) + ", rowspan: " + (((($a = self.rowspan) !== false && $a !== nil) ? $a : 1)) + ", attributes: " + (self.attributes) + "]";
      }, nil) && 'to_s';
    })($scope.Table, $scope.AbstractNode);

    (function($base, $super) {
      function $ParserContext(){};
      var self = $ParserContext = $klass($base, $super, 'ParserContext', $ParserContext);

      var def = self._proto, $scope = self._scope;

      def.format = def.delimiter = def.delimiter_re = def.buffer = def.cell_specs = def.cell_open = def.last_cursor = def.table = def.current_row = def.col_count = def.col_visits = def.active_rowspans = def.linenum = nil;
      self.$attr_accessor("table");

      self.$attr_accessor("format");

      self.$attr_reader("col_count");

      self.$attr_accessor("buffer");

      self.$attr_reader("delimiter");

      self.$attr_reader("delimiter_re");

      def.$initialize = function(reader, table, attributes) {
        var $a, $b, $c, self = this;

        if (attributes == null) {
          attributes = $hash2([], {})
        }
        self.reader = reader;
        self.table = table;
        self.last_cursor = reader.$cursor();
        if ((($a = (self.format = attributes['$[]']("format"))) !== nil && (!$a._isBoolean || $a == true))) {
          if ((($a = ($scope.Table)._scope.DATA_FORMATS['$include?'](self.format)) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$raise("Illegal table format: " + (self.format))
          }
          } else {
          self.format = ($scope.Table)._scope.DEFAULT_DATA_FORMAT
        };
        if ((($a = ($b = (($c = self.format['$==']("psv")) ? attributes['$has_key?']("separator")['$!']() : $c), $b !== false && $b !== nil ?table.$document()['$nested?']() : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          self.delimiter = "!"
          } else {
          self.delimiter = ((($a = attributes['$[]']("separator")) !== false && $a !== nil) ? $a : ($scope.Table)._scope.DEFAULT_DELIMITERS['$[]'](self.format))
        };
        self.delimiter_re = (new RegExp("" + $scope.Regexp.$escape(self.delimiter)));
        self.col_count = (function() {if ((($a = table.$columns()['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
          return -1
          } else {
          return table.$columns().$size()
        }; return nil; })();
        self.buffer = "";
        self.cell_specs = [];
        self.cell_open = false;
        self.active_rowspans = [0];
        self.col_visits = 0;
        self.current_row = [];
        return self.linenum = -1;
      };

      def['$starts_with_delimiter?'] = function(line) {
        var self = this;

        return line['$start_with?'](self.delimiter);
      };

      def.$match_delimiter = function(line) {
        var self = this;

        return self.delimiter_re.$match(line);
      };

      def.$skip_matched_delimiter = function(match, escaped) {
        var self = this;

        if (escaped == null) {
          escaped = false
        }
        self.buffer = "" + (self.buffer) + ((function() {if (escaped !== false && escaped !== nil) {
          return match.$pre_match().$chop()
          } else {
          return match.$pre_match()
        }; return nil; })()) + (self.delimiter);
        return match.$post_match();
      };

      def['$buffer_has_unclosed_quotes?'] = function(append) {
        var $a, $b, self = this, record = nil;

        if (append == null) {
          append = nil
        }
        record = ((("") + (self.buffer)) + (append)).$strip();
        return ($a = ($b = record['$start_with?']("\""), $b !== false && $b !== nil ?record['$start_with?']("\"\"")['$!']() : $b), $a !== false && $a !== nil ?record['$end_with?']("\"")['$!']() : $a);
      };

      def['$buffer_quoted?'] = function() {
        var $a, self = this;

        self.buffer = self.buffer.$lstrip();
        return ($a = self.buffer['$start_with?']("\""), $a !== false && $a !== nil ?self.buffer['$start_with?']("\"\"")['$!']() : $a);
      };

      def.$take_cell_spec = function() {
        var self = this;

        return self.cell_specs.$shift();
      };

      def.$push_cell_spec = function(cell_spec) {
        var $a, self = this;

        if (cell_spec == null) {
          cell_spec = $hash2([], {})
        }
        self.cell_specs['$<<']((((($a = cell_spec) !== false && $a !== nil) ? $a : $hash2([], {}))));
        return nil;
      };

      def.$keep_cell_open = function() {
        var self = this;

        self.cell_open = true;
        return nil;
      };

      def.$mark_cell_closed = function() {
        var self = this;

        self.cell_open = false;
        return nil;
      };

      def['$cell_open?'] = function() {
        var self = this;

        return self.cell_open;
      };

      def['$cell_closed?'] = function() {
        var self = this;

        return self.cell_open['$!']();
      };

      def.$close_open_cell = function(next_cell_spec) {
        var $a, self = this;

        if (next_cell_spec == null) {
          next_cell_spec = $hash2([], {})
        }
        self.$push_cell_spec(next_cell_spec);
        if ((($a = self['$cell_open?']()) !== nil && (!$a._isBoolean || $a == true))) {
          self.$close_cell(true)};
        self.$advance();
        return nil;
      };

      def.$close_cell = function(eol) {
        var $a, $b, TMP_9, self = this, cell_text = nil, cell_spec = nil, repeat = nil;

        if (eol == null) {
          eol = false
        }
        cell_text = self.buffer.$strip();
        self.buffer = "";
        if (self.format['$==']("psv")) {
          cell_spec = self.$take_cell_spec();
          if ((($a = cell_spec['$nil?']()) !== nil && (!$a._isBoolean || $a == true))) {
            self.$warn("asciidoctor: ERROR: " + (self.last_cursor.$line_info()) + ": table missing leading separator, recovering automatically");
            cell_spec = $hash2([], {});
            repeat = 1;
            } else {
            repeat = cell_spec.$fetch("repeatcol", 1);
            cell_spec.$delete("repeatcol");
          };
          } else {
          cell_spec = nil;
          repeat = 1;
          if (self.format['$==']("csv")) {
            if ((($a = ($b = cell_text['$empty?']()['$!'](), $b !== false && $b !== nil ?cell_text['$include?']("\"") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = ($b = cell_text['$start_with?']("\""), $b !== false && $b !== nil ?cell_text['$end_with?']("\"") : $b)) !== nil && (!$a._isBoolean || $a == true))) {
                cell_text = cell_text['$[]']($range(1, -1, true)).$strip()};
              cell_text = cell_text.$tr_s("\"", "\"");}};
        };
        ($a = ($b = (1)).$upto, $a._p = (TMP_9 = function(i){var self = TMP_9._s || this, $a, $b, $c, $d, column = nil, cell = nil;
          if (self.col_count == null) self.col_count = nil;
          if (self.table == null) self.table = nil;
          if (self.current_row == null) self.current_row = nil;
          if (self.last_cursor == null) self.last_cursor = nil;
          if (self.reader == null) self.reader = nil;
          if (self.col_visits == null) self.col_visits = nil;
          if (self.linenum == null) self.linenum = nil;
if (i == null) i = nil;
        if (self.col_count['$=='](-1)) {
            self.table.$columns()['$<<'](($scope.Table)._scope.Column.$new(self.table, self.current_row.$size()['$+'](i)['$-'](1)));
            column = self.table.$columns()['$[]'](-1);
            } else {
            column = self.table.$columns()['$[]'](self.current_row.$size())
          };
          cell = ($scope.Table)._scope.Cell.$new(column, cell_text, cell_spec, self.last_cursor);
          self.last_cursor = self.reader.$cursor();
          if ((($a = ((($b = cell.$rowspan()['$!']()) !== false && $b !== nil) ? $b : cell.$rowspan()['$=='](1))) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$activate_rowspan(cell.$rowspan(), (((($a = cell.$colspan()) !== false && $a !== nil) ? $a : 1)))
          };
          self.col_visits = self.col_visits['$+']((((($a = cell.$colspan()) !== false && $a !== nil) ? $a : 1)));
          self.current_row['$<<'](cell);
          if ((($a = ($b = self['$end_of_row?'](), $b !== false && $b !== nil ?(((($c = ((($d = self.col_count['$=='](-1)['$!']()) !== false && $d !== nil) ? $d : self.linenum['$>'](0))) !== false && $c !== nil) ? $c : ((($d = eol !== false && eol !== nil) ? i['$=='](repeat) : $d)))) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$close_row()
            } else {
            return nil
          };}, TMP_9._s = self, TMP_9), $a).call($b, repeat);
        self.open_cell = false;
        return nil;
      };

      def.$close_row = function() {
        var $a, $b, $c, self = this;

        self.table.$rows().$body()['$<<'](self.current_row);
        if (self.col_count['$=='](-1)) {
          self.col_count = self.col_visits};
        self.col_visits = 0;
        self.current_row = [];
        self.active_rowspans.$shift();
        ($a = 0, $b = self.active_rowspans, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, 0)));
        return nil;
      };

      def.$activate_rowspan = function(rowspan, colspan) {
        var $a, $b, TMP_10, self = this;

        ($a = ($b = (1).$upto(rowspan['$-'](1))).$each, $a._p = (TMP_10 = function(i){var self = TMP_10._s || this, $a;
          if (self.active_rowspans == null) self.active_rowspans = nil;
if (i == null) i = nil;
        return self.active_rowspans['$[]='](i, (((($a = self.active_rowspans['$[]'](i)) !== false && $a !== nil) ? $a : 0))['$+'](colspan))}, TMP_10._s = self, TMP_10), $a).call($b);
        return nil;
      };

      def['$end_of_row?'] = function() {
        var $a, self = this;

        return ((($a = self.col_count['$=='](-1)) !== false && $a !== nil) ? $a : self.$effective_col_visits()['$=='](self.col_count));
      };

      def.$effective_col_visits = function() {
        var self = this;

        return self.col_visits['$+'](self.active_rowspans['$[]'](0));
      };

      return (def.$advance = function() {
        var self = this;

        return self.linenum = self.linenum['$+'](1);
      }, nil) && 'advance';
    })($scope.Table, null);
    
  })(self)
})(Opal);
/* Generated by Opal 0.6.2 */
(function($opal) {
  var $a, self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $gvars = $opal.gvars, $module = $opal.module, $hash2 = $opal.hash2, $range = $opal.range;
  if ($gvars[":"] == null) $gvars[":"] = nil;

  if ((($a = ($scope.RUBY_ENGINE != null)) !== nil && (!$a._isBoolean || $a == true))) {
    } else {
    $opal.cdecl($scope, 'RUBY_ENGINE', "unknown")
  };
  $opal.cdecl($scope, 'RUBY_ENGINE_OPAL', ($scope.RUBY_ENGINE['$==']("opal")));
  $opal.cdecl($scope, 'RUBY_ENGINE_JRUBY', ($scope.RUBY_ENGINE['$==']("jruby")));
  $opal.cdecl($scope, 'RUBY_MIN_VERSION_1_9', ($scope.RUBY_VERSION['$>=']("1.9")));
  $opal.cdecl($scope, 'RUBY_MIN_VERSION_2', ($scope.RUBY_VERSION['$>=']("2")));
  ;
  if ($scope.RUBY_ENGINE['$==']("opal")) {
    ;
    ;
    ;};
  $gvars[":"].$unshift($scope.File.$dirname("asciidoctor"));
  (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope, $a, $b, TMP_1;

    $opal.cdecl($scope, 'RUBY_ENGINE', (($a = $opal.Object._scope.RUBY_ENGINE) == null ? $opal.cm('RUBY_ENGINE') : $a));

    (function($base) {
      var self = $module($base, 'SafeMode');

      var def = self._proto, $scope = self._scope;

      $opal.cdecl($scope, 'UNSAFE', 0);

      $opal.cdecl($scope, 'SAFE', 1);

      $opal.cdecl($scope, 'SERVER', 10);

      $opal.cdecl($scope, 'SECURE', 20);
      
    })(self);

    (function($base) {
      var self = $module($base, 'Compliance');

      var def = self._proto, $scope = self._scope;

      self.keys = [].$to_set();

      (function(self) {
        var $scope = self._scope, def = self._proto;

        return self.$attr("keys")
      })(self.$singleton_class());

      $opal.defs(self, '$define', function(key, value) {
        var $a, $b, self = this;
        if (self.keys == null) self.keys = nil;

        if ((($a = ((($b = key['$==']("keys")) !== false && $b !== nil) ? $b : (self['$respond_to?'](key)))) !== nil && (!$a._isBoolean || $a == true))) {
          self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "Illegal key name: " + (key))};
        self.$instance_variable_set("@" + (key), value);
        (function(self) {
          var $scope = self._scope, def = self._proto;

          return self
        })(self.$singleton_class()).$send("attr_accessor", key);
        return self.keys['$<<'](key);
      });

      self.$define("block_terminates_paragraph", true);

      self.$define("strict_verbatim_paragraphs", true);

      self.$define("underline_style_section_titles", true);

      self.$define("unwrap_standalone_preamble", true);

      self.$define("attribute_missing", "skip");

      self.$define("attribute_undefined", "drop-line");

      self.$define("markdown_syntax", true);
      
    })(self);

    $opal.cdecl($scope, 'ROOT_PATH', (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path("asciidoctor"))));

    $opal.cdecl($scope, 'LIB_PATH', (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$join($scope.ROOT_PATH, "lib"));

    $opal.cdecl($scope, 'DATA_PATH', (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$join($scope.ROOT_PATH, "data"));

    $opal.cdecl($scope, 'USER_HOME', (function() {try {return (($a = $opal.Object._scope.Dir) == null ? $opal.cm('Dir') : $a).$home() } catch ($err) { return ((($a = (($b = $opal.Object._scope.ENV) == null ? $opal.cm('ENV') : $b)['$[]']("HOME")) !== false && $a !== nil) ? $a : (($b = $opal.Object._scope.Dir) == null ? $opal.cm('Dir') : $b).$pwd()) }})());

    $opal.cdecl($scope, 'COERCE_ENCODING', ($a = (($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)['$!'](), $a !== false && $a !== nil ?(($b = $opal.Object._scope.RUBY_MIN_VERSION_1_9) == null ? $opal.cm('RUBY_MIN_VERSION_1_9') : $b) : $a));

    $opal.cdecl($scope, 'FORCE_ENCODING', ($a = $scope.COERCE_ENCODING, $a !== false && $a !== nil ?(($b = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $b).$default_external()['$=='](((($b = $opal.Object._scope.Encoding) == null ? $opal.cm('Encoding') : $b))._scope.UTF_8)['$!']() : $a));

    $opal.cdecl($scope, 'BOM_BYTES_UTF_8', "\xEF\xBB\xBF".$bytes().$to_a());

    $opal.cdecl($scope, 'BOM_BYTES_UTF_16LE', "\xFF\xFE".$bytes().$to_a());

    $opal.cdecl($scope, 'BOM_BYTES_UTF_16BE', "\xFE\xFF".$bytes().$to_a());

    $opal.cdecl($scope, 'FORCE_UNICODE_LINE_LENGTH', (($a = $opal.Object._scope.RUBY_MIN_VERSION_1_9) == null ? $opal.cm('RUBY_MIN_VERSION_1_9') : $a)['$!']());

    $opal.cdecl($scope, 'SUPPORTS_GSUB_RESULT_HASH', ($a = (($b = $opal.Object._scope.RUBY_MIN_VERSION_1_9) == null ? $opal.cm('RUBY_MIN_VERSION_1_9') : $b), $a !== false && $a !== nil ?(($b = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $b)['$!']() : $a));

    $opal.cdecl($scope, 'EOL', "\n");

    $opal.cdecl($scope, 'NULL', "\x00");

    $opal.cdecl($scope, 'TAB', "\t");

    $opal.cdecl($scope, 'TAB_PATTERN', /\t/);

    $opal.cdecl($scope, 'DEFAULT_DOCTYPE', "article");

    $opal.cdecl($scope, 'DEFAULT_BACKEND', "html5");

    $opal.cdecl($scope, 'DEFAULT_STYLESHEET_KEYS', ["", "DEFAULT"].$to_set());

    $opal.cdecl($scope, 'DEFAULT_STYLESHEET_NAME', "asciidoctor.css");

    $opal.cdecl($scope, 'BACKEND_ALIASES', $hash2(["html", "docbook"], {"html": "html5", "docbook": "docbook5"}));

    $opal.cdecl($scope, 'DEFAULT_PAGE_WIDTHS', $hash2(["docbook"], {"docbook": 425}));

    $opal.cdecl($scope, 'DEFAULT_EXTENSIONS', $hash2(["html", "docbook", "pdf", "epub", "asciidoc"], {"html": ".html", "docbook": ".xml", "pdf": ".pdf", "epub": ".epub", "asciidoc": ".adoc"}));

    $opal.cdecl($scope, 'ASCIIDOC_EXTENSIONS', $hash2([".asciidoc", ".adoc", ".ad", ".asc", ".txt"], {".asciidoc": true, ".adoc": true, ".ad": true, ".asc": true, ".txt": true}));

    $opal.cdecl($scope, 'SECTION_LEVELS', $hash2(["=", "-", "~", "^", "+"], {"=": 0, "-": 1, "~": 2, "^": 3, "+": 4}));

    $opal.cdecl($scope, 'ADMONITION_STYLES', ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"].$to_set());

    $opal.cdecl($scope, 'PARAGRAPH_STYLES', ["comment", "example", "literal", "listing", "normal", "pass", "quote", "sidebar", "source", "verse", "abstract", "partintro"].$to_set());

    $opal.cdecl($scope, 'VERBATIM_STYLES', ["literal", "listing", "source", "verse"].$to_set());

    $opal.cdecl($scope, 'DELIMITED_BLOCKS', $hash2(["--", "----", "....", "====", "****", "____", "\"\"", "++++", "|===", ",===", ":===", "!===", "////", "```", "~~~"], {"--": ["open", ["comment", "example", "literal", "listing", "pass", "quote", "sidebar", "source", "verse", "admonition", "abstract", "partintro"].$to_set()], "----": ["listing", ["literal", "source"].$to_set()], "....": ["literal", ["listing", "source"].$to_set()], "====": ["example", ["admonition"].$to_set()], "****": ["sidebar", (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new()], "____": ["quote", ["verse"].$to_set()], "\"\"": ["quote", ["verse"].$to_set()], "++++": ["pass", ["math", "latexmath", "asciimath"].$to_set()], "|===": ["table", (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new()], ",===": ["table", (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new()], ":===": ["table", (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new()], "!===": ["table", (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new()], "////": ["comment", (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new()], "```": ["fenced_code", (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new()], "~~~": ["fenced_code", (($a = $opal.Object._scope.Set) == null ? $opal.cm('Set') : $a).$new()]}));

    $opal.cdecl($scope, 'DELIMITED_BLOCK_LEADERS', ($a = ($b = $scope.DELIMITED_BLOCKS.$keys()).$map, $a._p = (TMP_1 = function(key){var self = TMP_1._s || this;
if (key == null) key = nil;
    return key['$[]']($range(0, 1, false))}, TMP_1._s = self, TMP_1), $a).call($b).$to_set());

    $opal.cdecl($scope, 'LAYOUT_BREAK_LINES', $hash2(["'", "-", "*", "_", "<"], {"'": "thematic_break", "-": "thematic_break", "*": "thematic_break", "_": "thematic_break", "<": "page_break"}));

    $opal.cdecl($scope, 'NESTABLE_LIST_CONTEXTS', ["ulist", "olist", "dlist"]);

    $opal.cdecl($scope, 'ORDERED_LIST_STYLES', ["arabic", "loweralpha", "lowerroman", "upperalpha", "upperroman"]);

    $opal.cdecl($scope, 'ORDERED_LIST_KEYWORDS', $hash2(["loweralpha", "lowerroman", "upperalpha", "upperroman"], {"loweralpha": "a", "lowerroman": "i", "upperalpha": "A", "upperroman": "I"}));

    $opal.cdecl($scope, 'LIST_CONTINUATION', "+");

    $opal.cdecl($scope, 'LINE_BREAK', " +");

    $opal.cdecl($scope, 'BLOCK_MATH_DELIMITERS', $hash2(["asciimath", "latexmath"], {"asciimath": ["\\$", "\\$"], "latexmath": ["\\[", "\\]"]}));

    $opal.cdecl($scope, 'INLINE_MATH_DELIMITERS', $hash2(["asciimath", "latexmath"], {"asciimath": ["\\$", "\\$"], "latexmath": ["\\(", "\\)"]}));

    $opal.cdecl($scope, 'FLEXIBLE_ATTRIBUTES', ["numbered"]);

    if ($scope.RUBY_ENGINE['$==']("opal")) {
      $opal.cdecl($scope, 'CC_ALPHA', "a-zA-Z");

      $opal.cdecl($scope, 'CG_ALPHA', "[a-zA-Z]");

      $opal.cdecl($scope, 'CC_ALNUM', "a-zA-Z0-9");

      $opal.cdecl($scope, 'CG_ALNUM', "[a-zA-Z0-9]");

      $opal.cdecl($scope, 'CG_BLANK', "[ \\t]");

      $opal.cdecl($scope, 'CC_EOL', "(?=\\n|$)");

      $opal.cdecl($scope, 'CG_GRAPH', "[\\x21-\\x7E]");

      $opal.cdecl($scope, 'CC_WORD', "a-zA-Z0-9_");

      $opal.cdecl($scope, 'CG_WORD', "[a-zA-Z0-9_]");};

    $opal.cdecl($scope, 'AuthorInfoLineRx', (new RegExp("^(" + $scope.CG_WORD + "[" + $scope.CC_WORD + "\\-'.]*)(?: +(" + $scope.CG_WORD + "[" + $scope.CC_WORD + "\\-'.]*))?(?: +(" + $scope.CG_WORD + "[" + $scope.CC_WORD + "\\-'.]*))?(?: +<([^>]+)>)?$")));

    $opal.cdecl($scope, 'RevisionInfoLineRx', /^(?:\D*(.*?),)?(?:\s*(?!:)(.*?))(?:\s*(?!^):\s*(.*))?$/);

    $opal.cdecl($scope, 'ManpageTitleVolnumRx', /^(.*)\((.*)\)$/);

    $opal.cdecl($scope, 'ManpageNamePurposeRx', (new RegExp("^(.*?)" + $scope.CG_BLANK + "+-" + $scope.CG_BLANK + "+(.*)$")));

    $opal.cdecl($scope, 'ConditionalDirectiveRx', /^\\?(ifdef|ifndef|ifeval|endif)::(\S*?(?:([,\+])\S+?)?)\[(.+)?\]$/);

    $opal.cdecl($scope, 'EvalExpressionRx', (new RegExp("^(\\S.*?)" + $scope.CG_BLANK + "*(==|!=|<=|>=|<|>)" + $scope.CG_BLANK + "*(\\S.*)$")));

    $opal.cdecl($scope, 'IncludeDirectiveRx', /^\\?include::([^\[]+)\[(.*?)\]$/);

    $opal.cdecl($scope, 'AttributeEntryRx', (new RegExp("^:(!?\\w.*?):(?:" + $scope.CG_BLANK + "+(.*))?$")));

    $opal.cdecl($scope, 'InvalidAttributeNameCharsRx', /[^\w\-]/);

    $opal.cdecl($scope, 'AttributeEntryPassMacroRx', /^pass:([a-z,]*)\[(.*)\]$/);

    $opal.cdecl($scope, 'AttributeReferenceRx', /(\\)?\{((set|counter2?):.+?|\w+(?:[\-]\w+)*)(\\)?\}/);

    $opal.cdecl($scope, 'BlockAnchorRx', (new RegExp("^\\[\\[(?:|([" + $scope.CC_ALPHA + ":_][" + $scope.CC_WORD + ":.-]*)(?:," + $scope.CG_BLANK + "*(\\S.*))?)\\]\\]$")));

    $opal.cdecl($scope, 'BlockAttributeListRx', (new RegExp("^\\[(|" + $scope.CG_BLANK + "*[" + $scope.CC_WORD + "\\{,.#\"'%].*)\\]$")));

    $opal.cdecl($scope, 'BlockAttributeLineRx', (new RegExp("^\\[(|" + $scope.CG_BLANK + "*[" + $scope.CC_WORD + "\\{,.#\"'%].*|\\[(?:|[" + $scope.CC_ALPHA + ":_][" + $scope.CC_WORD + ":.-]*(?:," + $scope.CG_BLANK + "*\\S.*)?)\\])\\]$")));

    $opal.cdecl($scope, 'BlockTitleRx', /^\.([^\s.].*)$/);

    $opal.cdecl($scope, 'AdmonitionParagraphRx', (new RegExp("^(" + $scope.ADMONITION_STYLES.$to_a()['$*']("|") + "):" + $scope.CG_BLANK)));

    $opal.cdecl($scope, 'LiteralParagraphRx', (new RegExp("^(" + $scope.CG_BLANK + "+.*)$")));

    $opal.cdecl($scope, 'CommentBlockRx', /^\/{4,}$/);

    $opal.cdecl($scope, 'CommentLineRx', /^\/\/(?:[^\/]|$)/);

    $opal.cdecl($scope, 'AtxSectionRx', (new RegExp("^((?:=|#){1,6})" + $scope.CG_BLANK + "+(\\S.*?)(?:" + $scope.CG_BLANK + "+\\1)?$")));

    $opal.cdecl($scope, 'SetextSectionTitleRx', (new RegExp("^((?=.*" + $scope.CG_WORD + "+.*)[^.].*?)$")));

    $opal.cdecl($scope, 'SetextSectionLineRx', /^(?:=|-|~|\^|\+)+$/);

    $opal.cdecl($scope, 'InlineSectionAnchorRx', (new RegExp("^(.*?)" + $scope.CG_BLANK + "+(\\\\)?\\[\\[([" + $scope.CC_ALPHA + ":_][" + $scope.CC_WORD + ":.-]*)(?:," + $scope.CG_BLANK + "*(\\S.*?))?\\]\\]$")));

    $opal.cdecl($scope, 'InvalidSectionIdCharsRx', (new RegExp("&(?:[a-zA-Z]{2,}|#\\d{2,5}|#x[a-fA-F0-9]{2,4});|[^" + $scope.CC_WORD + "]+?")));

    $opal.cdecl($scope, 'FloatingTitleStyleRx', /^(?:float|discrete)\b/);

    $opal.cdecl($scope, 'AnyListRx', (new RegExp("^(?:<?\\d+>" + $scope.CG_BLANK + "+" + $scope.CG_GRAPH + "|" + $scope.CG_BLANK + "*(?:-|(?:\\*|\\.){1,5}|\\d+\\.|[a-zA-Z]\\.|[IVXivx]+\\))" + $scope.CG_BLANK + "+" + $scope.CG_GRAPH + "|" + $scope.CG_BLANK + "*.*?(?::{2,4}|;;)(?:" + $scope.CG_BLANK + "+" + $scope.CG_GRAPH + "|$))")));

    $opal.cdecl($scope, 'UnorderedListRx', (new RegExp("^" + $scope.CG_BLANK + "*(-|\\*{1,5})" + $scope.CG_BLANK + "+(.*)$")));

    $opal.cdecl($scope, 'OrderedListRx', (new RegExp("^" + $scope.CG_BLANK + "*(\\.{1,5}|\\d+\\.|[a-zA-Z]\\.|[IVXivx]+\\))" + $scope.CG_BLANK + "+(.*)$")));

    $opal.cdecl($scope, 'OrderedListMarkerRxMap', $hash2(["arabic", "loweralpha", "lowerroman", "upperalpha", "upperroman"], {"arabic": /\d+[.>]/, "loweralpha": /[a-z]\./, "lowerroman": /[ivx]+\)/, "upperalpha": /[A-Z]\./, "upperroman": /[IVX]+\)/}));

    $opal.cdecl($scope, 'DefinitionListRx', (new RegExp("^(?!\\/\\/)" + $scope.CG_BLANK + "*(.*?)(:{2,4}|;;)(?:" + $scope.CG_BLANK + "+(.*))?$")));

    $opal.cdecl($scope, 'DefinitionListSiblingRx', $hash2(["::", ":::", "::::", ";;"], {"::": (new RegExp("^(?!\\/\\/)" + $scope.CG_BLANK + "*((?:.*[^:])?)(::)(?:" + $scope.CG_BLANK + "+(.*))?$")), ":::": (new RegExp("^(?!\\/\\/)" + $scope.CG_BLANK + "*((?:.*[^:])?)(:::)(?:" + $scope.CG_BLANK + "+(.*))?$")), "::::": (new RegExp("^(?!\\/\\/)" + $scope.CG_BLANK + "*((?:.*[^:])?)(::::)(?:" + $scope.CG_BLANK + "+(.*))?$")), ";;": (new RegExp("^(?!\\/\\/)" + $scope.CG_BLANK + "*(.*)(;;)(?:" + $scope.CG_BLANK + "+(.*))?$"))}));

    $opal.cdecl($scope, 'CalloutListRx', (new RegExp("^<?(\\d+)>" + $scope.CG_BLANK + "+(.*)")));

    $opal.cdecl($scope, 'CalloutConvertRx', (new RegExp("(?:(?:\\/\\/|#|;;) ?)?(\\\\)?&lt;!?(--|)(\\d+)\\2&gt;(?=(?: ?\\\\?&lt;!?\\2\\d+\\2&gt;)*" + $scope.CC_EOL + ")")));

    $opal.cdecl($scope, 'CalloutQuickScanRx', (new RegExp("\\\\?<!?(--|)(\\d+)\\1>(?=(?: ?\\\\?<!?\\1\\d+\\1>)*" + $scope.CC_EOL + ")")));

    $opal.cdecl($scope, 'CalloutScanRx', (new RegExp("(?:(?:\\/\\/|#|;;) ?)?(\\\\)?<!?(--|)(\\d+)\\2>(?=(?: ?\\\\?<!?\\2\\d+\\2>)*" + $scope.CC_EOL + ")")));

    $opal.cdecl($scope, 'ListRxMap', $hash2(["ulist", "olist", "dlist", "colist"], {"ulist": $scope.UnorderedListRx, "olist": $scope.OrderedListRx, "dlist": $scope.DefinitionListRx, "colist": $scope.CalloutListRx}));

    $opal.cdecl($scope, 'ColumnSpecRx', /^(?:(\d+)\*)?([<^>](?:\.[<^>]?)?|(?:[<^>]?\.)?[<^>])?(\d+%?)?([a-z])?$/);

    $opal.cdecl($scope, 'CellSpecStartRx', (new RegExp("^" + $scope.CG_BLANK + "*(?:(\\d+(?:\\.\\d*)?|(?:\\d*\\.)?\\d+)([*+]))?([<^>](?:\\.[<^>]?)?|(?:[<^>]?\\.)?[<^>])?([a-z])?\\|")));

    $opal.cdecl($scope, 'CellSpecEndRx', (new RegExp("" + $scope.CG_BLANK + "+(?:(\\d+(?:\\.\\d*)?|(?:\\d*\\.)?\\d+)([*+]))?([<^>](?:\\.[<^>]?)?|(?:[<^>]?\\.)?[<^>])?([a-z])?$")));

    $opal.cdecl($scope, 'GenericBlockMacroRx', (new RegExp("^(" + $scope.CG_WORD + "+)::(\\S*?)\\[((?:\\\\\\]|[^\\]])*?)\\]$")));

    $opal.cdecl($scope, 'MediaBlockMacroRx', /^(image|video|audio)::(\S+?)\[((?:\\\]|[^\]])*?)\]$/);

    $opal.cdecl($scope, 'TocBlockMacroRx', /^toc::\[(.*?)\]$/);

    $opal.cdecl($scope, 'InlineAnchorRx', (new RegExp("\\\\?(?:\\[\\[([" + $scope.CC_ALPHA + ":_][" + $scope.CC_WORD + ":.-]*)(?:," + $scope.CG_BLANK + "*(\\S.*?))?\\]\\]|anchor:(\\S+)\\[(.*?[^\\\\])?\\])")));

    $opal.cdecl($scope, 'InlineBiblioAnchorRx', (new RegExp("\\\\?\\[\\[\\[([" + $scope.CC_WORD + ":][" + $scope.CC_WORD + ":.-]*?)\\]\\]\\]")));

    $opal.cdecl($scope, 'EmailInlineMacroRx', (new RegExp("([\\\\>:\\/])?" + $scope.CG_WORD + "[" + $scope.CC_WORD + ".%+-]*@" + $scope.CG_ALNUM + "[" + $scope.CC_ALNUM + ".-]*\\." + $scope.CG_ALPHA + "{2,4}\\b")));

    $opal.cdecl($scope, 'FootnoteInlineMacroRx', /\\?(footnote(?:ref)?):\[(.*?[^\\])\]/m);

    $opal.cdecl($scope, 'ImageInlineMacroRx', /\\?(?:image|icon):([^:\[][^\[]*)\[((?:\\\]|[^\]])*?)\]/);

    $opal.cdecl($scope, 'IndextermInlineMacroRx', /\\?(?:(indexterm2?):\[(.*?[^\\])\]|\(\((.+?)\)\)(?!\)))/m);

    $opal.cdecl($scope, 'KbdBtnInlineMacroRx', /\\?(?:kbd|btn):\[((?:\\\]|[^\]])+?)\]/);

    $opal.cdecl($scope, 'KbdDelimiterRx', (new RegExp("(?:\\+|,)(?=" + $scope.CG_BLANK + "*[^\\1])")));

    $opal.cdecl($scope, 'LinkInlineRx', /(^|link:|&lt;|[\s>\(\)\[\];])(\\?(?:https?|file|ftp|irc):\/\/[^\s\[\]<]*[^\s.,\[\]<])(?:\[((?:\\\]|[^\]])*?)\])?/);

    $opal.cdecl($scope, 'LinkInlineMacroRx', /\\?(?:link|mailto):([^\s\[]+)(?:\[((?:\\\]|[^\]])*?)\])/);

    $opal.cdecl($scope, 'MathInlineMacroRx', /\\?((?:latex|ascii)?math):([a-z,]*)\[(.*?[^\\])\]/m);

    $opal.cdecl($scope, 'MenuInlineMacroRx', (new RegExp("\\\\?menu:(" + $scope.CG_WORD + "|" + $scope.CG_WORD + ".*?\\S)\\[" + $scope.CG_BLANK + "*(.+?)?\\]")));

    $opal.cdecl($scope, 'MenuInlineRx', (new RegExp("\\\\?\"(" + $scope.CG_WORD + "[^\"]*?" + $scope.CG_BLANK + "*&gt;" + $scope.CG_BLANK + "*[^\" \\t][^\"]*)\"")));

    $opal.cdecl($scope, 'PassInlineLiteralRx', (new RegExp("(^|[^`" + $scope.CC_WORD + "])(?:\\[([^\\]]+?)\\])?(\\\\?`([^`\\s]|[^`\\s].*?\\S)`)(?![`" + $scope.CC_WORD + "])")));

    $opal.cdecl($scope, 'PassInlineMacroRx', /\\?(?:(\+{3}|\${2})(.*?)\1|pass:([a-z,]*)\[(.*?[^\\])\])/m);

    $opal.cdecl($scope, 'XrefInlineMacroRx', (new RegExp("\\\\?(?:&lt;&lt;([" + $scope.CC_WORD + "\":].*?)&gt;&gt;|xref:([" + $scope.CC_WORD + "\":].*?)\\[(.*?)\\])")));

    $opal.cdecl($scope, 'LineBreakRx', (function() {if ($scope.RUBY_ENGINE['$==']("opal")) {
      return /^(.*)[ \t]\+$/m}; return nil; })());

    $opal.cdecl($scope, 'LayoutBreakLineRx', /^('|<){3,}$/);

    $opal.cdecl($scope, 'LayoutBreakLinePlusRx', /^(?:'|<){3,}$|^ {0,3}([-\*_])( *)\1\2\1$/);

    $opal.cdecl($scope, 'BlankLineRx', (new RegExp("^" + $scope.CG_BLANK + "*\\n")));

    $opal.cdecl($scope, 'DataDelimiterRx', /,|;/);

    $opal.cdecl($scope, 'DigitsRx', /^\d+$/);

    $opal.cdecl($scope, 'DoubleQuotedRx', /^("|)(.*)\1$/);

    $opal.cdecl($scope, 'DoubleQuotedMultiRx', /^("|)(.*)\1$/m);

    $opal.cdecl($scope, 'TrailingDigitsRx', /\d+$/);

    $opal.cdecl($scope, 'EscapedSpaceRx', (new RegExp("\\\\(" + $scope.CG_BLANK + ")")));

    $opal.cdecl($scope, 'SpaceDelimiterRx', (new RegExp("([^\\\\])" + $scope.CG_BLANK + "+")));

    $opal.cdecl($scope, 'UnicodeCharScanRx', (function() {if ($scope.RUBY_ENGINE['$==']("opal")) {
      return nil}; return nil; })());

    $opal.cdecl($scope, 'UriSniffRx', (new RegExp("^" + $scope.CG_ALPHA + "[" + $scope.CC_ALNUM + ".+-]*:/{0,2}")));

    $opal.cdecl($scope, 'UriTerminator', /[);:]$/);

    $opal.cdecl($scope, 'XmlSanitizeRx', /<[^>]+>/);

    $opal.cdecl($scope, 'INTRINSIC_ATTRIBUTES', $hash2(["startsb", "endsb", "vbar", "caret", "asterisk", "tilde", "plus", "apostrophe", "backslash", "backtick", "empty", "sp", "space", "two-colons", "two-semicolons", "nbsp", "deg", "zwsp", "quot", "apos", "lsquo", "rsquo", "ldquo", "rdquo", "wj", "brvbar", "amp", "lt", "gt"], {"startsb": "[", "endsb": "]", "vbar": "|", "caret": "^", "asterisk": "*", "tilde": "~", "plus": "&#43;", "apostrophe": "'", "backslash": "\\", "backtick": "`", "empty": "", "sp": " ", "space": " ", "two-colons": "::", "two-semicolons": ";;", "nbsp": "&#160;", "deg": "&#176;", "zwsp": "&#8203;", "quot": "&#34;", "apos": "&#39;", "lsquo": "&#8216;", "rsquo": "&#8217;", "ldquo": "&#8220;", "rdquo": "&#8221;", "wj": "&#8288;", "brvbar": "&#166;", "amp": "&", "lt": "<", "gt": ">"}));

    $opal.cdecl($scope, 'QUOTE_SUBS', [["strong", "unconstrained", /\\?(?:\[([^\]]+?)\])?\*\*(.+?)\*\*/m], ["strong", "constrained", (new RegExp("(^|[^" + $scope.CC_WORD + ";:}])(?:\\[([^\\]]+?)\\])?\\*(\\S|\\S.*?\\S)\\*(?!" + $scope.CG_WORD + ")"))], ["double", "constrained", (new RegExp("(^|[^" + $scope.CC_WORD + ";:}])(?:\\[([^\\]]+?)\\])?``(\\S|\\S.*?\\S)''(?!" + $scope.CG_WORD + ")"))], ["emphasis", "constrained", (new RegExp("(^|[^" + $scope.CC_WORD + ";:}])(?:\\[([^\\]]+?)\\])?'(\\S|\\S.*?\\S)'(?!" + $scope.CG_WORD + ")"))], ["single", "constrained", (new RegExp("(^|[^" + $scope.CC_WORD + ";:}])(?:\\[([^\\]]+?)\\])?`(\\S|\\S.*?\\S)'(?!" + $scope.CG_WORD + ")"))], ["monospaced", "unconstrained", /\\?(?:\[([^\]]+?)\])?\+\+(.+?)\+\+/m], ["monospaced", "constrained", (new RegExp("(^|[^" + $scope.CC_WORD + ";:}])(?:\\[([^\\]]+?)\\])?\\+(\\S|\\S.*?\\S)\\+(?!" + $scope.CG_WORD + ")"))], ["emphasis", "unconstrained", /\\?(?:\[([^\]]+?)\])?__(.+?)__/m], ["emphasis", "constrained", (new RegExp("(^|[^" + $scope.CC_WORD + ";:}])(?:\\[([^\\]]+?)\\])?_(\\S|\\S.*?\\S)_(?!" + $scope.CG_WORD + ")"))], ["none", "unconstrained", /\\?(?:\[([^\]]+?)\])?##(.+?)##/m], ["none", "constrained", (new RegExp("(^|[^" + $scope.CC_WORD + ";:}])(?:\\[([^\\]]+?)\\])?#(\\S|\\S.*?\\S)#(?!" + $scope.CG_WORD + ")"))], ["superscript", "unconstrained", /\\?(?:\[([^\]]+?)\])?\^(.+?)\^/m], ["subscript", "unconstrained", /\\?(?:\[([^\]]+?)\])?~(.+?)~/m]]);

    $opal.cdecl($scope, 'REPLACEMENTS', [[/\\?\(C\)/, "&#169;", "none"], [/\\?\(R\)/, "&#174;", "none"], [/\\?\(TM\)/, "&#8482;", "none"], [/(^|\n| |\\)--( |\n|$)/, "&#8201;&#8212;&#8201;", "none"], [(new RegExp("(" + $scope.CG_WORD + ")\\\\?--(?=" + $scope.CG_WORD + ")")), "&#8212;", "leading"], [/\\?\.\.\./, "&#8230;", "leading"], [(new RegExp("(" + $scope.CG_ALPHA + ")\\\\?'(?!')")), "&#8217;", "leading"], [/\\?-&gt;/, "&#8594;", "none"], [/\\?=&gt;/, "&#8658;", "none"], [/\\?&lt;-/, "&#8592;", "none"], [/\\?&lt;=/, "&#8656;", "none"], [/\\?(&)amp;((?:[a-zA-Z]+|#\d{2,5}|#x[a-fA-F0-9]{2,4});)/, "", "bounding"]]);

    (function(self) {
      var $scope = self._scope, def = self._proto;

      self._proto.$load = function(input, options) {
        var $a, $b, $c, $d, TMP_2, TMP_3, TMP_4, $e, self = this, timings = nil, attributes = nil, attrs = nil, capture_1 = nil, original_attrs = nil, lines = nil, input_mtime = nil, input_path = nil, docdate = nil, doctime = nil, doc = nil;

        if (options == null) {
          options = $hash2([], {})
        }
        options = options.$dup();
        if ((($a = (timings = options['$[]']("timings"))) !== nil && (!$a._isBoolean || $a == true))) {
          timings.$start("read")};
        attributes = options['$[]=']("attributes", (function() {if ((($a = ((attrs = options['$[]']("attributes")))['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
          return $hash2([], {})
        } else if ((($a = ((($b = (attrs['$is_a?']((($c = $opal.Object._scope.Hash) == null ? $opal.cm('Hash') : $c)))) !== false && $b !== nil) ? $b : (($c = (($d = $opal.Object._scope.RUBY_ENGINE_JRUBY) == null ? $opal.cm('RUBY_ENGINE_JRUBY') : $d), $c !== false && $c !== nil ?(attrs['$is_a?']((((($d = $opal.Object._scope.Java) == null ? $opal.cm('Java') : $d))._scope.JavaUtil)._scope.Map)) : $c)))) !== nil && (!$a._isBoolean || $a == true))) {
          return attrs.$dup()
        } else if ((($a = attrs['$is_a?']((($b = $opal.Object._scope.Array) == null ? $opal.cm('Array') : $b))) !== nil && (!$a._isBoolean || $a == true))) {
          return ($a = ($b = attrs).$inject, $a._p = (TMP_2 = function(accum, entry){var self = TMP_2._s || this, $a, k = nil, v = nil;
if (accum == null) accum = nil;if (entry == null) entry = nil;
          $a = $opal.to_ary(entry.$split("=", 2)), k = ($a[0] == null ? nil : $a[0]), v = ($a[1] == null ? nil : $a[1]);
            accum['$[]='](k, ((($a = v) !== false && $a !== nil) ? $a : ""));
            return accum;}, TMP_2._s = self, TMP_2), $a).call($b, $hash2([], {}))
        } else if ((($a = attrs['$is_a?']((($c = $opal.Object._scope.String) == null ? $opal.cm('String') : $c))) !== nil && (!$a._isBoolean || $a == true))) {
          capture_1 = (function() {if ((($a = (($c = $opal.Object._scope.RUBY_ENGINE_OPAL) == null ? $opal.cm('RUBY_ENGINE_OPAL') : $c)) !== nil && (!$a._isBoolean || $a == true))) {
            return "$1"
            } else {
            return "\\1"
          }; return nil; })();
          attrs = attrs.$gsub($scope.SpaceDelimiterRx, "" + (capture_1) + ($scope.NULL)).$gsub($scope.EscapedSpaceRx, capture_1);
          return ($a = ($c = attrs.$split($scope.NULL)).$inject, $a._p = (TMP_3 = function(accum, entry){var self = TMP_3._s || this, $a, k = nil, v = nil;
if (accum == null) accum = nil;if (entry == null) entry = nil;
          $a = $opal.to_ary(entry.$split("=", 2)), k = ($a[0] == null ? nil : $a[0]), v = ($a[1] == null ? nil : $a[1]);
            accum['$[]='](k, ((($a = v) !== false && $a !== nil) ? $a : ""));
            return accum;}, TMP_3._s = self, TMP_3), $a).call($c, $hash2([], {}));
        } else if ((($a = ($d = (attrs['$respond_to?']("keys")), $d !== false && $d !== nil ?(attrs['$respond_to?']("[]")) : $d)) !== nil && (!$a._isBoolean || $a == true))) {
          original_attrs = attrs;
          attrs = $hash2([], {});
          ($a = ($d = original_attrs.$keys()).$each, $a._p = (TMP_4 = function(key){var self = TMP_4._s || this;
if (key == null) key = nil;
          return attrs['$[]='](key, original_attrs['$[]'](key))}, TMP_4._s = self, TMP_4), $a).call($d);
          return attrs;
          } else {
          return self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "illegal type for attributes option: " + (attrs.$class().$ancestors()))
        }; return nil; })());
        lines = nil;
        if ((($a = input['$is_a?']((($e = $opal.Object._scope.File) == null ? $opal.cm('File') : $e))) !== nil && (!$a._isBoolean || $a == true))) {
          lines = input.$readlines();
          input_mtime = input.$mtime();
          input = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$new((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path(input.$path()));
          input_path = input.$path();
          attributes['$[]=']("docfile", input_path);
          attributes['$[]=']("docdir", (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname(input_path));
          attributes['$[]=']("docname", (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$basename(input_path, ((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$extname(input_path))));
          attributes['$[]=']("docdate", docdate = input_mtime.$strftime("%Y-%m-%d"));
          attributes['$[]=']("doctime", doctime = input_mtime.$strftime("%H:%M:%S %Z"));
          attributes['$[]=']("docdatetime", "" + (docdate) + " " + (doctime));
        } else if ((($a = input['$respond_to?']("readlines")) !== nil && (!$a._isBoolean || $a == true))) {
          try {input.$rewind() } catch ($err) { nil };
          lines = input.$readlines();
        } else if ((($a = input['$is_a?']((($e = $opal.Object._scope.String) == null ? $opal.cm('String') : $e))) !== nil && (!$a._isBoolean || $a == true))) {
          lines = input.$lines().$entries()
        } else if ((($a = input['$is_a?']((($e = $opal.Object._scope.Array) == null ? $opal.cm('Array') : $e))) !== nil && (!$a._isBoolean || $a == true))) {
          lines = input.$dup()
          } else {
          self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a), "Unsupported input type: " + (input.$class()))
        };
        if (timings !== false && timings !== nil) {
          timings.$record("read");
          timings.$start("parse");};
        if ((($a = options['$key?']("parse")) !== nil && (!$a._isBoolean || $a == true))) {
          } else {
          options['$[]=']("parse", true)
        };
        doc = $scope.Document.$new(lines, options);
        if (timings !== false && timings !== nil) {
          timings.$record("parse")};
        return doc;
      };
      self._proto.$load_file = function(filename, options) {
        var $a, self = this;

        if (options == null) {
          options = $hash2([], {})
        }
        return self.$load((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$new(((($a = filename) !== false && $a !== nil) ? $a : "")), options);
      };
      self._proto.$convert = function(input, options) {
        var $a, $b, $c, $d, $e, TMP_5, self = this, to_file = nil, to_dir = nil, mkdirs = nil, timings = nil, $case = nil, write_to_same_dir = nil, stream_output = nil, write_to_target = nil, doc = nil, infile = nil, outfile = nil, outdir = nil, working_dir = nil, jail = nil, output = nil, copy_asciidoctor_stylesheet = nil, stylesheet = nil, copy_user_stylesheet = nil, copy_coderay_stylesheet = nil, copy_pygments_stylesheet = nil, stylesoutdir = nil, stylesheet_src = nil, stylesheet_dst = nil, stylesheet_content = nil;

        if (options == null) {
          options = $hash2([], {})
        }
        options = options.$dup();
        to_file = options.$delete("to_file");
        to_dir = options.$delete("to_dir");
        mkdirs = ((($a = options.$delete("mkdirs")) !== false && $a !== nil) ? $a : false);
        timings = options['$[]']("timings");
        $case = to_file;if (true['$===']($case) || nil['$===']($case)) {write_to_same_dir = ($a = to_dir['$!'](), $a !== false && $a !== nil ?(input['$is_a?']((($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b))) : $a);
        stream_output = false;
        write_to_target = to_dir;
        to_file = nil;}else if (false['$===']($case)) {write_to_same_dir = false;
        stream_output = false;
        write_to_target = false;
        to_file = nil;}else {write_to_same_dir = false;
        stream_output = to_file['$respond_to?']("write");
        write_to_target = (function() {if (stream_output !== false && stream_output !== nil) {
          return false
          } else {
          return to_file
        }; return nil; })();};
        if ((($a = ($b = options['$key?']("header_footer")['$!'](), $b !== false && $b !== nil ?(((($c = write_to_same_dir) !== false && $c !== nil) ? $c : write_to_target)) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
          options['$[]=']("header_footer", true)};
        doc = self.$load(input, options);
        if (to_file['$==']("/dev/null")) {
          return doc
        } else if (write_to_same_dir !== false && write_to_same_dir !== nil) {
          infile = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path(input.$path());
          outfile = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$join((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname(infile), "" + (doc.$attributes()['$[]']("docname")) + (doc.$attributes()['$[]']("outfilesuffix")));
          if (outfile['$=='](infile)) {
            self.$raise((($a = $opal.Object._scope.IOError) == null ? $opal.cm('IOError') : $a), "Input file and output file are the same!")};
          outdir = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname(outfile);
        } else if (write_to_target !== false && write_to_target !== nil) {
          working_dir = (function() {if ((($a = options['$has_key?']("base_dir")) !== nil && (!$a._isBoolean || $a == true))) {
            return (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path(options['$[]']("base_dir"))
            } else {
            return (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$expand_path((($a = $opal.Object._scope.Dir) == null ? $opal.cm('Dir') : $a).$pwd())
          }; return nil; })();
          jail = (function() {if (doc.$safe()['$>='](($scope.SafeMode)._scope.SAFE)) {
            return working_dir
            } else {
            return nil
          }; return nil; })();
          if (to_dir !== false && to_dir !== nil) {
            outdir = doc.$normalize_system_path(to_dir, working_dir, jail, $hash2(["target_name", "recover"], {"target_name": "to_dir", "recover": false}));
            if (to_file !== false && to_file !== nil) {
              outfile = doc.$normalize_system_path(to_file, outdir, nil, $hash2(["target_name", "recover"], {"target_name": "to_dir", "recover": false}));
              outdir = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname(outfile);
              } else {
              outfile = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$join(outdir, "" + (doc.$attributes()['$[]']("docname")) + (doc.$attributes()['$[]']("outfilesuffix")))
            };
          } else if (to_file !== false && to_file !== nil) {
            outfile = doc.$normalize_system_path(to_file, working_dir, jail, $hash2(["target_name", "recover"], {"target_name": "to_dir", "recover": false}));
            outdir = (($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$dirname(outfile);};
          if ((($a = (($b = $opal.Object._scope.File) == null ? $opal.cm('File') : $b)['$directory?'](outdir)) !== nil && (!$a._isBoolean || $a == true))) {
          } else if (mkdirs !== false && mkdirs !== nil) {
            (($a = $opal.Object._scope.FileUtils) == null ? $opal.cm('FileUtils') : $a).$mkdir_p(outdir)
            } else {
            self.$raise((($a = $opal.Object._scope.IOError) == null ? $opal.cm('IOError') : $a), "target directory does not exist: " + (to_dir))
          };
          } else {
          outfile = to_file;
          outdir = nil;
        };
        if (timings !== false && timings !== nil) {
          timings.$start("convert")};
        output = doc.$convert();
        if (timings !== false && timings !== nil) {
          timings.$record("convert")};
        if (outfile !== false && outfile !== nil) {
          if (timings !== false && timings !== nil) {
            timings.$start("write")};
          if (stream_output !== false && stream_output !== nil) {
            } else {
            doc.$attributes()['$[]=']("outfile", outfile);
            doc.$attributes()['$[]=']("outdir", outdir);
          };
          doc.$write(output, outfile);
          if (timings !== false && timings !== nil) {
            timings.$record("write")};
          if ((($a = ($b = ($c = ($d = ($e = stream_output['$!'](), $e !== false && $e !== nil ?doc.$safe()['$<'](($scope.SafeMode)._scope.SECURE) : $e), $d !== false && $d !== nil ?(doc['$attr?']("basebackend-html")) : $d), $c !== false && $c !== nil ?(doc['$attr?']("linkcss")) : $c), $b !== false && $b !== nil ?(doc['$attr?']("copycss")) : $b)) !== nil && (!$a._isBoolean || $a == true))) {
            copy_asciidoctor_stylesheet = $scope.DEFAULT_STYLESHEET_KEYS['$include?'](stylesheet = (doc.$attr("stylesheet")));
            copy_user_stylesheet = ($a = copy_asciidoctor_stylesheet['$!'](), $a !== false && $a !== nil ?stylesheet['$nil_or_empty?']()['$!']() : $a);
            copy_coderay_stylesheet = ($a = (doc['$attr?']("source-highlighter", "coderay")), $a !== false && $a !== nil ?(doc.$attr("coderay-css", "class"))['$==']("class") : $a);
            copy_pygments_stylesheet = ($a = (doc['$attr?']("source-highlighter", "pygments")), $a !== false && $a !== nil ?(doc.$attr("pygments-css", "class"))['$==']("class") : $a);
            if ((($a = ((($b = ((($c = ((($d = copy_asciidoctor_stylesheet) !== false && $d !== nil) ? $d : copy_user_stylesheet)) !== false && $c !== nil) ? $c : copy_coderay_stylesheet)) !== false && $b !== nil) ? $b : copy_pygments_stylesheet)) !== nil && (!$a._isBoolean || $a == true))) {
              outdir = doc.$attr("outdir");
              stylesoutdir = doc.$normalize_system_path(doc.$attr("stylesdir"), outdir, (function() {if (doc.$safe()['$>='](($scope.SafeMode)._scope.SAFE)) {
                return outdir
                } else {
                return nil
              }; return nil; })());
              if (mkdirs !== false && mkdirs !== nil) {
                $scope.Helpers.$mkdir_p(stylesoutdir)};
              if (copy_asciidoctor_stylesheet !== false && copy_asciidoctor_stylesheet !== nil) {
                $scope.Stylesheets.$instance().$write_primary_stylesheet(stylesoutdir)
              } else if (copy_user_stylesheet !== false && copy_user_stylesheet !== nil) {
                if ((($a = ((stylesheet_src = (doc.$attr("copycss"))))['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
                  stylesheet_src = doc.$normalize_system_path(stylesheet)
                  } else {
                  stylesheet_src = doc.$normalize_system_path(stylesheet_src)
                };
                stylesheet_dst = doc.$normalize_system_path(stylesheet, stylesoutdir, ((function() {if (doc.$safe()['$>='](($scope.SafeMode)._scope.SAFE)) {
                  return outdir
                  } else {
                  return nil
                }; return nil; })()));
                if ((($a = ((($b = stylesheet_src['$=='](stylesheet_dst)) !== false && $b !== nil) ? $b : ((stylesheet_content = doc.$read_asset(stylesheet_src)))['$nil?']())) !== nil && (!$a._isBoolean || $a == true))) {
                  } else {
                  ($a = ($b = (($c = $opal.Object._scope.File) == null ? $opal.cm('File') : $c)).$open, $a._p = (TMP_5 = function(f){var self = TMP_5._s || this;
if (f == null) f = nil;
                  return f.$write(stylesheet_content)}, TMP_5._s = self, TMP_5), $a).call($b, stylesheet_dst, "w")
                };};
              if (copy_coderay_stylesheet !== false && copy_coderay_stylesheet !== nil) {
                $scope.Stylesheets.$instance().$write_coderay_stylesheet(stylesoutdir)
              } else if (copy_pygments_stylesheet !== false && copy_pygments_stylesheet !== nil) {
                $scope.Stylesheets.$instance().$write_pygments_stylesheet(stylesoutdir, (doc.$attr("pygments-style")))};};};
          return doc;
          } else {
          return output
        };
      };
      self._proto.$render = self._proto.$convert;
      self._proto.$convert_file = function(filename, options) {
        var $a, self = this;

        if (options == null) {
          options = $hash2([], {})
        }
        return self.$convert((($a = $opal.Object._scope.File) == null ? $opal.cm('File') : $a).$new(((($a = filename) !== false && $a !== nil) ? $a : "")), options);
      };
      return self._proto.$render_file = self._proto.$convert_file;
    })(self.$singleton_class());

    if ($scope.RUBY_ENGINE['$==']("opal")) {
      ;

      ;

      ;};
    
  })(self);
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  if ((($a = $scope.RUBY_ENGINE_OPAL) !== nil && (!$a._isBoolean || $a == true))) {
    };
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  ;
  return true;
})(Opal);

/* Generated by Opal 0.6.2 */
(function($opal) {
  var self = $opal.top, $scope = $opal, nil = $opal.nil, $breaker = $opal.breaker, $slice = $opal.slice, $module = $opal.module, $klass = $opal.klass, $hash2 = $opal.hash2, $range = $opal.range, $hash = $opal.hash;

  return (function($base) {
    var self = $module($base, 'Asciidoctor');

    var def = self._proto, $scope = self._scope;

    (function($base) {
      var self = $module($base, 'Extensions');

      var def = self._proto, $scope = self._scope;

      (function($base, $super) {
        function $Processor(){};
        var self = $Processor = $klass($base, $super, 'Processor', $Processor);

        var def = self._proto, $scope = self._scope, $a, $b, TMP_1;

        def.config = nil;
        (function(self) {
          var $scope = self._scope, def = self._proto;

          self._proto.$config = function() {
            var $a, self = this;
            if (self.config == null) self.config = nil;

            return ((($a = self.config) !== false && $a !== nil) ? $a : self.config = $hash2([], {}));
          };
          self._proto.$option = function(key, default_value) {
            var self = this;

            return self.$config()['$[]='](key, default_value);
          };
          self._proto.$use_dsl = function() {
            var $a, self = this;

            if ((($a = self.$name()['$nil_or_empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = self.$constants().$grep("DSL")) !== nil && (!$a._isBoolean || $a == true))) {
                return self.$include(self.$const_get("DSL"))
                } else {
                return nil
              }
            } else if ((($a = self.$constants().$grep("DSL")) !== nil && (!$a._isBoolean || $a == true))) {
              return self.$extend(self.$const_get("DSL"))
              } else {
              return nil
            };
          };
          self._proto.$extend_dsl = self._proto.$use_dsl;
          return self._proto.$include_dsl = self._proto.$use_dsl;
        })(self.$singleton_class());

        self.$attr_reader("config");

        def.$initialize = function(config) {
          var self = this;

          if (config == null) {
            config = $hash2([], {})
          }
          return self.config = self.$class().$config().$merge(config);
        };

        def.$update_config = function(config) {
          var self = this;

          return self.config.$update(config);
        };

        def.$process = function(args) {
          var $a, self = this;

          args = $slice.call(arguments, 0);
          return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
        };

        def.$create_block = function(parent, context, source, attrs, opts) {
          var self = this;

          if (opts == null) {
            opts = $hash2([], {})
          }
          return $scope.Block.$new(parent, context, $hash2(["source", "attributes"], {"source": source, "attributes": attrs}).$merge(opts));
        };

        def.$create_image_block = function(parent, attrs, opts) {
          var self = this;

          if (opts == null) {
            opts = $hash2([], {})
          }
          return self.$create_block(parent, "image", nil, attrs, opts);
        };

        def.$create_inline = function(parent, context, text, opts) {
          var self = this;

          if (opts == null) {
            opts = $hash2([], {})
          }
          return $scope.Inline.$new(parent, context, text, opts);
        };

        def.$parse_content = function(parent, content, attributes) {
          var $a, $b, self = this, reader = nil, block = nil;

          if (attributes == null) {
            attributes = $hash2([], {})
          }
          reader = (function() {if ((($a = (content['$is_a?']($scope.Reader))) !== nil && (!$a._isBoolean || $a == true))) {
            return reader
            } else {
            return ($scope.Reader.$new(content))
          }; return nil; })();
          while ((($b = reader['$has_more_lines?']()) !== nil && (!$b._isBoolean || $b == true))) {
          block = $scope.Parser.$next_block(reader, parent, attributes);
          if (block !== false && block !== nil) {
            parent['$<<'](block)};};
          return nil;
        };

        return ($a = ($b = [["create_paragraph", "create_block", "paragraph"], ["create_open_block", "create_block", "open"], ["create_example_block", "create_block", "example"], ["create_pass_block", "create_block", "pass"], ["create_listing_block", "create_block", "listing"], ["create_literal_block", "create_block", "literal"], ["create_anchor", "create_inline", "anchor"]]).$each, $a._p = (TMP_1 = function(method_name, delegate_method_name, context){var self = TMP_1._s || this, $a, $b, TMP_2;
if (method_name == null) method_name = nil;if (delegate_method_name == null) delegate_method_name = nil;if (context == null) context = nil;
        return ($a = ($b = self).$define_method, $a._p = (TMP_2 = function(args){var self = TMP_2._s || this, $a;
args = $slice.call(arguments, 0);
          return ($a = self).$send.apply($a, [delegate_method_name].concat(args.$dup().$insert(1, context)))}, TMP_2._s = self, TMP_2), $a).call($b, method_name)}, TMP_1._s = self, TMP_1), $a).call($b);
      })(self, null);

      (function($base) {
        var self = $module($base, 'ProcessorDsl');

        var def = self._proto, $scope = self._scope, TMP_3;

        def.$option = function(key, value) {
          var self = this;

          return self.$config()['$[]='](key, value);
        };

        def.$process = TMP_3 = function(args) {
          var $a, $b, self = this, $iter = TMP_3._p, block = $iter || nil;
          if (self.process_block == null) self.process_block = nil;

          args = $slice.call(arguments, 0);
          TMP_3._p = null;
          if ((block !== nil)) {
            return self.process_block = block
          } else if ((($a = self.process_block) !== nil && (!$a._isBoolean || $a == true))) {
            return ($a = self.process_block).$call.apply($a, [].concat(args))
            } else {
            return self.$raise((($b = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $b))
          };
        };

        def['$process_block_given?'] = function() {
          var $a, self = this;

          return (($a = self['process_block'], $a != null && $a !== nil) ? 'instance-variable' : nil);
        };
                ;$opal.donate(self, ["$option", "$process", "$process_block_given?"]);
      })(self);

      (function($base, $super) {
        function $Preprocessor(){};
        var self = $Preprocessor = $klass($base, $super, 'Preprocessor', $Preprocessor);

        var def = self._proto, $scope = self._scope;

        return (def.$process = function(document, reader) {
          var $a, self = this;

          return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
        }, nil) && 'process'
      })(self, $scope.Processor);

      $opal.casgn($scope.Preprocessor, 'DSL', $scope.ProcessorDsl);

      (function($base, $super) {
        function $Treeprocessor(){};
        var self = $Treeprocessor = $klass($base, $super, 'Treeprocessor', $Treeprocessor);

        var def = self._proto, $scope = self._scope;

        return (def.$process = function(document) {
          var $a, self = this;

          return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
        }, nil) && 'process'
      })(self, $scope.Processor);

      $opal.casgn($scope.Treeprocessor, 'DSL', $scope.ProcessorDsl);

      (function($base, $super) {
        function $Postprocessor(){};
        var self = $Postprocessor = $klass($base, $super, 'Postprocessor', $Postprocessor);

        var def = self._proto, $scope = self._scope;

        return (def.$process = function(document, output) {
          var $a, self = this;

          return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
        }, nil) && 'process'
      })(self, $scope.Processor);

      $opal.casgn($scope.Postprocessor, 'DSL', $scope.ProcessorDsl);

      (function($base, $super) {
        function $IncludeProcessor(){};
        var self = $IncludeProcessor = $klass($base, $super, 'IncludeProcessor', $IncludeProcessor);

        var def = self._proto, $scope = self._scope;

        def.$process = function(reader, target, attributes) {
          var $a, self = this;

          return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
        };

        return (def['$handles?'] = function(target) {
          var self = this;

          return true;
        }, nil) && 'handles?';
      })(self, $scope.Processor);

      $opal.casgn($scope.IncludeProcessor, 'DSL', $scope.ProcessorDsl);

      (function($base, $super) {
        function $BlockProcessor(){};
        var self = $BlockProcessor = $klass($base, $super, 'BlockProcessor', $BlockProcessor);

        var def = self._proto, $scope = self._scope, TMP_4;

        def.config = nil;
        self.$attr_accessor("name");

        def.$initialize = TMP_4 = function(name, config) {
          var $a, $b, $c, self = this, $iter = TMP_4._p, $yield = $iter || nil, $case = nil;

          if (name == null) {
            name = nil
          }
          if (config == null) {
            config = $hash2([], {})
          }
          TMP_4._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_4, null).apply(self, [config]);
          self.name = ((($a = name) !== false && $a !== nil) ? $a : self.config['$[]']("name"));
          $case = self.config['$[]']("contexts");if ((($a = $opal.Object._scope.NilClass) == null ? $opal.cm('NilClass') : $a)['$===']($case)) {($a = "contexts", $b = self.config, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, ["open", "paragraph"].$to_set())))}else if ((($a = $opal.Object._scope.Symbol) == null ? $opal.cm('Symbol') : $a)['$===']($case)) {self.config['$[]=']("contexts", [self.config['$[]']("contexts")].$to_set())}else {self.config['$[]=']("contexts", self.config['$[]']("contexts").$to_set())};
          return ($a = "content_model", $b = self.config, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, "compound")));
        };

        return (def.$process = function(parent, reader, attributes) {
          var $a, self = this;

          return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
        }, nil) && 'process';
      })(self, $scope.Processor);

      (function($base) {
        var self = $module($base, 'BlockProcessorDsl');

        var def = self._proto, $scope = self._scope;

        self.$include($scope.ProcessorDsl);

        def.$named = function(value) {
          var $a, self = this;

          if ((($a = self['$is_a?']($scope.Processor)) !== nil && (!$a._isBoolean || $a == true))) {
            return self.name = value
            } else {
            return self.$option("name", value)
          };
        };

        $opal.defn(self, '$match_name', def.$named);

        $opal.defn(self, '$bind_to', def.$named);

        def.$contexts = function(value) {
          var self = this;

          value = $slice.call(arguments, 0);
          return self.$option("contexts", value.$flatten());
        };

        $opal.defn(self, '$on_contexts', def.$contexts);

        $opal.defn(self, '$on_context', def.$contexts);

        def.$content_model = function(value) {
          var self = this;

          return self.$option("content_model", value);
        };

        $opal.defn(self, '$parse_content_as', def.$content_model);

        def.$pos_attrs = function(value) {
          var self = this;

          value = $slice.call(arguments, 0);
          return self.$option("pos_attrs", value.$flatten());
        };

        $opal.defn(self, '$map_attributes', def.$pos_attrs);

        $opal.defn(self, '$name_positional_attributes', def.$pos_attrs);

        def.$default_attrs = function(value) {
          var self = this;

          return self.$option("default_attrs", value);
        };

        $opal.defn(self, '$seed_attributes_with', def.$default_attrs);
                ;$opal.donate(self, ["$named", "$match_name", "$bind_to", "$contexts", "$on_contexts", "$on_context", "$content_model", "$parse_content_as", "$pos_attrs", "$map_attributes", "$name_positional_attributes", "$default_attrs", "$seed_attributes_with"]);
      })(self);

      $opal.casgn($scope.BlockProcessor, 'DSL', $scope.BlockProcessorDsl);

      (function($base, $super) {
        function $MacroProcessor(){};
        var self = $MacroProcessor = $klass($base, $super, 'MacroProcessor', $MacroProcessor);

        var def = self._proto, $scope = self._scope, TMP_5;

        def.config = nil;
        self.$attr_accessor("name");

        def.$initialize = TMP_5 = function(name, config) {
          var $a, $b, $c, self = this, $iter = TMP_5._p, $yield = $iter || nil;

          if (name == null) {
            name = nil
          }
          if (config == null) {
            config = $hash2([], {})
          }
          TMP_5._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_5, null).apply(self, [config]);
          self.name = ((($a = name) !== false && $a !== nil) ? $a : self.config['$[]']("name"));
          return ($a = "content_model", $b = self.config, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, "attributes")));
        };

        return (def.$process = function(parent, target, attributes) {
          var $a, self = this;

          return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
        }, nil) && 'process';
      })(self, $scope.Processor);

      (function($base) {
        var self = $module($base, 'MacroProcessorDsl');

        var def = self._proto, $scope = self._scope;

        self.$include($scope.ProcessorDsl);

        def.$named = function(value) {
          var $a, self = this;

          if ((($a = self['$is_a?']($scope.Processor)) !== nil && (!$a._isBoolean || $a == true))) {
            return self.name = value
            } else {
            return self.$option("name", value)
          };
        };

        $opal.defn(self, '$match_name', def.$named);

        $opal.defn(self, '$bind_to', def.$named);

        def.$content_model = function(value) {
          var self = this;

          return self.$option("content_model", value);
        };

        $opal.defn(self, '$parse_content_as', def.$content_model);

        def.$pos_attrs = function(value) {
          var self = this;

          value = $slice.call(arguments, 0);
          return self.$option("pos_attrs", value.$flatten());
        };

        $opal.defn(self, '$map_attributes', def.$pos_attrs);

        $opal.defn(self, '$name_positional_attributes', def.$pos_attrs);

        def.$default_attrs = function(value) {
          var self = this;

          return self.$option("default_attrs", value);
        };

        $opal.defn(self, '$seed_attributes_with', def.$default_attrs);
                ;$opal.donate(self, ["$named", "$match_name", "$bind_to", "$content_model", "$parse_content_as", "$pos_attrs", "$map_attributes", "$name_positional_attributes", "$default_attrs", "$seed_attributes_with"]);
      })(self);

      (function($base, $super) {
        function $BlockMacroProcessor(){};
        var self = $BlockMacroProcessor = $klass($base, $super, 'BlockMacroProcessor', $BlockMacroProcessor);

        var def = self._proto, $scope = self._scope;

        return nil;
      })(self, $scope.MacroProcessor);

      $opal.casgn($scope.BlockMacroProcessor, 'DSL', $scope.MacroProcessorDsl);

      (function($base, $super) {
        function $InlineMacroProcessor(){};
        var self = $InlineMacroProcessor = $klass($base, $super, 'InlineMacroProcessor', $InlineMacroProcessor);

        var def = self._proto, $scope = self._scope, TMP_6;

        def.config = def.name = nil;
        def.$initialize = TMP_6 = function(name, config) {var $zuper = $slice.call(arguments, 0);
          var $a, $b, $c, self = this, $iter = TMP_6._p, $yield = $iter || nil;

          if (config == null) {
            config = $hash2([], {})
          }
          TMP_6._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_6, $iter).apply(self, $zuper);
          return ($a = "regexp", $b = self.config, ((($c = $b['$[]']($a)) !== false && $c !== nil) ? $c : $b['$[]=']($a, (self.$resolve_regexp(self.name, self.config['$[]']("format"))))));
        };

        return (def.$resolve_regexp = function(name, format) {
          var self = this;

          if (format['$==']("short")) {
            return (new RegExp("\\\\?" + name + ":\\[((?:\\\\\\]|[^\\]])*?)\\]"))
            } else {
            return (new RegExp("\\\\?" + name + ":(\\S+?)\\[((?:\\\\\\]|[^\\]])*?)\\]"))
          };
        }, nil) && 'resolve_regexp';
      })(self, $scope.MacroProcessor);

      (function($base) {
        var self = $module($base, 'InlineMacroProcessorDsl');

        var def = self._proto, $scope = self._scope;

        self.$include($scope.MacroProcessorDsl);

        def.$using_format = function(value) {
          var self = this;

          return self.$option("format", value);
        };

        def.$match = function(value) {
          var self = this;

          return self.$option("regexp", value);
        };
                ;$opal.donate(self, ["$using_format", "$match"]);
      })(self);

      $opal.casgn($scope.InlineMacroProcessor, 'DSL', $scope.InlineMacroProcessorDsl);

      (function($base, $super) {
        function $Extension(){};
        var self = $Extension = $klass($base, $super, 'Extension', $Extension);

        var def = self._proto, $scope = self._scope;

        self.$attr("kind");

        self.$attr("config");

        self.$attr("instance");

        return (def.$initialize = function(kind, instance, config) {
          var self = this;

          self.kind = kind;
          self.instance = instance;
          return self.config = config;
        }, nil) && 'initialize';
      })(self, null);

      (function($base, $super) {
        function $ProcessorExtension(){};
        var self = $ProcessorExtension = $klass($base, $super, 'ProcessorExtension', $ProcessorExtension);

        var def = self._proto, $scope = self._scope, TMP_7;

        self.$attr("process_method");

        return (def.$initialize = TMP_7 = function(kind, instance, process_method) {
          var $a, self = this, $iter = TMP_7._p, $yield = $iter || nil;

          if (process_method == null) {
            process_method = nil
          }
          TMP_7._p = null;
          $opal.find_super_dispatcher(self, 'initialize', TMP_7, null).apply(self, [kind, instance, instance.$config()]);
          return self.process_method = ((($a = process_method) !== false && $a !== nil) ? $a : instance.$method("process"));
        }, nil) && 'initialize';
      })(self, $scope.Extension);

      (function($base, $super) {
        function $Group(){};
        var self = $Group = $klass($base, $super, 'Group', $Group);

        var def = self._proto, $scope = self._scope;

        (function(self) {
          var $scope = self._scope, def = self._proto;

          return (self._proto.$register = function(name) {
            var self = this;

            if (name == null) {
              name = nil
            }
            return $scope.Extensions.$register(name, self);
          }, nil) && 'register'
        })(self.$singleton_class());

        return (def.$activate = function(registry) {
          var $a, self = this;

          return self.$raise((($a = $opal.Object._scope.NotImplementedError) == null ? $opal.cm('NotImplementedError') : $a));
        }, nil) && 'activate';
      })(self, null);

      (function($base, $super) {
        function $Registry(){};
        var self = $Registry = $klass($base, $super, 'Registry', $Registry);

        var def = self._proto, $scope = self._scope, TMP_9, TMP_10, TMP_11, TMP_12, TMP_13, TMP_14, TMP_15, TMP_16, TMP_18;

        def.groups = def.preprocessor_extensions = def.treeprocessor_extensions = def.postprocessor_extensions = def.include_processor_extensions = def.block_extensions = def.block_macro_extensions = def.inline_macro_extensions = nil;
        self.$attr_reader("document");

        self.$attr_reader("groups");

        def.$initialize = function(groups) {
          var self = this;

          if (groups == null) {
            groups = $hash2([], {})
          }
          self.groups = groups;
          self.preprocessor_extensions = self.treeprocessor_extensions = self.postprocessor_extensions = self.include_processor_extensions = nil;
          self.block_extensions = self.block_macro_extensions = self.inline_macro_extensions = nil;
          return self.document = nil;
        };

        def.$activate = function(document) {
          var $a, $b, TMP_8, self = this;

          self.document = document;
          ($a = ($b = ($scope.Extensions.$groups().$values()['$+'](self.groups.$values()))).$each, $a._p = (TMP_8 = function(group){var self = TMP_8._s || this, $a, $b, $case = nil;
if (group == null) group = nil;
          return (function() {$case = group;if ((($a = $opal.Object._scope.Proc) == null ? $opal.cm('Proc') : $a)['$===']($case)) {return (function() {$case = group.$arity();if ((0)['$===']($case) || (-1)['$===']($case)) {return ($a = ($b = self).$instance_exec, $a._p = group.$to_proc(), $a).call($b)}else if ((1)['$===']($case)) {return group.$call(self)}else { return nil }})()}else if ((($a = $opal.Object._scope.Class) == null ? $opal.cm('Class') : $a)['$===']($case)) {return group.$new().$activate(self)}else {return group.$activate(self)}})()}, TMP_8._s = self, TMP_8), $a).call($b);
          return self;
        };

        def.$preprocessor = TMP_9 = function(args) {
          var $a, $b, self = this, $iter = TMP_9._p, block = $iter || nil;

          args = $slice.call(arguments, 0);
          TMP_9._p = null;
          return ($a = ($b = self).$add_document_processor, $a._p = block.$to_proc(), $a).call($b, "preprocessor", args);
        };

        def['$preprocessors?'] = function() {
          var self = this;

          return self.preprocessor_extensions['$!']()['$!']();
        };

        def.$preprocessors = function() {
          var self = this;

          return self.preprocessor_extensions;
        };

        def.$treeprocessor = TMP_10 = function(args) {
          var $a, $b, self = this, $iter = TMP_10._p, block = $iter || nil;

          args = $slice.call(arguments, 0);
          TMP_10._p = null;
          return ($a = ($b = self).$add_document_processor, $a._p = block.$to_proc(), $a).call($b, "treeprocessor", args);
        };

        def['$treeprocessors?'] = function() {
          var self = this;

          return self.treeprocessor_extensions['$!']()['$!']();
        };

        def.$treeprocessors = function() {
          var self = this;

          return self.treeprocessor_extensions;
        };

        def.$postprocessor = TMP_11 = function(args) {
          var $a, $b, self = this, $iter = TMP_11._p, block = $iter || nil;

          args = $slice.call(arguments, 0);
          TMP_11._p = null;
          return ($a = ($b = self).$add_document_processor, $a._p = block.$to_proc(), $a).call($b, "postprocessor", args);
        };

        def['$postprocessors?'] = function() {
          var self = this;

          return self.postprocessor_extensions['$!']()['$!']();
        };

        def.$postprocessors = function() {
          var self = this;

          return self.postprocessor_extensions;
        };

        def.$include_processor = TMP_12 = function(args) {
          var $a, $b, self = this, $iter = TMP_12._p, block = $iter || nil;

          args = $slice.call(arguments, 0);
          TMP_12._p = null;
          return ($a = ($b = self).$add_document_processor, $a._p = block.$to_proc(), $a).call($b, "include_processor", args);
        };

        def['$include_processors?'] = function() {
          var self = this;

          return self.include_processor_extensions['$!']()['$!']();
        };

        def.$include_processors = function() {
          var self = this;

          return self.include_processor_extensions;
        };

        def.$block = TMP_13 = function(args) {
          var $a, $b, self = this, $iter = TMP_13._p, block = $iter || nil;

          args = $slice.call(arguments, 0);
          TMP_13._p = null;
          return ($a = ($b = self).$add_syntax_processor, $a._p = block.$to_proc(), $a).call($b, "block", args);
        };

        def['$blocks?'] = function() {
          var self = this;

          return self.block_extensions['$!']()['$!']();
        };

        def['$registered_for_block?'] = function(name, context) {
          var $a, self = this, ext = nil;

          if ((($a = (ext = self.block_extensions['$[]'](name.$to_sym()))) !== nil && (!$a._isBoolean || $a == true))) {
            if ((($a = (ext.$config()['$[]']("contexts")['$include?'](context))) !== nil && (!$a._isBoolean || $a == true))) {
              return ext
              } else {
              return false
            }
            } else {
            return false
          };
        };

        def.$find_block_extension = function(name) {
          var self = this;

          return self.block_extensions['$[]'](name.$to_sym());
        };

        def.$block_macro = TMP_14 = function(args) {
          var $a, $b, self = this, $iter = TMP_14._p, block = $iter || nil;

          args = $slice.call(arguments, 0);
          TMP_14._p = null;
          return ($a = ($b = self).$add_syntax_processor, $a._p = block.$to_proc(), $a).call($b, "block_macro", args);
        };

        def['$block_macros?'] = function() {
          var self = this;

          return self.block_macro_extensions['$!']()['$!']();
        };

        def['$registered_for_block_macro?'] = function(name) {
          var $a, self = this, ext = nil;

          if ((($a = (ext = self.block_macro_extensions['$[]'](name.$to_sym()))) !== nil && (!$a._isBoolean || $a == true))) {
            return ext
            } else {
            return false
          };
        };

        def.$find_block_macro_extension = function(name) {
          var self = this;

          return self.block_macro_extensions['$[]'](name.$to_sym());
        };

        def.$inline_macro = TMP_15 = function(args) {
          var $a, $b, self = this, $iter = TMP_15._p, block = $iter || nil;

          args = $slice.call(arguments, 0);
          TMP_15._p = null;
          return ($a = ($b = self).$add_syntax_processor, $a._p = block.$to_proc(), $a).call($b, "inline_macro", args);
        };

        def['$inline_macros?'] = function() {
          var self = this;

          return self.inline_macro_extensions['$!']()['$!']();
        };

        def['$registered_for_inline_macro?'] = function(name) {
          var $a, self = this, ext = nil;

          if ((($a = (ext = self.inline_macro_extensions['$[]'](name.$to_sym()))) !== nil && (!$a._isBoolean || $a == true))) {
            return ext
            } else {
            return false
          };
        };

        def.$find_inline_macro_extension = function(name) {
          var self = this;

          return self.inline_macro_extensions['$[]'](name.$to_sym());
        };

        def.$inline_macros = function() {
          var self = this;

          return self.inline_macro_extensions.$values();
        };

        self.$private();

        def.$add_document_processor = TMP_16 = function(kind, args) {
          var $a, $b, TMP_17, $c, $d, $e, $f, self = this, $iter = TMP_16._p, block = $iter || nil, kind_name = nil, kind_class_symbol = nil, kind_class = nil, kind_java_class = nil, kind_store = nil, extension = nil, config = nil, processor = nil, processor_instance = nil;

          TMP_16._p = null;
          kind_name = kind.$to_s().$tr("_", " ");
          kind_class_symbol = ($a = ($b = kind_name.$split(" ")).$map, $a._p = (TMP_17 = function(word){var self = TMP_17._s || this;
if (word == null) word = nil;
          return "" + (word.$chr().$upcase()) + (word['$[]']($range(1, -1, false)))}, TMP_17._s = self, TMP_17), $a).call($b).$join().$to_sym();
          kind_class = $scope.Extensions.$const_get(kind_class_symbol);
          kind_java_class = (function() {if ((($a = (($opal.Object._scope.AsciidoctorJ == null ? nil : 'constant'))) !== nil && (!$a._isBoolean || $a == true))) {
            return (((($a = $opal.Object._scope.AsciidoctorJ) == null ? $opal.cm('AsciidoctorJ') : $a))._scope.Extensions.$const_get(kind_class_symbol))
            } else {
            return nil
          }; return nil; })();
          kind_store = ((($a = self.$instance_variable_get(((("@") + (kind)) + "_extensions").$to_sym())) !== false && $a !== nil) ? $a : self.$instance_variable_set(((("@") + (kind)) + "_extensions").$to_sym(), []));
          extension = (function() {if ((block !== nil)) {
            config = self.$resolve_args(args, 1);
            processor = kind_class.$new(config);
            (function(self) {
              var $scope = self._scope, def = self._proto;

              return self.$include_dsl()
            })(processor.$singleton_class());
            ($a = ($c = processor).$instance_exec, $a._p = block.$to_proc(), $a).call($c);
            processor.$freeze();
            if ((($a = processor['$process_block_given?']()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("No block specified to process " + (kind_name) + " extension at " + (block.$source_location())))
            };
            return $scope.ProcessorExtension.$new(kind, processor);
            } else {
            $a = $opal.to_ary(self.$resolve_args(args, 2)), processor = ($a[0] == null ? nil : $a[0]), config = ($a[1] == null ? nil : $a[1]);
            if ((($a = ((($d = (processor['$is_a?']((($e = $opal.Object._scope.Class) == null ? $opal.cm('Class') : $e)))) !== false && $d !== nil) ? $d : (($e = (processor['$is_a?']((($f = $opal.Object._scope.String) == null ? $opal.cm('String') : $f))), $e !== false && $e !== nil ?(processor = $scope.Extensions.$class_for_name(processor)) : $e)))) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = ((($d = processor['$<'](kind_class)) !== false && $d !== nil) ? $d : ((($e = kind_java_class !== false && kind_java_class !== nil) ? processor['$<'](kind_java_class) : $e)))) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("Invalid type for " + (kind_name) + " extension: " + (processor)))
              };
              processor_instance = processor.$new(config);
              processor_instance.$freeze();
              return $scope.ProcessorExtension.$new(kind, processor_instance);
            } else if ((($a = ((($d = (processor['$is_a?'](kind_class))) !== false && $d !== nil) ? $d : ((($e = kind_java_class !== false && kind_java_class !== nil) ? (processor['$is_a?'](kind_java_class)) : $e)))) !== nil && (!$a._isBoolean || $a == true))) {
              processor.$update_config(config);
              processor.$freeze();
              return $scope.ProcessorExtension.$new(kind, processor);
              } else {
              return self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("Invalid arguments specified for registering " + (kind_name) + " extension: " + (args)))
            };
          }; return nil; })();
          if (extension.$config()['$[]']("position")['$=='](">>")) {
            return kind_store.$unshift(extension)
            } else {
            return kind_store['$<<'](extension)
          };
        };

        def.$add_syntax_processor = TMP_18 = function(kind, args) {
          var $a, $b, TMP_19, $c, $d, $e, $f, self = this, $iter = TMP_18._p, block = $iter || nil, kind_name = nil, kind_class_basename = nil, kind_class_symbol = nil, kind_class = nil, kind_java_class = nil, kind_store = nil, name = nil, config = nil, processor = nil, processor_instance = nil;

          TMP_18._p = null;
          kind_name = kind.$to_s().$tr("_", " ");
          kind_class_basename = ($a = ($b = kind_name.$split(" ")).$map, $a._p = (TMP_19 = function(word){var self = TMP_19._s || this;
if (word == null) word = nil;
          return "" + (word.$chr().$upcase()) + (word['$[]']($range(1, -1, false)))}, TMP_19._s = self, TMP_19), $a).call($b).$join();
          kind_class_symbol = ((("") + (kind_class_basename)) + "Processor").$to_sym();
          kind_class = $scope.Extensions.$const_get(kind_class_symbol);
          kind_java_class = (function() {if ((($a = (($opal.Object._scope.AsciidoctorJ == null ? nil : 'constant'))) !== nil && (!$a._isBoolean || $a == true))) {
            return (((($a = $opal.Object._scope.AsciidoctorJ) == null ? $opal.cm('AsciidoctorJ') : $a))._scope.Extensions.$const_get(kind_class_symbol))
            } else {
            return nil
          }; return nil; })();
          kind_store = ((($a = self.$instance_variable_get(((("@") + (kind)) + "_extensions").$to_sym())) !== false && $a !== nil) ? $a : self.$instance_variable_set(((("@") + (kind)) + "_extensions").$to_sym(), $hash2([], {})));
          if ((block !== nil)) {
            $a = $opal.to_ary(self.$resolve_args(args, 2)), name = ($a[0] == null ? nil : $a[0]), config = ($a[1] == null ? nil : $a[1]);
            processor = kind_class.$new(self.$as_symbol(name), config);
            (function(self) {
              var $scope = self._scope, def = self._proto;

              return self.$include_dsl()
            })(processor.$singleton_class());
            if (block.$arity()['$=='](1)) {
              if ($opal.$yield1(block, processor) === $breaker) return $breaker.$v
              } else {
              ($a = ($c = processor).$instance_exec, $a._p = block.$to_proc(), $a).call($c)
            };
            if ((($a = (name = self.$as_symbol(processor.$name()))) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("No name specified for " + (kind_name) + " extension at " + (block.$source_location())))
            };
            if ((($a = processor['$process_block_given?']()) !== nil && (!$a._isBoolean || $a == true))) {
              } else {
              self.$raise((($a = $opal.Object._scope.NoMethodError) == null ? $opal.cm('NoMethodError') : $a).$new("No block specified to process " + (kind_name) + " extension at " + (block.$source_location())))
            };
            processor.$freeze();
            return kind_store['$[]='](name, $scope.ProcessorExtension.$new(kind, processor));
            } else {
            $a = $opal.to_ary(self.$resolve_args(args, 3)), processor = ($a[0] == null ? nil : $a[0]), name = ($a[1] == null ? nil : $a[1]), config = ($a[2] == null ? nil : $a[2]);
            if ((($a = ((($d = (processor['$is_a?']((($e = $opal.Object._scope.Class) == null ? $opal.cm('Class') : $e)))) !== false && $d !== nil) ? $d : (($e = (processor['$is_a?']((($f = $opal.Object._scope.String) == null ? $opal.cm('String') : $f))), $e !== false && $e !== nil ?(processor = $scope.Extensions.$class_for_name(processor)) : $e)))) !== nil && (!$a._isBoolean || $a == true))) {
              if ((($a = ((($d = processor['$<'](kind_class)) !== false && $d !== nil) ? $d : ((($e = kind_java_class !== false && kind_java_class !== nil) ? processor['$<'](kind_java_class) : $e)))) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("Class specified for " + (kind_name) + " extension does not inherit from " + (kind_class) + ": " + (processor)))
              };
              processor_instance = processor.$new(self.$as_symbol(name), config);
              if ((($a = (name = self.$as_symbol(processor_instance.$name()))) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("No name specified for " + (kind_name) + " extension: " + (processor)))
              };
              processor.$freeze();
              return kind_store['$[]='](name, $scope.ProcessorExtension.$new(kind, processor_instance));
            } else if ((($a = ((($d = (processor['$is_a?'](kind_class))) !== false && $d !== nil) ? $d : ((($e = kind_java_class !== false && kind_java_class !== nil) ? (processor['$is_a?'](kind_java_class)) : $e)))) !== nil && (!$a._isBoolean || $a == true))) {
              processor.$update_config(config);
              if ((($a = (name = (function() {if (name !== false && name !== nil) {
                return (processor['$name='](self.$as_symbol(name)))
                } else {
                return (self.$as_symbol(processor.$name()))
              }; return nil; })())) !== nil && (!$a._isBoolean || $a == true))) {
                } else {
                self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("No name specified for " + (kind_name) + " extension: " + (processor)))
              };
              processor.$freeze();
              return kind_store['$[]='](name, $scope.ProcessorExtension.$new(kind, processor));
              } else {
              return self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("Invalid arguments specified for registering " + (kind_name) + " extension: " + (args)))
            };
          };
        };

        def.$resolve_args = function(args, expect) {
          var $a, $b, self = this, opts = nil, num_args = nil, missing = nil;

          opts = (function() {if ((($a = (args['$[]'](-1)['$is_a?']((($b = $opal.Object._scope.Hash) == null ? $opal.cm('Hash') : $b)))) !== nil && (!$a._isBoolean || $a == true))) {
            return args.$pop()
            } else {
            return $hash2([], {})
          }; return nil; })();
          if (expect['$=='](1)) {
            return opts};
          num_args = args.$size();
          if (((missing = expect['$-'](1)['$-'](num_args)))['$>'](0)) {
            args.$fill(nil, num_args, missing)
          } else if (missing['$<'](0)) {
            args.$pop(missing['$-@']())};
          args['$<<'](opts);
          return args;
        };

        return (def.$as_symbol = function(name) {
          var $a, $b, self = this;

          if (name !== false && name !== nil) {
            return ((function() {if ((($a = (name['$is_a?']((($b = $opal.Object._scope.Symbol) == null ? $opal.cm('Symbol') : $b)))) !== nil && (!$a._isBoolean || $a == true))) {
              return name
              } else {
              return name.$to_sym()
            }; return nil; })())
            } else {
            return nil
          };
        }, nil) && 'as_symbol';
      })(self, null);

      (function(self) {
        var $scope = self._scope, def = self._proto;

        self._proto.$generate_name = function() {
          var self = this;

          return "extgrp" + (self.$next_auto_id());
        };
        self._proto.$next_auto_id = function() {
          var $a, self = this;
          if (self.auto_id == null) self.auto_id = nil;

          ((($a = self.auto_id) !== false && $a !== nil) ? $a : self.auto_id = -1);
          return self.auto_id = self.auto_id['$+'](1);
        };
        self._proto.$groups = function() {
          var $a, self = this;
          if (self.groups == null) self.groups = nil;

          return ((($a = self.groups) !== false && $a !== nil) ? $a : self.groups = $hash2([], {}));
        };
        self._proto.$build_registry = TMP_20 = function(name) {
          var $a, self = this, $iter = TMP_20._p, block = $iter || nil;

          if (name == null) {
            name = nil
          }
          TMP_20._p = null;
          if ((block !== nil)) {
            ((($a = name) !== false && $a !== nil) ? $a : name = self.$generate_name());
            return $scope.Registry.$new($hash(name, block));
            } else {
            return $scope.Registry.$new()
          };
        };
        self._proto.$register = TMP_21 = function(args) {
          var $a, self = this, $iter = TMP_21._p, block = $iter || nil, argc = nil, resolved_group = nil, group = nil, $case = nil, name = nil;

          args = $slice.call(arguments, 0);
          TMP_21._p = null;
          argc = args.$length();
          resolved_group = (function() {if ((block !== nil)) {
            return block
          } else if ((($a = ((group = args.$pop()))['$!']()) !== nil && (!$a._isBoolean || $a == true))) {
            return self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("Extension group to register not specified"))
            } else {
            return (function() {$case = group;if ((($a = $opal.Object._scope.Class) == null ? $opal.cm('Class') : $a)['$===']($case)) {return group}else if ((($a = $opal.Object._scope.String) == null ? $opal.cm('String') : $a)['$===']($case)) {return self.$class_for_name(group)}else if ((($a = $opal.Object._scope.Symbol) == null ? $opal.cm('Symbol') : $a)['$===']($case)) {return self.$class_for_name(group.$to_s())}else {return group}})()
          }; return nil; })();
          name = ((($a = args.$pop()) !== false && $a !== nil) ? $a : self.$generate_name());
          if ((($a = args['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
            } else {
            self.$raise((($a = $opal.Object._scope.ArgumentError) == null ? $opal.cm('ArgumentError') : $a).$new("Wrong number of arguments (" + (argc) + " for 1..2)"))
          };
          return self.$groups()['$[]='](name, resolved_group);
        };
        self._proto.$unregister_all = function() {
          var self = this;

          return self.groups = $hash2([], {});
        };
        self._proto.$resolve_class = function(object) {
          var $a, $b, self = this;

          if ((($a = (object['$is_a?']((($b = $opal.Object._scope.Class) == null ? $opal.cm('Class') : $b)))) !== nil && (!$a._isBoolean || $a == true))) {
            return object
            } else {
            return (self.$class_for_name(object.$to_s()))
          };
        };
        return (self._proto.$class_for_name = function(qualified_name) {
          var $a, $b, TMP_22, self = this, resolved_class = nil;

          resolved_class = (($a = $opal.Object._scope.Object) == null ? $opal.cm('Object') : $a);
          ($a = ($b = qualified_name.$split("::")).$each, $a._p = (TMP_22 = function(name){var self = TMP_22._s || this, $a;
if (name == null) name = nil;
          if ((($a = name['$empty?']()) !== nil && (!$a._isBoolean || $a == true))) {
              return nil
            } else if ((($a = resolved_class['$const_defined?'](name)) !== nil && (!$a._isBoolean || $a == true))) {
              return resolved_class = resolved_class.$const_get(name)
              } else {
              return self.$raise("Could not resolve class for name: " + (qualified_name))
            }}, TMP_22._s = self, TMP_22), $a).call($b);
          return resolved_class;
        }, nil) && 'class_for_name';
      })(self.$singleton_class());
      
    })(self)
    
  })(self)
})(Opal);
