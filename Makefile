browserify = ./node_modules/.bin/browserify
uglifyjs = ./node_modules/.bin/uglifyjs
testem = ./node_modules/.bin/testem

node_modules: package.json
	@npm install
	@touch node_modules

build: node_modules
	@$(browserify) lib/index.js -s treo -o dist/treo.js
	@$(browserify) plugins/treo-promise/index.js -s treo-promise -o dist/treo-promise.js
	@$(browserify) plugins/treo-websql/index.js -s treo-websql -o dist/treo-websql.js

dist/test-bundle.js: node_modules $(wildcard lib/*.js) $(wildcard test/*.js) $(wildcard plugins/**/*.js)
	@$(browserify) test/treo.js test/integration.js -o dist/test-bundle.js

test: node_modules
	@$(testem) -f test/testem.json ci

test-server: node_modules
	@$(testem) -f test/testem.json

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

.PHONY: build build-test test
