/* global Opal */
// NOTE: Below we are using a minimalist implementation to generate lorem ipsum text.
// If you need a complete implementation, you can use the following Node package:
// var lorem = require('lorem-ipsum');
module.exports = () => {
  const Extensions = Opal.Asciidoctor.Extensions
  Extensions.register(function () {
    this.blockMacro(function () {
      const self = this
      self.named('jira')
      self.process(function (parent, target, attrs) {
        const issues = jira()

        const content = []
        content.push('[options="header",cols="2,1,1,2,6"]')
        content.push('|====')
        content.push('|ID | Priority | Created | Assignee | Summary')

        for (let i = 0; i < issues.length; i++) {
          const issue = issues[i]
          content.push('|' + issue.key)
          content.push('|' + issue.fields.priority.name)
          content.push('|' + issue.fields.created)
          content.push('|' + (issue.fields.assignee && issue.fields.assignee.displayName) || 'not assigned')
          content.push('|' + issue.fields.summary)
        }
        content.push('|====')

        return self.parseContent(parent, content.join('\n'), attrs)
      })
    })
  })
}

function jira () {
  const issues = []

  issues.push({ key: 'DOC-1234', fields: { summary: 'Summary', created: 'Now', priority: { name: 'High' }, assignee: { displayName: 'CK' } } })

  return issues
}
