# Changelog

## 0.1.0 (2025-09-09)


### Features

* Add capabilities entry to server metadata ([f23ee0b](https://github.com/googleapis/gcloud-mcp/commit/f23ee0bf06a153cba86da1ec307136f79b12aaf2))
* Add default denylisting ([#28](https://github.com/googleapis/gcloud-mcp/issues/28)) ([877d59d](https://github.com/googleapis/gcloud-mcp/commit/877d59d7a852adeca997aab1600fd91508ffe700))
* Add extension's GEMINI.md, populate run_gcloud_command description, and verify gcloud install ([#7](https://github.com/googleapis/gcloud-mcp/issues/7)) ([0fbd383](https://github.com/googleapis/gcloud-mcp/commit/0fbd38333fd912fc3fe662c5574d3caa5f7efcc5))
* Check gcloud available on init ([#74](https://github.com/googleapis/gcloud-mcp/issues/74)) ([e69c18f](https://github.com/googleapis/gcloud-mcp/commit/e69c18f5fe09fe92ff346786e1ad340617b79bca))
* Convert to monorepo with turbo ([#5](https://github.com/googleapis/gcloud-mcp/issues/5)) ([8d5f600](https://github.com/googleapis/gcloud-mcp/commit/8d5f60047ccadd2ab2a11a97e8e3af186747c297))
* Create custom logger ([480cd09](https://github.com/googleapis/gcloud-mcp/commit/480cd0991a99d7ff4325e4e750b8b7e95d04b82c))
* Fix DenyListing ([#41](https://github.com/googleapis/gcloud-mcp/issues/41)) ([58eb3fe](https://github.com/googleapis/gcloud-mcp/commit/58eb3fe780f873c1cff8c5ed4afb6684f5e2b4dc))
* Init via command and agent flag ([#33](https://github.com/googleapis/gcloud-mcp/issues/33)) ([9dde0e7](https://github.com/googleapis/gcloud-mcp/commit/9dde0e7e4a8dcd6b1a7f4092f4b6f049b3eabdf4))
* Introduce allowlist and denylist capability to run_gcloud_command ([#18](https://github.com/googleapis/gcloud-mcp/issues/18)) ([ca33306](https://github.com/googleapis/gcloud-mcp/commit/ca33306dedc2dbc6381df0365c1c9876888fef9c))
* Introduce mcp configuration file and use for allow deny lists ([#22](https://github.com/googleapis/gcloud-mcp/issues/22)) ([d252bb6](https://github.com/googleapis/gcloud-mcp/commit/d252bb6a7c2ace3f1ec019e893f5c17247b7a262))
* Npm install from registry ([#29](https://github.com/googleapis/gcloud-mcp/issues/29)) ([5b9f6bf](https://github.com/googleapis/gcloud-mcp/commit/5b9f6bfa1f2b90f709dd7915d551221380d3badc))
* Set stdin to ignore for interactive commands. add test coverage. ([#12](https://github.com/googleapis/gcloud-mcp/issues/12)) ([b6812b6](https://github.com/googleapis/gcloud-mcp/commit/b6812b658491efccafcdbefc7b81b9b7f976ba62))
* Test coverage ([#19](https://github.com/googleapis/gcloud-mcp/issues/19)) ([cbee683](https://github.com/googleapis/gcloud-mcp/commit/cbee683345a5256c29d1047cb65a33f7429f5ac1))
* Use npx for install ([61d2b1c](https://github.com/googleapis/gcloud-mcp/commit/61d2b1ca39b2f8a49e724e1346bf75d3a9996a70))


### Bug Fixes

* Correct gemini's mcp command, and update README with proper installation instructions ([#39](https://github.com/googleapis/gcloud-mcp/issues/39)) ([676c217](https://github.com/googleapis/gcloud-mcp/commit/676c217f5deeb9884ba4b5568a6ee7177e695cc8))
* Coverage for monorepo setup, and fix uninvoked tests. ([#87](https://github.com/googleapis/gcloud-mcp/issues/87)) ([0dc48a1](https://github.com/googleapis/gcloud-mcp/commit/0dc48a13c809cb83e779d2f9563850032ede6bb2))
* Disallow gcloud interactive, as it will fail ([#88](https://github.com/googleapis/gcloud-mcp/issues/88)) ([b6953b4](https://github.com/googleapis/gcloud-mcp/commit/b6953b408cc9005a7d9c85da5c3acf18592184d0))
* Exit process if gcloud is not found ([#30](https://github.com/googleapis/gcloud-mcp/issues/30)) ([3cca0e9](https://github.com/googleapis/gcloud-mcp/commit/3cca0e9d87e54553cb63e7baeb6817bb2e8cc9c8))
* Glcoud-mcp main(), error handling, and IT improvements ([#82](https://github.com/googleapis/gcloud-mcp/issues/82)) ([b531a75](https://github.com/googleapis/gcloud-mcp/commit/b531a7521fdc64e725408cb0fe5a9bf2408a70e0))
* Improve error messages for better agent recovery ([#31](https://github.com/googleapis/gcloud-mcp/issues/31)) ([0b080c6](https://github.com/googleapis/gcloud-mcp/commit/0b080c66c96deda7fec6f368b5510880478a6040))
* Installation process ([ba67e9b](https://github.com/googleapis/gcloud-mcp/commit/ba67e9b02596a860c3226e11f9c2811b65d6e107))
* Remove allowlisting/denylisting as a user configurable input ([#68](https://github.com/googleapis/gcloud-mcp/issues/68)) ([4e49f8d](https://github.com/googleapis/gcloud-mcp/commit/4e49f8db0f244600975240f71fbc5ac48dda56db))
* Remove noisy stdout output ([#133](https://github.com/googleapis/gcloud-mcp/issues/133)) ([d98a656](https://github.com/googleapis/gcloud-mcp/commit/d98a656a59bbcd1a6b2933689ed256eccdb6076b)), closes [#111](https://github.com/googleapis/gcloud-mcp/issues/111)
* Rm logger singleton logic ([3b346ae](https://github.com/googleapis/gcloud-mcp/commit/3b346aee8a941af92dc8b35c872b448ca2bd170f))
* Update gemini cli extension name ([#164](https://github.com/googleapis/gcloud-mcp/issues/164)) ([df91358](https://github.com/googleapis/gcloud-mcp/commit/df913582719aeec46fd982b30224ebf23836ce3a))
* Update readme and syntax to support running gcloud-mcp with new structure ([#6](https://github.com/googleapis/gcloud-mcp/issues/6)) ([ba21291](https://github.com/googleapis/gcloud-mcp/commit/ba212910c1fcd81332384eed403cb015af0474d1))
