component = ./node_modules/.bin/component
component-testem = ./node_modules/.bin/component-testem
minify = ./node_modules/.bin/minify

install: node_modules components

node_modules: package.json
	@npm install

components: component.json
	@$(component) install --dev

clean:
	@rm -rf build

clean-dist:
	@rm -rf components

test: install $(wildcard test/*.js)
	@$(component-testem)

test-server: install
	@$(component-testem) --server

build: install clean $(wildcard lib/*.js)
	@$(component) build --standalone treo --out . --name treo

npm-dump:
	@node test/support/npm-dump.js

size: build
	@ls -l treo.js
	@$(minify) -l js treo.js > treo.min.js
	@ls -l treo.min.js
	@gzip treo.min.js
	@ls -l treo.min.js.gz
	@rm treo.min.js.gz

release: test build
	@echo - "upgrade {package|component|bower}.json (bump 0.0.0|patch|minor|major)"
	@echo - "add release notes to History.md"
	@echo - "git add -A -m '0.0.0'"
	@echo - "git tag 0.0.0"
	@echo - "git push origin master"
	@echo - "npm publish"

stat:
	@cloc lib/ --quiet --by-file
	@cloc test/ --quiet --by-file --exclude-dir=test/vendor,test/support
