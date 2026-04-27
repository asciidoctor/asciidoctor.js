module.exports.attributeIfSet = (attName, attValue) => {
  if (attName && attValue !== undefined && attValue.trim().length > 0) {
    return `${attName.trim()}="${attValue.trim()}"`
  }
}
