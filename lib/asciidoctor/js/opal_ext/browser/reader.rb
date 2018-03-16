module Asciidoctor
class PreprocessorReader < Reader
  def resolve_include_target target, attrlist, attributes
    # NOTE when the IO module is xmlhttprequest, the only way to check if the file exists is to catch a 404 response
    p_target = (@path_resolver ||= PathResolver.new '\\').posixify target
    target_type, base_dir = :file, @document.base_dir
    if p_target.start_with? 'file://'
      inc_path = relpath = p_target
    elsif Helpers.uriish? p_target
      unless (@path_resolver.descends_from? p_target, base_dir) || (@document.attributes.key? 'allow-uri-read')
        return replace_next_line %(link:#{target}[#{attrlist}])
      end
      inc_path = relpath = p_target
    elsif @path_resolver.absolute_path? p_target
      inc_path = relpath = %(file://#{(p_target.start_with? '/') ? '' : '/'}#{p_target})
    elsif (ctx_dir = (top_level = @include_stack.empty?) ? base_dir : @dir) == '.'
      # WARNING relative include won't work in the Firefox web extension (unless we use the second line)
      inc_path = relpath = p_target
      #inc_path = %(#{File.dirname `window.location.href`}/#{relpath = p_target})
    elsif (ctx_dir.start_with? 'file://') || !(Helpers.uriish? ctx_dir)
      # WARNING relative nested include won't work in the Firefox web extension if base_dir is '.'
      inc_path = %(#{ctx_dir}/#{p_target})
      if top_level
        relpath = p_target
      elsif base_dir == '.' || !(offset = @path_resolver.descends_from? inc_path, base_dir)
        relpath = inc_path
      else
        relpath = inc_path.slice offset, inc_path.length
      end
    elsif top_level
      inc_path = %(#{ctx_dir}/#{relpath = p_target})
    elsif (offset = @path_resolver.descends_from? ctx_dir, base_dir) || (@document.attributes.key? 'allow-uri-read')
      inc_path = %(#{ctx_dir}/#{p_target})
      relpath = offset ? (inc_path.slice offset, inc_path.length) : p_target
    else
      return replace_next_line %(link:#{target}[#{attrlist}])
    end
    [inc_path, :file, relpath]
  end
end
end
