const { src, dest, series, parallel, watch } = require('gulp')
const browserSync = require('browser-sync')
const del = require('del')
const loadPlugins = require('gulp-load-plugins')
const sass = require('gulp-sass')(require('node-sass'))

/* exports.default = (done) => {
  src("src/*.html").pipe(dest("dist"));
  done(); // 表示任务完成
}; */

const cwd = process.cwd()

let config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (e) {
  console.log(e)
}

const plugins = loadPlugins()

const bs = browserSync.create()

const clean = () => {
  return del(['dist', 'temp'])
}

const style = () => {
  return src(config.build.paths.styles, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const script = () => {
  return src(config.build.paths.scripts, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  return src(config.build.paths.pages, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.swig({ defaults: { cache: false }, data: config.data }))
    .pipe(dest(config.build.temp))
}

const image = () => {
  return src(config.build.paths.images, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, {
    base: config.build.src,
    cwd: config.build.src
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', {
    base: config.build.public,
    cwd: config.build.public
  }).pipe(dest(config.build.dist))
}

const server = () => {
  watch(config.build.paths.styles, style)
  watch(config.build.paths.pages, page)
  watch(config.build.paths.scripts, script)
  /* watch("src/assets/images/**", image);
  watch("src/assets/fonts/**", font);
  watch("publish/**", extra); */

  watch(
    [config.build.paths.images, config.build.paths.fonts],
    { cwd: config.build.src },
    bs.reload
  )
  watch('**', { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false, // 取消启动通知
    // files: "temp/**",
    // port:3000,
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public], // 从第一个依次去找对应的文件
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src(config.build.paths.pages, {
    base: config.build.temp,
    cwd: config.build.temp
  })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(
      plugins.if(
        /\.html$/,
        plugins.htmlmin({
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true
        })
      )
    )
    .pipe(dest(config.build.dist))
}

const compile = parallel(style, script, page)

const build = series(
  clean,
  parallel(series(compile, useref), extra, image, font)
)

const develop = series(compile, server)
module.exports = {
  clean,
  build,
  develop
}
