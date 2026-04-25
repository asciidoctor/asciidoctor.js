import { load } from '../src/load.js'

export const documentFromString = (input, opts = {}) => load(input, { safe: 'safe', ...opts })

export const convertString = (input, opts = {}) =>
  documentFromString(input, { standalone: true, ...opts }).then((doc) => doc.convert())

export const convertStringToEmbedded = (input, opts = {}) =>
  documentFromString(input, opts).then((doc) => doc.convert())

export const blockFromString = async (input, opts = {}) =>
  (await documentFromString(input, opts)).blocks[0]