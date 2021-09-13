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
      const commonExchanges = types.reduce((r, t) => {
        if (!!matrix[t][base] && !!matrix[t][base][quote]) {
          return r + 1;
        }
        return r;
      }, 0);
      if (commonExchanges > 1) {
        if (!common[base]) {
          common[base] = {};
        }
        commonsFound += 1;

        c[base][quote] = types.reduce((r, t) => {
          if (matrix[t] && !!matrix[t][base] && !!matrix[t][base][quote]) {
            return {
              ...r,
              [t]: matrix[t][base][quote],
            };
          }

          return r;
        }, {});
      }
      return c;
    }, common);
  }, {});
  console.log(`common pairs found: ${commonsFound}`);
  fs.writeFileSync('./matrix/common.json', JSON.stringify(commons, null, 2));
};

sync('pancake');
