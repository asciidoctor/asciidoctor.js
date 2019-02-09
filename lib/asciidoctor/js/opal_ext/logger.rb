class Logger
  class Formatter
    def call(severity, time, progname, msg)
      time_format = `d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2) + 'T' + ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2) + ':' + ('0'+d.getSeconds()).slice(-2) + '.' + (d.getMilliseconds()/10).toFixed(2)`
      format(MESSAGE_FORMAT, severity.chr, time_format, severity, progname, message_as_string(msg))
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
    @pipe.write(@formatter.call(SEVERITY_LABELS[severity] || 'ANY', `new Date()`, progname, message))
    true
  end
end
