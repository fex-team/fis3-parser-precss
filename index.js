var postcss = require('postcss');
var precss = require('precss');
var postcssScss = require('postcss-scss');
var calc = require('postcss-calc');

function addDepends(file, messages) {
  if (!file.cache) {
    return;
  }

  var deps = [file.realpath];

  messages.forEach(function(message) {
    if (message.type === 'dependency' && ~deps.indexOf(message.parent)) {
      deps.push(message.file);
      file.cache.addDeps(message.file);
    }
  });
}

module.exports = function(content, file, conf, callback) {
  if (!callback) {
    throw new Error('Async plugin is not supported in `fis3`, please use `fis3-async`。');
  }

  var processConf = fis.util.assign({
    parser: postcssScss,
    from: file.subpath.substring(1),
    to: file.release
  }, conf.sourceMap ? {
    map: {
      inline: false
    }
  } : null);

  postcss([
    precss(conf),
    calc()
  ])
    .process(content, processConf)
    .then(function (ret) {
      content = ret.css;

      addDepends(file, ret.messages);
      
      if (ret.map) {
        var mapping = fis.file.wrap(file.dirname + '/' + file.filename + file.rExt + '.map');
    
        // 修改 source 文件名。
        // var sourceMapObj = JSON.parse(ret.map.toString('utf8'));
        // sourceMapObj.sources[0] = file.subpath;
        // mapping.setContent(JSON.stringify(sourceMapObj, null, 4));
        mapping.setContent(ret.map);
        
        var url = mapping.getUrl(fis.compile.settings.hash, fis.compile.settings.domain);
    
        content = ret.css.replace(/\n?\s*\/\*#\ssourceMappingURL=.*?(?:\n|$)/g, '');
        content += '\n/*# sourceMappingURL=' +  url + '*/\n';
    
        file.extras = file.extras || {};
        file.extras.derived = file.extras.derived || [];
        file.extras.derived.push(mapping);
      }
      callback(null, content);
    })
}

module.exports.defaultOptions = {
  sourceMap: false,
  'import': {
    extension: '.pcss'
  }
};
