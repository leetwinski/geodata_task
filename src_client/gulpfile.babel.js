import gulp from 'gulp';

var browserify = require('browserify');
var babel = require('babelify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var sourcemaps = require('gulp-sourcemaps');

function compile(watch) {
    let bundler = watchify(browserify('./scripts/app.jsx', {debug: true}).transform(babel));

    function rebundle() {
        bundler.bundle()
            .on('error', function(err) { console.error(err); this.emit('end');})
            .pipe(source('app.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({ loadMaps: true }))
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('../resources/public/scripts'));
    }

    if (watch) {
        bundler.on('update', () => {
            console.log('-> bundling...'); 
            rebundle();
        });
    }

    rebundle();
}

function watch() {
    return compile(true);
}

gulp.task('build', () => compile());
gulp.task('watch', () => watch());

gulp.task('default', ['watch']);
