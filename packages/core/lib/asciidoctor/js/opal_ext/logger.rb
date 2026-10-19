class Logger
  class Formatter
    def call(severity, time, progname, msg)
      time_format = `time.getFullYear() + '-' + ('0'+(time.getMonth()+1)).slice(-2) + '-' + ('0'+time.getDate()).slice(-2) + 'T' + ('0'+time.getHours()).slice(-2) + ':' + ('0'+time.getMinutes()).slice(-2) + ':' + ('0'+time.getSeconds()).slice(-2) + '.' + ('00' + new Date().getMilliseconds() * 1000).slice(-6)`
      # here we are using string interpolation instead of Kernel#format
      "#{severity.chr}, [#{time_format}] #{severity.rjust(5)} -- #{progname}: #{message_as_string(msg)}"
    end
  end

  def add(severity, message = nil, progname = nil, &block)
    return true if (severity ||= UNKNOWN) < @level
    progname ||= @progname
    unless message
      if block_given?
        message = yield
      else
        message = progname
        progname = @progname
      end
    end
    # here we are using `new Date()` instead of Time.now
    @pipe.write(@formatter.call(SEVERITY_LABELS[severity] || 'ANY', `new Date()`, progname, message))
    true
  end
end if defined? ::Logger

# NOTE Asciidoctor >= 2.1 no longer requires the logger library on Opal, it uses Asciidoctor::BasicLogger instead
class Asciidoctor::BasicLogger
  class Formatter
    def call(severity, time, progname, msg)
      time_format = `time.getFullYear() + '-' + ('0'+(time.getMonth()+1)).slice(-2) + '-' + ('0'+time.getDate()).slice(-2) + 'T' + ('0'+time.getHours()).slice(-2) + ':' + ('0'+time.getMinutes()).slice(-2) + ':' + ('0'+time.getSeconds()).slice(-2) + '.' + ('00' + new Date().getMilliseconds() * 1000).slice(-6)`
      # here we are using string interpolation instead of Kernel#format
      "#{severity.chr}, [#{time_format}] #{severity.rjust(5)} -- #{progname}: #{::String === msg ? msg : msg.inspect}#{::Asciidoctor::LF}"
    end
  end

  def add(severity, message = nil, progname = nil, &block)
    return true if (severity ||= UNKNOWN) < @level || !@logdev
    progname ||= @progname
    if message.nil?
      if block_given?
        message = yield
      else
        message = progname
        progname = @progname
      end
    end
    formatter = @formatter || @default_formatter
    # here we are using `new Date()` instead of Time.now
    @logdev.write formatter.call(SEVERITY_LABELS[severity] || 'ANY', `new Date()`, progname, message)
    true
  end

  # NOTE pass the message as the progname, like ::Logger does, to remain compatible with custom loggers
  (Severity.constants false).each do |const|
    severity = Severity.const_get const
    define_method const.to_s.downcase do |message = nil, &block|
      add severity, nil, message, &block
    end
  end
end unless defined? ::Logger

class Asciidoctor::Logger
  # NOTE pass the arguments explicitly since an implicit super does not pass the modified arguments in Opal
  def initialize *args, **opts
    opts[:progname] = 'asciidoctor'
    opts[:formatter] = BasicFormatter.new unless opts.key? :formatter
    opts[:level] = WARN unless opts.key? :level
    args = [$stderr] if args.empty?
    super(*args, **opts)
  end
end unless defined? ::Logger
