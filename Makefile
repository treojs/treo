browserify = ./node_modules/.bin/browserify
uglifyjs = ./node_modules/.bin/uglifyjs
testem = ./node_modules/.bin/testem

node_modules: package.json
	@npm install
	@touch node_modules

treo.js: node_modules $(wildcard lib/*.js)
	@$(browserify) lib/index.js --standalone treo -o treo.js

test/support/bundle.js: node_modules $(wildcard lib/*.js) $(wildcard test/*.js)
	@$(browserify) test/treo.js test/integration.js -o test/support/bundle.js

test: node_modules
	@$(testem) -f test/testem.json ci

test-server: node_modules
	@$(testem) -f test/testem.json

install: node_modules
build: treo.js
build-test: test/support/bundle.js

size: treo.js
	@ls -l treo.js
	@$(uglifyjs) treo.js > treo.min.js
	@ls -l treo.min.js
	@gzip treo.min.js
	@ls -l treo.min.js.gz
	@rm treo.min.js.gz

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

.PHONY: install build build-test test
