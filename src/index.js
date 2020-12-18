'use strict';

const { Parser } = require('./parser');
const { Assembler } = require('./assembler');

function translate(source, specifier, getSource) {
  const ast = Parser.parse(source, specifier);
  const {
    warnings,
    output,
  } = Assembler.assemble(ast, source, specifier, getSource);
  return {
    output,
    messages: warnings.map((w) => ({
      level: 'warn',
      ...w,
    })),
  };
}

module.exports = {
  translate,
};

/* istanbul ignore next */
if (require.main === module) {
  /* eslint-disable global-require */
  const fs = require('fs');
  const path = require('path');

  const getSource = (referrer, specifier) => {
    const resolved = path.join(referrer === '(repl)' ? '.' : path.basename(referrer), specifier);
    const source = fs.readFileSync(resolved, 'utf8');
    return {
      source,
      specifier: resolved,
    };
  };

  if (process.argv[2]) {
    const { output, messages } = translate(getSource('.', process.argv[2]).source, process.argv[2], getSource);
    messages.forEach((m) => {
      process.stderr.write(`${m.level}: ${m.message}\n${m.detail}\n`);
    });
    process.stdout.write(output);
  } else {
    const repl = require('repl');
    const util = require('util');

    repl.start({
      prompt: '> ',
      eval(source, c, f, cb) {
        try {
          const { output, messages } = translate(source, '(repl)', getSource);
          cb(null, `${messages.map((m) => `${m.level}: ${m.message}\n${m.detail}`).join('\n')}\n${output}`.trimStart());
        } catch (e) {
          cb(e, null);
        }
      },
      writer: (v) => (typeof v === 'string' ? v : util.inspect(v)),
    });
  }
}
