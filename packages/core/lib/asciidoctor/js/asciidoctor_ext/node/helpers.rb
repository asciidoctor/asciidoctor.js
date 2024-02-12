module Asciidoctor
# Internal: Except where noted, a module that contains internal helper functions.
module Helpers
  module_function

  # preserve the original require_library method
  alias original_require_library require_library

  # Public: Require the specified library using Kernel#require.
  #
  # Attempts to load the library specified in the first argument using the
  # Kernel#require. Rescues the LoadError if the library is not available and
  # passes a message to Kernel#raise if on_failure is :abort or Kernel#warn if
  # on_failure is :warn to communicate to the user that processing is being
  # aborted or functionality is disabled, respectively. If a gem_name is
  # specified, the message communicates that a required gem is not available.
  #
  # name       - the String name of the library to require.
  # gem_name   - a Boolean that indicates whether this library is provided by a RubyGem,
  #              or the String name of the RubyGem if it differs from the library name
  #              (default: true)
  # on_failure - a Symbol that indicates how to handle a load failure (:abort, :warn, :ignore) (default: :abort)
  #
  # Returns The [Boolean] return value of Kernel#require if the library can be loaded.
  # Otherwise, if on_failure is :abort, Kernel#raise is called with an appropriate message.
  # Otherwise, if on_failure is :warn, Kernel#warn is called with an appropriate message and nil returned.
  # Otherwise, nil is returned.
  def require_library name, gem_name = true, on_failure = :abort
    if name == 'open-uri/cached'
      `return Opal.Asciidoctor.Cache.enable()`
    end
    original_require_library name, gem_name, on_failure
  end
end
end
