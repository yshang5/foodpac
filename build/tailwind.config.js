module.exports = {
  content: [
    '../frontend/*.html',
    '../frontend/js/*.js',
  ],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#f1f8e9',100:'#dcedc8',200:'#c5e1a5',500:'#4caf50',600:'#43a047',700:'#388e3c',800:'#2e7d32',900:'#1b5e20' },
        accent:  { 400:'#ffa726',500:'#f57c00',600:'#e65100' }
      },
      fontFamily: { sans: ['Inter','ui-sans-serif','system-ui'] }
    }
  },
  plugins: [],
}
