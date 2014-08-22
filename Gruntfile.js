module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Define clean task
    clean: {
      options: {
        dot: true
      },
      dist: ['build', 'dist/*']
    },

    /**
    * Build Asciidoctor.js with bundle and rake
    */
    shell: {  // Task
      bundleInstall: {                        // Target
        options: {                        // Options
          stderr: false
        },
        command: 'bundle install'
      },
      rakeDist: {                        // Target
        options: {                        // Options
          stderr: false
        },
        command: 'bundle exec rake dist'
      },
      rakeExamples: {                        // Target
        options: {                        // Options
          stderr: false
        },
        command: 'bundle exec rake examples'
      }
    },

    /**
    * Generate file with npm format
    */
    concat: {
      npmCore: {
        src: [
          'src/npm/prepend-core.js',
          'build/asciidoctor-core.js',
          'src/npm/append-core.js'
        ],
        dest: 'build/npm/asciidoctor-core.js'
      },
      npmCoreMin: {
        src: [
          'src/npm/prepend-core.js',
          'build/asciidoctor-core.js',
          'src/npm/append-core-min.js'
        ],
        dest: 'build/npm/asciidoctor-core-min.js'
      },
      npmExtensions: {
        src: [
          'src/npm/prepend-extensions.js',
          'build/asciidoctor-extensions.js',
          'src/npm/append-extensions.js'
        ],
        dest: 'build/npm/asciidoctor-extensions.js'
      },
      npmDocbook: {
        src: [
          'src/npm/prepend-extensions.js',
          'build/asciidoctor-docbook45.js',
          'build/asciidoctor-docbook5.js',
          'src/npm/append-extensions.js'
        ],
        dest: 'build/npm/asciidoctor-docbook.js'
      },
      docbook: {
        src: [
          'build/asciidoctor-docbook45.js',
          'build/asciidoctor-docbook5.js'
        ],
        dest: 'build/asciidoctor-docbook.js'
      },
      coreExtensions: {
        src: [
          'build/asciidoctor-core.js',
          'build/asciidoctor-extensions.js'
        ],
        dest: 'build/asciidoctor.js'
      },
      all: {
        src: [
          'bower_components/opal/opal/current/opal.js',
          'build/asciidoctor-core.js',
          'build/asciidoctor-extensions.js'
        ],
        dest: 'build/asciidoctor-all.js'
      }
    },

    /**
    * Minify all js
    */
    uglify: {
      dist: {
        files: {
          'dist/npm/asciidoctor-core.min.js': ['build/npm/asciidoctor-core-min.js'],
          'dist/npm/asciidoctor-extensions.min.js': ['build/npm/asciidoctor-extensions.js'],
          'dist/npm/asciidoctor-docbook.min.js': ['build/npm/asciidoctor-docbook.js'],
          'dist/asciidoctor-core.min.js': ['build/asciidoctor-core.js'],
          'dist/asciidoctor-extensions.min.js': ['build/asciidoctor-extensions.js'],
          'dist/asciidoctor-docbook.min.js': ['build/asciidoctor-docbook.js'],
          'dist/asciidoctor-all.min.js': ['build/asciidoctor-all.js']
        }
      }
    },

    /**
    * Copy unminified files
    */
    copy: {
      dist: {
        files: [{
          expand: true,
          cwd: 'build/',
          src: ['**/*.js', '!**/*-min.js', '!**/*.min.js', '!**/*-docbook45.js', '!**/*-docbook5.js'],
          dest: 'dist/',
          filter: 'isFile'
        },
        {
          expand: true,
          cwd: 'build/',
          src: ['asciidoctor.css'],
          dest: 'dist/css/'
        }]
      }
    },

    /**
    * Gunzip
    */
    compress: {
      main: {
        options: {
          mode: 'gzip'
        },
        files: [
          // Each of the files in the src/ folder will be output to
          // the dist/ folder each with the extension .gz.js
          {expand: true, src: ['dist/**/*.js'], dest: '', ext: '.gz.js'}
        ]
      }
    },

    jasmine: {
      options: {
        specs: 'spec/bower/bower.spec.js',
        vendor: ['spec/share/common-specs.js']
      },
      allStandard: {
        src: ['dist/asciidoctor-all.js', 'dist/asciidoctor-docbook.js']
      },
      allMinified: {
        src: ['dist/asciidoctor-all.min.js', 'dist/asciidoctor-docbook.min.js']
      },
    },

    jasmine_node: {
      options: {
        forceExit: true,
        match: '.',
        matchall: false,
        extensions: 'js',
        specNameMatcher: 'spec',
        jUnit: {
          report: false,
          savePath : "./build/reports/jasmine/",
          useDotNotation: true,
          consolidate: true
        }
      },
      all: ['spec/npm']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-jasmine-node');

  grunt.registerTask('default', ['dist']);
  grunt.registerTask('dist', ['clean', 'rake', 'npm', 'bower', 'uglify', 'copy', 'compress', 'test']);
  grunt.registerTask('rake', ['shell:bundleInstall', 'shell:rakeDist']);
  grunt.registerTask('example-result', 'Log the path to view the example result task', function() {
    grunt.log.subhead('You can now open the file build/asciidoctor_example.html');
  });
  grunt.registerTask('examples', ['shell:rakeExamples', 'example-result']);
  grunt.registerTask('npm', ['concat:npmCore', 'concat:npmCoreMin', 'concat:npmExtensions', 'concat:npmDocbook']);
  grunt.registerTask('bower', ['concat:coreExtensions', 'concat:docbook', 'concat:all']);
  grunt.registerTask('test', ['jasmine:allStandard', 'jasmine:allMinified', 'jasmine_node:all']);
}
