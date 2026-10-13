const { withAndroidManifest, withStringsXml } = require('@expo/config-plugins');

function withAssetStatements(config, { domains = [] }) {
  // 1. Add the string resource to strings.xml
  config = withStringsXml(config, (config) => {
    const strings = config.modResults;
    if (!strings.resources.string) {
      strings.resources.string = [];
    }
    const existingIndex = strings.resources.string.findIndex(
      (elem) => elem.$.name === 'asset_statements'
    );

    const statements = domains.map((domain) => ({
      include: `https://${domain}/.well-known/assetlinks.json`,
    }));
    const statementValue = JSON.stringify(statements);

    if (existingIndex > -1) {
      strings.resources.string[existingIndex]._ = statementValue;
    } else {
      strings.resources.string.push({
        $: { name: 'asset_statements', translatable: 'false' },
        _: statementValue,
      });
    }
    return config;
  });

  // 2. Add meta-data to AndroidManifest.xml referencing the string
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const metadataExists = application['meta-data'].some(
      (item) => item.$ && item.$['android:name'] === 'asset_statements'
    );

    if (!metadataExists) {
      application['meta-data'].push({
        $: {
          'android:name': 'asset_statements',
          'android:resource': '@string/asset_statements',
        },
      });
    }

    return config;
  });

  return config;
}

module.exports = withAssetStatements;
