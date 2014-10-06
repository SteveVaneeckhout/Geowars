module.exports = function (grunt) {
	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		clean: {
			release: ["release"]
		},
		less: {
			release: {
				options: {
					paths: ["css"],
					sourceMap: false,
					sourceMapBasepath: "css/",
					sourceMapFilename: "compiled/css/app.min.css.map",
					sourceMapURL: "/css/app.min.css.map",
					sourceMapRootpath: "/compiled"
				},
				files: {
					"release/css/app.css": "src/css/app.less"
				}
			}
		},
		typescript: {
			release: {
				src: "src/scripts/game.ts",
				dest: "release/scripts/game.js",
				options: {
					target: "es5",
					basePath: "",
					sourceMap: true,
					declaration: false,
					nolib: false,
					comments: false
				}
			}
		},
		uglify: {
			release: {
				files: {
					"release/scripts/game.min.js": "release/scripts/game.js"
				}
			}
		},
		copy: {
			release: {
				files: [
					{ src: "src/index.html", dest: "release/index.html" },
					{ src: "src/css/xirod.woff", dest: "release/css/xirod.woff" },
					{ expand: true, cwd: "src/media/", src: "**", dest: "release/media/", flatten: true, filter: "isFile" }
				]
				
			}
		},
		express: {
			release: {
				options: {
					port: 8000,
					hostname: "0.0.0.0",
					bases: ["release/"],
					livereload: true
				}
			}
		},
		open: {
			release: {
				path: "http://localhost:8000/index.html"
			}
		},
		watch: {
			options: {
				livereload: true
			},
			files: [
				"release/css/*.css",
				"release/script/*.js",
				"release/index.html"
			]
		}
	});

	// Plugins
	grunt.loadNpmTasks("grunt-typescript");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-less");
	grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-express");
	grunt.loadNpmTasks("grunt-open");
	grunt.loadNpmTasks("grunt-contrib-watch");

	// Default task(s)
	grunt.registerTask("default", ["clean:release", "less:release", "typescript:release", "uglify:release", "copy:release", "express:release", "open:release", "watch"]);
};