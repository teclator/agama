const fs = require("fs");
const path = require("path");

const Copy = require("copy-webpack-plugin");
const Extract = require("mini-css-extract-plugin");
const TerserJSPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const HtmlMinimizerPlugin = require("html-minimizer-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const ESLintPlugin = require('eslint-webpack-plugin');
const CockpitPoPlugin = require("./src/lib/cockpit-po-plugin");
const CockpitRsyncPlugin = require("./src/lib/cockpit-rsync-plugin");
const StylelintPlugin = require('stylelint-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpack = require('webpack');
const po_handler = require("./src/lib/webpack-po-handler");
const manifests_handler = require("./src/lib/webpack-manifests-handler");

/* A standard nodejs and webpack pattern */
const production = process.env.NODE_ENV === 'production';
const development = !production;

/* development options for faster iteration */
const eslint = process.env.ESLINT !== '0';

/* Default to disable csslint for faster production builds */
const stylelint = process.env.STYLELINT ? (process.env.STYLELINT !== '0') : development;

// Cockpit target managed by the development server,
// by default connect to a locally running Cockpit
let cockpitTarget = process.env.COCKPIT_TARGET || "localhost";
// add the default port if not specified
if (cockpitTarget.indexOf(":") === -1) cockpitTarget += ":9090";
cockpitTarget = "https://" + cockpitTarget;

// Obtain package name from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json'));

// Non-JS files which are copied verbatim to dist/
const copy_files = [
  "./src/index.html",
  "./src/manifest.json",
  // TODO: consider using something more complete like https://github.com/jantimon/favicons-webpack-plugin
  "./src/assets/favicon.svg",
];

const plugins = [
  new Copy({ patterns: copy_files }),
  new Extract({ filename: "[name].css" }),
  new CockpitPoPlugin(),
  new CockpitRsyncPlugin({ dest: packageJson.name }),
  development && new ReactRefreshWebpackPlugin({ overlay: false }),
  // replace the "process.env.WEBPACK_SERVE" text in the source code by
  // the current value of the environment variable, that variable is set to
  // "true" when running the development server ("npm run server")
  // https://webpack.js.org/plugins/environment-plugin/
  new webpack.EnvironmentPlugin({ WEBPACK_SERVE: null, LOCAL_CONNECTION: null }),
  // similarly for a non-environment value
  // https://webpack.js.org/plugins/define-plugin/
  // but because ESlint runs *before* the DefinePlugin we need to
  // add it as a global variable in .eslintrc.json config file
  new webpack.DefinePlugin({ COCKPIT_TARGET_URL: JSON.stringify(cockpitTarget) }),
].filter(Boolean);

if (eslint) {
  plugins.push(new ESLintPlugin({ extensions: ["js", "jsx"], failOnWarning: true, }));
}

if (stylelint) {
  plugins.push(new StylelintPlugin({
    context: "src/",
  }));
}

/* Only minimize when in production mode */
if (production) {
  plugins.unshift(new CompressionPlugin({
    test: /\.(js|html|css)$/,
    deleteOriginalAssets: "keep-source-map"
  }));
}

module.exports = {
  mode: production ? 'production' : 'development',
  resolve: {
    modules: ["node_modules", path.resolve(__dirname, 'src/lib')],
    plugins: [new TsconfigPathsPlugin({ extensions: [".js", ".jsx", ".json"] })],
    extensions: ['', '.js', '.json', '.jsx']
  },
  resolveLoader: {
    modules: ["node_modules", path.resolve(__dirname, 'src/lib')],
  },
  watchOptions: {
    ignored: /node_modules/,
  },
  entry: {
    index: ["./src/index.js"],
  },
  // cockpit.js gets included via <script>, everything else should be bundled
  externals: { cockpit: "cockpit" },
  devServer: {
    hot: true,
    // additionally watch these files for changes
    watchFiles: ["./src/manifest.json", "./po/*.po"],
    proxy: {
      // forward all cockpit connections to a real Cockpit instance
      "/cockpit": {
        target: cockpitTarget,
        // redirect also the websocket connections
        ws: true,
        // ignore SSL problems (self-signed certificate)
        secure: false,
      },
      // forward the manifests.js request and patch the response with the
      // current Agama manifest from the ./src/manifest.json file
      "/manifests.js": {
        target: cockpitTarget + "/cockpit/@localhost/",
        // ignore SSL problems (self-signed certificate)
        secure: false,
        // the response is modified by the onProxyRes handler
        selfHandleResponse : true,
        onProxyRes: manifests_handler,
      },
    },
    // use https so Cockpit uses wss:// when connecting to the backend
    server: "https",
    // hot replacement does not support wss:// transport when running over https://,
    // as a workaround use sockjs (which uses standard https:// protocol)
    webSocketServer: "sockjs",

    // Cockpit handles the "po.js" requests specially
    setupMiddlewares: (middlewares, devServer) => {
      devServer.app.get("/po.js", po_handler);
      return middlewares;
    }
  },
  devtool: "source-map",
  stats: "errors-warnings",
  // always regenerate dist/, so make rules work
  output: { clean: true, compareBeforeEmit: false },

  optimization: {
    minimize: production,
    minimizer: [
      new TerserJSPlugin({
        // src/components/core/Page.jsx is using a type?.name.endsWith("PageMenu") for extracting page menus.
        // Thus, it's needed not mangling function names ending in PageMenu to keep it working in production
        // until adopting a better solution, if any.
        terserOptions: {
          keep_fnames: /PageMenu$/,
        },
        extractComments: {
          condition: true,
          filename: `[file].LICENSE.txt?query=[query]&filebase=[base]`,
          banner(licenseFile) {
            return `License information can be found in ${licenseFile}`;
          },
        },
      }),
      // remove also the spaces between the tags
      new HtmlMinimizerPlugin({ minimizerOptions: { conservativeCollapse: false } }),
      new CssMinimizerPlugin()
    ],
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              plugins: [development && require.resolve('react-refresh/babel')].filter(Boolean),
            },
          }
        ]
      },
      {
        test: /\.s?css$/,
        use: [
          Extract.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              url: {
                // Only follow the Agama fonts links to be processed by the next rule and place
                // them in dist/fonts
                filter: (url) => url.includes("./fonts/")
              }
            }
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: development,
              sassOptions: {
                includePaths: ["node_modules"],
                outputStyle: production ? 'compressed' : undefined,
              },
            },
          },
        ]
      },
      {
        test: /\.(eot|ttf|woff|woff2)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]',
        }
      },
      // Load SVG files
      {
        test: /\.svg$/i,
        type: 'asset',
        resourceQuery: { not: [/component/] } // exclude file import includes ""?component"
      },
      {
        test: /\.svg$/i,
        issuer: /\.jsx?$/,
        resourceQuery: /component/, // *.svg?component
        use: ['@svgr/webpack']
      }
    ]
  },
  plugins: plugins
};
