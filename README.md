# Shiki Code Highlighting for HaxePress

A HaxePress plugin that highlights the fenced code blocks of public pages with [Shiki](https://shiki.style), using a light and a dark theme chosen in the plugin's settings. It also colors the reader preview of the content editor, which renders the same public page.

The plugin targets HaxePress 2.16.0 and plugin API 4. It consists of a frontend module, a stylesheet and translations, with no server module, so the same ZIP installs on JVM and PHP sites. It needs [HaxePress 0.0.3](https://github.com/HaxePress/HaxePress/releases/tag/0.0.3) or later, which accepts plugins without a server module and activates plugin frontend modules on public pages.

## Install

1. Sign in to a HaxePress site with package management access.
2. Open **Plugins** and select **Install from GitHub** (JVM sites), or download the ZIP from the release and choose **Upload plugin**.
3. Paste the repository URL `https://github.com/HaxePress/plugin-shiki` and choose **Load releases**.
4. Select `shiki-0.1.0.zip` under `v0.1.0`, inspect it and choose **Install package**.
5. Activate **Shiki Code Highlighting**. Its **Settings** choose the themes.

## Settings

| Setting     | Values                                                                   | Default           |
| ----------- | ------------------------------------------------------------------------ | ----------------- |
| Light theme | 19 light Shiki themes, such as GitHub Light, One Light and Vitesse Light | GitHub Light      |
| Dark theme  | 20 dark Shiki themes, such as GitHub Dark, Dracula and Tokyo Night       | GitHub Dark       |
| Color mode  | Follow the visitor's device, always light, always dark                   | Follow the device |

**Follow the visitor's device** uses the dark theme when the browser reports `prefers-color-scheme: dark`. The other modes use one theme everywhere and load only that theme.

## How it works

HaxePress's Markdown renderer writes a fenced block as `<pre><code class="language-…">`, with the HTML-escaped text. The plugin's frontend module, `shiki.js` (about 1 KB), finds these blocks on the page and does nothing more on pages without code. When a block comes within 600 pixels of the viewport, it loads:

- Shiki's tokenizer with the [JavaScript regular expression engine](https://shiki.style/guide/regex-engines#javascript-regexp-engine) (about 43 KB compressed), once per page,
- the light and dark theme the settings name,
- the grammar of each language the page uses, once.

The module colors the existing `<code>` element token by token, with Shiki's `--shiki-light` and `--shiki-dark` CSS variables, and the stylesheet applies one set or the other. It builds the tokens with DOM methods, so the code text is never parsed as HTML. The page's text stays the same, so search and copying are unchanged. Blocks over 200,000 characters stay plain. A block without a language, or with a language the plugin does not include, is shown in the theme's colors as plain text.

HaxePress's Content Security Policy allows scripts from the site itself and no WebAssembly. Shiki's default Oniguruma engine needs WebAssembly, so the plugin uses the JavaScript engine, which needs neither `eval` nor `'wasm-unsafe-eval'`. The colors are set through the CSS object model.

## Languages

Astro, Batch, C, C#, C++, CMake, CSS, Dart, Diff, Dockerfile, dotenv, Elixir, Erlang, F#, Fish, Go, GraphQL, Groovy, Haskell, Haxe, HCL, HTML, HXML, INI, Java, JavaScript, JSON, JSON5, JSONC, JSX, Kotlin, Less, Lua, Makefile, Markdown, Nginx, Nix, Objective-C, OCaml, Perl, PHP, PowerShell, Prisma, Protocol Buffers, Python, R, regular expressions, Ruby, Rust, Sass, Scala, SCSS, shell scripts, shell sessions, SQL, Svelte, Swift, Terraform, TOML, TSX, TypeScript, Vue, XML, YAML and Zig.

Fences may use the usual short names, such as `js`, `ts`, `py`, `sh`, `bash`, `yml`, `rs`, `hx`, `c++` and `dockerfile`. `src/languages.ts` lists them all. To add a language, add its Shiki id to `grammars` and its other names to `aliases`; each grammar becomes its own file in the package.

## Build and release

Requires Node.js 22.12 or later.

```sh
npm ci
npm run check
```

`npm run check` type-checks the sources, checks their formatting and runs `npm run build`. The build bundles the module with esbuild into `build/package/public`, copies the manifest, stylesheet and catalogues, writes `THIRD-PARTY-NOTICES.txt` with the licenses of the bundled packages, and creates `dist/shiki-<version>.zip`. It stops if the theme options in `cms-package.json` and `src/themes.ts` differ, or if the package exceeds HaxePress's limits (64 MB compressed, 128 MB expanded, 16 MB per file, 256 entries). The 0.1.0 package has 131 files and is about 630 KB.

To publish a release, raise `version` in `cms-package.json` and `package.json`, build, and attach the ZIP to a published GitHub release:

```sh
npm run build
gh release create v0.1.0 dist/shiki-0.1.0.zip --title v0.1.0 --generate-notes
```

`cmsVersion` names the exact HaxePress release the package installs on. Keep `pluginId` unchanged across releases so sites update the installed plugin.
