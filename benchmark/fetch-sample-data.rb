asciidoc_repo_root_uri = 'https://raw.githubusercontent.com/asciidoc/asciidoc'
asciidoc_repo_hash = 'd43faae38c4a8bf366dcba545971da99f2b2d625'
asciidoc_repo_base_uri = %(#{asciidoc_repo_root_uri}/#{asciidoc_repo_hash})

files = {
  %(#{asciidoc_repo_base_uri}/doc/asciidoc.txt) => 'sample-data/userguide.adoc',
  %(#{asciidoc_repo_base_uri}/doc/customers.csv) => 'sample-data/customers.csv'
}

require 'open-uri'

Dir.mkdir 'sample-data' unless Dir.exist? 'sample-data'

files.each {|(url, dest)|
  content = open(url) {|fd| fd.read }
  File.open(dest, 'w') {|fd| fd.write content }
}
