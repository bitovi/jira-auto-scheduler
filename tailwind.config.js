module.exports = {
    content: ["./public/**/*.{html,js}","./pages/**/*.{html,js}"],
    theme: {
      fontFamily: {
        "sans": 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        "serif": 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        "mono": 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        "bitovipoopins": 'Poppins, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
      },
      extend: {
        colors: {
            blue: {
                500: '#0747A6',
                400: '#0052CC', // primary color
                300: '#0065FF', // this is what we use
                200: '#4C9AFF',
                // 100: '#4C9AFF',
                75: '#B3D4FF' // highlight effect
            },
            green: {
              500: '#006644',
              400: '#00875A',
              300: '#36B37E',
              200: '#57D9A3',
              // 100: '#79F2C0',
              75:  '#ABF5D1'
            },
            red: {
              500: '#BF2600'
            },
            yellow: {
                500: '#FF8B00',
                300: '#FFAB00',
            },
            neutral: {
                800: '#172B4D',
                600: '#344563',
                200: '#6B778C',
                100: '#7A869A',
                80: '#97A0AF',
                50: '#C1C7D0',
                40: '#DFE1E6', // secondary buttton color
                30: '#EBECF0', 
                20: '#F4F5F7', // stripe color
                10: '#FAFBFC' //
            },
            orange: {
              400: '#F5532D' // Bitovi color
            },
            slate: {
              400: '#505F79'
            }
        },
        spacing: {
          '112': '28rem',
          '128': '32rem',
        }
      },
    },
    plugins: [],
  }