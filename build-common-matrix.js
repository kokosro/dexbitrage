const fs = require('fs');
const matrix = require('./matrix');
const tokens = require('./tokens');

const sync = (startType) => {
  let commonsFound = 0;
  const types = Object.keys(matrix).filter((x) => x !== startType && x !== 'common');

  const startBases = Object.keys(matrix[startType]);
  const commons = startBases.reduce((common, base) => {
    if (!tokens[base]) {
      return common;
    }
    return Object.keys(matrix[startType][base]).reduce((c, quote) => {
      if (!tokens[quote]) {
        return c;
      }
      if (types.reduce((r, t) => r && !!matrix[t][base] && !!matrix[t][base][quote], true)) {
        if (!common[base]) {
          common[base] = {};
        }
        commonsFound += 1;
        c[base][quote] = types.reduce((r, t) => ({
          ...r,
          [t]: matrix[t][base][quote],
        }), {});
      }
      return c;
    }, common);
  }, {});
  console.log(`common pairs found: ${commonsFound}`);
  fs.writeFileSync('./matrix/common.json', JSON.stringify(commons, null, 2));
};

sync('mdex');
