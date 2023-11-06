module.exports = {
    content: ["./public/**/*.{html,js}"],
    theme: {
      extend: {
        colors: {
            blue: {
                500: '#0747A6',
                400: '#0052CC', // primary color
                300: '#0065FF', // this is what we use
                75: '#B3D4FF' // highlight effect
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
                40: '#DFE1E6',
                30: '#EBECF0', // secondary buttton color
                10: '#FAFBFC'
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