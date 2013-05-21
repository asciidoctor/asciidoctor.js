(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __hash2 = __opal.hash2;
  return (function(__base){
    function Template() {};
    Template = __module(__base, "Template", Template);
    var def = Template.prototype, __scope = Template._scope;

    Template._cache = __hash2([], {});

    Template._defs('$[]', function(name) {
      var $a;
      if (this._cache == null) this._cache = nil;

      return (($a = this._cache)['$[]'] || $mm('[]')).call($a, name)
    });

    Template._defs('$[]=', function(name, instance) {
      var $a;
      if (this._cache == null) this._cache = nil;

      return (($a = this._cache)['$[]='] || $mm('[]=')).call($a, name, instance)
    });
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function ERB() {};
    ERB = __klass(__base, __super, "ERB", ERB);

    var def = ERB.prototype, __scope = ERB._scope, TMP_1;
    def.name = def.body = nil;

    def.$initialize = TMP_1 = function(name) {
      var $a, body;
      body = TMP_1._p || nil, TMP_1._p = null;
      
      this.body = body;
      this.name = name;
      return (($a = __scope.Template)['$[]='] || $mm('[]=')).call($a, name, this);
    };

    def.$inspect = function() {
      var $a;
      return "#<ERB: name=" + ((($a = this.name).$inspect || $mm('inspect')).call($a)) + ">";
    };

    def.$render = function(ctx) {
      var $a, $b, $c;if (ctx == null) {
        ctx = this
      }
      return ($b = (($c = ctx).$instance_eval || $mm('instance_eval')), $b._p = (($a = this.body).$to_proc || $mm('to_proc')).call($a), $b).call($c);
    };

    return nil;
  })(self, null);
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass, __range = __opal.range;
  (function(__base, __super){
    function Array() {};
    Array = __klass(__base, __super, "Array", Array);

    var def = Array.prototype, __scope = Array._scope;

    def.$to_set = function() {
      
      return this;
    };

    return nil;
  })(self, null);
  (function(__base, __super){
    function Set() {};
    Set = __klass(__base, __super, "Set", Set);

    var def = Set.prototype, __scope = Set._scope;

    return nil
  })(self, __scope.Array);
  (function(__base, __super){
    function File() {};
    File = __klass(__base, __super, "File", File);

    var def = File.prototype, __scope = File._scope;

    __scope.SEPARATOR = "/";

    __scope.ALT_SEPARATOR = nil;

    File._defs('$expand_path', function(path) {
      
      return path
    });

    File._defs('$join', function(paths) {
      var $a, $b;paths = __slice.call(arguments, 0);
      return ($a = paths, $b = __scope.SEPARATOR, typeof($a) === 'number' ? $a * $b : $a['$*']($b))
    });

    File._defs('$basename', function(path) {
      var $a, $b, $c, $d, $e;
      return (($a = path)['$[]'] || $mm('[]')).call($a, __range(($b = (($d = (($e = path).$rindex || $mm('rindex')).call($e, (__scope.File)._scope.SEPARATOR)), $d !== false && $d !== nil ? $d : -1), $c = 1, typeof($b) === 'number' ? $b + $c : $b['$+']($c)), -1, false))
    });

    File._defs('$dirname', function(path) {
      var $a, $b, $c, $d, $e;
      return (($a = path)['$[]'] || $mm('[]')).call($a, __range(0, ($b = (($d = (($e = path).$rindex || $mm('rindex')).call($e, __scope.SEPARATOR)), $d !== false && $d !== nil ? $d : 0), $c = 1, typeof($b) === 'number' ? $b - $c : $b['$-']($c)), false))
    });

    File._defs('$extname', function(path) {
      var last_dot_idx = nil, $a, $b, $c, $d, $e, $f, $g, $h;
      if (($a = (($b = (($c = path).$to_s || $mm('to_s')).call($c))['$empty?'] || $mm('empty?')).call($b)) !== false && $a !== nil) {
        return ""
      };
      last_dot_idx = (($a = (($d = path)['$[]'] || $mm('[]')).call($d, __range(1, -1, false))).$rindex || $mm('rindex')).call($a, ".");
      if (($e = (($f = last_dot_idx)['$nil?'] || $mm('nil?')).call($f)) !== false && $e !== nil) {
        return ""
        } else {
        return (($e = path)['$[]'] || $mm('[]')).call($e, __range(($g = last_dot_idx, $h = 1, typeof($g) === 'number' ? $g + $h : $g['$+']($h)), -1, false))
      };
    });

    return nil;
  })(self, null);
  return (function(__base, __super){
    function Dir() {};
    Dir = __klass(__base, __super, "Dir", Dir);

    var def = Dir.prototype, __scope = Dir._scope;

    Dir._defs('$pwd', function() {
      
      return "."
    });

    return nil;
  })(self, null);
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __klass = __opal.klass;
  return (function(__base, __super){
    function StringScanner() {};
    StringScanner = __klass(__base, __super, "StringScanner", StringScanner);

    var def = StringScanner.prototype, __scope = StringScanner._scope;
    def.pos = def.matched = def.working = nil;

    def.$pos = function() {
      
      return this.pos
    }, nil;

    def.$matched = function() {
      
      return this.matched
    }, nil;

    def.$initialize = function(string) {
      
      this.string = string;
      this.pos = 0;
      this.matched = nil;
      return this.working = string;
    };

    def.$scan = function(regex) {
      
      
      var regex  = new RegExp('^' + regex.toString().substring(1, regex.toString().length - 1)),
          result = regex.exec(this.working);

      if (result == null) {
        return this.matched = nil;
      }
      else if (typeof(result) === 'object') {
        this.pos      += result[0].length;
        this.working  = this.working.substring(result[0].length);
        this.matched  = result[0];

        return result[0];
      }
      else if (typeof(result) === 'string') {
        this.pos     += result.length;
        this.working  = this.working.substring(result.length);

        return result;
      }
      else {
        return nil;
      }
    
    };

    def.$check = function(regex) {
      
      
      var regexp = new RegExp('^' + regex.toString().substring(1, regex.toString().length - 1)),
          result = regexp.exec(this.working);

      if (result == null) {
        return this.matched = nil;
      }

      return this.matched = result[0];
    
    };

    def.$peek = function(length) {
      
      return this.working.substring(0, length);
    };

    def['$eos?'] = function() {
      
      return this.working.length === 0;
    };

    def.$skip = function(re) {
      
      
      re = new RegExp('^' + re.source)
      var result = re.exec(this.working);

      if (result == null) {
        return this.matched = nil;
      }
      else {
        var match_str = result[0];
        var match_len = match_str.length;
        this.matched = match_str;
        this.pos += match_len;
        this.working = this.working.substring(match_len);
        return match_len;
      }
    
    };

    def.$get_byte = function() {
      
      
      var result = nil;
      if (this.pos < this.string.length) {
        this.pos += 1;
        result = this.matched = this.working.substring(0, 1);
        this.working = this.working.substring(1);
      }
      else {
        this.matched = nil; 
      }

      return result;
    
    };

    return def.$getch = def.$get_byte;
  })(self, null)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base){
      function Debug() {};
      Debug = __module(__base, "Debug", Debug);
      var def = Debug.prototype, __scope = Debug._scope, TMP_1;

      Debug.show_debug = nil;

      Debug._defs('$debug', TMP_1 = function() {
        var $a, $b, $c, __yield;
        __yield = TMP_1._p || nil, TMP_1._p = null;
        
        if (($a = (($b = this)['$show_debug_output?'] || $mm('show_debug_output?')).call($b)) !== false && $a !== nil) {
          return (($a = this).$puts || $mm('puts')).call($a, ((($c = __yield.call(null)) === __breaker) ? __breaker.$v : $c))
          } else {
          return nil
        }
      });

      Debug._defs('$set_debug', function(value) {
        
        return this.show_debug = value
      });

      Debug._defs('$show_debug_output?', function() {
        var $a, $b, $c, $d, $e, $f, $g;
        if (this.show_debug == null) this.show_debug = nil;

        return (($a = this.show_debug), $a !== false && $a !== nil ? $a : (($b = (($c = (($d = __scope.ENV)['$[]'] || $mm('[]')).call($d, "DEBUG"))['$=='] || $mm('==')).call($c, "true")) ? ($e = (($f = (($g = __scope.ENV)['$[]'] || $mm('[]')).call($g, "SUPPRESS_DEBUG"))['$=='] || $mm('==')).call($f, "true"), ($e === nil || $e === false)) : $b))
      });

      Debug._defs('$puts_indented', function(level, args) {
        var indentation = nil, $a, $b, $c, $d, TMP_2;args = __slice.call(arguments, 1);
        indentation = ($a = ($c = " ", $d = level, typeof($c) === 'number' ? $c * $d : $c['$*']($d)), $b = 2, typeof($a) === 'number' ? $a * $b : $a['$*']($b));
        return ($a = (($b = args).$each || $mm('each')), $a._p = (TMP_2 = function(arg) {

          var self = TMP_2._s || this, TMP_3, $a, $b;
          if (arg == null) arg = nil;

          return ($a = (($b = self).$debug || $mm('debug')), $a._p = (TMP_3 = function() {

            var self = TMP_3._s || this;
            
            return "" + (indentation) + (arg)
          }, TMP_3._s = self, TMP_3), $a).call($b)
        }, TMP_2._s = this, TMP_2), $a).call($b);
      });
      
    })(Asciidoctor)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __hash2 = __opal.hash2, __gvars = __opal.gvars, __range = __opal.range;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base){
      function Substituters() {};
      Substituters = __module(__base, "Substituters", Substituters);
      var def = Substituters.prototype, __scope = Substituters._scope, $a, $b, $c, $d;

      __scope.COMPOSITE_SUBS = __hash2(["none", "normal", "verbatim"], {"none": [], "normal": ["specialcharacters", "quotes", "attributes", "replacements", "macros", "post_replacements"], "verbatim": ["specialcharacters", "callouts"]});

      __scope.SUB_OPTIONS = ($a = (($c = __scope.COMPOSITE_SUBS).$keys || $mm('keys')).call($c), $b = (($d = __scope.COMPOSITE_SUBS)['$[]'] || $mm('[]')).call($d, "normal"), typeof($a) === 'number' ? $a + $b : $a['$+']($b));

      def.$passthroughs = function() {
        
        if (this.passthroughs == null) this.passthroughs = nil;

        return this.passthroughs
      }, nil;

      def.$apply_subs = function(lines, subs) {
        var multiline = nil, text = nil, passthroughs = nil, $a, $b, $c, $d, $e, TMP_1, $f, $g, $h, $i, $j, TMP_2, $k, $l, $m, $n;if (subs == null) {
          subs = (($n = __scope.COMPOSITE_SUBS)['$[]'] || $mm('[]')).call($n, "normal")
        }
        if (($a = (($b = subs)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          subs = []
          } else {
          if (($a = (($c = subs)['$is_a?'] || $mm('is_a?')).call($c, __scope.Symbol)) !== false && $a !== nil) {
            subs = [subs]
          }
        };
        if (($a = ($d = (($e = subs)['$empty?'] || $mm('empty?')).call($e), ($d === nil || $d === false))) !== false && $a !== nil) {
          subs = (($a = ($d = (($f = subs).$map || $mm('map')), $d._p = (TMP_1 = function(key) {

            var self = TMP_1._s || this, $a, $b;
            if (key == null) key = nil;

            if (($a = (($b = __scope.COMPOSITE_SUBS)['$has_key?'] || $mm('has_key?')).call($b, key)) !== false && $a !== nil) {
              return (($a = __scope.COMPOSITE_SUBS)['$[]'] || $mm('[]')).call($a, key)
              } else {
              return key
            }
          }, TMP_1._s = this, TMP_1), $d).call($f)).$flatten || $mm('flatten')).call($a)
        };
        if (($d = (($g = subs)['$empty?'] || $mm('empty?')).call($g)) !== false && $d !== nil) {
          return lines
        };
        multiline = (($d = lines)['$is_a?'] || $mm('is_a?')).call($d, __scope.Array);
        text = (function() { if (multiline !== false && multiline !== nil) {
          return (($h = lines).$join || $mm('join')).call($h, "\n")
          } else {
          return lines
        }; return nil; }).call(this);
        passthroughs = (($i = subs)['$include?'] || $mm('include?')).call($i, "macros");
        if (passthroughs !== false && passthroughs !== nil) {
          text = (($j = this).$extract_passthroughs || $mm('extract_passthroughs')).call($j, text)
        };
        ($k = (($l = subs).$each || $mm('each')), $k._p = (TMP_2 = function(type) {

          var $case = nil, self = TMP_2._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q;
          if (type == null) type = nil;

          return (function() { $case = type;if ((($b = "specialcharacters")['$==='] || $mm('===')).call($b, $case)) {
          return text = (($a = self).$sub_specialcharacters || $mm('sub_specialcharacters')).call($a, text)
          }
          else if ((($d = "quotes")['$==='] || $mm('===')).call($d, $case)) {
          return text = (($c = self).$sub_quotes || $mm('sub_quotes')).call($c, text)
          }
          else if ((($h = "attributes")['$==='] || $mm('===')).call($h, $case)) {
          return text = (($e = (($f = self).$sub_attributes || $mm('sub_attributes')).call($f, (($g = text).$split || $mm('split')).call($g, "\n"))).$join || $mm('join')).call($e, "\n")
          }
          else if ((($j = "replacements")['$==='] || $mm('===')).call($j, $case)) {
          return text = (($i = self).$sub_replacements || $mm('sub_replacements')).call($i, text)
          }
          else if ((($l = "macros")['$==='] || $mm('===')).call($l, $case)) {
          return text = (($k = self).$sub_macros || $mm('sub_macros')).call($k, text)
          }
          else if ((($n = "callouts")['$==='] || $mm('===')).call($n, $case)) {
          return text = (($m = self).$sub_callouts || $mm('sub_callouts')).call($m, text)
          }
          else if ((($p = "post_replacements")['$==='] || $mm('===')).call($p, $case)) {
          return text = (($o = self).$sub_post_replacements || $mm('sub_post_replacements')).call($o, text)
          }
          else {return (($q = self).$puts || $mm('puts')).call($q, "asciidoctor: WARNING: unknown substitution type " + (type))} }).call(self)
        }, TMP_2._s = this, TMP_2), $k).call($l);
        if (passthroughs !== false && passthroughs !== nil) {
          text = (($k = this).$restore_passthroughs || $mm('restore_passthroughs')).call($k, text)
        };
        if (multiline !== false && multiline !== nil) {
          return (($m = text).$split || $mm('split')).call($m, "\n")
          } else {
          return text
        };
      };

      def.$apply_normal_subs = function(lines) {
        var $a, $b, $c;
        return (($a = this).$apply_subs || $mm('apply_subs')).call($a, (function() { if (($b = (($c = lines)['$is_a?'] || $mm('is_a?')).call($c, __scope.Array)) !== false && $b !== nil) {
          return (($b = lines).$join || $mm('join')).call($b, "\n")
          } else {
          return lines
        }; return nil; }).call(this));
      };

      def.$apply_title_subs = function(title) {
        var $a;
        return (($a = this).$apply_subs || $mm('apply_subs')).call($a, title, ["specialcharacters", "quotes", "replacements", "macros", "attributes", "post_replacements"]);
      };

      def.$apply_literal_subs = function(lines) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t;
        if (this.document == null) this.document = nil;

        if (($a = (($b = this)['$attr?'] || $mm('attr?')).call($b, "subs")) !== false && $a !== nil) {
          return (($a = this).$apply_subs || $mm('apply_subs')).call($a, (($c = lines).$join || $mm('join')).call($c, "\n"), (($d = this).$resolve_subs || $mm('resolve_subs')).call($d, (($e = this).$attr || $mm('attr')).call($e, "subs")))
          } else {
          if (($f = ($g = ($g = (($g = (($h = (($i = (($j = this.document).$attributes || $mm('attributes')).call($j))['$[]'] || $mm('[]')).call($i, "basebackend"))['$=='] || $mm('==')).call($h, "html")) ? (($k = (($l = this).$attr || $mm('attr')).call($l, "style"))['$=='] || $mm('==')).call($k, "source") : $g), $g !== false && $g !== nil ? (($g = (($m = (($n = this.document).$attributes || $mm('attributes')).call($n))['$[]'] || $mm('[]')).call($m, "source-highlighter"))['$=='] || $mm('==')).call($g, "coderay") : $g), $g !== false && $g !== nil ? (($o = this)['$attr?'] || $mm('attr?')).call($o, "language") : $g)) !== false && $f !== nil) {
            return (($f = this).$sub_callouts || $mm('sub_callouts')).call($f, (($p = this).$highlight_source || $mm('highlight_source')).call($p, (($q = lines).$join || $mm('join')).call($q, "\n")))
            } else {
            return (($r = this).$apply_subs || $mm('apply_subs')).call($r, (($s = lines).$join || $mm('join')).call($s, "\n"), (($t = __scope.COMPOSITE_SUBS)['$[]'] || $mm('[]')).call($t, "verbatim"))
          }
        };
      };

      def.$apply_header_subs = function(text) {
        var $a;
        return (($a = this).$apply_subs || $mm('apply_subs')).call($a, text, ["specialcharacters", "attributes"]);
      };

      def.$apply_para_subs = function(lines) {
        var result = nil, $a, $b, $c, $d, $e, $f, $g;
        if (($a = (($b = this)['$attr?'] || $mm('attr?')).call($b, "subs")) !== false && $a !== nil) {
          result = (($a = this).$apply_subs || $mm('apply_subs')).call($a, lines, (($c = this).$resolve_subs || $mm('resolve_subs')).call($c, (($d = this).$attr || $mm('attr')).call($d, "subs")))
          } else {
          result = (($e = this).$apply_subs || $mm('apply_subs')).call($e, lines)
        };
        return ($f = result, $g = " ", typeof($f) === 'number' ? $f * $g : $f['$*']($g));
      };

      def.$apply_passthrough_subs = function(lines) {
        var subs = nil, $a, $b, $c, $d, $e;
        if (($a = (($b = this)['$attr?'] || $mm('attr?')).call($b, "subs")) !== false && $a !== nil) {
          subs = (($a = this).$resolve_subs || $mm('resolve_subs')).call($a, (($c = this).$attr || $mm('attr')).call($c, "subs"))
          } else {
          subs = ["attributes", "macros"]
        };
        return (($d = this).$apply_subs || $mm('apply_subs')).call($d, (($e = lines).$join || $mm('join')).call($e, "\n"), subs);
      };

      def.$extract_passthroughs = function(text) {
        var result = nil, $a, $b, $c, $d, $e, $f, $g, TMP_3, $h, $i, TMP_4, $j;
        result = (($a = text).$dup || $mm('dup')).call($a);
        if (($b = ($c = (($d = (($e = (($f = result)['$include?'] || $mm('include?')).call($f, "+++")), $e !== false && $e !== nil ? $e : (($g = result)['$include?'] || $mm('include?')).call($g, "$$"))), $d !== false && $d !== nil ? $d : (($e = result)['$include?'] || $mm('include?')).call($e, "pass:")), ($c === nil || $c === false))) === false || $b === nil) {
          result = ($b = (($c = result).$gsub || $mm('gsub')), $b._p = (TMP_3 = function() {

            var m = nil, subs = nil, index = nil, self = TMP_3._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s;
            if (self.passthroughs == null) self.passthroughs = nil;

            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false));
            };
            if ((($e = (($f = m)['$[]'] || $mm('[]')).call($f, 1))['$=='] || $mm('==')).call($e, "$$")) {
              subs = ["specialcharacters"]
              } else {
              if (($g = ($h = ($h = (($i = (($j = m)['$[]'] || $mm('[]')).call($j, 3))['$nil?'] || $mm('nil?')).call($i), ($h === nil || $h === false)), $h !== false && $h !== nil ? ($h = (($k = (($l = m)['$[]'] || $mm('[]')).call($l, 3))['$empty?'] || $mm('empty?')).call($k), ($h === nil || $h === false)) : $h)) !== false && $g !== nil) {
                subs = (($g = self).$resolve_subs || $mm('resolve_subs')).call($g, (($h = m)['$[]'] || $mm('[]')).call($h, 3))
                } else {
                subs = []
              }
            };
            (($m = self.passthroughs)['$<<'] || $mm('<<')).call($m, __hash2(["text", "subs"], {"text": (($n = (($o = m)['$[]'] || $mm('[]')).call($o, 2)), $n !== false && $n !== nil ? $n : (($p = (($q = m)['$[]'] || $mm('[]')).call($q, 4)).$gsub || $mm('gsub')).call($p, "]", "]")), "subs": subs}));
            index = ($n = (($s = self.passthroughs).$size || $mm('size')).call($s), $r = 1, typeof($n) === 'number' ? $n - $r : $n['$-']($r));
            return "x0" + (index) + "x0";
          }, TMP_3._s = this, TMP_3), $b).call($c, (($d = __scope.REGEXP)['$[]'] || $mm('[]')).call($d, "pass_macro"))
        };
        if (($b = ($h = (($i = result)['$include?'] || $mm('include?')).call($i, "`"), ($h === nil || $h === false))) === false || $b === nil) {
          result = ($b = (($h = result).$gsub || $mm('gsub')), $b._p = (TMP_4 = function() {

            var m = nil, index = nil, self = TMP_4._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
            if (self.passthroughs == null) self.passthroughs = nil;

            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 2))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return "" + ((($a = m)['$[]'] || $mm('[]')).call($a, 1)) + ((($d = (($e = m)['$[]'] || $mm('[]')).call($e, 2))['$[]'] || $mm('[]')).call($d, __range(1, -1, false)));
            };
            (($f = self.passthroughs)['$<<'] || $mm('<<')).call($f, __hash2(["text", "subs", "literal"], {"text": (($g = m)['$[]'] || $mm('[]')).call($g, 3), "subs": ["specialcharacters"], "literal": true}));
            index = ($h = (($j = self.passthroughs).$size || $mm('size')).call($j), $i = 1, typeof($h) === 'number' ? $h - $i : $h['$-']($i));
            return "" + ((($h = m)['$[]'] || $mm('[]')).call($h, 1)) + "x0" + (index) + "x0";
          }, TMP_4._s = this, TMP_4), $b).call($h, (($j = __scope.REGEXP)['$[]'] || $mm('[]')).call($j, "pass_lit"))
        };
        return result;
      };

      def.$restore_passthroughs = function(text) {
        var $a, $b, $c, $d, $e, $f, TMP_5;
        if (this.passthroughs == null) this.passthroughs = nil;

        if (($a = (($b = (($c = (($d = this.passthroughs)['$nil?'] || $mm('nil?')).call($d)), $c !== false && $c !== nil ? $c : (($e = this.passthroughs)['$empty?'] || $mm('empty?')).call($e))), $b !== false && $b !== nil ? $b : ($c = (($f = text)['$include?'] || $mm('include?')).call($f, "x0"), ($c === nil || $c === false)))) !== false && $a !== nil) {
          return text
        };
        return ($a = (($b = text).$gsub || $mm('gsub')), $a._p = (TMP_5 = function() {

          var pass = nil, self = TMP_5._s || this, $a, $b, $c, $d, $e, $f, $g, $h;
          if (self.passthroughs == null) self.passthroughs = nil;

          
          pass = (($a = self.passthroughs)['$[]'] || $mm('[]')).call($a, (($b = nil).$to_i || $mm('to_i')).call($b));
          text = (($c = self).$apply_subs || $mm('apply_subs')).call($c, (($d = pass)['$[]'] || $mm('[]')).call($d, "text"), (($e = pass).$fetch || $mm('fetch')).call($e, "subs", []));
          if (($f = (($g = pass)['$[]'] || $mm('[]')).call($g, "literal")) !== false && $f !== nil) {
            return (($f = (($h = __scope.Inline).$new || $mm('new')).call($h, self, "quoted", text, __hash2(["type"], {"type": "monospaced"}))).$render || $mm('render')).call($f)
            } else {
            return text
          };
        }, TMP_5._s = this, TMP_5), $a).call($b, (($c = __scope.REGEXP)['$[]'] || $mm('[]')).call($c, "pass_placeholder"));
      };

      def.$sub_specialcharacters = function(text) {
        var TMP_6, $a, $b;
        return ($a = (($b = text).$gsub || $mm('gsub')), $a._p = (TMP_6 = function() {

          var self = TMP_6._s || this, $a;
          
          return (($a = __scope.SPECIAL_CHARS)['$[]'] || $mm('[]')).call($a, __gvars["&"])
        }, TMP_6._s = this, TMP_6), $a).call($b, __scope.SPECIAL_CHARS_PATTERN);
      };

      def.$sub_quotes = function(text) {
        var result = nil, $a, TMP_7, $b, $c;
        result = (($a = text).$dup || $mm('dup')).call($a);
        ($b = (($c = __scope.QUOTE_SUBS).$each || $mm('each')), $b._p = (TMP_7 = function(type, scope, pattern) {

          var self = TMP_7._s || this, $a, $b, TMP_8, $c;
          if (type == null) type = nil;
if (scope == null) scope = nil;
if (pattern == null) pattern = nil;

          if (($a = (($b = type)['$is_a?'] || $mm('is_a?')).call($b, __scope.Array)) !== false && $a !== nil) {
            (($a = type)._isArray ? $a : ($a = [$a])), type = ($a[0] == null ? nil : $a[0]), scope = ($a[1] == null ? nil : $a[1]), pattern = ($a[2] == null ? nil : $a[2])
          };
          return result = ($a = (($c = result).$gsub || $mm('gsub')), $a._p = (TMP_8 = function() {

            var self = TMP_8._s || this, $a;
            
            return (($a = self).$transform_quoted_text || $mm('transform_quoted_text')).call($a, __gvars["~"], type, scope)
          }, TMP_8._s = self, TMP_8), $a).call($c, pattern);
        }, TMP_7._s = this, TMP_7), $b).call($c);
        return result;
      };

      def.$sub_replacements = function(text) {
        var result = nil, $a, TMP_9, $b, $c;
        result = (($a = text).$dup || $mm('dup')).call($a);
        ($b = (($c = __scope.REPLACEMENTS).$each || $mm('each')), $b._p = (TMP_9 = function(pattern, replacement, restore) {

          var self = TMP_9._s || this, $a, $b, TMP_10, $c;
          if (pattern == null) pattern = nil;
if (replacement == null) replacement = nil;
if (restore == null) restore = nil;

          if (($a = (($b = pattern)['$is_a?'] || $mm('is_a?')).call($b, __scope.Array)) !== false && $a !== nil) {
            (($a = pattern)._isArray ? $a : ($a = [$a])), pattern = ($a[0] == null ? nil : $a[0]), replacement = ($a[1] == null ? nil : $a[1]), restore = ($a[2] == null ? nil : $a[2])
          };
          return result = ($a = (($c = result).$gsub || $mm('gsub')), $a._p = (TMP_10 = function() {

            var m = nil, matched = nil, head = nil, tail = nil, $case = nil, self = TMP_10._s || this, $a, $b, $c, $d, $e, $f, $g, $h;
            
            m = __gvars["~"];
            matched = (($a = m)['$[]'] || $mm('[]')).call($a, 0);
            head = (($b = m)['$[]'] || $mm('[]')).call($b, 1);
            tail = (($c = m)['$[]'] || $mm('[]')).call($c, 2);
            if (($d = (($e = matched)['$include?'] || $mm('include?')).call($e, "\\")) !== false && $d !== nil) {
              return (($d = matched).$tr || $mm('tr')).call($d, "\\", "")
              } else {
              return (function() { $case = restore;if ((($f = "none")['$==='] || $mm('===')).call($f, $case)) {
              return replacement
              }
              else if ((($g = "leading")['$==='] || $mm('===')).call($g, $case)) {
              return "" + (head) + (replacement)
              }
              else if ((($h = "bounding")['$==='] || $mm('===')).call($h, $case)) {
              return "" + (head) + (replacement) + (tail)
              }
              else {return nil} }).call(self)
            };
          }, TMP_10._s = self, TMP_10), $a).call($c, pattern);
        }, TMP_9._s = this, TMP_9), $b).call($c);
        return result;
      };

      def.$sub_attributes = function(data) {
        var lines = nil, result = nil, $a, $b, $c, $d, TMP_11, $e, $f, $g;
        if (($a = (($b = (($c = data)['$nil?'] || $mm('nil?')).call($c)), $b !== false && $b !== nil ? $b : (($d = data)['$empty?'] || $mm('empty?')).call($d))) !== false && $a !== nil) {
          return data
        };
        lines = (($a = this).$Array || $mm('Array')).call($a, data);
        result = (($b = ($e = (($f = lines).$map || $mm('map')), $e._p = (TMP_11 = function(line) {

          var reject = nil, self = TMP_11._s || this, $a, $b, TMP_12, $c, $d, $e;
          if (line == null) line = nil;

          reject = false;
          if (($a = (($b = line)['$include?'] || $mm('include?')).call($b, "{")) !== false && $a !== nil) {
            line = ($a = (($c = line).$gsub || $mm('gsub')), $a._p = (TMP_12 = function() {

              var m = nil, key = nil, args = nil, self = TMP_12._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, TMP_13, $aa, $ab;
              if (self.document == null) self.document = nil;

              
              m = __gvars["~"];
              key = (($a = (($b = m)['$[]'] || $mm('[]')).call($b, 2)).$downcase || $mm('downcase')).call($a);
              if (($c = (($d = ($e = (($f = (($g = nil).$to_s || $mm('to_s')).call($g))['$empty?'] || $mm('empty?')).call($f), ($e === nil || $e === false))), $d !== false && $d !== nil ? $d : ($e = (($h = (($i = nil).$to_s || $mm('to_s')).call($i))['$empty?'] || $mm('empty?')).call($h), ($e === nil || $e === false)))) !== false && $c !== nil) {
                return "{" + (nil) + "}"
                } else {
                if (($c = (($d = (($e = m)['$[]'] || $mm('[]')).call($e, 2))['$start_with?'] || $mm('start_with?')).call($d, "counter:")) !== false && $c !== nil) {
                  args = (($c = (($j = m)['$[]'] || $mm('[]')).call($j, 2)).$split || $mm('split')).call($c, ":");
                  return (($k = self.document).$counter || $mm('counter')).call($k, (($l = args)['$[]'] || $mm('[]')).call($l, 1), (($m = args)['$[]'] || $mm('[]')).call($m, 2));
                  } else {
                  if (($n = (($o = (($p = m)['$[]'] || $mm('[]')).call($p, 2))['$start_with?'] || $mm('start_with?')).call($o, "counter2:")) !== false && $n !== nil) {
                    args = (($n = (($q = m)['$[]'] || $mm('[]')).call($q, 2)).$split || $mm('split')).call($n, ":");
                    (($r = self.document).$counter || $mm('counter')).call($r, (($s = args)['$[]'] || $mm('[]')).call($s, 1), (($t = args)['$[]'] || $mm('[]')).call($t, 2));
                    return "";
                    } else {
                    if (($u = (($v = (($w = self.document).$attributes || $mm('attributes')).call($w))['$has_key?'] || $mm('has_key?')).call($v, key)) !== false && $u !== nil) {
                      return (($u = (($x = self.document).$attributes || $mm('attributes')).call($x))['$[]'] || $mm('[]')).call($u, key)
                      } else {
                      if (($y = (($z = __scope.INTRINSICS)['$has_key?'] || $mm('has_key?')).call($z, key)) !== false && $y !== nil) {
                        return (($y = __scope.INTRINSICS)['$[]'] || $mm('[]')).call($y, key)
                        } else {
                        ($aa = (($ab = __scope.Debug).$debug || $mm('debug')), $aa._p = (TMP_13 = function() {

                          var self = TMP_13._s || this, $a;
                          
                          return "Missing attribute: " + ((($a = m)['$[]'] || $mm('[]')).call($a, 2)) + ", line marked for removal"
                        }, TMP_13._s = self, TMP_13), $aa).call($ab);
                        reject = true;
                        return (__breaker.$v = "{undefined}", __breaker);
                      }
                    }
                  }
                }
              };
            }, TMP_12._s = self, TMP_12), $a).call($c, (($d = __scope.REGEXP)['$[]'] || $mm('[]')).call($d, "attr_ref"))
          };
          if (($a = ($e = reject, ($e === nil || $e === false))) !== false && $a !== nil) {
            return line
            } else {
            return nil
          };
        }, TMP_11._s = this, TMP_11), $e).call($f)).$compact || $mm('compact')).call($b);
        if (($e = (($g = data)['$is_a?'] || $mm('is_a?')).call($g, __scope.String)) !== false && $e !== nil) {
          return (($e = result).$join || $mm('join')).call($e)
          } else {
          return result
        };
      };

      def.$sub_macros = function(text) {
        var result = nil, found = nil, link_attrs = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, TMP_14, $aa, $ab, $ac, $ad, $ae, TMP_15, $af, TMP_16, $ag, $ah, $ai, TMP_17, $aj, $ak, $al, $am, $an, $ao, TMP_18, $ap, $aq, TMP_19, $ar, $as, $at, $au, TMP_20, $av, $aw, $ax, $ay, $az, TMP_22, $ba, $bb, $bc, TMP_23, $bd, $be, $bf, $bg, TMP_24, $bh, $bi;
        if (this.document == null) this.document = nil;

        if (($a = (($b = (($c = text)['$nil?'] || $mm('nil?')).call($c)), $b !== false && $b !== nil ? $b : (($d = text)['$empty?'] || $mm('empty?')).call($d))) !== false && $a !== nil) {
          return text
        };
        result = (($a = text).$dup || $mm('dup')).call($a);
        found = __hash2([], {});
        (($b = found)['$[]='] || $mm('[]=')).call($b, "square_bracket", (($e = result)['$include?'] || $mm('include?')).call($e, "["));
        (($f = found)['$[]='] || $mm('[]=')).call($f, "round_bracket", (($g = result)['$include?'] || $mm('include?')).call($g, "("));
        (($h = found)['$[]='] || $mm('[]=')).call($h, "colon", (($i = result)['$include?'] || $mm('include?')).call($i, ":"));
        (($j = found)['$[]='] || $mm('[]=')).call($j, "at", (($k = result)['$include?'] || $mm('include?')).call($k, "@"));
        (($l = found)['$[]='] || $mm('[]=')).call($l, "macroish", ($m = (($m = found)['$[]'] || $mm('[]')).call($m, "square_bracket"), $m !== false && $m !== nil ? (($n = found)['$[]'] || $mm('[]')).call($n, "colon") : $m));
        (($o = found)['$[]='] || $mm('[]=')).call($o, "macroish_short_form", ($p = ($p = (($p = found)['$[]'] || $mm('[]')).call($p, "square_bracket"), $p !== false && $p !== nil ? (($q = found)['$[]'] || $mm('[]')).call($q, "colon") : $p), $p !== false && $p !== nil ? (($r = result)['$include?'] || $mm('include?')).call($r, ":[") : $p));
        (($s = found)['$[]='] || $mm('[]=')).call($s, "uri", ($t = (($t = found)['$[]'] || $mm('[]')).call($t, "colon"), $t !== false && $t !== nil ? (($u = result)['$include?'] || $mm('include?')).call($u, "://") : $t));
        link_attrs = (($v = (($w = this.document).$attributes || $mm('attributes')).call($w))['$has_key?'] || $mm('has_key?')).call($v, "linkattrs");
        if (($x = ($y = (($y = found)['$[]'] || $mm('[]')).call($y, "macroish"), $y !== false && $y !== nil ? (($z = result)['$include?'] || $mm('include?')).call($z, "image:") : $y)) !== false && $x !== nil) {
          result = ($x = (($aa = result).$gsub || $mm('gsub')), $x._p = (TMP_14 = function() {

            var m = nil, target = nil, attrs = nil, self = TMP_14._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p;
            if (self.document == null) self.document = nil;

            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false));
            };
            target = (($e = self).$sub_attributes || $mm('sub_attributes')).call($e, (($f = m)['$[]'] || $mm('[]')).call($f, 1));
            (($g = self.document).$register || $mm('register')).call($g, "images", target);
            attrs = (($h = self).$parse_attributes || $mm('parse_attributes')).call($h, (($i = self).$unescape_bracketed_text || $mm('unescape_bracketed_text')).call($i, (($j = m)['$[]'] || $mm('[]')).call($j, 2)), ["alt", "width", "height"]);
            if (($k = ($l = (($m = attrs)['$[]'] || $mm('[]')).call($m, "alt"), ($l === nil || $l === false))) !== false && $k !== nil) {
              (($k = attrs)['$[]='] || $mm('[]=')).call($k, "alt", (($l = __scope.File).$basename || $mm('basename')).call($l, target, (($n = __scope.File).$extname || $mm('extname')).call($n, target)))
            };
            return (($o = (($p = __scope.Inline).$new || $mm('new')).call($p, self, "image", nil, __hash2(["target", "attributes"], {"target": target, "attributes": attrs}))).$render || $mm('render')).call($o);
          }, TMP_14._s = this, TMP_14), $x).call($aa, (($ab = __scope.REGEXP)['$[]'] || $mm('[]')).call($ab, "image_macro"))
        };
        if (($x = (($ac = (($ad = found)['$[]'] || $mm('[]')).call($ad, "macroish_short_form")), $ac !== false && $ac !== nil ? $ac : (($ae = found)['$[]'] || $mm('[]')).call($ae, "round_bracket"))) !== false && $x !== nil) {
          result = ($x = (($ac = result).$gsub || $mm('gsub')), $x._p = (TMP_15 = function() {

            var m = nil, terms = nil, self = TMP_15._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m;
            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false));
            };
            terms = (($e = (($f = self).$unescape_bracketed_text || $mm('unescape_bracketed_text')).call($f, (($g = (($h = m)['$[]'] || $mm('[]')).call($h, 1)), $g !== false && $g !== nil ? $g : (($i = m)['$[]'] || $mm('[]')).call($i, 2)))).$split || $mm('split')).call($e, (($g = __scope.REGEXP)['$[]'] || $mm('[]')).call($g, "csv_delimiter"));
            (($j = (($k = self).$document || $mm('document')).call($k)).$register || $mm('register')).call($j, "indexterms", terms);
            return (($l = (($m = __scope.Inline).$new || $mm('new')).call($m, self, "indexterm", text, __hash2(["attributes"], {"attributes": __hash2(["terms"], {"terms": terms})}))).$render || $mm('render')).call($l);
          }, TMP_15._s = this, TMP_15), $x).call($ac, (($af = __scope.REGEXP)['$[]'] || $mm('[]')).call($af, "indexterm_macro"));
          result = ($x = (($ag = result).$gsub || $mm('gsub')), $x._p = (TMP_16 = function() {

            var m = nil, self = TMP_16._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k;
            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false));
            };
            text = (($e = self).$unescape_bracketed_text || $mm('unescape_bracketed_text')).call($e, (($f = (($g = m)['$[]'] || $mm('[]')).call($g, 1)), $f !== false && $f !== nil ? $f : (($h = m)['$[]'] || $mm('[]')).call($h, 2)));
            (($f = (($i = self).$document || $mm('document')).call($i)).$register || $mm('register')).call($f, "indexterms", [text]);
            return (($j = (($k = __scope.Inline).$new || $mm('new')).call($k, self, "indexterm", text, __hash2(["type"], {"type": "visible"}))).$render || $mm('render')).call($j);
          }, TMP_16._s = this, TMP_16), $x).call($ag, (($ah = __scope.REGEXP)['$[]'] || $mm('[]')).call($ah, "indexterm2_macro"));
        };
        if (($x = (($ai = found)['$[]'] || $mm('[]')).call($ai, "uri")) !== false && $x !== nil) {
          result = ($x = (($aj = result).$gsub || $mm('gsub')), $x._p = (TMP_17 = function() {

            var m = nil, prefix = nil, target = nil, suffix = nil, attrs = nil, self = TMP_17._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq;
            if (self.document == null) self.document = nil;

            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 2))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return "" + ((($a = m)['$[]'] || $mm('[]')).call($a, 1)) + ((($d = (($e = m)['$[]'] || $mm('[]')).call($e, 2))['$[]'] || $mm('[]')).call($d, __range(1, -1, false))) + ((($f = m)['$[]'] || $mm('[]')).call($f, 3));
              } else {
              if (($g = (($h = (($i = (($j = m)['$[]'] || $mm('[]')).call($j, 1))['$=='] || $mm('==')).call($i, "link:")) ? (($k = (($l = m)['$[]'] || $mm('[]')).call($l, 3))['$nil?'] || $mm('nil?')).call($k) : $h)) !== false && $g !== nil) {
                return (($g = m)['$[]'] || $mm('[]')).call($g, 0);
              }
            };
            prefix = (function() { if (($h = ($m = (($n = (($o = m)['$[]'] || $mm('[]')).call($o, 1))['$=='] || $mm('==')).call($n, "link:"), ($m === nil || $m === false))) !== false && $h !== nil) {
              return (($h = m)['$[]'] || $mm('[]')).call($h, 1)
              } else {
              return ""
            }; return nil; }).call(self);
            target = (($m = m)['$[]'] || $mm('[]')).call($m, 2);
            suffix = "";
            if (($p = ($q = (($q = prefix)['$start_with?'] || $mm('start_with?')).call($q, "&lt;"), $q !== false && $q !== nil ? (($r = target)['$end_with?'] || $mm('end_with?')).call($r, "&gt;") : $q)) !== false && $p !== nil) {
              prefix = (($p = prefix)['$[]'] || $mm('[]')).call($p, __range(4, -1, false));
              target = (($s = target)['$[]'] || $mm('[]')).call($s, __range(0, -5, false));
              } else {
              if (($t = ($u = (($u = prefix)['$start_with?'] || $mm('start_with?')).call($u, "("), $u !== false && $u !== nil ? (($v = target)['$end_with?'] || $mm('end_with?')).call($v, ")") : $u)) !== false && $t !== nil) {
                target = (($t = target)['$[]'] || $mm('[]')).call($t, __range(0, -2, false));
                suffix = ")";
              }
            };
            (($w = self.document).$register || $mm('register')).call($w, "links", target);
            attrs = nil;
            if (($x = ($y = (($z = (($aa = (($ab = m)['$[]'] || $mm('[]')).call($ab, 3)).$to_s || $mm('to_s')).call($aa))['$empty?'] || $mm('empty?')).call($z), ($y === nil || $y === false))) !== false && $x !== nil) {
              if (($x = (($y = link_attrs !== false && link_attrs !== nil) ? (($ac = (($ad = (($ae = m)['$[]'] || $mm('[]')).call($ae, 3))['$start_with?'] || $mm('start_with?')).call($ad, "\"")), $ac !== false && $ac !== nil ? $ac : (($af = (($ag = m)['$[]'] || $mm('[]')).call($ag, 3))['$include?'] || $mm('include?')).call($af, ",")) : $y)) !== false && $x !== nil) {
                attrs = (($x = self).$parse_attributes || $mm('parse_attributes')).call($x, (($y = self).$sub_attributes || $mm('sub_attributes')).call($y, (($ac = (($ah = m)['$[]'] || $mm('[]')).call($ah, 3)).$gsub || $mm('gsub')).call($ac, "]", "]")));
                text = (($ai = attrs)['$[]'] || $mm('[]')).call($ai, 1);
                } else {
                text = (($aj = self).$sub_attributes || $mm('sub_attributes')).call($aj, (($ak = (($al = m)['$[]'] || $mm('[]')).call($al, 3)).$gsub || $mm('gsub')).call($ak, "]", "]"))
              }
              } else {
              text = ""
            };
            return "" + (prefix) + ((($am = (($an = __scope.Inline).$new || $mm('new')).call($an, self, "anchor", (function() { if (($ao = ($ap = (($aq = text)['$empty?'] || $mm('empty?')).call($aq), ($ap === nil || $ap === false))) !== false && $ao !== nil) {
              return text
              } else {
              return target
            }; return nil; }).call(self), __hash2(["type", "target", "attributes"], {"type": "link", "target": target, "attributes": attrs}))).$render || $mm('render')).call($am)) + (suffix);
          }, TMP_17._s = this, TMP_17), $x).call($aj, (($ak = __scope.REGEXP)['$[]'] || $mm('[]')).call($ak, "link_inline"))
        };
        if (($x = ($al = (($al = found)['$[]'] || $mm('[]')).call($al, "macroish"), $al !== false && $al !== nil ? (($am = (($an = result)['$include?'] || $mm('include?')).call($an, "link:")), $am !== false && $am !== nil ? $am : (($ao = result)['$include?'] || $mm('include?')).call($ao, "mailto:")) : $al)) !== false && $x !== nil) {
          result = ($x = (($am = result).$gsub || $mm('gsub')), $x._p = (TMP_18 = function() {

            var m = nil, raw_target = nil, mailto = nil, target = nil, attrs = nil, self = TMP_18._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae;
            if (self.document == null) self.document = nil;

            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false));
            };
            raw_target = (($e = m)['$[]'] || $mm('[]')).call($e, 1);
            mailto = (($f = (($g = m)['$[]'] || $mm('[]')).call($g, 0))['$start_with?'] || $mm('start_with?')).call($f, "mailto:");
            target = (function() { if (mailto !== false && mailto !== nil) {
              return "mailto:" + (raw_target)
              } else {
              return raw_target
            }; return nil; }).call(self);
            attrs = nil;
            if (($h = (($i = link_attrs !== false && link_attrs !== nil) ? (($j = (($k = (($l = m)['$[]'] || $mm('[]')).call($l, 2))['$start_with?'] || $mm('start_with?')).call($k, "\"")), $j !== false && $j !== nil ? $j : (($m = (($n = m)['$[]'] || $mm('[]')).call($n, 2))['$include?'] || $mm('include?')).call($m, ",")) : $i)) !== false && $h !== nil) {
              attrs = (($h = self).$parse_attributes || $mm('parse_attributes')).call($h, (($i = self).$sub_attributes || $mm('sub_attributes')).call($i, (($j = (($o = m)['$[]'] || $mm('[]')).call($o, 2)).$gsub || $mm('gsub')).call($j, "]", "]")));
              text = (($p = attrs)['$[]'] || $mm('[]')).call($p, 1);
              if (mailto !== false && mailto !== nil) {
                if (($q = (($r = attrs)['$has_key?'] || $mm('has_key?')).call($r, 2)) !== false && $q !== nil) {
                  target = "" + (target) + "?subject=" + ((($q = __scope.Helpers).$encode_uri || $mm('encode_uri')).call($q, (($s = attrs)['$[]'] || $mm('[]')).call($s, 2)));
                  if (($t = (($u = attrs)['$has_key?'] || $mm('has_key?')).call($u, 3)) !== false && $t !== nil) {
                    target = "" + (target) + "&amp;body=" + ((($t = __scope.Helpers).$encode_uri || $mm('encode_uri')).call($t, (($v = attrs)['$[]'] || $mm('[]')).call($v, 3)))
                  };
                }
              };
              } else {
              text = (($w = self).$sub_attributes || $mm('sub_attributes')).call($w, (($x = (($y = m)['$[]'] || $mm('[]')).call($y, 2)).$gsub || $mm('gsub')).call($x, "]", "]"))
            };
            (($z = self.document).$register || $mm('register')).call($z, "links", target);
            return (($aa = (($ab = __scope.Inline).$new || $mm('new')).call($ab, self, "anchor", (function() { if (($ac = ($ad = (($ae = text)['$empty?'] || $mm('empty?')).call($ae), ($ad === nil || $ad === false))) !== false && $ac !== nil) {
              return text
              } else {
              return raw_target
            }; return nil; }).call(self), __hash2(["type", "target", "attributes"], {"type": "link", "target": target, "attributes": attrs}))).$render || $mm('render')).call($aa);
          }, TMP_18._s = this, TMP_18), $x).call($am, (($ap = __scope.REGEXP)['$[]'] || $mm('[]')).call($ap, "link_macro"))
        };
        if (($x = (($aq = found)['$[]'] || $mm('[]')).call($aq, "at")) !== false && $x !== nil) {
          result = ($x = (($ar = result).$gsub || $mm('gsub')), $x._p = (TMP_19 = function() {

            var m = nil, address = nil, $case = nil, target = nil, self = TMP_19._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i;
            if (self.document == null) self.document = nil;

            
            m = __gvars["~"];
            address = (($a = m)['$[]'] || $mm('[]')).call($a, 0);
            $case = (($b = address)['$[]'] || $mm('[]')).call($b, __range(0, 0, false));if ((($d = "\\")['$==='] || $mm('===')).call($d, $case)) {
            return (($c = address)['$[]'] || $mm('[]')).call($c, __range(1, -1, false));
            }
            else if ((($e = ">")['$==='] || $mm('===')).call($e, $case) || (($f = ":")['$==='] || $mm('===')).call($f, $case)) {
            return address;
            };
            target = "mailto:" + (address);
            (($g = self.document).$register || $mm('register')).call($g, "links", target);
            return (($h = (($i = __scope.Inline).$new || $mm('new')).call($i, self, "anchor", address, __hash2(["type", "target"], {"type": "link", "target": target}))).$render || $mm('render')).call($h);
          }, TMP_19._s = this, TMP_19), $x).call($ar, (($as = __scope.REGEXP)['$[]'] || $mm('[]')).call($as, "email_inline"))
        };
        if (($x = ($at = (($at = found)['$[]'] || $mm('[]')).call($at, "macroish_short_form"), $at !== false && $at !== nil ? (($au = result)['$include?'] || $mm('include?')).call($au, "footnote") : $at)) !== false && $x !== nil) {
          result = ($x = (($av = result).$gsub || $mm('gsub')), $x._p = (TMP_20 = function() {

            var m = nil, id = nil, index = nil, type = nil, target = nil, footnote = nil, self = TMP_20._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, TMP_21, $t, $u, $v, $w, $x, $y, $z;
            if (self.document == null) self.document = nil;

            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false));
            };
            if ((($e = (($f = m)['$[]'] || $mm('[]')).call($f, 1))['$=='] || $mm('==')).call($e, "footnote")) {
              text = (($g = self).$restore_passthroughs || $mm('restore_passthroughs')).call($g, (($h = m)['$[]'] || $mm('[]')).call($h, 2));
              id = nil;
              index = (($i = self.document).$counter || $mm('counter')).call($i, "footnote-number");
              (($j = self.document).$register || $mm('register')).call($j, "footnotes", (($k = __scope.Footnote).$new || $mm('new')).call($k, index, id, text));
              type = nil;
              target = nil;
              } else {
              (($l = (($m = (($n = m)['$[]'] || $mm('[]')).call($n, 2)).$split || $mm('split')).call($m, (($o = __scope.REGEXP)['$[]'] || $mm('[]')).call($o, "csv_delimiter"), 2))._isArray ? $l : ($l = [$l])), id = ($l[0] == null ? nil : $l[0]), text = ($l[1] == null ? nil : $l[1]);
              if (($l = ($p = (($q = text)['$nil?'] || $mm('nil?')).call($q), ($p === nil || $p === false))) !== false && $l !== nil) {
                text = (($l = self).$restore_passthroughs || $mm('restore_passthroughs')).call($l, text);
                index = (($p = self.document).$counter || $mm('counter')).call($p, "footnote-number");
                (($r = self.document).$register || $mm('register')).call($r, "footnotes", (($s = __scope.Footnote).$new || $mm('new')).call($s, index, id, text));
                type = "ref";
                target = nil;
                } else {
                footnote = ($t = (($u = (($v = (($w = self.document).$references || $mm('references')).call($w))['$[]'] || $mm('[]')).call($v, "footnotes")).$find || $mm('find')), $t._p = (TMP_21 = function(fn) {

                  var self = TMP_21._s || this, $a, $b;
                  if (fn == null) fn = nil;

                  return (($a = (($b = fn).$id || $mm('id')).call($b))['$=='] || $mm('==')).call($a, id)
                }, TMP_21._s = self, TMP_21), $t).call($u);
                target = id;
                id = nil;
                index = (($t = footnote).$index || $mm('index')).call($t);
                text = (($x = footnote).$text || $mm('text')).call($x);
                type = "xref";
              };
            };
            return (($y = (($z = __scope.Inline).$new || $mm('new')).call($z, self, "footnote", text, __hash2(["attributes", "id", "target", "type"], {"attributes": __hash2(["index"], {"index": index}), "id": id, "target": target, "type": type}))).$render || $mm('render')).call($y);
          }, TMP_20._s = this, TMP_20), $x).call($av, (($aw = __scope.REGEXP)['$[]'] || $mm('[]')).call($aw, "footnote_macro"))
        };
        if (($x = (($ax = (($ay = found)['$[]'] || $mm('[]')).call($ay, "macroish")), $ax !== false && $ax !== nil ? $ax : (($az = result)['$include?'] || $mm('include?')).call($az, "&lt;&lt;"))) !== false && $x !== nil) {
          result = ($x = (($ax = result).$gsub || $mm('gsub')), $x._p = (TMP_22 = function() {

            var m = nil, id = nil, reftext = nil, self = TMP_22._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t;
            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false));
            };
            if (($e = ($f = (($g = (($h = m)['$[]'] || $mm('[]')).call($h, 1))['$nil?'] || $mm('nil?')).call($g), ($f === nil || $f === false))) !== false && $e !== nil) {
              (($e = (($f = (($i = m)['$[]'] || $mm('[]')).call($i, 1)).$split || $mm('split')).call($f, (($j = __scope.REGEXP)['$[]'] || $mm('[]')).call($j, "csv_delimiter"), 2))._isArray ? $e : ($e = [$e])), id = ($e[0] == null ? nil : $e[0]), reftext = ($e[1] == null ? nil : $e[1]);
              id = (($e = id).$sub || $mm('sub')).call($e, (($k = __scope.REGEXP)['$[]'] || $mm('[]')).call($k, "dbl_quoted"), "\\2");
              if (($l = (($m = reftext)['$nil?'] || $mm('nil?')).call($m)) === false || $l === nil) {
                reftext = (($l = reftext).$sub || $mm('sub')).call($l, (($n = __scope.REGEXP)['$[]'] || $mm('[]')).call($n, "m_dbl_quoted"), "\\2")
              };
              } else {
              id = (($o = m)['$[]'] || $mm('[]')).call($o, 2);
              reftext = (function() { if (($p = ($q = (($r = (($s = m)['$[]'] || $mm('[]')).call($s, 3))['$empty?'] || $mm('empty?')).call($r), ($q === nil || $q === false))) !== false && $p !== nil) {
                return (($p = m)['$[]'] || $mm('[]')).call($p, 3)
                } else {
                return nil
              }; return nil; }).call(self);
            };
            return (($q = (($t = __scope.Inline).$new || $mm('new')).call($t, self, "anchor", reftext, __hash2(["type", "target"], {"type": "xref", "target": id}))).$render || $mm('render')).call($q);
          }, TMP_22._s = this, TMP_22), $x).call($ax, (($ba = __scope.REGEXP)['$[]'] || $mm('[]')).call($ba, "xref_macro"))
        };
        if (($x = ($bb = (($bb = found)['$[]'] || $mm('[]')).call($bb, "square_bracket"), $bb !== false && $bb !== nil ? (($bc = result)['$include?'] || $mm('include?')).call($bc, "[[[") : $bb)) !== false && $x !== nil) {
          result = ($x = (($bd = result).$gsub || $mm('gsub')), $x._p = (TMP_23 = function() {

            var m = nil, id = nil, reftext = nil, self = TMP_23._s || this, $a, $b, $c, $d, $e, $f, $g;
            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false));
            };
            id = reftext = (($e = m)['$[]'] || $mm('[]')).call($e, 1);
            return (($f = (($g = __scope.Inline).$new || $mm('new')).call($g, self, "anchor", reftext, __hash2(["type", "target"], {"type": "bibref", "target": id}))).$render || $mm('render')).call($f);
          }, TMP_23._s = this, TMP_23), $x).call($bd, (($be = __scope.REGEXP)['$[]'] || $mm('[]')).call($be, "biblio_macro"))
        };
        if (($x = ($bf = (($bf = found)['$[]'] || $mm('[]')).call($bf, "square_bracket"), $bf !== false && $bf !== nil ? (($bg = result)['$include?'] || $mm('include?')).call($bg, "[[") : $bf)) !== false && $x !== nil) {
          result = ($x = (($bh = result).$gsub || $mm('gsub')), $x._p = (TMP_24 = function() {

            var m = nil, id = nil, reftext = nil, self = TMP_24._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, TMP_25, $m, $n, $o;
            
            m = __gvars["~"];
            if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
              return (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false));
            };
            (($e = (($f = (($g = m)['$[]'] || $mm('[]')).call($g, 1)).$split || $mm('split')).call($f, (($h = __scope.REGEXP)['$[]'] || $mm('[]')).call($h, "csv_delimiter")))._isArray ? $e : ($e = [$e])), id = ($e[0] == null ? nil : $e[0]), reftext = ($e[1] == null ? nil : $e[1]);
            id = (($e = id).$sub || $mm('sub')).call($e, (($i = __scope.REGEXP)['$[]'] || $mm('[]')).call($i, "dbl_quoted"), "\\2");
            if (($j = (($k = reftext)['$nil?'] || $mm('nil?')).call($k)) !== false && $j !== nil) {
              reftext = "[" + (id) + "]"
              } else {
              reftext = (($j = reftext).$sub || $mm('sub')).call($j, (($l = __scope.REGEXP)['$[]'] || $mm('[]')).call($l, "m_dbl_quoted"), "\\2")
            };
            ($m = (($n = __scope.Debug).$debug || $mm('debug')), $m._p = (TMP_25 = function() {

              var self = TMP_25._s || this, $a, $b, $c, $d;
              if (self.document == null) self.document = nil;

              
              if (($a = (($b = (($c = (($d = self.document).$references || $mm('references')).call($d))['$[]'] || $mm('[]')).call($c, "ids"))['$has_key?'] || $mm('has_key?')).call($b, id)) !== false && $a !== nil) {
                return nil
                } else {
                return "Missing reference for anchor '" + (id) + "'"
              }
            }, TMP_25._s = self, TMP_25), $m).call($n);
            return (($m = (($o = __scope.Inline).$new || $mm('new')).call($o, self, "anchor", reftext, __hash2(["type", "target"], {"type": "ref", "target": id}))).$render || $mm('render')).call($m);
          }, TMP_24._s = this, TMP_24), $x).call($bh, (($bi = __scope.REGEXP)['$[]'] || $mm('[]')).call($bi, "anchor_macro"))
        };
        return result;
      };

      def.$sub_callouts = function(text) {
        var TMP_26, $a, $b, $c;
        return ($a = (($b = text).$gsub || $mm('gsub')), $a._p = (TMP_26 = function() {

          var m = nil, self = TMP_26._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i;
          
          m = __gvars["~"];
          if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
            return "&lt;" + ((($a = m)['$[]'] || $mm('[]')).call($a, 1)) + "&gt;";
          };
          return (($d = (($e = __scope.Inline).$new || $mm('new')).call($e, self, "callout", (($f = m)['$[]'] || $mm('[]')).call($f, 1), __hash2(["id"], {"id": (($g = (($h = (($i = self).$document || $mm('document')).call($i)).$callouts || $mm('callouts')).call($h)).$read_next_id || $mm('read_next_id')).call($g)}))).$render || $mm('render')).call($d);
        }, TMP_26._s = this, TMP_26), $a).call($b, (($c = __scope.REGEXP)['$[]'] || $mm('[]')).call($c, "callout_render"));
      };

      def.$sub_post_replacements = function(text) {
        var lines = nil, last = nil, $a, $b, $c, $d, $e, $f, $g, $h, TMP_27, $i, $j, TMP_28;
        if (this.document == null) this.document = nil;

        if (($a = (($b = this.document)['$attr?'] || $mm('attr?')).call($b, "hardbreaks")) !== false && $a !== nil) {
          lines = (($a = (($c = text).$lines || $mm('lines')).call($c)).$entries || $mm('entries')).call($a);
          if ((($d = (($e = lines).$size || $mm('size')).call($e))['$=='] || $mm('==')).call($d, 1)) {
            return text
          };
          last = (($f = lines).$pop || $mm('pop')).call($f);
          return "" + (($g = ($i = (($j = lines).$map || $mm('map')), $i._p = (TMP_27 = function(line) {

            var self = TMP_27._s || this, $a, $b, $c, $d;
            if (line == null) line = nil;

            return (($a = (($b = __scope.Inline).$new || $mm('new')).call($b, self, "break", (($c = (($d = line).$rstrip || $mm('rstrip')).call($d)).$chomp || $mm('chomp')).call($c, __scope.LINE_BREAK), __hash2(["type"], {"type": "line"}))).$render || $mm('render')).call($a)
          }, TMP_27._s = this, TMP_27), $i).call($j), $h = "\n", typeof($g) === 'number' ? $g * $h : $g['$*']($h))) + "\n" + (last);
          } else {
          return ($g = (($h = text).$gsub || $mm('gsub')), $g._p = (TMP_28 = function() {

            var self = TMP_28._s || this, $a, $b, $c;
            
            return (($a = (($b = __scope.Inline).$new || $mm('new')).call($b, self, "break", (($c = __gvars["~"])['$[]'] || $mm('[]')).call($c, 1), __hash2(["type"], {"type": "line"}))).$render || $mm('render')).call($a)
          }, TMP_28._s = this, TMP_28), $g).call($h, (($i = __scope.REGEXP)['$[]'] || $mm('[]')).call($i, "line_break"))
        };
      };

      def.$transform_quoted_text = function(match, type, scope) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p;
        if (($a = (($b = (($c = match)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
          return (($a = (($d = match)['$[]'] || $mm('[]')).call($d, 0))['$[]'] || $mm('[]')).call($a, __range(1, -1, false))
          } else {
          if ((($e = scope)['$=='] || $mm('==')).call($e, "constrained")) {
            return "" + ((($f = match)['$[]'] || $mm('[]')).call($f, 1)) + ((($g = (($h = __scope.Inline).$new || $mm('new')).call($h, this, "quoted", (($i = match)['$[]'] || $mm('[]')).call($i, 3), __hash2(["type", "attributes"], {"type": type, "attributes": (($j = this).$parse_attributes || $mm('parse_attributes')).call($j, (($k = match)['$[]'] || $mm('[]')).call($k, 2))}))).$render || $mm('render')).call($g))
            } else {
            return (($l = (($m = __scope.Inline).$new || $mm('new')).call($m, this, "quoted", (($n = match)['$[]'] || $mm('[]')).call($n, 2), __hash2(["type", "attributes"], {"type": type, "attributes": (($o = this).$parse_attributes || $mm('parse_attributes')).call($o, (($p = match)['$[]'] || $mm('[]')).call($p, 1))}))).$render || $mm('render')).call($l)
          }
        };
      };

      def.$parse_attributes = function(attrline, posattrs, opts) {
        var block = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m;
        if (this.document == null) this.document = nil;
if (posattrs == null) {
          posattrs = ["role"]
        }if (opts == null) {
          opts = __hash2([], {})
        }
        if (($a = (($b = attrline)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          return nil
        };
        if (($a = (($c = attrline)['$empty?'] || $mm('empty?')).call($c)) !== false && $a !== nil) {
          return __hash2([], {})
        };
        if (($a = (($d = opts)['$[]'] || $mm('[]')).call($d, "sub_input")) !== false && $a !== nil) {
          attrline = (($a = this.document).$sub_attributes || $mm('sub_attributes')).call($a, attrline)
        };
        if (($e = (($f = opts)['$[]'] || $mm('[]')).call($f, "unescape_input")) !== false && $e !== nil) {
          attrline = (($e = this).$unescape_bracketed_text || $mm('unescape_bracketed_text')).call($e, attrline)
        };
        block = nil;
        if (($g = (($h = opts).$fetch || $mm('fetch')).call($h, "sub_result", true)) !== false && $g !== nil) {
          block = this
        };
        if (($g = (($i = opts)['$has_key?'] || $mm('has_key?')).call($i, "into")) !== false && $g !== nil) {
          return (($g = (($j = __scope.AttributeList).$new || $mm('new')).call($j, attrline, block)).$parse_into || $mm('parse_into')).call($g, (($k = opts)['$[]'] || $mm('[]')).call($k, "into"), posattrs)
          } else {
          return (($l = (($m = __scope.AttributeList).$new || $mm('new')).call($m, attrline, block)).$parse || $mm('parse')).call($l, posattrs)
        };
      };

      def.$unescape_bracketed_text = function(text) {
        var $a, $b, $c, $d;
        if (($a = (($b = text)['$empty?'] || $mm('empty?')).call($b)) !== false && $a !== nil) {
          return ""
        };
        return (($a = (($c = (($d = text).$strip || $mm('strip')).call($d)).$tr || $mm('tr')).call($c, "\n", " ")).$gsub || $mm('gsub')).call($a, "]", "]");
      };

      def.$resolve_subs = function(subs) {
        var candidates = nil, resolved = nil, invalid = nil, TMP_29, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
        candidates = ($a = (($b = (($c = subs).$split || $mm('split')).call($c, ",")).$map || $mm('map')), $a._p = (TMP_29 = function(sub) {

          var self = TMP_29._s || this, $a, $b;
          if (sub == null) sub = nil;

          return (($a = (($b = sub).$strip || $mm('strip')).call($b)).$to_sym || $mm('to_sym')).call($a)
        }, TMP_29._s = this, TMP_29), $a).call($b);
        resolved = (($a = candidates)['$&'] || $mm('&')).call($a, __scope.SUB_OPTIONS);
        if ((($d = (($e = (invalid = ($f = candidates, $g = resolved, typeof($f) === 'number' ? $f - $g : $f['$-']($g)))).$size || $mm('size')).call($e))['$>'] || $mm('>')).call($d, 0)) {
          (($f = this).$puts || $mm('puts')).call($f, "asciidoctor: WARNING: invalid passthrough macro substitution operation" + ((function() { if ((($g = (($h = invalid).$size || $mm('size')).call($h))['$>'] || $mm('>')).call($g, 1)) {
            return "s"
            } else {
            return ""
          }; return nil; }).call(this)) + ": " + (($i = invalid, $j = ", ", typeof($i) === 'number' ? $i * $j : $i['$*']($j))))
        };
        return resolved;
      };

      def.$highlight_source = function(source) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m;
        if (this.document == null) this.document = nil;

        (($a = __scope.Helpers).$require_library || $mm('require_library')).call($a, "coderay");
        return (($b = (($c = (($d = (__opal.Object._scope.CodeRay)._scope.Duo)['$[]'] || $mm('[]')).call($d, (($e = (($f = this).$attr || $mm('attr')).call($f, "language", "text")).$to_sym || $mm('to_sym')).call($e), "html", __hash2(["css", "line_numbers", "line_number_anchors"], {"css": (($g = (($h = (($i = this.document).$attributes || $mm('attributes')).call($i)).$fetch || $mm('fetch')).call($h, "coderay-css", "class")).$to_sym || $mm('to_sym')).call($g), "line_numbers": (function() { if (($j = (($k = this)['$attr?'] || $mm('attr?')).call($k, "linenums")) !== false && $j !== nil) {
          return (($j = (($l = (($m = this.document).$attributes || $mm('attributes')).call($m)).$fetch || $mm('fetch')).call($l, "coderay-linenums-mode", "table")).$to_sym || $mm('to_sym')).call($j)
          } else {
          return nil
        }; return nil; }).call(this), "line_number_anchors": false}))).$highlight || $mm('highlight')).call($c, source)).$chomp || $mm('chomp')).call($b);
      };
            ;Substituters._donate(["$passthroughs", "$apply_subs", "$apply_normal_subs", "$apply_title_subs", "$apply_literal_subs", "$apply_header_subs", "$apply_para_subs", "$apply_passthrough_subs", "$extract_passthroughs", "$restore_passthroughs", "$sub_specialcharacters", "$sub_quotes", "$sub_replacements", "$sub_attributes", "$sub_macros", "$sub_callouts", "$sub_post_replacements", "$transform_quoted_text", "$parse_attributes", "$unescape_bracketed_text", "$resolve_subs", "$highlight_source"]);
    })(Asciidoctor)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __gvars = __opal.gvars;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base){
      function Helpers() {};
      Helpers = __module(__base, "Helpers", Helpers);
      var def = Helpers.prototype, __scope = Helpers._scope;

      Helpers._defs('$require_library', function(name) {
        var main_script = nil, main_script_path_segment = nil, $a, $b, $c, $d, $e, $f, TMP_1, $g, $h;
        if ((($a = (($b = (($c = __scope.Thread).$list || $mm('list')).call($c)).$size || $mm('size')).call($b))['$>'] || $mm('>')).call($a, 1)) {
          main_script = "" + (name) + ".rb";
          main_script_path_segment = "/" + (name) + ".rb";
          if (($d = ($e = (($f = ($g = (($h = __gvars["LOADED_FEATURES"]).$detect || $mm('detect')), $g._p = (TMP_1 = function(p) {

            var self = TMP_1._s || this, $a, $b, $c;
            if (p == null) p = nil;

            return (($a = (($b = p)['$=='] || $mm('==')).call($b, main_script)), $a !== false && $a !== nil ? $a : (($c = p)['$end_with?'] || $mm('end_with?')).call($c, main_script_path_segment))
          }, TMP_1._s = this, TMP_1), $g).call($h))['$nil?'] || $mm('nil?')).call($f), ($e === nil || $e === false))) !== false && $d !== nil) {
            return false
            } else {
            (($d = this).$warn || $mm('warn')).call($d, ($e = "WARN: asciidoctor is autoloading '" + (name) + "' in threaded environment. ", $g = "The use of an explicit require '" + (name) + "' statement is recommended.", typeof($e) === 'number' ? $e + $g : $e['$+']($g)))
          };
        };
        return ;
      });

      Helpers._defs('$encode_uri', function(str) {
        var TMP_2, $a, $b, $c;
        return ($a = (($b = str).$gsub || $mm('gsub')), $a._p = (TMP_2 = function() {

          var buf = nil, self = TMP_2._s || this, TMP_3, $a, $b;
          
          buf = "";
          ($a = (($b = __gvars["&"]).$each_byte || $mm('each_byte')), $a._p = (TMP_3 = function(c) {

            var self = TMP_3._s || this, $a, $b;
            if (c == null) c = nil;

            return (($a = buf)['$<<'] || $mm('<<')).call($a, (($b = self).$sprintf || $mm('sprintf')).call($b, "%%%02X", c))
          }, TMP_3._s = self, TMP_3), $a).call($b);
          return buf;
        }, TMP_2._s = this, TMP_2), $a).call($b, (($c = __scope.REGEXP)['$[]'] || $mm('[]')).call($c, "uri_encode_chars"))
      });
      
    })(Asciidoctor)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2, __range = __opal.range;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function AbstractNode() {};
      AbstractNode = __klass(__base, __super, "AbstractNode", AbstractNode);

      var def = AbstractNode.prototype, __scope = AbstractNode._scope, $a;
      def.parent = def.document = def.context = def.id = def.attributes = nil;

      (($a = AbstractNode).$include || $mm('include')).call($a, __scope.Substituters);

      def.$parent = function() {
        
        return this.parent
      }, nil;

      def.$document = function() {
        
        return this.document
      }, nil;

      def.$context = function() {
        
        return this.context
      }, nil;

      def.$id = function() {
        
        return this.id
      }, 
      def['$id='] = function(val) {
        
        return this.id = val
      }, nil;

      def.$attributes = function() {
        
        return this.attributes
      }, nil;

      def.$initialize = function(parent, context) {
        var $a, $b, $c, $d;
        this.parent = (function() { if (($a = ($b = (($c = context)['$=='] || $mm('==')).call($c, "document"), ($b === nil || $b === false))) !== false && $a !== nil) {
          return parent
          } else {
          return nil
        }; return nil; }).call(this);
        if (($a = ($b = (($d = parent)['$nil?'] || $mm('nil?')).call($d), ($b === nil || $b === false))) !== false && $a !== nil) {
          this.document = (function() { if (($a = (($b = parent)['$is_a?'] || $mm('is_a?')).call($b, __scope.Document)) !== false && $a !== nil) {
            return parent
            } else {
            return (($a = parent).$document || $mm('document')).call($a)
          }; return nil; }).call(this)
          } else {
          this.document = nil
        };
        this.context = context;
        this.attributes = __hash2([], {});
        return this.passthroughs = [];
      };

      def.$attr = function(name, default$, inherit) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k;if (default$ == null) {
          default$ = nil
        }if (inherit == null) {
          inherit = true
        }
        if (($a = (($b = name)['$is_a?'] || $mm('is_a?')).call($b, __scope.Symbol)) !== false && $a !== nil) {
          name = (($a = name).$to_s || $mm('to_s')).call($a)
        };
        if ((($c = this)['$=='] || $mm('==')).call($c, this.document)) {
          inherit = false
        };
        if (($d = ($e = inherit, ($e === nil || $e === false))) !== false && $d !== nil) {
          if (($d = (($e = default$)['$nil?'] || $mm('nil?')).call($e)) !== false && $d !== nil) {
            return (($d = this.attributes)['$[]'] || $mm('[]')).call($d, name)
            } else {
            return (($f = this.attributes).$fetch || $mm('fetch')).call($f, name, default$)
          }
          } else {
          if (($g = (($h = default$)['$nil?'] || $mm('nil?')).call($h)) !== false && $g !== nil) {
            return (($g = this.attributes).$fetch || $mm('fetch')).call($g, name, (($i = this.document).$attr || $mm('attr')).call($i, name))
            } else {
            return (($j = this.attributes).$fetch || $mm('fetch')).call($j, name, (($k = this.document).$attr || $mm('attr')).call($k, name, default$))
          }
        };
      };

      def['$attr?'] = function(name, expect, inherit) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o;if (expect == null) {
          expect = nil
        }if (inherit == null) {
          inherit = true
        }
        if (($a = (($b = name)['$is_a?'] || $mm('is_a?')).call($b, __scope.Symbol)) !== false && $a !== nil) {
          name = (($a = name).$to_s || $mm('to_s')).call($a)
        };
        if ((($c = this)['$=='] || $mm('==')).call($c, this.document)) {
          inherit = false
        };
        if (($d = (($e = expect)['$nil?'] || $mm('nil?')).call($e)) !== false && $d !== nil) {
          if (($d = (($f = this.attributes)['$has_key?'] || $mm('has_key?')).call($f, name)) !== false && $d !== nil) {
            return true
            } else {
            if (inherit !== false && inherit !== nil) {
              return (($d = (($g = this.document).$attributes || $mm('attributes')).call($g))['$has_key?'] || $mm('has_key?')).call($d, name)
              } else {
              return false
            }
          }
          } else {
          if (($h = (($i = this.attributes)['$has_key?'] || $mm('has_key?')).call($i, name)) !== false && $h !== nil) {
            return (($h = (($j = this.attributes)['$[]'] || $mm('[]')).call($j, name))['$=='] || $mm('==')).call($h, expect)
            } else {
            if (($k = (($l = inherit !== false && inherit !== nil) ? (($m = (($n = this.document).$attributes || $mm('attributes')).call($n))['$has_key?'] || $mm('has_key?')).call($m, name) : $l)) !== false && $k !== nil) {
              return (($k = (($l = (($o = this.document).$attributes || $mm('attributes')).call($o))['$[]'] || $mm('[]')).call($l, name))['$=='] || $mm('==')).call($k, expect)
              } else {
              return false
            }
          }
        };
      };

      def.$set_attr = function(key, val, overwrite) {
        var $a, $b, $c, $d, $e;if (overwrite == null) {
          overwrite = nil
        }
        if (($a = (($b = overwrite)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          (($a = this.attributes)['$[]='] || $mm('[]=')).call($a, key, val);
          return true;
          } else {
          if (($c = (($d = overwrite), $d !== false && $d !== nil ? $d : (($e = this.attributes)['$has_key?'] || $mm('has_key?')).call($e, key))) !== false && $c !== nil) {
            (($c = this.attributes)['$[]='] || $mm('[]=')).call($c, key, val);
            return true;
            } else {
            return false
          }
        };
      };

      def.$get_binding = function(template) {
        var $a;
        return (($a = this).$binding || $mm('binding')).call($a);
      };

      def.$update_attributes = function(attributes) {
        var $a;
        (($a = this.attributes).$update || $mm('update')).call($a, attributes);
        return nil;
      };

      def.$renderer = function() {
        var $a;
        return (($a = this.document).$renderer || $mm('renderer')).call($a);
      };

      def.$icon_uri = function(name) {
        var $a, $b, $c, $d, $e;
        if (($a = (($b = this)['$attr?'] || $mm('attr?')).call($b, "icon")) !== false && $a !== nil) {
          return (($a = this).$image_uri || $mm('image_uri')).call($a, (($c = this).$attr || $mm('attr')).call($c, "icon"), nil)
          } else {
          return (($d = this).$image_uri || $mm('image_uri')).call($d, "" + (name) + "." + ((($e = this.document).$attr || $mm('attr')).call($e, "icontype", "png")), "iconsdir")
        };
      };

      def.$media_uri = function(target, asset_dir_key) {
        var $a, $b, $c, $d, $e, $f, $g;if (asset_dir_key == null) {
          asset_dir_key = "imagesdir"
        }
        if (($a = ($b = (($b = target)['$include?'] || $mm('include?')).call($b, ":"), $b !== false && $b !== nil ? (($c = target).$match || $mm('match')).call($c, (($d = (__scope.Asciidoctor)._scope.REGEXP)['$[]'] || $mm('[]')).call($d, "uri_sniff")) : $b)) !== false && $a !== nil) {
          return target
          } else {
          if (($a = (($e = asset_dir_key !== false && asset_dir_key !== nil) ? (($f = this)['$attr?'] || $mm('attr?')).call($f, asset_dir_key) : $e)) !== false && $a !== nil) {
            return (($a = this).$normalize_web_path || $mm('normalize_web_path')).call($a, target, (($e = this.document).$attr || $mm('attr')).call($e, asset_dir_key))
            } else {
            return (($g = this).$normalize_web_path || $mm('normalize_web_path')).call($g, target)
          }
        };
      };

      def.$image_uri = function(target_image, asset_dir_key) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k;if (asset_dir_key == null) {
          asset_dir_key = "imagesdir"
        }
        if (($a = ($b = (($b = target_image)['$include?'] || $mm('include?')).call($b, ":"), $b !== false && $b !== nil ? (($c = target_image).$match || $mm('match')).call($c, (($d = (__scope.Asciidoctor)._scope.REGEXP)['$[]'] || $mm('[]')).call($d, "uri_sniff")) : $b)) !== false && $a !== nil) {
          return target_image
          } else {
          if (($a = (($e = (($f = (($g = this.document).$safe || $mm('safe')).call($g))['$<'] || $mm('<')).call($f, ((__scope.Asciidoctor)._scope.SafeMode)._scope.SECURE)) ? (($h = this.document)['$attr?'] || $mm('attr?')).call($h, "data-uri") : $e)) !== false && $a !== nil) {
            return (($a = this).$generate_data_uri || $mm('generate_data_uri')).call($a, target_image, asset_dir_key)
            } else {
            if (($e = (($i = asset_dir_key !== false && asset_dir_key !== nil) ? (($j = this)['$attr?'] || $mm('attr?')).call($j, asset_dir_key) : $i)) !== false && $e !== nil) {
              return (($e = this).$normalize_web_path || $mm('normalize_web_path')).call($e, target_image, (($i = this.document).$attr || $mm('attr')).call($i, asset_dir_key))
              } else {
              return (($k = this).$normalize_web_path || $mm('normalize_web_path')).call($k, target_image)
            }
          }
        };
      };

      def.$generate_data_uri = function(target_image, asset_dir_key) {
        var mimetype = nil, image_path = nil, bindata = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, TMP_1, $k, $l, $m;if (asset_dir_key == null) {
          asset_dir_key = nil
        }
        (($a = __scope.Helpers).$require_library || $mm('require_library')).call($a, "base64");
        mimetype = ($b = "image/", $c = (($d = (($e = __scope.File).$extname || $mm('extname')).call($e, target_image))['$[]'] || $mm('[]')).call($d, __range(1, -1, false)), typeof($b) === 'number' ? $b + $c : $b['$+']($c));
        if (asset_dir_key !== false && asset_dir_key !== nil) {
          image_path = (($b = this).$normalize_system_path || $mm('normalize_system_path')).call($b, target_image, (($c = this.document).$attr || $mm('attr')).call($c, asset_dir_key), nil, __hash2(["target_name"], {"target_name": "image"}))
          } else {
          image_path = (($f = this).$normalize_system_path || $mm('normalize_system_path')).call($f, target_image)
        };
        if (($g = ($h = (($i = __scope.File)['$readable?'] || $mm('readable?')).call($i, image_path), ($h === nil || $h === false))) !== false && $g !== nil) {
          (($g = this).$puts || $mm('puts')).call($g, "asciidoctor: WARNING: image to embed not found or not readable: " + (image_path));
          return "data:" + (mimetype) + ":base64,";
        };
        bindata = nil;
        if (($h = (($j = __scope.IO)['$respond_to?'] || $mm('respond_to?')).call($j, "binread")) !== false && $h !== nil) {
          bindata = (($h = __scope.IO).$binread || $mm('binread')).call($h, image_path)
          } else {
          bindata = ($k = (($l = __scope.File).$open || $mm('open')), $k._p = (TMP_1 = function(file) {

            var self = TMP_1._s || this, $a;
            if (file == null) file = nil;

            return (($a = file).$read || $mm('read')).call($a)
          }, TMP_1._s = this, TMP_1), $k).call($l, image_path, "rb")
        };
        return "data:" + (mimetype) + ";base64," + ((($k = (($m = __scope.Base64).$encode64 || $mm('encode64')).call($m, bindata)).$delete || $mm('delete')).call($k, "\n"));
      };

      def.$read_asset = function(path, warn_on_failure) {
        var $a, $b, $c, $d;if (warn_on_failure == null) {
          warn_on_failure = false
        }
        if (($a = (($b = __scope.File)['$readable?'] || $mm('readable?')).call($b, path)) !== false && $a !== nil) {
          return (($a = (($c = __scope.File).$read || $mm('read')).call($c, path)).$chomp || $mm('chomp')).call($a)
          } else {
          if (warn_on_failure !== false && warn_on_failure !== nil) {
            (($d = this).$puts || $mm('puts')).call($d, "asciidoctor: WARNING: file does not exist or cannot be read: " + (path))
          };
          return nil;
        };
      };

      def.$normalize_web_path = function(target, start) {
        var $a, $b;if (start == null) {
          start = nil
        }
        return (($a = (($b = __scope.PathResolver).$new || $mm('new')).call($b)).$web_path || $mm('web_path')).call($a, target, start);
      };

      def.$normalize_system_path = function(target, start, jail, opts) {
        var $a, $b, $c, $d, $e, $f, $g, $h;if (start == null) {
          start = nil
        }if (jail == null) {
          jail = nil
        }if (opts == null) {
          opts = __hash2([], {})
        }
        if (($a = (($b = start)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          start = (($a = this.document).$base_dir || $mm('base_dir')).call($a)
        };
        if (($c = ($d = (($d = jail)['$nil?'] || $mm('nil?')).call($d), $d !== false && $d !== nil ? (($e = (($f = this.document).$safe || $mm('safe')).call($f))['$>='] || $mm('>=')).call($e, (__scope.SafeMode)._scope.SAFE) : $d)) !== false && $c !== nil) {
          jail = (($c = this.document).$base_dir || $mm('base_dir')).call($c)
        };
        return (($g = (($h = __scope.PathResolver).$new || $mm('new')).call($h)).$system_path || $mm('system_path')).call($g, target, start, jail, opts);
      };

      def.$normalize_asset_path = function(asset_ref, asset_name, autocorrect) {
        var $a, $b;if (asset_name == null) {
          asset_name = "path"
        }if (autocorrect == null) {
          autocorrect = true
        }
        return (($a = this).$normalize_system_path || $mm('normalize_system_path')).call($a, asset_ref, (($b = this.document).$base_dir || $mm('base_dir')).call($b), nil, __hash2(["target_name", "recover"], {"target_name": asset_name, "recover": autocorrect}));
      };

      return nil;
    })(Asciidoctor, null)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function AbstractBlock() {};
      AbstractBlock = __klass(__base, __super, "AbstractBlock", AbstractBlock);

      var def = AbstractBlock.prototype, __scope = AbstractBlock._scope, super_TMP_1;
      def.blocks = def.level = def.title = def.subbed_title = def.caption = def.document = def.context = def.attributes = def.next_section_index = nil;

      def.$blocks = function() {
        
        return this.blocks
      }, nil;

      def.$level = function() {
        
        return this.level
      }, 
      def['$level='] = function(val) {
        
        return this.level = val
      }, nil;

      def['$title='] = function(val) {
        
        return this.title = val
      }, nil;

      super_TMP_1 = def.$initialize;
      def.$initialize = function(parent, context) {
        var $a, $b, $c, $d, $e;
        super_TMP_1.apply(this, [parent, context]);
        this.blocks = [];
        this.id = nil;
        this.title = nil;
        if ((($a = context)['$=='] || $mm('==')).call($a, "document")) {
          this.level = 0
          } else {
          if (($b = ($c = ($c = (($d = parent)['$nil?'] || $mm('nil?')).call($d), ($c === nil || $c === false)), $c !== false && $c !== nil ? ($c = (($e = this)['$is_a?'] || $mm('is_a?')).call($e, __scope.Section), ($c === nil || $c === false)) : $c)) !== false && $b !== nil) {
            this.level = (($b = parent).$level || $mm('level')).call($b)
            } else {
            this.level = nil
          }
        };
        return this.next_section_index = 0;
      };

      def['$title?'] = function() {
        var $a, $b, $c;
        return ($a = (($b = (($c = this.title).$to_s || $mm('to_s')).call($c))['$empty?'] || $mm('empty?')).call($b), ($a === nil || $a === false));
      };

      def.$title = function() {
        var $a, $b;
        if (($a = (($b = this["subbed_title"], $b != null && $b !== nil) ? 'instance-variable' : nil)) !== false && $a !== nil) {
          return this.subbed_title
          } else {
          if (($a = this.title) !== false && $a !== nil) {
            return this.subbed_title = (($a = this).$apply_title_subs || $mm('apply_title_subs')).call($a, this.title)
            } else {
            return this.title
          }
        };
      };

      def['$blocks?'] = function() {
        var $a, $b;
        return ($a = (($b = this.blocks)['$empty?'] || $mm('empty?')).call($b), ($a === nil || $a === false));
      };

      def['$[]'] = function(i) {
        var $a;
        return (($a = this.blocks)['$[]'] || $mm('[]')).call($a, i);
      };

      def['$<<'] = function(block) {
        var $a, $b, $c;
        if (($a = (($b = block)['$is_a?'] || $mm('is_a?')).call($b, __scope.Section)) !== false && $a !== nil) {
          (($a = this).$assign_index || $mm('assign_index')).call($a, block)
        };
        return (($c = this.blocks)['$<<'] || $mm('<<')).call($c, block);
      };

      def.$insert = function(i, block) {
        var $a;
        return (($a = this.blocks).$insert || $mm('insert')).call($a, i, block);
      };

      def.$delete_at = function(i) {
        var $a;
        return (($a = this.blocks).$delete_at || $mm('delete_at')).call($a, i);
      };

      def.$clear_blocks = function() {
        
        return this.blocks = [];
      };

      def.$size = function() {
        var $a;
        return (($a = this.blocks).$size || $mm('size')).call($a);
      };

      def.$sections = function() {
        var TMP_2, $a, $b;
        return ($a = (($b = this.blocks).$inject || $mm('inject')), $a._p = (TMP_2 = function(collector, block) {

          var self = TMP_2._s || this, $a, $b;
          if (collector == null) collector = nil;
if (block == null) block = nil;

          if (($a = (($b = block)['$is_a?'] || $mm('is_a?')).call($b, __scope.Section)) !== false && $a !== nil) {
            (($a = collector)['$<<'] || $mm('<<')).call($a, block)
          };
          return collector;
        }, TMP_2._s = this, TMP_2), $a).call($b, []);
      };

      def.$assign_caption = function(caption, key) {
        var caption_key = nil, caption_title = nil, caption_num = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m;if (caption == null) {
          caption = nil
        }if (key == null) {
          key = nil
        }
        if (($a = (($b = (($c = this)['$title?'] || $mm('title?')).call($c)), $b !== false && $b !== nil ? $b : (($d = this.caption)['$nil?'] || $mm('nil?')).call($d))) === false || $a === nil) {
          return nil
        };
        if (($a = (($b = caption)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          if (($a = (($e = this.document)['$attr?'] || $mm('attr?')).call($e, "caption")) !== false && $a !== nil) {
            this.caption = (($a = this.document).$attr || $mm('attr')).call($a, "caption")
            } else {
            if (($f = (($g = this)['$title?'] || $mm('title?')).call($g)) !== false && $f !== nil) {
              (($f = key), $f !== false && $f !== nil ? $f : key = (($h = this.context).$to_s || $mm('to_s')).call($h));
              caption_key = "" + (key) + "-caption";
              if (($f = (($i = (($j = this.document).$attributes || $mm('attributes')).call($j))['$has_key?'] || $mm('has_key?')).call($i, caption_key)) !== false && $f !== nil) {
                caption_title = (($f = (($k = this.document).$attributes || $mm('attributes')).call($k))['$[]'] || $mm('[]')).call($f, "" + (key) + "-caption");
                caption_num = (($l = this.document).$counter_increment || $mm('counter_increment')).call($l, "" + (key) + "-number", this);
                this.caption = (($m = this.attributes)['$[]='] || $mm('[]=')).call($m, "caption", "" + (caption_title) + " " + (caption_num) + ". ");
              };
              } else {
              this.caption = caption
            }
          }
          } else {
          this.caption = caption
        };
        return nil;
      };

      def.$assign_index = function(section) {
        var $a, $b;
        (($a = section)['$index='] || $mm('index=')).call($a, this.next_section_index);
        return this.next_section_index = (($b = this.next_section_index)['$+'] || $mm('+')).call($b, 1);
      };

      def.$reindex_sections = function() {
        var TMP_3, $a, $b;
        this.next_section_index = 0;
        return ($a = (($b = this.blocks).$each || $mm('each')), $a._p = (TMP_3 = function(block) {

          var self = TMP_3._s || this, $a, $b, $c;
          if (block == null) block = nil;

          if (($a = (($b = block)['$is_a?'] || $mm('is_a?')).call($b, __scope.Section)) !== false && $a !== nil) {
            (($a = self).$assign_index || $mm('assign_index')).call($a, block);
            return (($c = block).$reindex_sections || $mm('reindex_sections')).call($c);
            } else {
            return nil
          }
        }, TMP_3._s = this, TMP_3), $a).call($b);
      };

      return nil;
    })(Asciidoctor, __scope.AbstractNode)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function AttributeList() {};
      AttributeList = __klass(__base, __super, "AttributeList", AttributeList);

      var def = AttributeList.prototype, __scope = AttributeList._scope;
      def.attributes = def.scanner = def.quotes = def.delimiter = def.block = def.escape_char = nil;

      __scope.BOUNDARY_PATTERNS = __hash2(["\"", "'", ","], {"\"": /.*?[^\\](?=")/, "'": /.*?[^\\](?=')/, ",": /.*?(?=[ \t]*(,|$))/});

      __scope.UNESCAPE_PATTERNS = __hash2(["\\\"", "\\'"], {"\\\"": /\\"/, "\\'": /\\'/});

      __scope.SKIP_PATTERNS = __hash2(["blank", ","], {"blank": /[ \t]+/, ",": /[ \t]*(,|$)/});

      __scope.NAME_PATTERN = /[A-Za-z:_][A-Za-z:_\-\.]*/;

      __scope.CSV_SPLIT_PATTERN = /[ \t]*,[ \t]*/;

      def.$initialize = function(source, block, quotes, delimiter, escape_char) {
        var $a;if (block == null) {
          block = nil
        }if (quotes == null) {
          quotes = ["'", "\""]
        }if (delimiter == null) {
          delimiter = ","
        }if (escape_char == null) {
          escape_char = "\\"
        }
        this.scanner = (($a = __opal.Object._scope.StringScanner).$new || $mm('new')).call($a, source);
        this.block = block;
        this.quotes = quotes;
        this.escape_char = escape_char;
        this.delimiter = delimiter;
        return this.attributes = nil;
      };

      def.$parse_into = function(attributes, posattrs) {
        var $a, $b;if (posattrs == null) {
          posattrs = []
        }
        return (($a = attributes).$update || $mm('update')).call($a, (($b = this).$parse || $mm('parse')).call($b, posattrs));
      };

      def.$parse = function(posattrs) {
        var index = nil, $a, $b, $c, $d, $e, $f;if (posattrs == null) {
          posattrs = []
        }
        if (($a = (($b = this.attributes)['$nil?'] || $mm('nil?')).call($b)) === false || $a === nil) {
          return this.attributes
        };
        this.attributes = __hash2([], {});
        index = 0;
        while (($c = (($d = this).$parse_attribute || $mm('parse_attribute')).call($d, index, posattrs)) !== false && $c !== nil){if (($c = (($e = this.scanner)['$eos?'] || $mm('eos?')).call($e)) !== false && $c !== nil) {
          break;
        };
        (($c = this).$skip_delimiter || $mm('skip_delimiter')).call($c);
        index = (($f = index)['$+'] || $mm('+')).call($f, 1);};
        return this.attributes;
      };

      def.$rekey = function(posattrs) {
        var $a;
        return (($a = __scope.AttributeList).$rekey || $mm('rekey')).call($a, this.attributes, posattrs);
      };

      AttributeList._defs('$rekey', function(attributes, pos_attrs) {
        var TMP_1, $a, $b;
        ($a = (($b = pos_attrs).$each_with_index || $mm('each_with_index')), $a._p = (TMP_1 = function(key, index) {

          var pos = nil, val = nil, self = TMP_1._s || this, $a, $b, $c, $d;
          if (key == null) key = nil;
if (index == null) index = nil;

          if (($a = (($b = key)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
            return nil;
          };
          pos = ($a = index, $c = 1, typeof($a) === 'number' ? $a + $c : $a['$+']($c));
          if (($a = (($c = (val = (($d = attributes)['$[]'] || $mm('[]')).call($d, pos)))['$nil?'] || $mm('nil?')).call($c)) !== false && $a !== nil) {
            return nil
            } else {
            return (($a = attributes)['$[]='] || $mm('[]=')).call($a, key, val)
          };
        }, TMP_1._s = this, TMP_1), $a).call($b);
        return attributes;
      });

      def.$parse_attribute = function(index, pos_attrs) {
        var single_quoted_value = nil, first = nil, value = nil, name = nil, skipped = nil, c = nil, remainder = nil, resolved_name = nil, pos_name = nil, resolved_value = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, TMP_2, $ao, $ap, $aq, $ar;if (index == null) {
          index = 0
        }if (pos_attrs == null) {
          pos_attrs = []
        }
        single_quoted_value = false;
        (($a = this).$skip_blank || $mm('skip_blank')).call($a);
        first = (($b = this.scanner).$peek || $mm('peek')).call($b, 1);
        if (($c = (($d = this.quotes)['$include?'] || $mm('include?')).call($d, first)) !== false && $c !== nil) {
          value = nil;
          name = (($c = this).$parse_attribute_value || $mm('parse_attribute_value')).call($c, (($e = this.scanner).$get_byte || $mm('get_byte')).call($e));
          if ((($f = first)['$=='] || $mm('==')).call($f, "'")) {
            single_quoted_value = true
          };
          } else {
          name = (($g = this).$scan_name || $mm('scan_name')).call($g);
          skipped = 0;
          c = nil;
          if (($h = (($i = this.scanner)['$eos?'] || $mm('eos?')).call($i)) !== false && $h !== nil) {
            if (($h = (($j = name)['$nil?'] || $mm('nil?')).call($j)) !== false && $h !== nil) {
              return false
            }
            } else {
            skipped = (($h = (($k = this).$skip_blank || $mm('skip_blank')).call($k)), $h !== false && $h !== nil ? $h : 0);
            c = (($h = this.scanner).$get_byte || $mm('get_byte')).call($h);
          };
          if (($l = (($m = (($n = c)['$nil?'] || $mm('nil?')).call($n)), $m !== false && $m !== nil ? $m : (($o = c)['$=='] || $mm('==')).call($o, this.delimiter))) !== false && $l !== nil) {
            value = nil
            } else {
            if (($l = (($m = ($p = (($q = c)['$=='] || $mm('==')).call($q, "="), ($p === nil || $p === false))), $m !== false && $m !== nil ? $m : (($p = name)['$nil?'] || $mm('nil?')).call($p))) !== false && $l !== nil) {
              remainder = (($l = this).$scan_to_delimiter || $mm('scan_to_delimiter')).call($l);
              if (($m = (($r = name)['$nil?'] || $mm('nil?')).call($r)) !== false && $m !== nil) {
                name = ""
              };
              name = (($m = name)['$+'] || $mm('+')).call($m, ($s = ($u = " ", $v = skipped, typeof($u) === 'number' ? $u * $v : $u['$*']($v)), $t = c, typeof($s) === 'number' ? $s + $t : $s['$+']($t)));
              if (($s = (($t = remainder)['$nil?'] || $mm('nil?')).call($t)) === false || $s === nil) {
                name = (($s = name)['$+'] || $mm('+')).call($s, remainder)
              };
              value = nil;
              } else {
              (($u = this).$skip_blank || $mm('skip_blank')).call($u);
              if ((($v = (($w = this.scanner).$peek || $mm('peek')).call($w, 1))['$=='] || $mm('==')).call($v, this.delimiter)) {
                value = nil
                } else {
                c = (($x = this.scanner).$get_byte || $mm('get_byte')).call($x);
                if (($y = (($z = this.quotes)['$include?'] || $mm('include?')).call($z, c)) !== false && $y !== nil) {
                  value = (($y = this).$parse_attribute_value || $mm('parse_attribute_value')).call($y, c);
                  if ((($aa = c)['$=='] || $mm('==')).call($aa, "'")) {
                    single_quoted_value = true
                  };
                  } else {
                  if (($ab = ($ac = (($ad = c)['$nil?'] || $mm('nil?')).call($ad), ($ac === nil || $ac === false))) !== false && $ab !== nil) {
                    value = ($ab = c, $ac = (($ae = this).$scan_to_delimiter || $mm('scan_to_delimiter')).call($ae), typeof($ab) === 'number' ? $ab + $ac : $ab['$+']($ac))
                  }
                };
              };
            }
          };
        };
        if (($ab = (($ac = value)['$nil?'] || $mm('nil?')).call($ac)) !== false && $ab !== nil) {
          resolved_name = (function() { if (($ab = (($af = single_quoted_value !== false && single_quoted_value !== nil) ? ($ag = (($ah = this.block)['$nil?'] || $mm('nil?')).call($ah), ($ag === nil || $ag === false)) : $af)) !== false && $ab !== nil) {
            return (($ab = this.block).$apply_normal_subs || $mm('apply_normal_subs')).call($ab, name)
            } else {
            return name
          }; return nil; }).call(this);
          if (($af = ($ag = (($ai = (pos_name = (($aj = pos_attrs)['$[]'] || $mm('[]')).call($aj, index)))['$nil?'] || $mm('nil?')).call($ai), ($ag === nil || $ag === false))) !== false && $af !== nil) {
            (($af = this.attributes)['$[]='] || $mm('[]=')).call($af, pos_name, resolved_name)
          };
          (($ag = this.attributes)['$[]='] || $mm('[]=')).call($ag, ($ak = index, $al = 1, typeof($ak) === 'number' ? $ak + $al : $ak['$+']($al)), resolved_name);
          } else {
          resolved_value = value;
          if (($ak = (($al = (($am = name)['$=='] || $mm('==')).call($am, "options")), $al !== false && $al !== nil ? $al : (($an = name)['$=='] || $mm('==')).call($an, "opts"))) !== false && $ak !== nil) {
            name = "options";
            ($ak = (($al = (($ao = resolved_value).$split || $mm('split')).call($ao, __scope.CSV_SPLIT_PATTERN)).$each || $mm('each')), $ak._p = (TMP_2 = function(o) {

              var self = TMP_2._s || this, $a, $b, $c;
              if (self.attributes == null) self.attributes = nil;

              if (o == null) o = nil;

              return (($a = self.attributes)['$[]='] || $mm('[]=')).call($a, ($b = o, $c = "-option", typeof($b) === 'number' ? $b + $c : $b['$+']($c)), "")
            }, TMP_2._s = this, TMP_2), $ak).call($al);
            } else {
            if (($ak = (($ap = single_quoted_value !== false && single_quoted_value !== nil) ? ($aq = (($ar = this.block)['$nil?'] || $mm('nil?')).call($ar), ($aq === nil || $aq === false)) : $ap)) !== false && $ak !== nil) {
              resolved_value = (($ak = this.block).$apply_normal_subs || $mm('apply_normal_subs')).call($ak, value)
            }
          };
          (($ap = this.attributes)['$[]='] || $mm('[]=')).call($ap, name, resolved_value);
        };
        return true;
      };

      def.$parse_attribute_value = function(quote) {
        var value = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k;
        if ((($a = (($b = this.scanner).$peek || $mm('peek')).call($b, 1))['$=='] || $mm('==')).call($a, quote)) {
          (($c = this.scanner).$get_byte || $mm('get_byte')).call($c);
          return "";
        };
        value = (($d = this).$scan_to_quote || $mm('scan_to_quote')).call($d, quote);
        if (($e = (($f = value)['$nil?'] || $mm('nil?')).call($f)) !== false && $e !== nil) {
          return ($e = quote, $g = (($h = this).$scan_to_delimiter || $mm('scan_to_delimiter')).call($h), typeof($e) === 'number' ? $e + $g : $e['$+']($g))
          } else {
          (($e = this.scanner).$get_byte || $mm('get_byte')).call($e);
          return (($g = value).$gsub || $mm('gsub')).call($g, (($i = __scope.UNESCAPE_PATTERNS)['$[]'] || $mm('[]')).call($i, ($j = this.escape_char, $k = quote, typeof($j) === 'number' ? $j + $k : $j['$+']($k))), quote);
        };
      };

      def.$skip_blank = function() {
        var $a, $b;
        return (($a = this.scanner).$skip || $mm('skip')).call($a, (($b = __scope.SKIP_PATTERNS)['$[]'] || $mm('[]')).call($b, "blank"));
      };

      def.$skip_delimiter = function() {
        var $a, $b;
        return (($a = this.scanner).$skip || $mm('skip')).call($a, (($b = __scope.SKIP_PATTERNS)['$[]'] || $mm('[]')).call($b, this.delimiter));
      };

      def.$scan_name = function() {
        var $a;
        return (($a = this.scanner).$scan || $mm('scan')).call($a, __scope.NAME_PATTERN);
      };

      def.$scan_to_delimiter = function() {
        var $a, $b;
        return (($a = this.scanner).$scan || $mm('scan')).call($a, (($b = __scope.BOUNDARY_PATTERNS)['$[]'] || $mm('[]')).call($b, this.delimiter));
      };

      def.$scan_to_quote = function(quote) {
        var $a, $b;
        return (($a = this.scanner).$scan || $mm('scan')).call($a, (($b = __scope.BOUNDARY_PATTERNS)['$[]'] || $mm('[]')).call($b, quote));
      };

      return nil;
    })(Asciidoctor, null)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function Block() {};
      Block = __klass(__base, __super, "Block", Block);

      var def = Block.prototype, __scope = Block._scope, super_TMP_1, super_TMP_6;
      def.buffer = def.caption = def.document = def.attributes = def.context = def.blocks = nil;

      def.$blockname = def.$context;

      def.$buffer = function() {
        
        return this.buffer
      }, 
      def['$buffer='] = function(val) {
        
        return this.buffer = val
      }, nil;

      def.$caption = function() {
        
        return this.caption
      }, 
      def['$caption='] = function(val) {
        
        return this.caption = val
      }, nil;

      super_TMP_1 = def.$initialize;
      def.$initialize = function(parent, context, buffer) {
        if (buffer == null) {
          buffer = nil
        }
        super_TMP_1.apply(this, [parent, context]);
        this.buffer = buffer;
        return this.caption = nil;
      };

      def.$render = function() {
        var out = nil, TMP_2, $a, $b, $c, $d, $e, $f, $g;
        ($a = (($b = __scope.Debug).$debug || $mm('debug')), $a._p = (TMP_2 = function() {

          var self = TMP_2._s || this;
          if (self.context == null) self.context = nil;

          
          return "Now rendering " + (self.context) + " block for " + (self)
        }, TMP_2._s = this, TMP_2), $a).call($b);
        (($a = this.document).$playback_attributes || $mm('playback_attributes')).call($a, this.attributes);
        out = (($c = (($d = this).$renderer || $mm('renderer')).call($d)).$render || $mm('render')).call($c, "block_" + (this.context), this);
        if ((($e = this.context)['$=='] || $mm('==')).call($e, "colist")) {
          (($f = (($g = this.document).$callouts || $mm('callouts')).call($g)).$next_list || $mm('next_list')).call($f)
        };
        return out;
      };

      def.$content = function() {
        var $case = nil, $a, TMP_3, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, TMP_4, $r, $s, TMP_5, $t, $u, $v, $w, $x, $y;
        return (function() { $case = this.context;if ((($b = "preamble")['$==='] || $mm('===')).call($b, $case)) {
        return (($a = ($b = (($c = this.blocks).$map || $mm('map')), $b._p = (TMP_3 = function(b) {

          var self = TMP_3._s || this, $a;
          if (b == null) b = nil;

          return (($a = b).$render || $mm('render')).call($a)
        }, TMP_3._s = this, TMP_3), $b).call($c)).$join || $mm('join')).call($a)
        }
        else if ((($d = "ulist")['$==='] || $mm('===')).call($d, $case) || (($e = "olist")['$==='] || $mm('===')).call($e, $case) || (($f = "dlist")['$==='] || $mm('===')).call($f, $case) || (($g = "colist")['$==='] || $mm('===')).call($g, $case)) {
        return this.buffer
        }
        else if ((($i = "listing")['$==='] || $mm('===')).call($i, $case) || (($j = "literal")['$==='] || $mm('===')).call($j, $case)) {
        return (($h = this).$apply_literal_subs || $mm('apply_literal_subs')).call($h, this.buffer)
        }
        else if ((($l = "pass")['$==='] || $mm('===')).call($l, $case)) {
        return (($k = this).$apply_passthrough_subs || $mm('apply_passthrough_subs')).call($k, this.buffer)
        }
        else if ((($q = "admonition")['$==='] || $mm('===')).call($q, $case) || (($t = "example")['$==='] || $mm('===')).call($t, $case) || (($u = "sidebar")['$==='] || $mm('===')).call($u, $case) || (($v = "quote")['$==='] || $mm('===')).call($v, $case) || (($w = "verse")['$==='] || $mm('===')).call($w, $case) || (($x = "open")['$==='] || $mm('===')).call($x, $case)) {
        if (($m = ($n = (($o = this.buffer)['$nil?'] || $mm('nil?')).call($o), ($n === nil || $n === false))) !== false && $m !== nil) {
          return (($m = this).$apply_para_subs || $mm('apply_para_subs')).call($m, this.buffer)
          } else {
          if ((($n = this.context)['$=='] || $mm('==')).call($n, "verse")) {
            return ($p = ($r = (($s = this.blocks).$map || $mm('map')), $r._p = (TMP_4 = function(b) {

              var self = TMP_4._s || this, $a;
              if (b == null) b = nil;

              return (($a = b).$render || $mm('render')).call($a)
            }, TMP_4._s = this, TMP_4), $r).call($s), $q = "\n", typeof($p) === 'number' ? $p * $q : $p['$*']($q))
            } else {
            return (($p = ($q = (($r = this.blocks).$map || $mm('map')), $q._p = (TMP_5 = function(b) {

              var self = TMP_5._s || this, $a;
              if (b == null) b = nil;

              return (($a = b).$render || $mm('render')).call($a)
            }, TMP_5._s = this, TMP_5), $q).call($r)).$join || $mm('join')).call($p)
          }
        }
        }
        else {return (($y = this).$apply_para_subs || $mm('apply_para_subs')).call($y, this.buffer)} }).call(this);
      };

      super_TMP_6 = def.$to_s;
      def.$to_s = function() {
        var $a, $b, $c;
        return "" + ((($a = super_TMP_6.apply(this, __slice.call(arguments))).$to_s || $mm('to_s')).call($a)) + " - " + (this.context) + " [blocks:" + ((($b = (($c = this.blocks), $c !== false && $c !== nil ? $c : [])).$size || $mm('size')).call($b)) + "]";
      };

      return nil;
    })(Asciidoctor, __scope.AbstractBlock)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function Callouts() {};
      Callouts = __klass(__base, __super, "Callouts", Callouts);

      var def = Callouts.prototype, __scope = Callouts._scope;
      def.co_index = def.lists = def.list_index = nil;

      def.$initialize = function() {
        var $a;
        this.lists = [];
        this.list_index = 0;
        return (($a = this).$next_list || $mm('next_list')).call($a);
      };

      def.$register = function(li_ordinal) {
        var id = nil, $a, $b, $c, $d, $e;
        (($a = (($b = this).$current_list || $mm('current_list')).call($b))['$<<'] || $mm('<<')).call($a, __hash2(["ordinal", "id"], {"ordinal": (($c = li_ordinal).$to_i || $mm('to_i')).call($c), "id": id = (($d = this).$generate_next_callout_id || $mm('generate_next_callout_id')).call($d)}));
        this.co_index = (($e = this.co_index)['$+'] || $mm('+')).call($e, 1);
        return id;
      };

      def.$read_next_id = function() {
        var id = nil, list = nil, $a, $b, $c, $d, $e, $f, $g;
        id = nil;
        list = (($a = this).$current_list || $mm('current_list')).call($a);
        if ((($b = this.co_index)['$<='] || $mm('<=')).call($b, (($c = list).$size || $mm('size')).call($c))) {
          id = (($d = (($e = list)['$[]'] || $mm('[]')).call($e, ($f = this.co_index, $g = 1, typeof($f) === 'number' ? $f - $g : $f['$-']($g))))['$[]'] || $mm('[]')).call($d, "id")
        };
        this.co_index = (($f = this.co_index)['$+'] || $mm('+')).call($f, 1);
        return id;
      };

      def.$callout_ids = function(li_ordinal) {
        var $a, $b, TMP_1, $c, $d, $e;
        return ($a = ($c = (($d = (($e = this).$current_list || $mm('current_list')).call($e)).$inject || $mm('inject')), $c._p = (TMP_1 = function(collector, element) {

          var self = TMP_1._s || this, $a, $b, $c, $d;
          if (collector == null) collector = nil;
if (element == null) element = nil;

          if ((($a = (($b = element)['$[]'] || $mm('[]')).call($b, "ordinal"))['$=='] || $mm('==')).call($a, li_ordinal)) {
            (($c = collector)['$<<'] || $mm('<<')).call($c, (($d = element)['$[]'] || $mm('[]')).call($d, "id"))
          };
          return collector;
        }, TMP_1._s = this, TMP_1), $c).call($d, []), $b = " ", typeof($a) === 'number' ? $a * $b : $a['$*']($b));
      };

      def.$current_list = function() {
        var $a, $b, $c;
        return (($a = this.lists)['$[]'] || $mm('[]')).call($a, ($b = this.list_index, $c = 1, typeof($b) === 'number' ? $b - $c : $b['$-']($c)));
      };

      def.$next_list = function() {
        var $a, $b, $c, $d;
        this.list_index = (($a = this.list_index)['$+'] || $mm('+')).call($a, 1);
        if ((($b = (($c = this.lists).$size || $mm('size')).call($c))['$<'] || $mm('<')).call($b, this.list_index)) {
          (($d = this.lists)['$<<'] || $mm('<<')).call($d, [])
        };
        this.co_index = 1;
        return nil;
      };

      def.$rewind = function() {
        
        this.list_index = 1;
        this.co_index = 1;
        return nil;
      };

      def.$generate_next_callout_id = function() {
        var $a;
        return (($a = this).$generate_callout_id || $mm('generate_callout_id')).call($a, this.list_index, this.co_index);
      };

      def.$generate_callout_id = function(list_index, co_index) {
        
        return "CO" + (list_index) + "-" + (co_index);
      };

      return nil;
    })(Asciidoctor, null)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2, __range = __opal.range, __gvars = __opal.gvars;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function Footnote() {};
      Footnote = __klass(__base, __super, "Footnote", Footnote);

      var def = Footnote.prototype, __scope = Footnote._scope;
      def.index = def.id = def.text = nil;

      def.$index = function() {
        
        return this.index
      }, 
      def.$id = function() {
        
        return this.id
      }, 
      def.$text = function() {
        
        return this.text
      }, nil;

      def.$initialize = function(index, id, text) {
        
        this.index = index;
        this.id = id;
        return this.text = text;
      };

      return nil;
    })(Asciidoctor, null);

    (function(__base, __super){
      function AttributeEntry() {};
      AttributeEntry = __klass(__base, __super, "AttributeEntry", AttributeEntry);

      var def = AttributeEntry.prototype, __scope = AttributeEntry._scope;
      def.name = def.value = def.negate = nil;

      def.$name = function() {
        
        return this.name
      }, 
      def.$value = function() {
        
        return this.value
      }, 
      def.$negate = function() {
        
        return this.negate
      }, nil;

      def.$initialize = function(name, value, negate) {
        var $a, $b;if (negate == null) {
          negate = nil
        }
        this.name = name;
        this.value = value;
        return this.negate = (function() { if (($a = (($b = negate)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          return (($a = value)['$nil?'] || $mm('nil?')).call($a)
          } else {
          return false
        }; return nil; }).call(this);
      };

      def.$save_to = function(block_attributes) {
        var $a, $b, $c, $d, $e;
        ($a = "attribute_entries", $b = block_attributes, (($c = (($d = $b)['$[]'] || $mm('[]')).call($d, $a)), $c !== false && $c !== nil ? $c : (($e = $b)['$[]='] || $mm('[]=')).call($e, $a, [])));
        return (($a = (($b = block_attributes)['$[]'] || $mm('[]')).call($b, "attribute_entries"))['$<<'] || $mm('<<')).call($a, this);
      };

      return nil;
    })(Asciidoctor, null);

    (function(__base, __super){
      function Document() {};
      Document = __klass(__base, __super, "Document", Document);

      var def = Document.prototype, __scope = Document._scope, TMP_1, super_TMP_2, super_TMP_8;
      def.safe = def.references = def.counters = def.callouts = def.header = def.base_dir = def.parent_document = def.options = def.attributes = def.attribute_overrides = def.reader = def.blocks = def.id = def.original_attributes = def.renderer = nil;

      def.$safe = function() {
        
        return this.safe
      }, nil;

      def.$references = function() {
        
        return this.references
      }, nil;

      def.$counters = function() {
        
        return this.counters
      }, nil;

      def.$callouts = function() {
        
        return this.callouts
      }, nil;

      def.$header = function() {
        
        return this.header
      }, nil;

      def.$base_dir = function() {
        
        return this.base_dir
      }, nil;

      def.$parent_document = function() {
        
        return this.parent_document
      }, nil;

      super_TMP_2 = def.$initialize;
      def.$initialize = TMP_1 = function(data, options) {
        var safe_mode = nil, safe_mode_name = nil, now = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, TMP_3, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, $bd, $be, $bf, $bg, $bh, $bi, $bj, $bk, $bl, $bm, $bn, $bo, $bp, $bq, $br, $bs, $bt, $bu, $bv, $bw, $bx, $by, $bz, $ca, $cb, $cc, $cd, $ce, $cf, $cg, $ch, $ci, $cj, $ck, $cl, $cm, $cn, $co, $cp, $cq, $cr, TMP_4, $cs, $ct, $cu, $cv, $cw, $cx, $cy, $cz, $da, $db, $dc, $dd, $de, $df, $dg, $dh, $di, $dj, $dk, $dl, $dm, $dn, $do, $dp, $dq, $dr, $ds, $dt, $du, $dv, $dw, $dx, $dy, $dz, $ea, $eb, block;
        block = TMP_1._p || nil, TMP_1._p = null;
        if (data == null) {
          data = []
        }if (options == null) {
          options = __hash2([], {})
        }
        super_TMP_2.apply(this, [this, "document"]);
        this.renderer = nil;
        if (($a = (($b = options)['$[]'] || $mm('[]')).call($b, "parent")) !== false && $a !== nil) {
          this.parent_document = (($a = options).$delete || $mm('delete')).call($a, "parent");
          (($c = options)['$[]='] || $mm('[]=')).call($c, "attributes", (($d = this.parent_document).$attributes || $mm('attributes')).call($d));
          ($e = "base_dir", $f = options, (($g = (($h = $f)['$[]'] || $mm('[]')).call($h, $e)), $g !== false && $g !== nil ? $g : (($i = $f)['$[]='] || $mm('[]=')).call($i, $e, (($j = this.parent_document).$base_dir || $mm('base_dir')).call($j))));
          this.safe = (($e = this.parent_document).$safe || $mm('safe')).call($e);
          this.renderer = (($f = this.parent_document).$renderer || $mm('renderer')).call($f);
          } else {
          this.parent_document = nil;
          this.safe = nil;
        };
        this.header = nil;
        this.references = __hash2(["ids", "footnotes", "links", "images", "indexterms"], {"ids": __hash2([], {}), "footnotes": [], "links": [], "images": [], "indexterms": []});
        this.counters = __hash2([], {});
        this.callouts = (($g = __scope.Callouts).$new || $mm('new')).call($g);
        this.options = options;
        if (($k = ($l = (($l = this.safe)['$nil?'] || $mm('nil?')).call($l), $l !== false && $l !== nil ? ($m = safe_mode = (($n = this.options)['$[]'] || $mm('[]')).call($n, "safe"), ($m === nil || $m === false)) : $l)) !== false && $k !== nil) {
          this.safe = (__scope.SafeMode)._scope.SECURE
          } else {
          if (($k = (($m = safe_mode)['$is_a?'] || $mm('is_a?')).call($m, __scope.Fixnum)) !== false && $k !== nil) {
            this.safe = safe_mode
            } else {
            try {
              this.safe = (($k = (($o = __scope.SafeMode).$const_get || $mm('const_get')).call($o, (($p = (($q = safe_mode).$to_s || $mm('to_s')).call($q)).$upcase || $mm('upcase')).call($p))).$to_i || $mm('to_i')).call($k)
            } catch ($err) {
            if (true) {
              this.safe = (($r = (__scope.SafeMode)._scope.SECURE).$to_i || $mm('to_i')).call($r)}
            else { throw $err; }
            }
          }
        };
        (($s = this.options)['$[]='] || $mm('[]=')).call($s, "header_footer", (($t = this.options).$fetch || $mm('fetch')).call($t, "header_footer", false));
        (($u = this.attributes)['$[]='] || $mm('[]=')).call($u, "encoding", "UTF-8");
        (($v = this.attributes)['$[]='] || $mm('[]=')).call($v, "sectids", "");
        if (($w = (($x = this.options)['$[]'] || $mm('[]')).call($x, "header_footer")) === false || $w === nil) {
          (($w = this.attributes)['$[]='] || $mm('[]=')).call($w, "notitle", "")
        };
        (($y = this.attributes)['$[]='] || $mm('[]=')).call($y, "toc-placement", "auto");
        (($z = this.attributes)['$[]='] || $mm('[]=')).call($z, "stylesheet", "");
        (($aa = this.attributes)['$[]='] || $mm('[]=')).call($aa, "linkcss", "");
        (($ab = this.attributes)['$[]='] || $mm('[]=')).call($ab, "caution-caption", "Caution");
        (($ac = this.attributes)['$[]='] || $mm('[]=')).call($ac, "important-caption", "Important");
        (($ad = this.attributes)['$[]='] || $mm('[]=')).call($ad, "note-caption", "Note");
        (($ae = this.attributes)['$[]='] || $mm('[]=')).call($ae, "tip-caption", "Tip");
        (($af = this.attributes)['$[]='] || $mm('[]=')).call($af, "warning-caption", "Warning");
        (($ag = this.attributes)['$[]='] || $mm('[]=')).call($ag, "appendix-caption", "Appendix");
        (($ah = this.attributes)['$[]='] || $mm('[]=')).call($ah, "example-caption", "Example");
        (($ai = this.attributes)['$[]='] || $mm('[]=')).call($ai, "figure-caption", "Figure");
        (($aj = this.attributes)['$[]='] || $mm('[]=')).call($aj, "table-caption", "Table");
        (($ak = this.attributes)['$[]='] || $mm('[]=')).call($ak, "toc-title", "Table of Contents");
        this.attribute_overrides = (($al = (($am = options)['$[]'] || $mm('[]')).call($am, "attributes")), $al !== false && $al !== nil ? $al : __hash2([], {}));
        (($al = this.attribute_overrides)['$[]='] || $mm('[]=')).call($al, "asciidoctor", "");
        (($an = this.attribute_overrides)['$[]='] || $mm('[]=')).call($an, "asciidoctor-version", __scope.VERSION);
        safe_mode_name = (($ao = (($ap = ($aq = (($ar = (($as = __scope.SafeMode).$constants || $mm('constants')).call($as)).$detect || $mm('detect')), $aq._p = (TMP_3 = function(l) {

          var self = TMP_3._s || this, $a, $b;
          if (self.safe == null) self.safe = nil;

          if (l == null) l = nil;

          return (($a = (($b = __scope.SafeMode).$const_get || $mm('const_get')).call($b, l))['$=='] || $mm('==')).call($a, self.safe)
        }, TMP_3._s = this, TMP_3), $aq).call($ar)).$to_s || $mm('to_s')).call($ap)).$downcase || $mm('downcase')).call($ao);
        (($aq = this.attribute_overrides)['$[]='] || $mm('[]=')).call($aq, "safe-mode-name", safe_mode_name);
        (($at = this.attribute_overrides)['$[]='] || $mm('[]=')).call($at, "safe-mode-" + (safe_mode_name), "");
        (($au = this.attribute_overrides)['$[]='] || $mm('[]=')).call($au, "safe-mode-level", this.safe);
        (($av = this.attribute_overrides)['$[]='] || $mm('[]=')).call($av, "embedded", (function() { if (($aw = (($ax = this.options)['$[]'] || $mm('[]')).call($ax, "header_footer")) !== false && $aw !== nil) {
          return nil
          } else {
          return ""
        }; return nil; }).call(this));
        ($aw = "include-depth", $ay = this.attribute_overrides, (($az = (($ba = $ay)['$[]'] || $mm('[]')).call($ba, $aw)), $az !== false && $az !== nil ? $az : (($bb = $ay)['$[]='] || $mm('[]=')).call($bb, $aw, 10)));
        if (($aw = (($ay = (($az = options)['$[]'] || $mm('[]')).call($az, "base_dir"))['$nil?'] || $mm('nil?')).call($ay)) !== false && $aw !== nil) {
          if (($aw = (($bc = this.attribute_overrides)['$[]'] || $mm('[]')).call($bc, "docdir")) !== false && $aw !== nil) {
            this.base_dir = (($aw = this.attribute_overrides)['$[]='] || $mm('[]=')).call($aw, "docdir", (($bd = __scope.File).$expand_path || $mm('expand_path')).call($bd, (($be = this.attribute_overrides)['$[]'] || $mm('[]')).call($be, "docdir")))
            } else {
            this.base_dir = (($bf = this.attribute_overrides)['$[]='] || $mm('[]=')).call($bf, "docdir", (($bg = __scope.File).$expand_path || $mm('expand_path')).call($bg, (($bh = __scope.Dir).$pwd || $mm('pwd')).call($bh)))
          }
          } else {
          this.base_dir = (($bi = this.attribute_overrides)['$[]='] || $mm('[]=')).call($bi, "docdir", (($bj = __scope.File).$expand_path || $mm('expand_path')).call($bj, (($bk = options)['$[]'] || $mm('[]')).call($bk, "base_dir")))
        };
        if (($bl = (($bm = (($bn = this.options)['$[]'] || $mm('[]')).call($bn, "backend"))['$nil?'] || $mm('nil?')).call($bm)) === false || $bl === nil) {
          (($bl = this.attribute_overrides)['$[]='] || $mm('[]=')).call($bl, "backend", (($bo = this.options)['$[]'] || $mm('[]')).call($bo, "backend"))
        };
        if (($bp = (($bq = (($br = this.options)['$[]'] || $mm('[]')).call($br, "doctype"))['$nil?'] || $mm('nil?')).call($bq)) === false || $bp === nil) {
          (($bp = this.attribute_overrides)['$[]='] || $mm('[]=')).call($bp, "doctype", (($bs = this.options)['$[]'] || $mm('[]')).call($bs, "doctype"))
        };
        if ((($bt = this.safe)['$>='] || $mm('>=')).call($bt, (__scope.SafeMode)._scope.SERVER)) {
          ($bu = "copycss", $bv = this.attribute_overrides, (($bw = (($bx = $bv)['$[]'] || $mm('[]')).call($bx, $bu)), $bw !== false && $bw !== nil ? $bw : (($by = $bv)['$[]='] || $mm('[]=')).call($by, $bu, nil)));
          ($bu = "source-highlighter", $bv = this.attribute_overrides, (($bw = (($bz = $bv)['$[]'] || $mm('[]')).call($bz, $bu)), $bw !== false && $bw !== nil ? $bw : (($ca = $bv)['$[]='] || $mm('[]=')).call($ca, $bu, nil)));
          ($bu = "backend", $bv = this.attribute_overrides, (($bw = (($cb = $bv)['$[]'] || $mm('[]')).call($cb, $bu)), $bw !== false && $bw !== nil ? $bw : (($cc = $bv)['$[]='] || $mm('[]=')).call($cc, $bu, __scope.DEFAULT_BACKEND)));
          if (($bu = ($bv = (($bv = this.attribute_overrides)['$has_key?'] || $mm('has_key?')).call($bv, "docfile"), $bv !== false && $bv !== nil ? (($bw = this.parent_document)['$nil?'] || $mm('nil?')).call($bw) : $bv)) !== false && $bu !== nil) {
            (($bu = this.attribute_overrides)['$[]='] || $mm('[]=')).call($bu, "docfile", (($cd = (($ce = this.attribute_overrides)['$[]'] || $mm('[]')).call($ce, "docfile"))['$[]'] || $mm('[]')).call($cd, __range(($cf = (($ch = (($ci = this.attribute_overrides)['$[]'] || $mm('[]')).call($ci, "docdir")).$length || $mm('length')).call($ch), $cg = 1, typeof($cf) === 'number' ? $cf + $cg : $cf['$+']($cg)), -1, false)))
          };
          (($cf = this.attribute_overrides)['$[]='] || $mm('[]=')).call($cf, "docdir", "");
          if ((($cg = this.safe)['$>='] || $mm('>=')).call($cg, (__scope.SafeMode)._scope.SECURE)) {
            if (($cj = (($ck = (($cl = (($cm = this.attribute_overrides).$fetch || $mm('fetch')).call($cm, "linkcss", ""))['$nil?'] || $mm('nil?')).call($cl)), $ck !== false && $ck !== nil ? $ck : (($cn = this.attribute_overrides)['$has_key?'] || $mm('has_key?')).call($cn, "linkcss!"))) === false || $cj === nil) {
              (($cj = this.attribute_overrides)['$[]='] || $mm('[]=')).call($cj, "linkcss", "")
            };
            ($ck = "icons", $co = this.attribute_overrides, (($cp = (($cq = $co)['$[]'] || $mm('[]')).call($cq, $ck)), $cp !== false && $cp !== nil ? $cp : (($cr = $co)['$[]='] || $mm('[]=')).call($cr, $ck, nil)));
          };
        };
        ($ck = (($co = this.attribute_overrides).$delete_if || $mm('delete_if')), $ck._p = (TMP_4 = function(key, val) {

          var verdict = nil, self = TMP_4._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i;
          if (self.attributes == null) self.attributes = nil;

          if (key == null) key = nil;
if (val == null) val = nil;

          verdict = false;
          if (($a = (($b = val)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
            (($a = self.attributes).$delete || $mm('delete')).call($a, key)
            } else {
            if (($c = (($d = key)['$end_with?'] || $mm('end_with?')).call($d, "!")) !== false && $c !== nil) {
              (($c = self.attributes).$delete || $mm('delete')).call($c, (($e = key)['$[]'] || $mm('[]')).call($e, __range(0, -2, false)))
              } else {
              if (($f = ($g = (($g = val)['$is_a?'] || $mm('is_a?')).call($g, __scope.String), $g !== false && $g !== nil ? (($h = val)['$end_with?'] || $mm('end_with?')).call($h, "@") : $g)) !== false && $f !== nil) {
                val = (($f = val).$chop || $mm('chop')).call($f);
                verdict = true;
              };
              (($i = self.attributes)['$[]='] || $mm('[]=')).call($i, key, val);
            }
          };
          return verdict;
        }, TMP_4._s = this, TMP_4), $ck).call($co);
        ($ck = "backend", $cp = this.attributes, (($cs = (($ct = $cp)['$[]'] || $mm('[]')).call($ct, $ck)), $cs !== false && $cs !== nil ? $cs : (($cu = $cp)['$[]='] || $mm('[]=')).call($cu, $ck, __scope.DEFAULT_BACKEND)));
        ($ck = "doctype", $cp = this.attributes, (($cs = (($cv = $cp)['$[]'] || $mm('[]')).call($cv, $ck)), $cs !== false && $cs !== nil ? $cs : (($cw = $cp)['$[]='] || $mm('[]=')).call($cw, $ck, __scope.DEFAULT_DOCTYPE)));
        (($ck = this).$update_backend_attributes || $mm('update_backend_attributes')).call($ck);
        if (($cp = ($cs = (($cx = this.parent_document)['$nil?'] || $mm('nil?')).call($cx), ($cs === nil || $cs === false))) !== false && $cp !== nil) {
          this.reader = (($cp = __scope.Reader).$new || $mm('new')).call($cp, data)
          } else {
          this.reader = ($cy = (($cz = __scope.Reader).$new || $mm('new')), $cy._p = (($cs = block).$to_proc || $mm('to_proc')).call($cs), $cy).call($cz, data, this, true)
        };
        now = (($cy = __scope.Time).$new || $mm('new')).call($cy);
        ($da = "localdate", $db = this.attributes, (($dc = (($dd = $db)['$[]'] || $mm('[]')).call($dd, $da)), $dc !== false && $dc !== nil ? $dc : (($de = $db)['$[]='] || $mm('[]=')).call($de, $da, (($df = now).$strftime || $mm('strftime')).call($df, "%Y-%m-%d"))));
        ($da = "localtime", $db = this.attributes, (($dc = (($dg = $db)['$[]'] || $mm('[]')).call($dg, $da)), $dc !== false && $dc !== nil ? $dc : (($dh = $db)['$[]='] || $mm('[]=')).call($dh, $da, (($di = now).$strftime || $mm('strftime')).call($di, "%H:%M:%S %Z"))));
        ($da = "localdatetime", $db = this.attributes, (($dc = (($dj = $db)['$[]'] || $mm('[]')).call($dj, $da)), $dc !== false && $dc !== nil ? $dc : (($dk = $db)['$[]='] || $mm('[]=')).call($dk, $da, ($dl = [(($dn = this.attributes)['$[]'] || $mm('[]')).call($dn, "localdate"), (($do = this.attributes)['$[]'] || $mm('[]')).call($do, "localtime")], $dm = " ", typeof($dl) === 'number' ? $dl * $dm : $dl['$*']($dm)))));
        ($da = "docdate", $db = this.attributes, (($dc = (($dl = $db)['$[]'] || $mm('[]')).call($dl, $da)), $dc !== false && $dc !== nil ? $dc : (($dm = $db)['$[]='] || $mm('[]=')).call($dm, $da, (($dp = this.attributes)['$[]'] || $mm('[]')).call($dp, "localdate"))));
        ($da = "doctime", $db = this.attributes, (($dc = (($dq = $db)['$[]'] || $mm('[]')).call($dq, $da)), $dc !== false && $dc !== nil ? $dc : (($dr = $db)['$[]='] || $mm('[]=')).call($dr, $da, (($ds = this.attributes)['$[]'] || $mm('[]')).call($ds, "localtime"))));
        ($da = "docdatetime", $db = this.attributes, (($dc = (($dt = $db)['$[]'] || $mm('[]')).call($dt, $da)), $dc !== false && $dc !== nil ? $dc : (($du = $db)['$[]='] || $mm('[]=')).call($du, $da, (($dv = this.attributes)['$[]'] || $mm('[]')).call($dv, "localdatetime"))));
        ($da = "stylesdir", $db = this.attributes, (($dc = (($dw = $db)['$[]'] || $mm('[]')).call($dw, $da)), $dc !== false && $dc !== nil ? $dc : (($dx = $db)['$[]='] || $mm('[]=')).call($dx, $da, ".")));
        ($da = "iconsdir", $db = this.attributes, (($dc = (($dy = $db)['$[]'] || $mm('[]')).call($dy, $da)), $dc !== false && $dc !== nil ? $dc : (($dz = $db)['$[]='] || $mm('[]=')).call($dz, $da, (($ea = __scope.File).$join || $mm('join')).call($ea, (($eb = this.attributes).$fetch || $mm('fetch')).call($eb, "imagesdir", "./images"), "icons"))));
        (($da = __scope.Lexer).$parse || $mm('parse')).call($da, this.reader, this, __hash2(["header_only"], {"header_only": (($db = this.options).$fetch || $mm('fetch')).call($db, "parse_header_only", false)}));
        return (($dc = this.callouts).$rewind || $mm('rewind')).call($dc);
      };

      def.$counter = function(name, seed) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o;if (seed == null) {
          seed = nil
        }
        if (($a = ($b = (($c = this.counters)['$has_key?'] || $mm('has_key?')).call($c, name), ($b === nil || $b === false))) !== false && $a !== nil) {
          if (($a = (($b = seed)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
            seed = (($a = this).$nextval || $mm('nextval')).call($a, (function() { if (($d = (($e = this.attributes)['$has_key?'] || $mm('has_key?')).call($e, name)) !== false && $d !== nil) {
              return (($d = this.attributes)['$[]'] || $mm('[]')).call($d, name)
              } else {
              return 0
            }; return nil; }).call(this))
            } else {
            if ((($f = (($g = (($h = seed).$to_i || $mm('to_i')).call($h)).$to_s || $mm('to_s')).call($g))['$=='] || $mm('==')).call($f, seed)) {
              seed = (($i = seed).$to_i || $mm('to_i')).call($i)
            }
          };
          (($j = this.counters)['$[]='] || $mm('[]=')).call($j, name, seed);
          } else {
          (($k = this.counters)['$[]='] || $mm('[]=')).call($k, name, (($l = this).$nextval || $mm('nextval')).call($l, (($m = this.counters)['$[]'] || $mm('[]')).call($m, name)))
        };
        return (($n = this.attributes)['$[]='] || $mm('[]=')).call($n, name, (($o = this.counters)['$[]'] || $mm('[]')).call($o, name));
      };

      def.$counter_increment = function(counter_name, block) {
        var val = nil, $a, $b, $c, $d;
        val = (($a = this).$counter || $mm('counter')).call($a, counter_name);
        (($b = (($c = __scope.AttributeEntry).$new || $mm('new')).call($c, counter_name, val)).$save_to || $mm('save_to')).call($b, (($d = block).$attributes || $mm('attributes')).call($d));
        return val;
      };

      def.$nextval = function(current) {
        var intval = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
        if (($a = (($b = current)['$is_a?'] || $mm('is_a?')).call($b, __scope.Numeric)) !== false && $a !== nil) {
          return ($a = current, $c = 1, typeof($a) === 'number' ? $a + $c : $a['$+']($c))
          } else {
          intval = (($a = current).$to_i || $mm('to_i')).call($a);
          if (($c = ($d = (($e = (($f = intval).$to_s || $mm('to_s')).call($f))['$=='] || $mm('==')).call($e, (($g = current).$to_s || $mm('to_s')).call($g)), ($d === nil || $d === false))) !== false && $c !== nil) {
            return (($c = ($d = (($i = (($j = current)['$[]'] || $mm('[]')).call($j, 0)).$ord || $mm('ord')).call($i), $h = 1, typeof($d) === 'number' ? $d + $h : $d['$+']($h))).$chr || $mm('chr')).call($c)
            } else {
            return ($d = intval, $h = 1, typeof($d) === 'number' ? $d + $h : $d['$+']($h))
          };
        };
      };

      def.$register = function(type, value) {
        var $case = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p;
        return (function() { $case = type;if ((($h = "ids")['$==='] || $mm('===')).call($h, $case)) {
        if (($a = (($b = value)['$is_a?'] || $mm('is_a?')).call($b, __scope.Array)) !== false && $a !== nil) {
          return (($a = (($c = this.references)['$[]'] || $mm('[]')).call($c, "ids"))['$[]='] || $mm('[]=')).call($a, (($d = value)['$[]'] || $mm('[]')).call($d, 0), (($e = (($f = value)['$[]'] || $mm('[]')).call($f, 1)), $e !== false && $e !== nil ? $e : ($g = ($i = "[", $j = (($k = value)['$[]'] || $mm('[]')).call($k, 0), typeof($i) === 'number' ? $i + $j : $i['$+']($j)), $h = "]", typeof($g) === 'number' ? $g + $h : $g['$+']($h))))
          } else {
          return (($e = (($g = this.references)['$[]'] || $mm('[]')).call($g, "ids"))['$[]='] || $mm('[]=')).call($e, value, ($h = ($j = "[", $l = value, typeof($j) === 'number' ? $j + $l : $j['$+']($l)), $i = "]", typeof($h) === 'number' ? $h + $i : $h['$+']($i)))
        }
        }
        else if ((($l = "footnotes")['$==='] || $mm('===')).call($l, $case) || (($m = "indexterms")['$==='] || $mm('===')).call($m, $case)) {
        return (($i = (($j = this.references)['$[]'] || $mm('[]')).call($j, type))['$<<'] || $mm('<<')).call($i, value)
        }
        else {if (($n = (($o = this.options)['$[]'] || $mm('[]')).call($o, "catalog_assets")) !== false && $n !== nil) {
          return (($n = (($p = this.references)['$[]'] || $mm('[]')).call($p, type))['$<<'] || $mm('<<')).call($n, value)
          } else {
          return nil
        }} }).call(this);
      };

      def['$footnotes?'] = function() {
        var $a, $b, $c;
        return ($a = (($b = (($c = this.references)['$[]'] || $mm('[]')).call($c, "footnotes"))['$empty?'] || $mm('empty?')).call($b), ($a === nil || $a === false));
      };

      def.$footnotes = function() {
        var $a;
        return (($a = this.references)['$[]'] || $mm('[]')).call($a, "footnotes");
      };

      def['$nested?'] = function() {
        var $a, $b;
        return ($a = (($b = this.parent_document)['$nil?'] || $mm('nil?')).call($b), ($a === nil || $a === false));
      };

      def['$embedded?'] = function() {
        var $a;
        return (($a = this.attributes)['$has_key?'] || $mm('has_key?')).call($a, "embedded");
      };

      def.$source = function() {
        var $a, $b;
        if (($a = this.reader) !== false && $a !== nil) {
          return (($a = (($b = this.reader).$source || $mm('source')).call($b)).$join || $mm('join')).call($a)
          } else {
          return nil
        };
      };

      def.$source_lines = function() {
        var $a;
        if (($a = this.reader) !== false && $a !== nil) {
          return (($a = this.reader).$source || $mm('source')).call($a)
          } else {
          return nil
        };
      };

      def.$doctype = function() {
        var $a;
        return (($a = this.attributes)['$[]'] || $mm('[]')).call($a, "doctype");
      };

      def.$backend = function() {
        var $a;
        return (($a = this.attributes)['$[]'] || $mm('[]')).call($a, "backend");
      };

      def.$title = function() {
        var $a;
        return (($a = this.attributes)['$[]'] || $mm('[]')).call($a, "title");
      };

      def['$title='] = function(title) {
        var $a, $b;
        (($a = this.header), $a !== false && $a !== nil ? $a : this.header = (($b = __scope.Section).$new || $mm('new')).call($b, this));
        return (($a = this.header)['$title='] || $mm('title=')).call($a, title);
      };

      def.$doctitle = function() {
        var title = nil, sect = nil, $a, $b, $c, $d, $e, $f;
        if (($a = ($b = (($c = (title = (($d = this.attributes).$fetch || $mm('fetch')).call($d, "title", "")))['$empty?'] || $mm('empty?')).call($c), ($b === nil || $b === false))) !== false && $a !== nil) {
          return title
          } else {
          if (($a = ($b = ($b = (($e = (sect = (($f = this).$first_section || $mm('first_section')).call($f)))['$nil?'] || $mm('nil?')).call($e), ($b === nil || $b === false)), $b !== false && $b !== nil ? (($b = sect)['$title?'] || $mm('title?')).call($b) : $b)) !== false && $a !== nil) {
            return (($a = sect).$title || $mm('title')).call($a)
            } else {
            return nil
          }
        };
      };

      def.$name = def.$doctitle;

      def.$author = function() {
        var $a;
        return (($a = this.attributes)['$[]'] || $mm('[]')).call($a, "author");
      };

      def.$revdate = function() {
        var $a;
        return (($a = this.attributes)['$[]'] || $mm('[]')).call($a, "revdate");
      };

      def.$notitle = function() {
        var $a;
        return (($a = this.attributes)['$has_key?'] || $mm('has_key?')).call($a, "notitle");
      };

      def.$noheader = function() {
        var $a;
        return (($a = this.attributes)['$has_key?'] || $mm('has_key?')).call($a, "noheader");
      };

      def.$first_section = function() {
        var $a, $b, TMP_5, $c, $d;
        if (($a = (($b = this)['$has_header?'] || $mm('has_header?')).call($b)) !== false && $a !== nil) {
          return this.header
          } else {
          return ($a = (($c = (($d = this.blocks), $d !== false && $d !== nil ? $d : [])).$detect || $mm('detect')), $a._p = (TMP_5 = function(e) {

            var self = TMP_5._s || this, $a;
            if (e == null) e = nil;

            return (($a = e)['$is_a?'] || $mm('is_a?')).call($a, __scope.Section)
          }, TMP_5._s = this, TMP_5), $a).call($c)
        };
      };

      def['$has_header?'] = function() {
        var $a, $b;
        return ($a = (($b = this.header)['$nil?'] || $mm('nil?')).call($b), ($a === nil || $a === false));
      };

      def.$save_attributes = function() {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
        if (($a = ($b = (($b = this.id)['$nil?'] || $mm('nil?')).call($b), $b !== false && $b !== nil ? (($c = this.attributes)['$has_key?'] || $mm('has_key?')).call($c, "css-signature") : $b)) !== false && $a !== nil) {
          this.id = (($a = this.attributes)['$[]'] || $mm('[]')).call($a, "css-signature")
        };
        if (($d = (($e = this.attributes)['$has_key?'] || $mm('has_key?')).call($e, "toc2")) !== false && $d !== nil) {
          (($d = this.attributes)['$[]='] || $mm('[]=')).call($d, "toc", "");
          ($f = "toc-class", $g = this.attributes, (($h = (($i = $g)['$[]'] || $mm('[]')).call($i, $f)), $h !== false && $h !== nil ? $h : (($j = $g)['$[]='] || $mm('[]=')).call($j, $f, "toc2")));
        };
        return this.original_attributes = (($f = this.attributes).$dup || $mm('dup')).call($f);
      };

      def.$restore_attributes = function() {
        
        return this.attributes = this.original_attributes;
      };

      def.$clear_playback_attributes = function(attributes) {
        var $a;
        return (($a = attributes).$delete || $mm('delete')).call($a, "attribute_entries");
      };

      def.$playback_attributes = function(block_attributes) {
        var $a, $b, TMP_6, $c, $d;
        if (($a = (($b = block_attributes)['$has_key?'] || $mm('has_key?')).call($b, "attribute_entries")) !== false && $a !== nil) {
          return ($a = (($c = (($d = block_attributes)['$[]'] || $mm('[]')).call($d, "attribute_entries")).$each || $mm('each')), $a._p = (TMP_6 = function(entry) {

            var self = TMP_6._s || this, $a, $b, $c, $d, $e, $f;
            if (self.attributes == null) self.attributes = nil;

            if (entry == null) entry = nil;

            if (($a = (($b = entry).$negate || $mm('negate')).call($b)) !== false && $a !== nil) {
              return (($a = self.attributes).$delete || $mm('delete')).call($a, (($c = entry).$name || $mm('name')).call($c))
              } else {
              return (($d = self.attributes)['$[]='] || $mm('[]=')).call($d, (($e = entry).$name || $mm('name')).call($e), (($f = entry).$value || $mm('value')).call($f))
            }
          }, TMP_6._s = this, TMP_6), $a).call($c)
          } else {
          return nil
        };
      };

      def.$set_attribute = function(name, value) {
        var $a, $b, $c, $d, $e;
        if (($a = (($b = this)['$attribute_locked?'] || $mm('attribute_locked?')).call($b, name)) !== false && $a !== nil) {
          return false
          } else {
          (($a = this.attributes)['$[]='] || $mm('[]=')).call($a, name, (($c = this).$apply_attribute_value_subs || $mm('apply_attribute_value_subs')).call($c, value));
          if ((($d = name)['$=='] || $mm('==')).call($d, "backend")) {
            (($e = this).$update_backend_attributes || $mm('update_backend_attributes')).call($e)
          };
          return true;
        };
      };

      def.$delete_attribute = function(name) {
        var $a, $b;
        if (($a = (($b = this)['$attribute_locked?'] || $mm('attribute_locked?')).call($b, name)) !== false && $a !== nil) {
          return false
          } else {
          (($a = this.attributes).$delete || $mm('delete')).call($a, name);
          return true;
        };
      };

      def['$attribute_locked?'] = function(name) {
        var $a, $b, $c;
        return (($a = (($b = this.attribute_overrides)['$has_key?'] || $mm('has_key?')).call($b, name)), $a !== false && $a !== nil ? $a : (($c = this.attribute_overrides)['$has_key?'] || $mm('has_key?')).call($c, "" + (name) + "!"));
      };

      def.$apply_attribute_value_subs = function(value) {
        var m = nil, subs = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k;
        if (($a = (($b = value).$match || $mm('match')).call($b, (($c = __scope.REGEXP)['$[]'] || $mm('[]')).call($c, "pass_macro_basic"))) !== false && $a !== nil) {
          m = __gvars["~"];
          subs = [];
          if (($a = ($d = (($e = (($f = m)['$[]'] || $mm('[]')).call($f, 1))['$empty?'] || $mm('empty?')).call($e), ($d === nil || $d === false))) !== false && $a !== nil) {
            subs = (($a = this).$resolve_subs || $mm('resolve_subs')).call($a, (($d = m)['$[]'] || $mm('[]')).call($d, 1))
          };
          if (($g = ($h = (($i = subs)['$empty?'] || $mm('empty?')).call($i), ($h === nil || $h === false))) !== false && $g !== nil) {
            return (($g = this).$apply_subs || $mm('apply_subs')).call($g, (($h = m)['$[]'] || $mm('[]')).call($h, 2), subs)
            } else {
            return (($j = m)['$[]'] || $mm('[]')).call($j, 2)
          };
          } else {
          return (($k = this).$apply_header_subs || $mm('apply_header_subs')).call($k, value)
        };
      };

      def.$update_backend_attributes = function() {
        var backend = nil, basebackend = nil, page_width = nil, ext = nil, file_type = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t;
        backend = (($a = this.attributes)['$[]'] || $mm('[]')).call($a, "backend");
        if (($b = (($c = __scope.BACKEND_ALIASES)['$has_key?'] || $mm('has_key?')).call($c, backend)) !== false && $b !== nil) {
          backend = (($b = this.attributes)['$[]='] || $mm('[]=')).call($b, "backend", (($d = __scope.BACKEND_ALIASES)['$[]'] || $mm('[]')).call($d, backend))
        };
        basebackend = (($e = backend).$sub || $mm('sub')).call($e, /[[:digit:]]+$/, "");
        page_width = (($f = __scope.DEFAULT_PAGE_WIDTHS)['$[]'] || $mm('[]')).call($f, basebackend);
        if (page_width !== false && page_width !== nil) {
          (($g = this.attributes)['$[]='] || $mm('[]=')).call($g, "pagewidth", page_width)
          } else {
          (($h = this.attributes).$delete || $mm('delete')).call($h, "pagewidth")
        };
        (($i = this.attributes)['$[]='] || $mm('[]=')).call($i, "backend-" + (backend), "");
        (($j = this.attributes)['$[]='] || $mm('[]=')).call($j, "basebackend", basebackend);
        (($k = this.attributes)['$[]='] || $mm('[]=')).call($k, "basebackend-" + (basebackend), "");
        (($l = this.attributes)['$[]='] || $mm('[]=')).call($l, "" + (backend) + "-" + ((($m = this.attributes)['$[]'] || $mm('[]')).call($m, "doctype")), "");
        (($n = this.attributes)['$[]='] || $mm('[]=')).call($n, "" + (basebackend) + "-" + ((($o = this.attributes)['$[]'] || $mm('[]')).call($o, "doctype")), "");
        ext = (($p = (($q = __scope.DEFAULT_EXTENSIONS)['$[]'] || $mm('[]')).call($q, basebackend)), $p !== false && $p !== nil ? $p : ".html");
        (($p = this.attributes)['$[]='] || $mm('[]=')).call($p, "outfilesuffix", ext);
        file_type = (($r = ext)['$[]'] || $mm('[]')).call($r, __range(1, -1, false));
        (($s = this.attributes)['$[]='] || $mm('[]=')).call($s, "filetype", file_type);
        return (($t = this.attributes)['$[]='] || $mm('[]=')).call($t, "filetype-" + (file_type), "");
      };

      def.$renderer = function(opts) {
        var render_options = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m;if (opts == null) {
          opts = __hash2([], {})
        }
        if (($a = this.renderer) !== false && $a !== nil) {
          return this.renderer
        };
        render_options = __hash2([], {});
        if (($a = (($b = this.options)['$has_key?'] || $mm('has_key?')).call($b, "template_dir")) !== false && $a !== nil) {
          (($a = render_options)['$[]='] || $mm('[]=')).call($a, "template_dir", (($c = this.options)['$[]'] || $mm('[]')).call($c, "template_dir"))
        };
        (($d = render_options)['$[]='] || $mm('[]=')).call($d, "backend", (($e = this.attributes).$fetch || $mm('fetch')).call($e, "backend", "html5"));
        (($f = render_options)['$[]='] || $mm('[]=')).call($f, "template_engine", (($g = this.options)['$[]'] || $mm('[]')).call($g, "template_engine"));
        (($h = render_options)['$[]='] || $mm('[]=')).call($h, "eruby", (($i = this.options).$fetch || $mm('fetch')).call($i, "eruby", "erb"));
        (($j = render_options)['$[]='] || $mm('[]=')).call($j, "compact", (($k = this.options).$fetch || $mm('fetch')).call($k, "compact", false));
        (($l = render_options)['$merge!'] || $mm('merge!')).call($l, opts);
        return this.renderer = (($m = __scope.Renderer).$new || $mm('new')).call($m, render_options);
      };

      def.$render = function(opts) {
        var r = nil, $a, $b, $c, $d, $e, $f, $g;if (opts == null) {
          opts = __hash2([], {})
        }
        (($a = this).$restore_attributes || $mm('restore_attributes')).call($a);
        r = (($b = this).$renderer || $mm('renderer')).call($b, opts);
        if (($c = (($d = (($e = this.options).$merge || $mm('merge')).call($e, opts))['$[]'] || $mm('[]')).call($d, "header_footer")) !== false && $c !== nil) {
          return (($c = (($f = r).$render || $mm('render')).call($f, "document", this)).$strip || $mm('strip')).call($c)
          } else {
          return (($g = r).$render || $mm('render')).call($g, "embedded", this)
        };
      };

      def.$content = function() {
        var $a, $b, TMP_7, $c, $d;
        (($a = this.attributes).$delete || $mm('delete')).call($a, "title");
        return (($b = ($c = (($d = this.blocks).$map || $mm('map')), $c._p = (TMP_7 = function(b) {

          var self = TMP_7._s || this, $a;
          if (b == null) b = nil;

          return (($a = b).$render || $mm('render')).call($a)
        }, TMP_7._s = this, TMP_7), $c).call($d)).$join || $mm('join')).call($b);
      };

      def.$docinfo = function(ext) {
        var $case = nil, content = nil, docinfo = nil, docinfo1 = nil, docinfo2 = nil, docinfo_filename = nil, docinfo_path = nil, content2 = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s;if (ext == null) {
          ext = nil
        }
        if ((($a = (($b = this).$safe || $mm('safe')).call($b))['$>='] || $mm('>=')).call($a, (__scope.SafeMode)._scope.SECURE)) {
          return ""
          } else {
          if (($c = (($d = ext)['$nil?'] || $mm('nil?')).call($d)) !== false && $c !== nil) {
            $case = (($c = this.attributes)['$[]'] || $mm('[]')).call($c, "basebackend");if ((($e = "docbook")['$==='] || $mm('===')).call($e, $case)) {
            ext = ".xml"
            }
            else if ((($f = "html")['$==='] || $mm('===')).call($f, $case)) {
            ext = ".html"
            }
          };
          content = nil;
          docinfo = (($g = this.attributes)['$has_key?'] || $mm('has_key?')).call($g, "docinfo");
          docinfo1 = (($h = this.attributes)['$has_key?'] || $mm('has_key?')).call($h, "docinfo1");
          docinfo2 = (($i = this.attributes)['$has_key?'] || $mm('has_key?')).call($i, "docinfo2");
          docinfo_filename = "docinfo" + (ext);
          if (($j = (($k = docinfo1), $k !== false && $k !== nil ? $k : docinfo2)) !== false && $j !== nil) {
            docinfo_path = (($j = this).$normalize_system_path || $mm('normalize_system_path')).call($j, docinfo_filename);
            content = (($k = this).$read_asset || $mm('read_asset')).call($k, docinfo_path);
          };
          if (($l = ($m = (($m = docinfo), $m !== false && $m !== nil ? $m : docinfo2), $m !== false && $m !== nil ? (($m = this.attributes)['$has_key?'] || $mm('has_key?')).call($m, "docname") : $m)) !== false && $l !== nil) {
            docinfo_path = (($l = this).$normalize_system_path || $mm('normalize_system_path')).call($l, "" + ((($n = this.attributes)['$[]'] || $mm('[]')).call($n, "docname")) + "-" + (docinfo_filename));
            content2 = (($o = this).$read_asset || $mm('read_asset')).call($o, docinfo_path);
            if (($p = (($q = content2)['$nil?'] || $mm('nil?')).call($q)) === false || $p === nil) {
              content = (function() { if (($p = (($r = content)['$nil?'] || $mm('nil?')).call($r)) !== false && $p !== nil) {
                return content2
                } else {
                return "" + (content) + "\n" + (content2)
              }; return nil; }).call(this)
            };
          };
          if (($p = (($s = content)['$nil?'] || $mm('nil?')).call($s)) !== false && $p !== nil) {
            return ""
            } else {
            return content
          };
        };
      };

      super_TMP_8 = def.$to_s;
      def.$to_s = function() {
        var $a, $b;
        return "" + ((($a = super_TMP_8.apply(this, __slice.call(arguments))).$to_s || $mm('to_s')).call($a)) + " - " + ((($b = this).$doctitle || $mm('doctitle')).call($b));
      };

      return nil;
    })(Asciidoctor, __scope.AbstractBlock);
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function Inline() {};
      Inline = __klass(__base, __super, "Inline", Inline);

      var def = Inline.prototype, __scope = Inline._scope, super_TMP_1;
      def.text = def.type = def.target = def.context = nil;

      def.$text = function() {
        
        return this.text
      }, nil;

      def.$type = function() {
        
        return this.type
      }, nil;

      def.$target = function() {
        
        return this.target
      }, 
      def['$target='] = function(val) {
        
        return this.target = val
      }, nil;

      super_TMP_1 = def.$initialize;
      def.$initialize = function(parent, context, text, opts) {
        var attributes = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i;if (text == null) {
          text = nil
        }if (opts == null) {
          opts = __hash2([], {})
        }
        super_TMP_1.apply(this, [parent, context]);
        this.text = text;
        this.id = (($a = opts)['$[]'] || $mm('[]')).call($a, "id");
        this.type = (($b = opts)['$[]'] || $mm('[]')).call($b, "type");
        this.target = (($c = opts)['$[]'] || $mm('[]')).call($c, "target");
        if (($d = ($e = (($e = opts)['$has_key?'] || $mm('has_key?')).call($e, "attributes"), $e !== false && $e !== nil ? (($f = (attributes = (($g = opts)['$[]'] || $mm('[]')).call($g, "attributes")))['$is_a?'] || $mm('is_a?')).call($f, __scope.Hash) : $e)) !== false && $d !== nil) {
          if (($d = (($h = attributes)['$empty?'] || $mm('empty?')).call($h)) !== false && $d !== nil) {
            return nil
            } else {
            return (($d = this).$update_attributes || $mm('update_attributes')).call($d, (($i = opts)['$[]'] || $mm('[]')).call($i, "attributes"))
          }
          } else {
          return nil
        };
      };

      def.$render = function() {
        var $a, $b, $c;
        return (($a = (($b = (($c = this).$renderer || $mm('renderer')).call($c)).$render || $mm('render')).call($b, "inline_" + (this.context), this)).$chomp || $mm('chomp')).call($a);
      };

      return nil;
    })(Asciidoctor, __scope.AbstractNode)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2, __range = __opal.range, __gvars = __opal.gvars;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function BlockMatchData() {};
      BlockMatchData = __klass(__base, __super, "BlockMatchData", BlockMatchData);

      var def = BlockMatchData.prototype, __scope = BlockMatchData._scope;
      def.context = def.masq = def.tip = def.terminator = nil;

      def.$context = function() {
        
        return this.context
      }, 
      def.$masq = function() {
        
        return this.masq
      }, 
      def.$tip = function() {
        
        return this.tip
      }, 
      def.$terminator = function() {
        
        return this.terminator
      }, nil;

      def.$initialize = function(context, masq, tip, terminator) {
        
        this.context = context;
        this.masq = masq;
        this.tip = tip;
        return this.terminator = terminator;
      };

      return nil;
    })(Asciidoctor, null);

    (function(__base, __super){
      function Lexer() {};
      Lexer = __klass(__base, __super, "Lexer", Lexer);

      var def = Lexer.prototype, __scope = Lexer._scope;

      def.$initialize = function() {
        var $a;
        return (($a = this).$raise || $mm('raise')).call($a, "Au contraire, mon frere. No lexer instances will be running around.");
      };

      Lexer._defs('$parse', function(reader, document, options) {
        var block_attributes = nil, new_section = nil, $a, $b, $c, $d, $e, $f, $g;if (options == null) {
          options = __hash2([], {})
        }
        block_attributes = (($a = this).$parse_document_header || $mm('parse_document_header')).call($a, reader, document);
        if (($b = (($c = options)['$[]'] || $mm('[]')).call($c, "header_only")) === false || $b === nil) {
          while (($d = (($e = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($e)) !== false && $d !== nil){(($d = (($f = this).$next_section || $mm('next_section')).call($f, reader, document, block_attributes))._isArray ? $d : ($d = [$d])), new_section = ($d[0] == null ? nil : $d[0]), block_attributes = ($d[1] == null ? nil : $d[1]);
          if (($d = (($g = new_section)['$nil?'] || $mm('nil?')).call($g)) === false || $d === nil) {
            (($d = document)['$<<'] || $mm('<<')).call($d, new_section)
          };}
        };
        return document;
      });

      Lexer._defs('$parse_document_header', function(reader, document) {
        var block_attributes = nil, parts = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t;
        block_attributes = (($a = this).$parse_block_metadata_lines || $mm('parse_block_metadata_lines')).call($a, reader, document);
        if (($b = (($c = this)['$is_next_line_document_title?'] || $mm('is_next_line_document_title?')).call($c, reader, block_attributes)) !== false && $b !== nil) {
          parts = (($b = this).$parse_section_title || $mm('parse_section_title')).call($b, reader, document);
          (($d = document)['$id='] || $mm('id=')).call($d, (($e = parts)['$[]'] || $mm('[]')).call($e, 0));
          (($f = document)['$title='] || $mm('title=')).call($f, (($g = parts)['$[]'] || $mm('[]')).call($g, 1));
          if (($h = ($i = (($i = (($j = document).$id || $mm('id')).call($j))['$nil?'] || $mm('nil?')).call($i), $i !== false && $i !== nil ? (($k = block_attributes)['$has_key?'] || $mm('has_key?')).call($k, "id") : $i)) !== false && $h !== nil) {
            (($h = document)['$id='] || $mm('id=')).call($h, (($l = block_attributes).$delete || $mm('delete')).call($l, "id"))
          };
          (($m = this).$parse_header_metadata || $mm('parse_header_metadata')).call($m, reader, document);
        };
        if (($n = (($o = (($p = document).$attributes || $mm('attributes')).call($p))['$has_key?'] || $mm('has_key?')).call($o, "doctitle")) !== false && $n !== nil) {
          (($n = document)['$title='] || $mm('title=')).call($n, (($q = (($r = document).$attributes || $mm('attributes')).call($r))['$[]'] || $mm('[]')).call($q, "doctitle"))
        };
        (($s = document).$clear_playback_attributes || $mm('clear_playback_attributes')).call($s, block_attributes);
        (($t = document).$save_attributes || $mm('save_attributes')).call($t);
        return block_attributes;
      });

      Lexer._defs('$next_section', function(reader, parent, attributes) {
        var preamble = nil, section = nil, current_level = nil, expected_next_levels = nil, next_level = nil, doctype = nil, new_section = nil, new_block = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, TMP_1, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, $bd;if (attributes == null) {
          attributes = __hash2([], {})
        }
        preamble = false;
        if (($a = ($b = ($b = (($b = parent)['$is_a?'] || $mm('is_a?')).call($b, __scope.Document), $b !== false && $b !== nil ? (($c = (($d = parent).$blocks || $mm('blocks')).call($d))['$empty?'] || $mm('empty?')).call($c) : $b), $b !== false && $b !== nil ? (($e = (($f = parent)['$has_header?'] || $mm('has_header?')).call($f)), $e !== false && $e !== nil ? $e : ($g = (($h = this)['$is_next_line_section?'] || $mm('is_next_line_section?')).call($h, reader, attributes), ($g === nil || $g === false))) : $b)) !== false && $a !== nil) {
          if (($a = (($e = parent)['$has_header?'] || $mm('has_header?')).call($e)) !== false && $a !== nil) {
            preamble = (($a = __scope.Block).$new || $mm('new')).call($a, parent, "preamble");
            (($g = parent)['$<<'] || $mm('<<')).call($g, preamble);
          };
          section = parent;
          current_level = 0;
          if (($i = (($j = (($k = parent).$attributes || $mm('attributes')).call($k))['$has_key?'] || $mm('has_key?')).call($j, "fragment")) !== false && $i !== nil) {
            expected_next_levels = nil
            } else {
            if ((($i = (($l = parent).$doctype || $mm('doctype')).call($l))['$=='] || $mm('==')).call($i, "book")) {
              expected_next_levels = [0, 1]
              } else {
              expected_next_levels = [1]
            }
          };
          } else {
          section = (($m = this).$initialize_section || $mm('initialize_section')).call($m, reader, parent, attributes);
          attributes = ($n = (($o = attributes).$delete_if || $mm('delete_if')), $n._p = (TMP_1 = function(k, v) {

            var self = TMP_1._s || this, $a, $b;
            if (k == null) k = nil;
if (v == null) v = nil;

            return ($a = (($b = k)['$=='] || $mm('==')).call($b, "title"), ($a === nil || $a === false))
          }, TMP_1._s = this, TMP_1), $n).call($o);
          current_level = (($n = section).$level || $mm('level')).call($n);
          if (($p = ($q = ($q = (($q = (($r = current_level)['$=='] || $mm('==')).call($r, 0)) ? (($s = section).$special || $mm('special')).call($s) : $q), $q !== false && $q !== nil ? (($q = (($t = (($u = section).$document || $mm('document')).call($u)).$doctype || $mm('doctype')).call($t))['$=='] || $mm('==')).call($q, "book") : $q), $q !== false && $q !== nil ? (($v = ["preface", "appendix"])['$include?'] || $mm('include?')).call($v, (($w = section).$sectname || $mm('sectname')).call($w)) : $q)) !== false && $p !== nil) {
            expected_next_levels = [($p = current_level, $x = 2, typeof($p) === 'number' ? $p + $x : $p['$+']($x))]
            } else {
            expected_next_levels = [($p = current_level, $x = 1, typeof($p) === 'number' ? $p + $x : $p['$+']($x))]
          };
        };
        (($p = reader).$skip_blank_lines || $mm('skip_blank_lines')).call($p);
        while (($y = (($z = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($z)) !== false && $y !== nil){(($y = this).$parse_block_metadata_lines || $mm('parse_block_metadata_lines')).call($y, reader, section, attributes);
        next_level = (($aa = this)['$is_next_line_section?'] || $mm('is_next_line_section?')).call($aa, reader, attributes);
        if (next_level !== false && next_level !== nil) {
          next_level = (($ab = next_level)['$+'] || $mm('+')).call($ab, (($ac = (($ad = (($ae = section).$document || $mm('document')).call($ae)).$attr || $mm('attr')).call($ad, "leveloffset", 0)).$to_i || $mm('to_i')).call($ac));
          doctype = (($af = (($ag = parent).$document || $mm('document')).call($ag)).$doctype || $mm('doctype')).call($af);
          if (($ah = (($ai = (($aj = next_level)['$=='] || $mm('==')).call($aj, 0)) ? ($ak = (($al = doctype)['$=='] || $mm('==')).call($al, "book"), ($ak === nil || $ak === false)) : $ai)) !== false && $ah !== nil) {
            (($ah = this).$puts || $mm('puts')).call($ah, "asciidoctor: ERROR: line " + (($ai = (($am = reader).$lineno || $mm('lineno')).call($am), $ak = 1, typeof($ai) === 'number' ? $ai + $ak : $ai['$+']($ak))) + ": only book doctypes can contain level 0 sections")
          };
          if (($ai = (($ak = (($an = next_level)['$>'] || $mm('>')).call($an, current_level)), $ak !== false && $ak !== nil ? $ak : ($ao = (($ao = section)['$is_a?'] || $mm('is_a?')).call($ao, __scope.Document), $ao !== false && $ao !== nil ? (($ap = next_level)['$=='] || $mm('==')).call($ap, 0) : $ao))) !== false && $ai !== nil) {
            if (($ai = (($ak = (($aq = expected_next_levels)['$nil?'] || $mm('nil?')).call($aq)), $ak !== false && $ak !== nil ? $ak : (($ar = expected_next_levels)['$include?'] || $mm('include?')).call($ar, next_level))) === false || $ai === nil) {
              (($ai = this).$puts || $mm('puts')).call($ai, ($ak = ($at = "asciidoctor: WARNING: line " + (($av = (($ax = reader).$lineno || $mm('lineno')).call($ax), $aw = 1, typeof($av) === 'number' ? $av + $aw : $av['$+']($aw))) + ": section title out of sequence: ", $au = "expected " + ((function() { if ((($av = (($aw = expected_next_levels).$size || $mm('size')).call($aw))['$>'] || $mm('>')).call($av, 1)) {
                return "levels"
                } else {
                return "level"
              }; return nil; }).call(this)) + " " + (($ay = expected_next_levels, $az = " or ", typeof($ay) === 'number' ? $ay * $az : $ay['$*']($az))) + ", ", typeof($at) === 'number' ? $at + $au : $at['$+']($au)), $as = "got level " + (next_level), typeof($ak) === 'number' ? $ak + $as : $ak['$+']($as)))
            };
            (($ak = (($as = this).$next_section || $mm('next_section')).call($as, reader, section, attributes))._isArray ? $ak : ($ak = [$ak])), new_section = ($ak[0] == null ? nil : $ak[0]), attributes = ($ak[1] == null ? nil : $ak[1]);
            (($ak = section)['$<<'] || $mm('<<')).call($ak, new_section);
            } else {
            break;
          };
          } else {
          new_block = (($at = this).$next_block || $mm('next_block')).call($at, reader, (($au = preamble), $au !== false && $au !== nil ? $au : section), attributes, __hash2(["parse_metadata"], {"parse_metadata": false}));
          if (($au = ($ay = (($az = new_block)['$nil?'] || $mm('nil?')).call($az), ($ay === nil || $ay === false))) !== false && $au !== nil) {
            (($au = (($ay = preamble), $ay !== false && $ay !== nil ? $ay : section))['$<<'] || $mm('<<')).call($au, new_block);
            attributes = __hash2([], {});
          };
        };
        (($ay = reader).$skip_blank_lines || $mm('skip_blank_lines')).call($ay);};
        if (($x = (($ba = preamble !== false && preamble !== nil) ? ($bb = (($bc = preamble)['$blocks?'] || $mm('blocks?')).call($bc), ($bb === nil || $bb === false)) : $ba)) !== false && $x !== nil) {
          (($x = section).$delete_at || $mm('delete_at')).call($x, 0)
        };
        return [(function() { if (($ba = ($bb = (($bd = section)['$=='] || $mm('==')).call($bd, parent), ($bb === nil || $bb === false))) !== false && $ba !== nil) {
          return section
          } else {
          return nil
        }; return nil; }).call(this), (($ba = attributes).$dup || $mm('dup')).call($ba)];
      });

      Lexer._defs('$next_block', function(reader, parent, attributes, options) {
        var skipped = nil, parse_metadata = nil, document = nil, parent_context = nil, block = nil, style = nil, explicit_style = nil, this_line = nil, delimited_block = nil, block_context = nil, terminator = nil, delimited_blk_match = nil, match = nil, blk_ctx = nil, posattrs = nil, target = nil, items = nil, expected_index = nil, list_item = nil, coids = nil, marker = nil, float_id = nil, float_title = nil, float_level = nil, _ = nil, tmp_sect = nil, break_at_list = nil, buffer = nil, offset = nil, admonition_match = nil, admonition_name = nil, $case = nil, lang = nil, block_reader = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, $bd, $be, $bf, $bg, $bh, $bi, $bj, $bk, $bl, $bm, $bn, $bo, $bp, $bq, $br, $bs, $bt, $bu, $bv, $bw, $bx, $by, $bz, $ca, $cb, $cc, $cd, $ce, $cf, $cg, $ch, $ci, $cj, $ck, $cl, $cm, $cn, $co, $cp, $cq, $cr, $cs, $ct, $cu, $cv, $cw, $cx, $cy, $cz, $da, $db, $dc, $dd, $de, $df, $dg, $dh, $di, $dj, $dk, $dl, $dm, $dn, $do, $dp, $dq, $dr, $ds, $dt, $du, $dv, $dw, $dx, $dy, $dz, $ea, $eb, $ec, $ed, $ee, TMP_2, $ef, $eg, $eh, $ei, $ej, $ek, $el, $em, $en, $eo, $ep, $eq, $er, $es, $et, $eu, $ev, $ew, $ex, $ey, $ez, $fa, $fb, $fc, $fd, $fe, $ff, $fg, $fh, $fi, $fj, $fk, $fl, $fm, $fn, $fo, $fp, $fq, $fr, $fs, $ft, $fu, $fv, TMP_3, $fw, $fx, $fy, $fz, TMP_4, $ga, TMP_5, $gb, $gc, $gd, $ge, $gf, $gg, $gh, $gi, TMP_6, $gj, $gk, $gl, $gm, $gn, $go, $gp, $gq, $gr, $gs, $gt, $gu, $gv, $gw, $gx, $gy, $gz, $ha, $hb, $hc, $hd, $he, $hf, $hg, $hh, $hi, $hj, $hk, $hl, $hm, $hn, $ho, $hp, $hq, $hr, $hs, $ht, $hu, $hv, $hw, $hx, $hy, $hz, $ia, $ib, $ic, $id, $ie, $if, $ig, $ih, $ii, $ij, $ik, $il, $im, $in, $io, $ip, $iq, $ir, $is, $it, $iu, $iv, $iw, $ix, $iy, $iz, $ja, $jb, $jc, $jd, $je, $jf, $jg, $jh, $ji, $jj, $jk, $jl, $jm, $jn, $jo, $jp, $jq, $jr, $js, $jt, $ju, $jv, $jw, $jx, $jy, $jz, $ka;if (attributes == null) {
          attributes = __hash2([], {})
        }if (options == null) {
          options = __hash2([], {})
        }
        skipped = (($a = reader).$skip_blank_lines || $mm('skip_blank_lines')).call($a);
        if (($b = (($c = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($c)) === false || $b === nil) {
          return nil
        };
        if (($b = ($d = (($d = options)['$[]'] || $mm('[]')).call($d, "text"), $d !== false && $d !== nil ? (($e = skipped)['$>'] || $mm('>')).call($e, 0) : $d)) !== false && $b !== nil) {
          (($b = options).$delete || $mm('delete')).call($b, "text")
        };
        parse_metadata = (($f = options).$fetch || $mm('fetch')).call($f, "parse_metadata", true);
        document = (($g = parent).$document || $mm('document')).call($g);
        parent_context = (function() { if (($h = (($i = parent)['$is_a?'] || $mm('is_a?')).call($i, __scope.Block)) !== false && $h !== nil) {
          return (($h = parent).$context || $mm('context')).call($h)
          } else {
          return nil
        }; return nil; }).call(this);
        block = nil;
        style = nil;
        explicit_style = nil;
        while (($k = ($l = (($l = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($l), $l !== false && $l !== nil ? (($m = block)['$nil?'] || $mm('nil?')).call($m) : $l)) !== false && $k !== nil){if (($k = (($n = parse_metadata !== false && parse_metadata !== nil) ? (($o = this).$parse_block_metadata_line || $mm('parse_block_metadata_line')).call($o, reader, document, attributes, options) : $n)) !== false && $k !== nil) {
          (($k = reader).$advance || $mm('advance')).call($k);
          continue;;
        };
        this_line = (($n = reader).$get_line || $mm('get_line')).call($n);
        delimited_block = false;
        block_context = nil;
        terminator = nil;
        if (($p = (($q = attributes)['$has_key?'] || $mm('has_key?')).call($q, 1)) !== false && $p !== nil) {
          explicit_style = (($p = attributes)['$[]'] || $mm('[]')).call($p, "style");
          style = (($r = attributes)['$[]='] || $mm('[]=')).call($r, "style", (($s = attributes)['$[]'] || $mm('[]')).call($s, 1));
        };
        if (($t = delimited_blk_match = (($u = this)['$is_delimited_block?'] || $mm('is_delimited_block?')).call($u, this_line, true)) !== false && $t !== nil) {
          delimited_block = true;
          block_context = (($t = delimited_blk_match).$context || $mm('context')).call($t);
          terminator = (($v = delimited_blk_match).$terminator || $mm('terminator')).call($v);
          if (($w = ($x = style, ($x === nil || $x === false))) !== false && $w !== nil) {
            style = (($w = attributes)['$[]='] || $mm('[]=')).call($w, "style", (($x = block_context).$to_s || $mm('to_s')).call($x))
            } else {
            if (($y = ($z = (($aa = style)['$=='] || $mm('==')).call($aa, (($ab = block_context).$to_s || $mm('to_s')).call($ab)), ($z === nil || $z === false))) !== false && $y !== nil) {
              if (($y = (($z = (($ac = delimited_blk_match).$masq || $mm('masq')).call($ac))['$include?'] || $mm('include?')).call($z, style)) !== false && $y !== nil) {
                block_context = (($y = style).$to_sym || $mm('to_sym')).call($y)
                } else {
                if (($ad = ($ae = (($ae = (($af = delimited_blk_match).$masq || $mm('masq')).call($af))['$include?'] || $mm('include?')).call($ae, "admonition"), $ae !== false && $ae !== nil ? (($ag = __scope.ADMONITION_STYLES)['$include?'] || $mm('include?')).call($ag, style) : $ae)) !== false && $ad !== nil) {
                  block_context = "admonition"
                  } else {
                  (($ad = this).$puts || $mm('puts')).call($ad, "asciidoctor: WARNING: line " + ((($ah = reader).$lineno || $mm('lineno')).call($ah)) + ": invalid style for " + (block_context) + " block: " + (style));
                  style = (($ai = block_context).$to_s || $mm('to_s')).call($ai);
                }
              }
            }
          };
        };
        if (($aj = ($ak = delimited_block, ($ak === nil || $ak === false))) !== false && $aj !== nil) {
          while (($ak = true) !== false && $ak !== nil){if (($ak = ($al = ($al = ($al = (($am = style)['$nil?'] || $mm('nil?')).call($am), ($al === nil || $al === false)), $al !== false && $al !== nil ? (($al = __scope.COMPLIANCE)['$[]'] || $mm('[]')).call($al, "strict_verbatim_paragraphs") : $al), $al !== false && $al !== nil ? (($an = __scope.VERBATIM_STYLES)['$include?'] || $mm('include?')).call($an, style) : $al)) !== false && $ak !== nil) {
            block_context = (($ak = style).$to_sym || $mm('to_sym')).call($ak);
            (($ao = reader).$unshift_line || $mm('unshift_line')).call($ao, this_line);
            break;;
          };
          if (($ap = ($aq = (($ar = options)['$[]'] || $mm('[]')).call($ar, "text"), ($aq === nil || $aq === false))) !== false && $ap !== nil) {
            if (($ap = match = (($aq = this_line).$match || $mm('match')).call($aq, (($as = __scope.REGEXP)['$[]'] || $mm('[]')).call($as, "break_line"))) !== false && $ap !== nil) {
              block = (($ap = __scope.Block).$new || $mm('new')).call($ap, parent, (($at = __scope.BREAK_LINES)['$[]'] || $mm('[]')).call($at, (($au = (($av = match)['$[]'] || $mm('[]')).call($av, 0))['$[]'] || $mm('[]')).call($au, __range(0, 2, false))));
              break;;
              } else {
              if (($aw = match = (($ax = this_line).$match || $mm('match')).call($ax, (($ay = __scope.REGEXP)['$[]'] || $mm('[]')).call($ay, "media_blk_macro"))) !== false && $aw !== nil) {
                blk_ctx = (($aw = (($az = match)['$[]'] || $mm('[]')).call($az, 1)).$to_sym || $mm('to_sym')).call($aw);
                block = (($ba = __scope.Block).$new || $mm('new')).call($ba, parent, blk_ctx);
                if ((($bb = blk_ctx)['$=='] || $mm('==')).call($bb, "image")) {
                  posattrs = ["alt", "width", "height"]
                  } else {
                  if ((($bc = blk_ctx)['$=='] || $mm('==')).call($bc, "video")) {
                    posattrs = ["poster", "width", "height"]
                    } else {
                    posattrs = []
                  }
                };
                if (($bd = (($be = (($bf = style)['$nil?'] || $mm('nil?')).call($bf)), $be !== false && $be !== nil ? $be : explicit_style)) === false || $bd === nil) {
                  if ((($bd = blk_ctx)['$=='] || $mm('==')).call($bd, "image")) {
                    (($be = attributes)['$[]='] || $mm('[]=')).call($be, "alt", style)
                  };
                  (($bg = attributes).$delete || $mm('delete')).call($bg, "style");
                  style = nil;
                };
                (($bh = block).$parse_attributes || $mm('parse_attributes')).call($bh, (($bi = match)['$[]'] || $mm('[]')).call($bi, 3), posattrs, __hash2(["unescape_input", "sub_input", "sub_result", "into"], {"unescape_input": (($bj = blk_ctx)['$=='] || $mm('==')).call($bj, "image"), "sub_input": true, "sub_result": false, "into": attributes}));
                target = (($bk = block).$sub_attributes || $mm('sub_attributes')).call($bk, (($bl = match)['$[]'] || $mm('[]')).call($bl, 2));
                if (($bm = (($bn = target)['$empty?'] || $mm('empty?')).call($bn)) !== false && $bm !== nil) {
                  return nil
                };
                (($bm = attributes)['$[]='] || $mm('[]=')).call($bm, "target", target);
                if (($bo = (($bp = attributes)['$has_key?'] || $mm('has_key?')).call($bp, "title")) !== false && $bo !== nil) {
                  (($bo = block)['$title='] || $mm('title=')).call($bo, (($bq = attributes).$delete || $mm('delete')).call($bq, "title"))
                };
                if ((($br = blk_ctx)['$=='] || $mm('==')).call($br, "image")) {
                  (($bs = document).$register || $mm('register')).call($bs, "images", target);
                  ($bt = "alt", $bu = attributes, (($bv = (($bw = $bu)['$[]'] || $mm('[]')).call($bw, $bt)), $bv !== false && $bv !== nil ? $bv : (($bx = $bu)['$[]='] || $mm('[]=')).call($bx, $bt, (($by = __scope.File).$basename || $mm('basename')).call($by, target, (($bz = __scope.File).$extname || $mm('extname')).call($bz, target)))));
                  (($bt = block).$assign_caption || $mm('assign_caption')).call($bt, (($bu = attributes).$delete || $mm('delete')).call($bu, "caption"), "figure");
                };
                break;;
                } else {
                if (($bv = match = (($ca = this_line).$match || $mm('match')).call($ca, (($cb = __scope.REGEXP)['$[]'] || $mm('[]')).call($cb, "toc"))) !== false && $bv !== nil) {
                  block = (($bv = __scope.Block).$new || $mm('new')).call($bv, parent, "toc");
                  (($cc = block).$parse_attributes || $mm('parse_attributes')).call($cc, (($cd = match)['$[]'] || $mm('[]')).call($cd, 1), [], __hash2(["sub_result", "into"], {"sub_result": false, "into": attributes}));
                  break;;
                }
              }
            }
          };
          if (($ce = match = (($cf = this_line).$match || $mm('match')).call($cf, (($cg = __scope.REGEXP)['$[]'] || $mm('[]')).call($cg, "colist"))) !== false && $ce !== nil) {
            block = (($ce = __scope.Block).$new || $mm('new')).call($ce, parent, "colist");
            (($ch = attributes)['$[]='] || $mm('[]=')).call($ch, "style", "arabic");
            items = [];
            (($ci = block)['$buffer='] || $mm('buffer=')).call($ci, items);
            (($cj = reader).$unshift_line || $mm('unshift_line')).call($cj, this_line);
            expected_index = 1;
            while (($cl = ($cm = (($cm = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($cm), $cm !== false && $cm !== nil ? match = (($cn = (($co = reader).$peek_line || $mm('peek_line')).call($co)).$match || $mm('match')).call($cn, (($cp = __scope.REGEXP)['$[]'] || $mm('[]')).call($cp, "colist")) : $cm)) !== false && $cl !== nil){if (($cl = ($cq = (($cr = (($cs = (($ct = match)['$[]'] || $mm('[]')).call($ct, 1)).$to_i || $mm('to_i')).call($cs))['$=='] || $mm('==')).call($cr, expected_index), ($cq === nil || $cq === false))) !== false && $cl !== nil) {
              (($cl = this).$puts || $mm('puts')).call($cl, "asciidoctor: WARNING: line " + (($cq = (($cv = reader).$lineno || $mm('lineno')).call($cv), $cu = 1, typeof($cq) === 'number' ? $cq + $cu : $cq['$+']($cu))) + ": callout list item index: expected " + (expected_index) + " got " + ((($cq = match)['$[]'] || $mm('[]')).call($cq, 1)))
            };
            list_item = (($cu = this).$next_list_item || $mm('next_list_item')).call($cu, reader, block, match);
            expected_index = (($cw = expected_index)['$+'] || $mm('+')).call($cw, 1);
            if (($cx = ($cy = (($cz = list_item)['$nil?'] || $mm('nil?')).call($cz), ($cy === nil || $cy === false))) !== false && $cx !== nil) {
              (($cx = items)['$<<'] || $mm('<<')).call($cx, list_item);
              coids = (($cy = (($da = document).$callouts || $mm('callouts')).call($da)).$callout_ids || $mm('callout_ids')).call($cy, (($db = items).$size || $mm('size')).call($db));
              if (($dc = ($dd = (($de = coids)['$empty?'] || $mm('empty?')).call($de), ($dd === nil || $dd === false))) !== false && $dc !== nil) {
                (($dc = (($dd = list_item).$attributes || $mm('attributes')).call($dd))['$[]='] || $mm('[]=')).call($dc, "coids", coids)
                } else {
                (($df = this).$puts || $mm('puts')).call($df, "asciidoctor: WARNING: line " + ((($dg = reader).$lineno || $mm('lineno')).call($dg)) + ": no callouts refer to list item " + ((($dh = items).$size || $mm('size')).call($dh)))
              };
            };};
            (($ck = (($di = document).$callouts || $mm('callouts')).call($di)).$next_list || $mm('next_list')).call($ck);
            break;;
            } else {
            if (($dj = match = (($dk = this_line).$match || $mm('match')).call($dk, (($dl = __scope.REGEXP)['$[]'] || $mm('[]')).call($dl, "ulist"))) !== false && $dj !== nil) {
              (($dj = reader).$unshift_line || $mm('unshift_line')).call($dj, this_line);
              block = (($dm = this).$next_outline_list || $mm('next_outline_list')).call($dm, reader, "ulist", parent);
              break;;
              } else {
              if (($dn = match = (($do = this_line).$match || $mm('match')).call($do, (($dp = __scope.REGEXP)['$[]'] || $mm('[]')).call($dp, "olist"))) !== false && $dn !== nil) {
                (($dn = reader).$unshift_line || $mm('unshift_line')).call($dn, this_line);
                block = (($dq = this).$next_outline_list || $mm('next_outline_list')).call($dq, reader, "olist", parent);
                if (($dr = ($ds = ($ds = (($dt = attributes)['$has_key?'] || $mm('has_key?')).call($dt, "style"), ($ds === nil || $ds === false)), $ds !== false && $ds !== nil ? ($ds = (($du = (($dv = block).$attributes || $mm('attributes')).call($dv))['$has_key?'] || $mm('has_key?')).call($du, "style"), ($ds === nil || $ds === false)) : $ds)) !== false && $dr !== nil) {
                  marker = (($dr = (($ds = (($dw = block).$buffer || $mm('buffer')).call($dw)).$first || $mm('first')).call($ds)).$marker || $mm('marker')).call($dr);
                  if (($dx = (($dy = marker)['$start_with?'] || $mm('start_with?')).call($dy, ".")) !== false && $dx !== nil) {
                    (($dx = attributes)['$[]='] || $mm('[]=')).call($dx, "style", (($dz = (($ea = (($eb = __scope.ORDERED_LIST_STYLES)['$[]'] || $mm('[]')).call($eb, ($ec = (($ee = marker).$length || $mm('length')).call($ee), $ed = 1, typeof($ec) === 'number' ? $ec - $ed : $ec['$-']($ed)))), $ea !== false && $ea !== nil ? $ea : (($ec = __scope.ORDERED_LIST_STYLES).$first || $mm('first')).call($ec))).$to_s || $mm('to_s')).call($dz))
                    } else {
                    style = ($ea = (($ed = __scope.ORDERED_LIST_STYLES).$detect || $mm('detect')), $ea._p = (TMP_2 = function(s) {

                      var self = TMP_2._s || this, $a, $b;
                      if (s == null) s = nil;

                      return (($a = marker).$match || $mm('match')).call($a, (($b = __scope.ORDERED_LIST_MARKER_PATTERNS)['$[]'] || $mm('[]')).call($b, s))
                    }, TMP_2._s = this, TMP_2), $ea).call($ed);
                    (($ea = attributes)['$[]='] || $mm('[]=')).call($ea, "style", (($ef = (($eg = style), $eg !== false && $eg !== nil ? $eg : (($eh = __scope.ORDERED_LIST_STYLES).$first || $mm('first')).call($eh))).$to_s || $mm('to_s')).call($ef));
                  };
                };
                break;;
                } else {
                if (($eg = match = (($ei = this_line).$match || $mm('match')).call($ei, (($ej = __scope.REGEXP)['$[]'] || $mm('[]')).call($ej, "dlist"))) !== false && $eg !== nil) {
                  (($eg = reader).$unshift_line || $mm('unshift_line')).call($eg, this_line);
                  block = (($ek = this).$next_labeled_list || $mm('next_labeled_list')).call($ek, reader, match, parent);
                  break;;
                  } else {
                  if (($el = ($em = (($em = (($en = style)['$=='] || $mm('==')).call($en, "float")), $em !== false && $em !== nil ? $em : (($eo = style)['$=='] || $mm('==')).call($eo, "discrete")), $em !== false && $em !== nil ? (($em = this)['$is_section_title?'] || $mm('is_section_title?')).call($em, this_line, (($ep = reader).$peek_line || $mm('peek_line')).call($ep)) : $em)) !== false && $el !== nil) {
                    (($el = reader).$unshift_line || $mm('unshift_line')).call($el, this_line);
                    (($eq = (($er = this).$parse_section_title || $mm('parse_section_title')).call($er, reader, document))._isArray ? $eq : ($eq = [$eq])), float_id = ($eq[0] == null ? nil : $eq[0]), float_title = ($eq[1] == null ? nil : $eq[1]), float_level = ($eq[2] == null ? nil : $eq[2]), _ = ($eq[3] == null ? nil : $eq[3]);
                    if (($eq = (($es = attributes)['$has_key?'] || $mm('has_key?')).call($es, "id")) !== false && $eq !== nil) {
                      (($eq = float_id), $eq !== false && $eq !== nil ? $eq : float_id = (($et = attributes)['$[]'] || $mm('[]')).call($et, "id"))
                    };
                    block = (($eq = __scope.Block).$new || $mm('new')).call($eq, parent, "floating_title");
                    if (($eu = (($ev = (($ew = float_id)['$nil?'] || $mm('nil?')).call($ew)), $ev !== false && $ev !== nil ? $ev : (($ex = float_id)['$empty?'] || $mm('empty?')).call($ex))) !== false && $eu !== nil) {
                      tmp_sect = (($eu = __scope.Section).$new || $mm('new')).call($eu, parent);
                      (($ev = tmp_sect)['$title='] || $mm('title=')).call($ev, float_title);
                      (($ey = block)['$id='] || $mm('id=')).call($ey, (($ez = tmp_sect).$generate_id || $mm('generate_id')).call($ez));
                      } else {
                      (($fa = block)['$id='] || $mm('id=')).call($fa, float_id)
                    };
                    if (($fb = (($fc = block).$id || $mm('id')).call($fc)) !== false && $fb !== nil) {
                      (($fb = document).$register || $mm('register')).call($fb, "ids", [(($fd = block).$id || $mm('id')).call($fd), float_title])
                    };
                    (($fe = block)['$level='] || $mm('level=')).call($fe, float_level);
                    (($ff = block)['$title='] || $mm('title=')).call($ff, float_title);
                    break;;
                    } else {
                    if (($fg = ($fh = ($fh = (($fi = style)['$nil?'] || $mm('nil?')).call($fi), ($fh === nil || $fh === false)), $fh !== false && $fh !== nil ? ($fh = (($fj = style)['$=='] || $mm('==')).call($fj, "normal"), ($fh === nil || $fh === false)) : $fh)) !== false && $fg !== nil) {
                      if (($fg = (($fh = __scope.PARAGRAPH_STYLES)['$include?'] || $mm('include?')).call($fh, style)) !== false && $fg !== nil) {
                        block_context = (($fg = style).$to_sym || $mm('to_sym')).call($fg);
                        (($fk = reader).$unshift_line || $mm('unshift_line')).call($fk, this_line);
                        break;;
                        } else {
                        if (($fl = (($fm = __scope.ADMONITION_STYLES)['$include?'] || $mm('include?')).call($fm, style)) !== false && $fl !== nil) {
                          block_context = "admonition";
                          (($fl = reader).$unshift_line || $mm('unshift_line')).call($fl, this_line);
                          break;;
                          } else {
                          (($fn = this).$puts || $mm('puts')).call($fn, "asciidoctor: WARNING: line " + ((($fo = reader).$lineno || $mm('lineno')).call($fo)) + ": invalid style for paragraph: " + (style));
                          style = nil;
                        }
                      }
                    }
                  }
                }
              }
            }
          };
          break_at_list = (($fp = (($fq = skipped)['$=='] || $mm('==')).call($fq, 0)) ? (($fr = (($fs = parent_context).$to_s || $mm('to_s')).call($fs))['$end_with?'] || $mm('end_with?')).call($fr, "list") : $fp);
          if (($fp = ($ft = ($ft = (($fu = style)['$=='] || $mm('==')).call($fu, "normal"), ($ft === nil || $ft === false)), $ft !== false && $ft !== nil ? (($ft = this_line).$match || $mm('match')).call($ft, (($fv = __scope.REGEXP)['$[]'] || $mm('[]')).call($fv, "lit_par")) : $ft)) !== false && $fp !== nil) {
            (($fp = reader).$unshift_line || $mm('unshift_line')).call($fp, this_line);
            buffer = ($fw = (($fx = reader).$grab_lines_until || $mm('grab_lines_until')), $fw._p = (TMP_3 = function(line) {

              var self = TMP_3._s || this, $a, $b, $c, $d, $e, $f, $g, $h;
              if (line == null) line = nil;

              return (($a = (($b = break_at_list !== false && break_at_list !== nil) ? (($c = line).$match || $mm('match')).call($c, (($d = __scope.REGEXP)['$[]'] || $mm('[]')).call($d, "any_list")) : $b)), $a !== false && $a !== nil ? $a : ($b = (($b = __scope.COMPLIANCE)['$[]'] || $mm('[]')).call($b, "block_terminates_paragraph"), $b !== false && $b !== nil ? (($e = (($f = self)['$is_delimited_block?'] || $mm('is_delimited_block?')).call($f, line)), $e !== false && $e !== nil ? $e : (($g = line).$match || $mm('match')).call($g, (($h = __scope.REGEXP)['$[]'] || $mm('[]')).call($h, "attr_line"))) : $b))
            }, TMP_3._s = this, TMP_3), $fw).call($fx, __hash2(["break_on_blank_lines", "break_on_list_continuation", "preserve_last_line"], {"break_on_blank_lines": true, "break_on_list_continuation": true, "preserve_last_line": true}));
            if (($fw = ($fy = (($fz = buffer)['$empty?'] || $mm('empty?')).call($fz), ($fy === nil || $fy === false))) !== false && $fw !== nil) {
              offset = (($fw = ($fy = (($ga = buffer).$map || $mm('map')), $fy._p = (TMP_4 = function(line) {

                var self = TMP_4._s || this, $a, $b, $c, $d;
                if (line == null) line = nil;

                return (($a = (($b = (($c = line).$match || $mm('match')).call($c, (($d = __scope.REGEXP)['$[]'] || $mm('[]')).call($d, "leading_blanks")))['$[]'] || $mm('[]')).call($b, 1)).$length || $mm('length')).call($a)
              }, TMP_4._s = this, TMP_4), $fy).call($ga)).$min || $mm('min')).call($fw);
              if ((($fy = offset)['$>'] || $mm('>')).call($fy, 0)) {
                buffer = ($gb = (($gc = buffer).$map || $mm('map')), $gb._p = (TMP_5 = function(l) {

                  var self = TMP_5._s || this, $a;
                  if (l == null) l = nil;

                  return (($a = l).$sub || $mm('sub')).call($a, (new RegExp("^\\s{1," + offset + "}")), "")
                }, TMP_5._s = this, TMP_5), $gb).call($gc)
              };
            };
            block = (($gb = __scope.Block).$new || $mm('new')).call($gb, parent, "literal", buffer);
            if (($gd = (($ge = __scope.LIST_CONTEXTS)['$include?'] || $mm('include?')).call($ge, parent_context)) !== false && $gd !== nil) {
              ($gd = "options", $gf = attributes, (($gg = (($gh = $gf)['$[]'] || $mm('[]')).call($gh, $gd)), $gg !== false && $gg !== nil ? $gg : (($gi = $gf)['$[]='] || $mm('[]=')).call($gi, $gd, [])));
              (($gd = (($gf = attributes)['$[]'] || $mm('[]')).call($gf, "options"))['$<<'] || $mm('<<')).call($gd, "listparagraph");
            };
            } else {
            (($gg = reader).$unshift_line || $mm('unshift_line')).call($gg, this_line);
            buffer = ($gj = (($gk = reader).$grab_lines_until || $mm('grab_lines_until')), $gj._p = (TMP_6 = function(line) {

              var self = TMP_6._s || this, $a, $b, $c, $d, $e, $f, $g, $h;
              if (line == null) line = nil;

              return (($a = (($b = break_at_list !== false && break_at_list !== nil) ? (($c = line).$match || $mm('match')).call($c, (($d = __scope.REGEXP)['$[]'] || $mm('[]')).call($d, "any_list")) : $b)), $a !== false && $a !== nil ? $a : ($b = (($b = __scope.COMPLIANCE)['$[]'] || $mm('[]')).call($b, "block_terminates_paragraph"), $b !== false && $b !== nil ? (($e = (($f = self)['$is_delimited_block?'] || $mm('is_delimited_block?')).call($f, line)), $e !== false && $e !== nil ? $e : (($g = line).$match || $mm('match')).call($g, (($h = __scope.REGEXP)['$[]'] || $mm('[]')).call($h, "attr_line"))) : $b))
            }, TMP_6._s = this, TMP_6), $gj).call($gk, __hash2(["break_on_blank_lines", "break_on_list_continuation", "preserve_last_line", "skip_line_comments"], {"break_on_blank_lines": true, "break_on_list_continuation": true, "preserve_last_line": true, "skip_line_comments": true}));
            if (($gj = (($gl = buffer)['$empty?'] || $mm('empty?')).call($gl)) !== false && $gj !== nil) {
              (($gj = reader).$get_line || $mm('get_line')).call($gj);
              return nil;
            };
            (($gm = this).$catalog_inline_anchors || $mm('catalog_inline_anchors')).call($gm, (($gn = buffer).$join || $mm('join')).call($gn, "\n"), document);
            if (($go = ($gp = ($gp = (($gq = options)['$[]'] || $mm('[]')).call($gq, "text"), ($gp === nil || $gp === false)), $gp !== false && $gp !== nil ? admonition_match = (($gp = (($gr = buffer).$first || $mm('first')).call($gr)).$match || $mm('match')).call($gp, (($gs = __scope.REGEXP)['$[]'] || $mm('[]')).call($gs, "admonition_inline")) : $gp)) !== false && $go !== nil) {
              (($go = buffer)['$[]='] || $mm('[]=')).call($go, 0, (($gt = (($gu = admonition_match).$post_match || $mm('post_match')).call($gu)).$lstrip || $mm('lstrip')).call($gt));
              block = (($gv = __scope.Block).$new || $mm('new')).call($gv, parent, "admonition", buffer);
              (($gw = attributes)['$[]='] || $mm('[]=')).call($gw, "style", (($gx = admonition_match)['$[]'] || $mm('[]')).call($gx, 1));
              (($gy = attributes)['$[]='] || $mm('[]=')).call($gy, "name", admonition_name = (($gz = (($ha = admonition_match)['$[]'] || $mm('[]')).call($ha, 1)).$downcase || $mm('downcase')).call($gz));
              ($hb = "caption", $hc = attributes, (($hd = (($he = $hc)['$[]'] || $mm('[]')).call($he, $hb)), $hd !== false && $hd !== nil ? $hd : (($hf = $hc)['$[]='] || $mm('[]=')).call($hf, $hb, (($hg = (($hh = document).$attributes || $mm('attributes')).call($hh))['$[]'] || $mm('[]')).call($hg, "" + (admonition_name) + "-caption"))));
              } else {
              block = (($hb = __scope.Block).$new || $mm('new')).call($hb, parent, "paragraph", buffer)
            };
          };
          break;;}
        };
        if (($aj = ($hc = (($hc = block)['$nil?'] || $mm('nil?')).call($hc), $hc !== false && $hc !== nil ? ($hd = (($hi = block_context)['$nil?'] || $mm('nil?')).call($hi), ($hd === nil || $hd === false)) : $hc)) !== false && $aj !== nil) {
          if (($aj = (($hd = (($hj = block_context)['$=='] || $mm('==')).call($hj, "abstract")), $hd !== false && $hd !== nil ? $hd : (($hk = block_context)['$=='] || $mm('==')).call($hk, "partintro"))) !== false && $aj !== nil) {
            block_context = "open"
          };
          $case = block_context;if ((($hm = "admonition")['$==='] || $mm('===')).call($hm, $case)) {
          (($aj = attributes)['$[]='] || $mm('[]=')).call($aj, "name", admonition_name = (($hd = style).$downcase || $mm('downcase')).call($hd));
          ($hl = "caption", $hm = attributes, (($hn = (($ho = $hm)['$[]'] || $mm('[]')).call($ho, $hl)), $hn !== false && $hn !== nil ? $hn : (($hp = $hm)['$[]='] || $mm('[]=')).call($hp, $hl, (($hq = (($hr = document).$attributes || $mm('attributes')).call($hr))['$[]'] || $mm('[]')).call($hq, "" + (admonition_name) + "-caption"))));
          block = (($hl = this).$build_block || $mm('build_block')).call($hl, block_context, "complex", terminator, parent, reader, attributes);
          }
          else if ((($hs = "comment")['$==='] || $mm('===')).call($hs, $case)) {
          (($hn = reader).$grab_lines_until || $mm('grab_lines_until')).call($hn, __hash2(["break_on_blank_lines", "chomp_last_line"], {"break_on_blank_lines": true, "chomp_last_line": false}));
          return nil;
          }
          else if ((($hu = "example")['$==='] || $mm('===')).call($hu, $case)) {
          block = (($ht = this).$build_block || $mm('build_block')).call($ht, block_context, "complex", terminator, parent, reader, attributes, true)
          }
          else if ((($ih = "listing")['$==='] || $mm('===')).call($ih, $case) || (($ii = "fenced_code")['$==='] || $mm('===')).call($ii, $case) || (($ij = "source")['$==='] || $mm('===')).call($ij, $case)) {
          if ((($hv = block_context)['$=='] || $mm('==')).call($hv, "fenced_code")) {
            style = (($hw = attributes)['$[]='] || $mm('[]=')).call($hw, "style", "source");
            lang = (($hx = (($hy = this_line)['$[]'] || $mm('[]')).call($hy, __range(3, -1, false))).$strip || $mm('strip')).call($hx);
            if (($hz = (($ia = lang)['$empty?'] || $mm('empty?')).call($ia)) === false || $hz === nil) {
              (($hz = attributes)['$[]='] || $mm('[]=')).call($hz, "language", lang)
            };
            if ((($ib = (($ic = terminator).$length || $mm('length')).call($ic))['$>'] || $mm('>')).call($ib, 3)) {
              terminator = (($id = terminator)['$[]'] || $mm('[]')).call($id, __range(0, 2, false))
            };
            } else {
            if ((($ie = block_context)['$=='] || $mm('==')).call($ie, "source")) {
              (($if = __scope.AttributeList).$rekey || $mm('rekey')).call($if, attributes, [nil, "language", "linenums"])
            }
          };
          block = (($ig = this).$build_block || $mm('build_block')).call($ig, "listing", "verbatim", terminator, parent, reader, attributes, true);
          }
          else if ((($il = "literal")['$==='] || $mm('===')).call($il, $case)) {
          block = (($ik = this).$build_block || $mm('build_block')).call($ik, block_context, "verbatim", terminator, parent, reader, attributes)
          }
          else if ((($in = "pass")['$==='] || $mm('===')).call($in, $case)) {
          block = (($im = this).$build_block || $mm('build_block')).call($im, block_context, "simple", terminator, parent, reader, attributes)
          }
          else if ((($ip = "open")['$==='] || $mm('===')).call($ip, $case) || (($iq = "sidebar")['$==='] || $mm('===')).call($iq, $case)) {
          block = (($io = this).$build_block || $mm('build_block')).call($io, block_context, "complex", terminator, parent, reader, attributes)
          }
          else if ((($iu = "table")['$==='] || $mm('===')).call($iu, $case)) {
          block_reader = (($ir = __scope.Reader).$new || $mm('new')).call($ir, (($is = reader).$grab_lines_until || $mm('grab_lines_until')).call($is, __hash2(["terminator", "skip_line_comments"], {"terminator": terminator, "skip_line_comments": true})));
          block = (($it = this).$next_table || $mm('next_table')).call($it, block_reader, parent, attributes);
          }
          else if ((($iy = "quote")['$==='] || $mm('===')).call($iy, $case) || (($iz = "verse")['$==='] || $mm('===')).call($iz, $case)) {
          (($iv = __scope.AttributeList).$rekey || $mm('rekey')).call($iv, attributes, [nil, "attribution", "citetitle"]);
          block = (($iw = this).$build_block || $mm('build_block')).call($iw, block_context, (function() { if ((($ix = block_context)['$=='] || $mm('==')).call($ix, "verse")) {
            return "verbatim"
            } else {
            return "complex"
          }; return nil; }).call(this), terminator, parent, reader, attributes);
          }
          else {(($ja = this).$raise || $mm('raise')).call($ja, "Unsupported block type " + (block_context) + " at line " + ((($jb = reader).$lineno || $mm('lineno')).call($jb)))};
        };};
        if (($j = ($jc = (($jd = block)['$nil?'] || $mm('nil?')).call($jd), ($jc === nil || $jc === false))) !== false && $j !== nil) {
          if (($j = (($jc = attributes)['$has_key?'] || $mm('has_key?')).call($jc, "id")) !== false && $j !== nil) {
            ($j = block, (($je = (($jf = $j).$id || $mm('id')).call($jf)), $je !== false && $je !== nil ? $je : (($jg = $j)['$id='] || $mm('id=')).call($jg, (($jh = attributes)['$[]'] || $mm('[]')).call($jh, "id"))))
          };
          if (($j = (($je = block)['$title?'] || $mm('title?')).call($je)) === false || $j === nil) {
            (($j = block)['$title='] || $mm('title=')).call($j, (($ji = attributes)['$[]'] || $mm('[]')).call($ji, "title"))
          };
          if (($jj = (($jk = block)['$is_a?'] || $mm('is_a?')).call($jk, __scope.Section)) === false || $jj === nil) {
            ($jj = block, (($jl = (($jm = $jj).$caption || $mm('caption')).call($jm)), $jl !== false && $jl !== nil ? $jl : (($jn = $jj)['$caption='] || $mm('caption=')).call($jn, (($jo = attributes)['$[]'] || $mm('[]')).call($jo, "caption"))))
          };
          if (($jj = ($jl = ($jl = (($jl = block).$id || $mm('id')).call($jl), $jl !== false && $jl !== nil ? (($jp = block)['$title?'] || $mm('title?')).call($jp) : $jl), $jl !== false && $jl !== nil ? ($jq = (($jr = attributes)['$has_key?'] || $mm('has_key?')).call($jr, "reftext"), ($jq === nil || $jq === false)) : $jl)) !== false && $jj !== nil) {
            (($jj = document).$register || $mm('register')).call($jj, "ids", [(($jq = block).$id || $mm('id')).call($jq), (($js = block).$title || $mm('title')).call($js)])
          };
          (($jt = block).$update_attributes || $mm('update_attributes')).call($jt, attributes);
          if (($ju = (($jv = (($jw = (($jx = block).$context || $mm('context')).call($jx))['$=='] || $mm('==')).call($jw, "listing")), $jv !== false && $jv !== nil ? $jv : (($jy = (($jz = block).$context || $mm('context')).call($jz))['$=='] || $mm('==')).call($jy, "literal"))) !== false && $ju !== nil) {
            (($ju = this).$catalog_callouts || $mm('catalog_callouts')).call($ju, (($jv = (($ka = block).$buffer || $mm('buffer')).call($ka)).$join || $mm('join')).call($jv, "\n"), document)
          };
        };
        return block;
      });

      Lexer._defs('$is_delimited_block?', function(line, return_match_data) {
        var line_len = nil, tip = nil, tl = nil, tip_alt = nil, context = nil, masq = nil, match = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p;if (return_match_data == null) {
          return_match_data = false
        }
        line_len = (($a = line).$length || $mm('length')).call($a);
        if ((($b = line_len)['$>'] || $mm('>')).call($b, 1)) {
          if ((($c = line_len)['$=='] || $mm('==')).call($c, 2)) {
            tip = line;
            tl = 2;
            } else {
            tip = (($d = line)['$[]'] || $mm('[]')).call($d, __range(0, 3, false));
            tl = 4;
            tip_alt = (($e = tip).$chop || $mm('chop')).call($e);
            if (($f = (($g = (($h = tip_alt)['$=='] || $mm('==')).call($h, "```")), $g !== false && $g !== nil ? $g : (($i = tip_alt)['$=='] || $mm('==')).call($i, "~~~"))) !== false && $f !== nil) {
              tip = tip_alt;
              tl = 3;
            };
          };
          if (($f = (($g = __scope.DELIMITED_BLOCKS)['$has_key?'] || $mm('has_key?')).call($g, tip)) !== false && $f !== nil) {
            if ((($f = tl)['$=='] || $mm('==')).call($f, line_len)) {
              if (return_match_data !== false && return_match_data !== nil) {
                ($j = (($k = __scope.DELIMITED_BLOCKS)['$[]'] || $mm('[]')).call($k, tip))['$to_a'] ? ($j = $j['$to_a']()) : ($j)._isArray ? $j : ($j = [$j]), context = ($j[0] == null ? nil : $j[0]), masq = ($j[1] == null ? nil : $j[1]);
                return (($j = __scope.BlockMatchData).$new || $mm('new')).call($j, context, masq, tip, tip);
                } else {
                return true
              }
              } else {
              if (($l = match = (($m = line).$match || $mm('match')).call($m, (($n = __scope.REGEXP)['$[]'] || $mm('[]')).call($n, "any_blk"))) !== false && $l !== nil) {
                if (return_match_data !== false && return_match_data !== nil) {
                  ($l = (($o = __scope.DELIMITED_BLOCKS)['$[]'] || $mm('[]')).call($o, tip))['$to_a'] ? ($l = $l['$to_a']()) : ($l)._isArray ? $l : ($l = [$l]), context = ($l[0] == null ? nil : $l[0]), masq = ($l[1] == null ? nil : $l[1]);
                  return (($l = __scope.BlockMatchData).$new || $mm('new')).call($l, context, masq, tip, (($p = match)['$[]'] || $mm('[]')).call($p, 0));
                  } else {
                  return true
                }
                } else {
                return nil
              }
            }
            } else {
            return nil
          };
          } else {
          return nil
        };
      });

      Lexer._defs('$build_block', function(block_context, content_type, terminator, parent, reader, attributes, supports_caption) {
        var buffer = nil, block_reader = nil, block = nil, parsed_block = nil, $a, $b, $c, TMP_7, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u;if (supports_caption == null) {
          supports_caption = false
        }
        if (($a = (($b = terminator)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          if ((($a = content_type)['$=='] || $mm('==')).call($a, "verbatim")) {
            buffer = (($c = reader).$grab_lines_until || $mm('grab_lines_until')).call($c, __hash2(["break_on_blank_lines", "break_on_list_continuation"], {"break_on_blank_lines": true, "break_on_list_continuation": true}))
            } else {
            buffer = ($d = (($e = reader).$grab_lines_until || $mm('grab_lines_until')), $d._p = (TMP_7 = function(line) {

              var self = TMP_7._s || this, $a, $b, $c, $d, $e;
              if (line == null) line = nil;

              return ($a = (($a = __scope.COMPLIANCE)['$[]'] || $mm('[]')).call($a, "block_terminates_paragraph"), $a !== false && $a !== nil ? (($b = (($c = self)['$is_delimited_block?'] || $mm('is_delimited_block?')).call($c, line)), $b !== false && $b !== nil ? $b : (($d = line).$match || $mm('match')).call($d, (($e = __scope.REGEXP)['$[]'] || $mm('[]')).call($e, "attr_line"))) : $a)
            }, TMP_7._s = this, TMP_7), $d).call($e, __hash2(["break_on_blank_lines", "break_on_list_continuation", "preserve_last_line", "skip_line_comments"], {"break_on_blank_lines": true, "break_on_list_continuation": true, "preserve_last_line": true, "skip_line_comments": true}))
          }
          } else {
          if (($d = ($f = (($g = content_type)['$=='] || $mm('==')).call($g, "complex"), ($f === nil || $f === false))) !== false && $d !== nil) {
            buffer = (($d = reader).$grab_lines_until || $mm('grab_lines_until')).call($d, __hash2(["terminator", "chomp_last_line"], {"terminator": terminator, "chomp_last_line": true}))
            } else {
            buffer = nil;
            block_reader = (($f = __scope.Reader).$new || $mm('new')).call($f, (($h = reader).$grab_lines_until || $mm('grab_lines_until')).call($h, __hash2(["terminator"], {"terminator": terminator})));
          }
        };
        block = (($i = __scope.Block).$new || $mm('new')).call($i, parent, block_context, buffer);
        if (supports_caption !== false && supports_caption !== nil) {
          if (($j = (($k = attributes)['$has_key?'] || $mm('has_key?')).call($k, "title")) !== false && $j !== nil) {
            (($j = block)['$title='] || $mm('title=')).call($j, (($l = attributes).$delete || $mm('delete')).call($l, "title"))
          };
          (($m = block).$assign_caption || $mm('assign_caption')).call($m, (($n = attributes).$delete || $mm('delete')).call($n, "caption"));
        };
        if (($o = (($p = buffer)['$nil?'] || $mm('nil?')).call($p)) !== false && $o !== nil) {
          while (($q = (($r = block_reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($r)) !== false && $q !== nil){parsed_block = (($q = this).$next_block || $mm('next_block')).call($q, block_reader, block);
          if (($s = (($t = parsed_block)['$nil?'] || $mm('nil?')).call($t)) === false || $s === nil) {
            (($s = (($u = block).$blocks || $mm('blocks')).call($u))['$<<'] || $mm('<<')).call($s, parsed_block)
          };}
        };
        return block;
      });

      Lexer._defs('$next_outline_list', function(reader, list_type, parent) {
        var list_block = nil, items = nil, match = nil, marker = nil, this_item_level = nil, p = nil, list_item = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as;
        list_block = (($a = __scope.Block).$new || $mm('new')).call($a, parent, list_type);
        items = [];
        (($b = list_block)['$buffer='] || $mm('buffer=')).call($b, items);
        if ((($c = (($d = parent).$context || $mm('context')).call($d))['$=='] || $mm('==')).call($c, list_type)) {
          (($e = list_block)['$level='] || $mm('level=')).call($e, ($f = (($h = parent).$level || $mm('level')).call($h), $g = 1, typeof($f) === 'number' ? $f + $g : $f['$+']($g)))
          } else {
          (($f = list_block)['$level='] || $mm('level=')).call($f, 1)
        };
        while (($i = ($j = (($j = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($j), $j !== false && $j !== nil ? match = (($k = (($l = reader).$peek_line || $mm('peek_line')).call($l)).$match || $mm('match')).call($k, (($m = __scope.REGEXP)['$[]'] || $mm('[]')).call($m, list_type)) : $j)) !== false && $i !== nil){marker = (($i = this).$resolve_list_marker || $mm('resolve_list_marker')).call($i, list_type, (($n = match)['$[]'] || $mm('[]')).call($n, 1));
        if (($o = (($p = (($q = (($r = items).$size || $mm('size')).call($r))['$>'] || $mm('>')).call($q, 0)) ? ($s = (($t = marker)['$=='] || $mm('==')).call($t, (($u = (($v = items).$first || $mm('first')).call($v)).$marker || $mm('marker')).call($u)), ($s === nil || $s === false)) : $p)) !== false && $o !== nil) {
          this_item_level = ($o = (($s = list_block).$level || $mm('level')).call($s), $p = 1, typeof($o) === 'number' ? $o + $p : $o['$+']($p));
          p = parent;
          while ((($p = (($w = p).$context || $mm('context')).call($w))['$=='] || $mm('==')).call($p, list_type)){if ((($x = marker)['$=='] || $mm('==')).call($x, (($y = (($z = (($aa = p).$buffer || $mm('buffer')).call($aa)).$first || $mm('first')).call($z)).$marker || $mm('marker')).call($y))) {
            this_item_level = (($ab = p).$level || $mm('level')).call($ab);
            break;;
          };
          p = (($ac = p).$parent || $mm('parent')).call($ac);};
          } else {
          this_item_level = (($o = list_block).$level || $mm('level')).call($o)
        };
        if (($ad = (($ae = (($af = (($ag = items).$size || $mm('size')).call($ag))['$=='] || $mm('==')).call($af, 0)), $ae !== false && $ae !== nil ? $ae : (($ah = this_item_level)['$=='] || $mm('==')).call($ah, (($ai = list_block).$level || $mm('level')).call($ai)))) !== false && $ad !== nil) {
          list_item = (($ad = this).$next_list_item || $mm('next_list_item')).call($ad, reader, list_block, match)
          } else {
          if ((($ae = this_item_level)['$<'] || $mm('<')).call($ae, (($aj = list_block).$level || $mm('level')).call($aj))) {
            break;
            } else {
            if ((($ak = this_item_level)['$>'] || $mm('>')).call($ak, (($al = list_block).$level || $mm('level')).call($al))) {
              (($am = (($an = (($ao = items).$last || $mm('last')).call($ao)).$blocks || $mm('blocks')).call($an))['$<<'] || $mm('<<')).call($am, (($ap = this).$next_block || $mm('next_block')).call($ap, reader, list_block))
            }
          }
        };
        if (($aq = (($ar = list_item)['$nil?'] || $mm('nil?')).call($ar)) === false || $aq === nil) {
          (($aq = items)['$<<'] || $mm('<<')).call($aq, list_item)
        };
        list_item = nil;
        (($as = reader).$skip_blank_lines || $mm('skip_blank_lines')).call($as);};
        return list_block;
      });

      Lexer._defs('$catalog_callouts', function(text, document) {
        var TMP_8, $a, $b, $c;
        return ($a = (($b = text).$scan || $mm('scan')), $a._p = (TMP_8 = function() {

          var m = nil, self = TMP_8._s || this, $a, $b, $c, $d, $e;
          
          m = __gvars["~"];
          if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
            return nil;
          };
          return (($a = (($d = document).$callouts || $mm('callouts')).call($d)).$register || $mm('register')).call($a, (($e = m)['$[]'] || $mm('[]')).call($e, 1));
        }, TMP_8._s = this, TMP_8), $a).call($b, (($c = __scope.REGEXP)['$[]'] || $mm('[]')).call($c, "callout_scan"))
      });

      Lexer._defs('$catalog_inline_anchors', function(text, document) {
        var TMP_9, $a, $b, $c;
        ($a = (($b = text).$scan || $mm('scan')), $a._p = (TMP_9 = function() {

          var m = nil, id = nil, reftext = nil, self = TMP_9._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
          
          m = __gvars["~"];
          if (($a = (($b = (($c = m)['$[]'] || $mm('[]')).call($c, 0))['$start_with?'] || $mm('start_with?')).call($b, "\\")) !== false && $a !== nil) {
            return nil;
          };
          (($a = (($d = (($e = m)['$[]'] || $mm('[]')).call($e, 1)).$split || $mm('split')).call($d, ","))._isArray ? $a : ($a = [$a])), id = ($a[0] == null ? nil : $a[0]), reftext = ($a[1] == null ? nil : $a[1]);
          id = (($a = id).$sub || $mm('sub')).call($a, (($f = __scope.REGEXP)['$[]'] || $mm('[]')).call($f, "dbl_quoted"), "\\2");
          if (($g = ($h = (($i = reftext)['$nil?'] || $mm('nil?')).call($i), ($h === nil || $h === false))) !== false && $g !== nil) {
            reftext = (($g = reftext).$sub || $mm('sub')).call($g, (($h = __scope.REGEXP)['$[]'] || $mm('[]')).call($h, "m_dbl_quoted"), "\\2")
          };
          return (($j = document).$register || $mm('register')).call($j, "ids", [id, reftext]);
        }, TMP_9._s = this, TMP_9), $a).call($b, (($c = __scope.REGEXP)['$[]'] || $mm('[]')).call($c, "anchor_macro"));
        return nil;
      });

      Lexer._defs('$next_labeled_list', function(reader, match, parent) {
        var pairs = nil, block = nil, sibling_pattern = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k;
        pairs = [];
        block = (($a = __scope.Block).$new || $mm('new')).call($a, parent, "dlist");
        (($b = block)['$buffer='] || $mm('buffer=')).call($b, pairs);
        sibling_pattern = (($c = (($d = __scope.REGEXP)['$[]'] || $mm('[]')).call($d, "dlist_siblings"))['$[]'] || $mm('[]')).call($c, (($e = match)['$[]'] || $mm('[]')).call($e, 2));
        while (($g = ($h = (($h = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($h), $h !== false && $h !== nil ? match = (($i = (($j = reader).$peek_line || $mm('peek_line')).call($j)).$match || $mm('match')).call($i, sibling_pattern) : $h)) !== false && $g !== nil){(($g = pairs)['$<<'] || $mm('<<')).call($g, (($k = this).$next_list_item || $mm('next_list_item')).call($k, reader, block, match, sibling_pattern))};
        return block;
      });

      Lexer._defs('$next_list_item', function(reader, list_block, match, sibling_trait) {
        var list_type = nil, list_term = nil, list_item = nil, has_text = nil, list_item_reader = nil, comment_lines = nil, subsequent_line = nil, continuation_connects_first_block = nil, content_adjacent = nil, options = nil, new_block = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an;if (sibling_trait == null) {
          sibling_trait = nil
        }
        list_type = (($a = list_block).$context || $mm('context')).call($a);
        if ((($b = list_type)['$=='] || $mm('==')).call($b, "dlist")) {
          list_term = (($c = __scope.ListItem).$new || $mm('new')).call($c, list_block, (($d = match)['$[]'] || $mm('[]')).call($d, 1));
          list_item = (($e = __scope.ListItem).$new || $mm('new')).call($e, list_block, (($f = match)['$[]'] || $mm('[]')).call($f, 3));
          has_text = ($g = (($h = (($i = (($j = match)['$[]'] || $mm('[]')).call($j, 3)).$to_s || $mm('to_s')).call($i))['$empty?'] || $mm('empty?')).call($h), ($g === nil || $g === false));
          } else {
          list_item = (($g = __scope.ListItem).$new || $mm('new')).call($g, list_block, (($k = match)['$[]'] || $mm('[]')).call($k, 2));
          if (($l = ($m = sibling_trait, ($m === nil || $m === false))) !== false && $l !== nil) {
            sibling_trait = (($l = this).$resolve_list_marker || $mm('resolve_list_marker')).call($l, list_type, (($m = match)['$[]'] || $mm('[]')).call($m, 1), (($n = (($o = list_block).$buffer || $mm('buffer')).call($o)).$size || $mm('size')).call($n), true)
          };
          (($p = list_item)['$marker='] || $mm('marker=')).call($p, sibling_trait);
          has_text = true;
        };
        (($q = reader).$get_line || $mm('get_line')).call($q);
        list_item_reader = (($r = __scope.Reader).$new || $mm('new')).call($r, (($s = this).$grab_lines_for_list_item || $mm('grab_lines_for_list_item')).call($s, reader, list_type, sibling_trait, has_text));
        if (($t = (($u = list_item_reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($u)) !== false && $t !== nil) {
          comment_lines = (($t = list_item_reader).$consume_line_comments || $mm('consume_line_comments')).call($t);
          subsequent_line = (($v = list_item_reader).$peek_line || $mm('peek_line')).call($v);
          if (($w = (($x = comment_lines)['$empty?'] || $mm('empty?')).call($x)) === false || $w === nil) {
            (($w = list_item_reader).$unshift || $mm('unshift')).apply($w, [].concat(comment_lines))
          };
          if (($y = ($z = (($aa = subsequent_line)['$nil?'] || $mm('nil?')).call($aa), ($z === nil || $z === false))) !== false && $y !== nil) {
            continuation_connects_first_block = (($y = subsequent_line)['$=='] || $mm('==')).call($y, "");
            if (($z = ($ab = ($ab = continuation_connects_first_block, ($ab === nil || $ab === false)), $ab !== false && $ab !== nil ? ($ab = (($ac = list_type)['$=='] || $mm('==')).call($ac, "dlist"), ($ab === nil || $ab === false)) : $ab)) !== false && $z !== nil) {
              has_text = false
            };
            content_adjacent = ($z = (($ab = (($ad = subsequent_line).$chomp || $mm('chomp')).call($ad))['$empty?'] || $mm('empty?')).call($ab), ($z === nil || $z === false));
            } else {
            continuation_connects_first_block = false;
            content_adjacent = false;
          };
          options = __hash2(["text"], {"text": ($z = has_text, ($z === nil || $z === false))});
          while (($ae = (($af = list_item_reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($af)) !== false && $ae !== nil){new_block = (($ae = this).$next_block || $mm('next_block')).call($ae, list_item_reader, list_block, __hash2([], {}), options);
          if (($ag = (($ah = new_block)['$nil?'] || $mm('nil?')).call($ah)) === false || $ag === nil) {
            (($ag = (($ai = list_item).$blocks || $mm('blocks')).call($ai))['$<<'] || $mm('<<')).call($ag, new_block)
          };};
          (($z = list_item).$fold_first || $mm('fold_first')).call($z, continuation_connects_first_block, content_adjacent);
        };
        if ((($aj = list_type)['$=='] || $mm('==')).call($aj, "dlist")) {
          if (($ak = (($al = (($am = list_item)['$text?'] || $mm('text?')).call($am)), $al !== false && $al !== nil ? $al : (($an = list_item)['$blocks?'] || $mm('blocks?')).call($an))) === false || $ak === nil) {
            list_item = nil
          };
          return [list_term, list_item];
          } else {
          return list_item
        };
      });

      Lexer._defs('$grab_lines_for_list_item', function(reader, list_type, sibling_trait, has_text) {
        var buffer = nil, continuation = nil, within_nested_list = nil, detached_continuation = nil, this_line = nil, prev_line = nil, match = nil, nested_list_type = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, TMP_10, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, TMP_11, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, $bd, $be, $bf, $bg, $bh, $bi, $bj, TMP_12, $bk, $bl, $bm, TMP_13, $bn, $bo, $bp, $bq, $br, $bs, $bt, $bu, $bv, $bw, $bx, TMP_14, $by, $bz, $ca, $cb, $cc, $cd, $ce, $cf, $cg, $ch, $ci, $cj, $ck, $cl, $cm, $cn;if (sibling_trait == null) {
          sibling_trait = nil
        }if (has_text == null) {
          has_text = true
        }
        buffer = [];
        continuation = "inactive";
        within_nested_list = false;
        detached_continuation = nil;
        while (($b = (($c = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($c)) !== false && $b !== nil){this_line = (($b = reader).$get_line || $mm('get_line')).call($b);
        if (($d = (($e = this)['$is_sibling_list_item?'] || $mm('is_sibling_list_item?')).call($e, this_line, list_type, sibling_trait)) !== false && $d !== nil) {
          break;
        };
        prev_line = (function() { if (($d = (($f = buffer)['$empty?'] || $mm('empty?')).call($f)) !== false && $d !== nil) {
          return nil
          } else {
          return (($d = (($g = buffer).$last || $mm('last')).call($g)).$chomp || $mm('chomp')).call($d)
        }; return nil; }).call(this);
        if ((($h = prev_line)['$=='] || $mm('==')).call($h, __scope.LIST_CONTINUATION)) {
          if ((($i = continuation)['$=='] || $mm('==')).call($i, "inactive")) {
            continuation = "active";
            has_text = true;
            if (($j = within_nested_list) === false || $j === nil) {
              (($j = buffer)['$[]='] || $mm('[]=')).call($j, -1, "")
            };
          };
          if ((($k = (($l = this_line).$chomp || $mm('chomp')).call($l))['$=='] || $mm('==')).call($k, __scope.LIST_CONTINUATION)) {
            if (($m = ($n = (($o = continuation)['$=='] || $mm('==')).call($o, "frozen"), ($n === nil || $n === false))) !== false && $m !== nil) {
              continuation = "frozen";
              (($m = buffer)['$<<'] || $mm('<<')).call($m, this_line);
            };
            this_line = nil;
            continue;;
          };
        };
        if (($n = match = (($p = this)['$is_delimited_block?'] || $mm('is_delimited_block?')).call($p, this_line, true)) !== false && $n !== nil) {
          if ((($n = continuation)['$=='] || $mm('==')).call($n, "active")) {
            (($q = buffer)['$<<'] || $mm('<<')).call($q, this_line);
            (($r = buffer).$concat || $mm('concat')).call($r, (($s = reader).$grab_lines_until || $mm('grab_lines_until')).call($s, __hash2(["terminator", "grab_last_line"], {"terminator": (($t = match).$terminator || $mm('terminator')).call($t), "grab_last_line": true})));
            continuation = "inactive";
            } else {
            break;
          }
          } else {
          if (($u = ($v = (($v = (($w = list_type)['$=='] || $mm('==')).call($w, "dlist")) ? ($x = (($y = continuation)['$=='] || $mm('==')).call($y, "active"), ($x === nil || $x === false)) : $v), $v !== false && $v !== nil ? (($v = this_line).$match || $mm('match')).call($v, (($x = __scope.REGEXP)['$[]'] || $mm('[]')).call($x, "attr_line")) : $v)) !== false && $u !== nil) {
            break;
            } else {
            if (($u = (($z = (($aa = continuation)['$=='] || $mm('==')).call($aa, "active")) ? ($ab = (($ac = (($ad = this_line).$chomp || $mm('chomp')).call($ad))['$empty?'] || $mm('empty?')).call($ac), ($ab === nil || $ab === false)) : $z)) !== false && $u !== nil) {
              if (($u = (($z = this_line).$match || $mm('match')).call($z, (($ab = __scope.REGEXP)['$[]'] || $mm('[]')).call($ab, "lit_par"))) !== false && $u !== nil) {
                (($u = reader).$unshift_line || $mm('unshift_line')).call($u, this_line);
                (($ae = buffer).$concat || $mm('concat')).call($ae, ($af = (($ag = reader).$grab_lines_until || $mm('grab_lines_until')), $af._p = (TMP_10 = function(line) {

                  var self = TMP_10._s || this, $a, $b, $c;
                  if (line == null) line = nil;

                  return (($a = (($b = list_type)['$=='] || $mm('==')).call($b, "dlist")) ? (($c = self)['$is_sibling_list_item?'] || $mm('is_sibling_list_item?')).call($c, line, list_type, sibling_trait) : $a)
                }, TMP_10._s = this, TMP_10), $af).call($ag, __hash2(["preserve_last_line", "break_on_blank_lines", "break_on_list_continuation"], {"preserve_last_line": true, "break_on_blank_lines": true, "break_on_list_continuation": true})));
                continuation = "inactive";
                } else {
                if (($af = (($ah = (($ai = (($aj = this_line).$match || $mm('match')).call($aj, (($ak = __scope.REGEXP)['$[]'] || $mm('[]')).call($ak, "blk_title"))), $ai !== false && $ai !== nil ? $ai : (($al = this_line).$match || $mm('match')).call($al, (($am = __scope.REGEXP)['$[]'] || $mm('[]')).call($am, "attr_line")))), $ah !== false && $ah !== nil ? $ah : (($ai = this_line).$match || $mm('match')).call($ai, (($an = __scope.REGEXP)['$[]'] || $mm('[]')).call($an, "attr_entry")))) !== false && $af !== nil) {
                  (($af = buffer)['$<<'] || $mm('<<')).call($af, this_line)
                  } else {
                  if (($ah = nested_list_type = ($ao = (($ap = (function() { if (within_nested_list !== false && within_nested_list !== nil) {
                    return ["dlist"]
                    } else {
                    return __scope.NESTABLE_LIST_CONTEXTS
                  }; return nil; }).call(this)).$detect || $mm('detect')), $ao._p = (TMP_11 = function(ctx) {

                    var self = TMP_11._s || this, $a, $b;
                    if (ctx == null) ctx = nil;

                    return (($a = this_line).$match || $mm('match')).call($a, (($b = __scope.REGEXP)['$[]'] || $mm('[]')).call($b, ctx))
                  }, TMP_11._s = this, TMP_11), $ao).call($ap)) !== false && $ah !== nil) {
                    within_nested_list = true;
                    if (($ah = (($ao = (($aq = nested_list_type)['$=='] || $mm('==')).call($aq, "dlist")) ? (($ar = (($as = (($at = __gvars["~"])['$[]'] || $mm('[]')).call($at, 3)).$to_s || $mm('to_s')).call($as))['$empty?'] || $mm('empty?')).call($ar) : $ao)) !== false && $ah !== nil) {
                      has_text = false
                    };
                  };
                  (($ah = buffer)['$<<'] || $mm('<<')).call($ah, this_line);
                  continuation = "inactive";
                }
              }
              } else {
              if (($ao = ($au = ($au = (($av = prev_line)['$nil?'] || $mm('nil?')).call($av), ($au === nil || $au === false)), $au !== false && $au !== nil ? (($au = (($aw = prev_line).$chomp || $mm('chomp')).call($aw))['$empty?'] || $mm('empty?')).call($au) : $au)) !== false && $ao !== nil) {
                if (($ao = (($ax = (($ay = this_line).$chomp || $mm('chomp')).call($ay))['$empty?'] || $mm('empty?')).call($ax)) !== false && $ao !== nil) {
                  (($ao = reader).$skip_blank_lines || $mm('skip_blank_lines')).call($ao);
                  this_line = (($az = reader).$get_line || $mm('get_line')).call($az);
                  if (($ba = (($bb = (($bc = this_line)['$nil?'] || $mm('nil?')).call($bc)), $bb !== false && $bb !== nil ? $bb : (($bd = this)['$is_sibling_list_item?'] || $mm('is_sibling_list_item?')).call($bd, this_line, list_type, sibling_trait))) !== false && $ba !== nil) {
                    break;
                  };
                };
                if ((($ba = (($bb = this_line).$chomp || $mm('chomp')).call($bb))['$=='] || $mm('==')).call($ba, __scope.LIST_CONTINUATION)) {
                  detached_continuation = (($be = buffer).$size || $mm('size')).call($be);
                  (($bf = buffer)['$<<'] || $mm('<<')).call($bf, this_line);
                  } else {
                  if (has_text !== false && has_text !== nil) {
                    if (($bg = (($bh = this_line).$match || $mm('match')).call($bh, (($bi = __scope.REGEXP)['$[]'] || $mm('[]')).call($bi, "lit_par"))) !== false && $bg !== nil) {
                      (($bg = reader).$unshift_line || $mm('unshift_line')).call($bg, this_line);
                      (($bj = buffer).$concat || $mm('concat')).call($bj, ($bk = (($bl = reader).$grab_lines_until || $mm('grab_lines_until')), $bk._p = (TMP_12 = function(line) {

                        var self = TMP_12._s || this, $a, $b, $c;
                        if (line == null) line = nil;

                        return (($a = (($b = list_type)['$=='] || $mm('==')).call($b, "dlist")) ? (($c = self)['$is_sibling_list_item?'] || $mm('is_sibling_list_item?')).call($c, line, list_type, sibling_trait) : $a)
                      }, TMP_12._s = this, TMP_12), $bk).call($bl, __hash2(["preserve_last_line", "break_on_blank_lines", "break_on_list_continuation"], {"preserve_last_line": true, "break_on_blank_lines": true, "break_on_list_continuation": true})));
                      } else {
                      if (($bk = (($bm = this)['$is_sibling_list_item?'] || $mm('is_sibling_list_item?')).call($bm, this_line, list_type, sibling_trait)) !== false && $bk !== nil) {
                        break;
                        } else {
                        if (($bk = nested_list_type = ($bn = (($bo = __scope.NESTABLE_LIST_CONTEXTS).$detect || $mm('detect')), $bn._p = (TMP_13 = function(ctx) {

                          var self = TMP_13._s || this, $a, $b;
                          if (ctx == null) ctx = nil;

                          return (($a = this_line).$match || $mm('match')).call($a, (($b = __scope.REGEXP)['$[]'] || $mm('[]')).call($b, ctx))
                        }, TMP_13._s = this, TMP_13), $bn).call($bo)) !== false && $bk !== nil) {
                          (($bk = buffer)['$<<'] || $mm('<<')).call($bk, this_line);
                          within_nested_list = true;
                          if (($bn = (($bp = (($bq = nested_list_type)['$=='] || $mm('==')).call($bq, "dlist")) ? (($br = (($bs = (($bt = __gvars["~"])['$[]'] || $mm('[]')).call($bt, 3)).$to_s || $mm('to_s')).call($bs))['$empty?'] || $mm('empty?')).call($br) : $bp)) !== false && $bn !== nil) {
                            has_text = false
                          };
                          } else {
                          break;
                        }
                      }
                    }
                    } else {
                    if (($bn = within_nested_list) === false || $bn === nil) {
                      (($bn = buffer).$pop || $mm('pop')).call($bn)
                    };
                    (($bp = buffer)['$<<'] || $mm('<<')).call($bp, this_line);
                    has_text = true;
                  }
                };
                } else {
                if (($bu = ($bv = (($bw = (($bx = this_line).$chomp || $mm('chomp')).call($bx))['$empty?'] || $mm('empty?')).call($bw), ($bv === nil || $bv === false))) !== false && $bu !== nil) {
                  has_text = true
                };
                if (($bu = nested_list_type = ($bv = (($by = (function() { if (within_nested_list !== false && within_nested_list !== nil) {
                  return ["dlist"]
                  } else {
                  return __scope.NESTABLE_LIST_CONTEXTS
                }; return nil; }).call(this)).$detect || $mm('detect')), $bv._p = (TMP_14 = function(ctx) {

                  var self = TMP_14._s || this, $a, $b;
                  if (ctx == null) ctx = nil;

                  return (($a = this_line).$match || $mm('match')).call($a, (($b = __scope.REGEXP)['$[]'] || $mm('[]')).call($b, ctx))
                }, TMP_14._s = this, TMP_14), $bv).call($by)) !== false && $bu !== nil) {
                  within_nested_list = true;
                  if (($bu = (($bv = (($bz = nested_list_type)['$=='] || $mm('==')).call($bz, "dlist")) ? (($ca = (($cb = (($cc = __gvars["~"])['$[]'] || $mm('[]')).call($cc, 3)).$to_s || $mm('to_s')).call($cb))['$empty?'] || $mm('empty?')).call($ca) : $bv)) !== false && $bu !== nil) {
                    has_text = false
                  };
                };
                (($bu = buffer)['$<<'] || $mm('<<')).call($bu, this_line);
              }
            }
          }
        };
        this_line = nil;};
        if (($a = ($bv = (($cd = this_line)['$nil?'] || $mm('nil?')).call($cd), ($bv === nil || $bv === false))) !== false && $a !== nil) {
          (($a = reader).$unshift_line || $mm('unshift_line')).call($a, this_line)
        };
        if (detached_continuation !== false && detached_continuation !== nil) {
          (($bv = buffer).$delete_at || $mm('delete_at')).call($bv, detached_continuation)
        };
        while (($cf = ($cg = ($cg = (($ch = buffer)['$empty?'] || $mm('empty?')).call($ch), ($cg === nil || $cg === false)), $cg !== false && $cg !== nil ? (($cg = (($ci = (($cj = buffer).$last || $mm('last')).call($cj)).$chomp || $mm('chomp')).call($ci))['$empty?'] || $mm('empty?')).call($cg) : $cg)) !== false && $cf !== nil){(($cf = buffer).$pop || $mm('pop')).call($cf)};
        if (($ce = ($ck = ($ck = (($cl = buffer)['$empty?'] || $mm('empty?')).call($cl), ($ck === nil || $ck === false)), $ck !== false && $ck !== nil ? (($ck = (($cm = (($cn = buffer).$last || $mm('last')).call($cn)).$chomp || $mm('chomp')).call($cm))['$=='] || $mm('==')).call($ck, __scope.LIST_CONTINUATION) : $ck)) !== false && $ce !== nil) {
          (($ce = buffer).$pop || $mm('pop')).call($ce)
        };
        return buffer;
      });

      Lexer._defs('$initialize_section', function(reader, parent, attributes) {
        var section = nil, parts = nil, document = nil, number = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap;if (attributes == null) {
          attributes = __hash2([], {})
        }
        section = (($a = __scope.Section).$new || $mm('new')).call($a, parent);
        parts = (($b = this).$parse_section_title || $mm('parse_section_title')).call($b, reader, (($c = section).$document || $mm('document')).call($c));
        (($d = section)['$id='] || $mm('id=')).call($d, (($e = parts)['$[]'] || $mm('[]')).call($e, 0));
        (($f = section)['$title='] || $mm('title=')).call($f, (($g = parts)['$[]'] || $mm('[]')).call($g, 1));
        (($h = section)['$level='] || $mm('level=')).call($h, (($i = parts)['$[]'] || $mm('[]')).call($i, 2));
        if (($j = ($k = (($k = (($l = section).$id || $mm('id')).call($l))['$nil?'] || $mm('nil?')).call($k), $k !== false && $k !== nil ? (($m = attributes)['$has_key?'] || $mm('has_key?')).call($m, "id") : $k)) !== false && $j !== nil) {
          (($j = section)['$id='] || $mm('id=')).call($j, (($n = attributes)['$[]'] || $mm('[]')).call($n, "id"))
          } else {
          ($o = section, (($p = (($q = $o).$id || $mm('id')).call($q)), $p !== false && $p !== nil ? $p : (($r = $o)['$id='] || $mm('id=')).call($r, (($s = section).$generate_id || $mm('generate_id')).call($s))))
        };
        if (($o = (($p = section).$id || $mm('id')).call($p)) !== false && $o !== nil) {
          (($o = (($t = section).$document || $mm('document')).call($t)).$register || $mm('register')).call($o, "ids", [(($u = section).$id || $mm('id')).call($u), (($v = section).$title || $mm('title')).call($v)])
        };
        if (($w = (($x = attributes)['$[]'] || $mm('[]')).call($x, 1)) !== false && $w !== nil) {
          (($w = section)['$sectname='] || $mm('sectname=')).call($w, (($y = attributes)['$[]'] || $mm('[]')).call($y, 1));
          (($z = section)['$special='] || $mm('special=')).call($z, true);
          document = (($aa = parent).$document || $mm('document')).call($aa);
          if (($ab = ($ac = (($ac = (($ad = (($ae = section).$sectname || $mm('sectname')).call($ae))['$=='] || $mm('==')).call($ad, "appendix")) ? ($af = (($ag = attributes)['$has_key?'] || $mm('has_key?')).call($ag, "caption"), ($af === nil || $af === false)) : $ac), $ac !== false && $ac !== nil ? ($ac = (($af = (($ah = document).$attributes || $mm('attributes')).call($ah))['$has_key?'] || $mm('has_key?')).call($af, "caption"), ($ac === nil || $ac === false)) : $ac)) !== false && $ab !== nil) {
            number = (($ab = document).$counter || $mm('counter')).call($ab, "appendix-number", "A");
            (($ac = attributes)['$[]='] || $mm('[]=')).call($ac, "caption", "" + ((($ai = (($aj = document).$attributes || $mm('attributes')).call($aj))['$[]'] || $mm('[]')).call($ai, "appendix-caption")) + " " + (number) + ": ");
            (($ak = (($al = __scope.AttributeEntry).$new || $mm('new')).call($al, "appendix-number", number)).$save_to || $mm('save_to')).call($ak, attributes);
          };
          } else {
          (($am = section)['$sectname='] || $mm('sectname=')).call($am, "sect" + ((($an = section).$level || $mm('level')).call($an)))
        };
        (($ao = section).$update_attributes || $mm('update_attributes')).call($ao, attributes);
        (($ap = reader).$skip_blank_lines || $mm('skip_blank_lines')).call($ap);
        return section;
      });

      Lexer._defs('$section_level', function(line) {
        var $a, $b;
        return (($a = __scope.SECTION_LEVELS)['$[]'] || $mm('[]')).call($a, (($b = line)['$[]'] || $mm('[]')).call($b, __range(0, 0, false)))
      });

      Lexer._defs('$single_line_section_level', function(line) {
        var len = nil, $a, $b, $c;
        len = ($a = (($c = line).$length || $mm('length')).call($c), $b = 1, typeof($a) === 'number' ? $a - $b : $a['$-']($b));
        if ((($a = len)['$<'] || $mm('<')).call($a, 0)) {
          return 0
          } else {
          return len
        };
      });

      Lexer._defs('$is_next_line_section?', function(reader, attributes) {
        var $a, $b, $c, $d, $e, $f, $g;
        if (($a = ($b = ($b = (($c = (($d = attributes)['$[]'] || $mm('[]')).call($d, 1))['$nil?'] || $mm('nil?')).call($c), ($b === nil || $b === false)), $b !== false && $b !== nil ? (($b = ["float", "discrete"])['$include?'] || $mm('include?')).call($b, (($e = attributes)['$[]'] || $mm('[]')).call($e, 1)) : $b)) !== false && $a !== nil) {
          return false
        };
        if (($a = ($f = (($g = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($g), ($f === nil || $f === false))) !== false && $a !== nil) {
          return false
        };
        return (($a = this)['$is_section_title?'] || $mm('is_section_title?')).apply($a, [].concat((($f = reader).$peek_lines || $mm('peek_lines')).call($f, 2)));
      });

      Lexer._defs('$is_next_line_document_title?', function(reader, attributes) {
        var $a, $b;
        return (($a = (($b = this)['$is_next_line_section?'] || $mm('is_next_line_section?')).call($b, reader, attributes))['$=='] || $mm('==')).call($a, 0)
      });

      Lexer._defs('$is_section_title?', function(line1, line2) {
        var level = nil, $a, $b, $c;if (line2 == null) {
          line2 = nil
        }
        if (($a = level = (($b = this)['$is_single_line_section_title?'] || $mm('is_single_line_section_title?')).call($b, line1)) !== false && $a !== nil) {
          return level
          } else {
          if (($a = level = (($c = this)['$is_two_line_section_title?'] || $mm('is_two_line_section_title?')).call($c, line1, line2)) !== false && $a !== nil) {
            return level
            } else {
            return false
          }
        }
      });

      Lexer._defs('$is_single_line_section_title?', function(line1) {
        var match = nil, $a, $b, $c, $d, $e;
        if (($a = ($b = ($b = (($c = line1)['$nil?'] || $mm('nil?')).call($c), ($b === nil || $b === false)), $b !== false && $b !== nil ? match = (($b = line1).$match || $mm('match')).call($b, (($d = __scope.REGEXP)['$[]'] || $mm('[]')).call($d, "section_title")) : $b)) !== false && $a !== nil) {
          return (($a = this).$single_line_section_level || $mm('single_line_section_level')).call($a, (($e = match)['$[]'] || $mm('[]')).call($e, 1))
          } else {
          return false
        }
      });

      Lexer._defs('$is_two_line_section_title?', function(line1, line2) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o;
        if (($a = ($b = ($b = ($b = ($b = ($b = (($c = line1)['$nil?'] || $mm('nil?')).call($c), ($b === nil || $b === false)), $b !== false && $b !== nil ? ($b = (($d = line2)['$nil?'] || $mm('nil?')).call($d), ($b === nil || $b === false)) : $b), $b !== false && $b !== nil ? (($b = line1).$match || $mm('match')).call($b, (($e = __scope.REGEXP)['$[]'] || $mm('[]')).call($e, "section_name")) : $b), $b !== false && $b !== nil ? (($f = line2).$match || $mm('match')).call($f, (($g = __scope.REGEXP)['$[]'] || $mm('[]')).call($g, "section_underline")) : $b), $b !== false && $b !== nil ? (($h = (($i = ($j = (($l = (($m = line1).$chomp || $mm('chomp')).call($m)).$size || $mm('size')).call($l), $k = (($n = (($o = line2).$chomp || $mm('chomp')).call($o)).$size || $mm('size')).call($n), typeof($j) === 'number' ? $j - $k : $j['$-']($k))).$abs || $mm('abs')).call($i))['$<='] || $mm('<=')).call($h, 1) : $b)) !== false && $a !== nil) {
          return (($a = this).$section_level || $mm('section_level')).call($a, line2)
          } else {
          return false
        }
      });

      Lexer._defs('$parse_section_title', function(reader, document) {
        var line1 = nil, sect_id = nil, sect_title = nil, sect_level = nil, single_line = nil, match = nil, line2 = nil, name_match = nil, anchor_match = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae;
        line1 = (($a = reader).$get_line || $mm('get_line')).call($a);
        sect_id = nil;
        sect_title = nil;
        sect_level = -1;
        single_line = true;
        if (($b = match = (($c = line1).$match || $mm('match')).call($c, (($d = __scope.REGEXP)['$[]'] || $mm('[]')).call($d, "section_title"))) !== false && $b !== nil) {
          sect_id = (($b = match)['$[]'] || $mm('[]')).call($b, 3);
          sect_title = (($e = match)['$[]'] || $mm('[]')).call($e, 2);
          sect_level = (($f = this).$single_line_section_level || $mm('single_line_section_level')).call($f, (($g = match)['$[]'] || $mm('[]')).call($g, 1));
          } else {
          line2 = (($h = reader).$peek_line || $mm('peek_line')).call($h);
          if (($i = ($j = ($j = ($j = ($j = (($k = line2)['$nil?'] || $mm('nil?')).call($k), ($j === nil || $j === false)), $j !== false && $j !== nil ? name_match = (($j = line1).$match || $mm('match')).call($j, (($l = __scope.REGEXP)['$[]'] || $mm('[]')).call($l, "section_name")) : $j), $j !== false && $j !== nil ? (($m = line2).$match || $mm('match')).call($m, (($n = __scope.REGEXP)['$[]'] || $mm('[]')).call($n, "section_underline")) : $j), $j !== false && $j !== nil ? (($o = (($p = ($q = (($s = (($t = line1).$chomp || $mm('chomp')).call($t)).$size || $mm('size')).call($s), $r = (($u = (($v = line2).$chomp || $mm('chomp')).call($v)).$size || $mm('size')).call($u), typeof($q) === 'number' ? $q - $r : $q['$-']($r))).$abs || $mm('abs')).call($p))['$<='] || $mm('<=')).call($o, 1) : $j)) !== false && $i !== nil) {
            if (($i = anchor_match = (($q = (($r = name_match)['$[]'] || $mm('[]')).call($r, 1)).$match || $mm('match')).call($q, (($w = __scope.REGEXP)['$[]'] || $mm('[]')).call($w, "anchor_embedded"))) !== false && $i !== nil) {
              sect_id = (($i = anchor_match)['$[]'] || $mm('[]')).call($i, 2);
              sect_title = (($x = anchor_match)['$[]'] || $mm('[]')).call($x, 1);
              } else {
              sect_title = (($y = name_match)['$[]'] || $mm('[]')).call($y, 1)
            };
            sect_level = (($z = this).$section_level || $mm('section_level')).call($z, line2);
            single_line = false;
            (($aa = reader).$get_line || $mm('get_line')).call($aa);
          };
        };
        if ((($ab = sect_level)['$>='] || $mm('>=')).call($ab, 0)) {
          sect_level = (($ac = sect_level)['$+'] || $mm('+')).call($ac, (($ad = (($ae = document).$attr || $mm('attr')).call($ae, "leveloffset", 0)).$to_i || $mm('to_i')).call($ad))
        };
        return [sect_id, sect_title, sect_level, single_line];
      });

      Lexer._defs('$parse_header_metadata', function(reader, document) {
        var metadata = nil, author_metadata = nil, keys = nil, author_line = nil, rev_metadata = nil, rev_line = nil, match = nil, $a, $b, $c, $d, $e, $f, $g, TMP_15, $h, $i, $j, $k, $l, TMP_19, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, TMP_20, TMP_21, $al, $am;if (document == null) {
          document = nil
        }
        (($a = this).$process_attribute_entries || $mm('process_attribute_entries')).call($a, reader, document);
        metadata = __hash2([], {});
        if (($b = ($c = (($c = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($c), $c !== false && $c !== nil ? ($d = (($e = (($f = (($g = reader).$peek_line || $mm('peek_line')).call($g)).$chomp || $mm('chomp')).call($f))['$empty?'] || $mm('empty?')).call($e), ($d === nil || $d === false)) : $c)) !== false && $b !== nil) {
          author_metadata = __hash2([], {});
          keys = ["author", "authorinitials", "firstname", "middlename", "lastname", "email"];
          author_line = (($b = reader).$get_line || $mm('get_line')).call($b);
          ($d = (($h = (($i = author_line).$split || $mm('split')).call($i, (($j = __scope.REGEXP)['$[]'] || $mm('[]')).call($j, "semicolon_delim"))).$each_with_index || $mm('each_with_index')), $d._p = (TMP_15 = function(author_entry, idx) {

            var map = nil, match = nil, fname = nil, mname = nil, lname = nil, self = TMP_15._s || this, $a, $b, $c, $d, TMP_16, $e, TMP_17, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, $bd, $be, $bf, $bg, $bh, $bi, $bj, $bk, $bl, $bm, $bn, $bo, $bp, $bq, $br, TMP_18, $bs, $bt, $bu, $bv, $bw, $bx, $by, $bz;
            if (author_entry == null) author_entry = nil;
if (idx == null) idx = nil;

            author_entry = (($a = author_entry).$strip || $mm('strip')).call($a);
            if (($b = (($c = author_entry)['$empty?'] || $mm('empty?')).call($c)) !== false && $b !== nil) {
              return nil;
            };
            map = __hash2([], {});
            if (($b = (($d = idx)['$zero?'] || $mm('zero?')).call($d)) !== false && $b !== nil) {
              ($b = (($e = keys).$each || $mm('each')), $b._p = (TMP_16 = function(key) {

                var self = TMP_16._s || this, $a, $b;
                if (key == null) key = nil;

                return (($a = map)['$[]='] || $mm('[]=')).call($a, (($b = key).$to_sym || $mm('to_sym')).call($b), key)
              }, TMP_16._s = self, TMP_16), $b).call($e)
              } else {
              ($b = (($f = keys).$each || $mm('each')), $b._p = (TMP_17 = function(key) {

                var self = TMP_17._s || this, $a, $b, $c, $d;
                if (key == null) key = nil;

                return (($a = map)['$[]='] || $mm('[]=')).call($a, (($b = key).$to_sym || $mm('to_sym')).call($b), "" + (key) + "_" + (($c = idx, $d = 1, typeof($c) === 'number' ? $c + $d : $c['$+']($d))))
              }, TMP_17._s = self, TMP_17), $b).call($f)
            };
            if (($b = match = (($g = author_entry).$match || $mm('match')).call($g, (($h = __scope.REGEXP)['$[]'] || $mm('[]')).call($h, "author_info"))) !== false && $b !== nil) {
              (($b = author_metadata)['$[]='] || $mm('[]=')).call($b, (($i = map)['$[]'] || $mm('[]')).call($i, "firstname"), fname = (($j = (($k = match)['$[]'] || $mm('[]')).call($k, 1)).$tr || $mm('tr')).call($j, "_", " "));
              (($l = author_metadata)['$[]='] || $mm('[]=')).call($l, (($m = map)['$[]'] || $mm('[]')).call($m, "author"), fname);
              (($n = author_metadata)['$[]='] || $mm('[]=')).call($n, (($o = map)['$[]'] || $mm('[]')).call($o, "authorinitials"), (($p = fname)['$[]'] || $mm('[]')).call($p, 0, 1));
              if (($q = ($r = ($r = (($s = (($t = match)['$[]'] || $mm('[]')).call($t, 2))['$nil?'] || $mm('nil?')).call($s), ($r === nil || $r === false)), $r !== false && $r !== nil ? ($r = (($u = (($v = match)['$[]'] || $mm('[]')).call($v, 3))['$nil?'] || $mm('nil?')).call($u), ($r === nil || $r === false)) : $r)) !== false && $q !== nil) {
                (($q = author_metadata)['$[]='] || $mm('[]=')).call($q, (($r = map)['$[]'] || $mm('[]')).call($r, "middlename"), mname = (($w = (($x = match)['$[]'] || $mm('[]')).call($x, 2)).$tr || $mm('tr')).call($w, "_", " "));
                (($y = author_metadata)['$[]='] || $mm('[]=')).call($y, (($z = map)['$[]'] || $mm('[]')).call($z, "lastname"), lname = (($aa = (($ab = match)['$[]'] || $mm('[]')).call($ab, 3)).$tr || $mm('tr')).call($aa, "_", " "));
                (($ac = author_metadata)['$[]='] || $mm('[]=')).call($ac, (($ad = map)['$[]'] || $mm('[]')).call($ad, "author"), (($ae = [fname, mname, lname]).$join || $mm('join')).call($ae, " "));
                (($af = author_metadata)['$[]='] || $mm('[]=')).call($af, (($ag = map)['$[]'] || $mm('[]')).call($ag, "authorinitials"), (($ah = [(($ai = fname)['$[]'] || $mm('[]')).call($ai, 0, 1), (($aj = mname)['$[]'] || $mm('[]')).call($aj, 0, 1), (($ak = lname)['$[]'] || $mm('[]')).call($ak, 0, 1)]).$join || $mm('join')).call($ah));
                } else {
                if (($al = ($am = (($an = (($ao = match)['$[]'] || $mm('[]')).call($ao, 2))['$nil?'] || $mm('nil?')).call($an), ($am === nil || $am === false))) !== false && $al !== nil) {
                  (($al = author_metadata)['$[]='] || $mm('[]=')).call($al, (($am = map)['$[]'] || $mm('[]')).call($am, "lastname"), lname = (($ap = (($aq = match)['$[]'] || $mm('[]')).call($aq, 2)).$tr || $mm('tr')).call($ap, "_", " "));
                  (($ar = author_metadata)['$[]='] || $mm('[]=')).call($ar, (($as = map)['$[]'] || $mm('[]')).call($as, "author"), (($at = [fname, lname]).$join || $mm('join')).call($at, " "));
                  (($au = author_metadata)['$[]='] || $mm('[]=')).call($au, (($av = map)['$[]'] || $mm('[]')).call($av, "authorinitials"), (($aw = [(($ax = fname)['$[]'] || $mm('[]')).call($ax, 0, 1), (($ay = lname)['$[]'] || $mm('[]')).call($ay, 0, 1)]).$join || $mm('join')).call($aw));
                }
              };
              if (($az = (($ba = (($bb = match)['$[]'] || $mm('[]')).call($bb, 4))['$nil?'] || $mm('nil?')).call($ba)) === false || $az === nil) {
                (($az = author_metadata)['$[]='] || $mm('[]=')).call($az, (($bc = map)['$[]'] || $mm('[]')).call($bc, "email"), (($bd = match)['$[]'] || $mm('[]')).call($bd, 4))
              };
              } else {
              (($be = author_metadata)['$[]='] || $mm('[]=')).call($be, (($bf = map)['$[]'] || $mm('[]')).call($bf, "author"), (($bg = author_metadata)['$[]='] || $mm('[]=')).call($bg, (($bh = map)['$[]'] || $mm('[]')).call($bh, "firstname"), (($bi = (($bj = author_entry).$strip || $mm('strip')).call($bj)).$squeeze || $mm('squeeze')).call($bi, " ")));
              (($bk = author_metadata)['$[]='] || $mm('[]=')).call($bk, (($bl = map)['$[]'] || $mm('[]')).call($bl, "authorinitials"), (($bm = (($bn = author_metadata)['$[]'] || $mm('[]')).call($bn, (($bo = map)['$[]'] || $mm('[]')).call($bo, "firstname")))['$[]'] || $mm('[]')).call($bm, 0, 1));
            };
            (($bp = author_metadata)['$[]='] || $mm('[]=')).call($bp, "authorcount", ($bq = idx, $br = 1, typeof($bq) === 'number' ? $bq + $br : $bq['$+']($br)));
            if ((($bq = idx)['$=='] || $mm('==')).call($bq, 1)) {
              ($br = (($bs = keys).$each || $mm('each')), $br._p = (TMP_18 = function(key) {

                var self = TMP_18._s || this, $a, $b, $c;
                if (key == null) key = nil;

                if (($a = (($b = author_metadata)['$has_key?'] || $mm('has_key?')).call($b, key)) !== false && $a !== nil) {
                  return (($a = author_metadata)['$[]='] || $mm('[]=')).call($a, "" + (key) + "_1", (($c = author_metadata)['$[]'] || $mm('[]')).call($c, key))
                  } else {
                  return nil
                }
              }, TMP_18._s = self, TMP_18), $br).call($bs)
            };
            if (($br = (($bt = idx)['$zero?'] || $mm('zero?')).call($bt)) !== false && $br !== nil) {
              return (($br = author_metadata)['$[]='] || $mm('[]=')).call($br, "authors", (($bu = author_metadata)['$[]'] || $mm('[]')).call($bu, (($bv = map)['$[]'] || $mm('[]')).call($bv, "author")))
              } else {
              return (($bw = author_metadata)['$[]='] || $mm('[]=')).call($bw, "authors", "" + ((($bx = author_metadata)['$[]'] || $mm('[]')).call($bx, "authors")) + ", " + ((($by = author_metadata)['$[]'] || $mm('[]')).call($by, (($bz = map)['$[]'] || $mm('[]')).call($bz, "author"))))
            };
          }, TMP_15._s = this, TMP_15), $d).call($h);
          if (($d = ($k = (($l = document)['$nil?'] || $mm('nil?')).call($l), ($k === nil || $k === false))) !== false && $d !== nil) {
            ($d = (($k = author_metadata).$map || $mm('map')), $d._p = (TMP_19 = function(key, val) {

              var self = TMP_19._s || this, $a, $b, $c, $d, $e, $f;
              if (key == null) key = nil;
if (val == null) val = nil;

              val = (function() { if (($a = (($b = val)['$is_a?'] || $mm('is_a?')).call($b, __scope.String)) !== false && $a !== nil) {
                return (($a = document).$apply_header_subs || $mm('apply_header_subs')).call($a, val)
                } else {
                return val
              }; return nil; }).call(self);
              if (($c = ($d = (($e = (($f = document).$attributes || $mm('attributes')).call($f))['$has_key?'] || $mm('has_key?')).call($e, key), ($d === nil || $d === false))) !== false && $c !== nil) {
                (($c = (($d = document).$attributes || $mm('attributes')).call($d))['$[]='] || $mm('[]=')).call($c, key, val)
              };
              return val;
            }, TMP_19._s = this, TMP_19), $d).call($k)
          };
          metadata = (($d = author_metadata).$dup || $mm('dup')).call($d);
          (($m = this).$process_attribute_entries || $mm('process_attribute_entries')).call($m, reader, document);
          rev_metadata = __hash2([], {});
          if (($n = ($o = (($o = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($o), $o !== false && $o !== nil ? ($p = (($q = (($r = (($s = reader).$peek_line || $mm('peek_line')).call($s)).$chomp || $mm('chomp')).call($r))['$empty?'] || $mm('empty?')).call($q), ($p === nil || $p === false)) : $o)) !== false && $n !== nil) {
            rev_line = (($n = reader).$get_line || $mm('get_line')).call($n);
            if (($p = match = (($t = rev_line).$match || $mm('match')).call($t, (($u = __scope.REGEXP)['$[]'] || $mm('[]')).call($u, "revision_info"))) !== false && $p !== nil) {
              (($p = rev_metadata)['$[]='] || $mm('[]=')).call($p, "revdate", (($v = (($w = match)['$[]'] || $mm('[]')).call($w, 2)).$strip || $mm('strip')).call($v));
              if (($x = (($y = (($z = match)['$[]'] || $mm('[]')).call($z, 1))['$nil?'] || $mm('nil?')).call($y)) === false || $x === nil) {
                (($x = rev_metadata)['$[]='] || $mm('[]=')).call($x, "revnumber", (($aa = (($ab = match)['$[]'] || $mm('[]')).call($ab, 1)).$rstrip || $mm('rstrip')).call($aa))
              };
              if (($ac = (($ad = (($ae = match)['$[]'] || $mm('[]')).call($ae, 3))['$nil?'] || $mm('nil?')).call($ad)) === false || $ac === nil) {
                (($ac = rev_metadata)['$[]='] || $mm('[]=')).call($ac, "revremark", (($af = (($ag = match)['$[]'] || $mm('[]')).call($ag, 3)).$rstrip || $mm('rstrip')).call($af))
              };
              } else {
              (($ah = reader).$unshift_line || $mm('unshift_line')).call($ah, rev_line)
            };
          };
          if (($ai = ($aj = (($ak = document)['$nil?'] || $mm('nil?')).call($ak), ($aj === nil || $aj === false))) !== false && $ai !== nil) {
            ($ai = (($aj = rev_metadata).$map || $mm('map')), $ai._p = (TMP_20 = function(key, val) {

              var self = TMP_20._s || this, $a, $b, $c, $d, $e;
              if (key == null) key = nil;
if (val == null) val = nil;

              val = (($a = document).$apply_header_subs || $mm('apply_header_subs')).call($a, val);
              if (($b = ($c = (($d = (($e = document).$attributes || $mm('attributes')).call($e))['$has_key?'] || $mm('has_key?')).call($d, key), ($c === nil || $c === false))) !== false && $b !== nil) {
                (($b = (($c = document).$attributes || $mm('attributes')).call($c))['$[]='] || $mm('[]=')).call($b, key, val)
              };
              return val;
            }, TMP_20._s = this, TMP_20), $ai).call($aj)
          };
          ($ai = (($al = rev_metadata).$each || $mm('each')), $ai._p = (TMP_21 = function(k, v) {

            var self = TMP_21._s || this, $a;
            if (k == null) k = nil;
if (v == null) v = nil;

            return (($a = metadata)['$[]='] || $mm('[]=')).call($a, k, v)
          }, TMP_21._s = this, TMP_21), $ai).call($al);
          (($ai = this).$process_attribute_entries || $mm('process_attribute_entries')).call($ai, reader, document);
          (($am = reader).$skip_blank_lines || $mm('skip_blank_lines')).call($am);
        };
        return metadata;
      });

      Lexer._defs('$parse_block_metadata_lines', function(reader, parent, attributes, options) {
        var $a, $b, $c, $d;if (attributes == null) {
          attributes = __hash2([], {})
        }if (options == null) {
          options = __hash2([], {})
        }
        while (($b = (($c = this).$parse_block_metadata_line || $mm('parse_block_metadata_line')).call($c, reader, parent, attributes, options)) !== false && $b !== nil){(($b = reader).$advance || $mm('advance')).call($b);
        (($d = reader).$skip_blank_lines || $mm('skip_blank_lines')).call($d);};
        return attributes;
      });

      Lexer._defs('$parse_block_metadata_line', function(reader, parent, attributes, options) {
        var next_line = nil, commentish = nil, match = nil, terminator = nil, id = nil, reftext = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae;if (options == null) {
          options = __hash2([], {})
        }
        if (($a = ($b = (($c = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($c), ($b === nil || $b === false))) !== false && $a !== nil) {
          return false
        };
        next_line = (($a = reader).$peek_line || $mm('peek_line')).call($a);
        if (($b = ($d = commentish = (($d = next_line)['$start_with?'] || $mm('start_with?')).call($d, "//"), $d !== false && $d !== nil ? match = (($e = next_line).$match || $mm('match')).call($e, (($f = __scope.REGEXP)['$[]'] || $mm('[]')).call($f, "comment_blk")) : $d)) !== false && $b !== nil) {
          terminator = (($b = match)['$[]'] || $mm('[]')).call($b, 0);
          (($g = reader).$grab_lines_until || $mm('grab_lines_until')).call($g, __hash2(["skip_first_line", "preserve_last_line", "terminator", "preprocess"], {"skip_first_line": true, "preserve_last_line": true, "terminator": terminator, "preprocess": false}));
          } else {
          if (($h = (($i = commentish !== false && commentish !== nil) ? (($j = next_line).$match || $mm('match')).call($j, (($k = __scope.REGEXP)['$[]'] || $mm('[]')).call($k, "comment")) : $i)) === false || $h === nil) {
            if (($h = ($i = ($i = (($l = options)['$[]'] || $mm('[]')).call($l, "text"), ($i === nil || $i === false)), $i !== false && $i !== nil ? match = (($i = next_line).$match || $mm('match')).call($i, (($m = __scope.REGEXP)['$[]'] || $mm('[]')).call($m, "attr_entry")) : $i)) !== false && $h !== nil) {
              (($h = this).$process_attribute_entry || $mm('process_attribute_entry')).call($h, reader, parent, attributes, match)
              } else {
              if (($n = match = (($o = next_line).$match || $mm('match')).call($o, (($p = __scope.REGEXP)['$[]'] || $mm('[]')).call($p, "anchor"))) !== false && $n !== nil) {
                (($n = (($q = (($r = match)['$[]'] || $mm('[]')).call($r, 1)).$split || $mm('split')).call($q, ","))._isArray ? $n : ($n = [$n])), id = ($n[0] == null ? nil : $n[0]), reftext = ($n[1] == null ? nil : $n[1]);
                (($n = attributes)['$[]='] || $mm('[]=')).call($n, "id", id);
                if (reftext !== false && reftext !== nil) {
                  (($s = attributes)['$[]='] || $mm('[]=')).call($s, "reftext", reftext);
                  (($t = (($u = parent).$document || $mm('document')).call($u)).$register || $mm('register')).call($t, "ids", [id, reftext]);
                };
                } else {
                if (($v = match = (($w = next_line).$match || $mm('match')).call($w, (($x = __scope.REGEXP)['$[]'] || $mm('[]')).call($x, "blk_attr_list"))) !== false && $v !== nil) {
                  (($v = (($y = parent).$document || $mm('document')).call($y)).$parse_attributes || $mm('parse_attributes')).call($v, (($z = match)['$[]'] || $mm('[]')).call($z, 1), [], __hash2(["sub_input", "into"], {"sub_input": true, "into": attributes}))
                  } else {
                  if (($aa = ($ab = ($ab = (($ac = options)['$[]'] || $mm('[]')).call($ac, "text"), ($ab === nil || $ab === false)), $ab !== false && $ab !== nil ? match = (($ab = next_line).$match || $mm('match')).call($ab, (($ad = __scope.REGEXP)['$[]'] || $mm('[]')).call($ad, "blk_title")) : $ab)) !== false && $aa !== nil) {
                    (($aa = attributes)['$[]='] || $mm('[]=')).call($aa, "title", (($ae = match)['$[]'] || $mm('[]')).call($ae, 1))
                    } else {
                    return false
                  }
                }
              }
            }
          }
        };
        return true;
      });

      Lexer._defs('$process_attribute_entries', function(reader, parent, attributes) {
        var $a, $b, $c, $d, $e;if (attributes == null) {
          attributes = nil
        }
        (($a = reader).$skip_comment_lines || $mm('skip_comment_lines')).call($a);
        while (($c = (($d = this).$process_attribute_entry || $mm('process_attribute_entry')).call($d, reader, parent, attributes)) !== false && $c !== nil){(($c = reader).$advance || $mm('advance')).call($c);
        (($e = reader).$skip_comment_lines || $mm('skip_comment_lines')).call($e);};
      });

      Lexer._defs('$process_attribute_entry', function(reader, parent, attributes, match) {
        var name = nil, value = nil, next_line = nil, accessible = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad;if (attributes == null) {
          attributes = nil
        }if (match == null) {
          match = nil
        }
        (($a = match), $a !== false && $a !== nil ? $a : match = (function() { if (($b = (($c = reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($c)) !== false && $b !== nil) {
          return (($b = (($d = reader).$peek_line || $mm('peek_line')).call($d)).$match || $mm('match')).call($b, (($e = __scope.REGEXP)['$[]'] || $mm('[]')).call($e, "attr_entry"))
          } else {
          return nil
        }; return nil; }).call(this));
        if (match !== false && match !== nil) {
          name = (($a = match)['$[]'] || $mm('[]')).call($a, 1);
          value = (function() { if (($f = (($g = (($h = match)['$[]'] || $mm('[]')).call($h, 2))['$nil?'] || $mm('nil?')).call($g)) !== false && $f !== nil) {
            return ""
            } else {
            return (($f = match)['$[]'] || $mm('[]')).call($f, 2)
          }; return nil; }).call(this);
          if (($i = (($j = value)['$end_with?'] || $mm('end_with?')).call($j, __scope.LINE_BREAK)) !== false && $i !== nil) {
            value = (($i = (($k = value).$chop || $mm('chop')).call($k)).$rstrip || $mm('rstrip')).call($i);
            while (($m = (($n = reader).$advance || $mm('advance')).call($n)) !== false && $m !== nil){next_line = (($m = (($o = reader).$peek_line || $mm('peek_line')).call($o)).$strip || $mm('strip')).call($m);
            if (($p = (($q = next_line)['$empty?'] || $mm('empty?')).call($q)) !== false && $p !== nil) {
              break;
            };
            if (($p = (($r = next_line)['$end_with?'] || $mm('end_with?')).call($r, __scope.LINE_BREAK)) !== false && $p !== nil) {
              value = "" + (value) + " " + ((($p = (($s = next_line).$chop || $mm('chop')).call($s)).$rstrip || $mm('rstrip')).call($p))
              } else {
              value = "" + (value) + " " + (next_line);
              break;;
            };};
          };
          if (($l = (($t = name)['$end_with?'] || $mm('end_with?')).call($t, "!")) !== false && $l !== nil) {
            value = nil;
            name = (($l = name).$chop || $mm('chop')).call($l);
          };
          name = (($u = this).$sanitize_attribute_name || $mm('sanitize_attribute_name')).call($u, name);
          accessible = true;
          if (($v = ($w = (($x = parent)['$nil?'] || $mm('nil?')).call($x), ($w === nil || $w === false))) !== false && $v !== nil) {
            accessible = (function() { if (($v = (($w = value)['$nil?'] || $mm('nil?')).call($w)) !== false && $v !== nil) {
              return (($v = (($y = parent).$document || $mm('document')).call($y)).$delete_attribute || $mm('delete_attribute')).call($v, name)
              } else {
              return (($z = (($aa = parent).$document || $mm('document')).call($aa)).$set_attribute || $mm('set_attribute')).call($z, name, value)
            }; return nil; }).call(this)
          };
          if (($ab = ($ac = (($ad = attributes)['$nil?'] || $mm('nil?')).call($ad), ($ac === nil || $ac === false))) !== false && $ab !== nil) {
            if (accessible !== false && accessible !== nil) {
              (($ab = (($ac = __scope.AttributeEntry).$new || $mm('new')).call($ac, name, value)).$save_to || $mm('save_to')).call($ab, attributes)
            }
          };
          return true;
          } else {
          return false
        };
      });

      Lexer._defs('$resolve_list_marker', function(list_type, marker, ordinal, validate) {
        var $a, $b, $c, $d, $e;if (ordinal == null) {
          ordinal = 0
        }if (validate == null) {
          validate = false
        }
        if (($a = (($b = (($c = list_type)['$=='] || $mm('==')).call($c, "olist")) ? ($d = (($e = marker)['$start_with?'] || $mm('start_with?')).call($e, "."), ($d === nil || $d === false)) : $b)) !== false && $a !== nil) {
          return (($a = this).$resolve_ordered_list_marker || $mm('resolve_ordered_list_marker')).call($a, marker, ordinal, validate)
          } else {
          if ((($b = list_type)['$=='] || $mm('==')).call($b, "colist")) {
            return "<1>"
            } else {
            return marker
          }
        }
      });

      Lexer._defs('$resolve_ordered_list_marker', function(marker, ordinal, validate) {
        var number_style = nil, expected = nil, actual = nil, $case = nil, TMP_22, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w;if (ordinal == null) {
          ordinal = 0
        }if (validate == null) {
          validate = false
        }
        number_style = ($a = (($b = __scope.ORDERED_LIST_STYLES).$detect || $mm('detect')), $a._p = (TMP_22 = function(s) {

          var self = TMP_22._s || this, $a, $b;
          if (s == null) s = nil;

          return (($a = marker).$match || $mm('match')).call($a, (($b = __scope.ORDERED_LIST_MARKER_PATTERNS)['$[]'] || $mm('[]')).call($b, s))
        }, TMP_22._s = this, TMP_22), $a).call($b);
        expected = actual = nil;
        $case = number_style;if ((($c = "arabic")['$==='] || $mm('===')).call($c, $case)) {
        if (validate !== false && validate !== nil) {
          expected = ($a = ordinal, $c = 1, typeof($a) === 'number' ? $a + $c : $a['$+']($c));
          actual = (($a = marker).$to_i || $mm('to_i')).call($a);
        };
        marker = "1.";
        }
        else if ((($f = "loweralpha")['$==='] || $mm('===')).call($f, $case)) {
        if (validate !== false && validate !== nil) {
          expected = (($d = ($e = (($g = (($h = "a")['$[]'] || $mm('[]')).call($h, 0)).$ord || $mm('ord')).call($g), $f = ordinal, typeof($e) === 'number' ? $e + $f : $e['$+']($f))).$chr || $mm('chr')).call($d);
          actual = (($e = marker).$chomp || $mm('chomp')).call($e, ".");
        };
        marker = "a.";
        }
        else if ((($k = "upperalpha")['$==='] || $mm('===')).call($k, $case)) {
        if (validate !== false && validate !== nil) {
          expected = (($i = ($j = (($l = (($m = "A")['$[]'] || $mm('[]')).call($m, 0)).$ord || $mm('ord')).call($l), $k = ordinal, typeof($j) === 'number' ? $j + $k : $j['$+']($k))).$chr || $mm('chr')).call($i);
          actual = (($j = marker).$chomp || $mm('chomp')).call($j, ".");
        };
        marker = "A.";
        }
        else if ((($p = "lowerroman")['$==='] || $mm('===')).call($p, $case)) {
        if (validate !== false && validate !== nil) {
          expected = ($n = ordinal, $o = 1, typeof($n) === 'number' ? $n + $o : $n['$+']($o));
          actual = (($n = this).$roman_numeral_to_int || $mm('roman_numeral_to_int')).call($n, (($o = marker).$chomp || $mm('chomp')).call($o, ")"));
        };
        marker = "i)";
        }
        else if ((($s = "upperroman")['$==='] || $mm('===')).call($s, $case)) {
        if (validate !== false && validate !== nil) {
          expected = ($q = ordinal, $r = 1, typeof($q) === 'number' ? $q + $r : $q['$+']($r));
          actual = (($q = this).$roman_numeral_to_int || $mm('roman_numeral_to_int')).call($q, (($r = marker).$chomp || $mm('chomp')).call($r, ")"));
        };
        marker = "I)";
        };
        if (($t = (($u = validate !== false && validate !== nil) ? ($v = (($w = expected)['$=='] || $mm('==')).call($w, actual), ($v === nil || $v === false)) : $u)) !== false && $t !== nil) {
          (($t = this).$puts || $mm('puts')).call($t, "asciidoctor: WARNING: list item index: expected " + (expected) + ", got " + (actual))
        };
        return marker;
      });

      Lexer._defs('$is_sibling_list_item?', function(line, list_type, sibling_trait) {
        var matcher = nil, expected_marker = nil, m = nil, $a, $b, $c, $d, $e, $f;
        if (($a = (($b = sibling_trait)['$is_a?'] || $mm('is_a?')).call($b, __scope.Regexp)) !== false && $a !== nil) {
          matcher = sibling_trait;
          expected_marker = false;
          } else {
          matcher = (($a = __scope.REGEXP)['$[]'] || $mm('[]')).call($a, list_type);
          expected_marker = sibling_trait;
        };
        if (($c = m = (($d = line).$match || $mm('match')).call($d, matcher)) !== false && $c !== nil) {
          if (expected_marker !== false && expected_marker !== nil) {
            return (($c = expected_marker)['$=='] || $mm('==')).call($c, (($e = this).$resolve_list_marker || $mm('resolve_list_marker')).call($e, list_type, (($f = m)['$[]'] || $mm('[]')).call($f, 1)))
            } else {
            return true
          }
          } else {
          return false
        };
      });

      Lexer._defs('$next_table', function(table_reader, parent, attributes) {
        var table = nil, explicit_col_specs = nil, parser_ctx = nil, line = nil, next_cell_spec = nil, m = nil, cell_text = nil, even_width = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, $bd, $be, $bf, $bg, $bh, $bi, $bj, $bk, $bl, $bm, $bn, $bo, $bp, $bq, $br, $bs, $bt, TMP_23, $bu;
        table = (($a = __scope.Table).$new || $mm('new')).call($a, parent, attributes);
        if (($b = (($c = attributes)['$has_key?'] || $mm('has_key?')).call($c, "title")) !== false && $b !== nil) {
          (($b = table)['$title='] || $mm('title=')).call($b, (($d = attributes).$delete || $mm('delete')).call($d, "title"))
        };
        (($e = table).$assign_caption || $mm('assign_caption')).call($e, (($f = attributes).$delete || $mm('delete')).call($f, "caption"));
        if (($g = (($h = attributes)['$has_key?'] || $mm('has_key?')).call($h, "cols")) !== false && $g !== nil) {
          (($g = table).$create_columns || $mm('create_columns')).call($g, (($i = this).$parse_col_specs || $mm('parse_col_specs')).call($i, (($j = attributes)['$[]'] || $mm('[]')).call($j, "cols")));
          explicit_col_specs = true;
          } else {
          explicit_col_specs = false
        };
        (($k = table_reader).$skip_blank_lines || $mm('skip_blank_lines')).call($k);
        parser_ctx = (($l = (__scope.Table)._scope.ParserContext).$new || $mm('new')).call($l, table, attributes);
        while (($n = (($o = table_reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($o)) !== false && $n !== nil){line = (($n = table_reader).$get_line || $mm('get_line')).call($n);
        if ((($p = (($q = parser_ctx).$format || $mm('format')).call($q))['$=='] || $mm('==')).call($p, "psv")) {
          line = "" + (line) + "\n"
        };
        if ((($r = (($s = parser_ctx).$format || $mm('format')).call($s))['$=='] || $mm('==')).call($r, "psv")) {
          if (($t = (($u = parser_ctx)['$starts_with_delimiter?'] || $mm('starts_with_delimiter?')).call($u, line)) !== false && $t !== nil) {
            line = (($t = line)['$[]'] || $mm('[]')).call($t, __range(1, -1, false));
            (($v = parser_ctx).$close_open_cell || $mm('close_open_cell')).call($v);
            } else {
            (($w = (($x = this).$parse_cell_spec || $mm('parse_cell_spec')).call($x, line, "start"))._isArray ? $w : ($w = [$w])), next_cell_spec = ($w[0] == null ? nil : $w[0]), line = ($w[1] == null ? nil : $w[1]);
            if (($w = ($y = (($z = next_cell_spec)['$nil?'] || $mm('nil?')).call($z), ($y === nil || $y === false))) !== false && $w !== nil) {
              (($w = parser_ctx).$close_open_cell || $mm('close_open_cell')).call($w, next_cell_spec)
            };
          }
        };
        while (($aa = ($ab = (($ac = line)['$empty?'] || $mm('empty?')).call($ac), ($ab === nil || $ab === false))) !== false && $aa !== nil){if (($aa = m = (($ab = parser_ctx).$match_delimiter || $mm('match_delimiter')).call($ab, line)) !== false && $aa !== nil) {
          if ((($aa = (($ad = parser_ctx).$format || $mm('format')).call($ad))['$=='] || $mm('==')).call($aa, "csv")) {
            if (($ae = (($af = parser_ctx)['$buffer_has_unclosed_quotes?'] || $mm('buffer_has_unclosed_quotes?')).call($af, (($ag = m).$pre_match || $mm('pre_match')).call($ag))) !== false && $ae !== nil) {
              line = (($ae = parser_ctx).$skip_matched_delimiter || $mm('skip_matched_delimiter')).call($ae, m);
              continue;;
            }
            } else {
            if (($ah = (($ai = (($aj = m).$pre_match || $mm('pre_match')).call($aj))['$end_with?'] || $mm('end_with?')).call($ai, "\\")) !== false && $ah !== nil) {
              line = (($ah = parser_ctx).$skip_matched_delimiter || $mm('skip_matched_delimiter')).call($ah, m, true);
              continue;;
            }
          };
          if ((($ak = (($al = parser_ctx).$format || $mm('format')).call($al))['$=='] || $mm('==')).call($ak, "psv")) {
            (($am = (($an = this).$parse_cell_spec || $mm('parse_cell_spec')).call($an, (($ao = m).$pre_match || $mm('pre_match')).call($ao), "end"))._isArray ? $am : ($am = [$am])), next_cell_spec = ($am[0] == null ? nil : $am[0]), cell_text = ($am[1] == null ? nil : $am[1]);
            (($am = parser_ctx).$push_cell_spec || $mm('push_cell_spec')).call($am, next_cell_spec);
            (($ap = parser_ctx)['$buffer='] || $mm('buffer=')).call($ap, "" + ((($aq = parser_ctx).$buffer || $mm('buffer')).call($aq)) + (cell_text));
            } else {
            (($ar = parser_ctx)['$buffer='] || $mm('buffer=')).call($ar, "" + ((($as = parser_ctx).$buffer || $mm('buffer')).call($as)) + ((($at = m).$pre_match || $mm('pre_match')).call($at)))
          };
          line = (($au = m).$post_match || $mm('post_match')).call($au);
          (($av = parser_ctx).$close_cell || $mm('close_cell')).call($av);
          } else {
          (($aw = parser_ctx)['$buffer='] || $mm('buffer=')).call($aw, "" + ((($ax = parser_ctx).$buffer || $mm('buffer')).call($ax)) + (line));
          if ((($ay = (($az = parser_ctx).$format || $mm('format')).call($az))['$=='] || $mm('==')).call($ay, "csv")) {
            (($ba = parser_ctx)['$buffer='] || $mm('buffer=')).call($ba, "" + ((($bb = (($bc = parser_ctx).$buffer || $mm('buffer')).call($bc)).$rstrip || $mm('rstrip')).call($bb)) + " ")
          };
          line = "";
          if (($bd = (($be = (($bf = (($bg = parser_ctx).$format || $mm('format')).call($bg))['$=='] || $mm('==')).call($bf, "psv")), $be !== false && $be !== nil ? $be : (($bh = (($bi = (($bj = parser_ctx).$format || $mm('format')).call($bj))['$=='] || $mm('==')).call($bi, "csv")) ? (($bk = parser_ctx)['$buffer_has_unclosed_quotes?'] || $mm('buffer_has_unclosed_quotes?')).call($bk) : $bh))) !== false && $bd !== nil) {
            (($bd = parser_ctx).$keep_cell_open || $mm('keep_cell_open')).call($bd)
            } else {
            (($be = parser_ctx).$close_cell || $mm('close_cell')).call($be, true)
          };
        }};
        if (($y = (($bh = parser_ctx)['$cell_open?'] || $mm('cell_open?')).call($bh)) === false || $y === nil) {
          (($y = table_reader).$skip_blank_lines || $mm('skip_blank_lines')).call($y)
        };
        if (($bl = ($bm = (($bn = table_reader)['$has_more_lines?'] || $mm('has_more_lines?')).call($bn), ($bm === nil || $bm === false))) !== false && $bl !== nil) {
          (($bl = parser_ctx).$close_cell || $mm('close_cell')).call($bl, true)
        };};
        ($m = "colcount", $bm = (($bo = table).$attributes || $mm('attributes')).call($bo), (($bp = (($bq = $bm)['$[]'] || $mm('[]')).call($bq, $m)), $bp !== false && $bp !== nil ? $bp : (($br = $bm)['$[]='] || $mm('[]=')).call($br, $m, (($bs = parser_ctx).$col_count || $mm('col_count')).call($bs))));
        if (($m = ($bm = explicit_col_specs, ($bm === nil || $bm === false))) !== false && $m !== nil) {
          even_width = (($m = ($bm = 100.0, $bp = (($bt = parser_ctx).$col_count || $mm('col_count')).call($bt), typeof($bm) === 'number' ? $bm / $bp : $bm['$/']($bp))).$floor || $mm('floor')).call($m);
          ($bm = (($bp = (($bu = table).$columns || $mm('columns')).call($bu)).$each || $mm('each')), $bm._p = (TMP_23 = function(c) {

            var self = TMP_23._s || this, $a;
            if (c == null) c = nil;

            return (($a = c).$assign_width || $mm('assign_width')).call($a, 0, even_width)
          }, TMP_23._s = this, TMP_23), $bm).call($bp);
        };
        (($bm = table).$partition_header_footer || $mm('partition_header_footer')).call($bm, attributes);
        return table;
      });

      Lexer._defs('$parse_col_specs', function(records) {
        var specs = nil, m = nil, $a, $b, $c, TMP_24, $d, $e, $f, TMP_25, $g, $h;
        specs = [];
        if (($a = m = (($b = records).$match || $mm('match')).call($b, (($c = __scope.REGEXP)['$[]'] || $mm('[]')).call($c, "digits"))) !== false && $a !== nil) {
          ($a = (($d = (1)).$upto || $mm('upto')), $a._p = (TMP_24 = function() {

            var self = TMP_24._s || this, $a;
            
            return (($a = specs)['$<<'] || $mm('<<')).call($a, __hash2(["width"], {"width": 1}))
          }, TMP_24._s = this, TMP_24), $a).call($d, (($e = (($f = m)['$[]'] || $mm('[]')).call($f, 0)).$to_i || $mm('to_i')).call($e));
          return specs;
        };
        ($a = (($g = (($h = records).$split || $mm('split')).call($h, ",")).$each || $mm('each')), $a._p = (TMP_25 = function(record) {

          var spec = nil, colspec = nil, rowspec = nil, repeat = nil, self = TMP_25._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, TMP_26, $ai, $aj;
          if (record == null) record = nil;

          if (($a = m = (($b = record).$match || $mm('match')).call($b, (($c = __scope.REGEXP)['$[]'] || $mm('[]')).call($c, "table_colspec"))) !== false && $a !== nil) {
            spec = __hash2([], {});
            if (($a = (($d = m)['$[]'] || $mm('[]')).call($d, 2)) !== false && $a !== nil) {
              (($a = (($e = (($f = m)['$[]'] || $mm('[]')).call($f, 2)).$split || $mm('split')).call($e, "."))._isArray ? $a : ($a = [$a])), colspec = ($a[0] == null ? nil : $a[0]), rowspec = ($a[1] == null ? nil : $a[1]);
              if (($a = ($g = ($g = (($h = (($i = colspec).$to_s || $mm('to_s')).call($i))['$empty?'] || $mm('empty?')).call($h), ($g === nil || $g === false)), $g !== false && $g !== nil ? (($g = (($j = (__scope.Table)._scope.ALIGNMENTS)['$[]'] || $mm('[]')).call($j, "h"))['$has_key?'] || $mm('has_key?')).call($g, colspec) : $g)) !== false && $a !== nil) {
                (($a = spec)['$[]='] || $mm('[]=')).call($a, "halign", (($k = (($l = (__scope.Table)._scope.ALIGNMENTS)['$[]'] || $mm('[]')).call($l, "h"))['$[]'] || $mm('[]')).call($k, colspec))
              };
              if (($m = ($n = ($n = (($o = (($p = rowspec).$to_s || $mm('to_s')).call($p))['$empty?'] || $mm('empty?')).call($o), ($n === nil || $n === false)), $n !== false && $n !== nil ? (($n = (($q = (__scope.Table)._scope.ALIGNMENTS)['$[]'] || $mm('[]')).call($q, "v"))['$has_key?'] || $mm('has_key?')).call($n, rowspec) : $n)) !== false && $m !== nil) {
                (($m = spec)['$[]='] || $mm('[]=')).call($m, "valign", (($r = (($s = (__scope.Table)._scope.ALIGNMENTS)['$[]'] || $mm('[]')).call($s, "v"))['$[]'] || $mm('[]')).call($r, rowspec))
              };
            };
            (($t = spec)['$[]='] || $mm('[]=')).call($t, "width", (function() { if (($u = ($v = (($w = (($x = m)['$[]'] || $mm('[]')).call($x, 3))['$nil?'] || $mm('nil?')).call($w), ($v === nil || $v === false))) !== false && $u !== nil) {
              return (($u = (($v = m)['$[]'] || $mm('[]')).call($v, 3)).$to_i || $mm('to_i')).call($u)
              } else {
              return 1
            }; return nil; }).call(self));
            if (($y = ($z = (($z = m)['$[]'] || $mm('[]')).call($z, 4), $z !== false && $z !== nil ? (($aa = (__scope.Table)._scope.TEXT_STYLES)['$has_key?'] || $mm('has_key?')).call($aa, (($ab = m)['$[]'] || $mm('[]')).call($ab, 4)) : $z)) !== false && $y !== nil) {
              (($y = spec)['$[]='] || $mm('[]=')).call($y, "style", (($ac = (__scope.Table)._scope.TEXT_STYLES)['$[]'] || $mm('[]')).call($ac, (($ad = m)['$[]'] || $mm('[]')).call($ad, 4)))
            };
            repeat = (function() { if (($ae = ($af = (($ag = (($ah = m)['$[]'] || $mm('[]')).call($ah, 1))['$nil?'] || $mm('nil?')).call($ag), ($af === nil || $af === false))) !== false && $ae !== nil) {
              return (($ae = (($af = m)['$[]'] || $mm('[]')).call($af, 1)).$to_i || $mm('to_i')).call($ae)
              } else {
              return 1
            }; return nil; }).call(self);
            return ($ai = (($aj = (1)).$upto || $mm('upto')), $ai._p = (TMP_26 = function() {

              var self = TMP_26._s || this, $a, $b;
              
              return (($a = specs)['$<<'] || $mm('<<')).call($a, (($b = spec).$dup || $mm('dup')).call($b))
            }, TMP_26._s = self, TMP_26), $ai).call($aj, repeat);
            } else {
            return nil
          }
        }, TMP_25._s = this, TMP_25), $a).call($g);
        return specs;
      });

      Lexer._defs('$parse_cell_spec', function(line, pos) {
        var spec = nil, rest = nil, m = nil, colspec = nil, rowspec = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az;if (pos == null) {
          pos = "start"
        }
        spec = (function() { if ((($a = pos)['$=='] || $mm('==')).call($a, "end")) {
          return __hash2([], {})
          } else {
          return nil
        }; return nil; }).call(this);
        rest = line;
        if (($b = m = (($c = line).$match || $mm('match')).call($c, (($d = (($e = __scope.REGEXP)['$[]'] || $mm('[]')).call($e, "table_cellspec"))['$[]'] || $mm('[]')).call($d, pos))) !== false && $b !== nil) {
          spec = __hash2([], {});
          if (($b = (($f = (($g = (($h = m)['$[]'] || $mm('[]')).call($h, 0)).$chomp || $mm('chomp')).call($g))['$empty?'] || $mm('empty?')).call($f)) !== false && $b !== nil) {
            return [spec, line]
          };
          rest = (function() { if ((($b = pos)['$=='] || $mm('==')).call($b, "start")) {
            return (($i = m).$post_match || $mm('post_match')).call($i)
            } else {
            return (($j = m).$pre_match || $mm('pre_match')).call($j)
          }; return nil; }).call(this);
          if (($k = (($l = m)['$[]'] || $mm('[]')).call($l, 1)) !== false && $k !== nil) {
            (($k = (($m = (($n = m)['$[]'] || $mm('[]')).call($n, 1)).$split || $mm('split')).call($m, "."))._isArray ? $k : ($k = [$k])), colspec = ($k[0] == null ? nil : $k[0]), rowspec = ($k[1] == null ? nil : $k[1]);
            colspec = (function() { if (($k = (($o = (($p = colspec).$to_s || $mm('to_s')).call($p))['$empty?'] || $mm('empty?')).call($o)) !== false && $k !== nil) {
              return 1
              } else {
              return (($k = colspec).$to_i || $mm('to_i')).call($k)
            }; return nil; }).call(this);
            rowspec = (function() { if (($q = (($r = (($s = rowspec).$to_s || $mm('to_s')).call($s))['$empty?'] || $mm('empty?')).call($r)) !== false && $q !== nil) {
              return 1
              } else {
              return (($q = rowspec).$to_i || $mm('to_i')).call($q)
            }; return nil; }).call(this);
            if ((($t = (($u = m)['$[]'] || $mm('[]')).call($u, 2))['$=='] || $mm('==')).call($t, "+")) {
              if (($v = (($w = colspec)['$=='] || $mm('==')).call($w, 1)) === false || $v === nil) {
                (($v = spec)['$[]='] || $mm('[]=')).call($v, "colspan", colspec)
              };
              if (($x = (($y = rowspec)['$=='] || $mm('==')).call($y, 1)) === false || $x === nil) {
                (($x = spec)['$[]='] || $mm('[]=')).call($x, "rowspan", rowspec)
              };
              } else {
              if ((($z = (($aa = m)['$[]'] || $mm('[]')).call($aa, 2))['$=='] || $mm('==')).call($z, "*")) {
                if (($ab = (($ac = colspec)['$=='] || $mm('==')).call($ac, 1)) === false || $ab === nil) {
                  (($ab = spec)['$[]='] || $mm('[]=')).call($ab, "repeatcol", colspec)
                }
              }
            };
          };
          if (($ad = (($ae = m)['$[]'] || $mm('[]')).call($ae, 3)) !== false && $ad !== nil) {
            (($ad = (($af = (($ag = m)['$[]'] || $mm('[]')).call($ag, 3)).$split || $mm('split')).call($af, "."))._isArray ? $ad : ($ad = [$ad])), colspec = ($ad[0] == null ? nil : $ad[0]), rowspec = ($ad[1] == null ? nil : $ad[1]);
            if (($ad = ($ah = ($ah = (($ai = (($aj = colspec).$to_s || $mm('to_s')).call($aj))['$empty?'] || $mm('empty?')).call($ai), ($ah === nil || $ah === false)), $ah !== false && $ah !== nil ? (($ah = (($ak = (__scope.Table)._scope.ALIGNMENTS)['$[]'] || $mm('[]')).call($ak, "h"))['$has_key?'] || $mm('has_key?')).call($ah, colspec) : $ah)) !== false && $ad !== nil) {
              (($ad = spec)['$[]='] || $mm('[]=')).call($ad, "halign", (($al = (($am = (__scope.Table)._scope.ALIGNMENTS)['$[]'] || $mm('[]')).call($am, "h"))['$[]'] || $mm('[]')).call($al, colspec))
            };
            if (($an = ($ao = ($ao = (($ap = (($aq = rowspec).$to_s || $mm('to_s')).call($aq))['$empty?'] || $mm('empty?')).call($ap), ($ao === nil || $ao === false)), $ao !== false && $ao !== nil ? (($ao = (($ar = (__scope.Table)._scope.ALIGNMENTS)['$[]'] || $mm('[]')).call($ar, "v"))['$has_key?'] || $mm('has_key?')).call($ao, rowspec) : $ao)) !== false && $an !== nil) {
              (($an = spec)['$[]='] || $mm('[]=')).call($an, "valign", (($as = (($at = (__scope.Table)._scope.ALIGNMENTS)['$[]'] || $mm('[]')).call($at, "v"))['$[]'] || $mm('[]')).call($as, rowspec))
            };
          };
          if (($au = ($av = (($av = m)['$[]'] || $mm('[]')).call($av, 4), $av !== false && $av !== nil ? (($aw = (__scope.Table)._scope.TEXT_STYLES)['$has_key?'] || $mm('has_key?')).call($aw, (($ax = m)['$[]'] || $mm('[]')).call($ax, 4)) : $av)) !== false && $au !== nil) {
            (($au = spec)['$[]='] || $mm('[]=')).call($au, "style", (($ay = (__scope.Table)._scope.TEXT_STYLES)['$[]'] || $mm('[]')).call($ay, (($az = m)['$[]'] || $mm('[]')).call($az, 4)))
          };
        };
        return [spec, rest];
      });

      Lexer._defs('$sanitize_attribute_name', function(name) {
        var $a, $b, $c;
        return (($a = (($b = name).$gsub || $mm('gsub')).call($b, (($c = __scope.REGEXP)['$[]'] || $mm('[]')).call($c, "illegal_attr_name_chars"), "")).$downcase || $mm('downcase')).call($a)
      });

      Lexer._defs('$roman_numeral_to_int', function(value) {
        var digits = nil, result = nil, $a, TMP_27, $b, $c, $d, $e, $f;
        value = (($a = value).$downcase || $mm('downcase')).call($a);
        digits = __hash2(["i", "v", "x"], {"i": 1, "v": 5, "x": 10});
        result = 0;
        ($b = (($c = __range(0, ($d = (($f = value).$length || $mm('length')).call($f), $e = 1, typeof($d) === 'number' ? $d - $e : $d['$-']($e)), false)).$each || $mm('each')), $b._p = (TMP_27 = function(i) {

          var digit = nil, self = TMP_27._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k;
          if (i == null) i = nil;

          digit = (($a = digits)['$[]'] || $mm('[]')).call($a, (($b = value)['$[]'] || $mm('[]')).call($b, __range(i, i, false)));
          if (($c = (($d = (($e = ($f = i, $g = 1, typeof($f) === 'number' ? $f + $g : $f['$+']($g)))['$<'] || $mm('<')).call($e, (($f = value).$length || $mm('length')).call($f))) ? (($g = (($h = digits)['$[]'] || $mm('[]')).call($h, (($i = value)['$[]'] || $mm('[]')).call($i, __range(($j = i, $k = 1, typeof($j) === 'number' ? $j + $k : $j['$+']($k)), ($j = i, $k = 1, typeof($j) === 'number' ? $j + $k : $j['$+']($k)), false))))['$>'] || $mm('>')).call($g, digit) : $d)) !== false && $c !== nil) {
            return result = (($c = result)['$-'] || $mm('-')).call($c, digit)
            } else {
            return result = (($d = result)['$+'] || $mm('+')).call($d, digit)
          };
        }, TMP_27._s = this, TMP_27), $b).call($c);
        return result;
      });

      return nil;
    })(Asciidoctor, null);
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function ListItem() {};
      ListItem = __klass(__base, __super, "ListItem", ListItem);

      var def = ListItem.prototype, __scope = ListItem._scope, super_TMP_1, super_TMP_3;
      def.marker = def.text = def.context = def.blocks = nil;

      def.$marker = function() {
        
        return this.marker
      }, 
      def['$marker='] = function(val) {
        
        return this.marker = val
      }, nil;

      super_TMP_1 = def.$initialize;
      def.$initialize = function(parent, text) {
        var $a;if (text == null) {
          text = nil
        }
        super_TMP_1.apply(this, [parent, "list_item"]);
        this.text = text;
        return this.level = (($a = parent).$level || $mm('level')).call($a);
      };

      def['$text?'] = function() {
        var $a, $b, $c;
        return ($a = (($b = (($c = this.text).$to_s || $mm('to_s')).call($c))['$empty?'] || $mm('empty?')).call($b), ($a === nil || $a === false));
      };

      def.$text = function() {
        var $a, $b;
        return (($a = (($b = __scope.Block).$new || $mm('new')).call($b, this, nil, [this.text])).$content || $mm('content')).call($a);
      };

      def.$content = function() {
        var $a, $b, TMP_2, $c, $d, $e;
        if (($a = (($b = this)['$blocks?'] || $mm('blocks?')).call($b)) !== false && $a !== nil) {
          return (($a = ($c = (($d = (($e = this).$blocks || $mm('blocks')).call($e)).$map || $mm('map')), $c._p = (TMP_2 = function(b) {

            var self = TMP_2._s || this, $a;
            if (b == null) b = nil;

            return (($a = b).$render || $mm('render')).call($a)
          }, TMP_2._s = this, TMP_2), $c).call($d)).$join || $mm('join')).call($a)
          } else {
          return nil
        };
      };

      def.$fold_first = function(continuation_connects_first_block, content_adjacent) {
        var block = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z;if (continuation_connects_first_block == null) {
          continuation_connects_first_block = false
        }if (content_adjacent == null) {
          content_adjacent = false
        }
        if (($a = ($b = ($b = ($b = (($c = (($d = this).$blocks || $mm('blocks')).call($d))['$empty?'] || $mm('empty?')).call($c), ($b === nil || $b === false)), $b !== false && $b !== nil ? (($b = (($e = (($f = this).$blocks || $mm('blocks')).call($f)).$first || $mm('first')).call($e))['$is_a?'] || $mm('is_a?')).call($b, __scope.Block) : $b), $b !== false && $b !== nil ? (($g = (($h = (($i = (($j = (($k = (($l = this).$blocks || $mm('blocks')).call($l)).$first || $mm('first')).call($k)).$context || $mm('context')).call($j))['$=='] || $mm('==')).call($i, "paragraph")) ? ($m = continuation_connects_first_block, ($m === nil || $m === false)) : $h)), $g !== false && $g !== nil ? $g : ($h = ($h = (($h = content_adjacent), $h !== false && $h !== nil ? $h : ($m = continuation_connects_first_block, ($m === nil || $m === false))), $h !== false && $h !== nil ? (($h = (($m = (($n = (($o = this).$blocks || $mm('blocks')).call($o)).$first || $mm('first')).call($n)).$context || $mm('context')).call($m))['$=='] || $mm('==')).call($h, "literal") : $h), $h !== false && $h !== nil ? (($p = (($q = (($r = (($s = this).$blocks || $mm('blocks')).call($s)).$first || $mm('first')).call($r)).$attr || $mm('attr')).call($q, "options", []))['$include?'] || $mm('include?')).call($p, "listparagraph") : $h)) : $b)) !== false && $a !== nil) {
          block = (($a = (($g = this).$blocks || $mm('blocks')).call($g)).$shift || $mm('shift')).call($a);
          if (($t = (($u = (($v = this.text).$to_s || $mm('to_s')).call($v))['$empty?'] || $mm('empty?')).call($u)) === false || $t === nil) {
            (($t = (($w = block).$buffer || $mm('buffer')).call($w)).$unshift || $mm('unshift')).call($t, this.text)
          };
          this.text = ($x = (($z = block).$buffer || $mm('buffer')).call($z), $y = " ", typeof($x) === 'number' ? $x * $y : $x['$*']($y));
        };
        return nil;
      };

      super_TMP_3 = def.$to_s;
      def.$to_s = function() {
        var $a, $b, $c;
        return "" + ((($a = super_TMP_3.apply(this, __slice.call(arguments))).$to_s || $mm('to_s')).call($a)) + " - " + (this.context) + " [text:" + (this.text) + ", blocks:" + ((($b = (($c = this.blocks), $c !== false && $c !== nil ? $c : [])).$size || $mm('size')).call($b)) + "]";
      };

      return nil;
    })(Asciidoctor, __scope.AbstractBlock)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function PathResolver() {};
      PathResolver = __klass(__base, __super, "PathResolver", PathResolver);

      var def = PathResolver.prototype, __scope = PathResolver._scope;
      def.file_separator = def.working_dir = nil;

      __scope.DOT = ".";

      __scope.DOT_DOT = "..";

      __scope.SLASH = "/";

      __scope.BACKSLASH = "\\";

      __scope.PARTITION_RE = /\/+/;

      __scope.WIN_ROOT_RE = /^[[:alpha:]]:(?:\\|\/)/;

      def.$file_separator = function() {
        
        return this.file_separator
      }, 
      def['$file_separator='] = function(val) {
        
        return this.file_separator = val
      }, nil;

      def.$working_dir = function() {
        
        return this.working_dir
      }, 
      def['$working_dir='] = function(val) {
        
        return this.working_dir = val
      }, nil;

      def.$initialize = function(file_separator, working_dir) {
        var $a, $b, $c, $d, $e, $f;if (file_separator == null) {
          file_separator = nil
        }if (working_dir == null) {
          working_dir = nil
        }
        this.file_separator = (function() { if (($a = (($b = file_separator)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          return (($a = (__scope.File)._scope.ALT_SEPARATOR), $a !== false && $a !== nil ? $a : (__scope.File)._scope.SEPARATOR)
          } else {
          return file_separator
        }; return nil; }).call(this);
        if (($a = (($c = working_dir)['$nil?'] || $mm('nil?')).call($c)) !== false && $a !== nil) {
          return this.working_dir = (($a = __scope.File).$expand_path || $mm('expand_path')).call($a, (($d = __scope.Dir).$pwd || $mm('pwd')).call($d))
          } else {
          return this.working_dir = (function() { if (($e = (($f = this)['$is_root?'] || $mm('is_root?')).call($f, working_dir)) !== false && $e !== nil) {
            return working_dir
            } else {
            return (($e = __scope.File).$expand_path || $mm('expand_path')).call($e, working_dir)
          }; return nil; }).call(this)
        };
      };

      def['$is_root?'] = function(path) {
        var $a, $b, $c, $d;
        if (($a = (($b = (($c = this.file_separator)['$=='] || $mm('==')).call($c, __scope.BACKSLASH)) ? (($d = path).$match || $mm('match')).call($d, __scope.WIN_ROOT_RE) : $b)) !== false && $a !== nil) {
          return true
          } else {
          if (($a = (($b = path)['$start_with?'] || $mm('start_with?')).call($b, __scope.SLASH)) !== false && $a !== nil) {
            return true
            } else {
            return false
          }
        };
      };

      def['$is_web_root?'] = function(path) {
        var $a;
        return (($a = path)['$start_with?'] || $mm('start_with?')).call($a, __scope.SLASH);
      };

      def.$posixfy = function(path) {
        var $a, $b, $c, $d;
        if (($a = (($b = (($c = path).$to_s || $mm('to_s')).call($c))['$empty?'] || $mm('empty?')).call($b)) !== false && $a !== nil) {
          return ""
        };
        if (($a = (($d = path)['$include?'] || $mm('include?')).call($d, __scope.BACKSLASH)) !== false && $a !== nil) {
          return (($a = path).$tr || $mm('tr')).call($a, __scope.BACKSLASH, __scope.SLASH)
          } else {
          return path
        };
      };

      def.$expand_path = function(path) {
        var path_segments = nil, path_root = nil, _ = nil, $a, $b;
        (($a = (($b = this).$partition_path || $mm('partition_path')).call($b, path))._isArray ? $a : ($a = [$a])), path_segments = ($a[0] == null ? nil : $a[0]), path_root = ($a[1] == null ? nil : $a[1]), _ = ($a[2] == null ? nil : $a[2]);
        return (($a = this).$join_path || $mm('join_path')).call($a, path_segments, path_root);
      };

      def.$partition_path = function(path, web_path) {
        var posix_path = nil, is_root = nil, path_segments = nil, root = nil, $a, $b, $c, $d, $e, $f, $g, $h;if (web_path == null) {
          web_path = false
        }
        posix_path = (($a = this).$posixfy || $mm('posixfy')).call($a, path);
        is_root = (function() { if (web_path !== false && web_path !== nil) {
          return (($b = this)['$is_web_root?'] || $mm('is_web_root?')).call($b, posix_path)
          } else {
          return (($c = this)['$is_root?'] || $mm('is_root?')).call($c, posix_path)
        }; return nil; }).call(this);
        path_segments = (($d = posix_path).$split || $mm('split')).call($d, __scope.PARTITION_RE);
        root = (function() { if ((($e = (($f = path_segments).$first || $mm('first')).call($f))['$=='] || $mm('==')).call($e, __scope.DOT)) {
          return __scope.DOT
          } else {
          return nil
        }; return nil; }).call(this);
        (($g = path_segments).$delete || $mm('delete')).call($g, __scope.DOT);
        root = (function() { if (is_root !== false && is_root !== nil) {
          return (($h = path_segments).$shift || $mm('shift')).call($h)
          } else {
          return root
        }; return nil; }).call(this);
        return [path_segments, root, posix_path];
      };

      def.$join_path = function(segments, root) {
        var $a, $b;if (root == null) {
          root = nil
        }
        if (root !== false && root !== nil) {
          return "" + (root) + (__scope.SLASH) + (($a = segments, $b = __scope.SLASH, typeof($a) === 'number' ? $a * $b : $a['$*']($b)))
          } else {
          return ($a = segments, $b = __scope.SLASH, typeof($a) === 'number' ? $a * $b : $a['$*']($b))
        };
      };

      def.$system_path = function(target, start, jail, opts) {
        var recover = nil, target_segments = nil, target_root = nil, _ = nil, resolved_target = nil, jail_segments = nil, jail_root = nil, start_segments = nil, start_root = nil, resolved_segments = nil, warned = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, TMP_1, $al, $am;if (jail == null) {
          jail = nil
        }if (opts == null) {
          opts = __hash2([], {})
        }
        recover = (($a = opts).$fetch || $mm('fetch')).call($a, "recover", true);
        if (($b = (($c = jail)['$nil?'] || $mm('nil?')).call($c)) === false || $b === nil) {
          if (($b = (($d = this)['$is_root?'] || $mm('is_root?')).call($d, jail)) === false || $b === nil) {
            (($b = this).$raise || $mm('raise')).call($b, __scope.SecurityError, "Jail is not an absolute path: " + (jail))
          };
          jail = (($e = this).$posixfy || $mm('posixfy')).call($e, jail);
        };
        if (($f = (($g = (($h = target).$to_s || $mm('to_s')).call($h))['$empty?'] || $mm('empty?')).call($g)) !== false && $f !== nil) {
          target_segments = []
          } else {
          (($f = (($i = this).$partition_path || $mm('partition_path')).call($i, target))._isArray ? $f : ($f = [$f])), target_segments = ($f[0] == null ? nil : $f[0]), target_root = ($f[1] == null ? nil : $f[1]), _ = ($f[2] == null ? nil : $f[2])
        };
        if (($f = (($j = target_segments)['$empty?'] || $mm('empty?')).call($j)) !== false && $f !== nil) {
          if (($f = (($k = (($l = start).$to_s || $mm('to_s')).call($l))['$empty?'] || $mm('empty?')).call($k)) !== false && $f !== nil) {
            return (function() { if (($f = (($m = jail)['$nil?'] || $mm('nil?')).call($m)) !== false && $f !== nil) {
              return this.working_dir
              } else {
              return jail
            }; return nil; }).call(this)
            } else {
            if (($f = (($n = this)['$is_root?'] || $mm('is_root?')).call($n, start)) !== false && $f !== nil) {
              if (($f = (($o = jail)['$nil?'] || $mm('nil?')).call($o)) !== false && $f !== nil) {
                return (($f = this).$expand_path || $mm('expand_path')).call($f, start)
              }
              } else {
              return (($p = this).$system_path || $mm('system_path')).call($p, start, jail, jail)
            }
          }
        };
        if (($q = (($r = target_root !== false && target_root !== nil) ? ($s = (($t = target_root)['$=='] || $mm('==')).call($t, __scope.DOT), ($s === nil || $s === false)) : $r)) !== false && $q !== nil) {
          resolved_target = (($q = this).$join_path || $mm('join_path')).call($q, target_segments, target_root);
          if (($r = (($s = (($u = jail)['$nil?'] || $mm('nil?')).call($u)), $s !== false && $s !== nil ? $s : (($v = resolved_target)['$start_with?'] || $mm('start_with?')).call($v, jail))) !== false && $r !== nil) {
            return resolved_target
          };
        };
        if (($r = (($s = (($w = start).$to_s || $mm('to_s')).call($w))['$empty?'] || $mm('empty?')).call($s)) !== false && $r !== nil) {
          start = (function() { if (($r = (($x = jail)['$nil?'] || $mm('nil?')).call($x)) !== false && $r !== nil) {
            return this.working_dir
            } else {
            return jail
          }; return nil; }).call(this)
          } else {
          if (($r = (($y = this)['$is_root?'] || $mm('is_root?')).call($y, start)) !== false && $r !== nil) {
            start = (($r = this).$posixfy || $mm('posixfy')).call($r, start)
            } else {
            start = (($z = this).$system_path || $mm('system_path')).call($z, start, jail, jail)
          }
        };
        if ((($aa = jail)['$=='] || $mm('==')).call($aa, start)) {
          (($ab = (($ac = this).$partition_path || $mm('partition_path')).call($ac, jail))._isArray ? $ab : ($ab = [$ab])), jail_segments = ($ab[0] == null ? nil : $ab[0]), jail_root = ($ab[1] == null ? nil : $ab[1]), _ = ($ab[2] == null ? nil : $ab[2]);
          start_segments = (($ab = jail_segments).$dup || $mm('dup')).call($ab);
          } else {
          if (($ad = ($ae = (($af = jail)['$nil?'] || $mm('nil?')).call($af), ($ae === nil || $ae === false))) !== false && $ad !== nil) {
            if (($ad = ($ae = (($ag = start)['$start_with?'] || $mm('start_with?')).call($ag, jail), ($ae === nil || $ae === false))) !== false && $ad !== nil) {
              (($ad = this).$raise || $mm('raise')).call($ad, __scope.SecurityError, "" + ((($ae = (($ah = opts)['$[]'] || $mm('[]')).call($ah, "target_name")), $ae !== false && $ae !== nil ? $ae : "Start path")) + " " + (start) + " is outside of jail: " + (jail) + " (disallowed in safe mode)")
            };
            (($ae = (($ai = this).$partition_path || $mm('partition_path')).call($ai, start))._isArray ? $ae : ($ae = [$ae])), start_segments = ($ae[0] == null ? nil : $ae[0]), start_root = ($ae[1] == null ? nil : $ae[1]), _ = ($ae[2] == null ? nil : $ae[2]);
            (($ae = (($aj = this).$partition_path || $mm('partition_path')).call($aj, jail))._isArray ? $ae : ($ae = [$ae])), jail_segments = ($ae[0] == null ? nil : $ae[0]), jail_root = ($ae[1] == null ? nil : $ae[1]), _ = ($ae[2] == null ? nil : $ae[2]);
            } else {
            (($ae = (($ak = this).$partition_path || $mm('partition_path')).call($ak, start))._isArray ? $ae : ($ae = [$ae])), start_segments = ($ae[0] == null ? nil : $ae[0]), start_root = ($ae[1] == null ? nil : $ae[1]), _ = ($ae[2] == null ? nil : $ae[2]);
            jail_root = start_root;
          }
        };
        resolved_segments = (($ae = start_segments).$dup || $mm('dup')).call($ae);
        warned = false;
        ($al = (($am = target_segments).$each || $mm('each')), $al._p = (TMP_1 = function(segment) {

          var self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l;
          if (segment == null) segment = nil;

          if ((($a = segment)['$=='] || $mm('==')).call($a, __scope.DOT_DOT)) {
            if (($b = ($c = (($d = jail)['$nil?'] || $mm('nil?')).call($d), ($c === nil || $c === false))) !== false && $b !== nil) {
              if ((($b = (($c = resolved_segments).$length || $mm('length')).call($c))['$>'] || $mm('>')).call($b, (($e = jail_segments).$length || $mm('length')).call($e))) {
                return (($f = resolved_segments).$pop || $mm('pop')).call($f)
                } else {
                if (($g = ($h = recover, ($h === nil || $h === false))) !== false && $g !== nil) {
                  return (($g = self).$raise || $mm('raise')).call($g, __scope.SecurityError, "" + ((($h = (($i = opts)['$[]'] || $mm('[]')).call($i, "target_name")), $h !== false && $h !== nil ? $h : "path")) + " " + (target) + " refers to location outside jail: " + (jail) + " (disallowed in safe mode)")
                  } else {
                  if (($h = ($j = warned, ($j === nil || $j === false))) !== false && $h !== nil) {
                    (($h = self).$puts || $mm('puts')).call($h, "asciidoctor: WARNING: " + ((($j = (($k = opts)['$[]'] || $mm('[]')).call($k, "target_name")), $j !== false && $j !== nil ? $j : "path")) + " has illegal reference to ancestor of jail, auto-recovering");
                    return warned = true;
                    } else {
                    return nil
                  }
                }
              }
              } else {
              return (($j = resolved_segments).$pop || $mm('pop')).call($j)
            }
            } else {
            return (($l = resolved_segments).$push || $mm('push')).call($l, segment)
          }
        }, TMP_1._s = this, TMP_1), $al).call($am);
        return (($al = this).$join_path || $mm('join_path')).call($al, resolved_segments, jail_root);
      };

      def.$web_path = function(target, start) {
        var target_segments = nil, target_root = nil, _ = nil, resolved_segments = nil, $a, $b, $c, $d, $e, $f, TMP_2, $g;if (start == null) {
          start = nil
        }
        target = (($a = this).$posixfy || $mm('posixfy')).call($a, target);
        start = (($b = this).$posixfy || $mm('posixfy')).call($b, start);
        if (($c = (($d = (($e = this)['$is_web_root?'] || $mm('is_web_root?')).call($e, target)), $d !== false && $d !== nil ? $d : (($f = start)['$empty?'] || $mm('empty?')).call($f))) === false || $c === nil) {
          target = "" + (start) + (__scope.SLASH) + (target)
        };
        (($c = (($d = this).$partition_path || $mm('partition_path')).call($d, target, true))._isArray ? $c : ($c = [$c])), target_segments = ($c[0] == null ? nil : $c[0]), target_root = ($c[1] == null ? nil : $c[1]), _ = ($c[2] == null ? nil : $c[2]);
        resolved_segments = ($c = (($g = target_segments).$inject || $mm('inject')), $c._p = (TMP_2 = function(accum, segment) {

          var self = TMP_2._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i;
          if (accum == null) accum = nil;
if (segment == null) segment = nil;

          if ((($a = segment)['$=='] || $mm('==')).call($a, __scope.DOT_DOT)) {
            if (($b = (($c = accum)['$empty?'] || $mm('empty?')).call($c)) !== false && $b !== nil) {
              if (($b = (($d = target_root !== false && target_root !== nil) ? ($e = (($f = target_root)['$=='] || $mm('==')).call($f, __scope.DOT), ($e === nil || $e === false)) : $d)) === false || $b === nil) {
                (($b = accum).$push || $mm('push')).call($b, segment)
              }
              } else {
              if ((($d = (($e = accum)['$[]'] || $mm('[]')).call($e, -1))['$=='] || $mm('==')).call($d, __scope.DOT_DOT)) {
                (($g = accum).$push || $mm('push')).call($g, segment)
                } else {
                (($h = accum).$pop || $mm('pop')).call($h)
              }
            }
            } else {
            (($i = accum).$push || $mm('push')).call($i, segment)
          };
          return accum;
        }, TMP_2._s = this, TMP_2), $c).call($g, []);
        return (($c = this).$join_path || $mm('join_path')).call($c, resolved_segments, target_root);
      };

      return nil;
    })(Asciidoctor, null)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2, __range = __opal.range;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function Reader() {};
      Reader = __klass(__base, __super, "Reader", Reader);

      var def = Reader.prototype, __scope = Reader._scope, TMP_1, TMP_11;
      def.source = def.lineno = def.lines = def.eof = def.preprocess_source = def.next_line_preprocessed = def.unescape_next_line = def.skipping = def.conditionals_stack = def.document = def.include_block = nil;

      def.$source = function() {
        
        return this.source
      }, nil;

      def.$lineno = function() {
        
        return this.lineno
      }, nil;

      def.$initialize = TMP_1 = function(data, document, preprocess) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, block;
        block = TMP_1._p || nil, TMP_1._p = null;
        if (data == null) {
          data = nil
        }if (document == null) {
          document = nil
        }if (preprocess == null) {
          preprocess = false
        }
        if (($a = (($b = data)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          data = []
        };
        this.lineno = 0;
        if (($a = ($c = preprocess, ($c === nil || $c === false))) !== false && $a !== nil) {
          this.lines = (function() { if (($a = (($c = data)['$is_a?'] || $mm('is_a?')).call($c, __scope.String)) !== false && $a !== nil) {
            return (($a = (($d = data).$lines || $mm('lines')).call($d)).$entries || $mm('entries')).call($a)
            } else {
            return (($e = data).$dup || $mm('dup')).call($e)
          }; return nil; }).call(this);
          this.preprocess_source = false;
          } else {
          if (($f = ($g = (($h = data)['$empty?'] || $mm('empty?')).call($h), ($g === nil || $g === false))) !== false && $f !== nil) {
            this.document = document;
            this.preprocess_source = true;
            this.include_block = (function() { if ((block !== nil)) {
              return block
              } else {
              return nil
            }; return nil; }).call(this);
            (($f = this).$normalize_data || $mm('normalize_data')).call($f, (function() { if (($g = (($i = data)['$is_a?'] || $mm('is_a?')).call($i, __scope.String)) !== false && $g !== nil) {
              return (($g = (($j = data).$lines || $mm('lines')).call($j)).$entries || $mm('entries')).call($g)
              } else {
              return data
            }; return nil; }).call(this));
            } else {
            this.lines = [];
            this.preprocess_source = false;
          }
        };
        this.source = (($k = this.lines).$dup || $mm('dup')).call($k);
        this.next_line_preprocessed = false;
        this.unescape_next_line = false;
        this.conditionals_stack = [];
        this.skipping = false;
        return this.eof = false;
      };

      def.$lines = function() {
        var $a, $b;
        if (($a = (($b = this.lines)['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
          return nil
          } else {
          return (($a = this.lines).$dup || $mm('dup')).call($a)
        };
      };

      def['$has_more_lines?'] = function() {
        var $a, $b, $c, $d, $e;
        if (($a = (($b = this.eof), $b !== false && $b !== nil ? $b : this.eof = (($c = this.lines)['$empty?'] || $mm('empty?')).call($c))) !== false && $a !== nil) {
          return false
          } else {
          if (($a = ($b = this.preprocess_source, $b !== false && $b !== nil ? ($b = this.next_line_preprocessed, ($b === nil || $b === false)) : $b)) !== false && $a !== nil) {
            if (($a = (($b = (($d = this).$preprocess_next_line || $mm('preprocess_next_line')).call($d))['$nil?'] || $mm('nil?')).call($b)) !== false && $a !== nil) {
              return false
              } else {
              return ($a = (($e = this.lines)['$empty?'] || $mm('empty?')).call($e), ($a === nil || $a === false))
            }
            } else {
            return true
          }
        };
      };

      def['$empty?'] = function() {
        var $a, $b;
        return ($a = (($b = this)['$has_more_lines?'] || $mm('has_more_lines?')).call($b), ($a === nil || $a === false));
      };

      def.$skip_blank_lines = function() {
        var skipped = nil, next_line = nil, $a, $b, $c, $d, $e, $f, $g;
        skipped = 0;
        while (($b = ($c = (($d = (next_line = (($e = this).$get_line || $mm('get_line')).call($e)))['$nil?'] || $mm('nil?')).call($d), ($c === nil || $c === false))) !== false && $b !== nil){if (($b = (($c = (($f = next_line).$chomp || $mm('chomp')).call($f))['$empty?'] || $mm('empty?')).call($c)) !== false && $b !== nil) {
          skipped = (($b = skipped)['$+'] || $mm('+')).call($b, 1)
          } else {
          (($g = this).$unshift_line || $mm('unshift_line')).call($g, next_line);
          break;;
        }};
        return skipped;
      };

      def.$consume_comments = function(options) {
        var comment_lines = nil, preprocess = nil, next_line = nil, commentish = nil, match = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s;if (options == null) {
          options = __hash2([], {})
        }
        comment_lines = [];
        preprocess = (($a = options).$fetch || $mm('fetch')).call($a, "preprocess", true);
        while (($c = ($d = (($e = (next_line = (($f = this).$get_line || $mm('get_line')).call($f, preprocess)))['$nil?'] || $mm('nil?')).call($e), ($d === nil || $d === false))) !== false && $c !== nil){if (($c = ($d = (($d = options)['$[]'] || $mm('[]')).call($d, "include_blank_lines"), $d !== false && $d !== nil ? (($g = (($h = next_line).$chomp || $mm('chomp')).call($h))['$empty?'] || $mm('empty?')).call($g) : $d)) !== false && $c !== nil) {
          (($c = comment_lines)['$<<'] || $mm('<<')).call($c, next_line)
          } else {
          if (($i = ($j = commentish = (($j = next_line)['$start_with?'] || $mm('start_with?')).call($j, "//"), $j !== false && $j !== nil ? match = (($k = next_line).$match || $mm('match')).call($k, (($l = __scope.REGEXP)['$[]'] || $mm('[]')).call($l, "comment_blk")) : $j)) !== false && $i !== nil) {
            (($i = comment_lines)['$<<'] || $mm('<<')).call($i, next_line);
            (($m = comment_lines).$push || $mm('push')).apply($m, [].concat((($n = this).$grab_lines_until || $mm('grab_lines_until')).call($n, __hash2(["terminator", "grab_last_line", "preprocess"], {"terminator": (($o = match)['$[]'] || $mm('[]')).call($o, 0), "grab_last_line": true, "preprocess": false}))));
            } else {
            if (($p = (($q = commentish !== false && commentish !== nil) ? (($r = next_line).$match || $mm('match')).call($r, (($s = __scope.REGEXP)['$[]'] || $mm('[]')).call($s, "comment")) : $q)) !== false && $p !== nil) {
              (($p = comment_lines)['$<<'] || $mm('<<')).call($p, next_line)
              } else {
              (($q = this).$unshift_line || $mm('unshift_line')).call($q, next_line);
              break;;
            }
          }
        }};
        return comment_lines;
      };

      def.$skip_comment_lines = def.$consume_comments;

      def.$consume_line_comments = function() {
        var comment_lines = nil, next_line = nil, $a, $b, $c, $d, $e, $f, $g;
        comment_lines = [];
        while (($b = ($c = (($d = (next_line = (($e = this).$get_line || $mm('get_line')).call($e)))['$nil?'] || $mm('nil?')).call($d), ($c === nil || $c === false))) !== false && $b !== nil){if (($b = (($c = next_line).$match || $mm('match')).call($c, (($f = __scope.REGEXP)['$[]'] || $mm('[]')).call($f, "comment"))) !== false && $b !== nil) {
          (($b = comment_lines)['$<<'] || $mm('<<')).call($b, next_line)
          } else {
          (($g = this).$unshift_line || $mm('unshift_line')).call($g, next_line);
          break;;
        }};
        return comment_lines;
      };

      def.$get_line = function(preprocess) {
        var $a, $b, $c, $d, $e, $f, $g;if (preprocess == null) {
          preprocess = true
        }
        if (($a = (($b = this.eof), $b !== false && $b !== nil ? $b : this.eof = (($c = this.lines)['$empty?'] || $mm('empty?')).call($c))) !== false && $a !== nil) {
          this.next_line_preprocessed = true;
          return nil;
          } else {
          if (($a = ($b = ($b = (($b = preprocess !== false && preprocess !== nil) ? this.preprocess_source : $b), $b !== false && $b !== nil ? ($b = this.next_line_preprocessed, ($b === nil || $b === false)) : $b), $b !== false && $b !== nil ? (($b = (($d = this).$preprocess_next_line || $mm('preprocess_next_line')).call($d))['$nil?'] || $mm('nil?')).call($b) : $b)) !== false && $a !== nil) {
            this.next_line_preprocessed = true;
            return nil;
            } else {
            this.lineno = (($a = this.lineno)['$+'] || $mm('+')).call($a, 1);
            this.next_line_preprocessed = false;
            if (($e = this.unescape_next_line) !== false && $e !== nil) {
              this.unescape_next_line = false;
              return (($e = (($f = this.lines).$shift || $mm('shift')).call($f))['$[]'] || $mm('[]')).call($e, __range(1, -1, false));
              } else {
              return (($g = this.lines).$shift || $mm('shift')).call($g)
            };
          }
        };
      };

      def.$advance = function() {
        var $a, $b, $c;
        this.next_line_preprocessed = false;
        if (($a = (($b = this.eof), $b !== false && $b !== nil ? $b : this.eof = (($c = this.lines)['$empty?'] || $mm('empty?')).call($c))) !== false && $a !== nil) {
          return false
          } else {
          this.lineno = (($a = this.lineno)['$+'] || $mm('+')).call($a, 1);
          (($b = this.lines).$shift || $mm('shift')).call($b);
          return true;
        };
      };

      def.$peek_line = function(preprocess) {
        var $a, $b, $c, $d, $e, $f;if (preprocess == null) {
          preprocess = true
        }
        if (($a = ($b = preprocess, ($b === nil || $b === false))) !== false && $a !== nil) {
          if (($a = (($b = this.eof), $b !== false && $b !== nil ? $b : this.eof = (($c = this.lines)['$empty?'] || $mm('empty?')).call($c))) !== false && $a !== nil) {
            return nil
            } else {
            return (($a = (($b = this.lines).$first || $mm('first')).call($b)).$dup || $mm('dup')).call($a)
          }
          } else {
          if (($d = (($e = this)['$has_more_lines?'] || $mm('has_more_lines?')).call($e)) !== false && $d !== nil) {
            return (($d = (($f = this.lines).$first || $mm('first')).call($f)).$dup || $mm('dup')).call($d)
            } else {
            return nil
          }
        };
      };

      def.$peek_lines = function(number) {
        var lines = nil, idx = nil, TMP_2, $a, $b;if (number == null) {
          number = 1
        }
        lines = [];
        idx = 0;
        ($a = (($b = __range(1, number, false)).$each || $mm('each')), $a._p = (TMP_2 = function() {

          var advanced = nil, self = TMP_2._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i;
          if (self.preprocess_source == null) self.preprocess_source = nil;
          if (self.next_line_preprocessed == null) self.next_line_preprocessed = nil;
          if (self.eof == null) self.eof = nil;
          if (self.lines == null) self.lines = nil;

          
          if (($a = ($b = self.preprocess_source, $b !== false && $b !== nil ? ($b = self.next_line_preprocessed, ($b === nil || $b === false)) : $b)) !== false && $a !== nil) {
            advanced = (($a = self).$preprocess_next_line || $mm('preprocess_next_line')).call($a);
            if (($b = (($c = (($d = (($e = advanced)['$nil?'] || $mm('nil?')).call($e)), $d !== false && $d !== nil ? $d : self.eof)), $c !== false && $c !== nil ? $c : self.eof = (($d = self.lines)['$empty?'] || $mm('empty?')).call($d))) !== false && $b !== nil) {
              return (__breaker.$v = nil, __breaker)
            };
            if (advanced !== false && advanced !== nil) {
              idx = 0
            };
          };
          if ((($b = idx)['$>='] || $mm('>=')).call($b, (($c = self.lines).$size || $mm('size')).call($c))) {
            return (__breaker.$v = nil, __breaker)
          };
          (($f = lines)['$<<'] || $mm('<<')).call($f, (($g = (($h = self.lines)['$[]'] || $mm('[]')).call($h, idx)).$dup || $mm('dup')).call($g));
          return idx = (($i = idx)['$+'] || $mm('+')).call($i, 1);
        }, TMP_2._s = this, TMP_2), $a).call($b);
        return lines;
      };

      def.$preprocess_next_line = function() {
        var next_line = nil, match = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v;
        if (($a = (($b = this.eof), $b !== false && $b !== nil ? $b : (($c = (next_line = (($d = this.lines).$first || $mm('first')).call($d)))['$nil?'] || $mm('nil?')).call($c))) !== false && $a !== nil) {
          return nil
        };
        if (($a = ($b = ($b = (($b = next_line)['$include?'] || $mm('include?')).call($b, "::"), $b !== false && $b !== nil ? (($e = (($f = next_line)['$include?'] || $mm('include?')).call($f, "if")), $e !== false && $e !== nil ? $e : (($g = next_line)['$include?'] || $mm('include?')).call($g, "endif")) : $b), $b !== false && $b !== nil ? match = (($e = next_line).$match || $mm('match')).call($e, (($h = __scope.REGEXP)['$[]'] || $mm('[]')).call($h, "ifdef_macro")) : $b)) !== false && $a !== nil) {
          if (($a = (($i = next_line)['$start_with?'] || $mm('start_with?')).call($i, "\\")) !== false && $a !== nil) {
            this.next_line_preprocessed = true;
            this.unescape_next_line = true;
            return false;
            } else {
            return (($a = this).$preprocess_conditional_inclusion || $mm('preprocess_conditional_inclusion')).apply($a, [].concat((($j = match).$captures || $mm('captures')).call($j)))
          }
          } else {
          if (($k = this.skipping) !== false && $k !== nil) {
            (($k = this).$advance || $mm('advance')).call($k);
            (($l = this).$skip_comment_lines || $mm('skip_comment_lines')).call($l, __hash2(["include_blank_lines", "preprocess"], {"include_blank_lines": true, "preprocess": false}));
            if (($m = (($n = (($o = this).$preprocess_next_line || $mm('preprocess_next_line')).call($o))['$nil?'] || $mm('nil?')).call($n)) !== false && $m !== nil) {
              return nil
              } else {
              return true
            };
            } else {
            if (($m = ($p = (($p = next_line)['$include?'] || $mm('include?')).call($p, "include::"), $p !== false && $p !== nil ? match = (($q = next_line).$match || $mm('match')).call($q, (($r = __scope.REGEXP)['$[]'] || $mm('[]')).call($r, "include_macro")) : $p)) !== false && $m !== nil) {
              if (($m = (($s = next_line)['$start_with?'] || $mm('start_with?')).call($s, "\\")) !== false && $m !== nil) {
                this.next_line_preprocessed = true;
                this.unescape_next_line = true;
                return false;
                } else {
                return (($m = this).$preprocess_include || $mm('preprocess_include')).call($m, (($t = match)['$[]'] || $mm('[]')).call($t, 1), (($u = (($v = match)['$[]'] || $mm('[]')).call($v, 2)).$strip || $mm('strip')).call($u))
              }
              } else {
              this.next_line_preprocessed = true;
              return false;
            }
          }
        };
      };

      def.$preprocess_conditional_inclusion = function(directive, target, delimiter, text) {
        var stack_size = nil, pair = nil, skip = nil, $case = nil, expr_match = nil, lhs = nil, op = nil, rhs = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, TMP_3, $aa, $ab, $ac, TMP_4, $ad, $ae, $af, $ag, $ah, $ai, $aj, TMP_5, $ak, $al, $am, TMP_6, $an, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, $bd, $be, $bf, $bg, $bh, $bi, $bj, $bk;
        if (($a = (($b = ($c = (($c = (($d = directive)['$=='] || $mm('==')).call($d, "ifdef")), $c !== false && $c !== nil ? $c : (($e = directive)['$=='] || $mm('==')).call($e, "ifndef")), $c !== false && $c !== nil ? (($c = target)['$empty?'] || $mm('empty?')).call($c) : $c)), $b !== false && $b !== nil ? $b : (($f = (($g = directive)['$=='] || $mm('==')).call($g, "endif")) ? ($h = (($i = text)['$nil?'] || $mm('nil?')).call($i), ($h === nil || $h === false)) : $f))) !== false && $a !== nil) {
          this.next_line_preprocessed = true;
          return false;
        };
        if ((($a = directive)['$=='] || $mm('==')).call($a, "endif")) {
          stack_size = (($b = this.conditionals_stack).$size || $mm('size')).call($b);
          if ((($f = stack_size)['$>'] || $mm('>')).call($f, 0)) {
            pair = (($h = this.conditionals_stack).$last || $mm('last')).call($h);
            if (($j = (($k = (($l = target)['$empty?'] || $mm('empty?')).call($l)), $k !== false && $k !== nil ? $k : (($m = target)['$=='] || $mm('==')).call($m, (($n = pair)['$[]'] || $mm('[]')).call($n, "target")))) !== false && $j !== nil) {
              (($j = this.conditionals_stack).$pop || $mm('pop')).call($j);
              this.skipping = (function() { if (($k = (($o = this.conditionals_stack)['$empty?'] || $mm('empty?')).call($o)) !== false && $k !== nil) {
                return false
                } else {
                return (($k = (($p = this.conditionals_stack).$last || $mm('last')).call($p))['$[]'] || $mm('[]')).call($k, "skipping")
              }; return nil; }).call(this);
              } else {
              (($q = this).$puts || $mm('puts')).call($q, "asciidoctor: ERROR: line " + (($r = this.lineno, $s = 1, typeof($r) === 'number' ? $r + $s : $r['$+']($s))) + ": mismatched macro: endif::" + (target) + "[], expected endif::" + ((($r = pair)['$[]'] || $mm('[]')).call($r, "target")) + "[]")
            };
            } else {
            (($s = this).$puts || $mm('puts')).call($s, "asciidoctor: ERROR: line " + (($t = this.lineno, $u = 1, typeof($t) === 'number' ? $t + $u : $t['$+']($u))) + ": unmatched macro: endif::" + (target) + "[]")
          };
          (($t = this).$advance || $mm('advance')).call($t);
          return (function() { if (($u = (($v = (($w = this).$preprocess_next_line || $mm('preprocess_next_line')).call($w))['$nil?'] || $mm('nil?')).call($v)) !== false && $u !== nil) {
            return nil
            } else {
            return true
          }; return nil; }).call(this);
        };
        skip = false;
        if (($u = ($x = this.skipping, ($x === nil || $x === false))) !== false && $u !== nil) {
          $case = directive;if ((($af = "ifdef")['$==='] || $mm('===')).call($af, $case)) {
          $case = delimiter;if ((($u = nil)['$==='] || $mm('===')).call($u, $case)) {
          skip = ($u = (($x = (($y = this.document).$attributes || $mm('attributes')).call($y))['$has_key?'] || $mm('has_key?')).call($x, target), ($u === nil || $u === false))
          }
          else if ((($z = ",")['$==='] || $mm('===')).call($z, $case)) {
          skip = ($z = ($aa = (($ab = (($ac = target).$split || $mm('split')).call($ac, ",")).$detect || $mm('detect')), $aa._p = (TMP_3 = function(name) {

            var self = TMP_3._s || this, $a, $b;
            if (self.document == null) self.document = nil;

            if (name == null) name = nil;

            return (($a = (($b = self.document).$attributes || $mm('attributes')).call($b))['$has_key?'] || $mm('has_key?')).call($a, name)
          }, TMP_3._s = this, TMP_3), $aa).call($ab), ($z === nil || $z === false))
          }
          else if ((($aa = "+")['$==='] || $mm('===')).call($aa, $case)) {
          skip = ($aa = (($ad = (($ae = target).$split || $mm('split')).call($ae, "+")).$detect || $mm('detect')), $aa._p = (TMP_4 = function(name) {

            var self = TMP_4._s || this, $a, $b, $c;
            if (self.document == null) self.document = nil;

            if (name == null) name = nil;

            return ($a = (($b = (($c = self.document).$attributes || $mm('attributes')).call($c))['$has_key?'] || $mm('has_key?')).call($b, name), ($a === nil || $a === false))
          }, TMP_4._s = this, TMP_4), $aa).call($ad)
          }
          }
          else if ((($ap = "ifndef")['$==='] || $mm('===')).call($ap, $case)) {
          $case = delimiter;if ((($ai = nil)['$==='] || $mm('===')).call($ai, $case)) {
          skip = (($ag = (($ah = this.document).$attributes || $mm('attributes')).call($ah))['$has_key?'] || $mm('has_key?')).call($ag, target)
          }
          else if ((($aj = ",")['$==='] || $mm('===')).call($aj, $case)) {
          skip = ($aj = ($ak = (($al = (($am = target).$split || $mm('split')).call($am, ",")).$detect || $mm('detect')), $ak._p = (TMP_5 = function(name) {

            var self = TMP_5._s || this, $a, $b, $c;
            if (self.document == null) self.document = nil;

            if (name == null) name = nil;

            return ($a = (($b = (($c = self.document).$attributes || $mm('attributes')).call($c))['$has_key?'] || $mm('has_key?')).call($b, name), ($a === nil || $a === false))
          }, TMP_5._s = this, TMP_5), $ak).call($al), ($aj === nil || $aj === false))
          }
          else if ((($ak = "+")['$==='] || $mm('===')).call($ak, $case)) {
          skip = ($ak = (($an = (($ao = target).$split || $mm('split')).call($ao, "+")).$detect || $mm('detect')), $ak._p = (TMP_6 = function(name) {

            var self = TMP_6._s || this, $a, $b;
            if (self.document == null) self.document = nil;

            if (name == null) name = nil;

            return (($a = (($b = self.document).$attributes || $mm('attributes')).call($b))['$has_key?'] || $mm('has_key?')).call($a, name)
          }, TMP_6._s = this, TMP_6), $ak).call($an)
          }
          }
          else if ((($az = "ifeval")['$==='] || $mm('===')).call($az, $case)) {
          if (($aq = (($ar = ($as = (($at = target)['$empty?'] || $mm('empty?')).call($at), ($as === nil || $as === false))), $ar !== false && $ar !== nil ? $ar : ($as = expr_match = (($au = (($av = text).$strip || $mm('strip')).call($av)).$match || $mm('match')).call($au, (($aw = __scope.REGEXP)['$[]'] || $mm('[]')).call($aw, "eval_expr")), ($as === nil || $as === false)))) !== false && $aq !== nil) {
            this.next_line_preprocessed = true;
            return false;
          };
          lhs = (($aq = this).$resolve_expr_val || $mm('resolve_expr_val')).call($aq, (($ar = expr_match)['$[]'] || $mm('[]')).call($ar, 1));
          op = (($as = expr_match)['$[]'] || $mm('[]')).call($as, 2);
          rhs = (($ax = this).$resolve_expr_val || $mm('resolve_expr_val')).call($ax, (($ay = expr_match)['$[]'] || $mm('[]')).call($ay, 3));
          skip = ($az = (($ba = lhs).$send || $mm('send')).call($ba, (($bb = op).$to_sym || $mm('to_sym')).call($bb), rhs), ($az === nil || $az === false));
          }
        };
        (($bc = this).$advance || $mm('advance')).call($bc);
        if (($bd = ($be = ($be = (($bf = directive)['$=='] || $mm('==')).call($bf, "ifeval"), ($be === nil || $be === false)), $be !== false && $be !== nil ? ($be = (($bg = text)['$nil?'] || $mm('nil?')).call($bg), ($be === nil || $be === false)) : $be)) !== false && $bd !== nil) {
          if (($bd = ($be = ($be = this.skipping, ($be === nil || $be === false)), $be !== false && $be !== nil ? ($be = skip, ($be === nil || $be === false)) : $be)) !== false && $bd !== nil) {
            (($bd = this).$unshift_line || $mm('unshift_line')).call($bd, (($be = text).$rstrip || $mm('rstrip')).call($be));
            return true;
          }
          } else {
          if (($bh = ($bi = ($bi = this.skipping, ($bi === nil || $bi === false)), $bi !== false && $bi !== nil ? skip : $bi)) !== false && $bh !== nil) {
            this.skipping = true
          };
          (($bh = this.conditionals_stack)['$<<'] || $mm('<<')).call($bh, __hash2(["target", "skip", "skipping"], {"target": target, "skip": skip, "skipping": this.skipping}));
        };
        return (function() { if (($bi = (($bj = (($bk = this).$preprocess_next_line || $mm('preprocess_next_line')).call($bk))['$nil?'] || $mm('nil?')).call($bj)) !== false && $bi !== nil) {
          return nil
          } else {
          return true
        }; return nil; }).call(this);
      };

      def.$preprocess_include = function(target, raw_attributes) {
        var include_file = nil, inc_lines = nil, tags = nil, attributes = nil, selected = nil, f = nil, active_tag = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, TMP_7, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, TMP_8, $ai, $aj, $ak, $al, $am, $an, $ao, TMP_9, $ap, $aq, $ar, $as, $at;
        if ((($a = (($b = this.document).$safe || $mm('safe')).call($b))['$>='] || $mm('>=')).call($a, (__scope.SafeMode)._scope.SECURE)) {
          (($c = this.lines)['$[]='] || $mm('[]=')).call($c, 0, "link:" + (target) + "[" + (target) + "]");
          this.next_line_preprocessed = true;
          return false;
          } else {
          if (($d = this.include_block) !== false && $d !== nil) {
            (($d = this).$advance || $mm('advance')).call($d);
            return (($e = this.lines).$unshift || $mm('unshift')).apply($e, [].concat((($f = this).$normalize_include_data || $mm('normalize_include_data')).call($f, (($g = this.include_block).$call || $mm('call')).call($g, target))));
            } else {
            if ((($h = (($i = (($j = (($k = this.document).$attributes || $mm('attributes')).call($k)).$fetch || $mm('fetch')).call($j, "include-depth", 0)).$to_i || $mm('to_i')).call($i))['$>'] || $mm('>')).call($h, 0)) {
              (($l = this).$advance || $mm('advance')).call($l);
              include_file = (($m = this.document).$normalize_system_path || $mm('normalize_system_path')).call($m, target, nil, nil, __hash2(["target_name"], {"target_name": "include file"}));
              if (($n = ($o = (($p = __scope.File)['$file?'] || $mm('file?')).call($p, include_file), ($o === nil || $o === false))) !== false && $n !== nil) {
                (($n = this).$puts || $mm('puts')).call($n, "asciidoctor: WARNING: line " + (this.lineno) + ": include file not found: " + (include_file));
                return true;
              };
              inc_lines = nil;
              tags = nil;
              if (($o = ($q = (($r = raw_attributes)['$empty?'] || $mm('empty?')).call($r), ($q === nil || $q === false))) !== false && $o !== nil) {
                attributes = (($o = (($q = __scope.AttributeList).$new || $mm('new')).call($q, raw_attributes)).$parse || $mm('parse')).call($o);
                if (($s = (($t = attributes)['$has_key?'] || $mm('has_key?')).call($t, "lines")) !== false && $s !== nil) {
                  inc_lines = [];
                  ($s = (($u = (($v = (($w = attributes)['$[]'] || $mm('[]')).call($w, "lines")).$split || $mm('split')).call($v, (($x = __scope.REGEXP)['$[]'] || $mm('[]')).call($x, "scsv_csv_delim"))).$each || $mm('each')), $s._p = (TMP_7 = function(linedef) {

                    var from = nil, to = nil, self = TMP_7._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l;
                    if (linedef == null) linedef = nil;

                    if (($a = (($b = linedef)['$include?'] || $mm('include?')).call($b, "..")) !== false && $a !== nil) {
                      (($a = ($d = (($e = (($f = linedef).$split || $mm('split')).call($f, "..")).$map || $mm('map')), $d._p = (($c = "to_i").$to_proc || $mm('to_proc')).call($c), $d).call($e))._isArray ? $a : ($a = [$a])), from = ($a[0] == null ? nil : $a[0]), to = ($a[1] == null ? nil : $a[1]);
                      if ((($a = to)['$=='] || $mm('==')).call($a, -1)) {
                        (($d = inc_lines)['$<<'] || $mm('<<')).call($d, from);
                        return (($g = inc_lines)['$<<'] || $mm('<<')).call($g, ($h = 1.0, $i = 0.0, typeof($h) === 'number' ? $h / $i : $h['$/']($i)));
                        } else {
                        return (($h = inc_lines).$concat || $mm('concat')).call($h, (($i = (($j = __scope.Range).$new || $mm('new')).call($j, from, to)).$to_a || $mm('to_a')).call($i))
                      };
                      } else {
                      return (($k = inc_lines)['$<<'] || $mm('<<')).call($k, (($l = linedef).$to_i || $mm('to_i')).call($l))
                    }
                  }, TMP_7._s = this, TMP_7), $s).call($u);
                  inc_lines = (($s = (($y = inc_lines).$sort || $mm('sort')).call($y)).$uniq || $mm('uniq')).call($s);
                  } else {
                  if (($z = (($aa = attributes)['$has_key?'] || $mm('has_key?')).call($aa, "tags")) !== false && $z !== nil) {
                    tags = (($z = (($ab = (($ac = attributes)['$[]'] || $mm('[]')).call($ac, "tags")).$split || $mm('split')).call($ab, (($ad = __scope.REGEXP)['$[]'] || $mm('[]')).call($ad, "scsv_csv_delim"))).$uniq || $mm('uniq')).call($z)
                  }
                };
              };
              if (($ae = ($af = (($ag = inc_lines)['$nil?'] || $mm('nil?')).call($ag), ($af === nil || $af === false))) !== false && $ae !== nil) {
                if (($ae = ($af = (($ah = inc_lines)['$empty?'] || $mm('empty?')).call($ah), ($af === nil || $af === false))) !== false && $ae !== nil) {
                  selected = [];
                  f = (($ae = __scope.File).$new || $mm('new')).call($ae, include_file);
                  ($af = (($ai = f).$each_line || $mm('each_line')), $af._p = (TMP_8 = function(l) {

                    var take = nil, self = TMP_8._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
                    if (l == null) l = nil;

                    take = (($a = inc_lines).$first || $mm('first')).call($a);
                    if (($b = ($c = (($c = take)['$is_a?'] || $mm('is_a?')).call($c, __scope.Float), $c !== false && $c !== nil ? (($d = take)['$infinite?'] || $mm('infinite?')).call($d) : $c)) !== false && $b !== nil) {
                      return (($b = selected).$push || $mm('push')).call($b, l)
                      } else {
                      if ((($e = (($f = f).$lineno || $mm('lineno')).call($f))['$=='] || $mm('==')).call($e, take)) {
                        (($g = selected).$push || $mm('push')).call($g, l);
                        (($h = inc_lines).$shift || $mm('shift')).call($h);
                      };
                      if (($i = (($j = inc_lines)['$empty?'] || $mm('empty?')).call($j)) !== false && $i !== nil) {
                        return (__breaker.$v = nil, __breaker)
                        } else {
                        return nil
                      };
                    };
                  }, TMP_8._s = this, TMP_8), $af).call($ai);
                  if (($af = (($aj = selected)['$empty?'] || $mm('empty?')).call($aj)) === false || $af === nil) {
                    (($af = this.lines).$unshift || $mm('unshift')).apply($af, [].concat((($ak = this).$normalize_include_data || $mm('normalize_include_data')).call($ak, selected)))
                  };
                }
                } else {
                if (($al = ($am = (($an = tags)['$nil?'] || $mm('nil?')).call($an), ($am === nil || $am === false))) !== false && $al !== nil) {
                  if (($al = ($am = (($ao = tags)['$empty?'] || $mm('empty?')).call($ao), ($am === nil || $am === false))) !== false && $al !== nil) {
                    selected = [];
                    active_tag = nil;
                    f = (($al = __scope.File).$new || $mm('new')).call($al, include_file);
                    ($am = (($ap = f).$each_line || $mm('each_line')), $am._p = (TMP_9 = function(l) {

                      var self = TMP_9._s || this, $a, $b, $c, $d, $e, TMP_10, $f, $g;
                      if (l == null) l = nil;

                      if (($a = (__opal.Object._scope.Asciidoctor)._scope.FORCE_ENCODING) !== false && $a !== nil) {
                        (($a = l).$force_encoding || $mm('force_encoding')).call($a, (__opal.Object._scope.Encoding)._scope.UTF_8)
                      };
                      if (($b = ($c = (($d = active_tag)['$nil?'] || $mm('nil?')).call($d), ($c === nil || $c === false))) !== false && $b !== nil) {
                        if (($b = (($c = l)['$include?'] || $mm('include?')).call($c, "end::" + (active_tag) + "[]")) !== false && $b !== nil) {
                          return active_tag = nil
                          } else {
                          return (($b = selected).$push || $mm('push')).call($b, (($e = l).$rstrip || $mm('rstrip')).call($e))
                        }
                        } else {
                        return ($f = (($g = tags).$each || $mm('each')), $f._p = (TMP_10 = function(tag) {

                          var self = TMP_10._s || this, $a, $b;
                          if (tag == null) tag = nil;

                          if (($a = (($b = l)['$include?'] || $mm('include?')).call($b, "tag::" + (tag) + "[]")) !== false && $a !== nil) {
                            active_tag = tag;
                            return (__breaker.$v = nil, __breaker);
                            } else {
                            return nil
                          }
                        }, TMP_10._s = self, TMP_10), $f).call($g)
                      };
                    }, TMP_9._s = this, TMP_9), $am).call($ap);
                    if (($am = (($aq = selected)['$empty?'] || $mm('empty?')).call($aq)) === false || $am === nil) {
                      (($am = this.lines).$unshift || $mm('unshift')).apply($am, [].concat(selected))
                    };
                  }
                  } else {
                  (($ar = this.lines).$unshift || $mm('unshift')).apply($ar, [].concat((($as = this).$normalize_include_data || $mm('normalize_include_data')).call($as, (($at = __scope.File).$readlines || $mm('readlines')).call($at, include_file))))
                }
              };
              return true;
              } else {
              this.next_line_preprocessed = true;
              return false;
            }
          }
        };
      };

      def.$unshift_line = function(line) {
        var $a, $b;
        (($a = this.lines).$unshift || $mm('unshift')).call($a, line);
        this.next_line_preprocessed = true;
        this.eof = false;
        this.lineno = (($b = this.lineno)['$-'] || $mm('-')).call($b, 1);
        return nil;
      };

      def.$unshift = function(new_lines) {
        var size = nil, $a, $b, $c, $d;new_lines = __slice.call(arguments, 0);
        size = (($a = new_lines).$size || $mm('size')).call($a);
        if ((($b = size)['$>'] || $mm('>')).call($b, 0)) {
          (($c = this.lines).$unshift || $mm('unshift')).apply($c, [].concat(new_lines));
          this.next_line_preprocessed = true;
          this.eof = false;
          this.lineno = (($d = this.lineno)['$-'] || $mm('-')).call($d, size);
        };
        return nil;
      };

      def['$chomp_last!'] = function() {
        var $a, $b, $c, $d;
        if (($a = (($b = this.eof), $b !== false && $b !== nil ? $b : this.eof = (($c = this.lines)['$empty?'] || $mm('empty?')).call($c))) === false || $a === nil) {
          (($a = this.lines)['$[]='] || $mm('[]=')).call($a, -1, (($b = (($d = this.lines).$last || $mm('last')).call($d)).$chomp || $mm('chomp')).call($b))
        };
        return nil;
      };

      def.$grab_lines_until = TMP_11 = function(options) {
        var buffer = nil, terminator = nil, break_on_blank_lines = nil, break_on_list_continuation = nil, chomp_last_line = nil, skip_line_comments = nil, preprocess = nil, buffer_empty = nil, this_line = nil, finish = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, block;
        block = TMP_11._p || nil, TMP_11._p = null;
        if (options == null) {
          options = __hash2([], {})
        }
        buffer = [];
        if (($a = (($b = options)['$[]'] || $mm('[]')).call($b, "skip_first_line")) !== false && $a !== nil) {
          (($a = this).$advance || $mm('advance')).call($a)
        };
        if (($c = (($d = options)['$has_key?'] || $mm('has_key?')).call($d, "terminator")) !== false && $c !== nil) {
          terminator = (($c = options)['$[]'] || $mm('[]')).call($c, "terminator");
          break_on_blank_lines = false;
          break_on_list_continuation = false;
          chomp_last_line = (($e = (($f = options)['$[]'] || $mm('[]')).call($f, "chomp_last_line")), $e !== false && $e !== nil ? $e : false);
          } else {
          terminator = nil;
          break_on_blank_lines = (($e = options)['$[]'] || $mm('[]')).call($e, "break_on_blank_lines");
          break_on_list_continuation = (($g = options)['$[]'] || $mm('[]')).call($g, "break_on_list_continuation");
          chomp_last_line = break_on_blank_lines;
        };
        skip_line_comments = (($h = options)['$[]'] || $mm('[]')).call($h, "skip_line_comments");
        preprocess = (($i = options).$fetch || $mm('fetch')).call($i, "preprocess", true);
        buffer_empty = true;
        while (($k = ($l = (($m = (this_line = (($n = this).$get_line || $mm('get_line')).call($n, preprocess)))['$nil?'] || $mm('nil?')).call($m), ($l === nil || $l === false))) !== false && $k !== nil){finish = (function() {while (($l = true) !== false && $l !== nil){if (($l = (($o = terminator !== false && terminator !== nil) ? (($p = (($q = this_line).$chomp || $mm('chomp')).call($q))['$=='] || $mm('==')).call($p, terminator) : $o)) !== false && $l !== nil) {
          return true;
        };
        if (($l = (($o = break_on_blank_lines !== false && break_on_blank_lines !== nil) ? (($r = (($s = this_line).$strip || $mm('strip')).call($s))['$empty?'] || $mm('empty?')).call($r) : $o)) !== false && $l !== nil) {
          return true;
        };
        if (($l = ($o = (($o = break_on_list_continuation !== false && break_on_list_continuation !== nil) ? ($t = buffer_empty, ($t === nil || $t === false)) : $o), $o !== false && $o !== nil ? (($o = (($t = this_line).$chomp || $mm('chomp')).call($t))['$=='] || $mm('==')).call($o, __scope.LIST_CONTINUATION) : $o)) !== false && $l !== nil) {
          (($l = options)['$[]='] || $mm('[]=')).call($l, "preserve_last_line", true);
          return true;;
        };
        if (($u = (($v = block !== false && block !== nil) ? ((($w = block.call(null, this_line)) === __breaker) ? __breaker.$v : $w) : $v)) !== false && $u !== nil) {
          return true;
        };
        return false;;}; return nil;}).call(this);
        if (finish !== false && finish !== nil) {
          if (($k = (($u = options)['$[]'] || $mm('[]')).call($u, "grab_last_line")) !== false && $k !== nil) {
            (($k = buffer)['$<<'] || $mm('<<')).call($k, this_line);
            buffer_empty = false;
          };
          if (($v = (($w = options)['$[]'] || $mm('[]')).call($w, "preserve_last_line")) !== false && $v !== nil) {
            (($v = this).$unshift_line || $mm('unshift_line')).call($v, this_line)
          };
          if (($x = (($y = chomp_last_line !== false && chomp_last_line !== nil) ? ($z = buffer_empty, ($z === nil || $z === false)) : $y)) !== false && $x !== nil) {
            (($x = buffer)['$[]='] || $mm('[]=')).call($x, -1, (($y = (($z = buffer).$last || $mm('last')).call($z)).$chomp || $mm('chomp')).call($y))
          };
          return buffer;
        };
        if (($aa = (($ab = skip_line_comments !== false && skip_line_comments !== nil) ? (($ac = this_line).$match || $mm('match')).call($ac, (($ad = __scope.REGEXP)['$[]'] || $mm('[]')).call($ad, "comment")) : $ab)) === false || $aa === nil) {
          (($aa = buffer)['$<<'] || $mm('<<')).call($aa, this_line);
          buffer_empty = false;
        };};
        if (($j = (($ab = chomp_last_line !== false && chomp_last_line !== nil) ? ($ae = buffer_empty, ($ae === nil || $ae === false)) : $ab)) !== false && $j !== nil) {
          (($j = buffer)['$[]='] || $mm('[]=')).call($j, -1, (($ab = (($ae = buffer).$last || $mm('last')).call($ae)).$chomp || $mm('chomp')).call($ab))
        };
        return buffer;
      };

      def.$sanitize_attribute_name = function(name) {
        var $a;
        return (($a = __scope.Lexer).$sanitize_attribute_name || $mm('sanitize_attribute_name')).call($a, name);
      };

      def.$resolve_expr_val = function(str) {
        var val = nil, type = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n;
        val = str;
        type = nil;
        if (($a = (($b = ($c = (($c = val)['$start_with?'] || $mm('start_with?')).call($c, "\""), $c !== false && $c !== nil ? (($d = val)['$end_with?'] || $mm('end_with?')).call($d, "\"") : $c)), $b !== false && $b !== nil ? $b : ($e = (($e = val)['$start_with?'] || $mm('start_with?')).call($e, "'"), $e !== false && $e !== nil ? (($f = val)['$end_with?'] || $mm('end_with?')).call($f, "'") : $e))) !== false && $a !== nil) {
          type = "s";
          val = (($a = val)['$[]'] || $mm('[]')).call($a, __range(1, -2, false));
        };
        if (($b = (($g = val)['$include?'] || $mm('include?')).call($g, "{")) !== false && $b !== nil) {
          val = (($b = this.document).$sub_attributes || $mm('sub_attributes')).call($b, val)
        };
        if (($h = ($i = (($j = type)['$=='] || $mm('==')).call($j, "s"), ($i === nil || $i === false))) !== false && $h !== nil) {
          if (($h = (($i = val)['$empty?'] || $mm('empty?')).call($i)) !== false && $h !== nil) {
            val = nil
            } else {
            if ((($h = val)['$=='] || $mm('==')).call($h, "true")) {
              val = true
              } else {
              if ((($k = val)['$=='] || $mm('==')).call($k, "false")) {
                val = false
                } else {
                if (($l = (($m = val)['$include?'] || $mm('include?')).call($m, ".")) !== false && $l !== nil) {
                  val = (($l = val).$to_f || $mm('to_f')).call($l)
                  } else {
                  val = (($n = val).$to_i || $mm('to_i')).call($n)
                }
              }
            }
          }
        };
        return val;
      };

      def.$normalize_include_data = function(data) {
        var $a, TMP_12, $b, TMP_13, $c;
        if (($a = (__opal.Object._scope.Asciidoctor)._scope.FORCE_ENCODING) !== false && $a !== nil) {
          return ($a = (($b = data).$map || $mm('map')), $a._p = (TMP_12 = function(line) {

            var self = TMP_12._s || this, $a, $b;
            if (line == null) line = nil;

            return (($a = (($b = line).$rstrip || $mm('rstrip')).call($b)).$force_encoding || $mm('force_encoding')).call($a, (__opal.Object._scope.Encoding)._scope.UTF_8)
          }, TMP_12._s = this, TMP_12), $a).call($b)
          } else {
          return ($a = (($c = data).$map || $mm('map')), $a._p = (TMP_13 = function(line) {

            var self = TMP_13._s || this, $a;
            if (line == null) line = nil;

            return (($a = line).$rstrip || $mm('rstrip')).call($a)
          }, TMP_13._s = this, TMP_13), $a).call($c)
        };
      };

      def.$normalize_data = function(data) {
        var $a, TMP_14, $b, TMP_15, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p;
        if (($a = (__opal.Object._scope.Asciidoctor)._scope.FORCE_ENCODING) !== false && $a !== nil) {
          this.lines = ($a = (($b = data).$map || $mm('map')), $a._p = (TMP_14 = function(line) {

            var self = TMP_14._s || this, $a, $b;
            if (line == null) line = nil;

            return (($a = (($b = line).$rstrip || $mm('rstrip')).call($b)).$force_encoding || $mm('force_encoding')).call($a, (__opal.Object._scope.Encoding)._scope.UTF_8)
          }, TMP_14._s = this, TMP_14), $a).call($b)
          } else {
          this.lines = ($a = (($c = data).$map || $mm('map')), $a._p = (TMP_15 = function(line) {

            var self = TMP_15._s || this, $a;
            if (line == null) line = nil;

            return (($a = line).$rstrip || $mm('rstrip')).call($a)
          }, TMP_15._s = this, TMP_15), $a).call($c)
        };
        while (($d = ($e = ($e = (($f = (($g = this.lines).$first || $mm('first')).call($g))['$nil?'] || $mm('nil?')).call($f), ($e === nil || $e === false)), $e !== false && $e !== nil ? (($e = (($h = (($i = this.lines).$first || $mm('first')).call($i)).$chomp || $mm('chomp')).call($h))['$empty?'] || $mm('empty?')).call($e) : $e)) !== false && $d !== nil){($d = (($d = this.lines).$shift || $mm('shift')).call($d), $d !== false && $d !== nil ? this.lineno = (($j = this.lineno)['$+'] || $mm('+')).call($j, 1) : $d)};
        while (($k = ($l = ($l = (($m = (($n = this.lines).$last || $mm('last')).call($n))['$nil?'] || $mm('nil?')).call($m), ($l === nil || $l === false)), $l !== false && $l !== nil ? (($l = (($o = (($p = this.lines).$last || $mm('last')).call($p)).$chomp || $mm('chomp')).call($o))['$empty?'] || $mm('empty?')).call($l) : $l)) !== false && $k !== nil){(($k = this.lines).$pop || $mm('pop')).call($k)};
        return nil;
      };

      return nil;
    })(Asciidoctor, null)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function Renderer() {};
      Renderer = __klass(__base, __super, "Renderer", Renderer);

      var def = Renderer.prototype, __scope = Renderer._scope;
      def.compact = def.views = nil;

      def.$compact = function() {
        
        return this.compact
      }, nil;

      def.$initialize = function(options) {
        var backend = nil, $case = nil, eruby = nil, template_dir = nil, template_glob = nil, engine = nil, view_opts = nil, slim_loaded = nil, helpers = nil, $a, $b, $c, $d, TMP_1, $e, $f, $g, $h, $i, TMP_2, $j, $k, TMP_3, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, TMP_4, $ac, $ad, TMP_5, $ae, $af, $ag, $ah;if (options == null) {
          options = __hash2([], {})
        }
        this.debug = ($a = ($b = (($c = options)['$[]'] || $mm('[]')).call($c, "debug"), ($b === nil || $b === false)), ($a === nil || $a === false));
        this.views = __hash2([], {});
        this.compact = (($a = options)['$[]'] || $mm('[]')).call($a, "compact");
        backend = (($b = options)['$[]'] || $mm('[]')).call($b, "backend");
        if (($d = __scope.OPAL) !== false && $d !== nil) {
          ($d = (($e = ["block_admonition", "block_audio", "block_colist", "block_dlist", "block_example", "block_floating_title", "block_image", "block_listing", "block_literal", "block_olist", "block_open", "block_page_break", "block_paragraph", "block_pass", "block_preamble", "block_quote", "block_ruler", "block_sidebar", "block_table", "block_ulist", "block_verse", "block_video", "embedded", "inline_anchor", "inline_break", "inline_callout", "inline_footnote", "inline_image", "inline_indexterm", "inline_quoted", "section"]).$each || $mm('each')), $d._p = (TMP_1 = function(name) {

            var self = TMP_1._s || this, $a, $b;
            if (self.views == null) self.views = nil;

            if (name == null) name = nil;

            return (($a = self.views)['$[]='] || $mm('[]=')).call($a, name, (($b = __opal.Object._scope.Template)['$[]'] || $mm('[]')).call($b, "asciidoctor/backends/html5/" + (name)))
          }, TMP_1._s = this, TMP_1), $d).call($e);
          return nil;
        };
        $case = backend;if ((($h = "html5")['$==='] || $mm('===')).call($h, $case) || (($k = "docbook45")['$==='] || $mm('===')).call($k, $case)) {
        eruby = (($d = this).$load_eruby || $mm('load_eruby')).call($d, (($f = options)['$[]'] || $mm('[]')).call($f, "eruby"));
        (($g = __scope.Helpers).$require_library || $mm('require_library')).call($g, ($h = "asciidoctor/backends/", $i = backend, typeof($h) === 'number' ? $h + $i : $h['$+']($i)));
        ($h = (($i = (($j = __scope.BaseTemplate).$template_classes || $mm('template_classes')).call($j)).$each || $mm('each')), $h._p = (TMP_2 = function(tc) {

          var view_name = nil, view_backend = nil, self = TMP_2._s || this, $a, $b, $c, $d, $e, $f, $g, $h;
          if (self.views == null) self.views = nil;

          if (tc == null) tc = nil;

          if (($a = (($b = (($c = (($d = tc).$to_s || $mm('to_s')).call($d)).$downcase || $mm('downcase')).call($c))['$include?'] || $mm('include?')).call($b, ($e = ($g = "::", $h = backend, typeof($g) === 'number' ? $g + $h : $g['$+']($h)), $f = "::", typeof($e) === 'number' ? $e + $f : $e['$+']($f)))) !== false && $a !== nil) {
            (($a = (($e = (($f = self).$class || $mm('class')).call($f)).$extract_view_mapping || $mm('extract_view_mapping')).call($e, tc))._isArray ? $a : ($a = [$a])), view_name = ($a[0] == null ? nil : $a[0]), view_backend = ($a[1] == null ? nil : $a[1]);
            if ((($a = view_backend)['$=='] || $mm('==')).call($a, backend)) {
              return (($g = self.views)['$[]='] || $mm('[]=')).call($g, view_name, (($h = tc).$new || $mm('new')).call($h, view_name, eruby))
              } else {
              return nil
            };
            } else {
            return nil
          }
        }, TMP_2._s = this, TMP_2), $h).call($i);
        }
        else {($l = (($m = __scope.Debug).$debug || $mm('debug')), $l._p = (TMP_3 = function() {

          var self = TMP_3._s || this;
          
          return "No built-in templates for backend: " + (backend)
        }, TMP_3._s = this, TMP_3), $l).call($m)};
        if (($l = template_dir = (($n = options).$delete || $mm('delete')).call($n, "template_dir")) !== false && $l !== nil) {
          (($l = __scope.Helpers).$require_library || $mm('require_library')).call($l, "tilt");
          template_glob = "*";
          if (($o = engine = (($p = options)['$[]'] || $mm('[]')).call($p, "template_engine")) !== false && $o !== nil) {
            template_glob = "*." + (engine);
            if (($o = (($q = __scope.File)['$directory?'] || $mm('directory?')).call($q, (($r = __scope.File).$join || $mm('join')).call($r, template_dir, engine))) !== false && $o !== nil) {
              template_dir = (($o = __scope.File).$join || $mm('join')).call($o, template_dir, engine)
            };
          };
          if (($s = (($t = __scope.File)['$directory?'] || $mm('directory?')).call($t, (($u = __scope.File).$join || $mm('join')).call($u, template_dir, (($v = options)['$[]'] || $mm('[]')).call($v, "backend")))) !== false && $s !== nil) {
            template_dir = (($s = __scope.File).$join || $mm('join')).call($s, template_dir, (($w = options)['$[]'] || $mm('[]')).call($w, "backend"))
          };
          view_opts = __hash2(["erb", "haml", "slim"], {"erb": __hash2(["trim"], {"trim": "<>"}), "haml": __hash2(["attr_wrapper", "ugly", "escape_attrs"], {"attr_wrapper": "\"", "ugly": true, "escape_attrs": false}), "slim": __hash2(["disable_escape", "sort_attrs", "pretty"], {"disable_escape": true, "sort_attrs": false, "pretty": false})});
          if ((($x = backend)['$=='] || $mm('==')).call($x, "html5")) {
            (($y = (($z = view_opts)['$[]'] || $mm('[]')).call($z, "haml"))['$[]='] || $mm('[]=')).call($y, "format", (($aa = (($ab = view_opts)['$[]'] || $mm('[]')).call($ab, "slim"))['$[]='] || $mm('[]=')).call($aa, "format", "html5"))
          };
          slim_loaded = false;
          helpers = nil;
          ($ac = (($ad = ($ae = (($af = (($ag = __scope.Dir).$glob || $mm('glob')).call($ag, (($ah = __scope.File).$join || $mm('join')).call($ah, template_dir, template_glob))).$select || $mm('select')), $ae._p = (TMP_5 = function(f) {

            var self = TMP_5._s || this, $a;
            if (f == null) f = nil;

            return (($a = __scope.File)['$file?'] || $mm('file?')).call($a, f)
          }, TMP_5._s = this, TMP_5), $ae).call($af)).$each || $mm('each')), $ac._p = (TMP_4 = function(template) {

            var basename = nil, name_parts = nil, view_name = nil, ext_name = nil, self = TMP_4._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n;
            if (self.views == null) self.views = nil;

            if (template == null) template = nil;

            basename = (($a = __scope.File).$basename || $mm('basename')).call($a, template);
            if ((($b = basename)['$=='] || $mm('==')).call($b, "helpers.rb")) {
              helpers = template;
              return nil;;
            };
            name_parts = (($c = basename).$split || $mm('split')).call($c, ".");
            if ((($d = (($e = name_parts).$size || $mm('size')).call($e))['$<'] || $mm('<')).call($d, 2)) {
              return nil;
            };
            view_name = (($f = name_parts).$first || $mm('first')).call($f);
            ext_name = (($g = name_parts).$last || $mm('last')).call($g);
            if (($h = (($i = (($j = ext_name)['$=='] || $mm('==')).call($j, "slim")) ? ($k = slim_loaded, ($k === nil || $k === false)) : $i)) !== false && $h !== nil) {
              (($h = __scope.Helpers).$require_library || $mm('require_library')).call($h, "slim")
            };
            if (($i = (($k = __scope.Tilt)['$registered?'] || $mm('registered?')).call($k, ext_name)) === false || $i === nil) {
              return nil;
            };
            return (($i = self.views)['$[]='] || $mm('[]=')).call($i, view_name, (($l = __scope.Tilt).$new || $mm('new')).call($l, template, nil, (($m = view_opts)['$[]'] || $mm('[]')).call($m, (($n = ext_name).$to_sym || $mm('to_sym')).call($n))));
          }, TMP_4._s = this, TMP_4), $ac).call($ad);
          if (($ac = (($ae = helpers)['$nil?'] || $mm('nil?')).call($ae)) !== false && $ac !== nil) {
            return nil
            } else {
            return 
          };
          } else {
          return nil
        };
      };

      def.$render = function(view, object, locals) {
        var $a, $b, $c, $d;if (locals == null) {
          locals = __hash2([], {})
        }
        if (($a = (($b = this.views)['$has_key?'] || $mm('has_key?')).call($b, view)) === false || $a === nil) {
          (($a = this).$raise || $mm('raise')).call($a, "Couldn't find a view in @views for " + (view))
        };
        return (($c = (($d = this.views)['$[]'] || $mm('[]')).call($d, view)).$render || $mm('render')).call($c, object);
      };

      def.$views = function() {
        var readonly_views = nil, $a, $b;
        readonly_views = (($a = this.views).$dup || $mm('dup')).call($a);
        (($b = readonly_views).$freeze || $mm('freeze')).call($b);
        return readonly_views;
      };

      def.$load_eruby = function(name) {
        var $a, $b, $c, $d, $e;
        if (($a = __scope.OPAL) !== false && $a !== nil) {
          return nil
        };
        if (($a = (($b = (($c = name)['$nil?'] || $mm('nil?')).call($c)), $b !== false && $b !== nil ? $b : ($d = (($e = ["erb", "erubis"])['$include?'] || $mm('include?')).call($e, name), ($d === nil || $d === false)))) !== false && $a !== nil) {
          name = "erb"
        };
        (($a = __scope.Helpers).$require_library || $mm('require_library')).call($a, name);
        if ((($b = name)['$=='] || $mm('==')).call($b, "erb")) {
          return __opal.Object._scope.ERB
          } else {
          if ((($d = name)['$=='] || $mm('==')).call($d, "erubis")) {
            return (__opal.Object._scope.Erubis)._scope.FastEruby
            } else {
            return nil
          }
        };
      };

      Renderer._defs('$extract_view_mapping', function(qualified_class) {
        var view_name = nil, backend = nil, $a, $b, $c, $d, $e, $f, $g, $h;
        (($a = (($b = (($c = (($d = (($e = (($f = qualified_class).$to_s || $mm('to_s')).call($f)).$gsub || $mm('gsub')).call($e, /^Asciidoctor::/, "")).$gsub || $mm('gsub')).call($d, /Template$/, "")).$split || $mm('split')).call($c, "::")).$reverse || $mm('reverse')).call($b))._isArray ? $a : ($a = [$a])), view_name = ($a[0] == null ? nil : $a[0]), backend = ($a[1] == null ? nil : $a[1]);
        view_name = (($a = this).$camelcase_to_underscore || $mm('camelcase_to_underscore')).call($a, view_name);
        if (($g = (($h = backend)['$nil?'] || $mm('nil?')).call($h)) === false || $g === nil) {
          backend = (($g = backend).$downcase || $mm('downcase')).call($g)
        };
        return [view_name, backend];
      });

      Renderer._defs('$camelcase_to_underscore', function(str) {
        var $a, $b, $c;
        return (($a = (($b = (($c = str).$gsub || $mm('gsub')).call($c, /([[:upper:]]+)([[:upper:]][[:alpha:]])/, "1_2")).$gsub || $mm('gsub')).call($b, /([[:lower:]])([[:upper:]])/, "1_2")).$downcase || $mm('downcase')).call($a)
      });

      return nil;
    })(Asciidoctor, null)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __range = __opal.range;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function Section() {};
      Section = __klass(__base, __super, "Section", Section);

      var def = Section.prototype, __scope = Section._scope, super_TMP_1, super_TMP_6;
      def.index = def.sectname = def.special = def.document = def.attributes = def.blocks = def.level = def.parent = def.title = nil;

      def.$index = function() {
        
        return this.index
      }, 
      def['$index='] = function(val) {
        
        return this.index = val
      }, nil;

      def.$sectname = function() {
        
        return this.sectname
      }, 
      def['$sectname='] = function(val) {
        
        return this.sectname = val
      }, nil;

      def.$special = function() {
        
        return this.special
      }, 
      def['$special='] = function(val) {
        
        return this.special = val
      }, nil;

      super_TMP_1 = def.$initialize;
      def.$initialize = function(parent, level) {
        var $a, $b, $c, $d, $e, $f;if (parent == null) {
          parent = nil
        }if (level == null) {
          level = nil
        }
        super_TMP_1.apply(this, [parent, "section"]);
        if (($a = ($b = (($b = level)['$nil?'] || $mm('nil?')).call($b), $b !== false && $b !== nil ? ($c = (($d = parent)['$nil?'] || $mm('nil?')).call($d), ($c === nil || $c === false)) : $b)) !== false && $a !== nil) {
          this.level = ($a = (($e = parent).$level || $mm('level')).call($e), $c = 1, typeof($a) === 'number' ? $a + $c : $a['$+']($c))
        };
        if (($a = ($c = (($c = parent)['$is_a?'] || $mm('is_a?')).call($c, __scope.Section), $c !== false && $c !== nil ? (($f = parent).$special || $mm('special')).call($f) : $c)) !== false && $a !== nil) {
          this.special = true
          } else {
          this.special = false
        };
        return this.index = 0;
      };

      def.$name = def.$title;

      def.$generate_id = function() {
        var separator = nil, prefix = nil, base_id = nil, gen_id = nil, cnt = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p;
        if (($a = (($b = this.document)['$attr?'] || $mm('attr?')).call($b, "sectids")) !== false && $a !== nil) {
          separator = (($a = this.document).$attr || $mm('attr')).call($a, "idseparator", "_");
          prefix = (($c = this.document).$attr || $mm('attr')).call($c, "idprefix", "_");
          base_id = ($d = prefix, $e = (($f = (($g = (($h = (($i = (($j = (($k = this).$title || $mm('title')).call($k)).$downcase || $mm('downcase')).call($j)).$gsub || $mm('gsub')).call($i, /&#\d+;/, separator)).$gsub || $mm('gsub')).call($h, /\W+/, separator)).$tr_s || $mm('tr_s')).call($g, separator, separator)).$chomp || $mm('chomp')).call($f, separator), typeof($d) === 'number' ? $d + $e : $d['$+']($e));
          if (($d = (($e = base_id)['$start_with?'] || $mm('start_with?')).call($e, separator)) !== false && $d !== nil) {
            base_id = (($d = base_id)['$[]'] || $mm('[]')).call($d, __range(1, -1, false))
          };
          gen_id = base_id;
          cnt = 2;
          while (($m = (($n = (($o = (($p = this.document).$references || $mm('references')).call($p))['$[]'] || $mm('[]')).call($o, "ids"))['$has_key?'] || $mm('has_key?')).call($n, gen_id)) !== false && $m !== nil){gen_id = "" + (base_id) + (separator) + (cnt);
          cnt = (($m = cnt)['$+'] || $mm('+')).call($m, 1);};
          return gen_id;
          } else {
          return nil
        };
      };

      def.$render = function() {
        var TMP_2, $a, $b, $c, $d;
        ($a = (($b = __scope.Debug).$debug || $mm('debug')), $a._p = (TMP_2 = function() {

          var self = TMP_2._s || this;
          
          return "Now rendering section for " + (self)
        }, TMP_2._s = this, TMP_2), $a).call($b);
        (($a = this.document).$playback_attributes || $mm('playback_attributes')).call($a, this.attributes);
        return (($c = (($d = this).$renderer || $mm('renderer')).call($d)).$render || $mm('render')).call($c, "section", this);
      };

      def.$content = function() {
        var $a, TMP_3, $b, $c;
        return (($a = ($b = (($c = this.blocks).$map || $mm('map')), $b._p = (TMP_3 = function(b) {

          var self = TMP_3._s || this, $a;
          if (b == null) b = nil;

          return (($a = b).$render || $mm('render')).call($a)
        }, TMP_3._s = this, TMP_3), $b).call($c)).$join || $mm('join')).call($a);
      };

      def.$sectnum = function(delimiter, append) {
        var $a, $b, $c, $d, $e, $f, $g;if (delimiter == null) {
          delimiter = "."
        }if (append == null) {
          append = nil
        }
        (($a = append), $a !== false && $a !== nil ? $a : append = (function() { if ((($b = append)['$=='] || $mm('==')).call($b, false)) {
          return ""
          } else {
          return delimiter
        }; return nil; }).call(this));
        if (($a = ($c = ($c = ($c = (($d = this.level)['$nil?'] || $mm('nil?')).call($d), ($c === nil || $c === false)), $c !== false && $c !== nil ? (($c = this.level)['$>'] || $mm('>')).call($c, 1) : $c), $c !== false && $c !== nil ? (($e = this.parent)['$is_a?'] || $mm('is_a?')).call($e, __scope.Section) : $c)) !== false && $a !== nil) {
          return "" + ((($a = this.parent).$sectnum || $mm('sectnum')).call($a, delimiter)) + (($f = this.index, $g = 1, typeof($f) === 'number' ? $f + $g : $f['$+']($g))) + (append)
          } else {
          return "" + (($f = this.index, $g = 1, typeof($f) === 'number' ? $f + $g : $f['$+']($g))) + (append)
        };
      };

      super_TMP_6 = def.$to_s;
      def.$to_s = function() {
        var $a, $b, $c, $d, $e, $f;
        if (($a = this.title) !== false && $a !== nil) {
          if (($a = ($b = this.level, $b !== false && $b !== nil ? this.index : $b)) !== false && $a !== nil) {
            return "" + ((($a = super_TMP_4.apply(this, __slice.call(arguments))).$to_s || $mm('to_s')).call($a)) + " - " + ((($b = this).$sectnum || $mm('sectnum')).call($b)) + " " + (this.title) + " [blocks:" + ((($c = this.blocks).$size || $mm('size')).call($c)) + "]"
            } else {
            return "" + ((($d = super_TMP_5.apply(this, __slice.call(arguments))).$to_s || $mm('to_s')).call($d)) + " - " + (this.title) + " [blocks:" + ((($e = this.blocks).$size || $mm('size')).call($e)) + "]"
          }
          } else {
          return (($f = super_TMP_6.apply(this, __slice.call(arguments))).$to_s || $mm('to_s')).call($f)
        };
      };

      return nil;
    })(Asciidoctor, __scope.AbstractBlock)
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module, __klass = __opal.klass, __hash2 = __opal.hash2, __range = __opal.range;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    (function(__base, __super){
      function Table() {};
      Table = __klass(__base, __super, "Table", Table);

      var def = Table.prototype, __scope = Table._scope, super_TMP_1;
      def.caption = def.columns = def.rows = def.attributes = def.document = nil;

      (function(__base, __super){
        function Rows() {};
        Rows = __klass(__base, __super, "Rows", Rows);

        var def = Rows.prototype, __scope = Rows._scope;
        def.head = def.foot = def.body = nil;

        def.$head = function() {
          
          return this.head
        }, 
        def['$head='] = function(val) {
          
          return this.head = val
        }, 
        def.$foot = function() {
          
          return this.foot
        }, 
        def['$foot='] = function(val) {
          
          return this.foot = val
        }, 
        def.$body = function() {
          
          return this.body
        }, 
        def['$body='] = function(val) {
          
          return this.body = val
        }, nil;

        def.$initialize = function(head, foot, body) {
          
          this.head = head;
          this.foot = foot;
          return this.body = body;
        };

        def['$[]'] = function(name) {
          var $case = nil, $a, $b, $c;
          return (function() { $case = name;if ((($a = "head")['$==='] || $mm('===')).call($a, $case)) {
          return this.head
          }
          else if ((($b = "foot")['$==='] || $mm('===')).call($b, $case)) {
          return this.foot
          }
          else if ((($c = "body")['$==='] || $mm('===')).call($c, $case)) {
          return this.body
          }
          else {return nil} }).call(this);
        };

        return nil;
      })(Table, null);

      __scope.DEFAULT_DATA_FORMAT = "psv";

      __scope.DATA_FORMATS = ["psv", "dsv", "csv"];

      __scope.DEFAULT_DELIMITERS = __hash2(["psv", "dsv", "csv"], {"psv": "|", "dsv": ":", "csv": ","});

      __scope.TEXT_STYLES = __hash2(["d", "s", "e", "m", "h", "l", "v", "a"], {"d": "none", "s": "strong", "e": "emphasis", "m": "monospaced", "h": "header", "l": "literal", "v": "verse", "a": "asciidoc"});

      __scope.ALIGNMENTS = __hash2(["h", "v"], {"h": __hash2(["<", ">", "^"], {"<": "left", ">": "right", "^": "center"}), "v": __hash2(["<", ">", "^"], {"<": "top", ">": "bottom", "^": "middle"})});

      __scope.BLANK_LINE_PATTERN = /\n[[:blank:]]*\n/;

      def.$caption = function() {
        
        return this.caption
      }, 
      def['$caption='] = function(val) {
        
        return this.caption = val
      }, nil;

      def.$columns = function() {
        
        return this.columns
      }, 
      def['$columns='] = function(val) {
        
        return this.columns = val
      }, nil;

      def.$rows = function() {
        
        return this.rows
      }, 
      def['$rows='] = function(val) {
        
        return this.rows = val
      }, nil;

      super_TMP_1 = def.$initialize;
      def.$initialize = function(parent, attributes) {
        var pcwidth = nil, pcwidth_intval = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w;
        super_TMP_1.apply(this, [parent, "table"]);
        this.caption = nil;
        this.rows = (($a = __scope.Rows).$new || $mm('new')).call($a, [], [], []);
        this.columns = [];
        if (($b = (($c = this.attributes)['$has_key?'] || $mm('has_key?')).call($c, "tablepcwidth")) === false || $b === nil) {
          pcwidth = (($b = attributes)['$[]'] || $mm('[]')).call($b, "width");
          pcwidth_intval = (($d = (($e = pcwidth).$to_i || $mm('to_i')).call($e)).$abs || $mm('abs')).call($d);
          if (($f = (($g = (($h = (($i = pcwidth_intval)['$=='] || $mm('==')).call($i, 0)) ? ($j = (($k = pcwidth)['$=='] || $mm('==')).call($k, "0"), ($j === nil || $j === false)) : $h)), $g !== false && $g !== nil ? $g : (($h = pcwidth_intval)['$>'] || $mm('>')).call($h, 100))) !== false && $f !== nil) {
            pcwidth_intval = 100
          };
          (($f = this.attributes)['$[]='] || $mm('[]=')).call($f, "tablepcwidth", pcwidth_intval);
        };
        if (($g = (($j = (($l = this.document).$attributes || $mm('attributes')).call($l))['$has_key?'] || $mm('has_key?')).call($j, "pagewidth")) !== false && $g !== nil) {
          return ($g = "tableabswidth", $m = this.attributes, (($n = (($o = $m)['$[]'] || $mm('[]')).call($o, $g)), $n !== false && $n !== nil ? $n : (($p = $m)['$[]='] || $mm('[]=')).call($p, $g, (($q = ($r = ($t = (($v = (($w = this.attributes)['$[]'] || $mm('[]')).call($w, "tablepcwidth")).$to_f || $mm('to_f')).call($v), $u = 100, typeof($t) === 'number' ? $t / $u : $t['$/']($u)), $s = (($t = (($u = this.document).$attributes || $mm('attributes')).call($u))['$[]'] || $mm('[]')).call($t, "pagewidth"), typeof($r) === 'number' ? $r * $s : $r['$*']($s))).$round || $mm('round')).call($q))))
          } else {
          return nil
        };
      };

      def.$create_columns = function(col_specs) {
        var total_width = nil, even_width = nil, TMP_2, $a, $b, $c, $d, $e, $f, $g, $h, TMP_3;
        total_width = 0;
        this.columns = ($a = (($b = col_specs).$inject || $mm('inject')), $a._p = (TMP_2 = function(collector, col_spec) {

          var self = TMP_2._s || this, $a, $b, $c, $d, $e;
          if (collector == null) collector = nil;
if (col_spec == null) col_spec = nil;

          total_width = (($a = total_width)['$+'] || $mm('+')).call($a, (($b = col_spec)['$[]'] || $mm('[]')).call($b, "width"));
          (($c = collector)['$<<'] || $mm('<<')).call($c, (($d = __scope.Column).$new || $mm('new')).call($d, self, (($e = collector).$size || $mm('size')).call($e), col_spec));
          return collector;
        }, TMP_2._s = this, TMP_2), $a).call($b, []);
        if (($a = ($c = (($d = this.columns)['$empty?'] || $mm('empty?')).call($d), ($c === nil || $c === false))) !== false && $a !== nil) {
          (($a = this.attributes)['$[]='] || $mm('[]=')).call($a, "colcount", (($c = this.columns).$size || $mm('size')).call($c));
          even_width = (($e = ($f = 100.0, $g = (($h = this.columns).$size || $mm('size')).call($h), typeof($f) === 'number' ? $f / $g : $f['$/']($g))).$floor || $mm('floor')).call($e);
          ($f = (($g = this.columns).$each || $mm('each')), $f._p = (TMP_3 = function(c) {

            var self = TMP_3._s || this, $a;
            if (c == null) c = nil;

            return (($a = c).$assign_width || $mm('assign_width')).call($a, total_width, even_width)
          }, TMP_3._s = this, TMP_3), $f).call($g);
        };
        return nil;
      };

      def.$partition_header_footer = function(attributes) {
        var head = nil, $a, $b, $c, $d, $e, $f, $g, $h, TMP_4, $i, $j, $k, $l, $m, $n, $o, $p;
        (($a = this.attributes)['$[]='] || $mm('[]=')).call($a, "rowcount", (($b = (($c = this.rows).$body || $mm('body')).call($c)).$size || $mm('size')).call($b));
        if (($d = ($e = ($e = (($f = (($g = this.rows).$body || $mm('body')).call($g))['$empty?'] || $mm('empty?')).call($f), ($e === nil || $e === false)), $e !== false && $e !== nil ? (($e = attributes)['$has_key?'] || $mm('has_key?')).call($e, "header-option") : $e)) !== false && $d !== nil) {
          head = (($d = (($h = this.rows).$body || $mm('body')).call($h)).$shift || $mm('shift')).call($d);
          ($i = (($j = head).$each || $mm('each')), $i._p = (TMP_4 = function(c) {

            var self = TMP_4._s || this, $a, $b;
            if (c == null) c = nil;

            return (($a = (($b = c).$attributes || $mm('attributes')).call($b)).$delete || $mm('delete')).call($a, "style")
          }, TMP_4._s = this, TMP_4), $i).call($j);
          (($i = this.rows)['$head='] || $mm('head=')).call($i, [head]);
        };
        if (($k = ($l = ($l = (($m = (($n = this.rows).$body || $mm('body')).call($n))['$empty?'] || $mm('empty?')).call($m), ($l === nil || $l === false)), $l !== false && $l !== nil ? (($l = attributes)['$has_key?'] || $mm('has_key?')).call($l, "footer-option") : $l)) !== false && $k !== nil) {
          (($k = this.rows)['$foot='] || $mm('foot=')).call($k, [(($o = (($p = this.rows).$body || $mm('body')).call($p)).$pop || $mm('pop')).call($o)])
        };
        return nil;
      };

      def.$render = function() {
        var TMP_5, $a, $b, $c, $d;
        ($a = (($b = __scope.Debug).$debug || $mm('debug')), $a._p = (TMP_5 = function() {

          var self = TMP_5._s || this;
          
          return "Now rendering table for " + (self)
        }, TMP_5._s = this, TMP_5), $a).call($b);
        (($a = this.document).$playback_attributes || $mm('playback_attributes')).call($a, this.attributes);
        return (($c = (($d = this).$renderer || $mm('renderer')).call($d)).$render || $mm('render')).call($c, "block_table", this);
      };

      return nil;
    })(Asciidoctor, __scope.AbstractBlock);

    (function(__base, __super){
      function Column() {};
      Column = __klass(__base, __super, "Column", Column);

      var def = Column.prototype, __scope = Column._scope, super_TMP_6;
      def.attributes = nil;

      super_TMP_6 = def.$initialize;
      def.$initialize = function(table, index, attributes) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;if (attributes == null) {
          attributes = __hash2([], {})
        }
        super_TMP_6.apply(this, [table, "column"]);
        (($a = attributes)['$[]='] || $mm('[]=')).call($a, "colnumber", ($b = index, $c = 1, typeof($b) === 'number' ? $b + $c : $b['$+']($c)));
        ($b = "width", $c = attributes, (($d = (($e = $c)['$[]'] || $mm('[]')).call($e, $b)), $d !== false && $d !== nil ? $d : (($f = $c)['$[]='] || $mm('[]=')).call($f, $b, 1)));
        ($b = "halign", $c = attributes, (($d = (($g = $c)['$[]'] || $mm('[]')).call($g, $b)), $d !== false && $d !== nil ? $d : (($h = $c)['$[]='] || $mm('[]=')).call($h, $b, "left")));
        ($b = "valign", $c = attributes, (($d = (($i = $c)['$[]'] || $mm('[]')).call($i, $b)), $d !== false && $d !== nil ? $d : (($j = $c)['$[]='] || $mm('[]=')).call($j, $b, "top")));
        return (($b = this).$update_attributes || $mm('update_attributes')).call($b, attributes);
      };

      def.$assign_width = function(total_width, even_width) {
        var width = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p;
        if ((($a = total_width)['$>'] || $mm('>')).call($a, 0)) {
          width = (($b = ($c = ($e = (($g = (($h = this.attributes)['$[]'] || $mm('[]')).call($h, "width")).$to_f || $mm('to_f')).call($g), $f = total_width, typeof($e) === 'number' ? $e / $f : $e['$/']($f)), $d = 100, typeof($c) === 'number' ? $c * $d : $c['$*']($d))).$floor || $mm('floor')).call($b)
          } else {
          width = even_width
        };
        (($c = this.attributes)['$[]='] || $mm('[]=')).call($c, "colpcwidth", width);
        if (($d = (($e = (($f = (($i = this).$parent || $mm('parent')).call($i)).$attributes || $mm('attributes')).call($f))['$has_key?'] || $mm('has_key?')).call($e, "tableabswidth")) !== false && $d !== nil) {
          (($d = this.attributes)['$[]='] || $mm('[]=')).call($d, "colabswidth", (($j = ($k = ($m = (($o = width).$to_f || $mm('to_f')).call($o), $n = 100, typeof($m) === 'number' ? $m / $n : $m['$/']($n)), $l = (($m = (($n = (($p = this).$parent || $mm('parent')).call($p)).$attributes || $mm('attributes')).call($n))['$[]'] || $mm('[]')).call($m, "tableabswidth"), typeof($k) === 'number' ? $k * $l : $k['$*']($l))).$round || $mm('round')).call($j))
        };
        return nil;
      };

      return nil;
    })(__scope.Table, __scope.AbstractNode);

    (function(__base, __super){
      function Cell() {};
      Cell = __klass(__base, __super, "Cell", Cell);

      var def = Cell.prototype, __scope = Cell._scope, super_TMP_7, super_TMP_9;
      def.colspan = def.rowspan = def.inner_document = def.attributes = def.text = def.document = nil;

      def.$colspan = function() {
        
        return this.colspan
      }, 
      def['$colspan='] = function(val) {
        
        return this.colspan = val
      }, nil;

      def.$rowspan = function() {
        
        return this.rowspan
      }, 
      def['$rowspan='] = function(val) {
        
        return this.rowspan = val
      }, nil;

      def.$column = def.$parent;

      def.$inner_document = function() {
        
        return this.inner_document
      }, nil;

      super_TMP_7 = def.$initialize;
      def.$initialize = function(column, text, attributes) {
        var $case = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q;if (attributes == null) {
          attributes = __hash2([], {})
        }
        super_TMP_7.apply(this, [column, "cell"]);
        this.text = text;
        this.colspan = nil;
        this.rowspan = nil;
        if (($a = ($b = (($c = column)['$nil?'] || $mm('nil?')).call($c), ($b === nil || $b === false))) !== false && $a !== nil) {
          (($a = this).$update_attributes || $mm('update_attributes')).call($a, (($b = column).$attributes || $mm('attributes')).call($b))
        };
        if (($d = ($e = (($f = attributes)['$nil?'] || $mm('nil?')).call($f), ($e === nil || $e === false))) !== false && $d !== nil) {
          if (($d = (($e = attributes)['$has_key?'] || $mm('has_key?')).call($e, "colspan")) !== false && $d !== nil) {
            this.colspan = (($d = attributes)['$[]'] || $mm('[]')).call($d, "colspan");
            (($g = attributes).$delete || $mm('delete')).call($g, "colspan");
          };
          if (($h = (($i = attributes)['$has_key?'] || $mm('has_key?')).call($i, "rowspan")) !== false && $h !== nil) {
            this.rowspan = (($h = attributes)['$[]'] || $mm('[]')).call($h, "rowspan");
            (($j = attributes).$delete || $mm('delete')).call($j, "rowspan");
          };
          (($k = this).$update_attributes || $mm('update_attributes')).call($k, attributes);
        };
        return (function() { $case = (($l = this.attributes)['$[]'] || $mm('[]')).call($l, "style");if ((($m = "verse")['$==='] || $mm('===')).call($m, $case) || (($n = "literal")['$==='] || $mm('===')).call($n, $case)) {
        return nil
        }
        else if ((($p = "asciidoc")['$==='] || $mm('===')).call($p, $case)) {
        return this.inner_document = (($o = __scope.Document).$new || $mm('new')).call($o, this.text, __hash2(["header_footer", "parent"], {"header_footer": false, "parent": this.document}))
        }
        else {return this.text = (($q = this.text).$tr || $mm('tr')).call($q, "\n", " ")} }).call(this);
      };

      def.$text = function() {
        var $a;
        return (($a = this).$apply_normal_subs || $mm('apply_normal_subs')).call($a, this.text);
      };

      def.$content = function() {
        var style = nil, $a, $b, $c, TMP_8, $d, $e, $f, $g;
        style = (($a = this).$attr || $mm('attr')).call($a, "style", nil, false);
        if ((($b = style)['$=='] || $mm('==')).call($b, "asciidoc")) {
          return (($c = this.inner_document).$render || $mm('render')).call($c)
          } else {
          return ($d = (($e = (($f = (($g = this).$text || $mm('text')).call($g)).$split || $mm('split')).call($f, (__scope.Table)._scope.BLANK_LINE_PATTERN)).$map || $mm('map')), $d._p = (TMP_8 = function(p) {

            var self = TMP_8._s || this, $a, $b, $c, $d;
            if (p == null) p = nil;

            if (($a = (($b = ($c = style, ($c === nil || $c === false))), $b !== false && $b !== nil ? $b : (($c = style)['$=='] || $mm('==')).call($c, "header"))) !== false && $a !== nil) {
              return p
              } else {
              return (($a = (($b = __scope.Inline).$new || $mm('new')).call($b, (($d = self).$parent || $mm('parent')).call($d), "quoted", p, __hash2(["type"], {"type": style}))).$render || $mm('render')).call($a)
            }
          }, TMP_8._s = this, TMP_8), $d).call($e)
        };
      };

      super_TMP_9 = def.$to_s;
      def.$to_s = function() {
        var $a, $b;
        return "" + ((($a = super_TMP_9.apply(this, __slice.call(arguments))).$to_s || $mm('to_s')).call($a)) + " - [text: " + (this.text) + ", colspan: " + ((($b = this.colspan), $b !== false && $b !== nil ? $b : 1)) + ", rowspan: " + ((($b = this.rowspan), $b !== false && $b !== nil ? $b : 1)) + ", attributes: " + (this.attributes) + "]";
      };

      return nil;
    })(__scope.Table, __scope.AbstractNode);

    (function(__base, __super){
      function ParserContext() {};
      ParserContext = __klass(__base, __super, "ParserContext", ParserContext);

      var def = ParserContext.prototype, __scope = ParserContext._scope;
      def.table = def.format = def.col_count = def.buffer = def.delimiter = def.delimiter_re = def.cell_specs = def.cell_open = def.current_row = def.col_visits = def.active_rowspans = def.linenum = nil;

      def.$table = function() {
        
        return this.table
      }, 
      def['$table='] = function(val) {
        
        return this.table = val
      }, nil;

      def.$format = function() {
        
        return this.format
      }, 
      def['$format='] = function(val) {
        
        return this.format = val
      }, nil;

      def.$col_count = function() {
        
        return this.col_count
      }, nil;

      def.$buffer = function() {
        
        return this.buffer
      }, 
      def['$buffer='] = function(val) {
        
        return this.buffer = val
      }, nil;

      def.$delimiter = function() {
        
        return this.delimiter
      }, nil;

      def.$delimiter_re = function() {
        
        return this.delimiter_re
      }, nil;

      def.$initialize = function(table, attributes) {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o;if (attributes == null) {
          attributes = __hash2([], {})
        }
        this.table = table;
        if (($a = (($b = attributes)['$has_key?'] || $mm('has_key?')).call($b, "format")) !== false && $a !== nil) {
          this.format = (($a = attributes)['$[]'] || $mm('[]')).call($a, "format");
          if (($c = ($d = (($e = (__scope.Table)._scope.DATA_FORMATS)['$include?'] || $mm('include?')).call($e, this.format), ($d === nil || $d === false))) !== false && $c !== nil) {
            (($c = this).$raise || $mm('raise')).call($c, "Illegal table format: " + (this.format))
          };
          } else {
          this.format = (__scope.Table)._scope.DEFAULT_DATA_FORMAT
        };
        if (($d = ($f = (($f = (($g = this.format)['$=='] || $mm('==')).call($g, "psv")) ? ($h = (($i = attributes)['$has_key?'] || $mm('has_key?')).call($i, "separator"), ($h === nil || $h === false)) : $f), $f !== false && $f !== nil ? (($f = (($h = table).$document || $mm('document')).call($h))['$nested?'] || $mm('nested?')).call($f) : $f)) !== false && $d !== nil) {
          this.delimiter = "!"
          } else {
          this.delimiter = (($d = attributes).$fetch || $mm('fetch')).call($d, "separator", (($j = (__scope.Table)._scope.DEFAULT_DELIMITERS)['$[]'] || $mm('[]')).call($j, this.format))
        };
        this.delimiter_re = (new RegExp("" + (($k = __scope.Regexp).$escape || $mm('escape')).call($k, this.delimiter)));
        this.col_count = (function() { if (($l = (($m = (($n = table).$columns || $mm('columns')).call($n))['$empty?'] || $mm('empty?')).call($m)) !== false && $l !== nil) {
          return -1
          } else {
          return (($l = (($o = table).$columns || $mm('columns')).call($o)).$size || $mm('size')).call($l)
        }; return nil; }).call(this);
        this.buffer = "";
        this.cell_specs = [];
        this.cell_open = false;
        this.active_rowspans = [0];
        this.col_visits = 0;
        this.current_row = [];
        return this.linenum = -1;
      };

      def['$starts_with_delimiter?'] = function(line) {
        var $a;
        return (($a = line)['$start_with?'] || $mm('start_with?')).call($a, this.delimiter);
      };

      def.$match_delimiter = function(line) {
        var $a;
        return (($a = line).$match || $mm('match')).call($a, this.delimiter_re);
      };

      def.$skip_matched_delimiter = function(match, escaped) {
        var $a, $b, $c, $d;if (escaped == null) {
          escaped = false
        }
        this.buffer = "" + (this.buffer) + ((function() { if (escaped !== false && escaped !== nil) {
          return (($a = (($b = match).$pre_match || $mm('pre_match')).call($b)).$chop || $mm('chop')).call($a)
          } else {
          return (($c = match).$pre_match || $mm('pre_match')).call($c)
        }; return nil; }).call(this)) + (this.delimiter);
        return (($d = match).$post_match || $mm('post_match')).call($d);
      };

      def['$buffer_has_unclosed_quotes?'] = function(append) {
        var record = nil, $a, $b, $c, $d, $e;if (append == null) {
          append = nil
        }
        record = (($a = ("" + (this.buffer) + (append))).$strip || $mm('strip')).call($a);
        return ($b = ($b = (($b = record)['$start_with?'] || $mm('start_with?')).call($b, "\""), $b !== false && $b !== nil ? ($c = (($d = record)['$start_with?'] || $mm('start_with?')).call($d, "\"\""), ($c === nil || $c === false)) : $b), $b !== false && $b !== nil ? ($c = (($e = record)['$end_with?'] || $mm('end_with?')).call($e, "\""), ($c === nil || $c === false)) : $b);
      };

      def['$buffer_quoted?'] = function() {
        var $a, $b, $c, $d;
        (($a = this.buffer)['$lstrip!'] || $mm('lstrip!')).call($a);
        return ($b = (($b = this.buffer)['$start_with?'] || $mm('start_with?')).call($b, "\""), $b !== false && $b !== nil ? ($c = (($d = this.buffer)['$start_with?'] || $mm('start_with?')).call($d, "\"\""), ($c === nil || $c === false)) : $b);
      };

      def.$take_cell_spec = function() {
        var $a;
        return (($a = this.cell_specs).$shift || $mm('shift')).call($a);
      };

      def.$push_cell_spec = function(cell_spec) {
        var $a, $b;if (cell_spec == null) {
          cell_spec = __hash2([], {})
        }
        (($a = this.cell_specs)['$<<'] || $mm('<<')).call($a, (($b = cell_spec), $b !== false && $b !== nil ? $b : __hash2([], {})));
        return nil;
      };

      def.$keep_cell_open = function() {
        
        this.cell_open = true;
        return nil;
      };

      def.$mark_cell_closed = function() {
        
        this.cell_open = false;
        return nil;
      };

      def['$cell_open?'] = function() {
        
        return this.cell_open;
      };

      def['$cell_closed?'] = function() {
        var $a;
        return ($a = this.cell_open, ($a === nil || $a === false));
      };

      def.$close_open_cell = function(next_cell_spec) {
        var $a, $b, $c, $d;if (next_cell_spec == null) {
          next_cell_spec = __hash2([], {})
        }
        (($a = this).$push_cell_spec || $mm('push_cell_spec')).call($a, next_cell_spec);
        if (($b = (($c = this)['$cell_open?'] || $mm('cell_open?')).call($c)) !== false && $b !== nil) {
          (($b = this).$close_cell || $mm('close_cell')).call($b, true)
        };
        (($d = this).$advance || $mm('advance')).call($d);
        return nil;
      };

      def.$close_cell = function(eol) {
        var cell_text = nil, cell_spec = nil, repeat = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, TMP_10, $r, $s;if (eol == null) {
          eol = false
        }
        cell_text = (($a = this.buffer).$strip || $mm('strip')).call($a);
        this.buffer = "";
        if ((($b = (($c = this).$format || $mm('format')).call($c))['$=='] || $mm('==')).call($b, "psv")) {
          cell_spec = (($d = this).$take_cell_spec || $mm('take_cell_spec')).call($d);
          if (($e = (($f = cell_spec)['$nil?'] || $mm('nil?')).call($f)) !== false && $e !== nil) {
            (($e = this).$puts || $mm('puts')).call($e, "asciidoctor: ERROR: table missing leading separator, recovering automatically");
            cell_spec = __hash2([], {});
            repeat = 1;
            } else {
            repeat = (($g = cell_spec).$fetch || $mm('fetch')).call($g, "repeatcol", 1);
            (($h = cell_spec).$delete || $mm('delete')).call($h, "repeatcol");
          };
          } else {
          cell_spec = nil;
          repeat = 1;
          if ((($i = (($j = this).$format || $mm('format')).call($j))['$=='] || $mm('==')).call($i, "csv")) {
            if (($k = ($l = ($l = (($m = cell_text)['$empty?'] || $mm('empty?')).call($m), ($l === nil || $l === false)), $l !== false && $l !== nil ? (($l = cell_text)['$include?'] || $mm('include?')).call($l, "\"") : $l)) !== false && $k !== nil) {
              if (($k = ($n = (($n = cell_text)['$start_with?'] || $mm('start_with?')).call($n, "\""), $n !== false && $n !== nil ? (($o = cell_text)['$end_with?'] || $mm('end_with?')).call($o, "\"") : $n)) !== false && $k !== nil) {
                cell_text = (($k = (($p = cell_text)['$[]'] || $mm('[]')).call($p, __range(1, -2, false))).$strip || $mm('strip')).call($k)
              };
              cell_text = (($q = cell_text).$tr_s || $mm('tr_s')).call($q, "\"", "\"");
            }
          };
        };
        ($r = (($s = (1)).$upto || $mm('upto')), $r._p = (TMP_10 = function(i) {

          var column = nil, cell = nil, self = TMP_10._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab;
          if (self.col_count == null) self.col_count = nil;
          if (self.table == null) self.table = nil;
          if (self.current_row == null) self.current_row = nil;
          if (self.col_visits == null) self.col_visits = nil;
          if (self.linenum == null) self.linenum = nil;

          if (i == null) i = nil;

          if ((($a = self.col_count)['$=='] || $mm('==')).call($a, -1)) {
            (($b = (($c = self.table).$columns || $mm('columns')).call($c))['$<<'] || $mm('<<')).call($b, (($d = (__scope.Table)._scope.Column).$new || $mm('new')).call($d, self.table, ($e = ($g = (($i = self.current_row).$size || $mm('size')).call($i), $h = i, typeof($g) === 'number' ? $g + $h : $g['$+']($h)), $f = 1, typeof($e) === 'number' ? $e - $f : $e['$-']($f))));
            column = (($e = (($f = self.table).$columns || $mm('columns')).call($f)).$last || $mm('last')).call($e);
            } else {
            column = (($g = (($h = self.table).$columns || $mm('columns')).call($h))['$[]'] || $mm('[]')).call($g, (($j = self.current_row).$size || $mm('size')).call($j))
          };
          cell = (($k = (__scope.Table)._scope.Cell).$new || $mm('new')).call($k, column, cell_text, cell_spec);
          if (($l = (($m = (($n = (($o = cell).$rowspan || $mm('rowspan')).call($o))['$nil?'] || $mm('nil?')).call($n)), $m !== false && $m !== nil ? $m : (($p = (($q = cell).$rowspan || $mm('rowspan')).call($q))['$=='] || $mm('==')).call($p, 1))) === false || $l === nil) {
            (($l = self).$activate_rowspan || $mm('activate_rowspan')).call($l, (($m = cell).$rowspan || $mm('rowspan')).call($m), (($r = (($s = cell).$colspan || $mm('colspan')).call($s)), $r !== false && $r !== nil ? $r : 1))
          };
          self.col_visits = (($r = self.col_visits)['$+'] || $mm('+')).call($r, (($t = (($u = cell).$colspan || $mm('colspan')).call($u)), $t !== false && $t !== nil ? $t : 1));
          (($t = self.current_row)['$<<'] || $mm('<<')).call($t, cell);
          if (($v = ($w = (($w = self)['$end_of_row?'] || $mm('end_of_row?')).call($w), $w !== false && $w !== nil ? (($x = (($y = ($z = (($aa = self.col_count)['$=='] || $mm('==')).call($aa, -1), ($z === nil || $z === false))), $y !== false && $y !== nil ? $y : (($z = self.linenum)['$>'] || $mm('>')).call($z, 0))), $x !== false && $x !== nil ? $x : (($y = eol !== false && eol !== nil) ? (($ab = i)['$=='] || $mm('==')).call($ab, repeat) : $y)) : $w)) !== false && $v !== nil) {
            return (($v = self).$close_row || $mm('close_row')).call($v)
            } else {
            return nil
          };
        }, TMP_10._s = this, TMP_10), $r).call($s, repeat);
        this.open_cell = false;
        return nil;
      };

      def.$close_row = function() {
        var $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
        (($a = (($b = (($c = this.table).$rows || $mm('rows')).call($c)).$body || $mm('body')).call($b))['$<<'] || $mm('<<')).call($a, this.current_row);
        if ((($d = this.col_count)['$=='] || $mm('==')).call($d, -1)) {
          this.col_count = this.col_visits
        };
        this.col_visits = 0;
        this.current_row = [];
        (($e = this.active_rowspans).$shift || $mm('shift')).call($e);
        ($f = 0, $g = this.active_rowspans, (($h = (($i = $g)['$[]'] || $mm('[]')).call($i, $f)), $h !== false && $h !== nil ? $h : (($j = $g)['$[]='] || $mm('[]=')).call($j, $f, 0)));
        return nil;
      };

      def.$activate_rowspan = function(rowspan, colspan) {
        var TMP_11, $a, $b, $c, $d, $e;
        ($a = (($b = (($c = (1)).$upto || $mm('upto')).call($c, ($d = rowspan, $e = 1, typeof($d) === 'number' ? $d - $e : $d['$-']($e)))).$each || $mm('each')), $a._p = (TMP_11 = function(i) {

          var self = TMP_11._s || this, $a, $b, $c, $d, $e, $f;
          if (self.active_rowspans == null) self.active_rowspans = nil;

          if (i == null) i = nil;

          ($a = i, $b = self.active_rowspans, (($c = (($d = $b)['$[]'] || $mm('[]')).call($d, $a)), $c !== false && $c !== nil ? $c : (($e = $b)['$[]='] || $mm('[]=')).call($e, $a, 0)));
          return (($a = self.active_rowspans)['$[]='] || $mm('[]=')).call($a, i, ($b = (($f = self.active_rowspans)['$[]'] || $mm('[]')).call($f, i), $c = colspan, typeof($b) === 'number' ? $b + $c : $b['$+']($c)));
        }, TMP_11._s = this, TMP_11), $a).call($b);
        return nil;
      };

      def['$end_of_row?'] = function() {
        var $a, $b, $c, $d;
        return (($a = (($b = this.col_count)['$=='] || $mm('==')).call($b, -1)), $a !== false && $a !== nil ? $a : (($c = (($d = this).$effective_col_visits || $mm('effective_col_visits')).call($d))['$=='] || $mm('==')).call($c, this.col_count));
      };

      def.$effective_col_visits = function() {
        var $a, $b, $c;
        return ($a = this.col_visits, $b = (($c = this.active_rowspans).$first || $mm('first')).call($c), typeof($a) === 'number' ? $a + $b : $a['$+']($b));
      };

      def.$advance = function() {
        var $a;
        return this.linenum = (($a = this.linenum)['$+'] || $mm('+')).call($a, 1);
      };

      return nil;
    })(__scope.Table, null);
    
  })(self)
})(Opal);
(function(__opal) {
  var self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __module = __opal.module;
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope;

    __scope.VERSION = "0.1.3.pre"
    
  })(self)
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"admonitionblock ");
    (($e = out)['$<<'] || $mm('<<')).call($e, (($f = self).$attr || $mm('attr')).call($f, "name"));
    (($g = out)['$<<'] || $mm('<<')).call($g, "");
    (($h = out)['$<<'] || $mm('<<')).call($h, (function() { if (($i = (($j = self)['$attr?'] || $mm('attr?')).call($j, "role")) !== false && $i !== nil) {
      return " " + ((($i = self).$attr || $mm('attr')).call($i, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($k = out)['$<<'] || $mm('<<')).call($k, "\">\n<table>\n<tr>\n<td class=\"icon\">\n");
    if (($l = (($m = self)['$attr?'] || $mm('attr?')).call($m, "icons")) !== false && $l !== nil) {
      (($l = out)['$<<'] || $mm('<<')).call($l, "<img src=\"");
      (($n = out)['$<<'] || $mm('<<')).call($n, (($o = self).$icon_uri || $mm('icon_uri')).call($o, (($p = self).$attr || $mm('attr')).call($p, "name")));
      (($q = out)['$<<'] || $mm('<<')).call($q, "\" alt=\"");
      (($r = out)['$<<'] || $mm('<<')).call($r, (($s = self).$attr || $mm('attr')).call($s, "caption"));
      (($t = out)['$<<'] || $mm('<<')).call($t, "\">\n");
      } else {
      (($u = out)['$<<'] || $mm('<<')).call($u, "<div class=\"title\">");
      (($v = out)['$<<'] || $mm('<<')).call($v, (($w = self).$attr || $mm('attr')).call($w, "caption"));
      (($x = out)['$<<'] || $mm('<<')).call($x, "</div>");
    };
    (($y = out)['$<<'] || $mm('<<')).call($y, "\n</td>\n<td class=\"content\">");
    (($z = out)['$<<'] || $mm('<<')).call($z, (function() { if (($aa = (($ab = self)['$title?'] || $mm('title?')).call($ab)) !== false && $aa !== nil) {
      return "\n<div class=\"title\">" + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($aa = out)['$<<'] || $mm('<<')).call($aa, "\n");
    (($ac = out)['$<<'] || $mm('<<')).call($ac, (($ad = (($ae = self).$content || $mm('content')).call($ae)).$chomp || $mm('chomp')).call($ad));
    (($af = out)['$<<'] || $mm('<<')).call($af, "\n</td>\n</tr>\n</table>\n</div>\n");
    return (($ag = out).$join || $mm('join')).call($ag);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_admonition")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"audioblock");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "style")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "style"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$attr?'] || $mm('attr?')).call($k, "role")) !== false && $j !== nil) {
      return " " + ((($j = self).$attr || $mm('attr')).call($j, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($l = out)['$<<'] || $mm('<<')).call($l, "\">");
    (($m = out)['$<<'] || $mm('<<')).call($m, (function() { if (($n = (($o = self)['$title?'] || $mm('title?')).call($o)) !== false && $n !== nil) {
      return "\n<div class=\"title\">" + ((function() { if (($n = (($p = self)['$attr?'] || $mm('attr?')).call($p, "caption")) !== false && $n !== nil) {
        return (($n = self).$attr || $mm('attr')).call($n, "caption")
        } else {
        return nil
      }; return nil; }).call(self)) + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($q = out)['$<<'] || $mm('<<')).call($q, "\n<div class=\"content\">\n<audio src=\"");
    (($r = out)['$<<'] || $mm('<<')).call($r, (($s = self).$media_uri || $mm('media_uri')).call($s, (($t = self).$attr || $mm('attr')).call($t, "target")));
    (($u = out)['$<<'] || $mm('<<')).call($u, "\"");
    if (($v = (($w = self)['$attr?'] || $mm('attr?')).call($w, "autoplay-option")) !== false && $v !== nil) {
      (($v = out)['$<<'] || $mm('<<')).call($v, " autoplay")
    };
    (($x = out)['$<<'] || $mm('<<')).call($x, "");
    if (($y = (($z = self)['$attr?'] || $mm('attr?')).call($z, "nocontrols-option")) === false || $y === nil) {
      (($y = out)['$<<'] || $mm('<<')).call($y, " controls")
    };
    (($aa = out)['$<<'] || $mm('<<')).call($aa, "");
    if (($ab = (($ac = self)['$attr?'] || $mm('attr?')).call($ac, "loop-option")) !== false && $ab !== nil) {
      (($ab = out)['$<<'] || $mm('<<')).call($ab, " loop")
    };
    (($ad = out)['$<<'] || $mm('<<')).call($ad, ">\nYour browser does not support the audio tag.\n</audio>\n</div>\n</div>\n");
    return (($ae = out).$join || $mm('join')).call($ae);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_audio")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, TMP_2, $r, $s, $t, $u, TMP_3, $v, $w, $x, $y, $z;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"colist");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "style")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "style"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$attr?'] || $mm('attr?')).call($k, "role")) !== false && $j !== nil) {
      return " " + ((($j = self).$attr || $mm('attr')).call($j, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($l = out)['$<<'] || $mm('<<')).call($l, "\">");
    (($m = out)['$<<'] || $mm('<<')).call($m, (function() { if (($n = (($o = self)['$title?'] || $mm('title?')).call($o)) !== false && $n !== nil) {
      return "\n<div class=\"title\">" + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($n = out)['$<<'] || $mm('<<')).call($n, "");
    if (($p = (($q = self)['$attr?'] || $mm('attr?')).call($q, "icons")) !== false && $p !== nil) {
      (($p = out)['$<<'] || $mm('<<')).call($p, "\n<table>");
      ($r = (($s = (($t = self).$content || $mm('content')).call($t)).$each_with_index || $mm('each_with_index')), $r._p = (TMP_2 = function(item, i) {

        var self = TMP_2._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i;
        if (item == null) item = nil;
if (i == null) i = nil;

        (($a = out)['$<<'] || $mm('<<')).call($a, "\n<tr>\n<td><img src=\"");
        (($b = out)['$<<'] || $mm('<<')).call($b, (($c = self).$icon_uri || $mm('icon_uri')).call($c, "callouts/" + (($d = i, $e = 1, typeof($d) === 'number' ? $d + $e : $d['$+']($e)))));
        (($d = out)['$<<'] || $mm('<<')).call($d, "\" alt=\"");
        (($e = out)['$<<'] || $mm('<<')).call($e, ($f = i, $g = 1, typeof($f) === 'number' ? $f + $g : $f['$+']($g)));
        (($f = out)['$<<'] || $mm('<<')).call($f, "\"></td>\n<td>");
        (($g = out)['$<<'] || $mm('<<')).call($g, (($h = item).$text || $mm('text')).call($h));
        return (($i = out)['$<<'] || $mm('<<')).call($i, "</td>\n</tr>");
      }, TMP_2._s = self, TMP_2), $r).call($s);
      (($r = out)['$<<'] || $mm('<<')).call($r, "\n</table>");
      } else {
      (($u = out)['$<<'] || $mm('<<')).call($u, "\n<ol>");
      ($v = (($w = (($x = self).$content || $mm('content')).call($x)).$each || $mm('each')), $v._p = (TMP_3 = function(item) {

        var self = TMP_3._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
        if (item == null) item = nil;

        (($a = out)['$<<'] || $mm('<<')).call($a, "\n<li>\n<p>");
        (($b = out)['$<<'] || $mm('<<')).call($b, (($c = item).$text || $mm('text')).call($c));
        (($d = out)['$<<'] || $mm('<<')).call($d, "</p>");
        if (($e = (($f = item)['$blocks?'] || $mm('blocks?')).call($f)) !== false && $e !== nil) {
          (($e = out)['$<<'] || $mm('<<')).call($e, "\n");
          (($g = out)['$<<'] || $mm('<<')).call($g, (($h = item).$content || $mm('content')).call($h));
          (($i = out)['$<<'] || $mm('<<')).call($i, "");
        };
        return (($j = out)['$<<'] || $mm('<<')).call($j, "\n</li>");
      }, TMP_3._s = self, TMP_3), $v).call($w);
      (($v = out)['$<<'] || $mm('<<')).call($v, "\n</ol>");
    };
    (($y = out)['$<<'] || $mm('<<')).call($y, "\n</div>\n");
    return (($z = out).$join || $mm('join')).call($z);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_colist")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, TMP_2, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, TMP_3, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, $bd, $be, $bf, $bg, $bh, TMP_4, $bi, $bj, $bk, $bl, $bm;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    if (($c = (($d = self)['$attr?'] || $mm('attr?')).call($d, "style", "qanda", false)) !== false && $c !== nil) {
      (($c = out)['$<<'] || $mm('<<')).call($c, "\n<div");
      (($e = out)['$<<'] || $mm('<<')).call($e, ($f = self.id, $f !== false && $f !== nil ? " id=\"" + (self.id) + "\"" : $f));
      (($f = out)['$<<'] || $mm('<<')).call($f, " class=\"qlist");
      (($g = out)['$<<'] || $mm('<<')).call($g, (function() { if (($h = (($i = self)['$attr?'] || $mm('attr?')).call($i, "style")) !== false && $h !== nil) {
        return " " + ((($h = self).$attr || $mm('attr')).call($h, "style"))
        } else {
        return nil
      }; return nil; }).call(self));
      (($j = out)['$<<'] || $mm('<<')).call($j, "");
      (($k = out)['$<<'] || $mm('<<')).call($k, (function() { if (($l = (($m = self)['$attr?'] || $mm('attr?')).call($m, "role")) !== false && $l !== nil) {
        return " " + ((($l = self).$attr || $mm('attr')).call($l, "role"))
        } else {
        return nil
      }; return nil; }).call(self));
      (($n = out)['$<<'] || $mm('<<')).call($n, "\">");
      (($o = out)['$<<'] || $mm('<<')).call($o, (function() { if (($p = (($q = self)['$title?'] || $mm('title?')).call($q)) !== false && $p !== nil) {
        return "\n<div class=\"title\">" + (self.title) + "</div>"
        } else {
        return nil
      }; return nil; }).call(self));
      (($p = out)['$<<'] || $mm('<<')).call($p, "\n<ol>");
      ($r = (($s = (($t = self).$content || $mm('content')).call($t)).$each || $mm('each')), $r._p = (TMP_2 = function(dt, dd) {

        var self = TMP_2._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t;
        if (dt == null) dt = nil;
if (dd == null) dd = nil;

        (($a = out)['$<<'] || $mm('<<')).call($a, "\n<li>\n<p><em>");
        (($b = out)['$<<'] || $mm('<<')).call($b, (($c = dt).$text || $mm('text')).call($c));
        (($d = out)['$<<'] || $mm('<<')).call($d, "</em></p>");
        if (($e = (($f = dd)['$nil?'] || $mm('nil?')).call($f)) === false || $e === nil) {
          (($e = out)['$<<'] || $mm('<<')).call($e, "");
          if (($g = (($h = dd)['$text?'] || $mm('text?')).call($h)) !== false && $g !== nil) {
            (($g = out)['$<<'] || $mm('<<')).call($g, "\n<p>");
            (($i = out)['$<<'] || $mm('<<')).call($i, (($j = dd).$text || $mm('text')).call($j));
            (($k = out)['$<<'] || $mm('<<')).call($k, "</p>");
          };
          (($l = out)['$<<'] || $mm('<<')).call($l, "");
          if (($m = (($n = dd)['$blocks?'] || $mm('blocks?')).call($n)) !== false && $m !== nil) {
            (($m = out)['$<<'] || $mm('<<')).call($m, "\n");
            (($o = out)['$<<'] || $mm('<<')).call($o, (($p = (($q = dd).$content || $mm('content')).call($q)).$chomp || $mm('chomp')).call($p));
            (($r = out)['$<<'] || $mm('<<')).call($r, "");
          };
          (($s = out)['$<<'] || $mm('<<')).call($s, "");
        };
        return (($t = out)['$<<'] || $mm('<<')).call($t, "\n</li>");
      }, TMP_2._s = self, TMP_2), $r).call($s);
      (($r = out)['$<<'] || $mm('<<')).call($r, "\n</ol>\n</div>");
      } else {
      if (($u = (($v = self)['$attr?'] || $mm('attr?')).call($v, "style", "horizontal", false)) !== false && $u !== nil) {
        (($u = out)['$<<'] || $mm('<<')).call($u, "\n<div");
        (($w = out)['$<<'] || $mm('<<')).call($w, ($x = self.id, $x !== false && $x !== nil ? " id=\"" + (self.id) + "\"" : $x));
        (($x = out)['$<<'] || $mm('<<')).call($x, " class=\"hdlist");
        (($y = out)['$<<'] || $mm('<<')).call($y, (function() { if (($z = (($aa = self)['$attr?'] || $mm('attr?')).call($aa, "role")) !== false && $z !== nil) {
          return " " + ((($z = self).$attr || $mm('attr')).call($z, "role"))
          } else {
          return nil
        }; return nil; }).call(self));
        (($ab = out)['$<<'] || $mm('<<')).call($ab, "\">");
        (($ac = out)['$<<'] || $mm('<<')).call($ac, (function() { if (($ad = (($ae = self)['$title?'] || $mm('title?')).call($ae)) !== false && $ad !== nil) {
          return "\n<div class=\"title\">" + (self.title) + "</div>"
          } else {
          return nil
        }; return nil; }).call(self));
        (($ad = out)['$<<'] || $mm('<<')).call($ad, "\n<table>\n<colgroup>\n<col");
        if (($af = (($ag = self)['$attr?'] || $mm('attr?')).call($ag, "labelwidth")) !== false && $af !== nil) {
          (($af = out)['$<<'] || $mm('<<')).call($af, " style=\"width:");
          (($ah = out)['$<<'] || $mm('<<')).call($ah, (($ai = self).$attr || $mm('attr')).call($ai, "labelwidth"));
          (($aj = out)['$<<'] || $mm('<<')).call($aj, "%;\"");
        };
        (($ak = out)['$<<'] || $mm('<<')).call($ak, ">\n<col");
        if (($al = (($am = self)['$attr?'] || $mm('attr?')).call($am, "itemwidth")) !== false && $al !== nil) {
          (($al = out)['$<<'] || $mm('<<')).call($al, " style=\"width:");
          (($an = out)['$<<'] || $mm('<<')).call($an, (($ao = self).$attr || $mm('attr')).call($ao, "itemwidth"));
          (($ap = out)['$<<'] || $mm('<<')).call($ap, "%;\"");
        };
        (($aq = out)['$<<'] || $mm('<<')).call($aq, ">\n</colgroup>");
        ($ar = (($as = (($at = self).$content || $mm('content')).call($at)).$each || $mm('each')), $ar._p = (TMP_3 = function(dt, dd) {

          var self = TMP_3._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w;
          if (dt == null) dt = nil;
if (dd == null) dd = nil;

          (($a = out)['$<<'] || $mm('<<')).call($a, "\n<tr>\n<td class=\"hdlist1");
          if (($b = (($c = self)['$attr?'] || $mm('attr?')).call($c, "strong-option")) !== false && $b !== nil) {
            (($b = out)['$<<'] || $mm('<<')).call($b, " strong")
          };
          (($d = out)['$<<'] || $mm('<<')).call($d, "\">\n");
          (($e = out)['$<<'] || $mm('<<')).call($e, (($f = dt).$text || $mm('text')).call($f));
          (($g = out)['$<<'] || $mm('<<')).call($g, "\n<br>\n</td>\n<td class=\"hdlist2\">");
          if (($h = (($i = dd)['$nil?'] || $mm('nil?')).call($i)) === false || $h === nil) {
            (($h = out)['$<<'] || $mm('<<')).call($h, "");
            if (($j = (($k = dd)['$text?'] || $mm('text?')).call($k)) !== false && $j !== nil) {
              (($j = out)['$<<'] || $mm('<<')).call($j, "\n<p style=\"margin-top: 0;\">");
              (($l = out)['$<<'] || $mm('<<')).call($l, (($m = dd).$text || $mm('text')).call($m));
              (($n = out)['$<<'] || $mm('<<')).call($n, "</p>");
            };
            (($o = out)['$<<'] || $mm('<<')).call($o, "");
            if (($p = (($q = dd)['$blocks?'] || $mm('blocks?')).call($q)) !== false && $p !== nil) {
              (($p = out)['$<<'] || $mm('<<')).call($p, "\n");
              (($r = out)['$<<'] || $mm('<<')).call($r, (($s = (($t = dd).$content || $mm('content')).call($t)).$chomp || $mm('chomp')).call($s));
              (($u = out)['$<<'] || $mm('<<')).call($u, "");
            };
            (($v = out)['$<<'] || $mm('<<')).call($v, "");
          };
          return (($w = out)['$<<'] || $mm('<<')).call($w, "\n</td>\n</tr>");
        }, TMP_3._s = self, TMP_3), $ar).call($as);
        (($ar = out)['$<<'] || $mm('<<')).call($ar, "\n</table>\n</div>");
        } else {
        (($au = out)['$<<'] || $mm('<<')).call($au, "\n<div");
        (($av = out)['$<<'] || $mm('<<')).call($av, ($aw = self.id, $aw !== false && $aw !== nil ? " id=\"" + (self.id) + "\"" : $aw));
        (($aw = out)['$<<'] || $mm('<<')).call($aw, " class=\"dlist");
        (($ax = out)['$<<'] || $mm('<<')).call($ax, (function() { if (($ay = (($az = self)['$attr?'] || $mm('attr?')).call($az, "style")) !== false && $ay !== nil) {
          return " " + ((($ay = self).$attr || $mm('attr')).call($ay, "style"))
          } else {
          return nil
        }; return nil; }).call(self));
        (($ba = out)['$<<'] || $mm('<<')).call($ba, "");
        (($bb = out)['$<<'] || $mm('<<')).call($bb, (function() { if (($bc = (($bd = self)['$attr?'] || $mm('attr?')).call($bd, "role")) !== false && $bc !== nil) {
          return " " + ((($bc = self).$attr || $mm('attr')).call($bc, "role"))
          } else {
          return nil
        }; return nil; }).call(self));
        (($be = out)['$<<'] || $mm('<<')).call($be, "\">");
        (($bf = out)['$<<'] || $mm('<<')).call($bf, (function() { if (($bg = (($bh = self)['$title?'] || $mm('title?')).call($bh)) !== false && $bg !== nil) {
          return "\n<div class=\"title\">" + (self.title) + "</div>"
          } else {
          return nil
        }; return nil; }).call(self));
        (($bg = out)['$<<'] || $mm('<<')).call($bg, "\n<dl>");
        ($bi = (($bj = (($bk = self).$content || $mm('content')).call($bk)).$each || $mm('each')), $bi._p = (TMP_4 = function(dt, dd) {

          var self = TMP_4._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w;
          if (dt == null) dt = nil;
if (dd == null) dd = nil;

          (($a = out)['$<<'] || $mm('<<')).call($a, "\n<dt");
          (($b = out)['$<<'] || $mm('<<')).call($b, (function() { if (($c = ($d = (($e = self)['$attr?'] || $mm('attr?')).call($e, "style", nil, false), ($d === nil || $d === false))) !== false && $c !== nil) {
            return " class=\"hdlist\""
            } else {
            return nil
          }; return nil; }).call(self));
          (($c = out)['$<<'] || $mm('<<')).call($c, ">\n");
          (($d = out)['$<<'] || $mm('<<')).call($d, (($f = dt).$text || $mm('text')).call($f));
          (($g = out)['$<<'] || $mm('<<')).call($g, "\n</dt>");
          if (($h = (($i = dd)['$nil?'] || $mm('nil?')).call($i)) === false || $h === nil) {
            (($h = out)['$<<'] || $mm('<<')).call($h, "\n<dd>");
            if (($j = (($k = dd)['$text?'] || $mm('text?')).call($k)) !== false && $j !== nil) {
              (($j = out)['$<<'] || $mm('<<')).call($j, "\n<p>");
              (($l = out)['$<<'] || $mm('<<')).call($l, (($m = dd).$text || $mm('text')).call($m));
              (($n = out)['$<<'] || $mm('<<')).call($n, "</p>");
            };
            (($o = out)['$<<'] || $mm('<<')).call($o, "");
            if (($p = (($q = dd)['$blocks?'] || $mm('blocks?')).call($q)) !== false && $p !== nil) {
              (($p = out)['$<<'] || $mm('<<')).call($p, "\n");
              (($r = out)['$<<'] || $mm('<<')).call($r, (($s = (($t = dd).$content || $mm('content')).call($t)).$chomp || $mm('chomp')).call($s));
              (($u = out)['$<<'] || $mm('<<')).call($u, "");
            };
            (($v = out)['$<<'] || $mm('<<')).call($v, "\n</dd>");
          };
          return (($w = out)['$<<'] || $mm('<<')).call($w, "");
        }, TMP_4._s = self, TMP_4), $bi).call($bj);
        (($bi = out)['$<<'] || $mm('<<')).call($bi, "\n</dl>\n</div>");
      }
    };
    (($bl = out)['$<<'] || $mm('<<')).call($bl, "\n");
    return (($bm = out).$join || $mm('join')).call($bm);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_dlist")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"exampleblock");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "role")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "\">");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$title?'] || $mm('title?')).call($k)) !== false && $j !== nil) {
      return "\n<div class=\"title\">" + ((function() { if (($j = (($l = self)['$attr?'] || $mm('attr?')).call($l, "caption")) !== false && $j !== nil) {
        return (($j = self).$attr || $mm('attr')).call($j, "caption")
        } else {
        return nil
      }; return nil; }).call(self)) + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($m = out)['$<<'] || $mm('<<')).call($m, "\n<div class=\"content\">\n");
    (($n = out)['$<<'] || $mm('<<')).call($n, (($o = (($p = self).$content || $mm('content')).call($p)).$chomp || $mm('chomp')).call($o));
    (($q = out)['$<<'] || $mm('<<')).call($q, "\n</div>\n</div>\n");
    return (($r = out).$join || $mm('join')).call($r);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_example")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i;
    if (self.level == null) self.level = nil;
    if (self.id == null) self.id = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    (($c = out)['$<<'] || $mm('<<')).call($c, "<h" + (($d = self.level, $e = 1, typeof($d) === 'number' ? $d + $e : $d['$+']($e))) + (($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d)) + " class=\"" + (($d = (($f = [(($g = self).$attr || $mm('attr')).call($g, "style"), (($h = self).$attr || $mm('attr')).call($h, "role")]).$compact || $mm('compact')).call($f), $e = " ", typeof($d) === 'number' ? $d * $e : $d['$*']($e))) + "\">" + ((($d = self).$title || $mm('title')).call($d)) + "</h" + (($e = self.level, $i = 1, typeof($e) === 'number' ? $e + $i : $e['$+']($i))) + ">");
    (($e = out)['$<<'] || $mm('<<')).call($e, "\n");
    return (($i = out).$join || $mm('join')).call($i);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_floating_title")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, $bd, $be, $bf, $bg, $bh, $bi, $bj, $bk, $bl, $bm, $bn, $bo, $bp, $bq, $br, $bs, $bt, $bu, $bv;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"imageblock");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "style")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "style"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$attr?'] || $mm('attr?')).call($k, "role")) !== false && $j !== nil) {
      return " " + ((($j = self).$attr || $mm('attr')).call($j, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($l = out)['$<<'] || $mm('<<')).call($l, "\"");
    if (($m = (($n = (($o = self)['$attr?'] || $mm('attr?')).call($o, "align")), $n !== false && $n !== nil ? $n : (($p = self)['$attr?'] || $mm('attr?')).call($p, "float"))) !== false && $m !== nil) {
      (($m = out)['$<<'] || $mm('<<')).call($m, " style=\"");
      if (($n = (($q = self)['$attr?'] || $mm('attr?')).call($q, "align")) !== false && $n !== nil) {
        (($n = out)['$<<'] || $mm('<<')).call($n, "text-align: ");
        (($r = out)['$<<'] || $mm('<<')).call($r, (($s = self).$attr || $mm('attr')).call($s, "align"));
        (($t = out)['$<<'] || $mm('<<')).call($t, "");
        (($u = out)['$<<'] || $mm('<<')).call($u, (function() { if (($v = (($w = self)['$attr?'] || $mm('attr?')).call($w, "float")) !== false && $v !== nil) {
          return "; "
          } else {
          return nil
        }; return nil; }).call(self));
        (($v = out)['$<<'] || $mm('<<')).call($v, "");
      };
      (($x = out)['$<<'] || $mm('<<')).call($x, "");
      if (($y = (($z = self)['$attr?'] || $mm('attr?')).call($z, "float")) !== false && $y !== nil) {
        (($y = out)['$<<'] || $mm('<<')).call($y, "float: ");
        (($aa = out)['$<<'] || $mm('<<')).call($aa, (($ab = self).$attr || $mm('attr')).call($ab, "float"));
        (($ac = out)['$<<'] || $mm('<<')).call($ac, "");
      };
      (($ad = out)['$<<'] || $mm('<<')).call($ad, "\"");
    };
    (($ae = out)['$<<'] || $mm('<<')).call($ae, ">\n<div class=\"content\">");
    if (($af = (($ag = self)['$attr?'] || $mm('attr?')).call($ag, "link")) !== false && $af !== nil) {
      (($af = out)['$<<'] || $mm('<<')).call($af, "\n<a class=\"image\" href=\"");
      (($ah = out)['$<<'] || $mm('<<')).call($ah, (($ai = self).$attr || $mm('attr')).call($ai, "link"));
      (($aj = out)['$<<'] || $mm('<<')).call($aj, "\"><img src=\"");
      (($ak = out)['$<<'] || $mm('<<')).call($ak, (($al = self).$image_uri || $mm('image_uri')).call($al, (($am = self).$attr || $mm('attr')).call($am, "target")));
      (($an = out)['$<<'] || $mm('<<')).call($an, "\" alt=\"");
      (($ao = out)['$<<'] || $mm('<<')).call($ao, (($ap = self).$attr || $mm('attr')).call($ap, "alt"));
      (($aq = out)['$<<'] || $mm('<<')).call($aq, "\"");
      (($ar = out)['$<<'] || $mm('<<')).call($ar, (function() { if (($as = (($at = self)['$attr?'] || $mm('attr?')).call($at, "width")) !== false && $as !== nil) {
        return " width=\"" + ((($as = self).$attr || $mm('attr')).call($as, "width")) + "\""
        } else {
        return nil
      }; return nil; }).call(self));
      (($au = out)['$<<'] || $mm('<<')).call($au, "");
      (($av = out)['$<<'] || $mm('<<')).call($av, (function() { if (($aw = (($ax = self)['$attr?'] || $mm('attr?')).call($ax, "height")) !== false && $aw !== nil) {
        return " width=\"" + ((($aw = self).$attr || $mm('attr')).call($aw, "height")) + "\""
        } else {
        return nil
      }; return nil; }).call(self));
      (($ay = out)['$<<'] || $mm('<<')).call($ay, "></a>");
      } else {
      (($az = out)['$<<'] || $mm('<<')).call($az, "\n<img src=\"");
      (($ba = out)['$<<'] || $mm('<<')).call($ba, (($bb = self).$image_uri || $mm('image_uri')).call($bb, (($bc = self).$attr || $mm('attr')).call($bc, "target")));
      (($bd = out)['$<<'] || $mm('<<')).call($bd, "\" alt=\"");
      (($be = out)['$<<'] || $mm('<<')).call($be, (($bf = self).$attr || $mm('attr')).call($bf, "alt"));
      (($bg = out)['$<<'] || $mm('<<')).call($bg, "\"");
      (($bh = out)['$<<'] || $mm('<<')).call($bh, (function() { if (($bi = (($bj = self)['$attr?'] || $mm('attr?')).call($bj, "width")) !== false && $bi !== nil) {
        return " width=\"" + ((($bi = self).$attr || $mm('attr')).call($bi, "width")) + "\""
        } else {
        return nil
      }; return nil; }).call(self));
      (($bk = out)['$<<'] || $mm('<<')).call($bk, "");
      (($bl = out)['$<<'] || $mm('<<')).call($bl, (function() { if (($bm = (($bn = self)['$attr?'] || $mm('attr?')).call($bn, "height")) !== false && $bm !== nil) {
        return " height=\"" + ((($bm = self).$attr || $mm('attr')).call($bm, "height")) + "\""
        } else {
        return nil
      }; return nil; }).call(self));
      (($bo = out)['$<<'] || $mm('<<')).call($bo, ">");
    };
    (($bp = out)['$<<'] || $mm('<<')).call($bp, "\n</div>");
    (($bq = out)['$<<'] || $mm('<<')).call($bq, (function() { if (($br = (($bs = self)['$title?'] || $mm('title?')).call($bs)) !== false && $br !== nil) {
      return "\n<div class=\"title\">" + ((function() { if (($br = (($bt = self)['$attr?'] || $mm('attr?')).call($bt, "caption")) !== false && $br !== nil) {
        return (($br = self).$attr || $mm('attr')).call($br, "caption")
        } else {
        return nil
      }; return nil; }).call(self)) + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($bu = out)['$<<'] || $mm('<<')).call($bu, "\n</div>\n");
    return (($bv = out).$join || $mm('join')).call($bv);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_image")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"listingblock");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "role")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "\">");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$title?'] || $mm('title?')).call($k)) !== false && $j !== nil) {
      return "\n<div class=\"title\">" + ((function() { if (($j = (($l = self)['$attr?'] || $mm('attr?')).call($l, "caption")) !== false && $j !== nil) {
        return (($j = self).$attr || $mm('attr')).call($j, "caption")
        } else {
        return nil
      }; return nil; }).call(self)) + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($m = out)['$<<'] || $mm('<<')).call($m, "\n<div class=\"content monospaced\">");
    if (($n = (($o = self)['$attr?'] || $mm('attr?')).call($o, "style", "source", false)) !== false && $n !== nil) {
      (($n = out)['$<<'] || $mm('<<')).call($n, "\n<pre class=\"highlight\"><code class=\"");
      (($p = out)['$<<'] || $mm('<<')).call($p, (($q = self).$attr || $mm('attr')).call($q, "language"));
      (($r = out)['$<<'] || $mm('<<')).call($r, "\">");
      (($s = out)['$<<'] || $mm('<<')).call($s, (($t = self).$content || $mm('content')).call($t));
      (($u = out)['$<<'] || $mm('<<')).call($u, "</code></pre>");
      } else {
      (($v = out)['$<<'] || $mm('<<')).call($v, "\n<pre>");
      (($w = out)['$<<'] || $mm('<<')).call($w, (($x = self).$content || $mm('content')).call($x));
      (($y = out)['$<<'] || $mm('<<')).call($y, "</pre>");
    };
    (($z = out)['$<<'] || $mm('<<')).call($z, "\n</div>\n</div>\n");
    return (($aa = out).$join || $mm('join')).call($aa);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_listing")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"literalblock");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "role")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "\">");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$title?'] || $mm('title?')).call($k)) !== false && $j !== nil) {
      return "\n<div class=\"title\">" + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($j = out)['$<<'] || $mm('<<')).call($j, "\n<div class=\"content monospaced\">\n<pre>");
    (($l = out)['$<<'] || $mm('<<')).call($l, (($m = self).$content || $mm('content')).call($m));
    (($n = out)['$<<'] || $mm('<<')).call($n, "</pre>\n</div>\n</div>\n");
    return (($o = out).$join || $mm('join')).call($o);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_literal")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, TMP_2, $w, $x, $y, $z;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"olist");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "style")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "style"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$attr?'] || $mm('attr?')).call($k, "role")) !== false && $j !== nil) {
      return " " + ((($j = self).$attr || $mm('attr')).call($j, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($l = out)['$<<'] || $mm('<<')).call($l, "\">");
    (($m = out)['$<<'] || $mm('<<')).call($m, (function() { if (($n = (($o = self)['$title?'] || $mm('title?')).call($o)) !== false && $n !== nil) {
      return "\n<div class=\"title\">" + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($n = out)['$<<'] || $mm('<<')).call($n, "\n<ol class=\"");
    (($p = out)['$<<'] || $mm('<<')).call($p, (($q = self).$attr || $mm('attr')).call($q, "style", nil, false));
    (($r = out)['$<<'] || $mm('<<')).call($r, "\"");
    (($s = out)['$<<'] || $mm('<<')).call($s, (function() { if (($t = (($u = self)['$attr?'] || $mm('attr?')).call($u, "start")) !== false && $t !== nil) {
      return " start=\"" + ((($t = self).$attr || $mm('attr')).call($t, "start")) + "\""
      } else {
      return nil
    }; return nil; }).call(self));
    (($v = out)['$<<'] || $mm('<<')).call($v, ">");
    ($w = (($x = (($y = self).$content || $mm('content')).call($y)).$each || $mm('each')), $w._p = (TMP_2 = function(item) {

      var self = TMP_2._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
      if (item == null) item = nil;

      (($a = out)['$<<'] || $mm('<<')).call($a, "\n<li>\n<p>");
      (($b = out)['$<<'] || $mm('<<')).call($b, (($c = item).$text || $mm('text')).call($c));
      (($d = out)['$<<'] || $mm('<<')).call($d, "</p>");
      if (($e = (($f = item)['$blocks?'] || $mm('blocks?')).call($f)) !== false && $e !== nil) {
        (($e = out)['$<<'] || $mm('<<')).call($e, "\n");
        (($g = out)['$<<'] || $mm('<<')).call($g, (($h = item).$content || $mm('content')).call($h));
        (($i = out)['$<<'] || $mm('<<')).call($i, "");
      };
      return (($j = out)['$<<'] || $mm('<<')).call($j, "\n</li>");
    }, TMP_2._s = self, TMP_2), $w).call($x);
    (($w = out)['$<<'] || $mm('<<')).call($w, "\n</ol>\n</div>\n");
    return (($z = out).$join || $mm('join')).call($z);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_olist")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar;
    if (self.parent == null) self.parent = nil;
    if (self.document == null) self.document = nil;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;
    if (self.level == null) self.level = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    if (($c = (($d = self)['$attr?'] || $mm('attr?')).call($d, "style", "abstract")) !== false && $c !== nil) {
      if (($c = (($e = (($f = self.parent)['$=='] || $mm('==')).call($f, self.document)) ? (($g = self.document)['$attr?'] || $mm('attr?')).call($g, "doctype", "book") : $e)) !== false && $c !== nil) {
        (($c = self).$puts || $mm('puts')).call($c, "asciidoctor: WARNING: abstract block cannot be used in a document without a title when doctype is book. Excluding block content.")
        } else {
        (($e = out)['$<<'] || $mm('<<')).call($e, "\n<div");
        (($h = out)['$<<'] || $mm('<<')).call($h, ($i = self.id, $i !== false && $i !== nil ? " id=\"" + (self.id) + "\"" : $i));
        (($i = out)['$<<'] || $mm('<<')).call($i, " class=\"quoteblock abstract");
        (($j = out)['$<<'] || $mm('<<')).call($j, (function() { if (($k = (($l = self)['$attr?'] || $mm('attr?')).call($l, "role")) !== false && $k !== nil) {
          return " " + ((($k = self).$attr || $mm('attr')).call($k, "role"))
          } else {
          return nil
        }; return nil; }).call(self));
        (($m = out)['$<<'] || $mm('<<')).call($m, "\">");
        (($n = out)['$<<'] || $mm('<<')).call($n, (function() { if (($o = (($p = self)['$title?'] || $mm('title?')).call($p)) !== false && $o !== nil) {
          return "\n<div class=\"title\">" + (self.title) + "</div>"
          } else {
          return nil
        }; return nil; }).call(self));
        (($o = out)['$<<'] || $mm('<<')).call($o, "\n<blockquote>\n");
        (($q = out)['$<<'] || $mm('<<')).call($q, (($r = (($s = self).$content || $mm('content')).call($s)).$chomp || $mm('chomp')).call($r));
        (($t = out)['$<<'] || $mm('<<')).call($t, "\n</blockquote>\n</div>");
      }
      } else {
      if (($u = ($v = (($v = self)['$attr?'] || $mm('attr?')).call($v, "style", "partintro"), $v !== false && $v !== nil ? (($w = (($x = ($y = (($z = self.document)['$attr?'] || $mm('attr?')).call($z, "doctype", "book"), ($y === nil || $y === false))), $x !== false && $x !== nil ? $x : ($y = (($aa = (($ab = self.parent).$context || $mm('context')).call($ab))['$=='] || $mm('==')).call($aa, "section"), ($y === nil || $y === false)))), $w !== false && $w !== nil ? $w : ($x = (($y = self.level)['$=='] || $mm('==')).call($y, 0), ($x === nil || $x === false))) : $v)) !== false && $u !== nil) {
        (($u = self).$puts || $mm('puts')).call($u, "asciidoctor: ERROR: partintro block can only be used when doctype is book and it's a child of a book part. Excluding block content.")
        } else {
        (($w = out)['$<<'] || $mm('<<')).call($w, "\n<div");
        (($x = out)['$<<'] || $mm('<<')).call($x, ($ac = self.id, $ac !== false && $ac !== nil ? " id=\"" + (self.id) + "\"" : $ac));
        (($ac = out)['$<<'] || $mm('<<')).call($ac, " class=\"");
        (($ad = out)['$<<'] || $mm('<<')).call($ad, ($ae = (($ag = ["openblock", (function() { if (($ah = (($ai = self)['$attr?'] || $mm('attr?')).call($ai, "style", "open")) !== false && $ah !== nil) {
          return nil
          } else {
          return (($ah = self).$attr || $mm('attr')).call($ah, "style")
        }; return nil; }).call(self), (($aj = self).$attr || $mm('attr')).call($aj, "role")]).$compact || $mm('compact')).call($ag), $af = " ", typeof($ae) === 'number' ? $ae * $af : $ae['$*']($af)));
        (($ae = out)['$<<'] || $mm('<<')).call($ae, "\">");
        (($af = out)['$<<'] || $mm('<<')).call($af, (function() { if (($ak = (($al = self)['$title?'] || $mm('title?')).call($al)) !== false && $ak !== nil) {
          return "\n<div class=\"title\">" + (self.title) + "</div>"
          } else {
          return nil
        }; return nil; }).call(self));
        (($ak = out)['$<<'] || $mm('<<')).call($ak, "\n<div class=\"content\">\n");
        (($am = out)['$<<'] || $mm('<<')).call($am, (($an = (($ao = self).$content || $mm('content')).call($ao)).$chomp || $mm('chomp')).call($an));
        (($ap = out)['$<<'] || $mm('<<')).call($ap, "\n</div>\n</div>");
      }
    };
    (($aq = out)['$<<'] || $mm('<<')).call($aq, "\n");
    return (($ar = out).$join || $mm('join')).call($ar);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_open")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b;
    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "<div style=\"page-break-after: always\"></div>\n");
    return (($b = out).$join || $mm('join')).call($b);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_page_break")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"paragraph");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "role")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "\">");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$title?'] || $mm('title?')).call($k)) !== false && $j !== nil) {
      return "\n<div class=\"title\">" + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($j = out)['$<<'] || $mm('<<')).call($j, "\n<p>");
    (($l = out)['$<<'] || $mm('<<')).call($l, (($m = self).$content || $mm('content')).call($m));
    (($n = out)['$<<'] || $mm('<<')).call($n, "</p>\n</div>\n");
    return (($o = out).$join || $mm('join')).call($o);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_paragraph")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f;
    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    (($c = out)['$<<'] || $mm('<<')).call($c, (($d = self).$content || $mm('content')).call($d));
    (($e = out)['$<<'] || $mm('<<')).call($e, "\n");
    return (($f = out).$join || $mm('join')).call($f);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_pass")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g;
    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div id=\"preamble\">\n<div class=\"sectionbody\">\n");
    (($c = out)['$<<'] || $mm('<<')).call($c, (($d = (($e = self).$content || $mm('content')).call($e)).$chomp || $mm('chomp')).call($d));
    (($f = out)['$<<'] || $mm('<<')).call($f, "\n</div>\n</div>\n");
    return (($g = out).$join || $mm('join')).call($g);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_preamble")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"quoteblock");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "role")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "\">");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$title?'] || $mm('title?')).call($k)) !== false && $j !== nil) {
      return "\n<div class=\"title\">" + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($j = out)['$<<'] || $mm('<<')).call($j, "\n<blockquote>\n");
    (($l = out)['$<<'] || $mm('<<')).call($l, (($m = (($n = self).$content || $mm('content')).call($n)).$chomp || $mm('chomp')).call($m));
    (($o = out)['$<<'] || $mm('<<')).call($o, "\n</blockquote>");
    if (($p = (($q = (($r = self)['$attr?'] || $mm('attr?')).call($r, "attribution")), $q !== false && $q !== nil ? $q : (($s = self)['$attr?'] || $mm('attr?')).call($s, "citetitle"))) !== false && $p !== nil) {
      (($p = out)['$<<'] || $mm('<<')).call($p, "\n<div class=\"attribution\">");
      if (($q = (($t = self)['$attr?'] || $mm('attr?')).call($t, "citetitle")) !== false && $q !== nil) {
        (($q = out)['$<<'] || $mm('<<')).call($q, "\n<cite>");
        (($u = out)['$<<'] || $mm('<<')).call($u, (($v = self).$attr || $mm('attr')).call($v, "citetitle"));
        (($w = out)['$<<'] || $mm('<<')).call($w, "</cite>");
      };
      (($x = out)['$<<'] || $mm('<<')).call($x, "");
      if (($y = (($z = self)['$attr?'] || $mm('attr?')).call($z, "attribution")) !== false && $y !== nil) {
        (($y = out)['$<<'] || $mm('<<')).call($y, "");
        if (($aa = (($ab = self)['$attr?'] || $mm('attr?')).call($ab, "citetitle")) !== false && $aa !== nil) {
          (($aa = out)['$<<'] || $mm('<<')).call($aa, "\n<br>")
        };
        (($ac = out)['$<<'] || $mm('<<')).call($ac, "\n");
        (($ad = out)['$<<'] || $mm('<<')).call($ad, "&#8212; " + ((($ae = self).$attr || $mm('attr')).call($ae, "attribution")));
        (($af = out)['$<<'] || $mm('<<')).call($af, "");
      };
      (($ag = out)['$<<'] || $mm('<<')).call($ag, "\n</div>");
    };
    (($ah = out)['$<<'] || $mm('<<')).call($ah, "\n</div>\n");
    return (($ai = out).$join || $mm('join')).call($ai);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_quote")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b;
    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "<hr>\n");
    return (($b = out).$join || $mm('join')).call($b);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_ruler")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"sidebarblock");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "role")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "\">\n<div class=\"content\">");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$title?'] || $mm('title?')).call($k)) !== false && $j !== nil) {
      return "\n<div class=\"title\">" + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($j = out)['$<<'] || $mm('<<')).call($j, "\n");
    (($l = out)['$<<'] || $mm('<<')).call($l, (($m = (($n = self).$content || $mm('content')).call($n)).$chomp || $mm('chomp')).call($m));
    (($o = out)['$<<'] || $mm('<<')).call($o, "\n</div>\n</div>\n");
    return (($p = out).$join || $mm('join')).call($p);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_sidebar")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, TMP_2, $al, $am, $an, TMP_3, $ao, $ap, $aq, TMP_4, $ar, $as, TMP_9, $at, $au, $av;
    if (self.id == null) self.id = nil;
    if (self.caption == null) self.caption = nil;
    if (self.columns == null) self.columns = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<table");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"tableblock frame-");
    (($e = out)['$<<'] || $mm('<<')).call($e, (($f = self).$attr || $mm('attr')).call($f, "frame", "all"));
    (($g = out)['$<<'] || $mm('<<')).call($g, " grid-");
    (($h = out)['$<<'] || $mm('<<')).call($h, (($i = self).$attr || $mm('attr')).call($i, "grid", "all"));
    (($j = out)['$<<'] || $mm('<<')).call($j, "");
    (($k = out)['$<<'] || $mm('<<')).call($k, (function() { if (($l = (($m = self)['$attr?'] || $mm('attr?')).call($m, "role")) !== false && $l !== nil) {
      return " " + ((($l = self).$attr || $mm('attr')).call($l, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($n = out)['$<<'] || $mm('<<')).call($n, "\" style=\"");
    if (($o = ($p = (($q = self)['$attr?'] || $mm('attr?')).call($q, "autowidth-option"), ($p === nil || $p === false))) !== false && $o !== nil) {
      (($o = out)['$<<'] || $mm('<<')).call($o, "width:");
      (($p = out)['$<<'] || $mm('<<')).call($p, (($r = self).$attr || $mm('attr')).call($r, "tablepcwidth"));
      (($s = out)['$<<'] || $mm('<<')).call($s, "%; ");
    };
    (($t = out)['$<<'] || $mm('<<')).call($t, "");
    if (($u = (($v = self)['$attr?'] || $mm('attr?')).call($v, "float")) !== false && $u !== nil) {
      (($u = out)['$<<'] || $mm('<<')).call($u, "float: ");
      (($w = out)['$<<'] || $mm('<<')).call($w, (($x = self).$attr || $mm('attr')).call($x, "float"));
      (($y = out)['$<<'] || $mm('<<')).call($y, "; ");
    };
    (($z = out)['$<<'] || $mm('<<')).call($z, "\">");
    if (($aa = (($ab = self)['$title?'] || $mm('title?')).call($ab)) !== false && $aa !== nil) {
      (($aa = out)['$<<'] || $mm('<<')).call($aa, "\n<caption class=\"title\">");
      (($ac = out)['$<<'] || $mm('<<')).call($ac, "" + (self.caption) + ((($ad = self).$title || $mm('title')).call($ad)));
      (($ae = out)['$<<'] || $mm('<<')).call($ae, "</caption>");
    };
    (($af = out)['$<<'] || $mm('<<')).call($af, "");
    if ((($ag = (($ah = self).$attr || $mm('attr')).call($ah, "rowcount"))['$>='] || $mm('>=')).call($ag, 0)) {
      (($ai = out)['$<<'] || $mm('<<')).call($ai, "\n<colgroup>");
      if (($aj = (($ak = self)['$attr?'] || $mm('attr?')).call($ak, "autowidth-option")) !== false && $aj !== nil) {
        (($aj = out)['$<<'] || $mm('<<')).call($aj, "");
        ($al = (($am = self.columns).$each || $mm('each')), $al._p = (TMP_2 = function() {

          var self = TMP_2._s || this, $a;
          
          return (($a = out)['$<<'] || $mm('<<')).call($a, "\n<col>")
        }, TMP_2._s = self, TMP_2), $al).call($am);
        (($al = out)['$<<'] || $mm('<<')).call($al, "");
        } else {
        (($an = out)['$<<'] || $mm('<<')).call($an, "");
        ($ao = (($ap = self.columns).$each || $mm('each')), $ao._p = (TMP_3 = function(col) {

          var self = TMP_3._s || this, $a, $b, $c, $d;
          if (col == null) col = nil;

          (($a = out)['$<<'] || $mm('<<')).call($a, "\n<col style=\"width:");
          (($b = out)['$<<'] || $mm('<<')).call($b, (($c = col).$attr || $mm('attr')).call($c, "colpcwidth"));
          return (($d = out)['$<<'] || $mm('<<')).call($d, "%;\">");
        }, TMP_3._s = self, TMP_3), $ao).call($ap);
        (($ao = out)['$<<'] || $mm('<<')).call($ao, "");
      };
      (($aq = out)['$<<'] || $mm('<<')).call($aq, "\n</colgroup>");
      ($ar = (($as = ($at = (($au = ["head", "foot", "body"]).$select || $mm('select')), $at._p = (TMP_9 = function(tsec) {

        var self = TMP_9._s || this, $a, $b, $c;
        if (self.rows == null) self.rows = nil;

        if (tsec == null) tsec = nil;

        return ($a = (($b = (($c = self.rows)['$[]'] || $mm('[]')).call($c, tsec))['$empty?'] || $mm('empty?')).call($b), ($a === nil || $a === false))
      }, TMP_9._s = self, TMP_9), $at).call($au)).$each || $mm('each')), $ar._p = (TMP_4 = function(tsec) {

        var self = TMP_4._s || this, $a, $b, $c, TMP_5, $d, $e, $f, $g, $h;
        if (self.rows == null) self.rows = nil;

        if (tsec == null) tsec = nil;

        (($a = out)['$<<'] || $mm('<<')).call($a, "\n<t");
        (($b = out)['$<<'] || $mm('<<')).call($b, tsec);
        (($c = out)['$<<'] || $mm('<<')).call($c, ">");
        ($d = (($e = (($f = self.rows)['$[]'] || $mm('[]')).call($f, tsec)).$each || $mm('each')), $d._p = (TMP_5 = function(row) {

          var self = TMP_5._s || this, $a, TMP_6, $b, $c;
          if (row == null) row = nil;

          (($a = out)['$<<'] || $mm('<<')).call($a, "\n<tr>");
          ($b = (($c = row).$each || $mm('each')), $b._p = (TMP_6 = function(cell) {

            var $case = nil, self = TMP_6._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, TMP_7, $ap, $aq, $ar, $as, $at, TMP_8, $au, $av, $aw, $ax, $ay, $az, $ba, $bb;
            if (cell == null) cell = nil;

            (($a = out)['$<<'] || $mm('<<')).call($a, "\n<");
            (($b = out)['$<<'] || $mm('<<')).call($b, (function() { if ((($c = tsec)['$=='] || $mm('==')).call($c, "head")) {
              return "th"
              } else {
              return "td"
            }; return nil; }).call(self));
            (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"tableblock halign-");
            (($e = out)['$<<'] || $mm('<<')).call($e, (($f = cell).$attr || $mm('attr')).call($f, "halign"));
            (($g = out)['$<<'] || $mm('<<')).call($g, " valign-");
            (($h = out)['$<<'] || $mm('<<')).call($h, (($i = cell).$attr || $mm('attr')).call($i, "valign"));
            (($j = out)['$<<'] || $mm('<<')).call($j, "\"");
            (($k = out)['$<<'] || $mm('<<')).call($k, (function() { if (($l = (($m = cell).$colspan || $mm('colspan')).call($m)) !== false && $l !== nil) {
              return " colspan=\"" + ((($l = cell).$colspan || $mm('colspan')).call($l)) + "\""
              } else {
              return nil
            }; return nil; }).call(self));
            (($n = out)['$<<'] || $mm('<<')).call($n, "");
            (($o = out)['$<<'] || $mm('<<')).call($o, (function() { if (($p = (($q = cell).$rowspan || $mm('rowspan')).call($q)) !== false && $p !== nil) {
              return " rowspan=\"" + ((($p = cell).$rowspan || $mm('rowspan')).call($p)) + "\""
              } else {
              return nil
            }; return nil; }).call(self));
            (($r = out)['$<<'] || $mm('<<')).call($r, ">");
            if ((($s = tsec)['$=='] || $mm('==')).call($s, "head")) {
              (($t = out)['$<<'] || $mm('<<')).call($t, "");
              (($u = out)['$<<'] || $mm('<<')).call($u, (($v = cell).$text || $mm('text')).call($v));
              (($w = out)['$<<'] || $mm('<<')).call($w, "");
              } else {
              (($x = out)['$<<'] || $mm('<<')).call($x, "");
              $case = (($y = cell).$attr || $mm('attr')).call($y, "style", nil, false);if ((($ad = "asciidoc")['$==='] || $mm('===')).call($ad, $case)) {
              (($z = out)['$<<'] || $mm('<<')).call($z, "<div>");
              (($aa = out)['$<<'] || $mm('<<')).call($aa, (($ab = cell).$content || $mm('content')).call($ab));
              (($ac = out)['$<<'] || $mm('<<')).call($ac, "</div>");
              }
              else if ((($ai = "verse")['$==='] || $mm('===')).call($ai, $case)) {
              (($ae = out)['$<<'] || $mm('<<')).call($ae, "<div class=\"verse\">");
              (($af = out)['$<<'] || $mm('<<')).call($af, (($ag = cell).$text || $mm('text')).call($ag));
              (($ah = out)['$<<'] || $mm('<<')).call($ah, "</div>");
              }
              else if ((($an = "literal")['$==='] || $mm('===')).call($an, $case)) {
              (($aj = out)['$<<'] || $mm('<<')).call($aj, "<div class=\"literal monospaced\"><pre>");
              (($ak = out)['$<<'] || $mm('<<')).call($ak, (($al = cell).$text || $mm('text')).call($al));
              (($am = out)['$<<'] || $mm('<<')).call($am, "</pre></div>");
              }
              else if ((($as = "header")['$==='] || $mm('===')).call($as, $case)) {
              (($ao = out)['$<<'] || $mm('<<')).call($ao, "");
              ($ap = (($aq = (($ar = cell).$content || $mm('content')).call($ar)).$each || $mm('each')), $ap._p = (TMP_7 = function(text) {

                var self = TMP_7._s || this, $a, $b, $c;
                if (text == null) text = nil;

                (($a = out)['$<<'] || $mm('<<')).call($a, "<p class=\"tableblock header\">");
                (($b = out)['$<<'] || $mm('<<')).call($b, text);
                return (($c = out)['$<<'] || $mm('<<')).call($c, "</p>");
              }, TMP_7._s = self, TMP_7), $ap).call($aq);
              (($ap = out)['$<<'] || $mm('<<')).call($ap, "");
              }
              else {(($at = out)['$<<'] || $mm('<<')).call($at, "");
              ($au = (($av = (($aw = cell).$content || $mm('content')).call($aw)).$each || $mm('each')), $au._p = (TMP_8 = function(text) {

                var self = TMP_8._s || this, $a, $b, $c;
                if (text == null) text = nil;

                (($a = out)['$<<'] || $mm('<<')).call($a, "<p class=\"tableblock\">");
                (($b = out)['$<<'] || $mm('<<')).call($b, text);
                return (($c = out)['$<<'] || $mm('<<')).call($c, "</p>");
              }, TMP_8._s = self, TMP_8), $au).call($av);
              (($au = out)['$<<'] || $mm('<<')).call($au, "");};
              (($ax = out)['$<<'] || $mm('<<')).call($ax, "");
            };
            (($ay = out)['$<<'] || $mm('<<')).call($ay, "</");
            (($az = out)['$<<'] || $mm('<<')).call($az, (function() { if ((($ba = tsec)['$=='] || $mm('==')).call($ba, "head")) {
              return "th"
              } else {
              return "td"
            }; return nil; }).call(self));
            return (($bb = out)['$<<'] || $mm('<<')).call($bb, ">");
          }, TMP_6._s = self, TMP_6), $b).call($c);
          return (($b = out)['$<<'] || $mm('<<')).call($b, "\n</tr>");
        }, TMP_5._s = self, TMP_5), $d).call($e);
        (($d = out)['$<<'] || $mm('<<')).call($d, "\n</t");
        (($g = out)['$<<'] || $mm('<<')).call($g, tsec);
        return (($h = out)['$<<'] || $mm('<<')).call($h, ">");
      }, TMP_4._s = self, TMP_4), $ar).call($as);
      (($ar = out)['$<<'] || $mm('<<')).call($ar, "");
    };
    (($at = out)['$<<'] || $mm('<<')).call($at, "\n</table>\n");
    return (($av = out).$join || $mm('join')).call($av);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_table")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, TMP_2, $p, $q, $r, $s;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"ulist");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "style")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "style"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$attr?'] || $mm('attr?')).call($k, "role")) !== false && $j !== nil) {
      return " " + ((($j = self).$attr || $mm('attr')).call($j, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($l = out)['$<<'] || $mm('<<')).call($l, "\">");
    (($m = out)['$<<'] || $mm('<<')).call($m, (function() { if (($n = (($o = self)['$title?'] || $mm('title?')).call($o)) !== false && $n !== nil) {
      return "\n<div class=\"title\">" + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($n = out)['$<<'] || $mm('<<')).call($n, "\n<ul>");
    ($p = (($q = (($r = self).$content || $mm('content')).call($r)).$each || $mm('each')), $p._p = (TMP_2 = function(item) {

      var self = TMP_2._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j;
      if (item == null) item = nil;

      (($a = out)['$<<'] || $mm('<<')).call($a, "\n<li>\n<p>");
      (($b = out)['$<<'] || $mm('<<')).call($b, (($c = item).$text || $mm('text')).call($c));
      (($d = out)['$<<'] || $mm('<<')).call($d, "</p>");
      if (($e = (($f = item)['$blocks?'] || $mm('blocks?')).call($f)) !== false && $e !== nil) {
        (($e = out)['$<<'] || $mm('<<')).call($e, "\n");
        (($g = out)['$<<'] || $mm('<<')).call($g, (($h = item).$content || $mm('content')).call($h));
        (($i = out)['$<<'] || $mm('<<')).call($i, "");
      };
      return (($j = out)['$<<'] || $mm('<<')).call($j, "\n</li>");
    }, TMP_2._s = self, TMP_2), $p).call($q);
    (($p = out)['$<<'] || $mm('<<')).call($p, "\n</ul>\n</div>\n");
    return (($s = out).$join || $mm('join')).call($s);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_ulist")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"verseblock");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "role")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "\">");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$title?'] || $mm('title?')).call($k)) !== false && $j !== nil) {
      return "\n<div class=\"title\">" + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($j = out)['$<<'] || $mm('<<')).call($j, "\n<pre class=\"content\">");
    (($l = out)['$<<'] || $mm('<<')).call($l, (($m = self).$content || $mm('content')).call($m));
    (($n = out)['$<<'] || $mm('<<')).call($n, "</pre>");
    if (($o = (($p = (($q = self)['$attr?'] || $mm('attr?')).call($q, "attribution")), $p !== false && $p !== nil ? $p : (($r = self)['$attr?'] || $mm('attr?')).call($r, "citetitle"))) !== false && $o !== nil) {
      (($o = out)['$<<'] || $mm('<<')).call($o, "\n<div class=\"attribution\">");
      if (($p = (($s = self)['$attr?'] || $mm('attr?')).call($s, "citetitle")) !== false && $p !== nil) {
        (($p = out)['$<<'] || $mm('<<')).call($p, "\n<cite>");
        (($t = out)['$<<'] || $mm('<<')).call($t, (($u = self).$attr || $mm('attr')).call($u, "citetitle"));
        (($v = out)['$<<'] || $mm('<<')).call($v, "</cite>");
      };
      (($w = out)['$<<'] || $mm('<<')).call($w, "");
      if (($x = (($y = self)['$attr?'] || $mm('attr?')).call($y, "attribution")) !== false && $x !== nil) {
        (($x = out)['$<<'] || $mm('<<')).call($x, "");
        if (($z = (($aa = self)['$attr?'] || $mm('attr?')).call($aa, "citetitle")) !== false && $z !== nil) {
          (($z = out)['$<<'] || $mm('<<')).call($z, "\n<br>")
        };
        (($ab = out)['$<<'] || $mm('<<')).call($ab, "\n");
        (($ac = out)['$<<'] || $mm('<<')).call($ac, "&#8212; " + ((($ad = self).$attr || $mm('attr')).call($ad, "attribution")));
        (($ae = out)['$<<'] || $mm('<<')).call($ae, "");
      };
      (($af = out)['$<<'] || $mm('<<')).call($af, "\n</div>");
    };
    (($ag = out)['$<<'] || $mm('<<')).call($ag, "\n</div>\n");
    return (($ah = out).$join || $mm('join')).call($ah);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_verse")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at;
    if (self.id == null) self.id = nil;
    if (self.title == null) self.title = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<div");
    (($c = out)['$<<'] || $mm('<<')).call($c, ($d = self.id, $d !== false && $d !== nil ? " id=\"" + (self.id) + "\"" : $d));
    (($d = out)['$<<'] || $mm('<<')).call($d, " class=\"videoblock");
    (($e = out)['$<<'] || $mm('<<')).call($e, (function() { if (($f = (($g = self)['$attr?'] || $mm('attr?')).call($g, "style")) !== false && $f !== nil) {
      return " " + ((($f = self).$attr || $mm('attr')).call($f, "style"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($h = out)['$<<'] || $mm('<<')).call($h, "");
    (($i = out)['$<<'] || $mm('<<')).call($i, (function() { if (($j = (($k = self)['$attr?'] || $mm('attr?')).call($k, "role")) !== false && $j !== nil) {
      return " " + ((($j = self).$attr || $mm('attr')).call($j, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($l = out)['$<<'] || $mm('<<')).call($l, "\">");
    (($m = out)['$<<'] || $mm('<<')).call($m, (function() { if (($n = (($o = self)['$title?'] || $mm('title?')).call($o)) !== false && $n !== nil) {
      return "\n<div class=\"title\">" + ((function() { if (($n = (($p = self)['$attr?'] || $mm('attr?')).call($p, "caption")) !== false && $n !== nil) {
        return (($n = self).$attr || $mm('attr')).call($n, "caption")
        } else {
        return nil
      }; return nil; }).call(self)) + (self.title) + "</div>"
      } else {
      return nil
    }; return nil; }).call(self));
    (($q = out)['$<<'] || $mm('<<')).call($q, "\n<div class=\"content\">\n<video src=\"");
    (($r = out)['$<<'] || $mm('<<')).call($r, (($s = self).$media_uri || $mm('media_uri')).call($s, (($t = self).$attr || $mm('attr')).call($t, "target")));
    (($u = out)['$<<'] || $mm('<<')).call($u, "\"");
    (($v = out)['$<<'] || $mm('<<')).call($v, (function() { if (($w = (($x = self)['$attr?'] || $mm('attr?')).call($x, "width")) !== false && $w !== nil) {
      return " width=\"" + ((($w = self).$attr || $mm('attr')).call($w, "width")) + "\""
      } else {
      return nil
    }; return nil; }).call(self));
    (($y = out)['$<<'] || $mm('<<')).call($y, "");
    (($z = out)['$<<'] || $mm('<<')).call($z, (function() { if (($aa = (($ab = self)['$attr?'] || $mm('attr?')).call($ab, "height")) !== false && $aa !== nil) {
      return " height=\"" + ((($aa = self).$attr || $mm('attr')).call($aa, "height")) + "\""
      } else {
      return nil
    }; return nil; }).call(self));
    (($ac = out)['$<<'] || $mm('<<')).call($ac, "");
    if (($ad = (($ae = self)['$attr?'] || $mm('attr?')).call($ae, "poster")) !== false && $ad !== nil) {
      (($ad = out)['$<<'] || $mm('<<')).call($ad, " poster=\"");
      (($af = out)['$<<'] || $mm('<<')).call($af, (($ag = self).$media_uri || $mm('media_uri')).call($ag, (($ah = self).$attr || $mm('attr')).call($ah, "poster")));
      (($ai = out)['$<<'] || $mm('<<')).call($ai, "\"");
    };
    (($aj = out)['$<<'] || $mm('<<')).call($aj, "");
    if (($ak = (($al = self)['$attr?'] || $mm('attr?')).call($al, "autoplay-option")) !== false && $ak !== nil) {
      (($ak = out)['$<<'] || $mm('<<')).call($ak, " autoplay")
    };
    (($am = out)['$<<'] || $mm('<<')).call($am, "");
    if (($an = (($ao = self)['$attr?'] || $mm('attr?')).call($ao, "nocontrols-option")) === false || $an === nil) {
      (($an = out)['$<<'] || $mm('<<')).call($an, " controls")
    };
    (($ap = out)['$<<'] || $mm('<<')).call($ap, "");
    if (($aq = (($ar = self)['$attr?'] || $mm('attr?')).call($ar, "loop-option")) !== false && $aq !== nil) {
      (($aq = out)['$<<'] || $mm('<<')).call($aq, " loop")
    };
    (($as = out)['$<<'] || $mm('<<')).call($as, ">\nYour browser does not support the video tag.\n</video>\n</div>\n</div>\n");
    return (($at = out).$join || $mm('join')).call($at);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/block_video")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, TMP_2, $t, $u, $v, $w;
    if (self.id == null) self.id = nil;
    if (self.header == null) self.header = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    if (($c = ($d = ($d = (($e = self).$notitle || $mm('notitle')).call($e), ($d === nil || $d === false)), $d !== false && $d !== nil ? (($d = self)['$has_header?'] || $mm('has_header?')).call($d) : $d)) !== false && $c !== nil) {
      (($c = out)['$<<'] || $mm('<<')).call($c, "<h1");
      (($f = out)['$<<'] || $mm('<<')).call($f, ($g = self.id, $g !== false && $g !== nil ? " id=\"" + (self.id) + "\"" : $g));
      (($g = out)['$<<'] || $mm('<<')).call($g, ">");
      (($h = out)['$<<'] || $mm('<<')).call($h, (($i = self.header).$title || $mm('title')).call($i));
      (($j = out)['$<<'] || $mm('<<')).call($j, "</h1>\n");
    };
    (($k = out)['$<<'] || $mm('<<')).call($k, "");
    (($l = out)['$<<'] || $mm('<<')).call($l, (($m = (($n = self).$content || $mm('content')).call($n)).$chomp || $mm('chomp')).call($m));
    (($o = out)['$<<'] || $mm('<<')).call($o, "");
    if (($p = ($q = (($q = self)['$footnotes?'] || $mm('footnotes?')).call($q), $q !== false && $q !== nil ? ($r = (($s = self)['$attr?'] || $mm('attr?')).call($s, "nofootnotes"), ($r === nil || $r === false)) : $q)) !== false && $p !== nil) {
      (($p = out)['$<<'] || $mm('<<')).call($p, "\n<div id=\"footnotes\">\n<hr>");
      ($r = (($t = (($u = self).$footnotes || $mm('footnotes')).call($u)).$each || $mm('each')), $r._p = (TMP_2 = function(fn) {

        var self = TMP_2._s || this, $a, $b, $c, $d, $e, $f, $g;
        if (fn == null) fn = nil;

        (($a = out)['$<<'] || $mm('<<')).call($a, "");
        (($b = out)['$<<'] || $mm('<<')).call($b, "\n<div class=\"footnote\" id=\"_footnote_" + ((($c = fn).$index || $mm('index')).call($c)) + "\">\n<a href=\"#_footnoteref_" + ((($d = fn).$index || $mm('index')).call($d)) + "\">" + ((($e = fn).$index || $mm('index')).call($e)) + "</a>. " + ((($f = fn).$text || $mm('text')).call($f)) + "\n</div>");
        return (($g = out)['$<<'] || $mm('<<')).call($g, "");
      }, TMP_2._s = self, TMP_2), $r).call($t);
      (($r = out)['$<<'] || $mm('<<')).call($r, "\n</div>");
    };
    (($v = out)['$<<'] || $mm('<<')).call($v, "\n");
    return (($w = out).$join || $mm('join')).call($w);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/embedded")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, $case = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y;
    if (self.type == null) self.type = nil;
    if (self.target == null) self.target = nil;
    if (self.text == null) self.text = nil;
    if (self.document == null) self.document = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    $case = self.type;if ((($j = "xref")['$==='] || $mm('===')).call($j, $case)) {
    (($c = out)['$<<'] || $mm('<<')).call($c, "");
    (($d = out)['$<<'] || $mm('<<')).call($d, "<a href=\"#" + (self.target) + "\">" + ((($e = self.text), $e !== false && $e !== nil ? $e : (($f = (($g = (($h = (($i = self.document).$references || $mm('references')).call($i))['$[]'] || $mm('[]')).call($h, "ids")).$fetch || $mm('fetch')).call($g, self.target, "[" + (self.target) + "]")).$tr_s || $mm('tr_s')).call($f, "\n", " "))) + "</a>");
    (($e = out)['$<<'] || $mm('<<')).call($e, "");
    }
    else if ((($n = "ref")['$==='] || $mm('===')).call($n, $case)) {
    (($k = out)['$<<'] || $mm('<<')).call($k, "");
    (($l = out)['$<<'] || $mm('<<')).call($l, "<a id=\"" + (self.target) + "\"></a>");
    (($m = out)['$<<'] || $mm('<<')).call($m, "");
    }
    else if ((($r = "bibref")['$==='] || $mm('===')).call($r, $case)) {
    (($o = out)['$<<'] || $mm('<<')).call($o, "");
    (($p = out)['$<<'] || $mm('<<')).call($p, "<a id=\"" + (self.target) + "\">[" + (self.target) + "]</a>");
    (($q = out)['$<<'] || $mm('<<')).call($q, "");
    }
    else {(($s = out)['$<<'] || $mm('<<')).call($s, "");
    (($t = out)['$<<'] || $mm('<<')).call($t, "<a href=\"" + (self.target) + "\"" + ((function() { if (($u = (($v = self)['$attr?'] || $mm('attr?')).call($v, "window")) !== false && $u !== nil) {
      return " target=\"" + ((($u = self).$attr || $mm('attr')).call($u, "window")) + "\""
      } else {
      return nil
    }; return nil; }).call(self)) + ">" + (self.text) + "</a>");
    (($w = out)['$<<'] || $mm('<<')).call($w, "");};
    (($x = out)['$<<'] || $mm('<<')).call($x, "\n");
    return (($y = out).$join || $mm('join')).call($y);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/inline_anchor")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d;
    if (self.text == null) self.text = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, self.text);
    (($c = out)['$<<'] || $mm('<<')).call($c, "<br>\n");
    return (($d = out).$join || $mm('join')).call($d);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/inline_break")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g;
    if (self.text == null) self.text = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    (($c = out)['$<<'] || $mm('<<')).call($c, (function() { if (($d = (($e = self)['$attr?'] || $mm('attr?')).call($e, "icons")) !== false && $d !== nil) {
      return "<img src=\"" + ((($d = self).$icon_uri || $mm('icon_uri')).call($d, "callouts/" + (self.text))) + " alt=\"" + (self.text) + "\">"
      } else {
      return "<b>&lt;" + (self.text) + "&gt;</b>"
    }; return nil; }).call(self));
    (($f = out)['$<<'] || $mm('<<')).call($f, "\n");
    return (($g = out).$join || $mm('join')).call($g);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/inline_callout")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, idx = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l;
    if (self.type == null) self.type = nil;
    if (self.id == null) self.id = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    idx = (($c = self).$attr || $mm('attr')).call($c, "index");
    if ((($d = self.type)['$=='] || $mm('==')).call($d, "xref")) {
      (($e = out)['$<<'] || $mm('<<')).call($e, "");
      (($f = out)['$<<'] || $mm('<<')).call($f, "<span class=\"footnoteref\">[<a class=\"footnote\" href=\"#_footnote_" + (idx) + " title=\"View footnote.\">" + (idx) + "</a>]</span>");
      (($g = out)['$<<'] || $mm('<<')).call($g, "");
      } else {
      (($h = out)['$<<'] || $mm('<<')).call($h, "");
      (($i = out)['$<<'] || $mm('<<')).call($i, "<span class=\"footnote\"" + (($j = self.id, $j !== false && $j !== nil ? "id=\"footnote_" + (self.id) + "\"" : $j)) + ">[<a id=\"_footnoteref_" + (idx) + "\" class=\"footnote\" href=\"#_footnote_" + (idx) + "\" title=\"View footnote.\">" + (idx) + "</a>]</span>");
      (($j = out)['$<<'] || $mm('<<')).call($j, "");
    };
    (($k = out)['$<<'] || $mm('<<')).call($k, "\n");
    return (($l = out).$join || $mm('join')).call($l);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/inline_footnote")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad;
    if (self.target == null) self.target = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "<span class=\"image");
    (($c = out)['$<<'] || $mm('<<')).call($c, (function() { if (($d = (($e = self)['$attr?'] || $mm('attr?')).call($e, "role")) !== false && $d !== nil) {
      return " " + ((($d = self).$attr || $mm('attr')).call($d, "role"))
      } else {
      return nil
    }; return nil; }).call(self));
    (($f = out)['$<<'] || $mm('<<')).call($f, "\">");
    if (($g = (($h = self)['$attr?'] || $mm('attr?')).call($h, "link")) !== false && $g !== nil) {
      (($g = out)['$<<'] || $mm('<<')).call($g, "<a class=\"image\" href=\"");
      (($i = out)['$<<'] || $mm('<<')).call($i, (($j = self).$attr || $mm('attr')).call($j, "link"));
      (($k = out)['$<<'] || $mm('<<')).call($k, "\">");
    };
    (($l = out)['$<<'] || $mm('<<')).call($l, "<img src=\"");
    (($m = out)['$<<'] || $mm('<<')).call($m, (($n = self).$image_uri || $mm('image_uri')).call($n, self.target));
    (($o = out)['$<<'] || $mm('<<')).call($o, "\" alt=\"");
    (($p = out)['$<<'] || $mm('<<')).call($p, (($q = self).$attr || $mm('attr')).call($q, "alt"));
    (($r = out)['$<<'] || $mm('<<')).call($r, "");
    (($s = out)['$<<'] || $mm('<<')).call($s, (function() { if (($t = (($u = self)['$attr?'] || $mm('attr?')).call($u, "width")) !== false && $t !== nil) {
      return " width=\"" + ((($t = self).$attr || $mm('attr')).call($t, "width")) + "\""
      } else {
      return nil
    }; return nil; }).call(self));
    (($v = out)['$<<'] || $mm('<<')).call($v, "");
    (($w = out)['$<<'] || $mm('<<')).call($w, (function() { if (($x = (($y = self)['$attr?'] || $mm('attr?')).call($y, "height")) !== false && $x !== nil) {
      return " height=\"" + ((($x = self).$attr || $mm('attr')).call($x, "height")) + "\""
      } else {
      return nil
    }; return nil; }).call(self));
    (($z = out)['$<<'] || $mm('<<')).call($z, "\">");
    if (($aa = (($ab = self)['$attr?'] || $mm('attr?')).call($ab, "link")) !== false && $aa !== nil) {
      (($aa = out)['$<<'] || $mm('<<')).call($aa, "</a>")
    };
    (($ac = out)['$<<'] || $mm('<<')).call($ac, "</span>\n");
    return (($ad = out).$join || $mm('join')).call($ad);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/inline_image")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f;
    if (self.type == null) self.type = nil;
    if (self.text == null) self.text = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    (($c = out)['$<<'] || $mm('<<')).call($c, (function() { if ((($d = self.type)['$=='] || $mm('==')).call($d, "visible")) {
      return self.text
      } else {
      return nil
    }; return nil; }).call(self));
    (($e = out)['$<<'] || $mm('<<')).call($e, "\n");
    return (($f = out).$join || $mm('join')).call($f);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/inline_indexterm")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, text_span = nil, $case = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al;
    if (self.text == null) self.text = nil;
    if (self.type == null) self.type = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    text_span = (function() { if (($c = (($d = self)['$attr?'] || $mm('attr?')).call($d, "role")) !== false && $c !== nil) {
      return "<span class=\"" + ((($c = self).$attr || $mm('attr')).call($c, "role")) + "\">" + (self.text) + "</span>"
      } else {
      return self.text
    }; return nil; }).call(self);
    (($e = out)['$<<'] || $mm('<<')).call($e, "");
    $case = self.type;if ((($i = "emphasis")['$==='] || $mm('===')).call($i, $case)) {
    (($f = out)['$<<'] || $mm('<<')).call($f, "");
    (($g = out)['$<<'] || $mm('<<')).call($g, "<em>" + (text_span) + "</em>");
    (($h = out)['$<<'] || $mm('<<')).call($h, "");
    }
    else if ((($m = "strong")['$==='] || $mm('===')).call($m, $case)) {
    (($j = out)['$<<'] || $mm('<<')).call($j, "");
    (($k = out)['$<<'] || $mm('<<')).call($k, "<strong>" + (text_span) + "</strong>");
    (($l = out)['$<<'] || $mm('<<')).call($l, "");
    }
    else if ((($q = "monospaced")['$==='] || $mm('===')).call($q, $case)) {
    (($n = out)['$<<'] || $mm('<<')).call($n, "");
    (($o = out)['$<<'] || $mm('<<')).call($o, "<code>" + (text_span) + "</code>");
    (($p = out)['$<<'] || $mm('<<')).call($p, "");
    }
    else if ((($u = "superscript")['$==='] || $mm('===')).call($u, $case)) {
    (($r = out)['$<<'] || $mm('<<')).call($r, "");
    (($s = out)['$<<'] || $mm('<<')).call($s, "<sup>" + (text_span) + "</sup>");
    (($t = out)['$<<'] || $mm('<<')).call($t, "");
    }
    else if ((($y = "subscript")['$==='] || $mm('===')).call($y, $case)) {
    (($v = out)['$<<'] || $mm('<<')).call($v, "");
    (($w = out)['$<<'] || $mm('<<')).call($w, "<sub>" + (text_span) + "</sub>");
    (($x = out)['$<<'] || $mm('<<')).call($x, "");
    }
    else if ((($ac = "double")['$==='] || $mm('===')).call($ac, $case)) {
    (($z = out)['$<<'] || $mm('<<')).call($z, "");
    (($aa = out)['$<<'] || $mm('<<')).call($aa, "&#8220;" + (text_span) + "&#8221;");
    (($ab = out)['$<<'] || $mm('<<')).call($ab, "");
    }
    else if ((($ag = "single")['$==='] || $mm('===')).call($ag, $case)) {
    (($ad = out)['$<<'] || $mm('<<')).call($ad, "");
    (($ae = out)['$<<'] || $mm('<<')).call($ae, "&#8216;" + (text_span) + "&#8217;");
    (($af = out)['$<<'] || $mm('<<')).call($af, "");
    }
    else {(($ah = out)['$<<'] || $mm('<<')).call($ah, "");
    (($ai = out)['$<<'] || $mm('<<')).call($ai, text_span);
    (($aj = out)['$<<'] || $mm('<<')).call($aj, "");};
    (($ak = out)['$<<'] || $mm('<<')).call($ak, "\n");
    return (($al = out).$join || $mm('join')).call($al);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/inline_quoted")
})(Opal);
(function(__opal) {
  var TMP_1, $a, $b, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice;
  return ($a = (($b = __scope.ERB).$new || $mm('new')), $a._p = (TMP_1 = function() {

    var out = nil, title_html = nil, self = TMP_1._s || this, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at, $au;
    if (self.level == null) self.level = nil;
    if (self.id == null) self.id = nil;
    if (self.special == null) self.special = nil;

    
    out = [];
    (($a = out)['$<<'] || $mm('<<')).call($a, "");
    (($b = out)['$<<'] || $mm('<<')).call($b, "");
    if (($c = (($d = self.level)['$zero?'] || $mm('zero?')).call($d)) !== false && $c !== nil) {
      (($c = out)['$<<'] || $mm('<<')).call($c, "<h1");
      (($e = out)['$<<'] || $mm('<<')).call($e, ($f = self.id, $f !== false && $f !== nil ? " id=\"" + (self.id) + "\"" : $f));
      (($f = out)['$<<'] || $mm('<<')).call($f, ">");
      (($g = out)['$<<'] || $mm('<<')).call($g, (($h = self).$title || $mm('title')).call($h));
      (($i = out)['$<<'] || $mm('<<')).call($i, "</h1>\n");
      (($j = out)['$<<'] || $mm('<<')).call($j, (($k = (($l = self).$content || $mm('content')).call($l)).$chomp || $mm('chomp')).call($k));
      (($m = out)['$<<'] || $mm('<<')).call($m, "\n");
      } else {
      (($n = out)['$<<'] || $mm('<<')).call($n, "");
      title_html = "" + ((($o = self).$attr || $mm('attr')).call($o, "caption")) + ((($p = self).$title || $mm('title')).call($p));
      if (($q = (($r = self)['$attr?'] || $mm('attr?')).call($r, "anchors")) !== false && $q !== nil) {
        title_html = "<a name=\"" + (self.id) + "\" class=\"anchor\" href=\"#" + (self.id) + "\">" + (title_html) + "</a>"
      };
      if (($q = ($s = ($s = ($s = self.special, ($s === nil || $s === false)), $s !== false && $s !== nil ? (($s = self)['$attr?'] || $mm('attr?')).call($s, "numbered") : $s), $s !== false && $s !== nil ? (($t = self.level)['$<'] || $mm('<')).call($t, 4) : $s)) !== false && $q !== nil) {
        title_html = "" + ((($q = self).$sectnum || $mm('sectnum')).call($q)) + " " + (title_html)
      };
      (($u = out)['$<<'] || $mm('<<')).call($u, "<div");
      (($v = out)['$<<'] || $mm('<<')).call($v, " class=\"sect" + (self.level) + ((function() { if (($w = (($x = self)['$attr?'] || $mm('attr?')).call($x, "role")) !== false && $w !== nil) {
        return " " + ((($w = self).$attr || $mm('attr')).call($w, "role"))
        } else {
        return nil
      }; return nil; }).call(self)) + "\"");
      (($y = out)['$<<'] || $mm('<<')).call($y, ">\n");
      (($z = out)['$<<'] || $mm('<<')).call($z, "<h" + (($aa = self.level, $ab = 1, typeof($aa) === 'number' ? $aa + $ab : $aa['$+']($ab))));
      (($aa = out)['$<<'] || $mm('<<')).call($aa, "");
      (($ab = out)['$<<'] || $mm('<<')).call($ab, ($ac = self.id, $ac !== false && $ac !== nil ? " id=\"" + (self.id) + "\"" : $ac));
      (($ac = out)['$<<'] || $mm('<<')).call($ac, ">");
      (($ad = out)['$<<'] || $mm('<<')).call($ad, title_html);
      (($ae = out)['$<<'] || $mm('<<')).call($ae, "");
      (($af = out)['$<<'] || $mm('<<')).call($af, "</h" + (($ag = self.level, $ah = 1, typeof($ag) === 'number' ? $ag + $ah : $ag['$+']($ah))) + ">");
      (($ag = out)['$<<'] || $mm('<<')).call($ag, "");
      if ((($ah = self.level)['$=='] || $mm('==')).call($ah, 1)) {
        (($ai = out)['$<<'] || $mm('<<')).call($ai, "\n<div class=\"sectionbody\">\n");
        (($aj = out)['$<<'] || $mm('<<')).call($aj, (($ak = (($al = self).$content || $mm('content')).call($al)).$chomp || $mm('chomp')).call($ak));
        (($am = out)['$<<'] || $mm('<<')).call($am, "\n</div>");
        } else {
        (($an = out)['$<<'] || $mm('<<')).call($an, "\n");
        (($ao = out)['$<<'] || $mm('<<')).call($ao, (($ap = (($aq = self).$content || $mm('content')).call($aq)).$chomp || $mm('chomp')).call($ap));
        (($ar = out)['$<<'] || $mm('<<')).call($ar, "\n");
      };
      (($as = out)['$<<'] || $mm('<<')).call($as, "</div>");
    };
    (($at = out)['$<<'] || $mm('<<')).call($at, "\n");
    return (($au = out).$join || $mm('join')).call($au);
  }, TMP_1._s = self, TMP_1), $a).call($b, "asciidoctor/backends/html5/section")
})(Opal);
(function(__opal) {
  var $a, $b, $c, $d, self = __opal.top, __scope = __opal, nil = __opal.nil, $mm = __opal.mm, __breaker = __opal.breaker, __slice = __opal.slice, __gvars = __opal.gvars, __module = __opal.module, __hash2 = __opal.hash2;
  if (($a = (__scope.RUBY_ENGINE != null)) === false || $a === nil) {
    __scope.RUBY_ENGINE = "unknown"
  };
  __scope.OPAL = (($a = __scope.RUBY_ENGINE)['$=='] || $mm('==')).call($a, "opal");
  if (($b = __scope.OPAL) !== false && $b !== nil) {
    
    } else {
    if ((($b = __scope.RUBY_VERSION)['$<'] || $mm('<')).call($b, "1.9")) {
      
    };
  };
  (($c = __gvars[":"]).$unshift || $mm('unshift')).call($c, (($d = __scope.File).$dirname || $mm('dirname')).call($d, "asciidoctor"));
  return (function(__base){
    function Asciidoctor() {};
    Asciidoctor = __module(__base, "Asciidoctor", Asciidoctor);
    var def = Asciidoctor.prototype, __scope = Asciidoctor._scope, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, TMP_1, $ab, $ac, $ad, TMP_2, TMP_5, TMP_6, TMP_8, $ae;

    (function(__base){
      function SafeMode() {};
      SafeMode = __module(__base, "SafeMode", SafeMode);
      var def = SafeMode.prototype, __scope = SafeMode._scope;

      __scope.UNSAFE = 0;

      __scope.SAFE = 1;

      __scope.SERVER = 10;

      __scope.SECURE = 20;
      
    })(Asciidoctor);

    __scope.ROOT_PATH = (($a = __scope.File).$expand_path || $mm('expand_path')).call($a, (($b = __scope.File).$join || $mm('join')).call($b, (($c = __scope.File).$dirname || $mm('dirname')).call($c, "asciidoctor"), ".."));

    __scope.FORCE_ENCODING = ($d = ($d = ($d = __scope.OPAL, ($d === nil || $d === false)), $d !== false && $d !== nil ? (($d = __scope.RUBY_VERSION)['$>'] || $mm('>')).call($d, "1.9") : $d), $d !== false && $d !== nil ? ($e = (($f = (($g = __scope.Encoding).$default_external || $mm('default_external')).call($g))['$=='] || $mm('==')).call($f, (__scope.Encoding)._scope.UTF_8), ($e === nil || $e === false)) : $d);

    __scope.DEFAULT_DOCTYPE = "article";

    __scope.DEFAULT_BACKEND = "html5";

    __scope.DEFAULT_STYLESHEET_PATH = (($e = __scope.File).$join || $mm('join')).call($e, __scope.ROOT_PATH, "stylesheets", "asciidoctor.css");

    __scope.DEFAULT_STYLESHEET_KEYS = (($h = ["", "DEFAULT"]).$to_set || $mm('to_set')).call($h);

    __scope.DEFAULT_STYLESHEET_NAME = (($i = __scope.File).$basename || $mm('basename')).call($i, __scope.DEFAULT_STYLESHEET_PATH);

    __scope.BACKEND_ALIASES = __hash2(["html", "docbook"], {"html": "html5", "docbook": "docbook45"});

    __scope.DEFAULT_PAGE_WIDTHS = __hash2(["docbook"], {"docbook": 425});

    __scope.DEFAULT_EXTENSIONS = __hash2(["html", "docbook", "asciidoc", "markdown"], {"html": ".html", "docbook": ".xml", "asciidoc": ".ad", "markdown": ".md"});

    __scope.SECTION_LEVELS = __hash2(["=", "-", "~", "^", "+"], {"=": 0, "-": 1, "~": 2, "^": 3, "+": 4});

    __scope.ADMONITION_STYLES = (($j = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]).$to_set || $mm('to_set')).call($j);

    __scope.PARAGRAPH_STYLES = (($k = ["comment", "example", "literal", "listing", "normal", "pass", "quote", "sidebar", "source", "verse", "abstract", "partintro"]).$to_set || $mm('to_set')).call($k);

    __scope.VERBATIM_STYLES = (($l = ["literal", "listing", "source", "verse"]).$to_set || $mm('to_set')).call($l);

    __scope.DELIMITED_BLOCKS = __hash2(["--", "----", "....", "====", "****", "____", "++++", "|===", "!===", "////", "```", "~~~"], {"--": ["open", (($m = ["comment", "example", "literal", "listing", "pass", "quote", "sidebar", "source", "verse", "admonition", "abstract", "partintro"]).$to_set || $mm('to_set')).call($m)], "----": ["listing", (($n = ["literal", "source"]).$to_set || $mm('to_set')).call($n)], "....": ["literal", (($o = ["listing", "source"]).$to_set || $mm('to_set')).call($o)], "====": ["example", (($p = ["admonition"]).$to_set || $mm('to_set')).call($p)], "****": ["sidebar", (($q = __scope.Set).$new || $mm('new')).call($q)], "____": ["quote", (($r = ["verse"]).$to_set || $mm('to_set')).call($r)], "++++": ["pass", (($s = __scope.Set).$new || $mm('new')).call($s)], "|===": ["table", (($t = __scope.Set).$new || $mm('new')).call($t)], "!===": ["table", (($u = __scope.Set).$new || $mm('new')).call($u)], "////": ["comment", (($v = __scope.Set).$new || $mm('new')).call($v)], "```": ["fenced_code", (($w = __scope.Set).$new || $mm('new')).call($w)], "~~~": ["fenced_code", (($x = __scope.Set).$new || $mm('new')).call($x)]});

    __scope.BREAK_LINES = __hash2(["'''", "<<<"], {"'''": "ruler", "<<<": "page_break"});

    __scope.LIST_CONTEXTS = ["ulist", "olist", "dlist", "colist"];

    __scope.NESTABLE_LIST_CONTEXTS = ["ulist", "olist", "dlist"];

    __scope.ORDERED_LIST_STYLES = ["arabic", "loweralpha", "lowerroman", "upperalpha", "upperroman"];

    __scope.ORDERED_LIST_MARKER_PATTERNS = __hash2(["arabic", "loweralpha", "upperalpha", "lowerroman", "upperroman"], {"arabic": /\d+[.>]/, "loweralpha": /[a-z]\./, "upperalpha": /[A-Z]\./, "lowerroman": /[ivx]+\)/, "upperroman": /[IVX]+\)/});

    __scope.LIST_CONTINUATION = "+";

    __scope.LINE_BREAK = " +";

    __scope.BLANK_LINES_PATTERN = /^\s*\n/;

    __scope.LINE_FEED_ENTITY = "&#10;";

    __scope.COMPLIANCE = __hash2(["block_terminates_paragraph", "strict_verbatim_paragraphs", "congruent_block_delimiters"], {"block_terminates_paragraph": true, "strict_verbatim_paragraphs": true, "congruent_block_delimiters": true});

    __scope.REGEXP = __hash2(["admonition_inline", "anchor", "anchor_embedded", "anchor_macro", "any_blk", "any_list", "attr_entry", "attr_conditional", "attr_continue", "attr_delete", "blk_attr_list", "attr_line", "attr_ref", "author_info", "biblio_macro", "callout_render", "callout_scan", "colist", "comment_blk", "comment", "csv_delimiter", "semicolon_delim", "scsv_csv_delim", "space_delim", "escaped_space", "digits", "dlist", "dlist_siblings", "footnote_macro", "media_blk_macro", "image_macro", "indexterm_macro", "indexterm2_macro", "leading_blanks", "leading_parent_dirs", "line_break", "link_inline", "link_macro", "email_inline", "lit_par", "olist", "break_line", "pass_macro", "pass_macro_basic", "pass_lit", "pass_placeholder", "revision_info", "single_quote_esc", "illegal_attr_name_chars", "table_colspec", "table_cellspec", "blk_title", "dbl_quoted", "m_dbl_quoted", "section_title", "section_name", "section_underline", "toc", "ulist", "xref_macro", "ifdef_macro", "eval_expr", "include_macro", "uri_sniff", "uri_encode_chars"], {"admonition_inline": (new RegExp("^(" + ($y = (($aa = __scope.ADMONITION_STYLES).$to_a || $mm('to_a')).call($aa), $z = "|", typeof($y) === 'number' ? $y * $z : $y['$*']($z)) + "):\\s")), "anchor": /^\[\[([^\s\[\]]+)\]\]$/, "anchor_embedded": /^(.*?)\s*\[\[([^\[\]]+)\]\]$/, "anchor_macro": /\\?\[\[([\w":].*?)\]\]/, "any_blk": /^(?:--|(?:-|\.|=|\*|_|\+|\/){4,}|[\|!]={3,}|(?:`|~){3,}.*)$/i, "any_list": /^(?:<?\d+>[ \t]+[\x21-\x7E]|[ \t]*(?:(?:-|\*|\.){1,5}|\d+\.|[A-Za-z]\.|[IVXivx]+\))[ \t]+[\x21-\x7E]|[ \t]*.*?(?::{2,4}|;;)(?:[ \t]+[\x21-\x7E]|$))/, "attr_entry": /^:(\w.*?):(?:[ \t]+(.*))?$/, "attr_conditional": /^\s*\{([^\?]+)\?\s*([^\}]+)\s*\}/, "attr_continue": /^[ \t]*(.*)[ \t]\+[ \t]*$/, "attr_delete": /^:([^:]+)!:$/, "blk_attr_list": /^\[(|[ \t]*[\w\{,"'].*)\]$/, "attr_line": /^\[(|[ \t]*[\w\{,"'].*|\[[^\[\]]*\])\]$/, "attr_ref": /(\\?)\{(\w+(?:[\-:]\w+)*)(\\?)\}/, "author_info": /^(\w[\w\-'.]*)(?: +(\w[\w\-'.]*))?(?: +(\w[\w\-'.]*))?(?: +<([^>]+)>)?$/, "biblio_macro": /\\?\[\[\[([\w:][\w:.-]*?)\]\]\]/, "callout_render": /\\?&lt;(\d+)&gt;/, "callout_scan": /\\?<(\d+)>/, "colist": /^<?(\d+)>[ \t]+(.*)/, "comment_blk": /^\/{4,}$/i, "comment": /^\/\/(?:[^\/]|$)/i, "csv_delimiter": /[ \t]*,[ \t]*/, "semicolon_delim": /[ \t]*;[ \t]*/, "scsv_csv_delim": /[ \t]*[,;][ \t]*/, "space_delim": /([^\\])[ \t]+/, "escaped_space": /\\([ \t])/, "digits": /^\d+$/, "dlist": /^[ \t]*(.*?)(:{2,4}|;;)(?:[ \t]+(.*))?$/, "dlist_siblings": __hash2(["::", ":::", "::::", ";;"], {"::": /^[ \t]*((?:.*[^:])?)(::)(?:[ \t]+(.*))?$/, ":::": /^[ \t]*((?:.*[^:])?)(:::)(?:[ \t]+(.*))?$/, "::::": /^[ \t]*((?:.*[^:])?)(::::)(?:[ \t]+(.*))?$/, ";;": /^[ \t]*(.*)(;;)(?:[ \t]+(.*))?$/}), "footnote_macro": /\\?(footnote|footnoteref):\[((?:\\\]|[^\]])*?)\]/, "media_blk_macro": /^(image|video|audio)::(\S+?)\[((?:\\\]|[^\]])*?)\]$/, "image_macro": /\\?image:([^:\[]+)\[((?:\\\]|[^\]])*?)\]/, "indexterm_macro": /\\?(?:indexterm:(?:\[((?:\\\]|[^\]])*?)\])|\(\(\((.*?)\)\)\)(?!\)))/i, "indexterm2_macro": /\\?(?:indexterm2:(?:\[((?:\\\]|[^\]])*?)\])|\(\((.*?)\)\)(?!\)))/i, "leading_blanks": /^([ \t]*)/, "leading_parent_dirs": /^(?:\.\.\/)*/, "line_break": (($y = __scope.Regexp).$new || $mm('new')).call($y, "^(.*)[ \\t]\\+$", "m"), "link_inline": /(^|link:|\s|>|&lt;|[\(\)\[\]])(\\?(?:https?|ftp):\/\/[^\s\[<]*[^\s.,\[<])(?:\[((?:\\\]|[^\]])*?)\])?/i, "link_macro": /\\?(?:link|mailto):([^\s\[]+)(?:\[((?:\\\]|[^\]])*?)\])/, "email_inline": /[\\>:]?\w[\w.%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,4}\b/, "lit_par": /^([ \t]+.*)$/, "olist": /^[ \t]*(\.{1,5}|\d+\.|[A-Za-z]\.|[IVXivx]+\))[ \t]+(.*)$/, "break_line": /^('|<){3,}$/, "pass_macro": /\\?(?:(\+{3}|\${2})(.*?)\1|pass:([a-z,]*)\[((?:\\\]|[^\]])*?)\])/i, "pass_macro_basic": /^pass:([a-z,]*)\[(.*)\]$/, "pass_lit": /(^|[^`\w])(\\?`([^`\s]|[^`\s].*?\S)`)(?![`\w])/i, "pass_placeholder": /\x0(\d+)\x0/, "revision_info": /^(?:\D*(.*?),)?(?:\s*(?!:)(.*?))(?:\s*(?!^):\s*(.*))?$/, "single_quote_esc": /(\w)\\'(\w)/, "illegal_attr_name_chars": /[^\w\-]/, "table_colspec": /^(?:(\d+)\*)?([<^>](?:\.[<^>]?)?|(?:[<^>]?\.)?[<^>])?(\d+)?([a-z])?$/, "table_cellspec": __hash2(["start", "end"], {"start": /^[ \t]*(?:(\d+(?:\.\d*)?|(?:\d*\.)?\d+)([*+]))?([<^>](?:\.[<^>]?)?|(?:[<^>]?\.)?[<^>])?([a-z])?\|/, "end": /[ \t]+(?:(\d+(?:\.\d*)?|(?:\d*\.)?\d+)([*+]))?([<^>](?:\.[<^>]?)?|(?:[<^>]?\.)?[<^>])?([a-z])?$/}), "blk_title": /^\.([^\s.].*)$/, "dbl_quoted": /^("|)(.*)\1$/, "m_dbl_quoted": /^("|)(.*)\1$/i, "section_title": /^(={1,5})\s+(\S.*?)(?:\s*\[\[([^\[]+)\]\])?(?:\s+\1)?$/, "section_name": /^((?=.*\w+.*)[^.].*?)$/, "section_underline": /^(?:=|-|~|\^|\+)+$/, "toc": /^toc::\[(.*?)\]$/, "ulist": /^[ \t]*(-|\*{1,5})[ \t]+(.*)$/, "xref_macro": /\\?(?:&lt;&lt;([\w":].*?)&gt;&gt;|xref:([\w":].*?)\[(.*?)\])/i, "ifdef_macro": /^[\\]?(ifdef|ifndef|ifeval|endif)::(\S*?(?:([,\+])\S+?)?)\[(.+)?\]$/, "eval_expr": /^(\S.*?)[ \t]*(==|!=|<=|>=|<|>)[ \t]*(\S.*)$/, "include_macro": /^\\?include::([^\[]+)\[(.*?)\]$/, "uri_sniff": /^[a-zA-Z][a-zA-Z0-9.+-]*:/i, "uri_encode_chars": /[^\w\-.!~*';:@=+$,()\[\]]/});

    __scope.INTRINSICS = (($z = ($ab = (($ac = __scope.Hash).$new || $mm('new')), $ab._p = (TMP_1 = function(h, k) {

      var self = TMP_1._s || this, $a, $b;
      if (h == null) h = nil;
if (k == null) k = nil;

      (($a = __scope.STDERR).$puts || $mm('puts')).call($a, "Missing intrinsic: " + ((($b = k).$inspect || $mm('inspect')).call($b)));
      return "{" + (k) + "}";
    }, TMP_1._s = Asciidoctor, TMP_1), $ab).call($ac)).$merge || $mm('merge')).call($z, __hash2(["startsb", "endsb", "brvbar", "caret", "asterisk", "tilde", "plus", "apostrophe", "backslash", "backtick", "empty", "sp", "space", "two-colons", "two-semicolons", "nbsp", "deg", "zwsp", "quot", "apos", "lsquo", "rsquo", "ldquo", "rdquo", "wj", "amp", "lt", "gt"], {"startsb": "[", "endsb": "]", "brvbar": "|", "caret": "^", "asterisk": "*", "tilde": "~", "plus": "&#43;", "apostrophe": "'", "backslash": "\\", "backtick": "`", "empty": "", "sp": " ", "space": " ", "two-colons": "::", "two-semicolons": ";;", "nbsp": "&#160;", "deg": "&#176;", "zwsp": "&#8203;", "quot": "&#34;", "apos": "&#39;", "lsquo": "&#8216;", "rsquo": "&#8217;", "ldquo": "&#8220;", "rdquo": "&#8221;", "wj": "&#8288;", "amp": "&", "lt": "<", "gt": ">"}));

    __scope.SPECIAL_CHARS = __hash2(["<", ">", "&"], {"<": "&lt;", ">": "&gt;", "&": "&amp;"});

    __scope.SPECIAL_CHARS_PATTERN = (new RegExp("[" + (($ab = (($ad = __scope.SPECIAL_CHARS).$keys || $mm('keys')).call($ad)).$join || $mm('join')).call($ab) + "]"));

    __scope.QUOTE_SUBS = [["strong", "unconstrained", /\\?(?:\[([^\]]+?)\])?\*\*(.+?)\*\*/i], ["strong", "constrained", /(^|[^\w;:}])(?:\[([^\]]+?)\])?\*(\S|\S.*?\S)\*(?=\W|$)/i], ["double", "constrained", /(^|[^\w;:}])(?:\[([^\]]+?)\])?``(\S|\S.*?\S)''(?=\W|$)/i], ["emphasis", "constrained", /(^|[^\w;:}])(?:\[([^\]]+?)\])?'(\S|\S.*?\S)'(?=\W|$)/i], ["single", "constrained", /(^|[^\w;:}])(?:\[([^\]]+?)\])?`(\S|\S.*?\S)'(?=\W|$)/i], ["monospaced", "unconstrained", /\\?(?:\[([^\]]+?)\])?\+\+(.+?)\+\+/i], ["monospaced", "constrained", /(^|[^\w;:}])(?:\[([^\]]+?)\])?\+(\S|\S.*?\S)\+(?=\W|$)/i], ["emphasis", "unconstrained", /\\?(?:\[([^\]]+?)\])?\_\_(.+?)\_\_/i], ["emphasis", "constrained", /(^|[^\w;:}])(?:\[([^\]]+?)\])?_(\S|\S.*?\S)_(?=\W|$)/i], ["none", "unconstrained", /\\?(?:\[([^\]]+?)\])?##(.+?)##/i], ["none", "constrained", /(^|[^\w;:}])(?:\[([^\]]+?)\])?#(\S|\S.*?\S)#(?=\W|$)/i], ["superscript", "unconstrained", /\\?(?:\[([^\]]+?)\])?\^(.+?)\^/i], ["subscript", "unconstrained", /\\?(?:\[([^\]]+?)\])?\~(.+?)\~/i]];

    __scope.REPLACEMENTS = [[/\\?\(C\)/, "&#169;", "none"], [/\\?\(R\)/, "&#174;", "none"], [/\\?\(TM\)/, "&#8482;", "none"], [/(^|\n| |\\)--( |\n|$)/, "&#8201;&#8212;&#8201;", "none"], [/(\w)\\?--(?=\w)/, "&#8212;", "leading"], [/\\?\.\.\./, "&#8230;", "leading"], [/(\w)\\?'(\w)/, "&#8217;", "bounding"], [/\\?-&gt;/, "&#8594;", "none"], [/\\?=&gt;/, "&#8658;", "none"], [/\\?&lt;-/, "&#8592;", "none"], [/\\?&lt;=/, "&#8656;", "none"], [/\\?(&)amp;((?:[a-zA-Z]+|#\d+|#x[a-zA-Z0-9]+);)/, "", "bounding"]];

    Asciidoctor._defs('$load', TMP_2 = function(input, options) {
      var monitor = nil, start = nil, attrs = nil, lines = nil, input_mtime = nil, input_path = nil, read_time = nil, doc = nil, parse_time = nil, $a, $b, $c, $d, $e, $f, $g, TMP_3, $h, $i, $j, $k, $l, $m, $n, TMP_4, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, $bb, $bc, block;
      block = TMP_2._p || nil, TMP_2._p = null;
      if (options == null) {
        options = __hash2([], {})
      }
      if (($a = monitor = (($b = options).$fetch || $mm('fetch')).call($b, "monitor", false)) !== false && $a !== nil) {
        start = (($a = __scope.Time).$now || $mm('now')).call($a)
      };
      attrs = ($c = "attributes", $d = options, (($e = (($f = $d)['$[]'] || $mm('[]')).call($f, $c)), $e !== false && $e !== nil ? $e : (($g = $d)['$[]='] || $mm('[]=')).call($g, $c, __hash2([], {}))));
      if (($c = (($d = attrs)['$is_a?'] || $mm('is_a?')).call($d, __scope.Hash)) === false || $c === nil) {
        if (($c = (($e = attrs)['$is_a?'] || $mm('is_a?')).call($e, __scope.Array)) !== false && $c !== nil) {
          attrs = (($c = options)['$[]='] || $mm('[]=')).call($c, "attributes", ($h = (($i = attrs).$inject || $mm('inject')), $h._p = (TMP_3 = function(accum, entry) {

            var k = nil, v = nil, self = TMP_3._s || this, $a, $b, $c;
            if (accum == null) accum = nil;
if (entry == null) entry = nil;

            (($a = (($b = entry).$split || $mm('split')).call($b, "=", 2))._isArray ? $a : ($a = [$a])), k = ($a[0] == null ? nil : $a[0]), v = ($a[1] == null ? nil : $a[1]);
            (($a = accum)['$[]='] || $mm('[]=')).call($a, k, (($c = v), $c !== false && $c !== nil ? $c : ""));
            return accum;
          }, TMP_3._s = this, TMP_3), $h).call($i, __hash2([], {})))
          } else {
          if (($h = (($j = attrs)['$is_a?'] || $mm('is_a?')).call($j, __scope.String)) !== false && $h !== nil) {
            attrs = (($h = (($k = attrs).$gsub || $mm('gsub')).call($k, (($l = __scope.REGEXP)['$[]'] || $mm('[]')).call($l, "space_delim"), "\\10")).$gsub || $mm('gsub')).call($h, (($m = __scope.REGEXP)['$[]'] || $mm('[]')).call($m, "escaped_space"), "1");
            attrs = (($n = options)['$[]='] || $mm('[]=')).call($n, "attributes", ($o = (($p = (($q = attrs).$split || $mm('split')).call($q, "0")).$inject || $mm('inject')), $o._p = (TMP_4 = function(accum, entry) {

              var k = nil, v = nil, self = TMP_4._s || this, $a, $b, $c;
              if (accum == null) accum = nil;
if (entry == null) entry = nil;

              (($a = (($b = entry).$split || $mm('split')).call($b, "=", 2))._isArray ? $a : ($a = [$a])), k = ($a[0] == null ? nil : $a[0]), v = ($a[1] == null ? nil : $a[1]);
              (($a = accum)['$[]='] || $mm('[]=')).call($a, k, (($c = v), $c !== false && $c !== nil ? $c : ""));
              return accum;
            }, TMP_4._s = this, TMP_4), $o).call($p, __hash2([], {})));
            } else {
            (($o = this).$raise || $mm('raise')).call($o, __scope.ArgumentError, "illegal type for attributes option")
          }
        }
      };
      lines = nil;
      if (($r = (($s = input)['$is_a?'] || $mm('is_a?')).call($s, __scope.File)) !== false && $r !== nil) {
        lines = (($r = input).$readlines || $mm('readlines')).call($r);
        input_mtime = (($t = input).$mtime || $mm('mtime')).call($t);
        input_path = (($u = __scope.File).$expand_path || $mm('expand_path')).call($u, (($v = input).$path || $mm('path')).call($v));
        (($w = attrs)['$[]='] || $mm('[]=')).call($w, "docfile", input_path);
        (($x = attrs)['$[]='] || $mm('[]=')).call($x, "docdir", (($y = __scope.File).$dirname || $mm('dirname')).call($y, input_path));
        (($z = attrs)['$[]='] || $mm('[]=')).call($z, "docname", (($aa = __scope.File).$basename || $mm('basename')).call($aa, input_path, (($ab = __scope.File).$extname || $mm('extname')).call($ab, input_path)));
        (($ac = attrs)['$[]='] || $mm('[]=')).call($ac, "docdate", (($ad = input_mtime).$strftime || $mm('strftime')).call($ad, "%Y-%m-%d"));
        (($ae = attrs)['$[]='] || $mm('[]=')).call($ae, "doctime", (($af = input_mtime).$strftime || $mm('strftime')).call($af, "%H:%M:%S %Z"));
        (($ag = attrs)['$[]='] || $mm('[]=')).call($ag, "docdatetime", ($ah = [(($aj = attrs)['$[]'] || $mm('[]')).call($aj, "docdate"), (($ak = attrs)['$[]'] || $mm('[]')).call($ak, "doctime")], $ai = " ", typeof($ah) === 'number' ? $ah * $ai : $ah['$*']($ai)));
        } else {
        if (($ah = (($ai = input)['$respond_to?'] || $mm('respond_to?')).call($ai, "readlines")) !== false && $ah !== nil) {
          (($ah = input).$rewind || $mm('rewind')).call($ah);
          lines = (($al = input).$readlines || $mm('readlines')).call($al);
          } else {
          if (($am = (($an = input)['$is_a?'] || $mm('is_a?')).call($an, __scope.String)) !== false && $am !== nil) {
            lines = (($am = (($ao = input).$lines || $mm('lines')).call($ao)).$entries || $mm('entries')).call($am)
            } else {
            if (($ap = (($aq = input)['$is_a?'] || $mm('is_a?')).call($aq, __scope.Array)) !== false && $ap !== nil) {
              lines = (($ap = input).$dup || $mm('dup')).call($ap)
              } else {
              (($ar = this).$raise || $mm('raise')).call($ar, "Unsupported input type: " + ((($as = input).$class || $mm('class')).call($as)))
            }
          }
        }
      };
      if (monitor !== false && monitor !== nil) {
        read_time = ($at = (($av = __scope.Time).$now || $mm('now')).call($av), $au = start, typeof($at) === 'number' ? $at - $au : $at['$-']($au));
        start = (($at = __scope.Time).$now || $mm('now')).call($at);
      };
      doc = ($aw = (($ax = __scope.Document).$new || $mm('new')), $aw._p = (($au = block).$to_proc || $mm('to_proc')).call($au), $aw).call($ax, lines, options);
      if (monitor !== false && monitor !== nil) {
        parse_time = ($aw = (($az = __scope.Time).$now || $mm('now')).call($az), $ay = start, typeof($aw) === 'number' ? $aw - $ay : $aw['$-']($ay));
        (($aw = monitor)['$[]='] || $mm('[]=')).call($aw, "read", read_time);
        (($ay = monitor)['$[]='] || $mm('[]=')).call($ay, "parse", parse_time);
        (($ba = monitor)['$[]='] || $mm('[]=')).call($ba, "load", ($bb = read_time, $bc = parse_time, typeof($bb) === 'number' ? $bb + $bc : $bb['$+']($bc)));
      };
      return doc;
    });

    Asciidoctor._defs('$load_file', TMP_5 = function(filename, options) {
      var $a, $b, $c, $d, block;
      block = TMP_5._p || nil, TMP_5._p = null;
      if (options == null) {
        options = __hash2([], {})
      }
      return ($b = (($c = __scope.Asciidoctor).$load || $mm('load')), $b._p = (($a = block).$to_proc || $mm('to_proc')).call($a), $b).call($c, (($d = __scope.File).$new || $mm('new')).call($d, filename), options)
    });

    Asciidoctor._defs('$render', TMP_6 = function(input, options) {
      var in_place = nil, to_file = nil, to_dir = nil, mkdirs = nil, monitor = nil, write_in_place = nil, write_to_target = nil, stream_output = nil, doc = nil, working_dir = nil, jail = nil, start = nil, output = nil, render_time = nil, outfile = nil, write_time = nil, outdir = nil, stylesdir = nil, $a, $b, $c, $d, $e, $f, $g, $h, $i, $j, $k, $l, $m, $n, $o, $p, $q, $r, $s, $t, $u, $v, $w, $x, $y, $z, $aa, $ab, $ac, $ad, $ae, $af, $ag, $ah, $ai, $aj, $ak, $al, $am, $an, $ao, $ap, $aq, $ar, $as, $at, $au, $av, $aw, $ax, $ay, $az, $ba, TMP_7, $bb, $bc, $bd, $be, $bf, $bg, $bh, $bi, $bj, $bk, $bl, $bm, $bn, $bo, $bp, $bq, $br, $bs, $bt, $bu, $bv, $bw, $bx, block;
      block = TMP_6._p || nil, TMP_6._p = null;
      if (options == null) {
        options = __hash2([], {})
      }
      in_place = (($a = (($b = options).$delete || $mm('delete')).call($b, "in_place")), $a !== false && $a !== nil ? $a : false);
      to_file = (($a = options).$delete || $mm('delete')).call($a, "to_file");
      to_dir = (($c = options).$delete || $mm('delete')).call($c, "to_dir");
      mkdirs = (($d = (($e = options).$delete || $mm('delete')).call($e, "mkdirs")), $d !== false && $d !== nil ? $d : false);
      monitor = (($d = options).$fetch || $mm('fetch')).call($d, "monitor", false);
      write_in_place = (($f = in_place !== false && in_place !== nil) ? (($g = input)['$is_a?'] || $mm('is_a?')).call($g, __scope.File) : $f);
      write_to_target = (($f = to_file), $f !== false && $f !== nil ? $f : to_dir);
      stream_output = ($f = ($f = (($h = to_file)['$nil?'] || $mm('nil?')).call($h), ($f === nil || $f === false)), $f !== false && $f !== nil ? (($f = to_file)['$respond_to?'] || $mm('respond_to?')).call($f, "write") : $f);
      if (($i = (($j = write_in_place !== false && write_in_place !== nil) ? write_to_target : $j)) !== false && $i !== nil) {
        (($i = this).$raise || $mm('raise')).call($i, __scope.ArgumentError, "the option :in_place cannot be used with either the :to_dir or :to_file option")
      };
      if (($j = ($k = ($k = (($l = options)['$has_key?'] || $mm('has_key?')).call($l, "header_footer"), ($k === nil || $k === false)), $k !== false && $k !== nil ? (($k = write_in_place), $k !== false && $k !== nil ? $k : write_to_target) : $k)) !== false && $j !== nil) {
        (($j = options)['$[]='] || $mm('[]=')).call($j, "header_footer", true)
      };
      doc = ($m = (($n = __scope.Asciidoctor).$load || $mm('load')), $m._p = (($k = block).$to_proc || $mm('to_proc')).call($k), $m).call($n, input, options);
      if ((($m = to_file)['$=='] || $mm('==')).call($m, "/dev/null")) {
        return doc
        } else {
        if (write_in_place !== false && write_in_place !== nil) {
          to_file = (($o = __scope.File).$join || $mm('join')).call($o, (($p = __scope.File).$dirname || $mm('dirname')).call($p, (($q = input).$path || $mm('path')).call($q)), "" + ((($r = (($s = doc).$attributes || $mm('attributes')).call($s))['$[]'] || $mm('[]')).call($r, "docname")) + ((($t = (($u = doc).$attributes || $mm('attributes')).call($u))['$[]'] || $mm('[]')).call($t, "outfilesuffix")))
          } else {
          if (($v = ($w = ($w = stream_output, ($w === nil || $w === false)), $w !== false && $w !== nil ? write_to_target : $w)) !== false && $v !== nil) {
            working_dir = (function() { if (($v = (($w = options)['$has_key?'] || $mm('has_key?')).call($w, "base_dir")) !== false && $v !== nil) {
              return (($v = __scope.File).$expand_path || $mm('expand_path')).call($v, (($x = (($y = this).$opts || $mm('opts')).call($y))['$[]'] || $mm('[]')).call($x, "base_dir"))
              } else {
              return (($z = __scope.File).$expand_path || $mm('expand_path')).call($z, (($aa = __scope.Dir).$pwd || $mm('pwd')).call($aa))
            }; return nil; }).call(this);
            jail = (function() { if ((($ab = (($ac = doc).$safe || $mm('safe')).call($ac))['$>='] || $mm('>=')).call($ab, (__scope.SafeMode)._scope.SAFE)) {
              return working_dir
              } else {
              return nil
            }; return nil; }).call(this);
            if (to_dir !== false && to_dir !== nil) {
              to_dir = (($ad = doc).$normalize_system_path || $mm('normalize_system_path')).call($ad, to_dir, working_dir, jail, __hash2(["target_name", "recover"], {"target_name": "to_dir", "recover": false}));
              if (to_file !== false && to_file !== nil) {
                to_file = (($ae = doc).$normalize_system_path || $mm('normalize_system_path')).call($ae, to_file, to_dir, nil, __hash2(["target_name", "recover"], {"target_name": "to_dir", "recover": false}));
                to_dir = (($af = __scope.File).$dirname || $mm('dirname')).call($af, to_file);
                } else {
                to_file = (($ag = __scope.File).$join || $mm('join')).call($ag, to_dir, "" + ((($ah = (($ai = doc).$attributes || $mm('attributes')).call($ai))['$[]'] || $mm('[]')).call($ah, "docname")) + ((($aj = (($ak = doc).$attributes || $mm('attributes')).call($ak))['$[]'] || $mm('[]')).call($aj, "outfilesuffix")))
              };
              } else {
              if (to_file !== false && to_file !== nil) {
                to_file = (($al = doc).$normalize_system_path || $mm('normalize_system_path')).call($al, to_file, working_dir, jail, __hash2(["target_name", "recover"], {"target_name": "to_dir", "recover": false}));
                to_dir = (($am = __scope.File).$dirname || $mm('dirname')).call($am, to_file);
              }
            };
            if (($an = ($ao = (($ap = __scope.File)['$directory?'] || $mm('directory?')).call($ap, to_dir), ($ao === nil || $ao === false))) !== false && $an !== nil) {
              if (mkdirs !== false && mkdirs !== nil) {
                (($an = __scope.Helpers).$require_library || $mm('require_library')).call($an, "fileutils");
                (($ao = __scope.FileUtils).$mkdir_p || $mm('mkdir_p')).call($ao, to_dir);
                } else {
                (($aq = this).$raise || $mm('raise')).call($aq, __scope.IOError, "target directory does not exist: " + (to_dir))
              }
            };
          }
        }
      };
      if (monitor !== false && monitor !== nil) {
        start = (($ar = __scope.Time).$now || $mm('now')).call($ar)
      };
      output = (($as = doc).$render || $mm('render')).call($as);
      if (monitor !== false && monitor !== nil) {
        render_time = ($at = (($av = __scope.Time).$now || $mm('now')).call($av), $au = start, typeof($at) === 'number' ? $at - $au : $at['$-']($au));
        (($at = monitor)['$[]='] || $mm('[]=')).call($at, "render", render_time);
        (($au = monitor)['$[]='] || $mm('[]=')).call($au, "load_render", ($aw = (($ay = monitor)['$[]'] || $mm('[]')).call($ay, "load"), $ax = render_time, typeof($aw) === 'number' ? $aw + $ax : $aw['$+']($ax)));
      };
      if (to_file !== false && to_file !== nil) {
        if (monitor !== false && monitor !== nil) {
          start = (($aw = __scope.Time).$now || $mm('now')).call($aw)
        };
        if (stream_output !== false && stream_output !== nil) {
          (($ax = to_file).$write || $mm('write')).call($ax, (($az = output).$rstrip || $mm('rstrip')).call($az));
          (($ba = to_file).$write || $mm('write')).call($ba, "\n");
          } else {
          ($bb = (($bc = __scope.File).$open || $mm('open')), $bb._p = (TMP_7 = function(file) {

            var self = TMP_7._s || this, $a;
            if (file == null) file = nil;

            return (($a = file).$write || $mm('write')).call($a, output)
          }, TMP_7._s = this, TMP_7), $bb).call($bc, to_file, "w");
          (($bb = (($bd = doc).$attributes || $mm('attributes')).call($bd))['$[]='] || $mm('[]=')).call($bb, "outfile", outfile = (($be = __scope.File).$expand_path || $mm('expand_path')).call($be, to_file));
          (($bf = (($bg = doc).$attributes || $mm('attributes')).call($bg))['$[]='] || $mm('[]=')).call($bf, "outdir", (($bh = __scope.File).$dirname || $mm('dirname')).call($bh, outfile));
        };
        if (monitor !== false && monitor !== nil) {
          write_time = ($bi = (($bk = __scope.Time).$now || $mm('now')).call($bk), $bj = start, typeof($bi) === 'number' ? $bi - $bj : $bi['$-']($bj));
          (($bi = monitor)['$[]='] || $mm('[]=')).call($bi, "write", write_time);
          (($bj = monitor)['$[]='] || $mm('[]=')).call($bj, "total", ($bl = (($bn = monitor)['$[]'] || $mm('[]')).call($bn, "load_render"), $bm = write_time, typeof($bl) === 'number' ? $bl + $bm : $bl['$+']($bm)));
        };
        if (($bl = ($bm = ($bm = ($bm = ($bm = stream_output, ($bm === nil || $bm === false)), $bm !== false && $bm !== nil ? (($bm = doc)['$attr?'] || $mm('attr?')).call($bm, "copycss") : $bm), $bm !== false && $bm !== nil ? (($bo = doc)['$attr?'] || $mm('attr?')).call($bo, "linkcss") : $bm), $bm !== false && $bm !== nil ? (($bp = __scope.DEFAULT_STYLESHEET_KEYS)['$include?'] || $mm('include?')).call($bp, (($bq = doc).$attr || $mm('attr')).call($bq, "stylesheet")) : $bm)) !== false && $bl !== nil) {
          (($bl = __scope.Helpers).$require_library || $mm('require_library')).call($bl, "fileutils");
          outdir = (($br = doc).$attr || $mm('attr')).call($br, "outdir");
          stylesdir = (($bs = doc).$normalize_system_path || $mm('normalize_system_path')).call($bs, (($bt = doc).$attr || $mm('attr')).call($bt, "stylesdir"), outdir, (function() { if ((($bu = (($bv = doc).$safe || $mm('safe')).call($bv))['$>='] || $mm('>=')).call($bu, (__scope.SafeMode)._scope.SAFE)) {
            return outdir
            } else {
            return nil
          }; return nil; }).call(this));
          (($bw = __scope.FileUtils).$mkdir_p || $mm('mkdir_p')).call($bw, stylesdir);
          (($bx = __scope.FileUtils).$cp || $mm('cp')).call($bx, __scope.DEFAULT_STYLESHEET_PATH, stylesdir, __hash2(["preserve"], {"preserve": true}));
        };
        return doc;
        } else {
        return output
      };
    });

    Asciidoctor._defs('$render_file', TMP_8 = function(filename, options) {
      var $a, $b, $c, $d, block;
      block = TMP_8._p || nil, TMP_8._p = null;
      if (options == null) {
        options = __hash2([], {})
      }
      return ($b = (($c = __scope.Asciidoctor).$render || $mm('render')), $b._p = (($a = block).$to_proc || $mm('to_proc')).call($a), $b).call($c, (($d = __scope.File).$new || $mm('new')).call($d, filename), options)
    });

    if (($ae = __scope.OPAL) !== false && $ae !== nil) {
      
    };
    
  })(self);
})(Opal);
