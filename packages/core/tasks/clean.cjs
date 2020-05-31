'use strict'

const args = process.argv.slice(2)
const type = args[0] || 'all'

const cleanModule = require('./module/clean.cjs')
cleanModule.clean(type)
