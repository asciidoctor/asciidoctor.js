This PR addresses the longstanding Webpack build warnings ("Critical dependency: the request of a dependency is an expression") that occur when integrating Asciidoctor.js into modern web application build pipelines (Webpack, Vite, etc.).

### **Context:**
Asciidoctor.js uses dynamic `node_require` and generic `__require__` calls in its `TemplateConverter` to load external template engines (e.g., Pug, Handlebars, Nunjucks) and custom template files. While this is intentional behavior in its architecture, Webpack generates warnings for these dynamic requirements because it cannot statically analyze them at compile time.

### **Changes:**
Added `/* webpackIgnore: true */` comments to `require` calls inside `packages/core/lib/asciidoctor/js/asciidoctor_ext/node/template.rb`.
This tells Webpack (and compatible bundlers like Vite) that these dynamic requirements are intended and should not be flagged as warnings.

**Impact:**
-   Cleaner build logs for extensions and web apps using Asciidoctor.js.
-   No impact on runtime functionality for Node.js or browser environments.
