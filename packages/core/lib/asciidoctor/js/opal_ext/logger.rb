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
end
