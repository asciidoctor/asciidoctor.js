# backtick_javascript: true

module Asciidoctor
class Document < AbstractBlock

  def fill_datetime_attributes attrs, input_mtime
    %x{
      var $truthy = Opal.truthy
      var $falsy = Opal.falsy
      var nil = Opal.nil
      var utc_offset
      var source_date_epoch
      var localdate
      var localyear
      var localtime
      var localdatetime
      var docdate
      var doctime

      var getYear = function (time, utc_offset) {
        return utc_offset === 0 ? time.getUTCFullYear() : time.getFullYear()
      }
      var getMonth = function (time, utc_offset) {
        return utc_offset === 0 ? time.getUTCMonth() : time.getMonth()
      }
      var getDay = function (time, utc_offset) {
        return utc_offset === 0 ? time.getUTCDate() : time.getDate()
      }
      var getHours = function (time, utc_offset) {
        return utc_offset === 0 ? time.getUTCHours() : time.getHours()
      }

      var now = new Date()
      // See https://reproducible-builds.org/specs/source-date-epoch/
      if (Opal.const_get_qualified('::', 'ENV')['$key?']('SOURCE_DATE_EPOCH')) {
        now.setTime(parseInt(Opal.const_get_qualified('::', 'ENV')['$[]']('SOURCE_DATE_EPOCH')) * 1000)
        source_date_epoch = now
        utc_offset = 0  // utc
      } else {
        utc_offset = -now.getTimezoneOffset() / 60 // local date
      }
      // localdate and localyear
      if ($truthy((localdate = attrs['$[]']('localdate')))) {
        if ($falsy(localyear = attrs['$[]']('localyear'))) {
          localyear = localdate.indexOf('-') === 4 ? localdate.substring(0, 4) : nil
          attrs['$[]=']('localyear', localyear)
        }
      } else {
        var now_year = getYear(now, utc_offset).toString()
        var now_month = ('0' + (getMonth(now, utc_offset) + 1)).slice(-2)
        var now_day = ('0' + getDay(now, utc_offset)).slice(-2)
        localdate = now_year + '-' + now_month + '-' + now_day
        attrs['$[]=']('localdate', localdate)
        localyear = now_year
        attrs['$[]=']('localyear', now_year)
      }
      // localtime
      if ($falsy((localtime = attrs['$[]']('localtime')))) {
        var hours = ('0' + (getHours(now, utc_offset))).slice(-2)
        var minutes = ('0' + (now.getMinutes())).slice(-2)
        var seconds = ('0' + (now.getSeconds())).slice(-2)
        var utc_offset_format
        if (utc_offset === 0) {
          utc_offset_format = 'UTC'
        } else if (utc_offset > 0) {
          utc_offset_format = ('+0' + (utc_offset * 100)).slice(-5)
        } else {
          utc_offset_format = ('-0' + (-utc_offset * 100)).slice(-5)
        }
        localtime = hours + ':' + minutes + ':' + seconds + ' ' + utc_offset_format
        attrs['$[]=']('localtime', localtime)
      }
      // localdatetime
      if ($falsy((localdatetime = attrs['$[]']('localdatetime')))) {
        localdatetime = localdate + ' ' + localtime
        attrs['$[]=']('localdatetime', localdatetime)
      }

      // docdate, doctime and docdatetime should default to localdate, localtime and localdatetime if not otherwise set
      if ($truthy(source_date_epoch)) {
        input_mtime = source_date_epoch
      } else if ($truthy(input_mtime)) {
        utc_offset = -input_mtime.getTimezoneOffset() / 60
      } else {
        input_mtime = now
      }

      // docdate and docyear
      if ($truthy(docdate = attrs['$[]']('docdate'))) {
        attrs['$[]=']('docyear', docdate.indexOf('-') === 4 ? docdate.substring(0, 4) : nil)
      } else {
        var mtime_year = getYear(input_mtime, utc_offset).toString()
        var mtime_month = ('0' + (getMonth(input_mtime, utc_offset) + 1)).slice(-2)
        var mtime_day = ('0' + (getDay(input_mtime, utc_offset))).slice(-2)
        docdate = mtime_year + '-' + mtime_month + '-' + mtime_day
        attrs['$[]=']('docdate', docdate)
        if ($falsy(attrs['$[]']('docyear'))) {
          attrs['$[]=']('docyear', mtime_year)
        }
      }
      // doctime
      if ($falsy(doctime = attrs['$[]']('doctime'))) {
        var mtime_hours = ('0' + (getHours(input_mtime, utc_offset))).slice(-2)
        var mtime_minutes = ('0' + (input_mtime.getMinutes())).slice(-2)
        var mtime_seconds = ('0' + (input_mtime.getSeconds())).slice(-2)
        var utc_offset_format
        if (utc_offset === 0) {
          utc_offset_format = 'UTC'
        } else if (utc_offset > 0) {
          utc_offset_format = ('+0' + (utc_offset * 100)).slice(-5)
        } else {
          utc_offset_format = ('-0' + (-utc_offset * 100)).slice(-5)
        }
        doctime = mtime_hours + ':' + mtime_minutes + ':' + mtime_seconds + ' ' + utc_offset_format
        attrs['$[]=']('doctime', doctime)
      }
      // docdatetime
      if ($falsy(attrs['$[]']('docdatetime'))) {
        attrs['$[]=']('docdatetime', docdate + ' ' + doctime)
      }
      return nil
    }
  end
end
end
