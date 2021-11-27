# frozen_string_literal: true
module Asciidoctor
# A {Converter} implementation that uses templates composed in template languages
# to convert {AbstractNode} objects from a parsed AsciiDoc document tree to the backend format.
class Converter::TemplateConverter < Converter::Base

  @caches = { scans: {}, templates: {} }

  def self.caches
    @caches
  end

  def self.clear_caches
    @caches[:scans].clear if @caches[:scans]
    @caches[:templates].clear if @caches[:templates]
  end

  def initialize backend, template_dirs, opts = {}
    @backend = backend
    @templates = {}
    @template_dirs = template_dirs
    @engine = opts[:template_engine]
    @engine_options = opts[:template_engine_options] || {}
    case opts[:template_cache]
    when true
      @caches = self.class.caches
    when ::Hash
      @caches = opts[:template_cache]
    else
      @caches = {} # the empty Hash effectively disables caching
    end
    scan
  end

  # Public: Convert an {AbstractNode} to the backend format using the named template.
  #
  # Looks for a template that matches the value of the template name or, if the template name is not specified, the
  # value of the {AbstractNode#node_name} property.
  #
  # node          - the AbstractNode to convert
  # template_name - the String name of the template to use, or the value of
  #                 the node_name property on the node if a template name is
  #                 not specified. (optional, default: nil)
  # opts          - an optional Hash that is passed as local variables to the
  #                 template. (optional, default: nil)
  #
  # Returns the [String] result from rendering the template
  def convert node, template_name = nil, opts = nil
    unless (template = @templates[template_name ||= node.node_name])
      raise %(Could not find a custom template to handle transform: #{template_name})
    end

    helpers_ctx = @templates['helpers.js'] && @templates['helpers.js'].ctx
    if template_name == 'document'
      `template.render({node: node, opts: fromHash(opts), helpers: helpers_ctx})`.strip
    else
      `template.render({node: node, opts: fromHash(opts), helpers: helpers_ctx})`.rstrip
    end
  end

  # Public: Checks whether there is a template registered with the specified name.
  #
  # name - the String template name
  #
  # Returns a [Boolean] that indicates whether a template is registered for the
  # specified template name.
  def handles? name
    @templates.key? name
  end

  # Public: Retrieves the templates that this converter manages.
  #
  # Returns a [Hash] of template objects keyed by template name.
  def templates
    @templates.merge
  end

  # Public: Registers a template with this converter.
  #
  # name     - the String template name
  # template - the template object to register
  #
  # Returns the template object
  def register name, template
    @templates[name] = if (template_cache = @caches[:templates] && `template.$file`)
      template_cache[template.file] = template
    else
      template
    end
  end

  private

  # Internal: Scans the template directories specified in the constructor for templates,
  # loads the templates and stores the in a Hash that is accessible via the {TemplateConverter#templates} method.
  #
  # Returns nothing
  def scan
    path_resolver = PathResolver.new
    backend = @backend
    engine = @engine
    @template_dirs.each do |template_dir|
      # FIXME need to think about safe mode restrictions here
      next unless ::File.directory?(template_dir = (path_resolver.system_path template_dir))

      if engine
        file_pattern = %(*.#{engine})
        # example: templates/haml
        if ::File.directory?(engine_dir = %(#{template_dir}/#{engine}))
          template_dir = engine_dir
        end
      else
        # NOTE last matching template wins for template name if no engine is given
        file_pattern = '*'
      end

      # example: templates/html5 (engine not set) or templates/haml/html5 (engine set)
      if ::File.directory?(backend_dir = %(#{template_dir}/#{backend}))
        template_dir = backend_dir
      end

      pattern = %(#{template_dir}/#{file_pattern})

      if (scan_cache = @caches[:scans])
        template_cache = @caches[:templates]
        unless (templates = scan_cache[pattern])
          templates = scan_cache[pattern] = scan_dir template_dir, pattern, template_cache
        end
        templates.each do |name, template|
          @templates[name] = template_cache[template.file] = template
        end
      else
        @templates.update scan_dir(template_dir, pattern, @caches[:templates])
      end
      nil
    end
  end

  # Internal: Require an optional Node module for a given name.
  #
  # Returns the required module
  # Throws an IOError if the module is not available.
  def node_require module_name
    %x{
      try {
        return __require__(#{module_name})
      }
      catch (e) {
        throw #{IOError.new "Unable to require the module '#{module_name}', please make sure that the module is installed."}
      }
    }
  end

  # Internal: Scan the specified directory for template files matching pattern and instantiate a Tilt template for each matched file.
  #
  # Returns the scan result as a [Hash]
  def scan_dir template_dir, pattern, template_cache = nil
    result, helpers = {}, nil
    %x{
      var enginesContext = {}
    }
    # Grab the files in the top level of the directory (do not recurse)
    ::Dir.glob(pattern).select {|match| ::File.file? match }.each do |file|
      if (basename = ::File.basename file) == 'helpers.js' || (basename = ::File.basename file) == 'helpers.cjs'
        helpers = file
        next
      elsif (path_segments = basename.split '.').size < 2
        next
      end
      if (name = path_segments[0]) == 'block_ruler'
        name = 'thematic_break'
      elsif name.start_with? 'block_'
        name = name.slice 6, name.length
      end
      unless template_cache && (template = template_cache[file])
        extsym = path_segments[-1].to_sym
        case extsym
        when :nunjucks, :njk
          nunjucks = node_require 'nunjucks'
          %x{
            var env
            if (enginesContext.nunjucks && enginesContext.nunjucks.environment) {
              env = enginesContext.nunjucks.environment
            } else {
              var opts = self.engine_options['nunjucks'] || {}
              delete opts.web // unsupported option
              env = nunjucks.configure(#{template_dir}, opts)
              enginesContext.nunjucks = { environment: env }
            }
            template = Object.assign(nunjucks.compile(fs.readFileSync(file, 'utf8'), env), { '$file': function() { return file } })
          }
        when :handlebars, :hbs
          handlebars = node_require 'handlebars'
          %x{
            var env
            var opts = self.engine_options['handlebars'] || {}
            if (enginesContext.handlebars && enginesContext.handlebars.environment) {
              env = enginesContext.handlebars.environment
            } else {
              env = handlebars.create()
              enginesContext.handlebars = { environment: env }
            }
            template = { render: env.compile(fs.readFileSync(file, 'utf8'), opts), '$file': function() { return file } }
          }
        when :ejs
          ejs = node_require 'ejs'
          %x{
            var opts = self.engine_options['ejs'] || {}
            opts.filename = file
            // unsupported options
            delete opts.async
            delete opts.client
            template = { render: ejs.compile(fs.readFileSync(file, 'utf8'), opts), '$file': function() { return file } }
          }
        when :pug
          pug = node_require 'pug'
          %x{
            var opts = self.engine_options['pug'] || {}
            opts.filename = file
            template = { render: pug.compileFile(file, opts), '$file': function() { return file } }
          }
        when :js, :cjs
          template = `{ render: __require__(file), '$file': function() { return file } }`
        else
          %x{
            var registry = Opal.Asciidoctor.TemplateEngine.registry
            var templateEngine = registry[#{extsym}]
            if (templateEngine && typeof templateEngine.compile === 'function') {
              template = Object.assign(templateEngine.compile(file, name), { '$file': function() { return file } })
            } else {
              template = undefined
            }
          }
        end
      end
      result[name] = template if template
    end
    if helpers || ::File.file?(helpers = %(#{template_dir}/helpers.js)) || ::File.file?(helpers = %(#{template_dir}/helpers.cjs))
      %x{
        var ctx = __require__(helpers)
        if (typeof ctx.configure === 'function') {
          ctx.configure(enginesContext)
        }
      }
      result['helpers.js'] = `{ '$file': function() { return helpers }, $ctx: function() { return ctx } }`
    end
    result
  end
end
end
