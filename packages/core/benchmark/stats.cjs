const standardDeviation = (durations) => {
  const avg = average(durations)
  const squareDiffs = durations.map((value) => Math.pow((value - avg), 2))
  const avgSquareDiff = average(squareDiffs)
  return Math.sqrt(avgSquareDiff)
}

const average = (durations) => durations.reduce((acc, value) => acc + value, 0) / durations.length
const sortNumber = (a, b) => a - b

const quantile = (durations, percentile) => {
  durations.sort(sortNumber)
  const index = percentile / 100.0 * (durations.length - 1)
  let result
  let i
  let fraction
  if (Math.floor(index) === index) {
    result = durations[index]
  } else {
    i = Math.floor(index)
    fraction = index - i
    result = durations[i] + (durations[i + 1] - durations[i]) * fraction
  }
  return result
}

const log = (durations) => {
  console.log(`avg: ${average(durations).toFixed(2)}`)
  console.log(`stddev: ${standardDeviation(durations).toFixed(2)}`)
  console.log(`50th: ${quantile(durations, 50).toFixed(2)}`)
  console.log(`75th: ${quantile(durations, 75).toFixed(2)}`)
  console.log(`90th: ${quantile(durations, 90).toFixed(2)}`)
  console.log(`99th: ${quantile(durations, 99).toFixed(2)}`)
}

module.exports = {
  quantile,
  average,
  standardDeviation,
  log
}
