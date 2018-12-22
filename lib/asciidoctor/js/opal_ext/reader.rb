module Asciidoctor
# Utility methods extracted from the "preprocess_include_directive" method
# https://github.com/asciidoctor/asciidoctor/blob/ebb05a60ff7b4d61655d9d4ec33e5e0100f17de8/lib/asciidoctor/reader.rb#L867
class PreprocessorReader < Reader
  def include_line_numbers parsed_attrs
    inc_linenos = nil
    if parsed_attrs.key? 'lines'
      inc_linenos = []
      (split_delimited_value parsed_attrs['lines']).each do |linedef|
        if linedef.include? '..'
          from, to = linedef.split '..', 2
          inc_linenos += (to.empty? || (to = to.to_i) < 0) ? [from.to_i, 1.0 / 0.0] : ::Range.new(from.to_i, to).to_a
        else
          inc_linenos << linedef.to_i
        end
      end
      inc_linenos = inc_linenos.empty? ? nil : inc_linenos.sort.uniq
    end
    inc_linenos
  end

  def include_tags parsed_attrs
    inc_tags = nil
    if parsed_attrs.key? 'tag'
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
    inc_tags
  end

  def select_include_lines input, inc_linenos
    inc_lines, inc_offset, inc_lineno = [], nil, 0
    select_remaining = nil
    input.each_line do |l|
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
    inc_lines
  end

  def select_include_tags input, inc_tags
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
    dbl_co, dbl_sb = '::', '[]'
    encoding = ::Encoding::UTF_8 if COERCE_ENCODING
    input.each_line do |l|
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
            if (idx = tag_stack.rindex {|key, _| key == this_tag })
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
    unless tag_stack.empty?
      tag_stack.each do |tag_name, _, tag_lineno|
        logger.warn message_with_context %(detected unclosed tag '#{tag_name}' starting at line #{tag_lineno} of include #{target_type}: #{inc_path}), :source_location => cursor, :include_location => (create_include_cursor inc_path, expanded_target, tag_lineno)
      end
    end
    unless (missing_tags = inc_tags.keys.to_a - tags_used.to_a).empty?
      logger.warn message_with_context %(tag#{missing_tags.size > 1 ? 's' : ''} '#{missing_tags.join ', '}' not found in include #{target_type}: #{inc_path}), :source_location => cursor
    end
    [inc_lines, inc_offset]
  end
end
end
