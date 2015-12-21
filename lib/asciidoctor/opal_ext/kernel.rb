module Kernel
  def freeze
    # noop, suppress "not supported" warning message
	# TODO Remove when https://github.com/opal/opal/issues/1253 will be resolved
  end
end