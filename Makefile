browserify = ./node_modules/.bin/browserify
uglifyjs = ./node_modules/.bin/uglifyjs

node_modules: package.json
	@npm install
	@touch node_modules

treo.js: node_modules $(wildcard lib/*.js)
	@$(browserify) lib/index.js --standalone treo --outfile treo.js

size: treo.js
	@ls -l treo.js
	@$(uglifyjs) treo.js > treo.min.js
	@ls -l treo.min.js
	@gzip treo.min.js
	@ls -l treo.min.js.gz
	@rm treo.min.js.gz

install: node_modules
build: treo.js

test/support/npm-dump.json:
	@node test/support/npm-dump.js

release: test build
	@echo - "upgrade {package|component|bower}.json (bump 0.0.0|patch|minor|major)"
	@echo - "add release notes to History.md"
	@echo - "git add -A -m '0.0.0 release'"
	@echo - "git tag 0.0.0"
	@echo - "git push origin master"
	@echo - "npm publish"

stat:
	@cloc lib/ --quiet --by-file
	@cloc test/ --quiet --by-file --exclude-dir=test/vendor,test/support

.PHONY: install build
