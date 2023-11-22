import terser from '@rollup/plugin-terser';
import del from 'rollup-plugin-delete';

// rollup.config.mjs
export default {
	input: './public/main.js',
	output: {
		dir: './public/dist',
		format: 'es',
        plugins: [
            terser()
        ]
	},
    plugins: [
        del({ targets: './public/dist/*'})
    ]
};