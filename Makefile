component = ./node_modules/.bin/component
component-testem = ./node_modules/.bin/component-testem

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

build: clean $(wildcard lib/*.js)
	@$(component) build --standalone treo --out . --name treo

release: test build
	@echo - "upgrade {package|component|bower}.json (bump 0.0.0|patch|minor|major)"
	@echo - "add release notes to History.md"
	@echo - "git add -A -m '0.0.0'"
	@echo - "git tag 0.0.0"
	@echo - "git push origin master"
	@echo - "npm publish"

stat:
	@cloc lib/ --quiet --by-file
	@cloc test/ --quiet --by-file

stat-components: components
	@cloc components/ --by-file --exclude-dir=components/chaijs
