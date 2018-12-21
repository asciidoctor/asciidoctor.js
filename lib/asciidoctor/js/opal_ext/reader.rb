module Asciidoctor
# Utility methods extracted from the "preprocess_include_directive" method
# https://github.com/asciidoctor/asciidoctor/blob/ebb05a60ff7b4d61655d9d4ec33e5e0100f17de8/lib/asciidoctor/reader.rb#L867
class PreprocessorReader < Reader
  # Internal: Preprocess the directive to include lines from another document.
  #
  # Preprocess the directive to include the target document. The scenarios
  # are as follows:
  #
  # If SafeMode is SECURE or greater, the directive is ignore and the include
  # directive line is emitted verbatim.
  #
  # Otherwise, if an include processor is specified pass the target and
  # attributes to that processor and expect an Array of String lines in return.
  #
  # Otherwise, if the max depth is greater than 0, and is not exceeded by the
  # stack size, normalize the target path and read the lines onto the beginning
  # of the Array of source data.
  #
  # If none of the above apply, emit the include directive line verbatim.
  #
  # target   - The unsubstituted String name of the target document to include as specified in the
  #            target slot of the include directive.
  # attrlist - An attribute list String, which is the text between the square brackets of the
  #            include directive.
  #
  # Returns a [Boolean] indicating whether the line under the cursor was changed. To skip over the
  # directive, call shift and return true.
  def preprocess_include_directive target, attrlist
    doc = @document
    if ((expanded_target = target).include? ATTR_REF_HEAD) &&
        (expanded_target = doc.sub_attributes target, :attribute_missing => 'drop-line').empty?
      shift
      if (doc.attributes['attribute-missing'] || Compliance.attribute_missing) == 'skip'
        unshift %(Unresolved directive in #{@path} - include::#{target}[#{attrlist}])
      end
      true
    elsif include_processors? && (ext = @include_processor_extensions.find {|candidate| candidate.instance.handles? expanded_target })
      shift
      # FIXME parse attributes only if requested by extension
      ext.process_method[doc, self, expanded_target, (doc.parse_attributes attrlist, [], :sub_input => true)]
      true
    # if running in SafeMode::SECURE or greater, don't process this directive
    # however, be friendly and at least make it a link to the source document
    elsif doc.safe >= SafeMode::SECURE
      # FIXME we don't want to use a link macro if we are in a verbatim context
      replace_next_line %(link:#{expanded_target}[])
    elsif (abs_maxdepth = @maxdepth[:abs]) > 0
      if @include_stack.size >= abs_maxdepth
        logger.error message_with_context %(maximum include depth of #{@maxdepth[:rel]} exceeded), :source_location => cursor
        return
      end

      parsed_attrs = doc.parse_attributes attrlist, [], :sub_input => true
      inc_path, target_type, relpath = resolve_include_path expanded_target, attrlist, parsed_attrs
      return inc_path unless target_type

      inc_linenos = inc_tags = nil
      if attrlist
        if parsed_attrs.key? 'lines'
          inc_linenos = []
          (split_delimited_value parsed_attrs['lines']).each do |linedef|
            if linedef.include? '..'
              from, to = linedef.split '..', 2
              inc_linenos += (to.empty? || (to = to.to_i) < 0) ? [from.to_i, 1.0/0.0] : ::Range.new(from.to_i, to).to_a
            else
              inc_linenos << linedef.to_i
            end
          end
          inc_linenos = inc_linenos.empty? ? nil : inc_linenos.sort.uniq
        elsif parsed_attrs.key? 'tag'
          unless (tag = parsed_attrs['tag']).empty? || tag == '!'
            inc_tags = (tag.start_with? '!') ? { (tag.slice 1, tag.length) => false } : { tag => true }
          end
        elsif parsed_attrs.key? 'tags'
          inc_tags = {}
          (split_delimited_value parsed_attrs['tags']).each do |tagdef|
            if tagdef.start_with? '!'
              inc_tags[tagdef.slice 1, tagdef.length] = false
            else
              inc_tags[tagdef] = true
            end unless tagdef.empty? || tagdef == '!'
          end
          inc_tags = nil if inc_tags.empty?
        end
      end

      if inc_linenos
        inc_lines, inc_offset, inc_lineno = [], nil, 0
        begin
          select_remaining = nil
          read_include_content(inc_path, target_type).each_line do |l|
            inc_lineno += 1
            if select_remaining || (::Float === (select = inc_linenos[0]) && (select_remaining = select.infinite?))
              # NOTE record line where we started selecting
              inc_offset ||= inc_lineno
              inc_lines << l
            else
              if select == inc_lineno
                # NOTE record line where we started selecting
                inc_offset ||= inc_lineno
                inc_lines << l
                inc_linenos.shift
              end
              break if inc_linenos.empty?
            end
          end
        rescue
          logger.error message_with_context %(include #{target_type} not readable: #{inc_path}), :source_location => cursor
          return replace_next_line %(Unresolved directive in #{@path} - include::#{expanded_target}[#{attrlist}])
        end
        shift
        # FIXME not accounting for skipped lines in reader line numbering
        if inc_offset
          parsed_attrs['partial-option'] = true
          push_include inc_lines, inc_path, relpath, inc_offset, parsed_attrs
        end
      elsif inc_tags
        inc_lines, inc_offset, inc_lineno, tag_stack, tags_used, active_tag = [], nil, 0, [], ::Set.new, nil
        if inc_tags.key? '**'
          if inc_tags.key? '*'
            select = base_select = (inc_tags.delete '**')
            wildcard = inc_tags.delete '*'
          else
            select = base_select = wildcard = (inc_tags.delete '**')
          end
        else
          select = base_select = !(inc_tags.value? true)
          wildcard = inc_tags.delete '*'
        end
        begin
          dbl_co, dbl_sb = '::', '[]'
          encoding = ::Encoding::UTF_8 if COERCE_ENCODING
          read_include_content(inc_path, target_type).each_line do |l|
            inc_lineno += 1
            # must force encoding since we're performing String operations on line
            l.force_encoding encoding if encoding
            if (l.include? dbl_co) && (l.include? dbl_sb) && TagDirectiveRx =~ l
              if $1 # end tag
                if (this_tag = $2) == active_tag
                  tag_stack.pop
                  active_tag, select = tag_stack.empty? ? [nil, base_select] : tag_stack[-1]
                elsif inc_tags.key? this_tag
                  include_cursor = create_include_cursor inc_path, expanded_target, inc_lineno
                  if (idx = tag_stack.rindex {|key, _| key == this_tag})
                    idx == 0 ? tag_stack.shift : (tag_stack.delete_at idx)
                    logger.warn message_with_context %(mismatched end tag (expected '#{active_tag}' but found '#{this_tag}') at line #{inc_lineno} of include #{target_type}: #{inc_path}), :source_location => cursor, :include_location => include_cursor
                  else
                    logger.warn message_with_context %(unexpected end tag '#{this_tag}' at line #{inc_lineno} of include #{target_type}: #{inc_path}), :source_location => cursor, :include_location => include_cursor
                  end
                end
              elsif inc_tags.key?(this_tag = $2)
                tags_used << this_tag
                # QUESTION should we prevent tag from being selected when enclosing tag is excluded?
                tag_stack << [(active_tag = this_tag), (select = inc_tags[this_tag]), inc_lineno]
              elsif !wildcard.nil?
                select = active_tag && !select ? false : wildcard
                tag_stack << [(active_tag = this_tag), select, inc_lineno]
              end
            elsif select
              # NOTE record the line where we started selecting
              inc_offset ||= inc_lineno
              inc_lines << l
            end
          end
        rescue
          logger.error message_with_context %(include #{target_type} not readable: #{inc_path}), :source_location => cursor
          return replace_next_line %(Unresolved directive in #{@path} - include::#{expanded_target}[#{attrlist}])
        end
        unless tag_stack.empty?
          tag_stack.each do |tag_name, _, tag_lineno|
            logger.warn message_with_context %(detected unclosed tag '#{tag_name}' starting at line #{tag_lineno} of include #{target_type}: #{inc_path}), :source_location => cursor, :include_location => (create_include_cursor inc_path, expanded_target, tag_lineno)
          end
        end
        unless (missing_tags = inc_tags.keys.to_a - tags_used.to_a).empty?
          logger.warn message_with_context %(tag#{missing_tags.size > 1 ? 's' : ''} '#{missing_tags.join ', '}' not found in include #{target_type}: #{inc_path}), :source_location => cursor
        end
        shift
        if inc_offset
          parsed_attrs['partial-option'] = true unless base_select && wildcard && inc_tags.empty?
          # FIXME not accounting for skipped lines in reader line numbering
          push_include inc_lines, inc_path, relpath, inc_offset, parsed_attrs
        end
      else
        begin
          # NOTE read content first so that we only advance cursor if IO operation succeeds
          inc_content = read_include_content inc_path, target_type
          shift
          push_include inc_content, inc_path, relpath, 1, parsed_attrs
        rescue
          logger.error message_with_context %(include #{target_type} not readable: #{inc_path}), :source_location => cursor
          return replace_next_line %(Unresolved directive in #{@path} - include::#{expanded_target}[#{attrlist}])
        end
      end
      true
    end
  end

  # If a VFS is defined, Asciidoctor will use it to resolve the include target.
  # Otherwise use the file system or the network to read the file.
  def read_include_content inc_path, target_type
    if (vfs = @document.options['vfs']) && (content = vfs[inc_path])
      content
    else
      target_type == :file ? ::File.open(inc_path, 'rb') {|f| f.read } : open(inc_path, 'rb') {|f| f.read }
    end
  end
end
end
