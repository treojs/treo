browserify = ./node_modules/.bin/browserify
browserify-mocha = ./node_modules/.bin/browserify-mocha

node_modules: package.json
	@npm install
	@touch node_modules

build: node_modules
	@$(browserify) lib/index.js -s treo -o dist/treo.js
	@$(browserify) plugins/treo-promise/index.js -s treo-promise -o dist/treo-promise.js
	@$(browserify) plugins/treo-websql/index.js -s treo-websql -o dist/treo-websql.js

test: node_modules
	@$(browserify-mocha) ./test/treo.js ./test/integration.js

test-server: node_modules
	@$(browserify-mocha) --watch ./test/treo.js ./test/integration.js

release: test build
	@echo - "upgrade {package|component|bower}.json (bump 0.0.0|patch|minor|major)"
	@echo - "add release notes to History.md"
	@echo - "git add -A -m '0.0.0 release'"
	@echo - "git tag 0.0.0"
	@echo - "git push origin master"
	@echo - "npm publish"

stat:
	@cloc lib/ --quiet --by-file
	@cloc test/ --quiet --by-file --exclude-dir=fixtures

.PHONY: build test
