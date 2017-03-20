module Kernel
  # Redefine Kernel#freeze to suppress "not supported" warning message from Opal.
  # TODO Remove once https://github.com/opal/opal/issues/1253 is resolved.
  # NOTE Opal should define freeze on Object, not Kernel.
  def freeze
    self
  end
end
