const fs = require("node:fs");
const path = require("node:path");
const { EveryPluginDevServer } = require("every-plugin/build/rspack");
const { withZephyr } = require("zephyr-rspack-plugin");
const pkg = require("./package.json");

function updateHostConfig(name, url) {
  try {
    const configPath = path.resolve(__dirname, "../host/registry.json");
    const json = JSON.parse(fs.readFileSync(configPath, "utf8"));
    json.plugins[name].remote = url;
    fs.writeFileSync(configPath, JSON.stringify(json, null, 2) + "\n");
    console.log("   ✅ Updated host/registry.json");
  } catch (err) {
    console.error("   ❌ Failed to update host/registry.json:", err.message);
  }
}

module.exports = withZephyr({
  hooks: {
    onDeployComplete: (info) => {
      console.log("🚀 Deployment Complete!");
      console.log(`   URL: ${info.url}`);
      console.log(`   Module: ${info.snapshot.uid.app_name}`);
      console.log(`   Build ID: ${info.snapshot.uid.build}`);
      console.log(`   Dependencies: ${info.federatedDependencies.length}`);
      console.log(
        `   Git: ${info.snapshot.git.branch}@${info.snapshot.git.commit}`
      );
      console.log(`   CI: ${info.buildStats.context.isCI ? "Yes" : "No"}`);
      updateHostConfig(pkg.name, info.url);
    },
  },
})({
  externals: [
    /^@libsql\/.*/, // Exclude @libsql platform-specific packages from bundling
  ],
  plugins: [new EveryPluginDevServer()],
});
